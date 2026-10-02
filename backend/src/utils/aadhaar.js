// Verhoeff checksum tables - UIDAI uses the Verhoeff algorithm for the
// 12th (check) digit of every Aadhaar number.
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

function verhoeffValid(numStr) {
  let c = 0;
  const digits = numStr.split('').reverse().map(Number);
  for (let i = 0; i < digits.length; i += 1) {
    c = D[c][P[i % 8][digits[i]]];
  }
  return c === 0;
}

/** Strips spaces/hyphens. Returns the 12-digit string or null if invalid. */
function normalizeAadhaar(input) {
  if (typeof input !== 'string') return null;
  const digits = input.replace(/[\s-]/g, '');
  // 12 digits, cannot start with 0 or 1, must pass Verhoeff checksum
  if (!/^[2-9][0-9]{11}$/.test(digits)) return null;
  return verhoeffValid(digits) ? digits : null;
}

function maskAadhaar(last4) {
  return last4 ? `XXXX XXXX ${last4}` : null;
}

module.exports = { normalizeAadhaar, maskAadhaar, verhoeffValid };
