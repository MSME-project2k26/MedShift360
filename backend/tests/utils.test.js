require('./setupEnv');
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeIndianMobile, maskPhone, maskEmail } = require('../src/utils/phone');
const { normalizeAadhaar, maskAadhaar, verhoeffValid } = require('../src/utils/aadhaar');
const { calculateAge, isSeniorCitizen } = require('../src/utils/age');
const { generateNumericCode, safeEqual } = require('../src/utils/crypto');
const { namesMatch } = require('../src/services/aadhaar/aadhaar.service');
const { redact } = require('../src/utils/logger');

/** Builds a valid Aadhaar-format number by finding the Verhoeff check digit. */
function validAadhaar(first11) {
  for (let d = 0; d <= 9; d += 1) {
    if (verhoeffValid(`${first11}${d}`)) return `${first11}${d}`;
  }
  throw new Error('unreachable');
}

test('normalizeIndianMobile accepts common Indian formats', () => {
  for (const input of ['9876543210', '09876543210', '+91 98765 43210', '91-9876543210', '+919876543210', 9876543210]) {
    assert.equal(normalizeIndianMobile(input), '+919876543210', `input ${input}`);
  }
});

test('normalizeIndianMobile rejects invalid numbers', () => {
  for (const input of ['12345', '5876543210', '98765432101', 'abcdefghij', '', null, undefined]) {
    assert.equal(normalizeIndianMobile(input), null, `input ${input}`);
  }
});

test('masking hides most of phone and email', () => {
  assert.equal(maskPhone('+919876543210'), '+91 ******3210');
  assert.equal(maskEmail('ramesh@gmail.com'), 'ra****@gmail.com');
});

test('normalizeAadhaar validates format and Verhoeff checksum', () => {
  const valid = validAadhaar('23456789012');
  assert.equal(normalizeAadhaar(valid), valid);
  assert.equal(normalizeAadhaar(`${valid.slice(0, 4)} ${valid.slice(4, 8)} ${valid.slice(8)}`), valid);

  const wrongCheck = `${valid.slice(0, 11)}${(Number(valid[11]) + 1) % 10}`;
  assert.equal(normalizeAadhaar(wrongCheck), null);
  assert.equal(normalizeAadhaar('123456789012'), null, 'cannot start with 1');
  assert.equal(normalizeAadhaar('2345678901'), null, 'too short');
  assert.equal(maskAadhaar('1234'), 'XXXX XXXX 1234');
});

test('calculateAge and isSeniorCitizen', () => {
  const today = new Date('2026-10-02');
  assert.equal(calculateAge('1956-10-02', today), 70);
  assert.equal(calculateAge('1956-10-03', today), 69);
  assert.equal(calculateAge(null), null);
  assert.equal(isSeniorCitizen('1950-01-01'), true);
  assert.equal(isSeniorCitizen('2000-01-01'), false);
});

test('generateNumericCode returns zero-padded 6-digit strings', () => {
  for (let i = 0; i < 200; i += 1) assert.match(generateNumericCode(6), /^[0-9]{6}$/);
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
});

test('namesMatch tolerates order, titles and initials', () => {
  assert.equal(namesMatch('Ramesh Kumar', 'Kumar Ramesh'), true);
  assert.equal(namesMatch('K. Ramesh', 'Ramesh Kumar'), true);
  assert.equal(namesMatch('Smt. Lakshmi Devi', 'Lakshmi Devi'), true);
  assert.equal(namesMatch('Lakshmi Devi', 'Suresh Babu'), false);
  assert.equal(namesMatch('', 'Suresh'), false);
});

test('logger redacts sensitive keys', () => {
  const out = redact({ phone: '+91...', password: 'x', nested: { aadhaarNumber: '1', otp: '2', refreshToken: '3' } });
  assert.equal(out.password, '[REDACTED]');
  assert.equal(out.nested.aadhaarNumber, '[REDACTED]');
  assert.equal(out.nested.otp, '[REDACTED]');
  assert.equal(out.nested.refreshToken, '[REDACTED]');
  assert.equal(out.phone, '+91...');
});
