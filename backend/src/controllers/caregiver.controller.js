const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');
const caregiverService = require('../services/caregiver.service');
const profileService = require('../services/profile.service');
const { audit } = require('../services/audit.service');

/** POST /dependents - register an elderly person on their behalf */
async function createDependent(req, res) {
  const dependent = await caregiverService.createDependent(req.user, req.body);
  audit({ actorId: req.user.id, subjectId: dependent.id, action: 'caregiver.dependent_created', ip: req.ip });
  const data = await profileService.getFullProfile(dependent.id);
  return sendSuccess(res, {
    status: 201,
    message: `${dependent.full_name} has been registered and added to your family members.`,
    data,
  });
}

/** GET /dependents */
async function listDependents(req, res) {
  const dependents = await caregiverService.listDependents(req.user.id);
  return sendSuccess(res, { data: { dependents } });
}

/** POST /dependents/link/send-otp - link an existing account (OTP to their phone) */
async function requestLink(req, res) {
  const data = await caregiverService.requestLink(req.user, req.body, req.ip);
  return sendSuccess(res, {
    message: 'An OTP has been sent to their mobile number. Ask them to share it with you.',
    data,
  });
}

/** POST /dependents/link/verify */
async function confirmLink(req, res) {
  const patient = await caregiverService.confirmLink(req.user, req.body);
  audit({ actorId: req.user.id, subjectId: patient.id, action: 'caregiver.linked', ip: req.ip });
  const dependents = await caregiverService.listDependents(req.user.id);
  return sendSuccess(res, {
    status: 201,
    message: `You are now a caregiver for ${patient.full_name}.`,
    data: { dependent: dependents.find((d) => d.patientId === patient.id) },
  });
}

/** DELETE /dependents/:patientId - caregiver stops managing this person */
async function removeDependent(req, res) {
  const link = await caregiverService.findActiveLink(req.user.id, req.params.patientId);
  if (!link) throw ApiError.notFound('DEPENDENT_NOT_FOUND', 'This person was not found in your dependents.');
  await caregiverService.revokeLink(link.id, { caregiverId: req.user.id });
  audit({ actorId: req.user.id, subjectId: req.params.patientId, action: 'caregiver.unlinked', ip: req.ip });
  return sendSuccess(res, { message: 'Removed from your family members.' });
}

/** GET /users/me/caregivers - who can manage my profile */
async function listMyCaregivers(req, res) {
  const caregivers = await caregiverService.listCaregivers(req.user.id);
  return sendSuccess(res, { data: { caregivers } });
}

/** DELETE /users/me/caregivers/:linkId - elderly person revokes a caregiver */
async function revokeMyCaregiver(req, res) {
  await caregiverService.revokeLink(req.params.linkId, { patientId: req.user.id });
  audit({ actorId: req.user.id, action: 'caregiver.revoked_by_patient', metadata: { linkId: req.params.linkId }, ip: req.ip });
  return sendSuccess(res, { message: 'Caregiver access removed.' });
}

module.exports = {
  createDependent,
  listDependents,
  requestLink,
  confirmLink,
  removeDependent,
  listMyCaregivers,
  revokeMyCaregiver,
};
