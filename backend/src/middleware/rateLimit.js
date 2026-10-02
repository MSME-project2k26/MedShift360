const rateLimit = require('express-rate-limit');

function limiter({ windowMinutes, limit, message }) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      res.status(options.statusCode).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message,
          details: { retryAfterSeconds: Math.ceil(options.windowMs / 1000) },
        },
      });
    },
  });
}

// Per-IP limits. Per-number OTP limits are enforced separately in otp.service.
module.exports = {
  apiLimiter: limiter({ windowMinutes: 15, limit: 600, message: 'Too many requests. Please slow down.' }),
  loginLimiter: limiter({
    windowMinutes: 15,
    limit: 20,
    message: 'Too many login attempts. Please wait 15 minutes and try again.',
  }),
  otpLimiter: limiter({
    windowMinutes: 15,
    limit: 15,
    message: 'Too many OTP requests. Please wait 15 minutes and try again.',
  }),
};
