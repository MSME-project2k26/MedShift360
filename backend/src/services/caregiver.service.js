const supabase = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const { unwrap } = require('../utils/db');
const { maskPhone } = require('../utils/phone');
const { calculateAge, isSeniorCitizen } = require('../utils/age');
const otpService = require('./otp.service');
const userService = require('./user.service');
const { toDbProfile } = require('./profile.service');

async function findActiveLink(caregiverId, patientId) {
  return unwrap(
    await supabase
      .from('caregiver_links')
      .select('*')
      .eq('caregiver_id', caregiverId)
      .eq('patient_id', patientId)
      .eq('status', 'active')
      .maybeSingle(),
  );
}

async function insertLink(caregiverId, patientId, relationship) {
  return unwrap(
    await supabase
      .from('caregiver_links')
      .insert({ caregiver_id: caregiverId, patient_id: patientId, relationship })
      .select('*')
      .single(),
  );
}

/**
 * Assisted registration: a caregiver creates an account for an elderly
 * person who may have no phone or email of their own.
 */
async function createDependent(caregiver, input) {
  if (input.phone) {
    if (input.phone === caregiver.phone) {
      throw ApiError.badRequest('INVALID_PHONE', 'Please enter the elderly person\'s own number, or leave it empty.');
    }
    if (await userService.findByPhone(input.phone)) {
      throw ApiError.conflict(
        'PHONE_ALREADY_REGISTERED',
        'This mobile number already has an account. Use "Link existing account" instead.',
      );
    }
  }

  const dependent = await userService.createUser({
    full_name: input.fullName,
    phone: input.phone || null,
    role: 'patient',
    account_type: 'managed',
    created_by: caregiver.id,
  });

  try {
    const profileRow = toDbProfile(input);
    if (Object.keys(profileRow).length) {
      unwrap(await supabase.from('patient_profiles').update(profileRow).eq('user_id', dependent.id));
    }
    await insertLink(caregiver.id, dependent.id, input.relationship);
  } catch (err) {
    // Roll back the half-created account
    await supabase.from('users').delete().eq('id', dependent.id);
    throw err;
  }

  return dependent;
}

/** Step 1 of linking an existing account: OTP goes to the elderly person's phone. */
async function requestLink(caregiver, { phone }, ip) {
  const patient = await userService.findByPhone(phone);
  if (!patient || patient.status !== 'active') {
    throw ApiError.notFound('PHONE_NOT_REGISTERED', 'No MedShift360 account is registered with this mobile number.');
  }
  if (patient.id === caregiver.id) {
    throw ApiError.badRequest('INVALID_PHONE', 'You cannot add yourself as a dependent.');
  }
  if (await findActiveLink(caregiver.id, patient.id)) {
    throw ApiError.conflict('CAREGIVER_LINK_EXISTS', 'You are already a caregiver for this person.');
  }

  return otpService.issueOtp({
    target: phone,
    channel: 'sms',
    purpose: 'caregiver_link',
    requestedBy: caregiver.id,
    ip,
    customMessage: (code, minutes) =>
      `${caregiver.full_name} wants to help manage your MedShift360 health profile. ` +
      `If you agree, share OTP ${code} with them. Valid for ${minutes} minutes. Ignore this message if you do not know them.`,
  });
}

/** Step 2: caregiver enters the OTP the elderly person shared with them. */
async function confirmLink(caregiver, { phone, otp, relationship }) {
  await otpService.verifyOtp({ target: phone, purpose: 'caregiver_link', code: otp, requestedBy: caregiver.id });
  const patient = await userService.findByPhone(phone);
  if (!patient || patient.status !== 'active') {
    throw ApiError.notFound('PHONE_NOT_REGISTERED', 'No MedShift360 account is registered with this mobile number.');
  }
  await insertLink(caregiver.id, patient.id, relationship);
  return patient;
}

async function listDependents(caregiverId) {
  const links = unwrap(
    await supabase
      .from('caregiver_links')
      .select('id, patient_id, relationship, can_manage_profile, can_book_on_behalf, created_at')
      .eq('caregiver_id', caregiverId)
      .eq('status', 'active')
      .order('created_at', { ascending: true }),
  );
  if (!links.length) return [];

  const ids = links.map((l) => l.patient_id);
  const [users, profiles] = await Promise.all([
    supabase.from('users').select('id, full_name, phone, account_type').in('id', ids).then(unwrap),
    supabase.from('patient_profiles').select('user_id, date_of_birth, gender, blood_group').in('user_id', ids).then(unwrap),
  ]);
  const userById = Object.fromEntries(users.map((u) => [u.id, u]));
  const profileById = Object.fromEntries(profiles.map((p) => [p.user_id, p]));

  return links.map((link) => {
    const u = userById[link.patient_id] || {};
    const p = profileById[link.patient_id] || {};
    return {
      linkId: link.id,
      patientId: link.patient_id,
      fullName: u.full_name,
      phone: u.phone,
      accountType: u.account_type,
      relationship: link.relationship,
      age: calculateAge(p.date_of_birth),
      isSeniorCitizen: isSeniorCitizen(p.date_of_birth),
      gender: p.gender ?? null,
      bloodGroup: p.blood_group ?? null,
      permissions: { canManageProfile: link.can_manage_profile, canBookOnBehalf: link.can_book_on_behalf },
      linkedAt: link.created_at,
    };
  });
}

async function listCaregivers(patientId) {
  const links = unwrap(
    await supabase
      .from('caregiver_links')
      .select('id, caregiver_id, relationship, created_at')
      .eq('patient_id', patientId)
      .eq('status', 'active'),
  );
  if (!links.length) return [];
  const users = unwrap(
    await supabase.from('users').select('id, full_name, phone').in('id', links.map((l) => l.caregiver_id)),
  );
  const byId = Object.fromEntries(users.map((u) => [u.id, u]));
  return links.map((l) => ({
    linkId: l.id,
    caregiverId: l.caregiver_id,
    fullName: byId[l.caregiver_id]?.full_name ?? null,
    phone: maskPhone(byId[l.caregiver_id]?.phone),
    relationship: l.relationship,
    linkedAt: l.created_at,
  }));
}

async function revokeLink(linkId, { caregiverId, patientId }) {
  let query = supabase
    .from('caregiver_links')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('id', linkId)
    .eq('status', 'active');
  if (caregiverId) query = query.eq('caregiver_id', caregiverId);
  if (patientId) query = query.eq('patient_id', patientId);
  const rows = unwrap(await query.select('id'));
  if (!rows.length) throw ApiError.notFound('CAREGIVER_LINK_NOT_FOUND', 'Caregiver link not found.');
}

module.exports = {
  findActiveLink,
  createDependent,
  requestLink,
  confirmLink,
  listDependents,
  listCaregivers,
  revokeLink,
};
