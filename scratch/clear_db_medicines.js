const dotenv = require('dotenv');
const path = require('path');

// Load env variables FIRST before requiring database modules
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const { run } = require('../server/db/database');

(async () => {
  try {
    console.log('[clear] Deleting all records from medicines table in PostgreSQL...');
    const result = await run('DELETE FROM medicines');
    console.log(`[clear] Success! Deleted ${result.changes} records.`);
    process.exit(0);
  } catch (err) {
    console.error('[clear] Error clearing medicines table:', err.message);
    process.exit(1);
  }
})();
