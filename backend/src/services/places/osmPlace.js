const { distanceKm, directionsUrl } = require('../../utils/geo');

// OpenStreetMap ids look like "node/123"; the API uses "node-123" so they fit in a URL segment.
const ID_RE = /^(node|way|relation)-(\d{1,15})$/;

function parseId(id) {
  const match = ID_RE.exec(id);
  return match ? { type: match[1], ref: match[2] } : null;
}

// ---------------------------------------------------------------------
// Government or private
// ---------------------------------------------------------------------
// Most Indian hospitals in OSM have no operator:type tag, so names and operators are checked too.
const GOVT_OPERATOR_TYPES = new Set(['government', 'public', 'state', 'municipal', 'military', 'governmental']);
const PRIVATE_OPERATOR_TYPES = new Set(['private', 'commercial', 'corporate']);
const NONPROFIT_OPERATOR_TYPES = new Set(['ngo', 'charitable', 'religious', 'community', 'charity', 'trust', 'non_profit']);

const GOVT_NAME_RE =
  /\b(govt\.?|government|gh|corporation|municipal|panchayat|e\.?s\.?i\.?c?\.?|phc|chc|uphc|primary health (centre|center)|community health (centre|center)|urban (primary )?health (centre|center)|district (headquarters? )?hospital|taluk|taluka|tehsil|civil hospital|sub[- ]?divisional hospital|aiims|jipmer|pgimer|railway hospital|military hospital|cantonment|police hospital|institute of child health|institute of obstetrics|rajiv gandhi government|cghs)\b/i;
const GOVT_OPERATOR_RE =
  /government|govt|department of health|health department|municipal|corporation of|ministry|directorate|national health mission|\bnhm\b|indian railways|\besic?\b|armed forces|state health/i;
const PRIVATE_NAME_RE = /\b(pvt\.?|private|ltd\.?|limited|llp|nursing home)\b|\(p\)/i;

/** Returns { ownership: 'government' | 'private', ownershipSource: 'tagged' | 'name' | 'assumed' } */
function classifyOwnership(tags) {
  const operatorType = (tags['operator:type'] || tags.ownership || '').toLowerCase();
  if (GOVT_OPERATOR_TYPES.has(operatorType)) return { ownership: 'government', ownershipSource: 'tagged' };
  if (PRIVATE_OPERATOR_TYPES.has(operatorType) || NONPROFIT_OPERATOR_TYPES.has(operatorType)) {
    return { ownership: 'private', ownershipSource: 'tagged' };
  }

  const names = [tags.name, tags['name:en'], tags.official_name, tags.alt_name].filter(Boolean).join(' ');
  if (GOVT_NAME_RE.test(names) || GOVT_OPERATOR_RE.test(tags.operator || '')) {
    return { ownership: 'government', ownershipSource: 'name' };
  }
  if (PRIVATE_NAME_RE.test(names) || PRIVATE_NAME_RE.test(tags.operator || '')) {
    return { ownership: 'private', ownershipSource: 'name' };
  }
  // Government hospitals in India are almost always named as such; the rest are overwhelmingly private
  return { ownership: 'private', ownershipSource: 'assumed' };
}

// ---------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------
const first = (...values) => values.find((v) => typeof v === 'string' && v.trim())?.trim() ?? null;

/** "a;b" / "a, b" -> ["a", "b"] */
const splitList = (value) =>
  (value || '')
    .split(/[;,]/)
    .map((v) => v.trim())
    .filter(Boolean);

function buildAddress(tags) {
  if (tags['addr:full']) {
    const parts = [tags['addr:full'], tags['addr:city'] || tags['addr:district'], tags['addr:postcode']];
    return parts.filter(Boolean).join(', ');
  }
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const parts = [
    tags['addr:housename'],
    street,
    tags['addr:suburb'] || tags['addr:neighbourhood'],
    tags['addr:city'] || tags['addr:district'],
    tags['addr:postcode'],
  ];
  const address = parts.filter(Boolean).join(', ');
  return address || null;
}

function parseBeds(value) {
  const beds = Number.parseInt(value, 10);
  return Number.isFinite(beds) && beds > 0 ? beds : null;
}

function emergencyFlag(tags) {
  const value = (tags.emergency || '').toLowerCase();
  if (value === 'yes') return true;
  if (value === 'no') return false;
  return null; // not listed
}

function kindOf(tags) {
  if (tags.amenity === 'hospital' || tags.healthcare === 'hospital') return 'hospital';
  if (tags.amenity === 'doctors' || tags.healthcare === 'doctor') return 'doctor';
  if (tags.amenity === 'dentist' || tags.healthcare === 'dentist') return 'dentist';
  return 'clinic';
}

/**
 * Turns an Overpass element into the API's place shape.
 * Returns null for features that cannot be shown (no name or no coordinates).
 */
function toPlace(element, origin) {
  const tags = element.tags || {};
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  const name = first(tags['name:en'], tags.name, tags.official_name);
  if (!name || lat === undefined || lng === undefined) return null;

  const location = { lat, lng };
  const { ownership, ownershipSource } = classifyOwnership(tags);
  return {
    id: `${element.type}-${element.id}`,
    name,
    localName: tags.name && tags.name !== name ? tags.name : null,
    kind: kindOf(tags),
    ownership,
    ownershipSource,
    operator: first(tags.operator),
    location,
    distanceKm: origin ? Math.round(distanceKm(origin, location) * 10) / 10 : null,
    address: buildAddress(tags),
    district: first(tags['addr:district'], tags['addr:city']),
    state: first(tags['addr:state']),
    pincode: first(tags['addr:postcode']),
    phone: first(tags.phone, tags['contact:phone'], tags['contact:mobile'], tags.mobile),
    emergencyPhone: first(tags['emergency:phone']),
    website: first(tags.website, tags['contact:website']),
    email: first(tags.email, tags['contact:email']),
    openingHours: first(tags.opening_hours),
    emergency: emergencyFlag(tags),
    beds: parseBeds(tags.beds),
    specialities: splitList(tags['healthcare:speciality']),
    wheelchair: first(tags.wheelchair),
    description: first(tags.description),
    directionsUrl: directionsUrl(location),
    osmUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
  };
}

module.exports = { parseId, toPlace, classifyOwnership, splitList };
