// server/routes/users.js — Admin user management
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { query, queryOne, run, auditLog } = require('../db/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const ip = req => req.ip || null;

const adminOnly = [authMiddleware, requireRole('admin')];

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
router.post('/', ...adminOnly, (req, res) => {
  const { name, email, password, role, staff_type = 'front_desk',
          specialization, phone, license_number,
          consultation_fee = 0, followup_fee = 0 } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
  if (!['doctor','receptionist','nurse'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  const existing = queryOne('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const id = uuid();
  const hashed = bcrypt.hashSync(password, 10);
  run(
    `INSERT INTO users (id, name, email, password, role, staff_type, hospital_id,
                        specialization, phone, license_number,
                        consultation_fee, followup_fee, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [id, name.trim(), email.toLowerCase().trim(), hashed, role,
     role === 'receptionist' ? (staff_type || 'front_desk') : 'front_desk',
     req.user.hospitalId || 'hsp-001',
     specialization || null, phone || null, license_number || null,
     role === 'doctor' ? (parseFloat(consultation_fee) || 0) : 0,
     role === 'doctor' ? (parseFloat(followup_fee) || 0) : 0]
  );
  auditLog(req.user.id, 'CREATE_STAFF', 'users', id, { name: name.trim(), email: email.toLowerCase().trim(), role, staff_type }, ip(req));
  res.status(201).json({ id, name: name.trim(), email: email.toLowerCase().trim(), role,
    staff_type: role === 'receptionist' ? (staff_type || 'front_desk') : 'front_desk',
    specialization, phone, consultation_fee, followup_fee, is_active: 1 });
});

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
router.post('/:id/reset-password', ...adminOnly, (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const user = queryOne('SELECT id FROM users WHERE id = ? AND hospital_id = ?', [req.params.id, req.user.hospitalId || 'hsp-001']);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const hashed = bcrypt.hashSync(password, 10);
  run('UPDATE users SET password=? WHERE id=?', [hashed, req.params.id]);
  auditLog(req.user.id, 'RESET_PASSWORD', 'users', req.params.id, {}, ip(req));
  res.json({ success: true });
});

module.exports = router;
