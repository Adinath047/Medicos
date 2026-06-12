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
    id:    [v.required, v.str(3, 50)],
    name:  [v.required, v.str(2, 100)],
    type:  [v.str(1, 50)],
    city:  [v.str(1, 50)],
    phone: [v.str(1, 20)],
  }),
  async (req, res) => {
    const { id, name, type, city, phone } = req.body;
    const cleanId = id.trim().toLowerCase();
    try {
      const existing = await queryOne('SELECT id FROM hospitals WHERE id = $1', [cleanId]);
      if (existing) return res.status(409).json({ error: 'Hospital code already exists' });

      await run(
        `INSERT INTO hospitals (id, name, type, city, phone, is_active) VALUES ($1, $2, $3, $4, $5, 1)`,
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

// PUT /api/super-admin/hospitals/:id — edit hospital name, type, city, phone
router.put('/hospitals/:id',
  v.body({
    name:  [v.str(2, 100)],
    type:  [v.str(1, 50)],
    city:  [v.str(1, 50)],
    phone: [v.str(1, 20)],
  }),
  async (req, res) => {
    const hospitalId = req.params.id.trim().toLowerCase();
    const { name, type, city, phone } = req.body;
    try {
      const hospital = await queryOne('SELECT id FROM hospitals WHERE id = $1', [hospitalId]);
      if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

      await run(
        `UPDATE hospitals
         SET name  = COALESCE($1, name),
             type  = COALESCE($2, type),
             city  = COALESCE($3, city),
             phone = COALESCE($4, phone)
         WHERE id = $5`,
        [name?.trim() || null, type || null, city || null, phone || null, hospitalId]
      );

      auditLog('SUPER_ADMIN', 'EDIT_HOSPITAL', 'hospitals', hospitalId, { name, type, city, phone }, ip(req));
      const updated = await queryOne('SELECT * FROM hospitals WHERE id = $1', [hospitalId]);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE /api/super-admin/hospitals/:id — delete hospital & its staff, preserve patient records
router.delete('/hospitals/:id', async (req, res) => {
  const hospitalId = req.params.id.trim().toLowerCase();
  try {
    const hospital = await queryOne('SELECT id FROM hospitals WHERE id = $1', [hospitalId]);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

    const staffMembers = await query('SELECT id FROM users WHERE hospital_id = $1', [hospitalId]);
    for (const member of staffMembers) {
      try { await supabase.auth.admin.deleteUser(member.id); } catch {}
      await run('DELETE FROM users WHERE id = $1', [member.id]);
    }

    const tables = ['patients','encounters','vitals','prescriptions','lab_orders',
                    'patient_uploads','appointments','beds','billing','pharmacy_bills','notifications'];
    for (const table of tables) {
      try { await run(`UPDATE ${table} SET hospital_id = NULL WHERE hospital_id = $1`, [hospitalId]); } catch {}
    }

    await run('DELETE FROM hospitals WHERE id = $1', [hospitalId]);
    auditLog('SUPER_ADMIN', 'DELETE_HOSPITAL', 'hospitals', hospitalId, { staffDeleted: staffMembers.length }, ip(req));
    res.json({ success: true, staffDeleted: staffMembers.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── USERS ENDPOINTS ──────────────────────────────────────────────────

// GET /api/super-admin/users — list all users with hospital name
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

// POST /api/super-admin/users — provision a new staff account
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
      const hospital = await queryOne('SELECT id FROM hospitals WHERE id = $1', [cleanHospitalId]);
      if (!hospital) return res.status(404).json({ error: 'Selected Hospital Code does not exist' });

      const existing = await queryOne('SELECT id FROM users WHERE email = $1', [emailNorm]);
      if (existing) return res.status(409).json({ error: 'Email already registered' });

      const { data, error } = await supabase.auth.admin.createUser({
        email: emailNorm, password, email_confirm: true,
      });
      if (error || !data.user) return res.status(400).json({ error: error?.message || 'Failed to create auth user' });

      const id = data.user.id;
      await run(
        `INSERT INTO users (id, name, email, password, role, hospital_id, staff_type, specialization, consultation_fee, followup_fee, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1)`,
        [id, name.trim(), emailNorm, 'SUPABASE_MANAGED', role, cleanHospitalId,
         staff_type || 'front_desk', specialization || null,
         parseFloat(consultation_fee) || 0, parseFloat(followup_fee) || 0]
      );

      auditLog('SUPER_ADMIN', 'PROVISION_USER', 'users', id, { emailNorm, role, hospital_id }, ip(req));
      res.status(201).json({ id, name: name.trim(), email: emailNorm, role, hospital_id: cleanHospitalId });
    } catch (err) {
      console.error('[super-admin/users] error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/super-admin/users/:id/status — activate or deactivate a user
router.put('/users/:id/status',
  v.body({ is_active: [v.required, v.oneOf([0, 1])] }),
  async (req, res) => {
    const { is_active } = req.body;
    try {
      const user = await queryOne('SELECT id FROM users WHERE id = $1', [req.params.id]);
      if (!user) return res.status(404).json({ error: 'User not found' });

      await run('UPDATE users SET is_active = $1 WHERE id = $2', [is_active, req.params.id]);
      await supabase.auth.admin.updateUserById(req.params.id, {
        ban_duration: is_active === 0 ? 'none' : '0'
      });

      auditLog('SUPER_ADMIN', 'TOGGLE_USER_STATUS', 'users', req.params.id, { is_active }, ip(req));
      res.json({ success: true, is_active });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/super-admin/users/:id/reset-password — reset a staff member's password
router.put('/users/:id/reset-password',
  v.body({ password: [v.required, v.str(8, 200)] }),
  async (req, res) => {
    const { password } = req.body;
    try {
      const user = await queryOne('SELECT id, email FROM users WHERE id = $1', [req.params.id]);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const { error } = await supabase.auth.admin.updateUserById(req.params.id, { password });
      if (error) return res.status(400).json({ error: error.message });

      auditLog('SUPER_ADMIN', 'RESET_PASSWORD', 'users', req.params.id, { email: user.email }, ip(req));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ── AUDIT LOG ──────────────────────────────────────────────────────────

// GET /api/super-admin/audit-log — paginated, filterable audit log
router.get('/audit-log', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page   || '1',  10));
  const limit  = Math.min(100, Math.max(10, parseInt(req.query.limit || '50', 10)));
  const action = req.query.action || null;
  const offset = (page - 1) * limit;

  try {
    const whereClause = action ? 'WHERE action = $3' : '';
    const params      = action ? [limit, offset, action] : [limit, offset];

    const rows = await query(`
      SELECT id, user_id, action, table_name, record_id, details, ip_address, created_at
      FROM audit_log
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, params);

    const countWhere  = action ? 'WHERE action = $1' : '';
    const countParams = action ? [action] : [];
    const countRow    = await queryOne(`SELECT COUNT(*) as total FROM audit_log ${countWhere}`, countParams);

    res.json({
      logs:  rows,
      total: parseInt(countRow.total, 10),
      page,
      limit,
      pages: Math.ceil(parseInt(countRow.total, 10) / limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
