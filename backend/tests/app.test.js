require('./setupEnv');
const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const authSchemas = require('../src/validators/auth.schemas');
const profileSchemas = require('../src/validators/profile.schemas');

// These tests exercise routing, validation and auth guards - everything
// that runs before the database is touched.

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
});

test.after(() => server.close());

async function call(method, path, { body, headers } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json(), headers: res.headers };
}

test('GET /health returns the standard success envelope', async () => {
  const { status, body, headers } = await call('GET', '/health');
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.status, 'ok');
  assert.ok(headers.get('x-request-id'));
});

test('unknown routes return a JSON 404', async () => {
  const { status, body } = await call('GET', '/nope');
  assert.equal(status, 404);
  assert.equal(body.error.code, 'ROUTE_NOT_FOUND');
});

test('malformed JSON returns INVALID_JSON', async () => {
  const { status, body } = await call('POST', '/auth/login/email', { body: '{bad json' });
  assert.equal(status, 400);
  assert.equal(body.error.code, 'INVALID_JSON');
});

test('validation errors list each field', async () => {
  const { status, body } = await call('POST', '/auth/register/email', {
    body: { fullName: 'R', email: 'not-an-email', password: 'short' },
  });
  assert.equal(status, 400);
  assert.equal(body.success, false);
  assert.equal(body.error.code, 'VALIDATION_ERROR');
  const fields = body.error.details.map((d) => d.field);
  assert.ok(fields.includes('fullName'));
  assert.ok(fields.includes('email'));
  assert.ok(fields.includes('password'));
});

test('invalid mobile number is rejected before any OTP is sent', async () => {
  const { status, body } = await call('POST', '/auth/login/phone/send-otp', { body: { phone: '12345' } });
  assert.equal(status, 400);
  assert.equal(body.error.details[0].message, 'Please enter a valid 10-digit Indian mobile number.');
});

test('protected routes require a bearer token', async () => {
  for (const [method, path] of [
    ['GET', '/auth/me'],
    ['GET', '/users/me/profile'],
    ['POST', '/users/me/aadhaar/send-otp'],
    ['GET', '/dependents'],
  ]) {
    const { status, body } = await call(method, path);
    assert.equal(status, 401, `${method} ${path}`);
    assert.equal(body.error.code, 'AUTH_REQUIRED');
  }
});

test('a forged token is rejected', async () => {
  const { status, body } = await call('GET', '/users/me/profile', {
    headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.invalid' },
  });
  assert.equal(status, 401);
  assert.equal(body.error.code, 'INVALID_TOKEN');
});

test('phone registration schema normalises the number and requires password with email', () => {
  const ok = authSchemas.registerPhoneVerify.parse({ phone: '98765 43210', otp: '123456', fullName: 'Lakshmi Devi' });
  assert.equal(ok.phone, '+919876543210');
  assert.throws(() =>
    authSchemas.registerPhoneVerify.parse({
      phone: '9876543210',
      otp: '123456',
      fullName: 'Lakshmi Devi',
      email: 'l@example.com',
    }),
  );
});

test('forgot password requires exactly one of email or phone', () => {
  assert.ok(authSchemas.forgotPassword.parse({ email: 'A@Example.com' }).email === 'a@example.com');
  assert.throws(() => authSchemas.forgotPassword.parse({}));
  assert.throws(() => authSchemas.forgotPassword.parse({ email: 'a@example.com', phone: '9876543210' }));
});

test('profile update schema accepts elderly-care fields and rejects unknown ones', () => {
  const parsed = profileSchemas.updateProfile.parse({
    bloodGroup: 'B+',
    chronicConditions: ['Type 2 Diabetes', 'Hypertension'],
    currentMedications: [{ name: 'Metformin', dosage: '500 mg', frequency: 'twice daily' }],
    mobilityAid: 'walker',
    hearingImpaired: true,
    abhaNumber: '12-3456-7890-1234',
  });
  assert.equal(parsed.abhaNumber, '12345678901234');
  assert.throws(() => profileSchemas.updateProfile.parse({ isAdmin: true }));
  assert.throws(() => profileSchemas.updateProfile.parse({}));
  assert.throws(() => profileSchemas.updateProfile.parse({ homeLatitude: 13.08 }));
});

test('Aadhaar OTP request requires explicit consent', () => {
  assert.throws(() => profileSchemas.aadhaarSendOtp.parse({ aadhaarNumber: '234567890123' }));
  assert.throws(() => profileSchemas.aadhaarSendOtp.parse({ aadhaarNumber: '234567890123', consent: false }));
});
