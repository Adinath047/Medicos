// server/db/database.js
// Uses node-postgres (pg) to connect to Supabase PostgreSQL database directly.

const { Pool } = require('pg');
const crypto = require('crypto');

// Check that DATABASE_URL is provided in production
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  console.error('[FATAL] DATABASE_URL is missing in production environment variables.');
  process.exit(1);
}

console.log('[db] Initializing pg connection pool...');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1'))
    ? false
    : { rejectUnauthorized: false }
});

/** SELECT returning many rows */
async function query(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

/** SELECT returning one row (or undefined) */
async function queryOne(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows[0];
}

/** INSERT / UPDATE / DELETE */
async function run(sql, params = []) {
  const res = await pool.query(sql, params);
  return { changes: res.rowCount };
}

/** Run a function inside a BEGIN / COMMIT transaction */
async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Parse JSON string fields in a row returned from PG */
function parseJsonFields(row, fields) {
  if (!row) return row;
  const out = { ...row };
  for (const f of fields) {
    if (out[f]) {
      if (typeof out[f] === 'string') {
        try { out[f] = JSON.parse(out[f]); } catch { out[f] = []; }
      } else if (typeof out[f] === 'object') {
        // Already parsed (node-postgres may parse json columns automatically)
      }
    }
  }
  return out;
}

/**
 * Write one row to audit_log.
 * Fire-and-forget: never throws.
 */
async function auditLog(userId, action, tableName, recordId, details = {}, ipAddress = null) {
  try {
    const detailsStr = JSON.stringify(details);
    
    // Hash chain implementation
    let prevHash = 'GENESIS';
    const lastEntry = await queryOne('SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1');
    if (lastEntry && lastEntry.hash) prevHash = lastEntry.hash;
    
    const ts = new Date().toISOString();
    const payload = `${prevHash}|${userId || 'unknown'}|${action}|${tableName || ''}|${recordId || ''}|${detailsStr}|${ts}`;
    const hash = crypto.createHash('sha256').update(payload).digest('hex');

    await run(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, details, ip_address, previous_hash, hash, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId || 'unknown',
        action,
        tableName || null,
        String(recordId || ''),
        detailsStr,
        ipAddress || null,
        prevHash,
        hash,
        ts
      ]
    );
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err.message);
  }
}

module.exports = { pool, query, queryOne, run, transaction, parseJsonFields, auditLog };
