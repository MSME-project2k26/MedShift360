const { Router } = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { placesLimiter } = require('../middleware/rateLimit');
const schemas = require('../validators/places.schemas');
const places = require('../controllers/places.controller');

/** Live government and private hospitals from OpenStreetMap. */
const router = Router();

router.use(authenticate, placesLimiter);

router.get('/nearby', validate({ query: schemas.nearbyHospitals }), places.nearbyHospitals);
router.get('/:hospitalId', validate({ query: schemas.hospitalDetail }), places.hospitalDetail);

module.exports = router;
