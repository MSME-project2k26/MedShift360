const env = require('../config/env');
const supabase = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const { unwrap } = require('../utils/db');
const { hmac, generateNumericCode, safeEqual } = require('../utils/crypto');
const { maskPhone, maskEmail } = require('../utils/phone');
const { sendSms, sendEmail } = require('./notification.service');

const PURPOSE_TEXT = {
  register: 'to register on MedShift360',
  login: 'to log in to MedShift360',
  verify_phone: 'to verify your mobile number on MedShift360',
  verify_email: 'to verify your email on MedShift360',
  reset_password: 'to reset your MedShift360 password',
  caregiver_link: 'to approve a caregiver on MedShift360',
};

function hashCode(target, purpose, code) {
  return hmac(env.OTP_SECRET, `${target}:${purpose}:${code}`);
}

function buildMessage({ code, purpose, minutes, customMessage }) {
  if (customMessage) return customMessage(code, minutes);
  return `${code} is your OTP ${PURPOSE_TEXT[purpose]}. It is valid for ${minutes} minutes. Do not share it with anyone.`;
}

/**
 * Creates and delivers a one-time password.
 * Enforces a resend cooldown and an hourly cap per phone/email + purpose.
 */
async function issueOtp({ target, channel, purpose, requestedBy = null, ip = null, customMessage }) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recent = unwrap(
    await supabase
      .from('otp_codes')
      .select('created_at')
      .eq('target', target)
      .eq('purpose', purpose)
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false }),
  );

  if (recent.length >= env.OTP_MAX_PER_HOUR) {
    throw ApiError.tooMany('OTP_LIMIT_REACHED', 'You have requested too many OTPs. Please try again after an hour.');
  }
  if (recent.length) {
    const secondsSinceLast = (Date.now() - new Date(recent[0].created_at).getTime()) / 1000;
    if (secondsSinceLast < env.OTP_RESEND_COOLDOWN_SECONDS) {
      const retryAfterSeconds = Math.ceil(env.OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLast);
      throw ApiError.tooMany('OTP_COOLDOWN', `Please wait ${retryAfterSeconds} seconds before requesting a new OTP.`, {
        retryAfterSeconds,
      });
    }
  }

  // Only the newest OTP for a target + purpose is valid
  const now = new Date().toISOString();
  unwrap(
    await supabase
      .from('otp_codes')
      .update({ consumed_at: now })
      .eq('target', target)
      .eq('purpose', purpose)
      .is('consumed_at', null),
  );

  const code = generateNumericCode(6);
  const row = unwrap(
    await supabase
      .from('otp_codes')
      .insert({
        target,
        channel,
        purpose,
        code_hash: hashCode(target, purpose, code),
        expires_at: new Date(Date.now() + env.OTP_TTL_SECONDS * 1000).toISOString(),
        requested_by: requestedBy,
        ip_address: ip,
      })
      .select('id')
      .single(),
  );

  const minutes = Math.round(env.OTP_TTL_SECONDS / 60);
  const message = buildMessage({ code, purpose, minutes, customMessage });
  try {
    if (channel === 'sms') await sendSms(target, message);
    else await sendEmail({ to: target, subject: 'Your MedShift360 verification code', text: message });
  } catch (err) {
    // Undelivered OTP must not count as valid
    await supabase.from('otp_codes').update({ consumed_at: new Date().toISOString() }).eq('id', row.id);
    throw err;
  }

  return {
    sentTo: channel === 'sms' ? maskPhone(target) : maskEmail(target),
    channel,
    expiresInSeconds: env.OTP_TTL_SECONDS,
    resendAfterSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
    ...(env.echoOtp ? { devOtp: code } : {}),
  };
}

/**
 * Verifies and consumes an OTP. Throws ApiError if missing, expired,
 * wrong or out of attempts.
 */
async function verifyOtp({ target, purpose, code, requestedBy = null }) {
  const otp = unwrap(
    await supabase
      .from('otp_codes')
      .select('*')
      .eq('target', target)
      .eq('purpose', purpose)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  );

  const expiredError = ApiError.badRequest(
    'OTP_EXPIRED',
    'This OTP has expired or was not requested. Please request a new OTP.',
  );
  if (!otp || new Date(otp.expires_at) < new Date()) throw expiredError;
  if (requestedBy && otp.requested_by !== requestedBy) throw expiredError;

  if (otp.attempts >= otp.max_attempts) {
    throw ApiError.badRequest('OTP_ATTEMPTS_EXCEEDED', 'Too many wrong attempts. Please request a new OTP.');
  }

  if (!safeEqual(hashCode(target, purpose, code), otp.code_hash)) {
    const attempts = otp.attempts + 1;
    await supabase.from('otp_codes').update({ attempts }).eq('id', otp.id);
    const attemptsRemaining = Math.max(otp.max_attempts - attempts, 0);
    throw ApiError.badRequest(
      'OTP_INVALID',
      attemptsRemaining
        ? `The OTP is incorrect. You have ${attemptsRemaining} attempt(s) left.`
        : 'The OTP is incorrect. Please request a new OTP.',
      { attemptsRemaining },
    );
  }

  // Conditional update makes the OTP single-use even under concurrent requests
  const consumed = unwrap(
    await supabase
      .from('otp_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', otp.id)
      .is('consumed_at', null)
      .select('id'),
  );
  if (!consumed.length) throw expiredError;
}

module.exports = { issueOtp, verifyOtp };
