const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Adds a request ID (returned as X-Request-Id so support can trace an
 * issue) and logs method, path, status and duration. Request bodies are
 * never logged, so Aadhaar numbers, OTPs and passwords stay out of logs.
 */
function requestContext(req, res, next) {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info('request', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(ms),
    });
  });
  next();
}

/** Client metadata stored with sessions, OTPs and audit logs. */
function clientMeta(req) {
  return { ip: req.ip, userAgent: (req.headers['user-agent'] || '').slice(0, 300) };
}

module.exports = { requestContext, clientMeta };
