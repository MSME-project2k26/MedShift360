/**
 * Normalises an Indian mobile number to E.164 (+91XXXXXXXXXX).
 * Accepts "9876543210", "09876543210", "+91 98765 43210", "91-9876543210".
 * Returns null if the input is not a valid Indian mobile number.
 */
function normalizeIndianMobile(input) {
  if (typeof input !== 'string' && typeof input !== 'number') return null;
  let digits = String(input).replace(/[\s\-().]/g, '');
  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (digits.startsWith('0091')) digits = digits.slice(4);
  else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);

  // Indian mobile numbers are 10 digits starting with 6, 7, 8 or 9
  if (!/^[6-9][0-9]{9}$/.test(digits)) return null;
  return `+91${digits}`;
}

/** "+919876543210" -> "+91 ******3210" */
function maskPhone(phone) {
  if (!phone) return null;
  return `${phone.slice(0, 3)} ******${phone.slice(-4)}`;
}

/** "ramesh.kumar@gmail.com" -> "ra********@gmail.com" */
function maskEmail(email) {
  if (!email) return null;
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

module.exports = { normalizeIndianMobile, maskPhone, maskEmail };
