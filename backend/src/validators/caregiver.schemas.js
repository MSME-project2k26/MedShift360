const { z } = require('zod');
const c = require('./common');
const { profileFields } = require('./profile.schemas');

module.exports = {
  createDependent: z
    .object({
      fullName: c.fullName,
      relationship: c.relationship,
      phone: c.phone.optional(),
      dateOfBirth: c.dateOfBirth,
      gender: c.gender,
      bloodGroup: profileFields.bloodGroup.optional(),
      chronicConditions: profileFields.chronicConditions.optional(),
      allergies: profileFields.allergies.optional(),
      mobilityAid: profileFields.mobilityAid.optional(),
      hearingImpaired: profileFields.hearingImpaired.optional(),
      visionImpaired: profileFields.visionImpaired.optional(),
      livesAlone: profileFields.livesAlone.optional(),
      preferredLanguage: profileFields.preferredLanguage.optional(),
    })
    .strict(),

  linkRequest: z.object({ phone: c.phone }).strict(),

  linkConfirm: z.object({ phone: c.phone, otp: c.otp, relationship: c.relationship }).strict(),
};
