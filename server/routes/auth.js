// server/routes/auth.js
const router = require('express').Router();
const supabase = require('../utils/supabase');
const { queryOne, run, auditLog } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const v = require('../middleware/validate');

const ip = req => req.ip || null;

const VALID_ROLES = ['admin','doctor','receptionist','nurse','lab_technician','pharmacist','billing','super_admin'];

// POST /api/auth/login
router.post('/login',
  v.body({
    email:    [v.required, v.str(3, 254), v.email],
    password: [v.required, v.str(1, 200)],
  }),
  async (req, res) => {
    const email = req.body.email.toLowerCase().trim();
    const password = req.body.password;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error || !data.session || !data.user) {
        return res.status(401).json({ error: error ? error.message : 'Invalid email or password' });
      }

      const user = await queryOne(
        'SELECT id, name, email, role, staff_type, hospital_id, photo_url, is_active FROM users WHERE id = $1',
        [data.user.id]
      );
      
      if (!user) {
        return res.status(401).json({ error: 'User profile not found. Please contact administration.' });
      }

      if (user.is_active !== 1) {
        return res.status(401).json({ error: 'Your account is deactivated.' });
      }

      const payload = {
        id:         user.id,
        name:       user.name,
        email:      user.email,
        role:       user.role,
        staff_type: user.staff_type || 'front_desk',
        hospitalId: user.hospital_id,
        photoUrl:   user.photo_url || null,
      };

      auditLog(user.id, 'LOGIN_SUCCESS', 'users', user.id, { email, role: user.role }, ip(req));
      
      // Set cookie using Supabase session access token
      const cookieOpts = {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: data.session.expires_in * 1000
      };
      
      const crypto = require('crypto');
      const csrfToken = crypto.randomBytes(16).toString('hex');
      
      res.cookie('emr_token', data.session.access_token, { ...cookieOpts, httpOnly: true });
      res.cookie('csrf_token', csrfToken, { ...cookieOpts, httpOnly: false });

      res.json({ user: payload, expiresIn: data.session.expires_in });
    } catch (err) {
      console.error('[auth/login] error:', err);
      res.status(500).json({ error: 'Internal server error during login' });
    }
  }
);

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    auditLog(req.user.id, 'LOGOUT', 'users', req.user.id, {}, ip(req));
    await supabase.auth.signOut();
  } catch (err) {
    console.error('[auth/logout] error:', err.message);
  }
  res.clearCookie('emr_token');
  res.clearCookie('csrf_token');
  res.json({ success: true });
});

// GET /api/auth/me — verify current token
router.get('/me', authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/register (admin-only, called during onboarding or staff creation)
router.post('/register',
  v.body({
    name:     [v.required, v.str(2, 100)],
    email:    [v.required, v.str(3, 254), v.email],
    password: [v.required, v.password(8)],
    role:     [v.oneOf(VALID_ROLES)],
  }),
  async (req, res) => {
    const { name, email, password, role, hospital_id } = req.body;
    const emailNorm = email.toLowerCase().trim();

    try {
      // Check if user already exists in DB
      const existing = await queryOne('SELECT id FROM users WHERE email = $1', [emailNorm]);
      if (existing) return res.status(409).json({ error: 'Email already registered' });

      // Create user in Supabase Auth
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
        `INSERT INTO users (id, name, email, password, role, hospital_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, 1)`,
        [id, name.trim(), emailNorm, 'SUPABASE_MANAGED', role || 'doctor', hospital_id || 'hsp-001']
      );

      res.status(201).json({ id, name: name.trim(), email: emailNorm, role: role || 'doctor' });
    } catch (err) {
      console.error('[auth/register] error:', err);
      res.status(500).json({ error: 'Internal server error during registration' });
    }
  }
);

module.exports = router;
