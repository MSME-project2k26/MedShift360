const { z } = require('zod');
const { normalizeIndianMobile } = require('../utils/phone');

const phone = z
  .union([z.string(), z.number()], { required_error: 'Mobile number is required.' })
  .transform((value, ctx) => {
    const normalized = normalizeIndianMobile(value);
    if (!normalized) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please enter a valid 10-digit Indian mobile number.' });
      return z.NEVER;
    }
    return normalized;
  });

const email = z
  .string({ required_error: 'Email is required.' })
  .trim()
  .toLowerCase()
  .max(254)
  .email('Please enter a valid email address.');

// Elderly-friendly: no special-character requirement, but must not be trivial.
// 72 is bcrypt's maximum input length.
const password = z
  .string({ required_error: 'Password is required.' })
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be at most 72 characters.')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.');

const fullName = z
  .string({ required_error: 'Full name is required.' })
  .trim()
  .min(2, 'Full name must be at least 2 characters.')
  .max(100, 'Full name must be at most 100 characters.')
  .regex(/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u, 'Full name can contain only letters, spaces, dots and hyphens.');

const otp = z
  .string({ required_error: 'OTP is required.' })
  .trim()
  .regex(/^[0-9]{6}$/, 'OTP must be 6 digits.');

const dateOfBirth = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format.')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
    const now = new Date();
    const minDate = new Date(Date.UTC(now.getUTCFullYear() - 120, now.getUTCMonth(), now.getUTCDate()));
    return date <= now && date >= minDate;
  }, 'Please enter a valid date of birth.');

const gender = z.enum(['male', 'female', 'other', 'prefer_not_to_say'], {
  errorMap: () => ({ message: 'Gender must be male, female, other or prefer_not_to_say.' }),
});

const relationship = z
  .string({ required_error: 'Relationship is required.' })
  .trim()
  .min(2)
  .max(40, 'Relationship must be at most 40 characters.');

const refreshToken = z.string({ required_error: 'refreshToken is required.' }).min(20).max(200);

module.exports = { phone, email, password, fullName, otp, dateOfBirth, gender, relationship, refreshToken };
