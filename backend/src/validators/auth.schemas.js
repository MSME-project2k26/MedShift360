const { z } = require('zod');
const c = require('./common');

const emailOrPhone = (extra = {}) =>
  z
    .object({ email: c.email.optional(), phone: c.phone.optional(), ...extra })
    .strict()
    .refine((v) => Boolean(v.email) !== Boolean(v.phone), {
      message: 'Provide either an email address or a mobile number.',
      path: ['email'],
    });

module.exports = {
  registerEmail: z
    .object({
      fullName: c.fullName,
      email: c.email,
      password: c.password,
      phone: c.phone.optional(),
      dateOfBirth: c.dateOfBirth.optional(),
      gender: c.gender.optional(),
    })
    .strict(),

  phoneOnly: z.object({ phone: c.phone }).strict(),

  registerPhoneVerify: z
    .object({
      phone: c.phone,
      otp: c.otp,
      fullName: c.fullName,
      email: c.email.optional(),
      password: c.password.optional(),
      dateOfBirth: c.dateOfBirth.optional(),
      gender: c.gender.optional(),
    })
    .strict()
    .refine((v) => !v.email || v.password, {
      message: 'Please set a password if you add an email address.',
      path: ['password'],
    }),

  loginEmail: z
    .object({
      email: c.email,
      password: z.string({ required_error: 'Password is required.' }).min(1, 'Password is required.').max(72),
    })
    .strict(),

  phoneOtp: z.object({ phone: c.phone, otp: c.otp }).strict(),

  refresh: z.object({ refreshToken: c.refreshToken }).strict(),

  forgotPassword: emailOrPhone(),

  resetPassword: emailOrPhone({ otp: c.otp, newPassword: c.password }),

  changePassword: z
    .object({
      currentPassword: z.string().max(72).optional(),
      newPassword: c.password,
    })
    .strict(),

  emailVerifySend: z.object({ email: c.email.optional() }).strict(),
  emailVerifyConfirm: z.object({ email: c.email.optional(), otp: c.otp }).strict(),
  phoneVerifySend: z.object({ phone: c.phone.optional() }).strict(),
  phoneVerifyConfirm: z.object({ phone: c.phone.optional(), otp: c.otp }).strict(),
};
