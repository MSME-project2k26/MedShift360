const ApiError = require('../utils/ApiError');
const { findNearby, findById } = require('./places/nearby');
const { parseId, toPlace } = require('./places/osmPlace');

const SOURCE = {
  name: 'OpenStreetMap',
  attribution: '© OpenStreetMap contributors',
  license: 'ODbL',
  url: 'https://www.openstreetmap.org/copyright',
};

const HEALTH_AMENITIES = new Set(['hospital', 'clinic', 'doctors', 'dentist']);

/** Nearby government and private hospitals, nearest first. */
async function nearbyHospitals({ lat, lng, radiusKm, type, emergencyOnly, limit }) {
  const origin = { lat, lng };
  const all = await findNearby('hospitals', origin, radiusKm);
  const inScope = emergencyOnly ? all.filter((h) => h.emergency === true) : all;
  const matching = type === 'all' ? inScope : inScope.filter((h) => h.ownership === type);

  return {
    origin,
    radiusKm,
    counts: {
      all: inScope.length,
      government: inScope.filter((h) => h.ownership === 'government').length,
      private: inScope.filter((h) => h.ownership === 'private').length,
    },
    hospitals: matching.slice(0, limit),
    source: SOURCE,
  };
}

/** One hospital (or clinic) by its API id, e.g. "node-123456". */
async function hospitalDetail(id, origin) {
  const parsed = parseId(id);
  const element = parsed ? await findById(parsed) : null;
  const tags = element?.tags || {};
  const isHealthFacility = HEALTH_AMENITIES.has(tags.amenity) || Boolean(tags.healthcare);
  const place = isHealthFacility ? toPlace(element, origin) : null;
  if (!place) throw ApiError.notFound('HOSPITAL_NOT_FOUND', 'This hospital was not found.');
  return { hospital: place, source: SOURCE };
}

module.exports = { nearbyHospitals, hospitalDetail, SOURCE };
