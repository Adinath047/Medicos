// server/routes/users.js — Admin user management
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { query, queryOne, run, auditLog } = require('../db/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const v = require('../middleware/validate');

const ip = req => req.ip || null;

const adminOnly = [authMiddleware, requireRole('admin')];

const VALID_ROLES = ['doctor','receptionist','nurse','lab_technician','pharmacist','admin','billing'];
const VALID_STAFF_TYPES = ['front_desk', 'pharmacy'];

// GET /api/users/doctors — list all doctors for booking
router.get('/doctors', authMiddleware, (req, res) => {
  const doctors = query(
    `SELECT id, name, specialization, consultation_fee
     FROM users
     WHERE hospital_id = ? AND role = 'doctor' AND is_active = 1
     ORDER BY name`,
    [req.user.hospitalId || 'hsp-001']
  );
  res.json(doctors);
});

// GET /api/users — list all staff
router.get('/', ...adminOnly, (req, res) => {
  const users = query(
    `SELECT id, name, email, role, staff_type, is_active, created_at,
            specialization, phone, license_number, consultation_fee, followup_fee
     FROM users
     WHERE hospital_id = ?
     ORDER BY role, name`,
    [req.user.hospitalId || 'hsp-001']
  );
  res.json({ users });
});

// POST /api/users — create new staff member
router.post('/',
  ...adminOnly,
  v.body({
    name:     [v.required, v.str(2, 100)],
    email:    [v.required, v.str(3, 254), v.email],
    password: [v.required, v.password(8)],
    role:     [v.required, v.oneOf(VALID_ROLES)],
    phone:    [v.phone],
    staff_type: [v.oneOf(VALID_STAFF_TYPES)],
    consultation_fee: [v.float(0, 99999)],
    followup_fee:     [v.float(0, 99999)],
  }),
  (req, res) => {
    const { name, email, password, role, staff_type = 'front_desk',
            specialization, phone, license_number,
            consultation_fee = 0, followup_fee = 0 } = req.body;

    const emailNorm = email.toLowerCase().trim();
    const existing = queryOne('SELECT id FROM users WHERE email = ?', [emailNorm]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const id = uuid();
    const hashed = bcrypt.hashSync(password, 10);
    run(
      `INSERT INTO users (id, name, email, password, role, staff_type, hospital_id,
                          specialization, phone, license_number,
                          consultation_fee, followup_fee, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, name.trim(), emailNorm, hashed, role,
       role === 'receptionist' ? (staff_type || 'front_desk') : 'front_desk',
       req.user.hospitalId || 'hsp-001',
       specialization || null, phone || null, license_number || null,
       role === 'doctor' ? (parseFloat(consultation_fee) || 0) : 0,
       role === 'doctor' ? (parseFloat(followup_fee) || 0) : 0]
    );
    auditLog(req.user.id, 'CREATE_STAFF', 'users', id, { name: name.trim(), email: emailNorm, role, staff_type }, ip(req));
    res.status(201).json({ id, name: name.trim(), email: emailNorm, role,
      staff_type: role === 'receptionist' ? (staff_type || 'front_desk') : 'front_desk',
      specialization, phone, consultation_fee, followup_fee, is_active: 1 });
  }
);

// PATCH /api/users/:id — update staff member
router.patch('/:id', ...adminOnly, (req, res) => {
  const { name, specialization, phone, license_number, is_active,
          staff_type, consultation_fee, followup_fee } = req.body;
  const user = queryOne('SELECT * FROM users WHERE id = ? AND hospital_id = ?', [req.params.id, req.user.hospitalId || 'hsp-001']);
  if (!user) return res.status(404).json({ error: 'User not found' });

  run(
    `UPDATE users SET name=?, specialization=?, phone=?, license_number=?, is_active=?,
                      staff_type=?, consultation_fee=?, followup_fee=?,
                      updated_at=datetime('now')
     WHERE id=?`,
    [name ?? user.name, specialization ?? user.specialization, phone ?? user.phone,
     license_number ?? user.license_number, is_active ?? user.is_active,
     staff_type ?? user.staff_type,
     parseFloat(consultation_fee ?? user.consultation_fee) || 0,
     parseFloat(followup_fee ?? user.followup_fee) || 0,
     req.params.id]
  );
  auditLog(req.user.id, 'UPDATE_STAFF', 'users', req.params.id, { is_active, staff_type }, ip(req));
  res.json({ success: true });
});

// POST /api/users/:id/reset-password — reset password
router.post('/:id/reset-password',
  ...adminOnly,
  v.body({
    password: [v.required, v.password(8)],
  }),
  (req, res) => {
    const { password } = req.body;
    const user = queryOne('SELECT id FROM users WHERE id = ? AND hospital_id = ?', [req.params.id, req.user.hospitalId || 'hsp-001']);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const hashed = bcrypt.hashSync(password, 10);
    run('UPDATE users SET password=? WHERE id=?', [hashed, req.params.id]);
    auditLog(req.user.id, 'RESET_PASSWORD', 'users', req.params.id, {}, ip(req));
    res.json({ success: true });
  }
);

module.exports = router;
