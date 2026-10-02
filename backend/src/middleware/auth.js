const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const userService = require('../services/user.service');
const caregiverService = require('../services/caregiver.service');
const { JWT_ISSUER, JWT_AUDIENCE } = require('../services/token.service');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Requires a valid `Authorization: Bearer <accessToken>` header. */
async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized('AUTH_REQUIRED', 'Please log in to continue.');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('TOKEN_EXPIRED', 'Your session has expired. Please refresh your token.');
    }
    throw ApiError.unauthorized('INVALID_TOKEN', 'Your session is invalid. Please log in again.');
  }

  // Load the user on every request so suspended/deleted accounts lose access immediately
  const user = await userService.findById(payload.sub);
  if (!user || user.status === 'deleted') {
    throw ApiError.unauthorized('INVALID_TOKEN', 'Your session is invalid. Please log in again.');
  }
  if (user.status === 'suspended') {
    throw ApiError.forbidden('ACCOUNT_SUSPENDED', 'Your account has been suspended. Please contact support.');
  }

  req.user = user;
  req.sessionId = payload.sid;
  next();
}

/** Restricts a route to the given roles, e.g. authorize('admin', 'hospital_staff'). */
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden('FORBIDDEN', 'You do not have permission to perform this action.');
    }
    next();
  };
}

/**
 * Sets req.subjectId - the patient whose data the request acts on.
 * For /users/me/* routes this is the logged-in user.
 */
function actAsSelf(req, res, next) {
  req.subjectId = req.user.id;
  next();
}

/**
 * For /dependents/:patientId/* routes: allows a caregiver to act on behalf
 * of an elderly person they have an active caregiver link with.
 */
async function actAsCaregiver(req, res, next) {
  if (!UUID_RE.test(req.params.patientId)) {
    throw ApiError.notFound('DEPENDENT_NOT_FOUND', 'This person was not found in your dependents.');
  }
  const link = await caregiverService.findActiveLink(req.user.id, req.params.patientId);
  if (!link || !link.can_manage_profile) {
    throw ApiError.forbidden('NOT_A_CAREGIVER', 'You are not allowed to manage this person\'s profile.');
  }
  req.subjectId = req.params.patientId;
  next();
}

module.exports = { authenticate, authorize, actAsSelf, actAsCaregiver };
