const { runQuery, knownElement } = require('./overpass.client');
const { toPlace } = require('./osmPlace');

// Queries are made for a rounded centre and a fixed set of radii, so nearby users and
// slider changes share cached results instead of each hitting Overpass.
const RADIUS_BUCKETS_KM = [5, 10, 25, 50];
// Rounding the centre to 0.01 degrees moves it by up to ~0.8 km; widen the search to cover that
const CENTRE_ROUNDING_MARGIN_KM = 1;

const FILTERS = {
  hospitals: ['nwr["amenity"="hospital"]', 'nwr["healthcare"="hospital"]'],
  clinics: ['nwr["amenity"~"^(doctors|clinic|dentist)$"]', 'nwr["healthcare"~"^(doctor|clinic|dentist)$"]'],
};

function buildQuery(kind, centre, radiusM) {
  const around = `(around:${radiusM},${centre.lat},${centre.lng})`;
  const parts = FILTERS[kind].map((f) => `${f}${around};`).join('');
  return `[out:json][timeout:20];(${parts});out center tags;`;
}

/**
 * Live health facilities of one kind ('hospitals' | 'clinics') within radiusKm of origin,
 * as API places sorted by distance (nearest first).
 */
async function findNearby(kind, origin, radiusKm) {
  const bucket = RADIUS_BUCKETS_KM.find((r) => r >= radiusKm) ?? RADIUS_BUCKETS_KM.at(-1);
  const centre = { lat: Number(origin.lat.toFixed(2)), lng: Number(origin.lng.toFixed(2)) };
  const radiusM = Math.round((bucket + CENTRE_ROUNDING_MARGIN_KM) * 1000);

  const elements = await runQuery(buildQuery(kind, centre, radiusM));
  return elements
    .map((el) => toPlace(el, origin))
    .filter((place) => place && place.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/** One OSM feature by its type and numeric id, or null. Uses already-fetched results when possible. */
async function findById({ type, ref }) {
  const known = knownElement(`${type}-${ref}`);
  if (known) return known;
  const [element] = await runQuery(`[out:json][timeout:20];${type}(${ref});out center tags;`);
  return element || null;
}

module.exports = { findNearby, findById, RADIUS_BUCKETS_KM };
