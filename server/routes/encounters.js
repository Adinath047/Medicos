// server/routes/encounters.js
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query, queryOne, run, parseJsonFields, auditLog } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const v = require('../middleware/validate');

const ip = req => req.ip || null;

const parseEnc = r => parseJsonFields(r, ['diagnosis']);

const VALID_ENCOUNTER_TYPES = ['OPD', 'IPD', 'Emergency', 'Follow-Up', 'Teleconsult', 'Procedure'];
const VALID_STATUSES        = ['Active', 'Completed', 'Cancelled'];

// GET /api/encounters?patient_id=&doctor_id=&date=
router.get('/', authMiddleware, async (req, res) => {
  const { patient_id, doctor_id, date, limit = 20, offset = 0 } = req.query;
  const { hospitalId, role } = req.user;
  const hid = role === 'super_admin' ? null : hospitalId;
  const safeLimit  = Math.min(Math.max(parseInt(limit)  || 20, 1), 200);
  const safeOffset = Math.max(parseInt(offset) || 0, 0);

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(422).json({ error: 'date must be in YYYY-MM-DD format' });
  }

  let sql = 'SELECT e.*, p.name as patient_name, p.uhid, u.name as doctor_name FROM encounters e JOIN patients p ON e.patient_id = p.id JOIN users u ON e.doctor_id = u.id WHERE 1=1';
  const params = [];
  let index = 1;

  if (hid)        { sql += ` AND e.hospital_id = $${index++}`; params.push(hid); }
  if (patient_id) { sql += ` AND e.patient_id = $${index++}`;  params.push(patient_id); }
  if (doctor_id)  { sql += ` AND e.doctor_id = $${index++}`;   params.push(doctor_id); }
  if (date)       { sql += ` AND e.created_at::date = $${index++}`; params.push(date); }
  sql += ` ORDER BY e.created_at DESC LIMIT $${index++} OFFSET $${index++}`;
  params.push(safeLimit, safeOffset);

  try {
    const rows = await query(sql, params);
    res.json(rows.map(parseEnc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/encounters/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const row = await queryOne(
      'SELECT e.*, p.name as patient_name, p.uhid, p.blood_group, u.name as doctor_name FROM encounters e JOIN patients p ON e.patient_id=p.id JOIN users u ON e.doctor_id=u.id WHERE e.id=$1',
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Encounter not found' });

    const vitals       = await queryOne('SELECT * FROM vitals WHERE encounter_id = $1 ORDER BY recorded_at DESC', [req.params.id]);
    const prescriptions = await query('SELECT * FROM prescriptions WHERE encounter_id = $1', [req.params.id]);
    const labs         = await query('SELECT * FROM lab_orders WHERE encounter_id = $1', [req.params.id]);

    res.json({ ...parseEnc(row), vitals, prescriptions, labs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/encounters
router.post('/',
  authMiddleware,
  v.body({
    patient_id:      [v.required, v.str(1, 100)],
    encounter_type:  [v.oneOf(VALID_ENCOUNTER_TYPES)],
    chief_complaint: [v.str(0, 2000)],
    billing_amount:  [v.float(0, 9999999)],
    follow_up_date:  [v.date],
  }),
  async (req, res) => {
    const {
      patient_id, doctor_id, encounter_type = 'OPD',
      chief_complaint, history, past_history, examination,
      diagnosis = [], impression, plan, advice, follow_up_date,
      refer_to, notes, billing_amount,
      hospital_id: bodyHid,
    } = req.body;

    try {
      // Verify patient exists
      const patient = await queryOne('SELECT id FROM patients WHERE id = $1 AND is_active = 1', [patient_id]);
      if (!patient) return res.status(404).json({ error: 'Patient not found' });

      // diagnosis must be an array
      if (!Array.isArray(diagnosis)) {
        return res.status(422).json({ error: 'diagnosis must be an array' });
      }

      const hospitalId = bodyHid || req.user.hospitalId || 'hsp-001';
      const docId = doctor_id || req.user.id;
      const id = uuid();

      const tokenCountRow = await queryOne(
        "SELECT COUNT(*) as n FROM encounters WHERE doctor_id = $1 AND created_at::date = CURRENT_DATE",
        [docId]
      );
      const tokenCount = tokenCountRow ? parseInt(tokenCountRow.n || 0) : 0;

      await run(
        `INSERT INTO encounters
          (id, hospital_id, patient_id, doctor_id, encounter_type, token_number,
           chief_complaint, history, past_history, examination,
           diagnosis, impression, plan, advice, follow_up_date,
           refer_to, notes, billing_amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [id, hospitalId, patient_id, docId, encounter_type, tokenCount + 1,
         chief_complaint||null, history||null, past_history||null, examination||null,
         JSON.stringify(diagnosis), impression||null, plan||null, advice||null,
         follow_up_date||null, refer_to||null, notes||null, billing_amount||null]
      );

      await run("UPDATE patients SET updated_at = now()::text WHERE id = $1", [patient_id]);

      auditLog(req.user.id, 'CREATE_ENCOUNTER', 'encounters', id, { patient_id, encounter_type, doctor_id: docId }, ip(req));
      
      const created = await queryOne('SELECT * FROM encounters WHERE id = $1', [id]);
      res.status(201).json(parseEnc(created));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/encounters/:id
router.put('/:id',
  authMiddleware,
  v.body({
    status:         [v.oneOf(VALID_STATUSES)],
    billing_amount: [v.float(0, 9999999)],
    follow_up_date: [v.date],
  }),
  async (req, res) => {
    const {
      chief_complaint, history, past_history, examination,
      diagnosis, impression, plan, advice, follow_up_date,
      refer_to, notes, status, billing_amount,
    } = req.body;

    if (diagnosis !== undefined && !Array.isArray(diagnosis)) {
      return res.status(422).json({ error: 'diagnosis must be an array' });
    }

    try {
      const existing = await queryOne('SELECT id FROM encounters WHERE id = $1', [req.params.id]);
      if (!existing) return res.status(404).json({ error: 'Not found' });

      await run(
        `UPDATE encounters SET
          chief_complaint=$1, history=$2, past_history=$3, examination=$4,
          diagnosis=$5, impression=$6, plan=$7, advice=$8, follow_up_date=$9,
          refer_to=$10, notes=$11, status=$12, billing_amount=$13,
          updated_at=now()::text
         WHERE id=$14`,
        [chief_complaint||null, history||null, past_history||null, examination||null,
         JSON.stringify(diagnosis||[]), impression||null, plan||null, advice||null,
         follow_up_date||null, refer_to||null, notes||null, status||'Active', billing_amount||null,
         req.params.id]
      );

      auditLog(req.user.id, 'UPDATE_ENCOUNTER', 'encounters', req.params.id, { status }, ip(req));
      const updated = await queryOne('SELECT * FROM encounters WHERE id = $1', [req.params.id]);
      res.json(parseEnc(updated));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE /api/encounters/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await queryOne('SELECT id FROM encounters WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Encounter not found' });
    await run("UPDATE encounters SET status = 'Cancelled', updated_at = now()::text WHERE id = $1", [req.params.id]);
    auditLog(req.user.id, 'CANCEL_ENCOUNTER', 'encounters', req.params.id, {}, ip(req));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
