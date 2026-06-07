// server/routes/notifications.js
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query, queryOne, run, auditLog } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const v = require('../middleware/validate');

const ip = req => req.ip || null;

// GET /api/notifications/active — get active unread emergency alerts for logged-in doctor
router.get('/active', authMiddleware, async (req, res) => {
  const { hospitalId, id: doctorId } = req.user;
  try {
    const rows = await query(
      `SELECT n.*, p.name as patient_name, p.uhid as patient_uhid
       FROM notifications n
       LEFT JOIN patients p ON n.patient_id = p.id
       WHERE n.hospital_id = $1 AND n.doctor_id = $2 AND n.is_read = 0
       ORDER BY n.created_at DESC`,
      [hospitalId, doctorId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications — receptionist raises an emergency alert
router.post('/',
  authMiddleware,
  v.body({
    doctor_id: [v.required, v.str(1, 100)],
    message:   [v.required, v.str(1, 500)],
  }),
  async (req, res) => {
    const { doctor_id, patient_id, message } = req.body;
    const { hospitalId } = req.user;
    try {
      // Verify doctor belongs to hospital
      const doctor = await queryOne('SELECT id FROM users WHERE id = $1 AND hospital_id = $2 AND is_active = 1', [doctor_id, hospitalId]);
      if (!doctor) return res.status(404).json({ error: 'Doctor not found in this hospital' });

      // Verify patient belongs to hospital
      if (patient_id) {
        const patient = await queryOne('SELECT id FROM patients WHERE id = $1 AND hospital_id = $2 AND is_active = 1', [patient_id, hospitalId]);
        if (!patient) return res.status(404).json({ error: 'Patient not found in this hospital' });
      }

      const id = uuid();
      const now = new Date().toISOString();
      await run(
        `INSERT INTO notifications (id, hospital_id, doctor_id, patient_id, message, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, 0, $6)`,
        [id, hospitalId, doctor_id, patient_id || null, message.trim(), now]
      );

      auditLog(req.user.id, 'TRIGGER_EMERGENCY_ALERT', 'notifications', id, { doctor_id, patient_id }, ip(req));
      
      const created = await queryOne('SELECT * FROM notifications WHERE id = $1', [id]);
      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/notifications/:id/read — mark alert as read/resolved
router.post('/:id/read', authMiddleware, async (req, res) => {
  const { hospitalId } = req.user;
  try {
    const notif = await queryOne('SELECT id FROM notifications WHERE id = $1 AND hospital_id = $2', [req.params.id, hospitalId]);
    if (!notif) return res.status(404).json({ error: 'Notification not found' });

    await run('UPDATE notifications SET is_read = 1 WHERE id = $1', [req.params.id]);
    auditLog(req.user.id, 'RESOLVE_ALERT', 'notifications', req.params.id, {}, ip(req));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
