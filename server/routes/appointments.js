// server/routes/appointments.js
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query, queryOne, run, auditLog } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const v = require('../middleware/validate');

const ip = req => req.ip || null;

const VALID_STATUSES = ['Scheduled', 'Confirmed', 'Checked-In', 'Completed', 'Cancelled', 'No-Show'];

// GET /api/appointments?date=&doctor_id=&patient_id=&status=
router.get('/', authMiddleware, async (req, res) => {
  const { date, doctor_id, patient_id, status, limit = 50 } = req.query;
  const { hospitalId, role } = req.user;
  const hid = role === 'super_admin' ? null : hospitalId;
  const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 500);

  // Validate status query param
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(422).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }
  // Validate date query param
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(422).json({ error: 'date must be in YYYY-MM-DD format' });
  }

  let sql = `SELECT a.*, p.name as patient_name, p.uhid, p.phone as patient_phone,
                    u.name as doctor_name
             FROM appointments a
             JOIN patients p ON a.patient_id = p.id
             JOIN users u ON a.doctor_id = u.id
             WHERE 1=1`;
  const params = [];
  let index = 1;

  if (hid)       { sql += ` AND a.hospital_id = $${index++}`; params.push(hid); }
  if (date)      { sql += ` AND a.date = $${index++}`;         params.push(date); }
  if (doctor_id) { sql += ` AND a.doctor_id = $${index++}`;    params.push(doctor_id); }
  if (patient_id){ sql += ` AND a.patient_id = $${index++}`;   params.push(patient_id); }
  if (status)    { sql += ` AND a.status = $${index++}`;        params.push(status); }
  sql += ` ORDER BY a.date ASC, a.time ASC LIMIT $${index++}`;
  params.push(safeLimit);

  try {
    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/appointments/today — shortcut
router.get('/today', authMiddleware, async (req, res) => {
  const { hospitalId } = req.user;
  try {
    const rows = await query(
      `SELECT a.*, p.name as patient_name, p.uhid, p.phone as patient_phone, p.blood_group,
              u.name as doctor_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users u ON a.doctor_id = u.id
       WHERE a.hospital_id = $1 AND a.date = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AND a.status != 'Cancelled'
       ORDER BY a.token_number ASC`,
      [hospitalId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/appointments
router.post('/',
  authMiddleware,
  v.body({
    patient_id: [v.required, v.str(1, 100)],
    doctor_id:  [v.required, v.str(1, 100)],
    date:       [v.required, v.date],
    time:       [v.required, v.time],
    reason:     [v.str(0, 500)],
  }),
  async (req, res) => {
    const { patient_id, doctor_id, date, time, reason, notes, hospital_id: bodyHid } = req.body;

    // Ensure date is not too far in the past (allow same-day edits, block >90 days back)
    const apptDate = new Date(date);
    const daysBack = (Date.now() - apptDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysBack > 90) {
      return res.status(422).json({ error: 'Appointment date cannot be more than 90 days in the past' });
    }
    // Block scheduling more than 1 year ahead
    const daysForward = (apptDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysForward > 365) {
      return res.status(422).json({ error: 'Appointment date cannot be more than 1 year in the future' });
    }

    try {
      // Verify patient and doctor exist
      const patient = await queryOne('SELECT id FROM patients WHERE id = $1 AND is_active = 1', [patient_id]);
      if (!patient) return res.status(404).json({ error: 'Patient not found' });

      const doctor = await queryOne("SELECT id FROM users WHERE id = $1 AND role = 'doctor' AND is_active = 1", [doctor_id]);
      if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

      // Prevent duplicate booking at exact same slot
      const duplicate = await queryOne(
        "SELECT id FROM appointments WHERE doctor_id = $1 AND date = $2 AND time = $3 AND status NOT IN ('Cancelled','No-Show')",
        [doctor_id, date, time]
      );
      if (duplicate) {
        return res.status(409).json({ error: 'This time slot is already booked for the selected doctor' });
      }

      const hospitalId = bodyHid || req.user.hospitalId || 'hsp-001';
      const id = uuid();

      const tokenCountRow = await queryOne(
        "SELECT COUNT(*) as n FROM appointments WHERE doctor_id = $1 AND date = $2 AND status != $3",
        [doctor_id, date, 'Cancelled']
      );
      const tokenCount = tokenCountRow ? parseInt(tokenCountRow.n || 0) : 0;

      await run(
        `INSERT INTO appointments (id, hospital_id, patient_id, doctor_id, date, time, token_number, reason, notes, booked_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [id, hospitalId, patient_id, doctor_id, date, time, tokenCount + 1, reason||null, notes||null, req.user.id]
      );

      auditLog(req.user.id, 'CREATE_APPOINTMENT', 'appointments', id, { patient_id, doctor_id, date, time }, ip(req));
      const created = await queryOne('SELECT * FROM appointments WHERE id = $1', [id]);
      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/appointments/:id/status
router.put('/:id/status',
  authMiddleware,
  v.body({
    status: [v.required, v.oneOf(VALID_STATUSES)],
  }),
  async (req, res) => {
    const { status } = req.body;

    try {
      const appt = await queryOne('SELECT id, status FROM appointments WHERE id = $1', [req.params.id]);
      if (!appt) return res.status(404).json({ error: 'Appointment not found' });

      // Prevent reactivating a cancelled appointment
      if (appt.status === 'Cancelled' && status !== 'Cancelled') {
        return res.status(409).json({ error: 'Cannot change status of a cancelled appointment' });
      }
      if (appt.status === 'Completed' && !['Completed', 'No-Show'].includes(status)) {
        return res.status(409).json({ error: 'Cannot reopen a completed appointment' });
      }

      await run("UPDATE appointments SET status = $1, updated_at = now()::text WHERE id = $2", [status, req.params.id]);
      auditLog(req.user.id, 'UPDATE_APPOINTMENT_STATUS', 'appointments', req.params.id, { status }, ip(req));
      const updated = await queryOne('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE /api/appointments/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const appt = await queryOne('SELECT id FROM appointments WHERE id = $1', [req.params.id]);
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    await run("UPDATE appointments SET status = 'Cancelled', updated_at = now()::text WHERE id = $1", [req.params.id]);
    auditLog(req.user.id, 'CANCEL_APPOINTMENT', 'appointments', req.params.id, {}, ip(req));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
