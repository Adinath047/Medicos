// server/routes/sync.js — Offline sync using node:sqlite (built-in, Node 24)
const router = require('express').Router();
const { getDB, query, queryOne } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const ALLOWED_TABLES = ['patients','encounters','vitals','prescriptions','appointments','billing','lab_orders'];

/**
 * POST /api/sync/push
 * Client pushes array of offline-pending records.
 * Server applies them using last-write-wins conflict resolution.
 */
router.post('/push', authMiddleware, (req, res) => {
  const { records = [], clientId } = req.body;
  if (!Array.isArray(records)) return res.status(400).json({ error: 'records must be array' });

  const db = getDB();
  const results = [];

  db.exec('BEGIN');
  try {
    for (const record of records) {
      const { table, operation, payload, clientUpdatedAt } = record;

      if (!ALLOWED_TABLES.includes(table)) {
        results.push({ id: payload?.id, status: 'rejected', reason: 'table not allowed' });
        continue;
      }

      // ── Hospital isolation — reject cross-hospital records ─────────────
      if (req.user.role !== 'super_admin' &&
          payload.hospital_id && payload.hospital_id !== req.user.hospitalId) {
        results.push({ id: payload?.id, status: 'rejected', reason: 'hospital mismatch' });
        continue;
      }

      // Force correct hospital_id even if client sends wrong one
      if (req.user.role !== 'super_admin' && payload.hospital_id === undefined) {
        payload.hospital_id = req.user.hospitalId;
      }

      try {
        const op = (operation || '').toLowerCase();

        if (op === 'create' || op === 'insert') {
          const existing = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(payload.id);
          if (!existing) {
            const cols = Object.keys(payload);
            const ph   = cols.map(() => '?').join(',');
            const vals = cols.map(c => {
              const v = payload[c];
              return (v !== null && typeof v === 'object') ? JSON.stringify(v) : v;
            });
            db.prepare(`INSERT OR IGNORE INTO ${table} (${cols.join(',')}) VALUES (${ph})`).run(...vals);
            results.push({ id: payload.id, status: 'inserted' });
          } else {
            results.push({ id: payload.id, status: 'already_exists' });
          }

        } else if (op === 'update') {
          const existing = db.prepare(`SELECT id, updated_at, is_active FROM ${table} WHERE id = ?`).get(payload.id);
          if (!existing) { results.push({ id: payload.id, status: 'not_found' }); continue; }

          // Delete wins — do not allow updates on soft-deleted records
          if (existing.is_active === 0) {
            results.push({ id: payload.id, status: 'conflict_skipped', reason: 'record was deleted' }); continue;
          }

          // Normalise SQLite space-format "YYYY-MM-DD HH:MM:SS" → ISO; leave existing ISO untouched
          const rawTs  = (existing.updated_at || '').replace(' ', 'T');
          const isoTs  = rawTs && !rawTs.endsWith('Z') && !/[+-]\d\d:\d\d$/.test(rawTs) ? rawTs + 'Z' : rawTs;
          const serverTime = isoTs ? new Date(isoTs).getTime() : 0;
          const clientTime = clientUpdatedAt ? new Date(clientUpdatedAt).getTime() : Date.now();

          if (clientTime >= serverTime) {
            // Strip sync meta + timestamps that server manages
            const { id, created_at, updated_at, _syncStatus, _syncOp, _updatedAt, _localSeq, ...fields } = payload;
            const sets = Object.keys(fields).map(c => `${c} = ?`).join(', ');
            const vals = [...Object.values(fields).map(v => (v !== null && typeof v === 'object') ? JSON.stringify(v) : v), payload.id];
            db.prepare(`UPDATE ${table} SET ${sets}, updated_at = datetime('now') WHERE id = ?`).run(...vals);
            results.push({ id: payload.id, status: 'updated' });
          } else {
            results.push({ id: payload.id, status: 'conflict_skipped', reason: 'server has newer version' });
          }

        } else if (op === 'delete') {
          db.prepare(`UPDATE ${table} SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).run(payload.id);
          results.push({ id: payload.id, status: 'deleted' });
        }

        // Log to sync_queue
        db.prepare(
          `INSERT INTO sync_queue (table_name, record_id, operation, payload, client_id, synced_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))`
        ).run(table, payload.id, operation, JSON.stringify(payload), clientId || null);

      } catch (err) {
        results.push({ id: payload?.id, status: 'error', reason: err.message });
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Sync transaction failed', detail: err.message });
  }

  const synced = results.filter(r => ['inserted','updated','deleted','already_exists'].includes(r.status)).length;
  const failed = results.filter(r => ['error','rejected','not_found'].includes(r.status)).length;
  res.json({ synced, failed, total: records.length, results });
});

/**
 * GET /api/sync/pull?since=ISO_TIMESTAMP&tables=patients,encounters
 * Returns all records updated since timestamp (delta sync).
 */
router.get('/pull', authMiddleware, (req, res) => {
  const { since, tables } = req.query;
  const { hospitalId, role } = req.user;
  const hid     = role === 'super_admin' ? null : hospitalId;
  const sinceTs = since || '2000-01-01T00:00:00';

  const PULLABLE = ['patients','encounters','vitals','prescriptions','appointments','billing'];
  const requested = tables
    ? tables.split(',').filter(t => PULLABLE.includes(t))
    : PULLABLE;

  const result = {};
  for (const tbl of requested) {
    try {
      let sql    = `SELECT * FROM ${tbl} WHERE `;
      const params = [];
      if (tbl === 'vitals') {
        sql += 'recorded_at > ?'; params.push(sinceTs);
      } else {
        sql += 'updated_at > ?'; params.push(sinceTs);
      }
      if (hid && PULLABLE.includes(tbl)) { sql += ' AND hospital_id = ?'; params.push(hid); }
      result[tbl] = query(sql, params);
    } catch { result[tbl] = []; }
  }

  res.json({ serverTime: new Date().toISOString(), pulledAt: new Date().toISOString(), data: result });
});

/** GET /api/sync/status */
router.get('/status', authMiddleware, (_req, res) => {
  const pending = queryOne('SELECT COUNT(*) as n FROM sync_queue WHERE synced_at IS NULL')?.n ?? 0;
  res.json({ serverTime: new Date().toISOString(), pendingQueue: pending, status: 'online' });
});

module.exports = router;
