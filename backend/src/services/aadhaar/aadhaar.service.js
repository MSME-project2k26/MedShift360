const env = require('../../config/env');
const supabase = require('../../config/supabase');
const ApiError = require('../../utils/ApiError');
const logger = require('../../utils/logger');
const { unwrap } = require('../../utils/db');
const { hmac } = require('../../utils/crypto');
const { normalizeAadhaar, maskAadhaar } = require('../../utils/aadhaar');
const provider = require('./providers');

const MAX_OTP_ATTEMPTS = 3;

function hashAadhaar(aadhaarNumber) {
  return hmac(env.AADHAAR_HASH_SECRET, aadhaarNumber);
}

/** Lower-cased name tokens without titles or punctuation. */
function nameTokens(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !['mr', 'mrs', 'ms', 'dr', 'smt', 'shri', 'sri'].includes(t));
}

/**
 * Aadhaar names are often spelled or ordered differently from what users
 * type ("K. Ramesh" vs "Ramesh Kumar"). We treat it as a match when every
 * word of the shorter name appears in the longer one, ignoring initials.
 */
function namesMatch(a, b) {
  const tokensA = nameTokens(a).filter((t) => t.length > 1);
  const tokensB = nameTokens(b).filter((t) => t.length > 1);
  if (!tokensA.length || !tokensB.length) return false;
  const [shorter, longer] = tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];
  return shorter.every((t) => longer.includes(t));
}

function toStatus(row) {
  if (!row) {
    return { status: 'not_started', isVerified: false, aadhaarMasked: null };
  }
  return {
    status: row.status,
    isVerified: row.status === 'verified',
    aadhaarMasked: maskAadhaar(row.aadhaar_last4),
    verifiedAt: row.verified_at,
    nameMatched: row.name_matched,
    ...(row.status === 'failed' ? { failureReason: row.failure_reason } : {}),
  };
}

async function getRow(userId) {
  return unwrap(await supabase.from('aadhaar_verifications').select('*').eq('user_id', userId).maybeSingle());
}

async function getStatus(userId) {
  return toStatus(await getRow(userId));
}

async function sendOtp(userId, rawAadhaar) {
  const aadhaarNumber = normalizeAadhaar(rawAadhaar);
  if (!aadhaarNumber) {
    throw ApiError.badRequest('INVALID_AADHAAR', 'Please enter a valid 12-digit Aadhaar number.');
  }

  const existing = await getRow(userId);
  if (existing?.status === 'verified') {
    throw ApiError.conflict('AADHAAR_ALREADY_VERIFIED', 'Aadhaar is already verified for this account.');
  }

  const aadhaarHash = hashAadhaar(aadhaarNumber);
  const linkedElsewhere = unwrap(
    await supabase
      .from('aadhaar_verifications')
      .select('user_id')
      .eq('aadhaar_hash', aadhaarHash)
      .eq('status', 'verified')
      .neq('user_id', userId)
      .maybeSingle(),
  );
  if (linkedElsewhere) {
    throw ApiError.conflict(
      'AADHAAR_LINKED_TO_ANOTHER_ACCOUNT',
      'This Aadhaar number is already linked to another account.',
    );
  }

  let result;
  try {
    result = await provider.sendOtp(aadhaarNumber);
  } catch (err) {
    logger.error('Aadhaar provider sendOtp failed', { provider: provider.name, error: err.message });
    throw ApiError.badGateway('AADHAAR_SERVICE_UNAVAILABLE', 'Aadhaar verification is temporarily unavailable. Please try again later.');
  }
  if (!result.ok) {
    if (result.reason === 'MOBILE_NOT_LINKED') {
      throw ApiError.badRequest(
        'AADHAAR_MOBILE_NOT_LINKED',
        'No mobile number is linked to this Aadhaar. Please link your mobile at an Aadhaar Seva Kendra.',
      );
    }
    throw ApiError.badGateway('AADHAAR_SERVICE_UNAVAILABLE', 'Aadhaar verification is temporarily unavailable. Please try again later.');
  }

  unwrap(
    await supabase.from('aadhaar_verifications').upsert(
      {
        user_id: userId,
        aadhaar_hash: aadhaarHash,
        aadhaar_last4: aadhaarNumber.slice(-4),
        status: 'otp_sent',
        provider: provider.name,
        provider_reference_id: result.referenceId,
        otp_attempts: 0,
        consent_given_at: new Date().toISOString(),
        verified_name: null,
        verified_dob: null,
        verified_gender: null,
        name_matched: null,
        verified_at: null,
        failure_reason: null,
      },
      { onConflict: 'user_id' },
    ),
  );

  return {
    status: 'otp_sent',
    aadhaarMasked: maskAadhaar(aadhaarNumber.slice(-4)),
    expiresInSeconds: provider.otpValidSeconds,
  };
}

/**
 * Verifies the Aadhaar OTP. `context` is the user's name/DOB/gender used
 * for the name-match check. Returns the new status object.
 */
async function verifyOtp(userId, otp, context) {
  const row = await getRow(userId);
  if (!row || row.status !== 'otp_sent') {
    throw ApiError.badRequest('AADHAAR_OTP_NOT_REQUESTED', 'Please request an Aadhaar OTP first.');
  }
  if (row.otp_attempts >= MAX_OTP_ATTEMPTS) {
    throw ApiError.badRequest('AADHAAR_OTP_ATTEMPTS_EXCEEDED', 'Too many wrong attempts. Please request a new Aadhaar OTP.');
  }

  let result;
  try {
    result = await provider.verifyOtp(row.provider_reference_id, otp, context);
  } catch (err) {
    logger.error('Aadhaar provider verifyOtp failed', { provider: provider.name, error: err.message });
    throw ApiError.badGateway('AADHAAR_SERVICE_UNAVAILABLE', 'Aadhaar verification is temporarily unavailable. Please try again later.');
  }

  if (!result.ok) {
    if (result.reason === 'INVALID_OTP') {
      const attempts = row.otp_attempts + 1;
      const exhausted = attempts >= MAX_OTP_ATTEMPTS;
      unwrap(
        await supabase
          .from('aadhaar_verifications')
          .update({
            otp_attempts: attempts,
            ...(exhausted ? { status: 'failed', failure_reason: 'Too many incorrect OTP attempts' } : {}),
          })
          .eq('id', row.id),
      );
      throw ApiError.badRequest(
        'AADHAAR_OTP_INVALID',
        exhausted
          ? 'The OTP is incorrect. Please request a new Aadhaar OTP.'
          : `The OTP is incorrect. You have ${MAX_OTP_ATTEMPTS - attempts} attempt(s) left.`,
        { attemptsRemaining: MAX_OTP_ATTEMPTS - attempts },
      );
    }
    if (result.reason === 'OTP_EXPIRED') {
      unwrap(
        await supabase
          .from('aadhaar_verifications')
          .update({ status: 'failed', failure_reason: 'OTP expired' })
          .eq('id', row.id),
      );
      throw ApiError.badRequest('AADHAAR_OTP_EXPIRED', 'The Aadhaar OTP has expired. Please request a new one.');
    }
    throw ApiError.badGateway('AADHAAR_SERVICE_UNAVAILABLE', 'Aadhaar verification is temporarily unavailable. Please try again later.');
  }

  const { demographics } = result;
  const updated = unwrap(
    await supabase
      .from('aadhaar_verifications')
      .update({
        status: 'verified',
        verified_name: demographics.name,
        verified_dob: demographics.dateOfBirth,
        verified_gender: demographics.gender,
        name_matched: namesMatch(demographics.name, context.fullName),
        verified_at: new Date().toISOString(),
        failure_reason: null,
      })
      .eq('id', row.id)
      .select('*')
      .single(),
  );

  // Fill in DOB/gender from Aadhaar where the user has not provided them
  const profilePatch = {};
  if (!context.dateOfBirth && demographics.dateOfBirth) profilePatch.date_of_birth = demographics.dateOfBirth;
  if (!context.gender && demographics.gender) profilePatch.gender = demographics.gender;
  if (Object.keys(profilePatch).length) {
    unwrap(await supabase.from('patient_profiles').update(profilePatch).eq('user_id', userId));
  }

  return toStatus(updated);
}

module.exports = { getStatus, sendOtp, verifyOtp, namesMatch };
