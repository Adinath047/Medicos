// server/routes/encounters.js
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query, queryOne, run, parseJsonFields } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const parseEnc = r => parseJsonFields(r, ['diagnosis']);

// GET /api/encounters?patient_id=&doctor_id=&date=
router.get('/', authMiddleware, (req, res) => {
  const { patient_id, doctor_id, date, limit = 20, offset = 0 } = req.query;
  const { hospitalId, role } = req.user;
  const hid = role === 'super_admin' ? null : hospitalId;

  let sql = 'SELECT e.*, p.name as patient_name, p.uhid, u.name as doctor_name FROM encounters e JOIN patients p ON e.patient_id = p.id JOIN users u ON e.doctor_id = u.id WHERE 1=1';
  const params = [];
  if (hid)        { sql += ' AND e.hospital_id = ?'; params.push(hid); }
  if (patient_id) { sql += ' AND e.patient_id = ?';  params.push(patient_id); }
  if (doctor_id)  { sql += ' AND e.doctor_id = ?';   params.push(doctor_id); }
  if (date)       { sql += ' AND date(e.created_at) = ?'; params.push(date); }

  sql += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  res.json(query(sql, params).map(parseEnc));
});

// GET /api/encounters/:id
router.get('/:id', authMiddleware, (req, res) => {
  const row = queryOne(
    'SELECT e.*, p.name as patient_name, p.uhid, p.blood_group, u.name as doctor_name FROM encounters e JOIN patients p ON e.patient_id=p.id JOIN users u ON e.doctor_id=u.id WHERE e.id=?',
    [req.params.id]
  );
  if (!row) return res.status(404).json({ error: 'Encounter not found' });

  const vitals = queryOne('SELECT * FROM vitals WHERE encounter_id = ? ORDER BY recorded_at DESC', [req.params.id]);
  const prescriptions = query('SELECT * FROM prescriptions WHERE encounter_id = ?', [req.params.id]);
  const labs = query('SELECT * FROM lab_orders WHERE encounter_id = ?', [req.params.id]);

  res.json({ ...parseEnc(row), vitals, prescriptions, labs });
});

// POST /api/encounters
router.post('/', authMiddleware, (req, res) => {
  const {
    patient_id, doctor_id, encounter_type = 'OPD',
    chief_complaint, history, past_history, examination,
    diagnosis = [], impression, plan, advice, follow_up_date,
    refer_to, notes, billing_amount,
    hospital_id: bodyHid,
  } = req.body;

  if (!patient_id) return res.status(400).json({ error: 'patient_id required' });

  const hospitalId = bodyHid || req.user.hospitalId || 'hsp-001';
  const docId = doctor_id || req.user.id;
  const id = uuid();

  // Get today's token for this doctor
  const tokenCount = queryOne(
    "SELECT COUNT(*) as n FROM encounters WHERE doctor_id = ? AND date(created_at) = date('now')",
    [docId]
  ).n;

  run(
    `INSERT INTO encounters
      (id, hospital_id, patient_id, doctor_id, encounter_type, token_number,
       chief_complaint, history, past_history, examination,
       diagnosis, impression, plan, advice, follow_up_date,
       refer_to, notes, billing_amount)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, hospitalId, patient_id, docId, encounter_type, tokenCount + 1,
     chief_complaint||null, history||null, past_history||null, examination||null,
     JSON.stringify(diagnosis), impression||null, plan||null, advice||null,
     follow_up_date||null, refer_to||null, notes||null, billing_amount||null]
  );

  // Update patient last visit
  run("UPDATE patients SET updated_at = datetime('now') WHERE id = ?", [patient_id]);

  res.status(201).json(parseEnc(queryOne('SELECT * FROM encounters WHERE id = ?', [id])));
});

// PUT /api/encounters/:id
router.put('/:id', authMiddleware, (req, res) => {
  const existing = queryOne('SELECT id FROM encounters WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const {
    chief_complaint, history, past_history, examination,
    diagnosis, impression, plan, advice, follow_up_date,
    refer_to, notes, status, billing_amount,
  } = req.body;

  run(
    `UPDATE encounters SET
      chief_complaint=?, history=?, past_history=?, examination=?,
      diagnosis=?, impression=?, plan=?, advice=?, follow_up_date=?,
      refer_to=?, notes=?, status=?, billing_amount=?,
      updated_at=datetime('now')
     WHERE id=?`,
    [chief_complaint||null, history||null, past_history||null, examination||null,
     JSON.stringify(diagnosis||[]), impression||null, plan||null, advice||null,
     follow_up_date||null, refer_to||null, notes||null, status||'Active', billing_amount||null,
     req.params.id]
  );

  res.json(parseEnc(queryOne('SELECT * FROM encounters WHERE id = ?', [req.params.id])));
});

// DELETE /api/encounters/:id
router.delete('/:id', authMiddleware, (req, res) => {
  run("UPDATE encounters SET status = 'Cancelled', updated_at = datetime('now') WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
