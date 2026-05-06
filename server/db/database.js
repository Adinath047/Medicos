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

module.exports = { getDB, query, queryOne, run, transaction, parseJsonFields };
