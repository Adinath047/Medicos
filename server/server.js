// server/server.js — Main Express server
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
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
app.set('trust proxy', 1); // Trust first proxy (e.g. Nginx, Load Balancer, Render) to get correct req.ip

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
const ALLOWED_ORIGINS = [
  // Local development
  'http://localhost:5173',
  'http://localhost:4000',
  'http://127.0.0.1:5173',
  // Vercel production & preview deployments
  /\.vercel\.app$/,
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    const allowed = ALLOWED_ORIGINS.some(o =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    callback(null, allowed ? true : new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-CSRF-Token','X-Super-Admin-Key'],
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
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Strict login rate limit — 10 attempts per 15 min per IP to prevent brute-force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only count failed attempts
  message: { error: 'Too many login attempts. Please wait 15 minutes before trying again.' }
});

// Apply global rate limiting to all /api routes
app.use('/api', apiLimiter);
// Apply strict rate limiting specifically to login
app.use('/api/auth/login', loginLimiter);

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
app.use('/api/super-admin',   require('./routes/super_admin'));
app.use('/api/patients',      require('./routes/patients'));
app.use('/api/encounters',    require('./routes/encounters'));
app.use('/api/vitals',        require('./routes/vitals'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/appointments',  require('./routes/appointments'));
app.use('/api/beds',          require('./routes/beds'));
app.use('/api/notifications', require('./routes/notifications'));
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
    
    const { decryptFields } = require('./utils/crypto');
    const recentPatientsRaw = await query(
      "SELECT id, name, uhid, age, sex, blood_group, phone, created_at FROM patients WHERE hospital_id = $1 AND is_active = 1 ORDER BY created_at DESC LIMIT 5",
      [hid]
    );
    const recentPatients = recentPatientsRaw.map(p => decryptFields(p, ['phone']));
    
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
  res.json({ status: 'ok', time: new Date().toISOString(), version: '1.0.1', service: 'monolith' });
});

// NOTE: /api/auth/debug-users removed — it exposed user data without authentication

// Serve Standalone Super Admin Dashboard
app.use('/super-admin', (req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self';"
  );
  next();
});
app.use('/super-admin', express.static(path.join(__dirname, 'public/super-admin')));
app.get('/super-admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/super-admin/index.html'));
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

// ── Run DB Migrations ──────────────────────────────────────────────────────
(async () => {
  const { run, queryOne } = require('./db/database');
  try {
    console.log('[db] Running startup database migrations...');
    
    // Create delta-sync composite and single-column indexes on pg
    console.log('[db] Creating database indexes...');
    await run(`CREATE INDEX IF NOT EXISTS idx_patients_hospital ON patients(hospital_id);`);
    await run(`CREATE INDEX IF NOT EXISTS idx_patients_updated_at ON patients(updated_at);`);
    await run(`CREATE INDEX IF NOT EXISTS idx_patients_hsp_updated ON patients(hospital_id, updated_at);`);

    await run(`CREATE INDEX IF NOT EXISTS idx_encounters_hospital ON encounters(hospital_id);`);
    await run(`CREATE INDEX IF NOT EXISTS idx_encounters_updated_at ON encounters(updated_at);`);
    await run(`CREATE INDEX IF NOT EXISTS idx_encounters_hsp_updated ON encounters(hospital_id, updated_at);`);

    await run(`CREATE INDEX IF NOT EXISTS idx_vitals_hospital ON vitals(hospital_id);`);
    await run(`CREATE INDEX IF NOT EXISTS idx_vitals_recorded_at ON vitals(recorded_at);`);
    await run(`CREATE INDEX IF NOT EXISTS idx_vitals_hsp_recorded ON vitals(hospital_id, recorded_at);`);

    await run(`CREATE INDEX IF NOT EXISTS idx_prescriptions_hospital ON prescriptions(hospital_id);`);
    await run(`CREATE INDEX IF NOT EXISTS idx_prescriptions_created_at ON prescriptions(created_at);`);
    await run(`CREATE INDEX IF NOT EXISTS idx_prescriptions_hsp_created ON prescriptions(hospital_id, created_at);`);

    await run(`CREATE INDEX IF NOT EXISTS idx_appointments_hospital ON appointments(hospital_id);`);
    await run(`CREATE INDEX IF NOT EXISTS idx_appointments_updated_at ON appointments(updated_at);`);
    await run(`CREATE INDEX IF NOT EXISTS idx_appointments_hsp_updated ON appointments(hospital_id, updated_at);`);

    await run(`CREATE INDEX IF NOT EXISTS idx_billing_hospital ON billing(hospital_id);`);
    await run(`CREATE INDEX IF NOT EXISTS idx_billing_created_at ON billing(created_at);`);
    await run(`CREATE INDEX IF NOT EXISTS idx_billing_hsp_created ON billing(hospital_id, created_at);`);

    await run(`CREATE INDEX IF NOT EXISTS idx_medicines_hospital ON medicines(hospital_id);`);
    await run(`CREATE INDEX IF NOT EXISTS idx_medicines_updated_at ON medicines(updated_at);`);
    await run(`CREATE INDEX IF NOT EXISTS idx_medicines_hsp_updated ON medicines(hospital_id, updated_at);`);

    // Define the trigger function for updated_at auto-updates
    console.log('[db] Configuring automatic updated_at triggers...');
    await run(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
         NEW.updated_at = now()::text;
         RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Define helper to safely drop/create BEFORE UPDATE triggers
    const setupTrigger = async (tableName) => {
      await run(`DROP TRIGGER IF EXISTS trg_${tableName}_updated_at ON ${tableName};`);
      await run(`
        CREATE TRIGGER trg_${tableName}_updated_at
        BEFORE UPDATE ON ${tableName}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `);
    };

    // Apply triggers on tables that have updated_at column
    await setupTrigger('users');
    await setupTrigger('hospitals');
    await setupTrigger('patients');
    await setupTrigger('encounters');
    await setupTrigger('appointments');
    await setupTrigger('medicines');

    await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS letterhead TEXT;`);
    await run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id          TEXT PRIMARY KEY,
        hospital_id TEXT NOT NULL,
        doctor_id   TEXT NOT NULL,
        patient_id  TEXT,
        message     TEXT NOT NULL,
        is_read     INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT NOT NULL DEFAULT (now()::text)
      );
    `);

    // Create medicines table
    await run(`
      CREATE TABLE IF NOT EXISTS medicines (
        id           TEXT PRIMARY KEY,
        hospital_id  TEXT NOT NULL,
        name         TEXT NOT NULL,
        generics     TEXT DEFAULT '[]',
        strengths    TEXT DEFAULT '[]',
        default_dose TEXT,
        category     TEXT,
        is_active    INTEGER NOT NULL DEFAULT 1,
        created_at   TEXT NOT NULL DEFAULT (now()::text),
        updated_at   TEXT NOT NULL DEFAULT (now()::text)
      );
    `);

    // Seed medicines if empty
    const countRes = await queryOne('SELECT COUNT(*) as n FROM medicines');
    if (countRes && parseInt(countRes.n || 0) === 0) {
      console.log('[db] Seeding medicines from client medicines.ts...');
      const fs = require('fs');
      const path = require('path');
      try {
        const tsPath = path.join(__dirname, '../client/src/utils/medicines.ts');
        if (fs.existsSync(tsPath)) {
          const tsContent = fs.readFileSync(tsPath, 'utf8');
          const startMarker = 'export const MEDICINES: Medicine[] = ';
          const endMarker = ';\n\n// All common brand names';
          const startIdx = tsContent.indexOf(startMarker);
          const endIdx = tsContent.indexOf(endMarker);
          if (startIdx !== -1 && endIdx !== -1) {
            const jsonStr = tsContent.substring(startIdx + startMarker.length, endIdx);
            const medicines = JSON.parse(jsonStr);
            console.log(`[db] Found ${medicines.length} medicines in medicines.ts. Seeding...`);
            
            const { v4: uuid } = require('uuid');
            for (const med of medicines) {
              await run(
                `INSERT INTO medicines (id, hospital_id, name, generics, strengths, default_dose, category)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                  uuid(),
                  'hsp-001',
                  med.name,
                  JSON.stringify(med.generics),
                  JSON.stringify(med.strengths),
                  med.defaultDose || null,
                  med.category || null
                ]
              );
            }
            console.log('[db] Medicines seeded successfully!');
          } else {
            console.warn('[db] Could not find MEDICINES array markers in medicines.ts');
          }
        } else {
          console.warn('[db] medicines.ts file not found at:', tsPath);
        }
      } catch (err) {
        console.error('[db] Error seeding medicines:', err.message);
      }
    }

    console.log('[db] Database migrations executed successfully.');
  } catch (err) {
    console.error('[db] Error running database migrations on startup:', err.message);
  }
})();

// ── Start ─────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🏥 Medicos EMR Server`);
    console.log(`   Local:    http://localhost:${PORT}`);
    console.log(`   Network:  http://0.0.0.0:${PORT}  (accessible on hospital LAN)`);
    console.log(`   API docs: http://localhost:${PORT}/api/health\n`);
  });
}

module.exports = app;
