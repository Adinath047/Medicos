// server/server.js — Main Express server
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const compression = require('compression');
const cookieParser= require('cookie-parser');
const path       = require('path');
const crypto     = require('crypto');

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
app.get('/api/dashboard', require('./middleware/auth').authMiddleware, async (req, res) => {
  const { query, queryOne } = require('./db/database');
  const { hospitalId } = req.user;
  const hid = hospitalId || 'hsp-001';

  try {
    const totalPatientsRow = await queryOne('SELECT COUNT(*) as n FROM patients WHERE hospital_id = $1 AND is_active = 1', [hid]);
    const todayEncountersRow = await queryOne("SELECT COUNT(*) as n FROM encounters WHERE hospital_id = $1 AND created_at::date = CURRENT_DATE", [hid]);
    const todayAppointmentsRow = await queryOne("SELECT COUNT(*) as n FROM appointments WHERE hospital_id = $1 AND date = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AND status != 'Cancelled'", [hid]);
    const checkedInRow = await queryOne("SELECT COUNT(*) as n FROM appointments WHERE hospital_id = $1 AND date = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AND status = 'Checked-In'", [hid]);
    const totalDoctorsRow = await queryOne("SELECT COUNT(*) as n FROM users WHERE hospital_id = $1 AND role = 'doctor' AND is_active = 1", [hid]);
    const pendingBillingRow = await queryOne("SELECT COUNT(*) as n FROM billing WHERE hospital_id = $1 AND payment_status = 'Pending'", [hid]);
    
    const recentPatients = await query(
      "SELECT id, name, uhid, age, sex, blood_group, phone, created_at FROM patients WHERE hospital_id = $1 AND is_active = 1 ORDER BY created_at DESC LIMIT 5",
      [hid]
    );
    
    const todayQueue = await query(
      `SELECT a.*, p.name as patient_name, p.uhid, u.name as doctor_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users u ON a.doctor_id = u.id
       WHERE a.hospital_id = $1 AND a.date = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AND a.status NOT IN ('Cancelled','Completed')
       ORDER BY a.token_number ASC LIMIT 10`,
      [hid]
    );

    const stats = {
      totalPatients:     totalPatientsRow ? parseInt(totalPatientsRow.n || 0) : 0,
      todayEncounters:   todayEncountersRow ? parseInt(todayEncountersRow.n || 0) : 0,
      todayAppointments: todayAppointmentsRow ? parseInt(todayAppointmentsRow.n || 0) : 0,
      checkedIn:         checkedInRow ? parseInt(checkedInRow.n || 0) : 0,
      totalDoctors:      totalDoctorsRow ? parseInt(totalDoctorsRow.n || 0) : 0,
      pendingBilling:    pendingBillingRow ? parseInt(pendingBillingRow.n || 0) : 0,
      recentPatients,
      todayQueue,
    };

    res.json(stats);
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to load dashboard stats' });
  }
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), version: '1.0.1' });
});

app.get('/api/auth/debug-users', async (req, res) => {
  try {
    const { query } = require('./db/database');
    const users = await query('SELECT id, email, is_active, role FROM users');
    res.json({ count: users.length, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
});

module.exports = app;
