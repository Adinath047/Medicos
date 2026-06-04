// server/routes/users.js — Admin user management
const router = require('express').Router();
const supabase = require('../utils/supabase');
const { query, queryOne, run, auditLog } = require('../db/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const v = require('../middleware/validate');

const ip = req => req.ip || null;

const adminOnly = [authMiddleware, requireRole('admin')];

const VALID_ROLES = ['doctor','receptionist','nurse','lab_technician','pharmacist','admin','billing'];
const VALID_STAFF_TYPES = ['front_desk', 'pharmacy'];

// GET /api/users/doctors — list all doctors for booking
router.get('/doctors', authMiddleware, async (req, res) => {
  try {
    const doctors = await query(
      `SELECT id, name, specialization, consultation_fee
       FROM users
       WHERE hospital_id = $1 AND role = 'doctor' AND is_active = 1
       ORDER BY name`,
      [req.user.hospitalId || 'hsp-001']
    );
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users — list all staff
router.get('/', ...adminOnly, async (req, res) => {
  try {
    const users = await query(
      `SELECT id, name, email, role, staff_type, is_active, created_at,
              specialization, phone, license_number, consultation_fee, followup_fee
       FROM users
       WHERE hospital_id = $1
       ORDER BY role, name`,
      [req.user.hospitalId || 'hsp-001']
    );
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users — create new staff member
router.post('/',
  ...adminOnly,
  v.body({
    name:     [v.required, v.str(2, 100)],
    email:    [v.required, v.str(3, 254), v.email],
    password: [v.required, v.password(6)],
    role:     [v.required, v.oneOf(VALID_ROLES)],
    phone:    [v.phone],
    staff_type: [v.oneOf(VALID_STAFF_TYPES)],
    consultation_fee: [v.float(0, 99999)],
    followup_fee:     [v.float(0, 99999)],
  }),
  async (req, res) => {
    const { name, email, password, role, staff_type = 'front_desk',
            specialization, phone, license_number,
            consultation_fee = 0, followup_fee = 0 } = req.body;

    const emailNorm = email.toLowerCase().trim();
    
    try {
      const existing = await queryOne('SELECT id FROM users WHERE email = $1', [emailNorm]);
      if (existing) return res.status(409).json({ error: 'Email already registered' });

      // Create auth user in Supabase
      const { data, error } = await supabase.auth.admin.createUser({
        email: emailNorm,
        password,
        email_confirm: true,
      });

      if (error || !data.user) {
        return res.status(400).json({ error: error ? error.message : 'Failed to create auth user in Supabase' });
      }

      const id = data.user.id;
      
      await run(
        `INSERT INTO users (id, name, email, password, role, staff_type, hospital_id,
                            specialization, phone, license_number,
                            consultation_fee, followup_fee, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 1)`,
        [id, name.trim(), emailNorm, 'SUPABASE_MANAGED', role,
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
    } catch (err) {
      console.error('[users/create] error:', err);
      res.status(500).json({ error: 'Failed to create staff member' });
    }
  }
);

// PATCH /api/users/:id — update staff member
router.patch('/:id', ...adminOnly, async (req, res) => {
  const { name, specialization, phone, license_number, is_active,
          staff_type, consultation_fee, followup_fee } = req.body;
          
  try {
    const user = await queryOne('SELECT * FROM users WHERE id = $1 AND hospital_id = $2', [req.params.id, req.user.hospitalId || 'hsp-001']);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Update in Supabase Auth if status changes
    if (is_active !== undefined) {
      await supabase.auth.admin.updateUserById(req.params.id, {
        ban_duration: is_active === 0 ? 'none' : undefined // Custom ban/unban or let database verify
      });
    }

    await run(
      `UPDATE users SET name=$1, specialization=$2, phone=$3, license_number=$4, is_active=$5,
                        staff_type=$6, consultation_fee=$7, followup_fee=$8,
                        updated_at=now()::text
       WHERE id=$9`,
      [name ?? user.name, specialization ?? user.specialization, phone ?? user.phone,
       license_number ?? user.license_number, is_active ?? user.is_active,
       staff_type ?? user.staff_type,
       parseFloat(consultation_fee ?? user.consultation_fee) || 0,
       parseFloat(followup_fee ?? user.followup_fee) || 0,
       req.params.id]
    );
    
    auditLog(req.user.id, 'UPDATE_STAFF', 'users', req.params.id, { is_active, staff_type }, ip(req));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/:id/reset-password — reset password
router.post('/:id/reset-password',
  ...adminOnly,
  v.body({
    password: [v.required, v.password(8)],
  }),
  async (req, res) => {
    const { password } = req.body;
    try {
      const user = await queryOne('SELECT id FROM users WHERE id = $1 AND hospital_id = $2', [req.params.id, req.user.hospitalId || 'hsp-001']);
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      const { error } = await supabase.auth.admin.updateUserById(req.params.id, { password });
      if (error) return res.status(400).json({ error: error.message });

      auditLog(req.user.id, 'RESET_PASSWORD', 'users', req.params.id, {}, ip(req));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE /api/users/:id — hard delete staff member
router.delete('/:id', ...adminOnly, async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  try {
    const user = await queryOne('SELECT name FROM users WHERE id = $1 AND hospital_id = $2', [req.params.id, req.user.hospitalId || 'hsp-001']);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Try deleting from database first to trigger FK check
    await run('DELETE FROM users WHERE id = $1', [req.params.id]);
    
    // If database delete succeeds, delete from Supabase Auth
    const { error } = await supabase.auth.admin.deleteUser(req.params.id);
    if (error) {
      console.warn('[users/delete] failed to delete from Supabase Auth (already deleted or error):', error.message);
    }
    
    auditLog(req.user.id, 'DELETE_STAFF', 'users', req.params.id, { name: user.name }, ip(req));
    res.json({ success: true });
  } catch (err) {
    if (err.message.includes('foreign key') || err.message.includes('violates foreign key')) {
      return res.status(409).json({
        error: 'Cannot delete staff member',
        message: 'This staff member has existing records (appointments, prescriptions, or bills) and cannot be removed for data integrity. Please Deactivate them instead.'
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/:id/status — Toggle staff active/inactive
router.patch('/:id/status', ...adminOnly, async (req, res) => {
  const { is_active } = req.body;
  if (typeof is_active !== 'number') return res.status(400).json({ error: 'is_active (0 or 1) required' });

  try {
    await run('UPDATE users SET is_active = $1, updated_at = now()::text WHERE id = $2', [is_active, req.params.id]);
    auditLog(req.user.id, 'UPDATE_STAFF_STATUS', 'users', req.params.id, { is_active }, ip(req));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/verify-license — mock verification with government data
router.post('/verify-license', ...adminOnly, (req, res) => {
  const { license_number } = req.body;
  if (!license_number) return res.status(400).json({ error: 'License number required' });

  const isValidFormat = /^[A-Z0-9\-\/]{5,20}$/i.test(license_number);

  setTimeout(() => {
    if (!isValidFormat) {
      return res.status(422).json({
        verified: false,
        error: 'Invalid license format. Ensure it matches your Medical Council registration.'
      });
    }
    res.json({
      verified: true,
      data: {
        name: 'Verified Practitioner',
        registry: 'Indian Medical Register (NMC)',
        status: 'Active'
      }
    });
  }, 1200); // Simulate network lag
});

module.exports = router;
