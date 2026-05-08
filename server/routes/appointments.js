// server/routes/appointments.js
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query, queryOne, run, auditLog } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const ip = req => req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || null;

// GET /api/appointments?date=&doctor_id=&patient_id=&status=
router.get('/', authMiddleware, (req, res) => {
  const { date, doctor_id, patient_id, status, limit = 50 } = req.query;
  const { hospitalId, role } = req.user;
  const hid = role === 'super_admin' ? null : hospitalId;

  let sql = `SELECT a.*, p.name as patient_name, p.uhid, p.phone as patient_phone,
                    u.name as doctor_name
             FROM appointments a
             JOIN patients p ON a.patient_id = p.id
             JOIN users u ON a.doctor_id = u.id
             WHERE 1=1`;
  const params = [];
  if (hid)       { sql += ' AND a.hospital_id = ?'; params.push(hid); }
  if (date)      { sql += ' AND a.date = ?';         params.push(date); }
  if (doctor_id) { sql += ' AND a.doctor_id = ?';    params.push(doctor_id); }
  if (patient_id){ sql += ' AND a.patient_id = ?';   params.push(patient_id); }
  if (status)    { sql += ' AND a.status = ?';        params.push(status); }
  sql += ' ORDER BY a.date ASC, a.time ASC LIMIT ?';
  params.push(Number(limit));

  res.json(query(sql, params));
});

// GET /api/appointments/today — shortcut
router.get('/today', authMiddleware, (req, res) => {
  const { hospitalId } = req.user;
  const rows = query(
    `SELECT a.*, p.name as patient_name, p.uhid, p.phone as patient_phone, p.blood_group,
            u.name as doctor_name
     FROM appointments a
     JOIN patients p ON a.patient_id = p.id
     JOIN users u ON a.doctor_id = u.id
     WHERE a.hospital_id = ? AND a.date = date('now') AND a.status != 'Cancelled'
     ORDER BY a.token_number ASC`,
    [hospitalId]
  );
  res.json(rows);
});

// POST /api/appointments
router.post('/', authMiddleware, (req, res) => {
  const { patient_id, doctor_id, date, time, reason, notes, hospital_id: bodyHid } = req.body;
  if (!patient_id || !doctor_id || !date || !time) {
    return res.status(400).json({ error: 'patient_id, doctor_id, date, time required' });
  }

  const hospitalId = bodyHid || req.user.hospitalId || 'hsp-001';
  const id = uuid();

  // Token = next available for this doctor+date
  const tokenCount = queryOne(
    'SELECT COUNT(*) as n FROM appointments WHERE doctor_id = ? AND date = ? AND status != ?',
    [doctor_id, date, 'Cancelled']
  ).n;

  run(
    `INSERT INTO appointments (id, hospital_id, patient_id, doctor_id, date, time, token_number, reason, notes, booked_by)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, hospitalId, patient_id, doctor_id, date, time, tokenCount + 1, reason||null, notes||null, req.user.id]
  );

  auditLog(req.user.id, 'CREATE_APPOINTMENT', 'appointments', id, { patient_id, doctor_id, date, time }, ip(req));
  res.status(201).json(queryOne('SELECT * FROM appointments WHERE id = ?', [id]));
});

// PUT /api/appointments/:id/status
router.put('/:id/status', authMiddleware, (req, res) => {
  const { status } = req.body;
  const valid = ['Scheduled','Confirmed','Checked-In','Completed','Cancelled','No-Show'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  run("UPDATE appointments SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, req.params.id]);
  auditLog(req.user.id, 'UPDATE_APPOINTMENT_STATUS', 'appointments', req.params.id, { status }, ip(req));
  res.json(queryOne('SELECT * FROM appointments WHERE id = ?', [req.params.id]));
});

// DELETE /api/appointments/:id
router.delete('/:id', authMiddleware, (req, res) => {
  run("UPDATE appointments SET status = 'Cancelled', updated_at = datetime('now') WHERE id = ?", [req.params.id]);
  auditLog(req.user.id, 'CANCEL_APPOINTMENT', 'appointments', req.params.id, {}, ip(req));
  res.json({ success: true });
});

module.exports = router;
