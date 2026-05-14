// server/routes/prescriptions.js
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query, queryOne, run, parseJsonFields, auditLog } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const v = require('../middleware/validate');

const ip = req => req.ip || null;

const parseRx = r => parseJsonFields(r, ['medicines']);

// ── Medicine entry validator ───────────────────────────────────────────────
function validateMedicine(med, index) {
  const errs = [];
  if (!med || typeof med !== 'object') return [`medicines[${index}]: must be an object`];
  if (!med.name || String(med.name).trim().length < 1) errs.push(`medicines[${index}].name: required`);
  if (String(med.name || '').length > 200)              errs.push(`medicines[${index}].name: too long (max 200 chars)`);
  if (!med.dosage || String(med.dosage).trim().length < 1) errs.push(`medicines[${index}].dosage: required`);
  if (!med.frequency || String(med.frequency).trim().length < 1) errs.push(`medicines[${index}].frequency: required`);
  if (med.duration_days !== undefined && med.duration_days !== null && med.duration_days !== '') {
    const d = parseInt(med.duration_days);
    if (isNaN(d) || d < 0 || d > 3650) errs.push(`medicines[${index}].duration_days: must be 0–3650`);
  }
  return errs;
}

// GET /api/prescriptions?patient_id=&doctor_id=&encounter_id=
router.get('/', authMiddleware, (req, res) => {
  const { patient_id, doctor_id, encounter_id, limit = 20 } = req.query;
  const { hospitalId, role } = req.user;
  const hid = role === 'super_admin' ? null : hospitalId;
  const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 200);

  let sql = `SELECT rx.*, p.name as patient_name, p.uhid, u.name as doctor_name
             FROM prescriptions rx
             JOIN patients p ON rx.patient_id = p.id
             JOIN users u ON rx.doctor_id = u.id
             WHERE 1=1`;
  const params = [];
  if (hid)         { sql += ' AND rx.hospital_id = ?';    params.push(hid); }
  if (patient_id)  { sql += ' AND rx.patient_id = ?';     params.push(patient_id); }
  if (doctor_id)   { sql += ' AND rx.doctor_id = ?';      params.push(doctor_id); }
  if (encounter_id){ sql += ' AND rx.encounter_id = ?';   params.push(encounter_id); }
  sql += ' ORDER BY rx.created_at DESC LIMIT ?';
  params.push(safeLimit);

  res.json(query(sql, params).map(parseRx));
});

// GET /api/prescriptions/:id
router.get('/:id', authMiddleware, (req, res) => {
  const row = queryOne(
    `SELECT rx.*, p.name as patient_name, p.uhid, p.age, p.sex, p.blood_group, p.weight, p.allergies,
            u.name as doctor_name, u.phone as doctor_phone, u.email as doctor_email
     FROM prescriptions rx
     JOIN patients p ON rx.patient_id = p.id
     JOIN users u ON rx.doctor_id = u.id
     WHERE rx.id = ?`,
    [req.params.id]
  );
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(parseJsonFields(row, ['medicines', 'allergies']));
});

// GET /api/prescriptions/slip/:token — public (no auth), for shareable link
router.get('/slip/:token', (req, res) => {
  const token = req.params.token;
  // Token is 12-char uppercase hex — validate format
  if (!/^[A-F0-9]{12}$/.test(token)) {
    return res.status(400).json({ error: 'Invalid slip token format' });
  }
  const row = queryOne(
    `SELECT rx.*, p.name as patient_name, p.uhid, p.age, p.sex, p.blood_group, p.weight, p.allergies,
            u.name as doctor_name, u.phone as doctor_phone
     FROM prescriptions rx
     JOIN patients p ON rx.patient_id = p.id
     JOIN users u ON rx.doctor_id = u.id
     WHERE rx.slip_token = ?`,
    [token]
  );
  if (!row) return res.status(404).json({ error: 'Slip not found or expired' });
  res.json(parseJsonFields(row, ['medicines', 'allergies']));
});

// POST /api/prescriptions
router.post('/',
  authMiddleware,
  v.body({
    patient_id:     [v.required, v.str(1, 100)],
    follow_up_date: [v.date],
    patient_weight: [v.float(0.5, 600)],
    advice:         [v.str(0, 3000)],
  }),
  (req, res) => {
    const {
      patient_id, doctor_id, encounter_id,
      medicines = [], advice, follow_up_date, patient_weight,
      hospital_id: bodyHid,
    } = req.body;

    // Validate medicines array
    if (!Array.isArray(medicines)) {
      return res.status(422).json({ error: 'medicines must be an array' });
    }
    if (medicines.length === 0) {
      return res.status(422).json({ error: 'At least one medicine is required' });
    }
    if (medicines.length > 50) {
      return res.status(422).json({ error: 'Too many medicines (max 50 per prescription)' });
    }

    const medErrors = medicines.flatMap((m, i) => validateMedicine(m, i));
    if (medErrors.length > 0) {
      return res.status(422).json({ error: 'Invalid medicine entries', details: medErrors });
    }

    // Verify patient exists
    const patient = queryOne('SELECT id FROM patients WHERE id = ? AND is_active = 1', [patient_id]);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const hospitalId = bodyHid || req.user.hospitalId || 'hsp-001';
    const docId      = doctor_id || req.user.id;
    const id         = uuid();
    const slipToken  = uuid().replace(/-/g, '').slice(0, 12).toUpperCase();

    run(
      `INSERT INTO prescriptions
        (id, hospital_id, patient_id, doctor_id, encounter_id,
         medicines, advice, follow_up_date, patient_weight,
         slip_token, created_by_role)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id, hospitalId, patient_id, docId, encounter_id||null,
       JSON.stringify(medicines), advice||null, follow_up_date||null,
       patient_weight||null, slipToken, req.user.role]
    );

    auditLog(req.user.id, 'CREATE_PRESCRIPTION', 'prescriptions', id,
      { patient_id, medicine_count: medicines.length }, ip(req));
    res.status(201).json(parseRx(queryOne('SELECT * FROM prescriptions WHERE id = ?', [id])));
  }
);

// PUT /api/prescriptions/:id (update medicines/advice)
router.put('/:id',
  authMiddleware,
  v.body({
    follow_up_date: [v.date],
    patient_weight: [v.float(0.5, 600)],
    advice:         [v.str(0, 3000)],
  }),
  (req, res) => {
    const existing = queryOne('SELECT id FROM prescriptions WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Prescription not found' });

    const { medicines, advice, follow_up_date, patient_weight, is_printed } = req.body;

    if (medicines !== undefined) {
      if (!Array.isArray(medicines)) {
        return res.status(422).json({ error: 'medicines must be an array' });
      }
      const medErrors = medicines.flatMap((m, i) => validateMedicine(m, i));
      if (medErrors.length > 0) {
        return res.status(422).json({ error: 'Invalid medicine entries', details: medErrors });
      }
    }

    run(
      'UPDATE prescriptions SET medicines=?, advice=?, follow_up_date=?, patient_weight=?, is_printed=? WHERE id=?',
      [JSON.stringify(medicines||[]), advice||null, follow_up_date||null, patient_weight||null, is_printed ? 1 : 0, req.params.id]
    );
    auditLog(req.user.id, 'UPDATE_PRESCRIPTION', 'prescriptions', req.params.id, { is_printed }, ip(req));
    res.json(parseRx(queryOne('SELECT * FROM prescriptions WHERE id = ?', [req.params.id])));
  }
);

module.exports = router;
