// server/utils/supabase.js
// Supabase client for server-side use (admin operations use service role key)

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;

// FIX: Service role key is required for admin operations (createUser, listUsers, etc.).
// Anon key will fail on admin.createUser and admin.listUsers.
// On Render: set SUPABASE_SERVICE_KEY in Environment Variables.
// NEVER expose the service role key to the client/browser.
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl) {
  console.error('[FATAL] SUPABASE_URL is not set in environment variables.');
  process.exit(1);
}

if (!supabaseKey) {
  console.error('[FATAL] SUPABASE_SERVICE_KEY (or SUPABASE_KEY) is not set in environment variables.');
  process.exit(1);
}

// Warn if only the anon key is present — admin operations will fail
if (!process.env.SUPABASE_SERVICE_KEY && process.env.SUPABASE_KEY) {
  console.warn(
    '[supabase] WARNING: Using SUPABASE_KEY (likely anon key) instead of SUPABASE_SERVICE_KEY. ' +
    'Admin operations (createUser, listUsers) will fail with "not authorized". ' +
    'Set SUPABASE_SERVICE_KEY to the service_role key from your Supabase project settings.'
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // FIX: Server-side client must NOT persist sessions or auto-refresh tokens.
    // Each request validates its own token via supabase.auth.getUser(token).
    persistSession:   false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

module.exports = supabase;