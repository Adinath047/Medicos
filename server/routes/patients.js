// server/routes/patients.js
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query, queryOne, run, transaction, parseJsonFields, auditLog } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const v = require('../middleware/validate');
const { encryptFields, decryptFields, hmacFingerprint } = require('../utils/crypto');

const SENSITIVE_FIELDS = ['phone', 'email', 'address', 'dob', 'govt_id_number', 'ec_phone'];

const ip = req => req.ip || null;

const JSON_FIELDS = ['allergies', 'chronic_conditions', 'current_medications'];

function parsePatient(p) { 
  const withJson = parseJsonFields(p, JSON_FIELDS); 
  return decryptFields(withJson, SENSITIVE_FIELDS);
}

function genUHID(hospitalId, count) {
  const prefix = hospitalId.split('-')[1]?.toUpperCase() ?? '001';
  return `UHID-${prefix}-${String(count + 1).padStart(6, '0')}`;
}

const VALID_SEX          = ['Male', 'Female', 'Other'];
const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const VALID_GOV_ID_TYPES = ['Aadhaar', 'PAN', 'Passport', 'Voter ID', 'Driving License', 'Other'];

// GET /api/patients — list (scoped to hospital)
router.get('/', authMiddleware, (req, res) => {
  const { hospitalId, role } = req.user;
  let { q, limit = 50, offset = 0 } = req.query;

  // Sanitise pagination
  limit  = Math.min(Math.max(parseInt(limit)  || 50,  1), 500);
  offset = Math.max(parseInt(offset) || 0, 0);

  const hid = role === 'super_admin' ? null : hospitalId;
  let sql = 'SELECT * FROM patients WHERE is_active = 1';
  const params = [];

  if (hid) { sql += ' AND hospital_id = ?'; params.push(hid); }
  
  // Doctor Privacy: only see own patients unless searching
  if (role === 'doctor' && !q) {
    sql += ' AND primary_doctor_id = ?';
    params.push(req.user.id);
  }

  if (q)   {
    const qTrim = q.trim().slice(0, 100);
    const s = `%${qTrim}%`;
    const h = hmacFingerprint(qTrim);
    sql += ' AND (name LIKE ? OR phone_hash = ? OR uhid LIKE ?)';
    params.push(s, h, s);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = query(sql, params).map(parsePatient);
  const total = queryOne(
    `SELECT COUNT(*) as n FROM patients WHERE is_active = 1${hid ? ' AND hospital_id = ?' : ''}${role === 'doctor' && !q ? ' AND primary_doctor_id = ?' : ''}`,
    [...(hid ? [hid] : []), ...(role === 'doctor' && !q ? [req.user.id] : [])]
  ).n;

  res.json({ patients: rows, total, limit, offset });
});

// GET /api/patients/:id
router.get('/:id', authMiddleware, (req, res) => {
  const row = queryOne('SELECT * FROM patients WHERE id = ? AND is_active = 1', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Patient not found' });
  res.json(parsePatient(row));
});

// POST /api/patients
router.post('/',
  authMiddleware,
  v.body({
    name:             [v.required, v.str(2, 150)],
    sex:              [v.required, v.oneOf(VALID_SEX)],
    dob:              [v.notFutureDate],
    phone:            [v.phone],
    email:            [v.email],
    blood_group:      [v.oneOf(VALID_BLOOD_GROUPS)],
    ec_phone:         [v.phone],
    insurance_number: [v.str(0, 80)],
  }),
  (req, res) => {
    const {
      name, dob, age, sex, blood_group, phone, email, address,
      weight, height, allergies = [], chronic_conditions = [], current_medications = [],
      ec_name, ec_phone, ec_relation,
      govt_id_type, govt_id_number,
      insurance_provider, insurance_number,
      primary_doctor_id, notes,
      hospital_id: bodyHospId,
    } = req.body;

    // Validate govt_id_type if provided
    if (govt_id_type && !VALID_GOV_ID_TYPES.includes(govt_id_type)) {
      return res.status(422).json({ error: 'Validation failed', message: `govt_id_type must be one of: ${VALID_GOV_ID_TYPES.join(', ')}` });
    }

    // Validate allergies / conditions are arrays
    if (!Array.isArray(allergies))         return res.status(422).json({ error: 'allergies must be an array' });
    if (!Array.isArray(chronic_conditions)) return res.status(422).json({ error: 'chronic_conditions must be an array' });

    // Numeric range checks
    if (weight && (parseFloat(weight) < 0.5 || parseFloat(weight) > 600)) {
      return res.status(422).json({ error: 'Validation failed', message: 'weight: must be between 0.5 and 600 kg' });
    }
    if (height && (parseFloat(height) < 20 || parseFloat(height) > 280)) {
      return res.status(422).json({ error: 'Validation failed', message: 'height: must be between 20 and 280 cm' });
    }
    if (age && (parseInt(age) < 0 || parseInt(age) > 150)) {
      return res.status(422).json({ error: 'Validation failed', message: 'age: must be between 0 and 150' });
    }

    const hospitalId = bodyHospId || req.user.hospitalId || 'hsp-001';
    const count = queryOne('SELECT COUNT(*) as n FROM patients WHERE hospital_id = ?', [hospitalId]).n;
    const uhid  = req.body.uhid || genUHID(hospitalId, count);
    const id    = req.body.id   || uuid();

    const rawData = {
      phone: phone || null,
      email: email || null,
      address: address || null,
      dob: dob || null,
      govt_id_number: govt_id_number || null,
      ec_phone: ec_phone || null
    };
    const encrypted = encryptFields(rawData, SENSITIVE_FIELDS, { addHashes: ['phone'] });

    run(
      `INSERT INTO patients
        (id, uhid, hospital_id, name, dob, age, sex, blood_group, phone, phone_hash, email, address,
         weight, height, allergies, chronic_conditions, current_medications,
         ec_name, ec_phone, ec_relation,
         govt_id_type, govt_id_number, insurance_provider, insurance_number,
         primary_doctor_id, notes, registered_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, uhid, hospitalId, name.trim(), encrypted.dob, age||null, sex, blood_group||null,
       encrypted.phone, encrypted.phone_hash || null, encrypted.email, encrypted.address, weight||null, height||null,
       JSON.stringify(allergies), JSON.stringify(chronic_conditions), JSON.stringify(current_medications),
       ec_name||null, encrypted.ec_phone, ec_relation||null,
       govt_id_type||null, encrypted.govt_id_number,
       insurance_provider||null, insurance_number||null,
       primary_doctor_id||null, notes||null, req.user.id]
    );

    auditLog(req.user.id, 'CREATE_PATIENT', 'patients', id, { name: name.trim(), uhid }, ip(req));
    const created = queryOne('SELECT * FROM patients WHERE id = ?', [id]);
    res.status(201).json(parsePatient(created));
  }
);

// PUT /api/patients/:id
router.put('/:id',
  authMiddleware,
  v.body({
    name:        [v.required, v.str(2, 150)],
    sex:         [v.required, v.oneOf(VALID_SEX)],
    dob:         [v.notFutureDate],
    phone:       [v.phone],
    email:       [v.email],
    blood_group: [v.oneOf(VALID_BLOOD_GROUPS)],
    ec_phone:    [v.phone],
  }),
  (req, res) => {
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

    const rawData = {
      phone: phone || null,
      email: email || null,
      address: address || null,
      dob: dob || null,
      govt_id_number: govt_id_number || null,
      ec_phone: ec_phone || null
    };
    const encrypted = encryptFields(rawData, SENSITIVE_FIELDS, { addHashes: ['phone'] });

    run(
      `UPDATE patients SET
        name=?, dob=?, age=?, sex=?, blood_group=?, phone=?, phone_hash=?, email=?, address=?,
        weight=?, height=?,
        allergies=?, chronic_conditions=?, current_medications=?,
        ec_name=?, ec_phone=?, ec_relation=?,
        govt_id_type=?, govt_id_number=?,
        insurance_provider=?, insurance_number=?,
        primary_doctor_id=?, notes=?,
        updated_at=datetime('now')
       WHERE id=?`,
      [name.trim(), encrypted.dob, age||null, sex, blood_group||null, encrypted.phone, encrypted.phone_hash || null, encrypted.email, encrypted.address,
       weight||null, height||null,
       JSON.stringify(allergies||[]), JSON.stringify(chronic_conditions||[]), JSON.stringify(current_medications||[]),
       ec_name||null, encrypted.ec_phone, ec_relation||null,
       govt_id_type||null, encrypted.govt_id_number,
       insurance_provider||null, insurance_number||null,
       primary_doctor_id||null, notes||null, req.params.id]
    );

    auditLog(req.user.id, 'UPDATE_PATIENT', 'patients', req.params.id, { name }, ip(req));
    res.json(parsePatient(queryOne('SELECT * FROM patients WHERE id = ?', [req.params.id])));
  }
);

// DELETE /api/patients/:id (soft delete)
router.delete('/:id', authMiddleware, (req, res) => {
  const existing = queryOne('SELECT id FROM patients WHERE id = ? AND is_active = 1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Patient not found' });
  run("UPDATE patients SET is_active = 0, updated_at = datetime('now') WHERE id = ?", [req.params.id]);
  auditLog(req.user.id, 'DELETE_PATIENT', 'patients', req.params.id, {}, ip(req));
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
