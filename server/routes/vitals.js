// server/routes/vitals.js
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query, queryOne, run, auditLog } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const v = require('../middleware/validate');

const ip = req => req.ip || null;

// ── Clinical ranges ────────────────────────────────────────────────────────
// These are wide "survivable" ranges to catch data entry errors, not diagnostic thresholds.
const RANGES = {
  bp_systolic:      { min: 50,  max: 300,  unit: 'mmHg' },
  bp_diastolic:     { min: 20,  max: 200,  unit: 'mmHg' },
  heart_rate:       { min: 20,  max: 300,  unit: 'bpm'  },
  temperature_F:    { min: 85,  max: 115,  unit: '°F'   },
  temperature_C:    { min: 30,  max: 46,   unit: '°C'   },
  spo2:             { min: 50,  max: 100,  unit: '%'    },
  weight:           { min: 0.5, max: 600,  unit: 'kg'   },
  weight_lbs:       { min: 1,   max: 1300, unit: 'lbs'  },
  height:           { min: 20,  max: 280,  unit: 'cm'   },
  respiratory_rate: { min: 1,   max: 80,   unit: '/min' },
  blood_sugar:      { min: 10,  max: 2000, unit: 'mg/dL'},
  pain_score:       { min: 0,   max: 10,   unit: ''     },
};

function checkRange(value, key, errors) {
  if (value === undefined || value === null || value === '') return;
  const n = parseFloat(value);
  if (isNaN(n)) { errors.push(`${key}: must be a number`); return; }
  const r = RANGES[key];
  if (!r) return;
  if (n < r.min || n > r.max) {
    errors.push(`${key}: must be between ${r.min}–${r.max} ${r.unit}`);
  }
}

// GET /api/vitals?patient_id=&encounter_id=
router.get('/', authMiddleware, (req, res) => {
  const { patient_id, encounter_id, limit = 20 } = req.query;
  const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 200);
  let sql = 'SELECT v.*, u.name as recorded_by_name FROM vitals v LEFT JOIN users u ON v.recorded_by = u.id WHERE 1=1';
  const params = [];
  if (patient_id)   { sql += ' AND v.patient_id = ?';   params.push(patient_id); }
  if (encounter_id) { sql += ' AND v.encounter_id = ?';  params.push(encounter_id); }
  sql += ' ORDER BY v.recorded_at DESC LIMIT ?';
  params.push(safeLimit);
  res.json(query(sql, params));
});

// GET /api/vitals/:id
router.get('/:id', authMiddleware, (req, res) => {
  const row = queryOne('SELECT * FROM vitals WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// POST /api/vitals
router.post('/',
  authMiddleware,
  v.body({
    patient_id: [v.required, v.str(1, 100)],
  }),
  (req, res) => {
    const {
      patient_id, encounter_id, hospital_id: bodyHid,
      bp_systolic, bp_diastolic, heart_rate,
      temperature, temperature_unit = 'F',
      spo2, weight, weight_unit = 'kg',
      height, height_unit = 'cm',
      respiratory_rate, blood_sugar, blood_sugar_type,
      pain_score, notes,
    } = req.body;

    // Validate temperature unit
    const validUnits = ['F', 'C'];
    if (temperature_unit && !validUnits.includes(temperature_unit)) {
      return res.status(422).json({ error: 'temperature_unit must be F or C' });
    }
    const validWeightUnits = ['kg', 'lbs'];
    if (weight_unit && !validWeightUnits.includes(weight_unit)) {
      return res.status(422).json({ error: 'weight_unit must be kg or lbs' });
    }
    const validSugarTypes = ['Fasting', 'Random', 'Post-meal', 'HbA1c'];
    if (blood_sugar_type && !validSugarTypes.includes(blood_sugar_type)) {
      return res.status(422).json({ error: `blood_sugar_type must be one of: ${validSugarTypes.join(', ')}` });
    }

    // Clinical range validation
    const rangeErrors = [];
    checkRange(bp_systolic,      'bp_systolic',      rangeErrors);
    checkRange(bp_diastolic,     'bp_diastolic',     rangeErrors);
    checkRange(heart_rate,       'heart_rate',       rangeErrors);
    checkRange(temperature,      temperature_unit === 'C' ? 'temperature_C' : 'temperature_F', rangeErrors);
    checkRange(spo2,             'spo2',             rangeErrors);
    checkRange(weight,           weight_unit === 'lbs' ? 'weight_lbs' : 'weight',  rangeErrors);
    checkRange(height,           'height',           rangeErrors);
    checkRange(respiratory_rate, 'respiratory_rate', rangeErrors);
    checkRange(blood_sugar,      'blood_sugar',      rangeErrors);
    checkRange(pain_score,       'pain_score',       rangeErrors);

    if (rangeErrors.length > 0) {
      return res.status(422).json({ error: 'Vital signs out of valid clinical range', details: rangeErrors });
    }

    // Ensure at least one vital is provided (not a completely empty submission)
    const anyFilled = [bp_systolic, bp_diastolic, heart_rate, temperature, spo2, weight, height,
                       respiratory_rate, blood_sugar, pain_score].some(x => x !== undefined && x !== null && x !== '');
    if (!anyFilled) {
      return res.status(422).json({ error: 'At least one vital measurement must be provided' });
    }

    // Verify patient exists
    const patient = queryOne('SELECT id FROM patients WHERE id = ? AND is_active = 1', [patient_id]);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const hospitalId = bodyHid || req.user.hospitalId || 'hsp-001';
    const id = uuid();

    // Auto-calculate BMI (only if height in cm)
    let bmi = null;
    if (weight && height && weight_unit === 'kg' && height_unit === 'cm') {
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

    if (weight && weight_unit === 'kg') {
      run("UPDATE patients SET weight = ?, updated_at = datetime('now') WHERE id = ?", [weight + weight_unit, patient_id]);
    }

    auditLog(req.user.id, 'RECORD_VITALS', 'vitals', id, { patient_id, encounter_id: encounter_id||null }, ip(req));
    res.status(201).json(queryOne('SELECT * FROM vitals WHERE id = ?', [id]));
  }
);

// GET /api/vitals/patient/:id/trend — last N readings for charts
router.get('/patient/:id/trend', authMiddleware, (req, res) => {
  const n = Math.min(Math.max(parseInt(req.query.n) || 10, 1), 100);
  const rows = query(
    'SELECT * FROM vitals WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT ?',
    [req.params.id, n]
  );
  res.json(rows.reverse());
});

module.exports = router;
