require('./setupEnv');
const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyOwnership, toPlace, parseId } = require('../src/services/places/osmPlace');
const { specialtiesForCondition, matchPlace, byKey } = require('../src/services/places/specialties');
const { groupConditions } = require('../src/services/doctorSuggestion.service');
const schemas = require('../src/validators/places.schemas');
const { distanceKm } = require('../src/utils/geo');

// These tests cover the rules applied to OpenStreetMap data; nothing here calls the network.

test('ownership comes from operator:type when OSM has it', () => {
  assert.deepEqual(classifyOwnership({ name: 'City Hospital', 'operator:type': 'government' }), {
    ownership: 'government',
    ownershipSource: 'tagged',
  });
  assert.equal(classifyOwnership({ name: 'Govt Hospital', 'operator:type': 'private' }).ownership, 'private');
  assert.equal(classifyOwnership({ name: 'Mission Hospital', 'operator:type': 'charitable' }).ownership, 'private');
});

test('ownership is inferred from Indian government hospital names', () => {
  for (const name of [
    'Rajiv Gandhi Government General Hospital',
    'Govt. Stanley Hospital',
    'Chennai Corporation Hospital',
    'ESI Hospital',
    'Primary Health Centre, Avadi',
    'Taluk Hospital',
    'AIIMS New Delhi',
  ]) {
    assert.deepEqual(classifyOwnership({ name }), { ownership: 'government', ownershipSource: 'name' }, name);
  }
  assert.equal(classifyOwnership({ name: 'X', operator: 'Department of Health, Tamil Nadu' }).ownership, 'government');
  assert.deepEqual(classifyOwnership({ name: 'Raju Nursing Home' }), { ownership: 'private', ownershipSource: 'name' });
  assert.deepEqual(classifyOwnership({ name: 'Kauvery Hospital' }), { ownership: 'private', ownershipSource: 'assumed' });
});

test('toPlace builds the API shape and skips unnamed features', () => {
  const place = toPlace(
    {
      type: 'way',
      id: 42,
      center: { lat: 13.08, lon: 80.27 },
      tags: {
        amenity: 'hospital',
        name: 'Test Hospital',
        'addr:full': 'Mint Street',
        'addr:district': 'Chennai',
        'addr:postcode': '600079',
        phone: '+91 44 1234 5678',
        emergency: 'yes',
        beds: '120',
        'healthcare:speciality': 'cardiology;orthopaedics',
      },
    },
    { lat: 13.09, lng: 80.27 },
  );
  assert.equal(place.id, 'way-42');
  assert.equal(place.kind, 'hospital');
  assert.equal(place.address, 'Mint Street, Chennai, 600079');
  assert.equal(place.emergency, true);
  assert.equal(place.beds, 120);
  assert.deepEqual(place.specialities, ['cardiology', 'orthopaedics']);
  assert.equal(place.distanceKm, 1.1);
  assert.match(place.directionsUrl, /destination=13.08,80.27$/);

  assert.equal(toPlace({ type: 'node', id: 1, lat: 1, lon: 1, tags: { amenity: 'hospital' } }), null);
});

test('hospital ids are validated before reaching Overpass', () => {
  assert.deepEqual(parseId('node-123'), { type: 'node', ref: '123' });
  assert.equal(parseId('node-1);out;'), null);
  assert.equal(parseId('area-5'), null);
});

test('conditions map to the right specialties', () => {
  const keys = (c) => specialtiesForCondition(c).map((s) => s.key);
  assert.deepEqual(keys('Type 2 Diabetes'), ['endocrinology']);
  assert.deepEqual(keys('High BP'), ['cardiology']);
  assert.deepEqual(keys('Osteoarthritis of the knee'), ['orthopaedics']);
  assert.deepEqual(keys('diabetic kidney disease'), ['endocrinology', 'nephrology']);
  assert.deepEqual(keys('10 year old fracture'), ['orthopaedics']);
  assert.deepEqual(keys('frequent cough'), ['general']);
});

test('clinics match a specialty by OSM tag or by name, without false word matches', () => {
  const place = (name, specialities = []) => ({ name, localName: null, specialities });
  assert.equal(matchPlace(place('Padma Clinic', ['Endocrinology']), byKey.get('endocrinology')), 'speciality_tag');
  assert.equal(matchPlace(place('Joseph Eye Clinic'), byKey.get('ophthalmology')), 'name');
  assert.equal(matchPlace(place('BK ENT care'), byKey.get('otolaryngology')), 'name');
  assert.equal(matchPlace(place('Pearl Hospital'), byKey.get('otolaryngology')), null);
  assert.equal(matchPlace(place('Accident Care Centre'), byKey.get('dentistry')), null);
});

test('suggestions group conditions by specialty and add elderly care for seniors', () => {
  const groups = groupConditions(['Diabetes', 'Thyroid', 'Asthma'], true);
  assert.deepEqual([...groups.keys()], ['endocrinology', 'pulmonology', 'geriatrics']);
  assert.deepEqual(groups.get('endocrinology'), ['Diabetes', 'Thyroid']);
  assert.deepEqual([...groupConditions([], false).keys()], ['general']);
});

test('places query schemas apply defaults and limits', () => {
  const q = schemas.nearbyHospitals.parse({ lat: '13.08', lng: '80.27' });
  assert.deepEqual(q, { lat: 13.08, lng: 80.27, radiusKm: 10, type: 'all', emergencyOnly: false, limit: 50 });
  assert.equal(schemas.nearbyHospitals.safeParse({ lat: '13', lng: '80', radiusKm: '80' }).success, false);
  assert.equal(schemas.nearbyHospitals.safeParse({ lat: '13', lng: '80', type: 'army' }).success, false);
  assert.equal(schemas.suggestedDoctors.safeParse({ lat: '13' }).success, false);
  assert.equal(schemas.suggestedDoctors.safeParse({}).success, true);
});

test('distanceKm is a great-circle distance', () => {
  // Chennai Central -> Chennai airport is about 14.5 km in a straight line
  const km = distanceKm({ lat: 13.0827, lng: 80.2757 }, { lat: 12.9941, lng: 80.1709 });
  assert.ok(km > 14 && km < 15.5, String(km));
});
