const { Router } = require('express');
const validate = require('../middleware/validate');
const { authenticate, actAsSelf } = require('../middleware/auth');
const { deleteAccount: deleteAccountSchema } = require('../validators/profile.schemas');
const profile = require('../controllers/profile.controller');
const caregiver = require('../controllers/caregiver.controller');
const subjectRoutes = require('./subject.routes');
const { uuidParam } = require('./params');

const router = Router();

router.param('linkId', uuidParam('CAREGIVER_LINK_NOT_FOUND', 'Caregiver link not found.'));

router.use('/me', authenticate);

router.delete('/me', validate({ body: deleteAccountSchema }), profile.deleteAccount);

// People who can manage my profile, and revoking their access
router.get('/me/caregivers', caregiver.listMyCaregivers);
router.delete('/me/caregivers/:linkId', caregiver.revokeMyCaregiver);

// /users/me/profile, /users/me/aadhaar, /users/me/emergency-contacts, ...
router.use('/me', actAsSelf, subjectRoutes);

module.exports = router;
