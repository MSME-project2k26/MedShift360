const supabase = require('../config/supabase');
const { unwrap } = require('../utils/db');
const { sendSuccess } = require('../utils/response');
const profileService = require('../services/profile.service');
const userService = require('../services/user.service');
const aadhaarService = require('../services/aadhaar/aadhaar.service');
const emergencyContactService = require('../services/emergencyContact.service');
const tokenService = require('../services/token.service');
const { audit } = require('../services/audit.service');

// All handlers act on req.subjectId: the logged-in user for /users/me/*,
// or an elderly dependent for /dependents/:patientId/*.

/** GET  .../profile */
async function getProfile(req, res) {
  const data = await profileService.getFullProfile(req.subjectId);
  return sendSuccess(res, { data });
}

/** PATCH .../profile */
async function updateProfile(req, res) {
  const data = await profileService.updateProfile(req.subjectId, req.body);
  audit({
    actorId: req.user.id,
    subjectId: req.subjectId,
    action: 'profile.updated',
    metadata: { fields: Object.keys(req.body) },
    ip: req.ip,
  });
  return sendSuccess(res, { message: 'Profile updated.', data });
}

/** GET .../medical-summary */
async function getMedicalSummary(req, res) {
  const data = await profileService.getMedicalSummary(req.subjectId);
  return sendSuccess(res, { data });
}

// ---------------- Aadhaar ----------------

/** GET .../aadhaar */
async function getAadhaarStatus(req, res) {
  const data = await aadhaarService.getStatus(req.subjectId);
  return sendSuccess(res, { data });
}

/** POST .../aadhaar/send-otp */
async function sendAadhaarOtp(req, res) {
  const data = await aadhaarService.sendOtp(req.subjectId, req.body.aadhaarNumber);
  audit({ actorId: req.user.id, subjectId: req.subjectId, action: 'aadhaar.otp_requested', ip: req.ip });
  return sendSuccess(res, {
    message: 'OTP sent to the mobile number linked with this Aadhaar.',
    data,
  });
}

/** POST .../aadhaar/verify-otp */
async function verifyAadhaarOtp(req, res) {
  const [subject, profile] = await Promise.all([
    userService.findById(req.subjectId),
    unwrap(
      await supabase.from('patient_profiles').select('date_of_birth, gender').eq('user_id', req.subjectId).maybeSingle(),
    ),
  ]);
  const data = await aadhaarService.verifyOtp(req.subjectId, req.body.otp, {
    fullName: subject.full_name,
    dateOfBirth: profile?.date_of_birth,
    gender: profile?.gender,
  });
  audit({
    actorId: req.user.id,
    subjectId: req.subjectId,
    action: 'aadhaar.verified',
    metadata: { nameMatched: data.nameMatched },
    ip: req.ip,
  });
  return sendSuccess(res, {
    message: data.nameMatched
      ? 'Aadhaar verified successfully.'
      : 'Aadhaar verified. The name on Aadhaar is different from your profile name - please check your profile.',
    data,
  });
}

// ---------------- Emergency contacts ----------------

/** GET .../emergency-contacts */
async function listEmergencyContacts(req, res) {
  const contacts = await emergencyContactService.list(req.subjectId);
  return sendSuccess(res, { data: { contacts, maxContacts: emergencyContactService.MAX_CONTACTS } });
}

/** POST .../emergency-contacts */
async function createEmergencyContact(req, res) {
  const subject = await userService.findById(req.subjectId);
  const contact = await emergencyContactService.create(req.subjectId, req.body, subject.phone);
  audit({ actorId: req.user.id, subjectId: req.subjectId, action: 'emergency_contact.created', ip: req.ip });
  return sendSuccess(res, { status: 201, message: 'Emergency contact added.', data: { contact } });
}

/** PATCH .../emergency-contacts/:contactId */
async function updateEmergencyContact(req, res) {
  const contact = await emergencyContactService.update(req.subjectId, req.params.contactId, req.body);
  audit({ actorId: req.user.id, subjectId: req.subjectId, action: 'emergency_contact.updated', ip: req.ip });
  return sendSuccess(res, { message: 'Emergency contact updated.', data: { contact } });
}

/** DELETE .../emergency-contacts/:contactId */
async function deleteEmergencyContact(req, res) {
  await emergencyContactService.remove(req.subjectId, req.params.contactId);
  audit({ actorId: req.user.id, subjectId: req.subjectId, action: 'emergency_contact.deleted', ip: req.ip });
  return sendSuccess(res, { message: 'Emergency contact removed.' });
}

// ---------------- Account deletion (self only) ----------------

/**
 * DELETE /users/me
 * Right to erasure (DPDP Act 2023): personal data is removed and the user
 * row is anonymised so that future records (bookings, admissions) keep a
 * valid reference.
 */
async function deleteAccount(req, res) {
  const userId = req.user.id;
  await tokenService.revokeAllSessions(userId);

  const now = new Date().toISOString();
  await Promise.all([
    supabase.from('aadhaar_verifications').delete().eq('user_id', userId).then(unwrap),
    supabase.from('emergency_contacts').delete().eq('user_id', userId).then(unwrap),
    supabase.from('patient_profiles').delete().eq('user_id', userId).then(unwrap),
    supabase
      .from('caregiver_links')
      .update({ status: 'revoked', revoked_at: now })
      .or(`caregiver_id.eq.${userId},patient_id.eq.${userId}`)
      .eq('status', 'active')
      .then(unwrap),
  ]);

  await userService.updateUser(userId, {
    full_name: 'Deleted User',
    email: null,
    phone: null,
    password_hash: null,
    email_verified: false,
    phone_verified: false,
    status: 'deleted',
    deleted_at: now,
  });
  audit({ actorId: userId, action: 'account.deleted', ip: req.ip });

  return sendSuccess(res, { message: 'Your account and personal data have been deleted.' });
}

module.exports = {
  getProfile,
  updateProfile,
  getMedicalSummary,
  getAadhaarStatus,
  sendAadhaarOtp,
  verifyAadhaarOtp,
  listEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  deleteAccount,
};
