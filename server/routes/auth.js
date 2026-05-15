// server/routes/auth.js
const router    = require('express').Router();
const bcrypt    = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { v4: uuid } = require('uuid');
const crypto = require('crypto');
const OTPAuth = require('otpauth');
const { queryOne, run, auditLog } = require('../db/database');
const { authMiddleware, createToken, invalidateToken } = require('../middleware/auth');
const v = require('../middleware/validate');

const ip = req => req.ip || null;

// ── Per-IP brute-force guard ────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
  skipSuccessfulRequests: true,
});

const VALID_ROLES = ['admin','doctor','receptionist','nurse','lab_technician','pharmacist','billing','super_admin'];
const MAX_FAILED  = 5;
const LOCK_MINUTES = 30;

// ── Account lockout helpers ─────────────────────────────────────────────────
function isLocked(user) {
  if (!user.locked_until) return false;
  return new Date(user.locked_until) > new Date();
}

function recordFailedLogin(userId) {
  const user = queryOne('SELECT failed_login_attempts FROM users WHERE id = ?', [userId]);
  const attempts = (user?.failed_login_attempts || 0) + 1;
  if (attempts >= MAX_FAILED) {
    const lockUntil = new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString();
    run('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?',
        [attempts, lockUntil, userId]);
  } else {
    run('UPDATE users SET failed_login_attempts = ? WHERE id = ?', [attempts, userId]);
  }
}

function clearFailedLogins(userId) {
  run('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?', [userId]);
}

// ── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login',
  loginLimiter,
  v.body({
    email:    [v.required, v.str(3, 254), v.email],
    password: [v.required, v.str(1, 200)],
  }),
  (req, res) => {
    const email    = req.body.email.toLowerCase().trim();
    const password = req.body.password;

    const user = queryOne(
      'SELECT id, name, email, password, is_active, role, hospital_id, staff_type, photo_url, totp_secret, failed_login_attempts, locked_until FROM users WHERE email = ?',
      [email]
    );
    console.log(`[auth] Login attempt: ${email} | Found: ${!!user} | Active: ${user?.is_active}`);
    
    if (!user || user.is_active !== 1) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Account lockout check
    if (isLocked(user)) {
      const until = new Date(user.locked_until).toLocaleTimeString();
      return res.status(423).json({
        error: `Account temporarily locked after ${MAX_FAILED} failed attempts. Try again after ${until}.`
      });
    }

    const match = bcrypt.compareSync(password, user.password);
    if (!match) {
      recordFailedLogin(user.id);
      auditLog(user.id, 'LOGIN_FAILED', 'users', user.id, { email }, ip(req));
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Success — clear lockout counter
    clearFailedLogins(user.id);

    // MFA Check
    if (user.totp_secret) {
      const tempToken = require('jsonwebtoken').sign(
        { id: user.id, requires2FA: true },
        require('../middleware/auth').JWT_SECRET,
        { expiresIn: '5m' }
      );
      return res.json({ requires2FA: true, tempToken });
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

    const token = createToken(payload);
    auditLog(user.id, 'LOGIN_SUCCESS', 'users', user.id, { email, role: user.role }, ip(req));
    
    // Set cookies
    const csrfToken = crypto.randomBytes(16).toString('hex');
    const cookieOpts = { secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 4 * 3600000 };
    
    res.cookie('emr_token', token, { ...cookieOpts, httpOnly: true });
    res.cookie('csrf_token', csrfToken, { ...cookieOpts, httpOnly: false }); // readable by JS

    res.json({ user: payload, expiresIn: 4 * 3600 });
  }
);

// ── POST /api/auth/login/2fa ────────────────────────────────────────────────
router.post('/login/2fa',
  loginLimiter,
  v.body({
    tempToken: [v.required],
    code:      [v.required, v.str(6, 6)],
  }),
  (req, res) => {
    const { tempToken, code } = req.body;
    try {
      const jwt = require('jsonwebtoken');
      const { JWT_SECRET } = require('../middleware/auth');
      const decoded = jwt.verify(tempToken, JWT_SECRET);
      
      if (!decoded.requires2FA || !decoded.id) {
        return res.status(401).json({ error: 'Invalid 2FA token' });
      }

      const user = queryOne('SELECT * FROM users WHERE id = ? AND is_active = 1', [decoded.id]);
      if (!user || !user.totp_secret) return res.status(401).json({ error: 'Invalid 2FA state' });

      const totp = new OTPAuth.TOTP({
        issuer: 'Medicos EMR',
        label: user.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.totp_secret),
      });

      const delta = totp.validate({ token: code, window: 1 });
      if (delta === null) {
        recordFailedLogin(user.id);
        auditLog(user.id, 'LOGIN_2FA_FAILED', 'users', user.id, { email: user.email }, ip(req));
        return res.status(401).json({ error: 'Invalid 2FA code' });
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

      const token = createToken(payload);
      auditLog(user.id, 'LOGIN_SUCCESS', 'users', user.id, { email: user.email, role: user.role, mfa: true }, ip(req));
      
      const csrfToken = crypto.randomBytes(16).toString('hex');
      const cookieOpts = { secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 4 * 3600000 };
      
      res.cookie('emr_token', token, { ...cookieOpts, httpOnly: true });
      res.cookie('csrf_token', csrfToken, { ...cookieOpts, httpOnly: false });

      res.json({ user: payload, expiresIn: 4 * 3600 });
    } catch {
      return res.status(401).json({ error: 'Session expired, please log in again' });
    }
  }
);

// ── POST /api/auth/logout ───────────────────────────────────────────────────
router.post('/logout', authMiddleware, (req, res) => {
  invalidateToken(req.token);
  auditLog(req.user.id, 'LOGOUT', 'users', req.user.id, {}, ip(req));
  
  res.clearCookie('emr_token');
  res.clearCookie('csrf_token');
  res.json({ success: true });
});

// ── GET /api/auth/me — verify current token ─────────────────────────────────
router.get('/me', authMiddleware, (req, res) => {
  // Re-fetch user to pick up any role/name changes since token was issued
  const user = queryOne(
    'SELECT id, name, email, role, staff_type, hospital_id, photo_url, is_active FROM users WHERE id = ?',
    [req.user.id]
  );
  if (!user || !user.is_active) {
    invalidateToken(req.token);
    return res.status(401).json({ error: 'Account disabled' });
  }
  res.json({
    user: {
      id: user.id, name: user.name, email: user.email,
      role: user.role, staff_type: user.staff_type,
      hospitalId: user.hospital_id, photoUrl: user.photo_url,
    }
  });
});

// ── GET /api/auth/totp/setup ────────────────────────────────────────────────
router.get('/totp/setup', authMiddleware, (req, res) => {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: 'Medicos EMR',
    label: req.user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret
  });
  
  res.json({
    secret: secret.base32,
    uri: totp.toString()
  });
});

// ── POST /api/auth/totp/enable ──────────────────────────────────────────────
router.post('/totp/enable',
  authMiddleware,
  v.body({
    secret: [v.required, v.str(16, 64)],
    code:   [v.required, v.str(6, 6)],
  }),
  (req, res) => {
    const totp = new OTPAuth.TOTP({
      issuer: 'Medicos EMR',
      label: req.user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(req.body.secret),
    });

    const delta = totp.validate({ token: req.body.code, window: 1 });
    if (delta === null) return res.status(400).json({ error: 'Invalid code' });

    run('UPDATE users SET totp_secret = ? WHERE id = ?', [req.body.secret, req.user.id]);
    auditLog(req.user.id, 'ENABLE_MFA', 'users', req.user.id, {}, ip(req));
    
    res.json({ success: true });
  }
);

// ── POST /api/auth/register (admin-only, called during onboarding) ──────────
router.post('/register',
  v.body({
    name:     [v.required, v.str(2, 100)],
    email:    [v.required, v.str(3, 254), v.email],
    password: [v.required, v.password(8)],
    role:     [v.oneOf(VALID_ROLES)],
  }),
  (req, res) => {
    const { name, email, password, role, hospital_id } = req.body;
    const emailNorm = email.toLowerCase().trim();

    const existing = queryOne('SELECT id FROM users WHERE email = ?', [emailNorm]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashed = bcrypt.hashSync(password, 10);
    const id = uuid();
    run(
      'INSERT INTO users (id, name, email, password, role, hospital_id) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name.trim(), emailNorm, hashed, role || 'doctor', hospital_id || 'hsp-001']
    );

    res.status(201).json({ id, name: name.trim(), email: emailNorm, role: role || 'doctor' });
  }
);

// ── POST /api/auth/patient/login ────────────────────────────────────────────
router.post('/patient/login',
  loginLimiter,
  v.body({
    identifier: [v.required, v.str(3, 100)],
    password:   [v.required, v.str(1, 200)],
  }),
  (req, res) => {
    const { identifier, password } = req.body;

    const patient = queryOne(
      'SELECT * FROM patients WHERE (uhid = ? OR phone = ?) AND is_active = 1',
      [identifier.trim(), identifier.trim()]
    );
    if (!patient) return res.status(401).json({ error: 'Invalid credentials' });
    if (!patient.password)
      return res.status(401).json({ error: 'Password not set. Contact reception to activate your account.' });

    const match = bcrypt.compareSync(password, patient.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const payload = {
      id:         patient.id,
      uhid:       patient.uhid,
      name:       patient.name,
      role:       'patient',
      hospitalId: patient.hospital_id,
    };

    const token = createToken(payload);
    
    // Set cookies
    const csrfToken = crypto.randomBytes(16).toString('hex');
    const cookieOpts = { secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 4 * 3600000 };
    
    res.cookie('emr_token', token, { ...cookieOpts, httpOnly: true });
    res.cookie('csrf_token', csrfToken, { ...cookieOpts, httpOnly: false });
    
    res.json({ user: payload, expiresIn: 4 * 3600 });
  }
);

module.exports = router;
