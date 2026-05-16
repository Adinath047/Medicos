// server/server.js — Main Express server
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const compression = require('compression');
const cookieParser= require('cookie-parser');
const path       = require('path');
const crypto     = require('crypto');
const { initCloud, getCloudStatus, syncCycle } = require('./db/cloudSync');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Security & compression ─────────────────────────────────────────────────
app.set('trust proxy', 1); // Trust first proxy (Railway/Render) to get correct req.ip

// Disable X-Powered-By header (Helmet handles this, but good to be explicit)
app.disable('x-powered-by');

// Add secure HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}));

app.use(compression());
app.use(cookieParser());

// Restrict CORS
app.use(cors({
  origin: [
    process.env.CLIENT_ORIGIN || '*',
    process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null
  ].filter(Boolean),
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-CSRF-Token'],
  credentials: true,
}));

// CSRF Double-Submit Middleware
app.use((req, res, next) => {
  // Safe methods don't need CSRF check
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  
  // Skip CSRF for login/register
  if (req.path.startsWith('/api/auth/login') || req.path === '/api/auth/register') return next();
  
  // Mobile app might not use cookies, fallback to authorization header for CSRF if token in header?
  // Let's enforce CSRF for all state-changing requests using cookies
  if (req.cookies && req.cookies.emr_token) {
    const cookieToken = req.cookies.csrf_token;
    const headerToken = req.headers['x-csrf-token'];
    
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return res.status(403).json({ error: 'CSRF token mismatch or missing' });
    }
  }
  next();
});

// Global Rate Limiting to prevent DDoS
const rateLimit = require('express-rate-limit');
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Increased to 5000 to prevent false-positive blocking
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Apply global rate limiting to all /api routes
app.use('/api', apiLimiter);

// Payload limits to prevent large payload attacks
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Request logger (dev only) ─────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
  });
}

// ── API Routes ────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/patients',      require('./routes/patients'));
app.use('/api/encounters',    require('./routes/encounters'));
app.use('/api/vitals',        require('./routes/vitals'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/appointments',  require('./routes/appointments'));
app.use('/api/billing',       require('./routes/billing'));
app.use('/api/pharmacy',      require('./routes/pharmacy'));
app.use('/api/patient-uploads', require('./routes/patient_uploads'));
app.use('/api/sync',          require('./routes/sync'));

// ── Dashboard stats ───────────────────────────────────────────────────────
app.get('/api/dashboard', require('./middleware/auth').authMiddleware, (req, res) => {
  const { query, queryOne } = require('./db/database');
  const { hospitalId } = req.user;
  const hid = hospitalId || 'hsp-001';

  const stats = {
    totalPatients:     queryOne('SELECT COUNT(*) as n FROM patients WHERE hospital_id = ? AND is_active = 1', [hid]).n,
    todayEncounters:   queryOne("SELECT COUNT(*) as n FROM encounters WHERE hospital_id = ? AND date(created_at) = date('now')", [hid]).n,
    todayAppointments: queryOne("SELECT COUNT(*) as n FROM appointments WHERE hospital_id = ? AND date = date('now') AND status != 'Cancelled'", [hid]).n,
    checkedIn:         queryOne("SELECT COUNT(*) as n FROM appointments WHERE hospital_id = ? AND date = date('now') AND status = 'Checked-In'", [hid]).n,
    totalDoctors:      queryOne("SELECT COUNT(*) as n FROM users WHERE hospital_id = ? AND role = 'doctor' AND is_active = 1", [hid]).n,
    pendingBilling:    queryOne("SELECT COUNT(*) as n FROM billing WHERE hospital_id = ? AND payment_status = 'Pending'", [hid]).n,
    recentPatients:    query(
      "SELECT id, name, uhid, age, sex, blood_group, phone, created_at FROM patients WHERE hospital_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 5",
      [hid]
    ),
    todayQueue: query(
      `SELECT a.*, p.name as patient_name, p.uhid, u.name as doctor_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users u ON a.doctor_id = u.id
       WHERE a.hospital_id = ? AND a.date = date('now') AND a.status NOT IN ('Cancelled','Completed')
       ORDER BY a.token_number ASC LIMIT 10`,
      [hid]
    ),
  };

  res.json(stats);
});

// ── Health check + cloud status ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const cloud = getCloudStatus();
  res.json({ status: 'ok', time: new Date().toISOString(), version: '1.0.1', cloud });
});

app.post('/api/cloud-sync', require('./middleware/auth').authMiddleware, async (req, res) => {
  try { await syncCycle(); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/debug-users', (req, res) => {
  const { query, getDB } = require('./db/database');
  const path = require('path');
  const users = query('SELECT id, email, is_active, role FROM users');
  res.json({ count: users.length, dbPath: path.resolve(process.env.DB_PATH || '../../emr_data.sqlite3'), users });
});

// ── Serve React build (production) ────────────────────────────────────────
const clientBuild = path.join(__dirname, '../client/dist');
if (require('fs').existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => {
    if (!req.url.startsWith('/api')) {
      res.sendFile(path.join(clientBuild, 'index.html'));
    }
  });
}

// ── Error handler ─────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('❌ Server error:', err.message);
  res.status(500).json({ error: 'Internal server error', detail: process.env.NODE_ENV !== 'production' ? err.message : undefined });
});

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🏥 Medicos EMR Server`);
  console.log(`   Local:    http://localhost:${PORT}`);
  console.log(`   Network:  http://0.0.0.0:${PORT}  (accessible on hospital LAN)`);
  console.log(`   API docs: http://localhost:${PORT}/api/health\n`);

  // Start cloud sync after server is up
  initCloud().catch(err => console.warn('Cloud init error:', err.message));
});

module.exports = app;
