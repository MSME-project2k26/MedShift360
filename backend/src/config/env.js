require('dotenv').config();
const { z } = require('zod');

const bool = z
  .enum(['true', 'false', '1', '0'])
  .default('false')
  .transform((v) => v === 'true' || v === '1');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('30m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  OTP_SECRET: z.string().min(32),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().min(0).default(30),
  OTP_MAX_PER_HOUR: z.coerce.number().int().positive().default(5),
  OTP_DEV_ECHO: bool,

  SMS_PROVIDER: z.enum(['console', 'twilio']).default('console'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),

  EMAIL_PROVIDER: z.enum(['console', 'smtp']).default('console'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('MedShift360 <no-reply@medshift360.in>'),

  AADHAAR_PROVIDER: z.enum(['mock']).default('mock'),
  AADHAAR_HASH_SECRET: z.string().min(32),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n${problems}\nSee .env.example`);
  process.exit(1);
}

const env = parsed.data;
env.isProduction = env.NODE_ENV === 'production';
env.corsOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
// The OTP is only ever echoed back outside production
env.echoOtp = env.OTP_DEV_ECHO && !env.isProduction;

if (env.isProduction) {
  const unsafe = [];
  if (env.SMS_PROVIDER === 'console') unsafe.push('SMS_PROVIDER=console (OTPs would never reach users)');
  if (env.EMAIL_PROVIDER === 'console') unsafe.push('EMAIL_PROVIDER=console');
  if (env.AADHAAR_PROVIDER === 'mock') unsafe.push('AADHAAR_PROVIDER=mock (accepts a fixed OTP)');
  if (unsafe.length) {
    // eslint-disable-next-line no-console
    console.error(`Refusing to start in production with:\n  - ${unsafe.join('\n  - ')}`);
    process.exit(1);
  }
}

if (env.SMS_PROVIDER === 'twilio' && !(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER)) {
  // eslint-disable-next-line no-console
  console.error('SMS_PROVIDER=twilio requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER');
  process.exit(1);
}

if (env.EMAIL_PROVIDER === 'smtp' && !env.SMTP_HOST) {
  // eslint-disable-next-line no-console
  console.error('EMAIL_PROVIDER=smtp requires SMTP_HOST');
  process.exit(1);
}

module.exports = env;
