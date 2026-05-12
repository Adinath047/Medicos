-- =====================================================================
--  MEDICOS EMR — SQLite Schema
--  Offline-first hospital EMR database
-- =====================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;

-- ── USERS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  email            TEXT UNIQUE NOT NULL,
  password         TEXT NOT NULL,
  role             TEXT NOT NULL DEFAULT 'doctor',  -- admin | doctor | nurse | receptionist
  hospital_id      TEXT,
  staff_id         TEXT,
  phone            TEXT,
  specialization   TEXT,   -- e.g. Cardiology, General Medicine
  license_number   TEXT,   -- Medical Council registration number
  photo_url        TEXT,
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── HOSPITALS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospitals (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  type         TEXT DEFAULT 'General',   -- General | Specialty | Teaching | Clinic
  address      TEXT,
  city         TEXT,
  state        TEXT,
  pincode      TEXT,
  phone        TEXT,
  email        TEXT,
  logo_url     TEXT,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── PATIENTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id                      TEXT PRIMARY KEY,
  uhid                    TEXT UNIQUE NOT NULL,
  hospital_id             TEXT NOT NULL,
  name                    TEXT NOT NULL,
  dob                     TEXT,
  age                     INTEGER,
  sex                     TEXT NOT NULL DEFAULT 'Male',
  blood_group             TEXT,
  phone                   TEXT,
  email                   TEXT,
  password                TEXT,
  address                 TEXT,
  weight                  TEXT,
  height                  TEXT,
  allergies               TEXT DEFAULT '[]',   -- JSON array
  chronic_conditions      TEXT DEFAULT '[]',   -- JSON array
  current_medications     TEXT DEFAULT '[]',   -- JSON array
  ec_name                 TEXT,                -- Emergency contact
  ec_phone                TEXT,
  ec_relation             TEXT,
  govt_id_type            TEXT,
  govt_id_number          TEXT,
  insurance_provider      TEXT,
  insurance_number        TEXT,
  primary_doctor_id       TEXT,
  photo_url               TEXT,
  notes                   TEXT,
  is_active               INTEGER NOT NULL DEFAULT 1,
  registered_by           TEXT,
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (primary_doctor_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_patients_hospital ON patients(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patients_uhid ON patients(uhid);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);

-- ── ENCOUNTERS (OPD visits, emergency, follow-up) ──────────────────────
CREATE TABLE IF NOT EXISTS encounters (
  id               TEXT PRIMARY KEY,
  hospital_id      TEXT NOT NULL,
  patient_id       TEXT NOT NULL,
  doctor_id        TEXT NOT NULL,
  encounter_type   TEXT NOT NULL DEFAULT 'OPD',  -- OPD | Emergency | Follow-up | IPD | Tele
  token_number     INTEGER,
  appointment_id   TEXT,
  status           TEXT NOT NULL DEFAULT 'Active', -- Active | Completed | Cancelled
  -- Clinical SOAP notes
  chief_complaint  TEXT,
  history          TEXT,                 -- History of presenting illness
  past_history     TEXT,
  examination      TEXT,                 -- Physical examination findings
  -- Diagnosis
  diagnosis        TEXT DEFAULT '[]',   -- JSON: [{ code, name, type }]
  impression       TEXT,
  -- Plan
  plan             TEXT,
  advice           TEXT,
  follow_up_date   TEXT,
  refer_to         TEXT,                 -- Referral to specialist
  -- Metadata
  duration_mins    INTEGER,
  billing_amount   REAL,
  notes            TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id)  REFERENCES patients(id),
  FOREIGN KEY (doctor_id)   REFERENCES users(id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE INDEX IF NOT EXISTS idx_encounters_patient  ON encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_doctor   ON encounters(doctor_id);
CREATE INDEX IF NOT EXISTS idx_encounters_date     ON encounters(created_at);
CREATE INDEX IF NOT EXISTS idx_encounters_hospital ON encounters(hospital_id);

-- ── VITALS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vitals (
  id               TEXT PRIMARY KEY,
  patient_id       TEXT NOT NULL,
  encounter_id     TEXT,
  hospital_id      TEXT NOT NULL,
  bp_systolic      INTEGER,
  bp_diastolic     INTEGER,
  heart_rate       INTEGER,
  temperature      REAL,
  temperature_unit TEXT DEFAULT 'F',
  spo2             INTEGER,
  weight           REAL,
  weight_unit      TEXT DEFAULT 'kg',
  height           REAL,
  height_unit      TEXT DEFAULT 'cm',
  bmi              REAL,
  respiratory_rate INTEGER,
  blood_sugar      REAL,
  blood_sugar_type TEXT,   -- fasting | random | post-meal
  pain_score       INTEGER, -- 0-10
  notes            TEXT,
  recorded_by      TEXT NOT NULL,
  recorded_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id)   REFERENCES patients(id),
  FOREIGN KEY (encounter_id) REFERENCES encounters(id)
);

CREATE INDEX IF NOT EXISTS idx_vitals_patient   ON vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_encounter ON vitals(encounter_id);

-- ── PRESCRIPTIONS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  id            TEXT PRIMARY KEY,
  hospital_id   TEXT NOT NULL,
  patient_id    TEXT NOT NULL,
  doctor_id     TEXT NOT NULL,
  encounter_id  TEXT,
  medicines     TEXT NOT NULL DEFAULT '[]',  -- JSON array of medicine objects
  advice        TEXT,
  follow_up_date TEXT,
  patient_weight TEXT,
  slip_token    TEXT UNIQUE,   -- for share link
  is_printed    INTEGER DEFAULT 0,
  created_by_role TEXT DEFAULT 'doctor',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id)   REFERENCES patients(id),
  FOREIGN KEY (doctor_id)    REFERENCES users(id),
  FOREIGN KEY (encounter_id) REFERENCES encounters(id)
);

CREATE INDEX IF NOT EXISTS idx_rx_patient   ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_rx_doctor    ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_rx_encounter ON prescriptions(encounter_id);

-- ── LAB ORDERS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lab_orders (
  id            TEXT PRIMARY KEY,
  hospital_id   TEXT NOT NULL,
  patient_id    TEXT NOT NULL,
  doctor_id     TEXT NOT NULL,
  encounter_id  TEXT,
  tests         TEXT NOT NULL DEFAULT '[]',  -- JSON: [{ name, code, urgency }]
  status        TEXT NOT NULL DEFAULT 'Ordered',  -- Ordered | Sample Collected | Processing | Completed
  results       TEXT DEFAULT '[]',             -- JSON: [{ test, value, unit, reference, flag }]
  result_notes  TEXT,
  ordered_at    TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at  TEXT,
  FOREIGN KEY (patient_id)   REFERENCES patients(id),
  FOREIGN KEY (doctor_id)    REFERENCES users(id),
  FOREIGN KEY (encounter_id) REFERENCES encounters(id)
);

-- ── PATIENT UPLOADS (Test Results, Scans, etc) ─────────────────────────
CREATE TABLE IF NOT EXISTS patient_uploads (
  id            TEXT PRIMARY KEY,
  patient_id    TEXT NOT NULL,
  hospital_id   TEXT NOT NULL,
  title         TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  file_type     TEXT,
  notes         TEXT,
  uploaded_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id)  REFERENCES patients(id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);
CREATE INDEX IF NOT EXISTS idx_puploads_patient ON patient_uploads(patient_id);

-- ── APPOINTMENTS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id               TEXT PRIMARY KEY,
  hospital_id      TEXT NOT NULL,
  patient_id       TEXT NOT NULL,
  doctor_id        TEXT NOT NULL,
  date             TEXT NOT NULL,
  time             TEXT NOT NULL,
  token_number     INTEGER,
  reason           TEXT,
  status           TEXT NOT NULL DEFAULT 'Scheduled',  -- Scheduled | Confirmed | Checked-In | Completed | Cancelled | No-Show
  notes            TEXT,
  booked_by        TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id)  REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_appt_date     ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appt_patient  ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appt_doctor   ON appointments(doctor_id);

-- ── BEDS / WARDS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS beds (
  id           TEXT PRIMARY KEY,
  hospital_id  TEXT NOT NULL,
  bed_number   TEXT NOT NULL,
  ward         TEXT NOT NULL,
  room         TEXT,
  type         TEXT DEFAULT 'General',  -- General | Private | Semi-Private | ICU
  status       TEXT NOT NULL DEFAULT 'Available',  -- Available | Occupied | Maintenance
  patient_id   TEXT,
  doctor_id    TEXT,
  admitted_at  TEXT,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (patient_id)  REFERENCES patients(id)
);

-- ── BILLING ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing (
  id             TEXT PRIMARY KEY,
  hospital_id    TEXT NOT NULL,
  patient_id     TEXT NOT NULL,
  encounter_id   TEXT,
  items          TEXT NOT NULL DEFAULT '[]',  -- JSON: [{ description, quantity, unit_price, amount }]
  total_amount   REAL NOT NULL DEFAULT 0,
  discount       REAL DEFAULT 0,
  net_amount     REAL NOT NULL DEFAULT 0,
  paid_amount    REAL DEFAULT 0,
  payment_mode   TEXT DEFAULT 'Cash',  -- Cash | Card | UPI | Insurance
  payment_status TEXT NOT NULL DEFAULT 'Pending',  -- Pending | Partial | Paid | Waived
  invoice_number TEXT UNIQUE,
  notes          TEXT,
  billed_by      TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id)   REFERENCES patients(id),
  FOREIGN KEY (encounter_id) REFERENCES encounters(id)
);

-- ── SYNC QUEUE (tracks offline changes that need server sync) ─────────
CREATE TABLE IF NOT EXISTS sync_queue (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name   TEXT NOT NULL,
  record_id    TEXT NOT NULL,
  operation    TEXT NOT NULL,  -- INSERT | UPDATE | DELETE
  payload      TEXT NOT NULL,  -- JSON of the full record
  client_id    TEXT,           -- which client device sent this
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  synced_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_synced ON sync_queue(synced_at);

-- ── AUDIT LOG ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL,
  action     TEXT NOT NULL,
  table_name TEXT,
  record_id  TEXT,
  details    TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── SEED: Default Hospital & Super Admin ─────────────────────────────
INSERT OR IGNORE INTO hospitals (id, name, type, city, phone) VALUES
  ('hsp-001', 'Medicos General Hospital', 'General', 'Mumbai', '+91-22-12345678');

-- Default super admin password: Admin@123 (bcrypt hash)
INSERT OR IGNORE INTO users (id, name, email, password, role, hospital_id) VALUES
  ('usr-admin-001', 'System Admin', 'admin@medicos.local',
   '$2a$10$MLl//yWnowDtuDfcC1Y.B.IqOugs3ssrG0KH97n3Kpdx5aYKx/A2i',
   'admin', 'hsp-001');

-- Default doctor: Doctor@123
INSERT OR IGNORE INTO users (id, name, email, password, role, hospital_id) VALUES
  ('usr-doc-001', 'Dr. Priya Sharma', 'dr.sharma@medicos.local',
   '$2a$10$P7E4OHjw26NaRnJESh85OudIwEUwJxfILUIyBEy.jO3Q2WiEo4O2e',
   'doctor', 'hsp-001');

-- Default receptionist: Recept@123
INSERT OR IGNORE INTO users (id, name, email, password, role, hospital_id) VALUES
  ('usr-rcpt-001', 'Anita Patel', 'reception@medicos.local',
   '$2a$10$DUYts83FR/pnoqZ0xE4qgOK4dPZ8VLK4Dmnkm29C1AhpfAc4md5jW',
   'receptionist', 'hsp-001');

-- Sample patient
INSERT OR IGNORE INTO patients
  (id, uhid, hospital_id, name, age, sex, blood_group, phone, allergies, chronic_conditions, registered_by)
VALUES
  ('pat-001', 'UHID-001-000001', 'hsp-001', 'Rahul Mehta', 34, 'Male', 'B+',
   '+91-9876543210', '["Penicillin"]', '["Hypertension", "Type 2 Diabetes"]', 'usr-rcpt-001');
