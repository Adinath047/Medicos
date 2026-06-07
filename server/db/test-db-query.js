require('dotenv').config();
const { pool, query } = require('./database');

async function runTest() {
  try {
    console.log('--- Testing triggers ---');
    const triggers = await query(`
      SELECT trigger_name, event_manipulation, event_object_table, action_statement 
      FROM information_schema.triggers
    `);
    console.log('Triggers:', triggers);

    console.log('--- Testing indexes ---');
    const indexes = await query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename IN ('prescriptions', 'billing')
    `);
    console.log('Indexes:', indexes);

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await pool.end();
  }
}

runTest();
