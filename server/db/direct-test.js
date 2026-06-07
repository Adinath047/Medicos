const { Client } = require('pg');

const hosts = [
  { name: 'Direct Host', host: 'db.gyslrrgllwishjxqzsjh.supabase.co', port: 5432, user: 'postgres' },
  { name: 'Pooler Host', host: 'aws-1-ap-southeast-1.pooler.supabase.com', port: 6543, user: 'postgres.gyslrrgllwishjxqzsjh' }
];

const passwords = [
  'Adinath047/',
  'Adinath047//',
  'Adinath047%2F',
  'Adinath047',
  'Adinath047/%2F'
];

async function test(hInfo, pwd) {
  const client = new Client({
    host: hInfo.host,
    port: hInfo.port,
    user: hInfo.user,
    password: pwd,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log(`\n[SUCCESS] ${hInfo.name} (${hInfo.host}) with password "${pwd}" connected! Time:`, res.rows[0].now);
    
    // Let's also query the tables in the database to see what exists!
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in database:', tablesRes.rows.map(r => r.table_name));
    
    await client.end();
    return true;
  } catch (err) {
    console.log(`[FAILED] ${hInfo.name} with password "${pwd}" -> ${err.message}`);
    return false;
  }
}

async function run() {
  console.log('Testing direct and pooler connection with different password variants...');
  for (const hInfo of hosts) {
    for (const pwd of passwords) {
      const ok = await test(hInfo, pwd);
      if (ok) {
        console.log('\nFound working connection! Exiting.');
        process.exit(0);
      }
    }
  }
  console.log('\nAll tests failed.');
}

run();
