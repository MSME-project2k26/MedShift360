const { z } = require('zod');
const c = require('./common');

const shortText = (max = 100) => z.string().trim().min(1).max(max);
const stringList = z.array(shortText(100)).max(30);

const medication = z
  .object({
    name: shortText(100),
    dosage: shortText(50).optional(),
    frequency: shortText(50).optional(),
    timing: shortText(50).optional(),
  })
  .strict();

const profileFields = {
  dateOfBirth: c.dateOfBirth.nullable(),
  gender: c.gender.nullable(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']).nullable(),
  heightCm: z.number().min(30).max(260).nullable(),
  weightKg: z.number().min(2).max(350).nullable(),

  addressLine1: shortText(200).nullable(),
  addressLine2: shortText(200).nullable(),
  city: shortText(80).nullable(),
  district: shortText(80).nullable(),
  state: shortText(80).nullable(),
  pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, 'PIN code must be 6 digits.').nullable(),
  homeLatitude: z.number().min(-90).max(90).nullable(),
  homeLongitude: z.number().min(-180).max(180).nullable(),

  chronicConditions: stringList,
  allergies: stringList,
  currentMedications: z.array(medication).max(30),
  disabilities: stringList,
  mobilityAid: z.enum(['none', 'walking_stick', 'walker', 'wheelchair', 'bedridden']),
  hearingImpaired: z.boolean(),
  visionImpaired: z.boolean(),
  livesAlone: z.boolean(),

  abhaNumber: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ''))
    .pipe(z.string().regex(/^[0-9]{14}$/, 'ABHA number must be 14 digits.'))
    .nullable(),
  pmjayId: shortText(30).nullable(),
  insuranceProvider: shortText(100).nullable(),
  insurancePolicyNumber: shortText(50).nullable(),

  preferredLanguage: z.string().trim().min(2).max(10),
  preferredContactMethod: z.enum(['call', 'sms', 'whatsapp']),
  largeTextMode: z.boolean(),
  voiceAssistance: z.boolean(),
};

const updateProfile = z
  .object({ fullName: c.fullName, ...profileFields })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update.' })
  .refine((v) => (v.homeLatitude === undefined) === (v.homeLongitude === undefined), {
    message: 'Provide both homeLatitude and homeLongitude.',
    path: ['homeLatitude'],
  });

const createEmergencyContact = z
  .object({
    name: c.fullName,
    relationship: c.relationship,
    phone: c.phone,
    isPrimary: z.boolean().optional(),
    notifyOnEmergency: z.boolean().optional(),
  })
  .strict();

const updateEmergencyContact = createEmergencyContact
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update.' });

const aadhaarSendOtp = z
  .object({
    aadhaarNumber: z.string({ required_error: 'Aadhaar number is required.' }).max(20),
    consent: z.literal(true, {
      errorMap: () => ({ message: 'Your consent is required to verify Aadhaar.' }),
    }),
  })
  .strict();

const aadhaarVerifyOtp = z.object({ otp: c.otp }).strict();

const deleteAccount = z
  .object({
    confirm: z.literal('DELETE', { errorMap: () => ({ message: 'Type DELETE to confirm account deletion.' }) }),
  })
  .strict();

module.exports = {
  profileFields,
  updateProfile,
  createEmergencyContact,
  updateEmergencyContact,
  aadhaarSendOtp,
  aadhaarVerifyOtp,
  deleteAccount,
};
