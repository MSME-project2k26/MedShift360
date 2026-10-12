const ApiError = require('../utils/ApiError');
const profileService = require('./profile.service');
const { findNearby } = require('./places/nearby');
const { SOURCE } = require('./hospital.service');
const {
  SPECIALTIES,
  GENERAL,
  byKey,
  specialtiesForCondition,
  matchPlace,
  isMultiSpeciality,
  describe,
} = require('./places/specialties');

const DOCTORS_PER_SPECIALTY = 5;
const HOSPITALS_PER_SPECIALTY = 3;

const DISCLAIMER =
  'These suggestions are based on the health conditions in your profile and public map data. ' +
  'They are not a diagnosis. Please confirm with the doctor before visiting. In an emergency, call 108.';

/** Specialty key -> conditions it was picked for, in the order the patient listed them. */
function groupConditions(conditions, isSenior) {
  const groups = new Map();
  for (const condition of conditions) {
    for (const specialty of specialtiesForCondition(condition)) {
      if (!groups.has(specialty.key)) groups.set(specialty.key, []);
      groups.get(specialty.key).push(condition);
    }
  }
  if (!groups.size) groups.set(GENERAL.key, []);
  if (isSenior && !groups.has('geriatrics')) groups.set('geriatrics', []);
  return groups;
}

/** A clinic with no specialty of its own counts as general practice. */
function matchGeneral(place) {
  const tagged = matchPlace(place, GENERAL);
  if (tagged) return tagged;
  const looksSpecialised = place.specialities.length || SPECIALTIES.some((s) => matchPlace(place, s));
  return looksSpecialised ? null : 'general';
}

function pick(places, specialty, count) {
  const out = [];
  for (const place of places) {
    const matchedBy = specialty.key === GENERAL.key ? matchGeneral(place) : matchPlace(place, specialty);
    if (matchedBy) out.push({ ...place, matchedBy });
    if (out.length === count) break;
  }
  return out;
}

function hospitalsFor(hospitals, specialty) {
  const picked = pick(hospitals, specialty, HOSPITALS_PER_SPECIALTY);
  // Few hospitals are tagged by speciality; top up with the nearest multi-speciality hospitals
  for (const h of hospitals) {
    if (picked.length >= HOSPITALS_PER_SPECIALTY) break;
    if (isMultiSpeciality(h) && !picked.some((p) => p.id === h.id)) picked.push({ ...h, matchedBy: 'multi_speciality' });
  }
  return picked;
}

function reasonFor(specialty, conditions) {
  if (conditions.length) return `For ${conditions.join(', ')}`;
  if (specialty.key === 'geriatrics') return 'Recommended for regular check-ups after 60';
  return 'For routine check-ups and everyday health problems';
}

/** Doctors, clinics and hospitals near the patient that treat the conditions in their profile. */
async function suggestDoctors(subjectId, { lat, lng, radiusKm }) {
  const health = await profileService.getHealthContext(subjectId);

  let location;
  if (lat !== undefined) location = { lat, lng, source: 'device' };
  else if (health.homeLocation) location = { ...health.homeLocation, source: 'home' };
  else {
    throw ApiError.badRequest(
      'LOCATION_REQUIRED',
      'Please allow location access, or add your home location in your profile, to see doctors near you.',
    );
  }

  const origin = { lat: location.lat, lng: location.lng };
  const [clinics, hospitals] = await Promise.all([
    findNearby('clinics', origin, radiusKm),
    findNearby('hospitals', origin, radiusKm),
  ]);

  const groups = groupConditions(health.chronicConditions, health.isSeniorCitizen);
  const suggestions = [...groups].map(([key, conditions]) => {
    const specialty = byKey.get(key);
    return {
      specialty: describe(specialty),
      forConditions: conditions,
      reason: reasonFor(specialty, conditions),
      doctors: pick(clinics, specialty, DOCTORS_PER_SPECIALTY),
      hospitals: hospitalsFor(hospitals, specialty),
    };
  });

  return {
    conditions: health.chronicConditions,
    location,
    radiusKm,
    suggestions,
    disclaimer: DISCLAIMER,
    source: SOURCE,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { suggestDoctors, groupConditions };
