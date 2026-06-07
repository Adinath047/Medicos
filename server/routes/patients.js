// server/routes/patients.js
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query, queryOne, run, parseJsonFields, auditLog } = require('../db/database');
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
router.get('/', authMiddleware, async (req, res) => {
  const { hospitalId, role } = req.user;
  let { q, limit = 50, offset = 0 } = req.query;

  // Sanitise pagination
  limit  = Math.min(Math.max(parseInt(limit)  || 50,  1), 500);
  offset = Math.max(parseInt(offset) || 0, 0);

  const hid = role === 'super_admin' ? null : hospitalId;
  let sql = 'SELECT * FROM patients WHERE is_active = 1';
  const params = [];
  let index = 1;

  if (hid) { 
    sql += ` AND hospital_id = $${index++}`; 
    params.push(hid); 
  }
  
  // Doctor Privacy: only see treated patients
  if (role === 'doctor') {
    sql += ` AND (
      primary_doctor_id = $${index} OR
      registered_by = $${index} OR
      id IN (SELECT patient_id FROM appointments WHERE doctor_id = $${index}) OR
      id IN (SELECT patient_id FROM encounters WHERE doctor_id = $${index}) OR
      id IN (SELECT patient_id FROM prescriptions WHERE doctor_id = $${index})
    )`;
    params.push(req.user.id);
    index++;
  }

  if (q)   {
    const qTrim = q.trim().slice(0, 100);
    const s = `%${qTrim}%`;
    const h = hmacFingerprint(qTrim);
    sql += ` AND (name ILIKE $${index++} OR phone_hash = $${index++} OR uhid ILIKE $${index++})`;
    params.push(s, h, s);
  }

  sql += ` ORDER BY created_at DESC LIMIT $${index++} OFFSET $${index++}`;
  params.push(limit, offset);

  try {
    const rows = (await query(sql, params)).map(parsePatient);
    
    let countSql = `SELECT COUNT(*) as n FROM patients WHERE is_active = 1`;
    const countParams = [];
    let countIndex = 1;
    if (hid) {
      countSql += ` AND hospital_id = $${countIndex++}`;
      countParams.push(hid);
    }
    if (role === 'doctor') {
      countSql += ` AND (
        primary_doctor_id = $${countIndex} OR
        registered_by = $${countIndex} OR
        id IN (SELECT patient_id FROM appointments WHERE doctor_id = $${countIndex}) OR
        id IN (SELECT patient_id FROM encounters WHERE doctor_id = $${countIndex}) OR
        id IN (SELECT patient_id FROM prescriptions WHERE doctor_id = $${countIndex})
      )`;
      countParams.push(req.user.id);
      countIndex++;
    }
    
    const totalRow = await queryOne(countSql, countParams);
    const total = totalRow ? parseInt(totalRow.n || 0) : 0;

    res.json({ patients: rows, total, limit, offset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patients/:id
router.get('/:id', authMiddleware, async (req, res) => {
  const { hospitalId, role } = req.user;
  try {
    const row = await queryOne('SELECT * FROM patients WHERE id = $1 AND hospital_id = $2 AND is_active = 1', [req.params.id, hospitalId]);
    if (!row) return res.status(404).json({ error: 'Patient not found' });
    
    // Doctor Privacy: check if doctor has treated the patient
    if (role === 'doctor') {
      const treated = await queryOne(
        `SELECT 1 FROM patients p
         WHERE p.id = $1 AND (
           p.primary_doctor_id = $2 OR
           p.registered_by = $2 OR
           EXISTS (SELECT 1 FROM appointments WHERE patient_id = $1 AND doctor_id = $2) OR
           EXISTS (SELECT 1 FROM encounters WHERE patient_id = $1 AND doctor_id = $2) OR
           EXISTS (SELECT 1 FROM prescriptions WHERE patient_id = $1 AND doctor_id = $2)
         )`,
        [req.params.id, req.user.id]
      );
      if (!treated) {
        return res.status(403).json({ error: 'Access Denied: You have not treated this patient' });
      }
    }

    res.json(parsePatient(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
  async (req, res) => {
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

    try {
      const hospitalId = bodyHospId || req.user.hospitalId || 'hsp-001';
      const countRow = await queryOne('SELECT COUNT(*) as n FROM patients WHERE hospital_id = $1', [hospitalId]);
      const count = countRow ? parseInt(countRow.n || 0) : 0;
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

      await run(
        `INSERT INTO patients
          (id, uhid, hospital_id, name, dob, age, sex, blood_group, phone, phone_hash, email, address,
           weight, height, allergies, chronic_conditions, current_medications,
           ec_name, ec_phone, ec_relation,
           govt_id_type, govt_id_number, insurance_provider, insurance_number,
           primary_doctor_id, notes, registered_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)`,
        [id, uhid, hospitalId, name.trim(), encrypted.dob, age||null, sex, blood_group||null,
         encrypted.phone, encrypted.phone_hash || null, encrypted.email, encrypted.address, weight||null, height||null,
         JSON.stringify(allergies), JSON.stringify(chronic_conditions), JSON.stringify(current_medications),
         ec_name||null, encrypted.ec_phone, ec_relation||null,
         govt_id_type||null, encrypted.govt_id_number,
         insurance_provider||null, insurance_number||null,
         primary_doctor_id||null, notes||null, req.user.id]
      );

      auditLog(req.user.id, 'CREATE_PATIENT', 'patients', id, { name: name.trim(), uhid }, ip(req));
      const created = await queryOne('SELECT * FROM patients WHERE id = $1', [id]);
      res.status(201).json(parsePatient(created));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
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
  async (req, res) => {
    try {
      const existing = await queryOne('SELECT id FROM patients WHERE id = $1 AND hospital_id = $2 AND is_active = 1', [req.params.id, req.user.hospitalId]);
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

      await run(
        `UPDATE patients SET
          name=$1, dob=$2, age=$3, sex=$4, blood_group=$5, phone=$6, phone_hash=$7, email=$8, address=$9,
          weight=$10, height=$11,
          allergies=$12, chronic_conditions=$13, current_medications=$14,
          ec_name=$15, ec_phone=$16, ec_relation=$17,
          govt_id_type=$18, govt_id_number=$19,
          insurance_provider=$20, insurance_number=$21,
          primary_doctor_id=$22, notes=$23,
          updated_at=now()::text
         WHERE id=$24`,
        [name.trim(), encrypted.dob, age||null, sex, blood_group||null, encrypted.phone, encrypted.phone_hash || null, encrypted.email, encrypted.address,
         weight||null, height||null,
         JSON.stringify(allergies||[]), JSON.stringify(chronic_conditions||[]), JSON.stringify(current_medications||[]),
         ec_name||null, encrypted.ec_phone, ec_relation||null,
         govt_id_type||null, encrypted.govt_id_number,
         insurance_provider||null, insurance_number||null,
         primary_doctor_id||null, notes||null, req.params.id]
      );

      auditLog(req.user.id, 'UPDATE_PATIENT', 'patients', req.params.id, { name }, ip(req));
      const updated = await queryOne('SELECT * FROM patients WHERE id = $1', [req.params.id]);
      res.json(parsePatient(updated));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE /api/patients/:id (soft delete)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await queryOne('SELECT id FROM patients WHERE id = $1 AND hospital_id = $2 AND is_active = 1', [req.params.id, req.user.hospitalId]);
    if (!existing) return res.status(404).json({ error: 'Patient not found' });
    await run("UPDATE patients SET is_active = 0, updated_at = now()::text WHERE id = $1", [req.params.id]);
    auditLog(req.user.id, 'DELETE_PATIENT', 'patients', req.params.id, {}, ip(req));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patients/:id/summary — encounters + vitals + prescriptions
router.get('/:id/summary', authMiddleware, async (req, res) => {
  const { hospitalId, role } = req.user;
  try {
    const patient = await queryOne('SELECT * FROM patients WHERE id = $1 AND hospital_id = $2', [req.params.id, hospitalId]);
    if (!patient) return res.status(404).json({ error: 'Not found' });

    // Doctor Privacy: check if doctor has treated the patient
    if (role === 'doctor') {
      const treated = await queryOne(
        `SELECT 1 FROM patients p
         WHERE p.id = $1 AND (
           p.primary_doctor_id = $2 OR
           p.registered_by = $2 OR
           EXISTS (SELECT 1 FROM appointments WHERE patient_id = $1 AND doctor_id = $2) OR
           EXISTS (SELECT 1 FROM encounters WHERE patient_id = $1 AND doctor_id = $2) OR
           EXISTS (SELECT 1 FROM prescriptions WHERE patient_id = $1 AND doctor_id = $2)
         )`,
        [req.params.id, req.user.id]
      );
      if (!treated) {
        return res.status(403).json({ error: 'Access Denied: You have not treated this patient' });
      }
    }

    const encounters    = await query('SELECT * FROM encounters WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 20', [req.params.id]);
    const latestVitals  = await queryOne('SELECT * FROM vitals WHERE patient_id = $1 ORDER BY recorded_at DESC LIMIT 1', [req.params.id]);
    const prescriptions = await query('SELECT * FROM prescriptions WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 30', [req.params.id]);
    const rxCount       = prescriptions.length;
    const apptUpcoming  = await query("SELECT * FROM appointments WHERE patient_id = $1 ORDER BY date DESC LIMIT 10", [req.params.id]);

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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
