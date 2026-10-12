const { Router } = require('express');
const validate = require('../middleware/validate');
const { otpLimiter, placesLimiter } = require('../middleware/rateLimit');
const schemas = require('../validators/profile.schemas');
const profile = require('../controllers/profile.controller');
const places = require('../controllers/places.controller');
const placesSchemas = require('../validators/places.schemas');
const { uuidParam } = require('./params');

/**
 * Routes that act on one patient (req.subjectId). Mounted twice:
 *   /users/me/...                 -> the logged-in user
 *   /dependents/:patientId/...    -> an elderly person the caregiver manages
 */
const router = Router();

router.param('contactId', uuidParam('EMERGENCY_CONTACT_NOT_FOUND', 'Emergency contact not found.'));

router.get('/profile', profile.getProfile);
router.patch('/profile', validate({ body: schemas.updateProfile }), profile.updateProfile);
router.get('/medical-summary', profile.getMedicalSummary);

// Doctors near the patient for the conditions in their profile (live OpenStreetMap data)
router.get('/suggested-doctors', placesLimiter, validate({ query: placesSchemas.suggestedDoctors }), places.suggestedDoctors);

router.get('/aadhaar', profile.getAadhaarStatus);
router.post('/aadhaar/send-otp', otpLimiter, validate({ body: schemas.aadhaarSendOtp }), profile.sendAadhaarOtp);
router.post('/aadhaar/verify-otp', validate({ body: schemas.aadhaarVerifyOtp }), profile.verifyAadhaarOtp);

router.get('/emergency-contacts', profile.listEmergencyContacts);
router.post('/emergency-contacts', validate({ body: schemas.createEmergencyContact }), profile.createEmergencyContact);
router.patch('/emergency-contacts/:contactId', validate({ body: schemas.updateEmergencyContact }), profile.updateEmergencyContact);
router.delete('/emergency-contacts/:contactId', profile.deleteEmergencyContact);

module.exports = router;
