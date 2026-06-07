// server/db/seed_auth.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[seed] Error: SUPABASE_URL and key must be set in env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1'))
    ? false
    : { rejectUnauthorized: false }
});

const seedUsers = [
  {
    email: 'admin@medicos.local',
    password: 'Admin@123',
    name: 'System Admin',
    role: 'admin',
    hospitalId: 'hsp-001'
  },
  {
    email: 'dr.sharma@medicos.local',
    password: 'Doctor@123',
    name: 'Dr. Priya Sharma',
    role: 'doctor',
    hospitalId: 'hsp-001'
  },
  {
    email: 'reception@medicos.local',
    password: 'Recept@123',
    name: 'Anita Patel',
    role: 'receptionist',
    hospitalId: 'hsp-001'
  }
];

async function seed() {
  console.log('[seed] Seeding Supabase Auth and database users...');
  
  // Seed default hospital
  console.log('[seed] Seeding default hospital...');
  await pool.query(
    `INSERT INTO hospitals (id, name, type, city, phone)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO NOTHING`,
    ['hsp-001', 'Medicos General Hospital', 'General', 'Mumbai', '+91-22-12345678']
  );
  console.log('[seed] Default hospital seeded.');

  for (const user of seedUsers) {
    console.log(`[seed] Checking user: ${user.email}`);
    
    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true
    });
    
    let userId;
    
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already exists') || msg.includes('already registered') || msg.includes('already been registered') || msg.includes('email_exists') || msg.includes('email already')) {
        // Find existing auth user
        const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
          console.error(`[seed] Error listing auth users:`, listError.message);
          continue;
        }
        const existingAuth = listData.users.find(u => u.email === user.email);
        if (existingAuth) {
          userId = existingAuth.id;
          console.log(`[seed] User already exists in Supabase Auth with ID: ${userId}`);
        } else {
          console.error(`[seed] Could not retrieve existing user ID for ${user.email}`);
          continue;
        }
      } else {
        console.error(`[seed] Error creating auth user ${user.email}:`, error.message);
        continue;
      }
    } else {
      userId = data.user.id;
      console.log(`[seed] Created user in Supabase Auth with ID: ${userId}`);
    }
    
    // Check if user exists in public users table
    const dbUserRes = await pool.query('SELECT id FROM users WHERE email = $1', [user.email]);
    if (dbUserRes.rows.length === 0) {
      // Insert user
      await pool.query(
        `INSERT INTO users (id, name, email, password, role, hospital_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, 1)`,
        [userId, user.name, user.email, 'SUPABASE_MANAGED', user.role, user.hospitalId]
      );
      console.log(`[seed] Inserted user ${user.email} into public users table.`);
    } else {
      const dbUser = dbUserRes.rows[0];
      if (dbUser.id !== userId) {
        // Update public users table ID to match Supabase Auth ID
        await pool.query('UPDATE users SET id = $1 WHERE email = $2', [userId, user.email]);
        console.log(`[seed] Updated ID of user ${user.email} to match Supabase Auth.`);
      } else {
        console.log(`[seed] User ${user.email} already configured correctly in public users table.`);
      }
    }
  }
  
  console.log('[seed] Seeding complete!');
  pool.end();
}

seed().catch(err => {
  console.error('[seed] Error:', err);
  pool.end();
});
