// server/routes/patients.js
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query, queryOne, run, transaction, parseJsonFields } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const JSON_FIELDS = ['allergies', 'chronic_conditions', 'current_medications'];

function parsePatient(p) { return parseJsonFields(p, JSON_FIELDS); }

function genUHID(hospitalId, count) {
  const prefix = hospitalId.split('-')[1]?.toUpperCase() ?? '001';
  return `UHID-${prefix}-${String(count + 1).padStart(6, '0')}`;
}

// GET /api/patients — list (scoped to hospital)
router.get('/', authMiddleware, (req, res) => {
  const { hospitalId, role } = req.user;
  const { q, limit = 50, offset = 0 } = req.query;

  const hid = role === 'super_admin' ? null : hospitalId;
  let sql = 'SELECT * FROM patients WHERE is_active = 1';
  const params = [];

  if (hid) { sql += ' AND hospital_id = ?'; params.push(hid); }
  if (q)   { sql += ' AND (name LIKE ? OR phone LIKE ? OR uhid LIKE ?)'; const s = `%${q}%`; params.push(s, s, s); }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const rows = query(sql, params).map(parsePatient);
  const total = queryOne(
    `SELECT COUNT(*) as n FROM patients WHERE is_active = 1${hid ? ' AND hospital_id = ?' : ''}`,
    hid ? [hid] : []
  ).n;

  res.json({ patients: rows, total, limit: Number(limit), offset: Number(offset) });
});

// GET /api/patients/:id
router.get('/:id', authMiddleware, (req, res) => {
  const row = queryOne('SELECT * FROM patients WHERE id = ? AND is_active = 1', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Patient not found' });
  res.json(parsePatient(row));
});

// POST /api/patients
router.post('/', authMiddleware, (req, res) => {
  const {
    name, dob, age, sex, blood_group, phone, email, address,
    weight, height, allergies = [], chronic_conditions = [], current_medications = [],
    ec_name, ec_phone, ec_relation,
    govt_id_type, govt_id_number,
    insurance_provider, insurance_number,
    primary_doctor_id, notes,
    hospital_id: bodyHospId,
  } = req.body;

  if (!name || !sex) return res.status(400).json({ error: 'name and sex are required' });

  const hospitalId = bodyHospId || req.user.hospitalId || 'hsp-001';
  const count = queryOne('SELECT COUNT(*) as n FROM patients WHERE hospital_id = ?', [hospitalId]).n;
  const uhid  = req.body.uhid || genUHID(hospitalId, count);
  const id    = req.body.id   || uuid();  // honour client-generated UUID for offline-first

  run(
    `INSERT INTO patients
      (id, uhid, hospital_id, name, dob, age, sex, blood_group, phone, email, address,
       weight, height, allergies, chronic_conditions, current_medications,
       ec_name, ec_phone, ec_relation,
       govt_id_type, govt_id_number, insurance_provider, insurance_number,
       primary_doctor_id, notes, registered_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, uhid, hospitalId, name, dob||null, age||null, sex, blood_group||null,
     phone||null, email||null, address||null, weight||null, height||null,
     JSON.stringify(allergies), JSON.stringify(chronic_conditions), JSON.stringify(current_medications),
     ec_name||null, ec_phone||null, ec_relation||null,
     govt_id_type||null, govt_id_number||null,
     insurance_provider||null, insurance_number||null,
     primary_doctor_id||null, notes||null, req.user.id]
  );

  const created = queryOne('SELECT * FROM patients WHERE id = ?', [id]);
  res.status(201).json(parsePatient(created));
});

// PUT /api/patients/:id
router.put('/:id', authMiddleware, (req, res) => {
  const existing = queryOne('SELECT id FROM patients WHERE id = ? AND is_active = 1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Patient not found' });

  const {
    name, dob, age, sex, blood_group, phone, email, address,
    weight, height, allergies, chronic_conditions, current_medications,
    ec_name, ec_phone, ec_relation,
    govt_id_type, govt_id_number,
    insurance_provider, insurance_number,
    primary_doctor_id, notes,
  } = req.body;

  run(
    `UPDATE patients SET
      name=?, dob=?, age=?, sex=?, blood_group=?, phone=?, email=?, address=?,
      weight=?, height=?,
      allergies=?, chronic_conditions=?, current_medications=?,
      ec_name=?, ec_phone=?, ec_relation=?,
      govt_id_type=?, govt_id_number=?,
      insurance_provider=?, insurance_number=?,
      primary_doctor_id=?, notes=?,
      updated_at=datetime('now')
     WHERE id=?`,
    [name, dob||null, age||null, sex, blood_group||null, phone||null, email||null, address||null,
     weight||null, height||null,
     JSON.stringify(allergies||[]), JSON.stringify(chronic_conditions||[]), JSON.stringify(current_medications||[]),
     ec_name||null, ec_phone||null, ec_relation||null,
     govt_id_type||null, govt_id_number||null,
     insurance_provider||null, insurance_number||null,
     primary_doctor_id||null, notes||null, req.params.id]
  );

  res.json(parsePatient(queryOne('SELECT * FROM patients WHERE id = ?', [req.params.id])));
});

// DELETE /api/patients/:id (soft delete)
router.delete('/:id', authMiddleware, (req, res) => {
  run("UPDATE patients SET is_active = 0, updated_at = datetime('now') WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});

// GET /api/patients/:id/summary — encounters + vitals + prescriptions
router.get('/:id/summary', authMiddleware, (req, res) => {
  const patient = queryOne('SELECT * FROM patients WHERE id = ?', [req.params.id]);
  if (!patient) return res.status(404).json({ error: 'Not found' });

  const encounters    = query('SELECT * FROM encounters WHERE patient_id = ? ORDER BY created_at DESC LIMIT 20', [req.params.id]);
  const latestVitals  = queryOne('SELECT * FROM vitals WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 1', [req.params.id]);
  const prescriptions = query('SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY created_at DESC LIMIT 30', [req.params.id]);
  const rxCount       = prescriptions.length;
  const apptUpcoming  = query("SELECT * FROM appointments WHERE patient_id = ? ORDER BY date DESC LIMIT 10", [req.params.id]);

  // Parse medicines JSON in each prescription
  const parsedPrescriptions = prescriptions.map(rx => ({
    ...rx,
    medicines: (() => { try { return JSON.parse(rx.medicines || '[]'); } catch { return []; } })(),
  }));

  res.json({
    patient:       parsePatient(patient),
    encounters,
    latestVitals,
    prescriptions: parsedPrescriptions,
    rxCount,
    apptUpcoming,
  });
});

module.exports = router;
