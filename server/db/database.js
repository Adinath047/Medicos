// server/db/database.js
// Uses Node.js built-in 'node:sqlite' — stable in Node 24, no native compilation needed.

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs   = require('fs');

const DB_PATH  = process.env.DB_PATH || path.join(__dirname, '../../emr_data.sqlite3');
const SQL_PATH = path.join(__dirname, 'schema.sql');

let db;

function getDB() {
  if (!db) {
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
      `CREATE TABLE IF NOT EXISTS sync_meta (
         key   TEXT PRIMARY KEY,
         value TEXT NOT NULL
       )`,
      // Fix seed user password hashes (old hash was placeholder, not actual passwords)
      `UPDATE users SET password = '$2a$10$MLl//yWnowDtuDfcC1Y.B.IqOugs3ssrG0KH97n3Kpdx5aYKx/A2i'
       WHERE id = 'usr-admin-001' AND password = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'`,
      `UPDATE users SET password = '$2a$10$P7E4OHjw26NaRnJESh85OudIwEUwJxfILUIyBEy.jO3Q2WiEo4O2e'
       WHERE id = 'usr-doc-001' AND password = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'`,
      `UPDATE users SET password = '$2a$10$DUYts83FR/pnoqZ0xE4qgOK4dPZ8VLK4Dmnkm29C1AhpfAc4md5jW'
       WHERE id = 'usr-rcpt-001' AND password = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'`,
    ];
    for (const m of migrations) {
      try { db.exec(m); } catch { /* already exists */ }
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
  try {
    getDB().prepare(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      userId || 'unknown',
      action,
      tableName || null,
      String(recordId || ''),
      JSON.stringify(details),
      ipAddress || null
    );
  } catch (err) {
    // Log to console only — never propagate
    console.error('[audit] Failed to write audit log:', err.message);
  }
}

module.exports = { getDB, query, queryOne, run, transaction, parseJsonFields, auditLog };
