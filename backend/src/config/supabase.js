const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

// Server-side client using the service_role key. It bypasses RLS, so it
// must never be exposed to the browser.
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

module.exports = supabase;
