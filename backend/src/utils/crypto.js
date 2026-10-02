const crypto = require('crypto');

function hmac(secret, value) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function randomToken(bytes = 48) {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** Cryptographically random numeric code, e.g. "048213". */
function generateNumericCode(length = 6) {
  return crypto.randomInt(0, 10 ** length).toString().padStart(length, '0');
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

module.exports = { hmac, sha256, randomToken, generateNumericCode, safeEqual };
