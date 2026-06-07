// server/routes/sync.js — Offline sync using PostgreSQL
const router = require('express').Router();
const { query, queryOne, run, transaction } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const ALLOWED_TABLES = ['patients','encounters','vitals','prescriptions','appointments','billing','medicines'];

const TABLE_COLUMNS = {
  patients: [
    'id', 'uhid', 'hospital_id', 'name', 'dob', 'age', 'sex', 'blood_group', 'phone', 'phone_hash',
    'email', 'password', 'address', 'weight', 'height', 'allergies', 'chronic_conditions',
    'current_medications', 'ec_name', 'ec_phone', 'ec_relation', 'govt_id_type', 'govt_id_number',
    'insurance_provider', 'insurance_number', 'primary_doctor_id', 'photo_url', 'notes',
    'is_active', 'registered_by', 'created_at', 'updated_at'
  ],
  encounters: [
    'id', 'hospital_id', 'patient_id', 'doctor_id', 'encounter_type', 'token_number', 'appointment_id',
    'status', 'chief_complaint', 'history', 'past_history', 'examination', 'diagnosis', 'impression',
    'plan', 'advice', 'follow_up_date', 'refer_to', 'duration_mins', 'billing_amount', 'notes',
    'created_at', 'updated_at'
  ],
  vitals: [
    'id', 'patient_id', 'encounter_id', 'hospital_id', 'bp_systolic', 'bp_diastolic', 'heart_rate',
    'temperature', 'temperature_unit', 'spo2', 'weight', 'weight_unit', 'height', 'height_unit',
    'bmi', 'respiratory_rate', 'blood_sugar', 'blood_sugar_type', 'pain_score', 'notes',
    'recorded_by', 'recorded_at'
  ],
  prescriptions: [
    'id', 'hospital_id', 'patient_id', 'doctor_id', 'encounter_id', 'medicines', 'advice',
    'follow_up_date', 'patient_weight', 'slip_token', 'is_printed', 'created_by_role', 'created_at'
  ],
  appointments: [
    'id', 'hospital_id', 'patient_id', 'doctor_id', 'date', 'time', 'token_number', 'reason',
    'status', 'notes', 'booked_by', 'created_at', 'updated_at'
  ],
  billing: [
    'id', 'hospital_id', 'patient_id', 'encounter_id', 'items', 'total_amount', 'discount',
    'net_amount', 'paid_amount', 'payment_mode', 'payment_status', 'invoice_number', 'notes',
    'billed_by', 'created_at'
  ],
  medicines: [
    'id', 'hospital_id', 'name', 'generics', 'strengths', 'default_dose', 'category', 'is_active', 'created_at', 'updated_at'
  ]
};

/**
 * POST /api/sync/push
 * Client pushes array of offline-pending records.
 * Server applies them using last-write-wins conflict resolution.
 */
router.post('/push', authMiddleware, async (req, res) => {
  const { records = [], clientId } = req.body;
  if (!Array.isArray(records)) return res.status(400).json({ error: 'records must be array' });

  const results = [];
  console.log(`[sync] Incoming sync/push request from client ${clientId || 'unknown'}. Records count: ${records.length}`);

  try {
    await transaction(async (client) => {
      for (const record of records) {
        const { table, operation, payload, clientUpdatedAt } = record;

        if (!ALLOWED_TABLES.includes(table)) {
          results.push({ id: payload?.id, status: 'rejected', reason: 'table not allowed' });
          continue;
        }

        // Hospital isolation — reject cross-hospital records
        if (req.user.role !== 'super_admin' &&
            payload.hospital_id && payload.hospital_id !== req.user.hospitalId) {
          results.push({ id: payload?.id, status: 'rejected', reason: 'hospital mismatch' });
          continue;
        }

        // Force correct hospital_id even if client sends wrong one
        if (req.user.role !== 'super_admin' && payload.hospital_id === undefined) {
          payload.hospital_id = req.user.hospitalId;
        }

        // Clean payload: only keep columns that exist in the database table configuration
        const allowedCols = TABLE_COLUMNS[table];
        const cleanPayload = {};
        for (const col of allowedCols) {
          if (payload[col] !== undefined) {
            cleanPayload[col] = payload[col];
          }
        }

        try {
          const op = (operation || '').toLowerCase();

          if (op === 'create' || op === 'insert') {
            const existingRes = await client.query(`SELECT id FROM ${table} WHERE id = $1`, [cleanPayload.id]);
            const existing = existingRes.rows[0];
            
            if (!existing) {
              const cols = Object.keys(cleanPayload);
              const ph   = cols.map((_, i) => `$${i + 1}`).join(',');
              const vals = cols.map(c => {
                const v = cleanPayload[c];
                return (v !== null && typeof v === 'object') ? JSON.stringify(v) : v;
              });
              await client.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${ph})`, vals);
              results.push({ id: cleanPayload.id, status: 'inserted' });
            } else {
              results.push({ id: cleanPayload.id, status: 'already_exists' });
            }

          } else if (op === 'update') {
            let selectCols = 'id';
            if (['patients', 'users', 'encounters', 'appointments', 'medicines'].includes(table)) {
              selectCols += ', updated_at';
            } else if (table === 'vitals') {
              selectCols += ', recorded_at AS updated_at';
            } else { // prescriptions, billing
              selectCols += ', created_at AS updated_at';
            }

            if (['patients', 'users', 'encounters', 'medicines'].includes(table)) {
              selectCols += ', is_active';
            } else {
              selectCols += ', 1 AS is_active';
            }

            const existingRes = await client.query(`SELECT ${selectCols} FROM ${table} WHERE id = $1`, [cleanPayload.id]);
            const existing = existingRes.rows[0];
            if (!existing) { results.push({ id: cleanPayload.id, status: 'not_found' }); continue; }

            // Delete wins — do not allow updates on soft-deleted records
            if (existing.is_active === 0) {
              results.push({ id: cleanPayload.id, status: 'conflict_skipped', reason: 'record was deleted' }); continue;
            }

            // Normalise space-format "YYYY-MM-DD HH:MM:SS" → ISO
            const rawTs  = (existing.updated_at || '').replace(' ', 'T');
            const isoTs  = rawTs && !rawTs.endsWith('Z') && !/[+-]\d\d:\d\d$/.test(rawTs) ? rawTs + 'Z' : rawTs;
            const serverTime = isoTs ? new Date(isoTs).getTime() : 0;
            const clientTime = clientUpdatedAt ? new Date(clientUpdatedAt).getTime() : Date.now();

            if (clientTime >= serverTime) {
              // Strip key fields that server manages
              const { id, created_at, updated_at, ...fields } = cleanPayload;
              const cols = Object.keys(fields);
              const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
              const vals = [...Object.values(fields).map(v => (v !== null && typeof v === 'object') ? JSON.stringify(v) : v), cleanPayload.id];
              
              let updateSql = `UPDATE ${table} SET ${sets}`;
              if (['patients', 'users', 'encounters', 'appointments', 'medicines'].includes(table)) {
                updateSql += `, updated_at = now()::text`;
              }
              updateSql += ` WHERE id = $${cols.length + 1}`;
              
              await client.query(updateSql, vals);
              results.push({ id: cleanPayload.id, status: 'updated' });
            } else {
              results.push({ id: cleanPayload.id, status: 'conflict_skipped', reason: 'server has newer version' });
            }

          } else if (op === 'delete') {
            if (['patients', 'users', 'encounters', 'medicines'].includes(table)) {
              await client.query(`UPDATE ${table} SET is_active = 0, updated_at = now()::text WHERE id = $1`, [cleanPayload.id]);
            } else {
              await client.query(`DELETE FROM ${table} WHERE id = $1`, [cleanPayload.id]);
            }
            results.push({ id: cleanPayload.id, status: 'deleted' });
          }

        } catch (err) {
          console.error(`[sync] Error applying record update for table ${table}, id ${payload?.id}:`, err);
          results.push({ id: payload?.id, status: 'error', reason: err.message });
        }
      }
    });

    const synced = results.filter(r => ['inserted','updated','deleted','already_exists'].includes(r.status)).length;
    const failed = results.filter(r => ['error','rejected','not_found'].includes(r.status)).length;
    res.json({ synced, failed, total: records.length, results });
  } catch (err) {
    console.error('[sync] Push transaction failed:', err);
    return res.status(500).json({ error: 'Sync transaction failed', detail: err.message });
  }
});

/**
 * GET /api/sync/pull?since=ISO_TIMESTAMP&tables=patients,encounters
 * Returns all records updated since timestamp (delta sync).
 */
router.get('/pull', authMiddleware, async (req, res) => {
  const { since, tables } = req.query;
  const { hospitalId, role } = req.user;
  const hid     = role === 'super_admin' ? null : hospitalId;
  const sinceTs = since || '2000-01-01T00:00:00';

  const PULLABLE = ['patients','encounters','vitals','prescriptions','appointments','billing','medicines'];
  const requested = tables
    ? tables.split(',').filter(t => PULLABLE.includes(t))
    : PULLABLE;

  const result = {};
  for (const tbl of requested) {
    try {
      let sql    = `SELECT * FROM ${tbl} WHERE `;
      const params = [];
      let index = 1;
      
      if (tbl === 'vitals') {
        sql += `recorded_at > $${index++}`; params.push(sinceTs);
      } else if (['prescriptions', 'billing'].includes(tbl)) {
        sql += `created_at > $${index++}`; params.push(sinceTs);
      } else {
        sql += `updated_at > $${index++}`; params.push(sinceTs);
      }
      
      if (hid && PULLABLE.includes(tbl)) { 
        sql += ` AND hospital_id = $${index++}`; 
        params.push(hid); 
      }
      
      result[tbl] = await query(sql, params);
    } catch (err) { 
      console.error(`Error pulling table ${tbl}:`, err.message);
      result[tbl] = []; 
    }
  }

  res.json({ serverTime: new Date().toISOString(), pulledAt: new Date().toISOString(), data: result });
});

/** GET /api/sync/status */
router.get('/status', authMiddleware, (_req, res) => {
  res.json({ serverTime: new Date().toISOString(), pendingQueue: 0, status: 'online' });
});

module.exports = router;
