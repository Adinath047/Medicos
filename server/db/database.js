// server/db/database.js
// Uses Node.js built-in 'node:sqlite' — stable in Node 24, no native compilation needed.

const { DatabaseSync } = require('node:sqlite');
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');

const DB_PATH  = process.env.DB_PATH || path.join(__dirname, '../../emr_data.sqlite3');
const SQL_PATH = path.join(__dirname, 'schema.sql');

let db;

function getDB() {
  if (!db) {
    console.log(`[db] Initializing DatabaseSync with path: ${path.resolve(DB_PATH)}`);
    db = new DatabaseSync(DB_PATH);

    // Performance pragmas (exec handles multi-line SQL)
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    db.exec('PRAGMA synchronous = NORMAL');
    db.exec('PRAGMA cache_size = -32000');
    db.exec('PRAGMA temp_store = MEMORY');

    // Run schema (CREATE TABLE IF NOT EXISTS + seed data)
    const schema = fs.readFileSync(SQL_PATH, 'utf8');
    db.exec(schema);

    // Safe column migrations (ignore if already exists)
    const migrations = [
      "ALTER TABLE users ADD COLUMN specialization TEXT",
      "ALTER TABLE users ADD COLUMN license_number TEXT",
      "ALTER TABLE encounters ADD COLUMN doctor_name TEXT",
      "ALTER TABLE appointments ADD COLUMN patient_name TEXT",
      "ALTER TABLE appointments ADD COLUMN doctor_name TEXT",
      "ALTER TABLE billing ADD COLUMN patient_name TEXT",
      // staff_type: 'front_desk' | 'pharmacy' — differentiates receptionist sub-functions
      "ALTER TABLE users ADD COLUMN staff_type TEXT NOT NULL DEFAULT 'front_desk'",
      // per-doctor consultation rates
      "ALTER TABLE users ADD COLUMN consultation_fee REAL NOT NULL DEFAULT 0",
      "ALTER TABLE users ADD COLUMN followup_fee REAL NOT NULL DEFAULT 0",
      // billing type: 'consultation' | (pharmacy bills live in pharmacy_bills table)
      "ALTER TABLE billing ADD COLUMN bill_type TEXT NOT NULL DEFAULT 'consultation'",
      // tag all existing billing rows as consultation
      "UPDATE billing SET bill_type = 'consultation' WHERE bill_type IS NULL OR bill_type = ''",
      // Pharmacy bills
      `CREATE TABLE IF NOT EXISTS pharmacy_bills (
         id              TEXT PRIMARY KEY,
         hospital_id     TEXT NOT NULL,
         patient_id      TEXT NOT NULL REFERENCES patients(id),
         prescription_id TEXT REFERENCES prescriptions(id),
         pharmacist_id   TEXT NOT NULL REFERENCES users(id),
         medicines       TEXT NOT NULL DEFAULT '[]',
         total_amount    REAL NOT NULL DEFAULT 0,
         discount        REAL NOT NULL DEFAULT 0,
         net_amount      REAL NOT NULL DEFAULT 0,
         paid_amount     REAL NOT NULL DEFAULT 0,
         payment_mode    TEXT NOT NULL DEFAULT 'Cash',
         payment_status  TEXT NOT NULL DEFAULT 'Pending',
         invoice_number  TEXT,
         notes           TEXT,
         created_at      TEXT NOT NULL DEFAULT (datetime('now')),
         updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
       )`,
      `CREATE TABLE IF NOT EXISTS sync_meta (
         key   TEXT PRIMARY KEY,
         value TEXT NOT NULL
       )`,
      // Lockout tracking
      "ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0",
      "ALTER TABLE users ADD COLUMN locked_until TEXT",
      // Field encryption hashes
      "ALTER TABLE patients ADD COLUMN phone_hash TEXT",
      // Audit log tamper evidence
      "ALTER TABLE audit_log ADD COLUMN hash TEXT",
      "ALTER TABLE audit_log ADD COLUMN previous_hash TEXT",
      // MFA
      "ALTER TABLE users ADD COLUMN totp_secret TEXT",
    ];
    for (const m of migrations) {
      try {
        if (m.startsWith('UPDATE users') || m.startsWith('DELETE FROM users')) {
          console.log(`[db] Running migration: ${m.split('\n')[0]}...`);
        }
        db.exec(m);
      } catch (err) {
        // Only ignore "already exists" errors
        const msg = err.message.toLowerCase();
        if (!msg.includes('already exists') && !msg.includes('duplicate column')) {
          console.error(`[db] Migration error: ${err.message}\nSQL: ${m.substring(0, 100)}...`);
        }
      }
    }

    // Initialize audit log hash chain if empty
    const firstLog = db.prepare('SELECT id FROM audit_log ORDER BY created_at ASC LIMIT 1').get();
    if (firstLog) {
      db.exec("UPDATE audit_log SET previous_hash = 'GENESIS', hash = 'MIGRATED' WHERE hash IS NULL");
    }

    // MANDATORY PRODUCTION DATA CLEANUP
    try {
      console.log('[db] Starting production data cleanup...');
      
      // 1. Delete conflicting emails
      db.prepare("DELETE FROM users WHERE email = ? AND id != 'usr-admin-001'").run('adinathmade@medicos.com');
      
      // 2. Force admin update
      const res = db.prepare(`
        UPDATE users 
        SET email = ?, password = ?, name = ?, is_active = 1, updated_at = ? 
        WHERE id = 'usr-admin-001'
      `).run('adinathmade@medicos.com', '$2a$10$1LADfgd8HQ0allD5lnGLb.dVxH.sVVCt07WYykl48x0vryQ1fCgLO', 'Adinath Admin', new Date().toISOString());
      
      console.log(`[db] Admin update: ${res.changes} row(s) updated`);
      
      // 3. Purge demo accounts
      const purge = db.prepare("DELETE FROM users WHERE id IN ('usr-doc-001', 'usr-rcpt-001', 'usr-lab-001', 'usr-pharm-001', 'usr-bill-001', 'usr-nurse-001')").run();
      const purge2 = db.prepare("DELETE FROM users WHERE email IN ('admin@medicos.local', 'dr.sharma@medicos.local', 'receptionist@medicos.local')").run();
      
      console.log(`[db] Demo accounts purged: ${purge.changes + purge2.changes} total`);
      
    } catch (err) {
      console.error('[db] CRITICAL: Production cleanup failed:', err.message);
    }

    console.log(`✅ SQLite database ready: ${DB_PATH}`);
  }
  return db;
}

// Graceful shutdown
process.on('exit',    () => { try { if (db) db.close(); } catch {} });
process.on('SIGINT',  () => { try { if (db) db.close(); } catch {} process.exit(0); });
process.on('SIGTERM', () => { try { if (db) db.close(); } catch {} process.exit(0); });

// ── Helpers ───────────────────────────────────────────────────────────────────
// NOTE: node:sqlite passes params as spread args, NOT as an array.
// All helpers accept an array and spread it for the caller's convenience.

/** SELECT returning many rows */
function query(sql, params = []) {
  return getDB().prepare(sql).all(...params);
}

/** SELECT returning one row (or undefined) */
function queryOne(sql, params = []) {
  return getDB().prepare(sql).get(...params);
}

/** INSERT / UPDATE / DELETE */
function run(sql, params = []) {
  return getDB().prepare(sql).run(...params);
}

/** Run a function inside a BEGIN / COMMIT transaction */
function transaction(fn) {
  const d = getDB();
  d.exec('BEGIN');
  try {
    const result = fn(d);
    d.exec('COMMIT');
    return result;
  } catch (err) {
    d.exec('ROLLBACK');
    throw err;
  }
}

/** Parse JSON string fields in a row returned from SQLite */
function parseJsonFields(row, fields) {
  if (!row) return row;
  const out = { ...row };
  for (const f of fields) {
    if (out[f] && typeof out[f] === 'string') {
      try { out[f] = JSON.parse(out[f]); } catch { out[f] = []; }
    }
  }
  return out;
}

/**
 * Write one row to audit_log.
 * Fire-and-forget: never throws so a logging failure cannot break a clinical operation.
 * @param {string} userId       - acting user's ID
 * @param {string} action       - e.g. 'CREATE_PATIENT', 'UPDATE_PRESCRIPTION'
 * @param {string} tableName    - DB table affected
 * @param {string} recordId     - primary key of the affected record
 * @param {object} details      - any extra context (stored as JSON)
 * @param {string} [ipAddress]  - request IP
 */
function auditLog(userId, action, tableName, recordId, details = {}, ipAddress = null) {
  const d = getDB();
  try {
    const detailsStr = JSON.stringify(details);
    
    // Hash chain implementation
    let prevHash = 'GENESIS';
    const lastEntry = d.prepare('SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1').get();
    if (lastEntry && lastEntry.hash) prevHash = lastEntry.hash;
    
    const ts = new Date().toISOString();
    const payload = `${prevHash}|${userId || 'unknown'}|${action}|${tableName || ''}|${recordId || ''}|${detailsStr}|${ts}`;
    const hash = crypto.createHash('sha256').update(payload).digest('hex');

    d.prepare(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, details, ip_address, previous_hash, hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userId || 'unknown',
      action,
      tableName || null,
      String(recordId || ''),
      detailsStr,
      ipAddress || null,
      prevHash,
      hash,
      ts
    );
  } catch (err) {
    // Log to console only — never propagate
    console.error('[audit] Failed to write audit log:', err.message);
  }
}

module.exports = { getDB, query, queryOne, run, transaction, parseJsonFields, auditLog };
