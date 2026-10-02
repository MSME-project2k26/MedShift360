const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const { unwrap } = require('../utils/db');
const { sendSuccess } = require('../utils/response');
const { clientMeta } = require('../middleware/requestContext');
const userService = require('../services/user.service');
const tokenService = require('../services/token.service');
const otpService = require('../services/otp.service');
const aadhaarService = require('../services/aadhaar/aadhaar.service');
const { audit } = require('../services/audit.service');

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
// Used to keep response time constant when the email does not exist
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', BCRYPT_ROUNDS);

function nextSteps(user, { aadhaarVerified = false } = {}) {
  const steps = [];
  if (user.email && !user.email_verified) steps.push('verify_email');
  if (user.phone && !user.phone_verified) steps.push('verify_phone');
  if (!aadhaarVerified) steps.push('verify_aadhaar');
  steps.push('complete_profile');
  return steps;
}

async function savePatientBasics(userId, { dateOfBirth, gender }) {
  const patch = {};
  if (dateOfBirth) patch.date_of_birth = dateOfBirth;
  if (gender) patch.gender = gender;
  if (Object.keys(patch).length) {
    unwrap(await supabase.from('patient_profiles').update(patch).eq('user_id', userId));
  }
}

function assertCanLogin(user) {
  if (user.status === 'suspended') {
    throw ApiError.forbidden('ACCOUNT_SUSPENDED', 'Your account has been suspended. Please contact support.');
  }
  if (user.status !== 'active') {
    throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Incorrect email or password.');
  }
}

async function completeLogin(req, user, method) {
  const updated = await userService.updateUser(user.id, {
    last_login_at: new Date().toISOString(),
    failed_login_attempts: 0,
    locked_until: null,
  });
  const tokens = await tokenService.createSession(updated, clientMeta(req));
  const aadhaar = await aadhaarService.getStatus(user.id);
  audit({ actorId: user.id, action: 'auth.login', metadata: { method }, ip: req.ip });
  return { user: userService.toPublicUser(updated), tokens, aadhaar, nextSteps: nextSteps(updated, { aadhaarVerified: aadhaar.isVerified }) };
}

// ---------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------

/** POST /auth/register/email */
async function registerWithEmail(req, res) {
  const { fullName, email, password, phone, dateOfBirth, gender } = req.body;

  if (await userService.findByEmail(email)) {
    throw ApiError.conflict('EMAIL_ALREADY_REGISTERED', 'This email address is already registered. Please log in.');
  }
  if (phone && (await userService.findByPhone(phone))) {
    throw ApiError.conflict('PHONE_ALREADY_REGISTERED', 'This mobile number is already registered. Please log in with OTP.');
  }

  const user = await userService.createUser({
    full_name: fullName,
    email,
    phone: phone || null,
    password_hash: await bcrypt.hash(password, BCRYPT_ROUNDS),
    role: 'patient',
  });
  await savePatientBasics(user.id, { dateOfBirth, gender });

  // Registration still succeeds if the verification email cannot be sent;
  // the user can request it again from the app.
  let emailVerification;
  try {
    emailVerification = await otpService.issueOtp({
      target: email,
      channel: 'email',
      purpose: 'verify_email',
      requestedBy: user.id,
      ip: req.ip,
    });
  } catch (err) {
    emailVerification = { sent: false, reason: err.code || 'EMAIL_DELIVERY_FAILED' };
  }

  const tokens = await tokenService.createSession(user, clientMeta(req));
  audit({ actorId: user.id, action: 'auth.register', metadata: { method: 'email' }, ip: req.ip });

  return sendSuccess(res, {
    status: 201,
    message: 'Registration successful. Please verify your email with the OTP we sent.',
    data: { user: userService.toPublicUser(user), tokens, emailVerification, nextSteps: nextSteps(user) },
  });
}

/** POST /auth/register/phone/send-otp */
async function registerPhoneSendOtp(req, res) {
  const { phone } = req.body;
  if (await userService.findByPhone(phone)) {
    throw ApiError.conflict('PHONE_ALREADY_REGISTERED', 'This mobile number is already registered. Please log in with OTP.');
  }
  const otp = await otpService.issueOtp({ target: phone, channel: 'sms', purpose: 'register', ip: req.ip });
  return sendSuccess(res, { message: 'OTP sent to your mobile number.', data: otp });
}

/** POST /auth/register/phone/verify */
async function registerPhoneVerify(req, res) {
  const { phone, otp, fullName, email, password, dateOfBirth, gender } = req.body;

  // Check everything we can before consuming the OTP, so a typo in the
  // email does not force the user to request a fresh OTP.
  if (await userService.findByPhone(phone)) {
    throw ApiError.conflict('PHONE_ALREADY_REGISTERED', 'This mobile number is already registered. Please log in with OTP.');
  }
  if (email && (await userService.findByEmail(email))) {
    throw ApiError.conflict('EMAIL_ALREADY_REGISTERED', 'This email address is already registered.');
  }

  await otpService.verifyOtp({ target: phone, purpose: 'register', code: otp });

  const user = await userService.createUser({
    full_name: fullName,
    phone,
    phone_verified: true,
    email: email || null,
    password_hash: password ? await bcrypt.hash(password, BCRYPT_ROUNDS) : null,
    role: 'patient',
  });
  await savePatientBasics(user.id, { dateOfBirth, gender });

  const tokens = await tokenService.createSession(user, clientMeta(req));
  audit({ actorId: user.id, action: 'auth.register', metadata: { method: 'phone' }, ip: req.ip });

  return sendSuccess(res, {
    status: 201,
    message: 'Registration successful.',
    data: { user: userService.toPublicUser(user), tokens, nextSteps: nextSteps(user) },
  });
}

// ---------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------

/** POST /auth/login/email */
async function loginWithEmail(req, res) {
  const { email, password } = req.body;
  const user = await userService.findByEmail(email);
  const invalid = ApiError.unauthorized('INVALID_CREDENTIALS', 'Incorrect email or password.');

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw invalid;
  }
  assertCanLogin(user);

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const retryAfterSeconds = Math.ceil((new Date(user.locked_until) - Date.now()) / 1000);
    throw ApiError.locked(
      'ACCOUNT_LOCKED',
      `Too many wrong attempts. Please try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s), or log in with mobile OTP.`,
      { retryAfterSeconds },
    );
  }

  if (!user.password_hash) {
    throw ApiError.badRequest(
      'PASSWORD_NOT_SET',
      'This account does not have a password. Please log in with mobile OTP or use "Forgot password".',
    );
  }

  if (!(await bcrypt.compare(password, user.password_hash))) {
    const attempts = user.failed_login_attempts + 1;
    const lock = attempts >= MAX_FAILED_LOGINS;
    await userService.updateUser(user.id, {
      failed_login_attempts: lock ? 0 : attempts,
      locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString() : null,
    });
    if (lock) {
      audit({ actorId: user.id, action: 'auth.account_locked', ip: req.ip });
      throw ApiError.locked(
        'ACCOUNT_LOCKED',
        `Too many wrong attempts. Your account is locked for ${LOCK_MINUTES} minutes. You can still log in with mobile OTP.`,
        { retryAfterSeconds: LOCK_MINUTES * 60 },
      );
    }
    throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Incorrect email or password.', {
      attemptsRemaining: MAX_FAILED_LOGINS - attempts,
    });
  }

  const data = await completeLogin(req, user, 'email_password');
  return sendSuccess(res, { message: 'Login successful.', data });
}

/** POST /auth/login/phone/send-otp */
async function loginPhoneSendOtp(req, res) {
  const { phone } = req.body;
  const user = await userService.findByPhone(phone);
  if (!user || user.status === 'deleted') {
    throw ApiError.notFound('PHONE_NOT_REGISTERED', 'This mobile number is not registered. Please register first.');
  }
  assertCanLogin(user);
  const otp = await otpService.issueOtp({ target: phone, channel: 'sms', purpose: 'login', ip: req.ip });
  return sendSuccess(res, { message: 'OTP sent to your mobile number.', data: otp });
}

/** POST /auth/login/phone/verify */
async function loginPhoneVerify(req, res) {
  const { phone, otp } = req.body;
  await otpService.verifyOtp({ target: phone, purpose: 'login', code: otp });

  const user = await userService.findByPhone(phone);
  if (!user) throw ApiError.notFound('PHONE_NOT_REGISTERED', 'This mobile number is not registered. Please register first.');
  assertCanLogin(user);

  // Logging in with an OTP proves the phone belongs to the user
  if (!user.phone_verified) await userService.updateUser(user.id, { phone_verified: true });

  const data = await completeLogin(req, { ...user, phone_verified: true }, 'phone_otp');
  return sendSuccess(res, { message: 'Login successful.', data });
}

// ---------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------

/** POST /auth/token/refresh */
async function refreshToken(req, res) {
  const tokens = await tokenService.rotateSession(req.body.refreshToken, clientMeta(req));
  return sendSuccess(res, { message: 'Token refreshed.', data: { tokens } });
}

/** POST /auth/logout */
async function logout(req, res) {
  await tokenService.revokeSessionByToken(req.body.refreshToken);
  return sendSuccess(res, { message: 'Logged out.' });
}

/** POST /auth/logout-all  (authenticated) */
async function logoutAll(req, res) {
  await tokenService.revokeAllSessions(req.user.id);
  audit({ actorId: req.user.id, action: 'auth.logout_all', ip: req.ip });
  return sendSuccess(res, { message: 'Logged out from all devices.' });
}

/** GET /auth/me  (authenticated) */
async function me(req, res) {
  const aadhaar = await aadhaarService.getStatus(req.user.id);
  return sendSuccess(res, {
    data: {
      user: userService.toPublicUser(req.user),
      aadhaar,
      nextSteps: nextSteps(req.user, { aadhaarVerified: aadhaar.isVerified }),
    },
  });
}

// ---------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------

/** POST /auth/password/forgot */
async function forgotPassword(req, res) {
  const { email, phone } = req.body;
  const user = email ? await userService.findByEmail(email) : await userService.findByPhone(phone);

  let data = null;
  // Same response whether or not the account exists, so this endpoint
  // cannot be used to discover registered emails/numbers.
  if (user && user.status === 'active') {
    data = await otpService.issueOtp({
      target: email || phone,
      channel: email ? 'email' : 'sms',
      purpose: 'reset_password',
      ip: req.ip,
    });
  }
  return sendSuccess(res, {
    message: 'If an account exists, an OTP has been sent to reset your password.',
    data,
  });
}

/** POST /auth/password/reset */
async function resetPassword(req, res) {
  const { email, phone, otp, newPassword } = req.body;
  const target = email || phone;
  await otpService.verifyOtp({ target, purpose: 'reset_password', code: otp });

  const user = email ? await userService.findByEmail(email) : await userService.findByPhone(phone);
  if (!user || user.status !== 'active') {
    throw ApiError.badRequest('OTP_EXPIRED', 'This OTP has expired or was not requested. Please request a new OTP.');
  }

  await userService.updateUser(user.id, {
    password_hash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS),
    failed_login_attempts: 0,
    locked_until: null,
    ...(email ? { email_verified: true } : { phone_verified: true }),
  });
  await tokenService.revokeAllSessions(user.id);
  audit({ actorId: user.id, action: 'auth.password_reset', ip: req.ip });

  return sendSuccess(res, { message: 'Password reset successful. Please log in with your new password.' });
}

/** POST /auth/password/change  (authenticated) - also lets OTP-only users set a password */
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const user = req.user;

  if (user.password_hash) {
    if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password_hash))) {
      throw ApiError.badRequest('INVALID_CURRENT_PASSWORD', 'Your current password is incorrect.');
    }
  }

  await userService.updateUser(user.id, { password_hash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) });
  await tokenService.revokeAllSessions(user.id, { exceptSessionId: req.sessionId });
  audit({ actorId: user.id, action: user.password_hash ? 'auth.password_changed' : 'auth.password_set', ip: req.ip });

  return sendSuccess(res, {
    message: user.password_hash ? 'Password changed. Other devices have been logged out.' : 'Password set successfully.',
  });
}

// ---------------------------------------------------------------------
// Verify / add email and phone (authenticated)
// ---------------------------------------------------------------------

function resolveContactTarget(current, provided, kind) {
  const target = provided || current;
  if (!target) {
    throw ApiError.badRequest(`${kind.toUpperCase()}_REQUIRED`, `Please provide the ${kind} to verify.`);
  }
  return target;
}

/** POST /auth/verify/email/send */
async function sendEmailVerification(req, res) {
  const email = resolveContactTarget(req.user.email, req.body.email, 'email');
  if (email === req.user.email && req.user.email_verified) {
    throw ApiError.conflict('EMAIL_ALREADY_VERIFIED', 'Your email is already verified.');
  }
  if (email !== req.user.email && (await userService.findByEmail(email))) {
    throw ApiError.conflict('EMAIL_ALREADY_REGISTERED', 'This email address is already registered.');
  }
  const otp = await otpService.issueOtp({
    target: email,
    channel: 'email',
    purpose: 'verify_email',
    requestedBy: req.user.id,
    ip: req.ip,
  });
  return sendSuccess(res, { message: 'Verification code sent to your email.', data: otp });
}

/** POST /auth/verify/email/confirm */
async function confirmEmailVerification(req, res) {
  const email = resolveContactTarget(req.user.email, req.body.email, 'email');
  await otpService.verifyOtp({ target: email, purpose: 'verify_email', code: req.body.otp, requestedBy: req.user.id });
  const user = await userService.updateUser(req.user.id, { email, email_verified: true });
  audit({ actorId: user.id, action: 'auth.email_verified', ip: req.ip });
  return sendSuccess(res, { message: 'Email verified.', data: { user: userService.toPublicUser(user) } });
}

/** POST /auth/verify/phone/send */
async function sendPhoneVerification(req, res) {
  const phone = resolveContactTarget(req.user.phone, req.body.phone, 'phone');
  if (phone === req.user.phone && req.user.phone_verified) {
    throw ApiError.conflict('PHONE_ALREADY_VERIFIED', 'Your mobile number is already verified.');
  }
  if (phone !== req.user.phone && (await userService.findByPhone(phone))) {
    throw ApiError.conflict('PHONE_ALREADY_REGISTERED', 'This mobile number is already registered.');
  }
  const otp = await otpService.issueOtp({
    target: phone,
    channel: 'sms',
    purpose: 'verify_phone',
    requestedBy: req.user.id,
    ip: req.ip,
  });
  return sendSuccess(res, { message: 'OTP sent to your mobile number.', data: otp });
}

/** POST /auth/verify/phone/confirm */
async function confirmPhoneVerification(req, res) {
  const phone = resolveContactTarget(req.user.phone, req.body.phone, 'phone');
  await otpService.verifyOtp({ target: phone, purpose: 'verify_phone', code: req.body.otp, requestedBy: req.user.id });
  const user = await userService.updateUser(req.user.id, { phone, phone_verified: true });
  audit({ actorId: user.id, action: 'auth.phone_verified', ip: req.ip });
  return sendSuccess(res, { message: 'Mobile number verified.', data: { user: userService.toPublicUser(user) } });
}

module.exports = {
  registerWithEmail,
  registerPhoneSendOtp,
  registerPhoneVerify,
  loginWithEmail,
  loginPhoneSendOtp,
  loginPhoneVerify,
  refreshToken,
  logout,
  logoutAll,
  me,
  forgotPassword,
  resetPassword,
  changePassword,
  sendEmailVerification,
  confirmEmailVerification,
  sendPhoneVerification,
  confirmPhoneVerification,
};
