/* eslint-disable no-console */
// Verifies the Supabase connection and that migration 001 has been run.
// Usage: npm run db:check
const env = require('../src/config/env');
const supabase = require('../src/config/supabase');

const TABLES = [
  'users',
  'patient_profiles',
  'aadhaar_verifications',
  'emergency_contacts',
  'caregiver_links',
  'otp_codes',
  'user_sessions',
  'audit_logs',
];

(async () => {
  console.log(`Checking ${env.SUPABASE_URL}\n`);
  let failed = 0;
  for (const table of TABLES) {
    const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      failed += 1;
      const hint =
        error.code === 'PGRST205' || error.code === '42P01'
          ? 'table missing - run supabase/migrations/001_auth_and_profiles.sql'
          : error.message || 'check SUPABASE_SERVICE_ROLE_KEY in .env';
      console.log(`  x ${table.padEnd(22)} ${hint}`);
    } else {
      console.log(`  ok ${table}`);
    }
  }
  console.log(failed ? `\n${failed} problem(s) found.` : '\nDatabase is ready.');
  process.exit(failed ? 1 : 0);
})();
