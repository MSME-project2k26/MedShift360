const supabase = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const { unwrap } = require('../utils/db');
const { calculateAge, isSeniorCitizen } = require('../utils/age');
const userService = require('./user.service');
const aadhaarService = require('./aadhaar/aadhaar.service');
const emergencyContactService = require('./emergencyContact.service');

// API field (camelCase) -> database column (snake_case)
const PROFILE_FIELDS = {
  dateOfBirth: 'date_of_birth',
  gender: 'gender',
  bloodGroup: 'blood_group',
  heightCm: 'height_cm',
  weightKg: 'weight_kg',
  addressLine1: 'address_line1',
  addressLine2: 'address_line2',
  city: 'city',
  district: 'district',
  state: 'state',
  pincode: 'pincode',
  homeLatitude: 'home_latitude',
  homeLongitude: 'home_longitude',
  chronicConditions: 'chronic_conditions',
  allergies: 'allergies',
  currentMedications: 'current_medications',
  disabilities: 'disabilities',
  mobilityAid: 'mobility_aid',
  hearingImpaired: 'hearing_impaired',
  visionImpaired: 'vision_impaired',
  livesAlone: 'lives_alone',
  abhaNumber: 'abha_number',
  pmjayId: 'pmjay_id',
  insuranceProvider: 'insurance_provider',
  insurancePolicyNumber: 'insurance_policy_number',
  preferredLanguage: 'preferred_language',
  preferredContactMethod: 'preferred_contact_method',
  largeTextMode: 'large_text_mode',
  voiceAssistance: 'voice_assistance',
};

// Fields that count towards "profile completion" (shown as a progress bar)
const COMPLETION_FIELDS = [
  'dateOfBirth',
  'gender',
  'bloodGroup',
  'addressLine1',
  'city',
  'state',
  'pincode',
  'chronicConditions',
  'allergies',
];

function toDbProfile(input) {
  const row = {};
  for (const [apiKey, column] of Object.entries(PROFILE_FIELDS)) {
    if (input[apiKey] !== undefined) row[column] = input[apiKey];
  }
  return row;
}

function fromDbProfile(row) {
  const out = {};
  for (const [apiKey, column] of Object.entries(PROFILE_FIELDS)) {
    out[apiKey] = row[column] ?? null;
  }
  // numeric columns come back from PostgREST as numbers or strings depending on precision
  if (out.heightCm !== null) out.heightCm = Number(out.heightCm);
  if (out.weightKg !== null) out.weightKg = Number(out.weightKg);
  return out;
}

function completion(profile, hasEmergencyContact, aadhaarVerified) {
  const missing = COMPLETION_FIELDS.filter((key) => {
    const value = profile[key];
    return value === null || value === '' || (Array.isArray(value) && value.length === 0);
  });
  if (!hasEmergencyContact) missing.push('emergencyContacts');
  if (!aadhaarVerified) missing.push('aadhaarVerification');
  const total = COMPLETION_FIELDS.length + 2;
  return { percentage: Math.round(((total - missing.length) / total) * 100), missingFields: missing };
}

async function getProfileRow(userId) {
  const row = unwrap(await supabase.from('patient_profiles').select('*').eq('user_id', userId).maybeSingle());
  if (!row) throw ApiError.notFound('PROFILE_NOT_FOUND', 'Patient profile not found.');
  return row;
}

/** Full profile used by the profile screen. */
async function getFullProfile(userId) {
  const [user, row, aadhaar, contacts] = await Promise.all([
    userService.findById(userId),
    getProfileRow(userId),
    aadhaarService.getStatus(userId),
    emergencyContactService.list(userId),
  ]);
  if (!user) throw ApiError.notFound('USER_NOT_FOUND', 'User not found.');

  const profile = fromDbProfile(row);
  return {
    user: userService.toPublicUser(user),
    profile: {
      ...profile,
      age: calculateAge(profile.dateOfBirth),
      isSeniorCitizen: isSeniorCitizen(profile.dateOfBirth),
      updatedAt: row.updated_at,
    },
    aadhaar,
    emergencyContacts: contacts,
    profileCompletion: completion(profile, contacts.length > 0, aadhaar.isVerified),
  };
}

async function updateProfile(userId, input) {
  const { fullName, ...profileInput } = input;
  if (fullName !== undefined) {
    await userService.updateUser(userId, { full_name: fullName });
  }
  const row = toDbProfile(profileInput);
  if (Object.keys(row).length) {
    unwrap(await supabase.from('patient_profiles').update(row).eq('user_id', userId));
  }
  return getFullProfile(userId);
}

/**
 * Compact emergency medical card - what a paramedic or hospital needs in
 * the first minutes. Can be rendered as a printable card or QR code.
 */
async function getMedicalSummary(userId) {
  const [user, row, aadhaar, contacts] = await Promise.all([
    userService.findById(userId),
    getProfileRow(userId),
    aadhaarService.getStatus(userId),
    emergencyContactService.list(userId),
  ]);
  const p = fromDbProfile(row);
  const primary = contacts.find((c) => c.isPrimary) || contacts[0] || null;

  return {
    patientId: user.id,
    fullName: user.full_name,
    age: calculateAge(p.dateOfBirth),
    gender: p.gender,
    isSeniorCitizen: isSeniorCitizen(p.dateOfBirth),
    bloodGroup: p.bloodGroup,
    chronicConditions: p.chronicConditions,
    allergies: p.allergies,
    currentMedications: p.currentMedications,
    mobilityAid: p.mobilityAid,
    hearingImpaired: p.hearingImpaired,
    visionImpaired: p.visionImpaired,
    livesAlone: p.livesAlone,
    preferredLanguage: p.preferredLanguage,
    identityVerified: aadhaar.isVerified,
    insurance: {
      abhaNumber: p.abhaNumber,
      pmjayId: p.pmjayId,
      provider: p.insuranceProvider,
      policyNumber: p.insurancePolicyNumber,
    },
    primaryEmergencyContact: primary
      ? { name: primary.name, relationship: primary.relationship, phone: primary.phone }
      : null,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { getFullProfile, updateProfile, getMedicalSummary, toDbProfile };
