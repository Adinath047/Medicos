// server/routes/auth.js
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { v4: uuid } = require('uuid');
const { queryOne, run } = require('../db/database');
const { JWT_SECRET } = require('../middleware/auth');

// ── Brute-force protection ─────────────────────────────────────────────────
// Max 10 login attempts per IP per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  skipSuccessfulRequests: true, // only count failed attempts
});

// POST /api/auth/login
router.post('/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const user = queryOne('SELECT * FROM users WHERE email = ? AND is_active = 1', [email.toLowerCase().trim()]);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const match = bcrypt.compareSync(password, user.password);

  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const payload = {
    id:         user.id,
    name:       user.name,
    email:      user.email,
    role:       user.role,
    staff_type: user.staff_type || 'front_desk', // ← pharmacy vs front_desk routing
    hospitalId: user.hospital_id,
    photoUrl:   user.photo_url,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: payload, expiresIn: 86400 });
});

// POST /api/auth/register (admin only, done from code)
router.post('/register', async (req, res) => {
  const { name, email, password, role, hospital_id } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, password required' });

  const existing = queryOne('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hashed = bcrypt.hashSync(password, 10);
  const id = uuid();
  run(
    'INSERT INTO users (id, name, email, password, role, hospital_id) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, email.toLowerCase(), hashed, role || 'doctor', hospital_id || 'hsp-001']
  );

  res.status(201).json({ id, name, email, role: role || 'doctor' });
});

// POST /api/auth/patient/login
router.post('/patient/login', loginLimiter, (req, res) => {
  const { identifier, password } = req.body; // identifier can be uhid or phone
  if (!identifier || !password) return res.status(400).json({ error: 'identifier and password required' });

  // search by uhid or phone
  const patient = queryOne('SELECT * FROM patients WHERE (uhid = ? OR phone = ?) AND is_active = 1', [identifier, identifier]);
  if (!patient) return res.status(401).json({ error: 'Invalid credentials' });

  // If patient hasn't set a password yet, we might want to check that too
  if (!patient.password) return res.status(401).json({ error: 'Password not set for this account' });

  const match = bcrypt.compareSync(password, patient.password);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const payload = {
    id: patient.id,
    uhid: patient.uhid,
    name: patient.name,
    role: 'patient',
    hospitalId: patient.hospital_id
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }); // Longer session for patients
  res.json({ token, user: payload, expiresIn: 604800 });
});

// GET /api/auth/me — verify token
router.get('/me', (req, res) => {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'No token' });
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: decoded });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
