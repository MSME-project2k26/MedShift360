// Dummy configuration so modules can load without a real Supabase project.
Object.assign(process.env, {
  NODE_ENV: 'test',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-not-real-000000',
  JWT_ACCESS_SECRET: 'test-jwt-secret-0123456789abcdef0123456789',
  OTP_SECRET: 'test-otp-secret-0123456789abcdef0123456789',
  AADHAAR_HASH_SECRET: 'test-aadhaar-secret-0123456789abcdef012345',
});
