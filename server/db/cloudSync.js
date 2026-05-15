// server/db/cloudSync.js
// Bidirectional sync: SQLite (offline-first) ↔ Supabase (cloud)
// Uses @supabase/supabase-js over HTTPS — no firewall issues
// Strategy: last-write-wins by updated_at / created_at timestamp

const { createClient } = require('@supabase/supabase-js');
const { query, queryOne, run } = require('./database');

let supabase = null;
let cloudAvailable = false;

// Tables to sync and their timestamp columns
const SYNC_TABLES = [
  { name: 'hospitals',     ts: 'updated_at' },
  { name: 'users',         ts: 'updated_at' },
  { name: 'patients',      ts: 'updated_at' },
  { name: 'encounters',    ts: 'updated_at' },
  { name: 'vitals',        ts: 'recorded_at' },
  { name: 'prescriptions', ts: 'created_at' },
  { name: 'appointments',  ts: 'updated_at' },
  { name: 'billing',       ts: 'created_at' },
];

// ── Init ──────────────────────────────────────────────────────────────
async function initCloud() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key || process.env.SUPABASE_ENABLED !== 'true') {
    console.log('☁  Cloud sync disabled');
    return;
  }

  try {
    supabase = createClient(url, key, {
      auth: { persistSession: false },
    });

    // Test connection with a lightweight query
    const { error } = await supabase.from('hospitals').select('id').limit(1);

    if (error && error.code === '42P01') {
      // Tables don't exist yet — create them
      console.log('☁  Supabase connected — creating schema...');
      await setupCloudSchema();
    } else if (error) {
      throw new Error(error.message);
    }

    cloudAvailable = true;
    console.log('☁  Supabase connected — cloud sync active ✅');

    // Push local → cloud on startup (ensures our migrations win)
    await pushToCloud();

    // Pull cloud → local on startup
    await pullFromCloud();

    // Sync every 30 seconds
    setInterval(syncCycle, 30_000);

  } catch (err) {
    cloudAvailable = false;
    console.warn('☁  Supabase unavailable — offline mode:', err.message);
    // Retry in 60 seconds
    setTimeout(initCloud, 60_000);
  }
}

// ── Create Supabase tables via SQL ────────────────────────────────────
async function setupCloudSchema() {
  if (!supabase) return;

  // Use Supabase's SQL execution via RPC
  // We'll create tables using the REST management API approach
  const tables = [
    `CREATE TABLE IF NOT EXISTS hospitals (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT DEFAULT 'General',
      address TEXT, city TEXT, state TEXT, pincode TEXT, phone TEXT, email TEXT,
      logo_url TEXT, is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT now()::text, updated_at TEXT DEFAULT now()::text
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'doctor',
      hospital_id TEXT, staff_id TEXT, phone TEXT, specialization TEXT,
      license_number TEXT, photo_url TEXT, 
      staff_type TEXT DEFAULT 'front_desk',
      consultation_fee REAL DEFAULT 0,
      followup_fee REAL DEFAULT 0,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until TEXT,
      totp_secret TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT now()::text, updated_at TEXT DEFAULT now()::text
    )`,
    `CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY, uhid TEXT UNIQUE NOT NULL, hospital_id TEXT NOT NULL,
      name TEXT NOT NULL, dob TEXT, age INTEGER, sex TEXT DEFAULT 'Male',
      blood_group TEXT, phone TEXT, email TEXT, address TEXT, weight TEXT, height TEXT,
      allergies TEXT DEFAULT '[]', chronic_conditions TEXT DEFAULT '[]',
      current_medications TEXT DEFAULT '[]', ec_name TEXT, ec_phone TEXT, ec_relation TEXT,
      govt_id_type TEXT, govt_id_number TEXT, insurance_provider TEXT, insurance_number TEXT,
      primary_doctor_id TEXT, photo_url TEXT, notes TEXT, is_active INTEGER DEFAULT 1,
      registered_by TEXT, created_at TEXT DEFAULT now()::text, updated_at TEXT DEFAULT now()::text
    )`,
    `CREATE TABLE IF NOT EXISTS encounters (
      id TEXT PRIMARY KEY, hospital_id TEXT NOT NULL, patient_id TEXT NOT NULL,
      doctor_id TEXT NOT NULL, encounter_type TEXT DEFAULT 'OPD', token_number INTEGER,
      appointment_id TEXT, status TEXT DEFAULT 'Active', chief_complaint TEXT,
      history TEXT, past_history TEXT, examination TEXT, diagnosis TEXT DEFAULT '[]',
      impression TEXT, plan TEXT, advice TEXT, follow_up_date TEXT, refer_to TEXT,
      duration_mins INTEGER, billing_amount REAL, notes TEXT, doctor_name TEXT,
      created_at TEXT DEFAULT now()::text, updated_at TEXT DEFAULT now()::text
    )`,
    `CREATE TABLE IF NOT EXISTS vitals (
      id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, encounter_id TEXT,
      hospital_id TEXT NOT NULL, bp_systolic INTEGER, bp_diastolic INTEGER,
      heart_rate INTEGER, temperature REAL, temperature_unit TEXT DEFAULT 'F',
      spo2 INTEGER, weight REAL, weight_unit TEXT DEFAULT 'kg',
      height REAL, height_unit TEXT DEFAULT 'cm', bmi REAL,
      respiratory_rate INTEGER, blood_sugar REAL, blood_sugar_type TEXT,
      pain_score INTEGER, notes TEXT, recorded_by TEXT NOT NULL,
      recorded_at TEXT DEFAULT now()::text
    )`,
    `CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY, hospital_id TEXT NOT NULL, patient_id TEXT NOT NULL,
      doctor_id TEXT NOT NULL, encounter_id TEXT, medicines TEXT DEFAULT '[]',
      advice TEXT, follow_up_date TEXT, patient_weight TEXT,
      slip_token TEXT UNIQUE, is_printed INTEGER DEFAULT 0,
      created_by_role TEXT DEFAULT 'doctor', created_at TEXT DEFAULT now()::text
    )`,
    `CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY, hospital_id TEXT NOT NULL, patient_id TEXT NOT NULL,
      doctor_id TEXT NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL,
      token_number INTEGER, reason TEXT, status TEXT DEFAULT 'Scheduled',
      notes TEXT, booked_by TEXT, patient_name TEXT, doctor_name TEXT,
      created_at TEXT DEFAULT now()::text, updated_at TEXT DEFAULT now()::text
    )`,
    `CREATE TABLE IF NOT EXISTS billing (
      id TEXT PRIMARY KEY, hospital_id TEXT NOT NULL, patient_id TEXT NOT NULL,
      encounter_id TEXT, items TEXT DEFAULT '[]', total_amount REAL DEFAULT 0,
      discount REAL DEFAULT 0, net_amount REAL DEFAULT 0, paid_amount REAL DEFAULT 0,
      payment_mode TEXT DEFAULT 'Cash', payment_status TEXT DEFAULT 'Pending',
      invoice_number TEXT UNIQUE, notes TEXT, billed_by TEXT, patient_name TEXT,
      bill_type TEXT DEFAULT 'consultation',
      created_at TEXT DEFAULT now()::text
    )`,
    `CREATE TABLE IF NOT EXISTS pharmacy_bills (
      id TEXT PRIMARY KEY, hospital_id TEXT NOT NULL, patient_id TEXT NOT NULL,
      prescription_id TEXT, pharmacist_id TEXT, medicines TEXT DEFAULT '[]',
      total_amount REAL DEFAULT 0, discount REAL DEFAULT 0, net_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0, payment_mode TEXT DEFAULT 'Cash', 
      payment_status TEXT DEFAULT 'Pending', invoice_number TEXT, notes TEXT,
      created_at TEXT DEFAULT now()::text, updated_at TEXT DEFAULT now()::text
    )`,
  ];

  for (const sql of tables) {
    try {
      await supabase.rpc('exec_sql', { sql }).catch(() => {});
    } catch { /* ignore — tables may already exist */ }
  }
}

// ── Push local SQLite → Supabase ──────────────────────────────────────
async function pushToCloud() {
  if (!supabase || !cloudAvailable) return 0;
  let pushed = 0;

  for (const { name, ts } of SYNC_TABLES) {
    try {
      const meta = queryOne("SELECT value FROM sync_meta WHERE key = ?", [`last_push_${name}`]);
      let since = meta?.value ?? '2000-01-01T00:00:00.000Z';

      let hasMore = true;
      while (hasMore) {
        let rows;
        try { 
          rows = query(`SELECT * FROM ${name} WHERE ${ts} > ? ORDER BY ${ts} ASC LIMIT 500`, [since]); 
        } catch { break; }

        if (!rows || rows.length === 0) {
          hasMore = false;
          continue;
        }

        // Upsert in batches of 50 to Supabase
        for (let i = 0; i < rows.length; i += 50) {
          const batch = rows.slice(i, i + 50);
          const { error } = await supabase.from(name).upsert(batch, { onConflict: 'id' });
          if (!error) pushed += batch.length;
          else {
            console.warn(`☁  Push error (${name}):`, error.message);
            hasMore = false; // Stop on error
            break;
          }
        }
        
        if (!hasMore && rows.length > 0) break; // Error occurred, break outer loop

        // Safely update sync_meta with the highest timestamp from this batch
        since = rows[rows.length - 1][ts];
        run("INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)", [`last_push_${name}`, since]);

        if (rows.length < 500) hasMore = false;
      }
    } catch (err) {
      console.warn(`☁  Push error (${name}):`, err.message);
    }
  }

  if (pushed > 0) console.log(`☁  ↑ Pushed ${pushed} records to Supabase`);
  return pushed;
}

// ── Pull Supabase → local SQLite ──────────────────────────────────────
async function pullFromCloud() {
  if (!supabase || !cloudAvailable) return 0;
  let pulled = 0;

  for (const { name, ts } of SYNC_TABLES) {
    try {
      const meta = queryOne("SELECT value FROM sync_meta WHERE key = ?", [`last_pull_${name}`]);
      let since = meta?.value ?? '2000-01-01T00:00:00.000Z';

      let hasMore = true;
      while (hasMore) {
        const { data: rows, error } = await supabase
          .from(name).select('*').gt(ts, since).order(ts, { ascending: true }).limit(500);

        if (error) { console.warn(`☁  Pull error (${name}):`, error.message); break; }
        if (!rows || rows.length === 0) {
          hasMore = false;
          continue;
        }

        for (const row of rows) {
          try {
            const cols = Object.keys(row).filter(k => row[k] !== null && row[k] !== undefined);
            if (!cols.length) continue;
            const placeholders = cols.map(() => '?').join(',');
            const updates = cols.filter(c => c !== 'id').map(c => `${c} = excluded.${c}`);
            run(
              `INSERT INTO ${name} (${cols.join(',')}) VALUES (${placeholders})
               ON CONFLICT(id) DO UPDATE SET ${updates.join(', ')}`,
              cols.map(c => row[c])
            );
            pulled++;
          } catch { /* skip bad rows */ }
        }

        // Safely update sync_meta with the highest timestamp from this batch
        since = rows[rows.length - 1][ts];
        run("INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)", [`last_pull_${name}`, since]);

        if (rows.length < 500) hasMore = false;
      }
    } catch (err) {
      console.warn(`☁  Pull error (${name}):`, err.message);
    }
  }

  if (pulled > 0) console.log(`☁  ↓ Pulled ${pulled} records from Supabase`);
  return pulled;
}

// ── Full sync cycle ───────────────────────────────────────────────────
async function syncCycle() {
  if (!cloudAvailable) return;
  try {
    await pushToCloud();
    await pullFromCloud();
  } catch (err) {
    console.warn('☁  Sync cycle error:', err.message);
    // Check if still connected
    const { error } = await supabase.from('hospitals').select('id').limit(1).catch(() => ({ error: true }));
    if (error) {
      cloudAvailable = false;
      console.warn('☁  Supabase disconnected — will retry in 60s');
      setTimeout(async () => {
        const { error: e2 } = await supabase.from('hospitals').select('id').limit(1).catch(() => ({ error: true }));
        if (!e2) { cloudAvailable = true; console.log('☁  Supabase reconnected ✅'); }
      }, 60_000);
    }
  }
}

// ── Write-through: call after any SQLite write to immediately mirror ──
async function writeThrough(tableName, row) {
  if (!supabase || !cloudAvailable) return;
  setImmediate(async () => {
    try {
      const { error } = await supabase.from(tableName).upsert(row, { onConflict: 'id' });
      if (error) console.warn(`☁  Write-through error (${tableName}):`, error.message);
    } catch { /* silent — SQLite is source of truth */ }
  });
}

function getCloudStatus() {
  return {
    available: cloudAvailable,
    enabled: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ENABLED === 'true'),
    url: process.env.SUPABASE_URL || null,
  };
}

module.exports = { initCloud, syncCycle, pushToCloud, pullFromCloud, writeThrough, getCloudStatus };
