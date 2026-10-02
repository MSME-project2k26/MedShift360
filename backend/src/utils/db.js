const ApiError = require('./ApiError');
const logger = require('./logger');

const CONFLICT_MESSAGES = {
  users_email_key: ['EMAIL_ALREADY_REGISTERED', 'This email address is already registered.'],
  users_phone_key: ['PHONE_ALREADY_REGISTERED', 'This mobile number is already registered.'],
  aadhaar_verified_hash_key: [
    'AADHAAR_LINKED_TO_ANOTHER_ACCOUNT',
    'This Aadhaar number is already linked to another account.',
  ],
  emergency_contacts_user_id_phone_key: [
    'EMERGENCY_CONTACT_EXISTS',
    'An emergency contact with this mobile number already exists.',
  ],
  caregiver_links_active_key: ['CAREGIVER_LINK_EXISTS', 'You are already a caregiver for this person.'],
};

function mapDbError(error) {
  // 23505 = unique_violation
  if (error.code === '23505') {
    const match = Object.keys(CONFLICT_MESSAGES).find((key) => (error.message || '').includes(key));
    if (match) {
      const [code, message] = CONFLICT_MESSAGES[match];
      return ApiError.conflict(code, message);
    }
    return ApiError.conflict('DUPLICATE_RECORD', 'This record already exists.');
  }
  // 23514 = check_violation
  if (error.code === '23514') {
    return ApiError.badRequest('INVALID_DATA', 'Some of the information provided is not valid.');
  }
  logger.error('Database error', { code: error.code, message: error.message, hint: error.hint });
  return new ApiError(500, 'DATABASE_ERROR', 'Something went wrong while saving your data. Please try again.');
}

/** Unwraps a Supabase `{ data, error }` result, throwing an ApiError on failure. */
function unwrap({ data, error }) {
  if (error) throw mapDbError(error);
  return data;
}

module.exports = { unwrap, mapDbError };
