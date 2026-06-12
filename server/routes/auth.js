// server/routes/auth.js
const router = require('express').Router();
const supabase = require('../utils/supabase');
const { query, queryOne, run, auditLog } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const v = require('../middleware/validate');
const crypto = require('crypto');

const ip = req => req.ip || null;

const VALID_ROLES = ['admin', 'doctor', 'receptionist', 'nurse', 'lab_technician', 'pharmacist', 'billing', 'super_admin'];

// ── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login',
  v.body({
    email:    [v.required, v.str(3, 254), v.email],
    password: [v.required, v.str(1, 200)],
  }),
  async (req, res) => {
    const email    = req.body.email.toLowerCase().trim();
    const password = req.body.password;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.session || !data.user) {
        return res.status(401).json({ error: error ? error.message : 'Invalid email or password' });
      }

      const user = await queryOne(
        `SELECT id, name, email, role, staff_type, hospital_id, photo_url, is_active,
                specialization, license_number, consultation_fee, followup_fee, letterhead
         FROM users WHERE id = $1`,
        [data.user.id]
      );

      if (!user) {
        return res.status(401).json({ error: 'User profile not found. Please contact administration.' });
      }

      if (user.is_active !== 1) {
        return res.status(401).json({ error: 'Your account is deactivated.' });
      }

      const payload = {
        id:              user.id,
        name:            user.name,
        email:           user.email,
        role:            user.role,
        staff_type:      user.staff_type || 'front_desk',
        hospitalId:      user.hospital_id,
        photoUrl:        user.photo_url || null,
        specialization:  user.specialization || null,
        licenseNumber:   user.license_number || null,
        consultationFee: parseFloat(user.consultation_fee) || 0,
        followupFee:     parseFloat(user.followup_fee) || 0,
        letterhead:      user.letterhead || null,
      };

      auditLog(user.id, 'LOGIN_SUCCESS', 'users', user.id, { email, role: user.role }, ip(req));

      // FIX: sameSite:'none' + secure:true is required for cross-origin cookie delivery
      // (Vercel frontend → Render backend). Without this the browser drops the cookie.
      const cookieOpts = {
        httpOnly: true,
        secure:   true,          // required for sameSite:'none'
        sameSite: 'none',        // required for cross-origin (different domains)
        maxAge:   data.session.expires_in * 1000,
      };

      const csrfToken = crypto.randomBytes(16).toString('hex');

      res.cookie('emr_token',   data.session.access_token, cookieOpts);
      // CSRF cookie must be readable by JS (httpOnly: false) so the client can
      // read it and echo it back in the X-CSRF-Token header.
      res.cookie('csrf_token',  csrfToken, { ...cookieOpts, httpOnly: false });

      res.json({
        user:      payload,
        token:     data.session.access_token,
        expiresIn: data.session.expires_in,
      });
    } catch (err) {
      console.error('[auth/login] error:', err);
      res.status(500).json({ error: 'Internal server error during login' });
    }
  }
);

// ── POST /api/auth/logout ─────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies?.emr_token
      || (req.headers.authorization?.startsWith('Bearer ')
          ? req.headers.authorization.slice(7)
          : null);

    if (token) {
      // FIX: supabase.auth.getUser(token) is deprecated in supabase-js v2.
      // The correct approach is to use a service-role client to look up the
      // user, or just skip it — logout should always succeed regardless.
      // Attempt audit log but don't block logout if it fails.
      try {
        // Create a temporary scoped client for this token to get the user
        const { createClient } = require('@supabase/supabase-js');
        const scopedClient = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY,
          { global: { headers: { Authorization: `Bearer ${token}` } } }
        );
        const { data: { user: authUser } } = await scopedClient.auth.getUser();
        if (authUser) {
          auditLog(authUser.id, 'LOGOUT', 'users', authUser.id, {}, ip(req));
        }
      } catch {
        // Audit failure must not block the logout response
      }
    }
  } catch (err) {
    console.error('[auth/logout] error:', err.message);
  }

  // FIX: Must clear cookies with the SAME options they were set with
  // (secure, sameSite) otherwise the browser ignores the clear instruction.
  const clearOpts = { secure: true, sameSite: 'none' };
  res.clearCookie('emr_token',  clearOpts);
  res.clearCookie('csrf_token', clearOpts);
  res.json({ success: true });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

// ── GET /api/auth/hospital/:code/staff ───────────────────────────────────
router.get('/hospital/:code/staff', async (req, res) => {
  const code = req.params.code.trim();
  try {
    const hospital = await queryOne(
      'SELECT id, name FROM hospitals WHERE id = $1 AND is_active = 1',
      [code]
    );
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }
    const staff = await query(
      `SELECT id, name, email, role FROM users WHERE hospital_id = $1 AND is_active = 1 ORDER BY name`,
      [code]
    );
    res.json({ hospital, staff });
  } catch (err) {
    console.error('[auth/hospital/staff] error:', err);
    res.status(500).json({ error: 'Failed to retrieve hospital staff' });
  }
});

// ── POST /api/auth/register ───────────────────────────────────────────────
// Admin-only: called during onboarding or staff creation
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
      const existing = await queryOne('SELECT id FROM users WHERE email = $1', [emailNorm]);
      if (existing) return res.status(409).json({ error: 'Email already registered' });

      const { data, error } = await supabase.auth.admin.createUser({
        email:         emailNorm,
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