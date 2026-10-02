/* eslint-disable no-console */

// Keys whose values must never reach the logs (Aadhaar, OTPs, passwords, tokens)
const REDACT = /pass(word)?|otp|aadhaar|token|secret|authorization|code_hash/i;

function redact(value, depth = 0) {
  if (value === null || typeof value !== 'object' || depth > 4) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    out[key] = REDACT.test(key) ? '[REDACTED]' : redact(val, depth + 1);
  }
  return out;
}

function write(level, message, meta) {
  const entry = { time: new Date().toISOString(), level, message, ...(meta ? redact(meta) : {}) };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

module.exports = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
  redact,
};
