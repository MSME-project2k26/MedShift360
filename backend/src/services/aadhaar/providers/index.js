const env = require('../../../config/env');

/**
 * Aadhaar provider contract. To go live, add a file next to mock.provider.js
 * that wraps your licensed e-KYC partner (a UIDAI-registered AUA/KUA, or an
 * aggregator built on them) and register it below.
 *
 *   name: string
 *   otpValidSeconds: number
 *   sendOtp(aadhaarNumber)
 *     -> { ok: true, referenceId } | { ok: false, reason }
 *   verifyOtp(referenceId, otp, context)
 *     -> { ok: true, demographics: { name, dateOfBirth: 'YYYY-MM-DD', gender: 'male'|'female'|'other' } }
 *      | { ok: false, reason }
 *
 * Failure reasons understood by aadhaar.service:
 *   MOBILE_NOT_LINKED, INVALID_OTP, OTP_EXPIRED, PROVIDER_ERROR
 */
const providers = {
  mock: require('./mock.provider'),
};

module.exports = providers[env.AADHAAR_PROVIDER];
