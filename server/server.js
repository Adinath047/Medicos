// server/server.js — Main Express server
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const compression = require('compression');
const path       = require('path');
const { initCloud, getCloudStatus, syncCycle } = require('./db/cloudSync');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Security & compression ─────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || '*',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
  res.json({ status: 'ok', time: new Date().toISOString(), version: '1.0.0', cloud });
});

app.post('/api/cloud-sync', require('./middleware/auth').authMiddleware, async (req, res) => {
  try { await syncCycle(); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
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
