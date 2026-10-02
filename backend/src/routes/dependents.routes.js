const { Router } = require('express');
const validate = require('../middleware/validate');
const { authenticate, actAsCaregiver } = require('../middleware/auth');
const { otpLimiter } = require('../middleware/rateLimit');
const schemas = require('../validators/caregiver.schemas');
const caregiver = require('../controllers/caregiver.controller');
const subjectRoutes = require('./subject.routes');
const { uuidParam } = require('./params');

/** Family members / caregivers managing elderly people's accounts. */
const router = Router();

router.use(authenticate);
router.param('patientId', uuidParam('DEPENDENT_NOT_FOUND', 'This person was not found in your dependents.'));

router.get('/', caregiver.listDependents);
router.post('/', validate({ body: schemas.createDependent }), caregiver.createDependent);

router.post('/link/send-otp', otpLimiter, validate({ body: schemas.linkRequest }), caregiver.requestLink);
router.post('/link/verify', validate({ body: schemas.linkConfirm }), caregiver.confirmLink);

router.delete('/:patientId', caregiver.removeDependent);

// /dependents/:patientId/profile, /aadhaar, /emergency-contacts, /medical-summary
router.use('/:patientId', actAsCaregiver, subjectRoutes);

module.exports = router;
