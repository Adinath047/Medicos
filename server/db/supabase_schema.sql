-- =====================================================================
--  MEDICOS EMR — Supabase (Postgres) Schema
--  Run this once in Supabase SQL Editor
-- =====================================================================

-- ── HOSPITALS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospitals (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  type         TEXT DEFAULT 'General',
  address      TEXT,
  city         TEXT,
  state        TEXT,
  pincode      TEXT,
  phone        TEXT,
  email        TEXT,
  logo_url     TEXT,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (now()::text),
  updated_at   TEXT NOT NULL DEFAULT (now()::text)
);

-- ── USERS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  email            TEXT UNIQUE NOT NULL,
  password         TEXT NOT NULL,
  role             TEXT NOT NULL DEFAULT 'doctor',
  hospital_id      TEXT,
  staff_id         TEXT,
  phone            TEXT,
  specialization   TEXT,
  license_number   TEXT,
  photo_url        TEXT,
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (now()::text),
  updated_at       TEXT NOT NULL DEFAULT (now()::text)
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
  address                 TEXT,
  weight                  TEXT,
  height                  TEXT,
  allergies               TEXT DEFAULT '[]',
  chronic_conditions      TEXT DEFAULT '[]',
  current_medications     TEXT DEFAULT '[]',
  ec_name                 TEXT,
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
  created_at              TEXT NOT NULL DEFAULT (now()::text),
  updated_at              TEXT NOT NULL DEFAULT (now()::text)
);

-- ── ENCOUNTERS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS encounters (
  id               TEXT PRIMARY KEY,
  hospital_id      TEXT NOT NULL,
  patient_id       TEXT NOT NULL,
  doctor_id        TEXT NOT NULL,
  encounter_type   TEXT NOT NULL DEFAULT 'OPD',
  token_number     INTEGER,
  appointment_id   TEXT,
  status           TEXT NOT NULL DEFAULT 'Active',
  chief_complaint  TEXT,
  history          TEXT,
  past_history     TEXT,
  examination      TEXT,
  diagnosis        TEXT DEFAULT '[]',
  impression       TEXT,
  plan             TEXT,
  advice           TEXT,
  follow_up_date   TEXT,
  refer_to         TEXT,
  duration_mins    INTEGER,
  billing_amount   REAL,
  notes            TEXT,
  doctor_name      TEXT,
  created_at       TEXT NOT NULL DEFAULT (now()::text),
  updated_at       TEXT NOT NULL DEFAULT (now()::text)
);

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
  blood_sugar_type TEXT,
  pain_score       INTEGER,
  notes            TEXT,
  recorded_by      TEXT NOT NULL,
  recorded_at      TEXT NOT NULL DEFAULT (now()::text)
);

-- ── PRESCRIPTIONS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  id               TEXT PRIMARY KEY,
  hospital_id      TEXT NOT NULL,
  patient_id       TEXT NOT NULL,
  doctor_id        TEXT NOT NULL,
  encounter_id     TEXT,
  medicines        TEXT NOT NULL DEFAULT '[]',
  advice           TEXT,
  follow_up_date   TEXT,
  patient_weight   TEXT,
  slip_token       TEXT UNIQUE,
  is_printed       INTEGER DEFAULT 0,
  created_by_role  TEXT DEFAULT 'doctor',
  created_at       TEXT NOT NULL DEFAULT (now()::text)
);

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
  status           TEXT NOT NULL DEFAULT 'Scheduled',
  notes            TEXT,
  booked_by        TEXT,
  patient_name     TEXT,
  doctor_name      TEXT,
  created_at       TEXT NOT NULL DEFAULT (now()::text),
  updated_at       TEXT NOT NULL DEFAULT (now()::text)
);

-- ── BILLING ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing (
  id             TEXT PRIMARY KEY,
  hospital_id    TEXT NOT NULL,
  patient_id     TEXT NOT NULL,
  encounter_id   TEXT,
  items          TEXT NOT NULL DEFAULT '[]',
  total_amount   REAL NOT NULL DEFAULT 0,
  discount       REAL DEFAULT 0,
  net_amount     REAL NOT NULL DEFAULT 0,
  paid_amount    REAL DEFAULT 0,
  payment_mode   TEXT DEFAULT 'Cash',
  payment_status TEXT NOT NULL DEFAULT 'Pending',
  invoice_number TEXT UNIQUE,
  notes          TEXT,
  billed_by      TEXT,
  patient_name   TEXT,
  created_at     TEXT NOT NULL DEFAULT (now()::text)
);

-- ── SEED DATA ─────────────────────────────────────────────────────────
INSERT INTO hospitals (id, name, type, city, phone)
  VALUES ('hsp-001', 'Medicos General Hospital', 'General', 'Mumbai', '+91-22-12345678')
  ON CONFLICT (id) DO NOTHING;

-- Admin password: Admin@123
INSERT INTO users (id, name, email, password, role, hospital_id)
  VALUES ('usr-admin-001', 'System Admin', 'admin@medicos.local',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'hsp-001')
  ON CONFLICT (id) DO NOTHING;

-- Doctor password: Doctor@123
INSERT INTO users (id, name, email, password, role, hospital_id)
  VALUES ('usr-doc-001', 'Dr. Priya Sharma', 'dr.sharma@medicos.local',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'doctor', 'hsp-001')
  ON CONFLICT (id) DO NOTHING;

-- Receptionist password: Recept@123
INSERT INTO users (id, name, email, password, role, hospital_id)
  VALUES ('usr-rcpt-001', 'Anita Patel', 'reception@medicos.local',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'receptionist', 'hsp-001')
  ON CONFLICT (id) DO NOTHING;

-- Sample patient
INSERT INTO patients (id, uhid, hospital_id, name, age, sex, blood_group, phone, allergies, chronic_conditions, registered_by)
  VALUES ('pat-001', 'UHID-001-000001', 'hsp-001', 'Rahul Mehta', 34, 'Male', 'B+',
    '+91-9876543210', '["Penicillin"]', '["Hypertension", "Type 2 Diabetes"]', 'usr-rcpt-001')
  ON CONFLICT (id) DO NOTHING;
