const { Router } = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { loginLimiter, otpLimiter } = require('../middleware/rateLimit');
const schemas = require('../validators/auth.schemas');
const auth = require('../controllers/auth.controller');

const router = Router();

// Registration
router.post('/register/email', loginLimiter, validate({ body: schemas.registerEmail }), auth.registerWithEmail);
router.post('/register/phone/send-otp', otpLimiter, validate({ body: schemas.phoneOnly }), auth.registerPhoneSendOtp);
router.post('/register/phone/verify', loginLimiter, validate({ body: schemas.registerPhoneVerify }), auth.registerPhoneVerify);

// Login
router.post('/login/email', loginLimiter, validate({ body: schemas.loginEmail }), auth.loginWithEmail);
router.post('/login/phone/send-otp', otpLimiter, validate({ body: schemas.phoneOnly }), auth.loginPhoneSendOtp);
router.post('/login/phone/verify', loginLimiter, validate({ body: schemas.phoneOtp }), auth.loginPhoneVerify);

// Session
router.post('/token/refresh', validate({ body: schemas.refresh }), auth.refreshToken);
router.post('/logout', validate({ body: schemas.refresh }), auth.logout);
router.post('/logout-all', authenticate, auth.logoutAll);
router.get('/me', authenticate, auth.me);

// Password
router.post('/password/forgot', otpLimiter, validate({ body: schemas.forgotPassword }), auth.forgotPassword);
router.post('/password/reset', loginLimiter, validate({ body: schemas.resetPassword }), auth.resetPassword);
router.post('/password/change', authenticate, validate({ body: schemas.changePassword }), auth.changePassword);

// Verify (or add) email / phone on an existing account
router.post('/verify/email/send', authenticate, otpLimiter, validate({ body: schemas.emailVerifySend }), auth.sendEmailVerification);
router.post('/verify/email/confirm', authenticate, validate({ body: schemas.emailVerifyConfirm }), auth.confirmEmailVerification);
router.post('/verify/phone/send', authenticate, otpLimiter, validate({ body: schemas.phoneVerifySend }), auth.sendPhoneVerification);
router.post('/verify/phone/confirm', authenticate, validate({ body: schemas.phoneVerifyConfirm }), auth.confirmPhoneVerification);

module.exports = router;
