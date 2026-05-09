// server/routes/vitals.js
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query, queryOne, run, auditLog } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const ip = req => req.ip || null;

// GET /api/vitals?patient_id=&encounter_id=
router.get('/', authMiddleware, (req, res) => {
  const { patient_id, encounter_id, limit = 20 } = req.query;
  let sql = 'SELECT v.*, u.name as recorded_by_name FROM vitals v LEFT JOIN users u ON v.recorded_by = u.id WHERE 1=1';
  const params = [];
  if (patient_id)  { sql += ' AND v.patient_id = ?';   params.push(patient_id); }
  if (encounter_id){ sql += ' AND v.encounter_id = ?';  params.push(encounter_id); }
  sql += ' ORDER BY v.recorded_at DESC LIMIT ?';
  params.push(Number(limit));
  res.json(query(sql, params));
});

// GET /api/vitals/:id
router.get('/:id', authMiddleware, (req, res) => {
  const row = queryOne('SELECT * FROM vitals WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// POST /api/vitals
router.post('/', authMiddleware, (req, res) => {
  const {
    patient_id, encounter_id, hospital_id: bodyHid,
    bp_systolic, bp_diastolic, heart_rate,
    temperature, temperature_unit = 'F',
    spo2, weight, weight_unit = 'kg',
    height, height_unit = 'cm',
    respiratory_rate, blood_sugar, blood_sugar_type,
    pain_score, notes,
  } = req.body;

  if (!patient_id) return res.status(400).json({ error: 'patient_id required' });

  const hospitalId = bodyHid || req.user.hospitalId || 'hsp-001';
  const id = uuid();

  // Auto-calculate BMI
  let bmi = null;
  if (weight && height) {
    const hm = parseFloat(height) / 100;
    bmi = parseFloat((parseFloat(weight) / (hm * hm)).toFixed(1));
  }

  run(
    `INSERT INTO vitals
      (id, patient_id, encounter_id, hospital_id,
       bp_systolic, bp_diastolic, heart_rate,
       temperature, temperature_unit,
       spo2, weight, weight_unit, height, height_unit, bmi,
       respiratory_rate, blood_sugar, blood_sugar_type,
       pain_score, notes, recorded_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, patient_id, encounter_id||null, hospitalId,
     bp_systolic||null, bp_diastolic||null, heart_rate||null,
     temperature||null, temperature_unit,
     spo2||null, weight||null, weight_unit, height||null, height_unit, bmi,
     respiratory_rate||null, blood_sugar||null, blood_sugar_type||null,
     pain_score||null, notes||null, req.user.id]
  );

  // Update patient weight/height
  if (weight) run('UPDATE patients SET weight = ?, updated_at = datetime(\'now\') WHERE id = ?', [weight + weight_unit, patient_id]);

  auditLog(req.user.id, 'RECORD_VITALS', 'vitals', id, { patient_id, encounter_id: encounter_id||null }, ip(req));
  res.status(201).json(queryOne('SELECT * FROM vitals WHERE id = ?', [id]));
});

// GET /api/vitals/patient/:id/trend — last N readings for charts
router.get('/patient/:id/trend', authMiddleware, (req, res) => {
  const { n = 10 } = req.query;
  const rows = query(
    'SELECT * FROM vitals WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT ?',
    [req.params.id, Number(n)]
  );
  res.json(rows.reverse()); // chronological order for charts
});

module.exports = router;
