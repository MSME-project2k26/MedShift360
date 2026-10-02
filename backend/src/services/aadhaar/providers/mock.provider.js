const crypto = require('crypto');

const MOCK_OTP = '123456';

/**
 * Development stand-in for a UIDAI e-KYC provider.
 * - sendOtp always "sends" an OTP; the OTP is always 123456.
 * - verifyOtp echoes back the name/DOB/gender the user already gave us,
 *   so the name-match logic can be exercised end to end.
 * Aadhaar numbers ending in 0000 simulate "mobile not linked to Aadhaar".
 */
module.exports = {
  name: 'mock',
  otpValidSeconds: 600,

  async sendOtp(aadhaarNumber) {
    if (aadhaarNumber.endsWith('0000')) {
      return { ok: false, reason: 'MOBILE_NOT_LINKED' };
    }
    return { ok: true, referenceId: `mock_${crypto.randomUUID()}` };
  },

  async verifyOtp(referenceId, otp, context = {}) {
    if (otp !== MOCK_OTP) return { ok: false, reason: 'INVALID_OTP' };
    return {
      ok: true,
      demographics: {
        name: context.fullName || 'Test User',
        dateOfBirth: context.dateOfBirth || '1955-06-15',
        gender: context.gender || 'male',
      },
    };
  },
};
