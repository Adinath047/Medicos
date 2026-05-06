// server/routes/prescriptions.js
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query, queryOne, run, parseJsonFields } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const parseRx = r => parseJsonFields(r, ['medicines']);

// GET /api/prescriptions?patient_id=&doctor_id=&encounter_id=
router.get('/', authMiddleware, (req, res) => {
  const { patient_id, doctor_id, encounter_id, limit = 20 } = req.query;
  const { hospitalId, role } = req.user;
  const hid = role === 'super_admin' ? null : hospitalId;

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
  params.push(Number(limit));

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
  const row = queryOne(
    `SELECT rx.*, p.name as patient_name, p.uhid, p.age, p.sex, p.blood_group, p.weight, p.allergies,
            u.name as doctor_name, u.phone as doctor_phone
     FROM prescriptions rx
     JOIN patients p ON rx.patient_id = p.id
     JOIN users u ON rx.doctor_id = u.id
     WHERE rx.slip_token = ?`,
    [req.params.token]
  );
  if (!row) return res.status(404).json({ error: 'Slip not found or expired' });
  res.json(parseJsonFields(row, ['medicines', 'allergies']));
});

// POST /api/prescriptions
router.post('/', authMiddleware, (req, res) => {
  const {
    patient_id, doctor_id, encounter_id,
    medicines = [], advice, follow_up_date, patient_weight,
    hospital_id: bodyHid,
  } = req.body;

  if (!patient_id || !medicines.length) return res.status(400).json({ error: 'patient_id and medicines required' });

  const hospitalId = bodyHid || req.user.hospitalId || 'hsp-001';
  const docId = doctor_id || req.user.id;
  const id = uuid();
  const slipToken = uuid().replace(/-/g, '').slice(0, 12).toUpperCase();

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

  res.status(201).json(parseRx(queryOne('SELECT * FROM prescriptions WHERE id = ?', [id])));
});

// PUT /api/prescriptions/:id (update medicines/advice)
router.put('/:id', authMiddleware, (req, res) => {
  const { medicines, advice, follow_up_date, patient_weight, is_printed } = req.body;
  run(
    'UPDATE prescriptions SET medicines=?, advice=?, follow_up_date=?, patient_weight=?, is_printed=? WHERE id=?',
    [JSON.stringify(medicines||[]), advice||null, follow_up_date||null, patient_weight||null, is_printed||0, req.params.id]
  );
  res.json(parseRx(queryOne('SELECT * FROM prescriptions WHERE id = ?', [req.params.id])));
});

module.exports = router;
