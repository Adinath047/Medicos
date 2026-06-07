// server/routes/super_admin.js
const router = require('express').Router();
const supabase = require('../utils/supabase');
const { query, queryOne, run, auditLog } = require('../db/database');
const v = require('../middleware/validate');

const ip = req => req.ip || null;
const VALID_ROLES = ['admin', 'doctor', 'receptionist', 'nurse', 'lab_technician', 'pharmacist', 'billing', 'super_admin'];

// ── SECURITY MIDDLEWARE ──────────────────────────────────────────────
const superAdminMiddleware = (req, res, next) => {
  const secretKey = process.env.SUPER_ADMIN_KEY || 'SuperAdmin@2026';
  const providedKey = req.headers['x-super-admin-key'];
  if (!providedKey || providedKey !== secretKey) {
    return res.status(403).json({ error: 'Access denied: Invalid or missing Super Admin Key' });
  }
  next();
};

// Apply security check to all routes in this file
router.use(superAdminMiddleware);

// ── HOSPITALS ENDPOINTS ──────────────────────────────────────────────

// GET /api/super-admin/hospitals — list all hospitals with staff count
router.get('/hospitals', async (req, res) => {
  try {
    const rows = await query(`
      SELECT h.*, 
             (SELECT COUNT(*) FROM users u WHERE u.hospital_id = h.id) as staff_count
      FROM hospitals h
      ORDER BY h.id ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/super-admin/hospitals — register a new hospital
router.post('/hospitals',
  v.body({
    id:      [v.required, v.str(3, 50)],
    name:    [v.required, v.str(2, 100)],
    type:    [v.str(1, 50)],
    city:    [v.str(1, 50)],
    phone:   [v.str(1, 20)],
  }),
  async (req, res) => {
    const { id, name, type, city, phone } = req.body;
    const cleanId = id.trim().toLowerCase();
    try {
      const existing = await queryOne('SELECT id FROM hospitals WHERE id = $1', [cleanId]);
      if (existing) {
        return res.status(409).json({ error: 'Hospital code already exists' });
      }

      await run(
        `INSERT INTO hospitals (id, name, type, city, phone, is_active)
         VALUES ($1, $2, $3, $4, $5, 1)`,
        [cleanId, name.trim(), type || 'General', city || null, phone || null]
      );

      auditLog('SUPER_ADMIN', 'CREATE_HOSPITAL', 'hospitals', cleanId, { name, type, city }, ip(req));
      const created = await queryOne('SELECT * FROM hospitals WHERE id = $1', [cleanId]);
      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ── USERS ENDPOINTS ──────────────────────────────────────────────────

// GET /api/super-admin/users — list all users joined with hospital name
router.get('/users', async (req, res) => {
  try {
    const rows = await query(`
      SELECT u.id, u.name, u.email, u.role, u.staff_type, u.hospital_id, u.is_active, u.specialization,
             h.name as hospital_name
      FROM users u
      LEFT JOIN hospitals h ON u.hospital_id = h.id
      ORDER BY u.role, u.name ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/super-admin/users — provision a new user in a hospital
router.post('/users',
  v.body({
    name:        [v.required, v.str(2, 100)],
    email:       [v.required, v.str(3, 254), v.email],
    password:    [v.required, v.str(8, 200)],
    role:        [v.required, v.oneOf(VALID_ROLES)],
    hospital_id: [v.required, v.str(1, 50)],
  }),
  async (req, res) => {
    const { name, email, password, role, hospital_id, staff_type, specialization, consultation_fee, followup_fee } = req.body;
    const emailNorm = email.toLowerCase().trim();
    const cleanHospitalId = hospital_id.trim().toLowerCase();

    try {
      // Verify hospital exists
      const hospital = await queryOne('SELECT id FROM hospitals WHERE id = $1', [cleanHospitalId]);
      if (!hospital) {
        return res.status(404).json({ error: 'Selected Hospital Code does not exist' });
      }

      // Check if email already registered in DB
      const existing = await queryOne('SELECT id FROM users WHERE email = $1', [emailNorm]);
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Create user in Supabase Auth using the admin SDK client
      const { data, error } = await supabase.auth.admin.createUser({
        email: emailNorm,
        password,
        email_confirm: true,
      });

      if (error || !data.user) {
        return res.status(400).json({ error: error ? error.message : 'Failed to create auth user' });
      }

      const id = data.user.id;
      await run(
        `INSERT INTO users (id, name, email, password, role, hospital_id, staff_type, specialization, consultation_fee, followup_fee, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1)`,
        [
          id, 
          name.trim(), 
          emailNorm, 
          'SUPABASE_MANAGED', 
          role, 
          cleanHospitalId, 
          staff_type || 'front_desk', 
          specialization || null, 
          parseFloat(consultation_fee) || 0,
          parseFloat(followup_fee) || 0
        ]
      );

      auditLog('SUPER_ADMIN', 'PROVISION_USER', 'users', id, { emailNorm, role, hospital_id }, ip(req));
      res.status(201).json({ id, name: name.trim(), email: emailNorm, role, hospital_id: cleanHospitalId });
    } catch (err) {
      console.error('[super-admin/users] error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/super-admin/users/:id/status — toggle active status of a user
router.put('/users/:id/status',
  v.body({
    is_active: [v.required, v.oneOf([0, 1])],
  }),
  async (req, res) => {
    const { is_active } = req.body;
    try {
      const user = await queryOne('SELECT id FROM users WHERE id = $1', [req.params.id]);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Deactivate/activate user in public users table
      await run('UPDATE users SET is_active = $1 WHERE id = $2', [is_active, req.params.id]);

      // Deactivate/activate user in Supabase Auth to prevent logins
      const { error } = await supabase.auth.admin.updateUserById(req.params.id, {
        ban_duration: is_active === 0 ? 'none' : '0'  // Supabase ban duration
      });

      auditLog('SUPER_ADMIN', 'TOGGLE_USER_STATUS', 'users', req.params.id, { is_active }, ip(req));
      res.json({ success: true, is_active });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE /api/super-admin/hospitals/:id — delete a hospital (deletes staff, preserves patient data)
router.delete('/hospitals/:id', async (req, res) => {
  const hospitalId = req.params.id.trim().toLowerCase();
  try {
    // 1. Verify hospital exists
    const hospital = await queryOne('SELECT id FROM hospitals WHERE id = $1', [hospitalId]);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    // 2. Find and delete all staff members of this hospital
    const staffMembers = await query('SELECT id FROM users WHERE hospital_id = $1', [hospitalId]);
    for (const member of staffMembers) {
      // Delete from Supabase Auth
      try {
        await supabase.auth.admin.deleteUser(member.id);
      } catch (authErr) {
        console.error(`Failed to delete Supabase Auth user ${member.id}:`, authErr.message);
      }
      // Delete from users table
      await run('DELETE FROM users WHERE id = $1', [member.id]);
    }

    // 3. Set hospital_id to NULL in all patient and clinical tables to preserve the data
    const tables = [
      'patients', 'encounters', 'vitals', 'prescriptions', 
      'lab_orders', 'patient_uploads', 'appointments', 
      'beds', 'billing', 'pharmacy_bills', 'notifications'
    ];
    for (const table of tables) {
      try {
        await run(`UPDATE ${table} SET hospital_id = NULL WHERE hospital_id = $1`, [hospitalId]);
      } catch (updateErr) {
        console.error(`Failed to nullify hospital_id in ${table}:`, updateErr.message);
      }
    }

    // 4. Finally, delete the hospital row
    await run('DELETE FROM hospitals WHERE id = $1', [hospitalId]);

    auditLog('SUPER_ADMIN', 'DELETE_HOSPITAL', 'hospitals', hospitalId, { staffDeleted: staffMembers.length }, ip(req));
    res.json({ success: true, staffDeleted: staffMembers.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
