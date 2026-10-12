// Medical specialties: which conditions they treat and how to recognise them in OpenStreetMap.
//   conditions: matched against the patient's chronic conditions (free text, any case)
//   osm:        values of the healthcare:speciality tag (https://wiki.openstreetmap.org/wiki/Key:healthcare:speciality)
//   names:      words in a clinic or hospital name, since most Indian clinics have no speciality tag
const SPECIALTIES = [
  {
    key: 'cardiology',
    label: 'Cardiology',
    doctorTitle: 'Cardiologist',
    conditions: /heart|cardi|hypertension|high blood pressure|\bb\.?p\b|angina|arrhythmi|atrial|coronary|\bcad\b|cholesterol|lipid|palpitation|bypass|stent|pacemaker/i,
    osm: ['cardiology', 'cardiac_surgery', 'cardiothoracic_surgery', 'cardiac'],
    names: /heart|cardi/i,
  },
  {
    key: 'endocrinology',
    label: 'Diabetes & Endocrinology',
    doctorTitle: 'Diabetologist / Endocrinologist',
    conditions: /diabet|sugar|thyroid|hypothyroid|hyperthyroid|insulin|endocrin|pcos|pcod|obesity/i,
    osm: ['endocrinology', 'diabetology', 'diabetes'],
    names: /diabet|thyroid|endocrin|sugar/i,
  },
  {
    key: 'neurology',
    label: 'Neurology',
    doctorTitle: 'Neurologist',
    conditions: /stroke|paralys|parkinson|alzheimer|dementia|epilep|seizure|migraine|neuro|nerve|memory loss|vertigo|multiple sclerosis/i,
    osm: ['neurology', 'neurosurgery'],
    names: /neuro|brain|stroke/i,
  },
  {
    key: 'orthopaedics',
    label: 'Orthopaedics',
    doctorTitle: 'Orthopaedic doctor',
    conditions: /arthritis|joint|knee|hip|osteo|spine|spinal|back pain|fracture|bone|gout|spondyl|sciatica|frozen shoulder/i,
    osm: ['orthopaedics', 'orthopedics', 'traumatology', 'rheumatology', 'physiotherapy'],
    names: /ortho|bone|joint|spine|trauma|fracture|rheumat/i,
  },
  {
    key: 'pulmonology',
    label: 'Pulmonology (Lungs)',
    doctorTitle: 'Pulmonologist / Chest physician',
    conditions: /asthma|copd|lung|bronch|breath|pulmon|tuberculosis|\btb\b|emphysema|sleep apnea|wheez/i,
    osm: ['pulmonology', 'pneumology', 'respiratory'],
    names: /chest|lung|pulmo|asthma|respir|\btb\b/i,
  },
  {
    key: 'nephrology',
    label: 'Nephrology (Kidneys)',
    doctorTitle: 'Nephrologist',
    conditions: /kidney|renal|\bckd\b|dialysis|nephr/i,
    osm: ['nephrology', 'dialysis'],
    names: /kidney|renal|nephro|dialysis/i,
  },
  {
    key: 'urology',
    label: 'Urology',
    doctorTitle: 'Urologist',
    conditions: /prostate|urin|bladder|kidney stone|urolog|incontinence/i,
    osm: ['urology', 'andrology'],
    names: /urolog|\bstones?\b|prostate/i,
  },
  {
    key: 'gastroenterology',
    label: 'Gastroenterology',
    doctorTitle: 'Gastroenterologist',
    conditions: /liver|hepat|gastr|stomach|ulcer|acidity|\bgerd\b|\bibs\b|colitis|crohn|digest|constipation|piles|cirrhosis|fatty liver/i,
    osm: ['gastroenterology', 'hepatology', 'proctology'],
    names: /gastro|liver|digest|stomach|piles/i,
  },
  {
    key: 'ophthalmology',
    label: 'Eye care',
    doctorTitle: 'Ophthalmologist',
    conditions: /eye|cataract|glaucoma|vision|retina|macular|blind/i,
    osm: ['ophthalmology', 'optometry'],
    names: /\beye|netra|nethra|vision|optic|retina|lasik/i,
  },
  {
    key: 'otolaryngology',
    label: 'ENT (Ear, Nose, Throat)',
    doctorTitle: 'ENT specialist',
    conditions: /hearing|deaf|\bears?\b|sinus|tinnitus|throat|tonsil|nose/i,
    osm: ['otolaryngology', 'otorhinolaryngology', 'ent', 'audiology'],
    names: /\bent\b|\bears?\b|hearing|sinus/i,
  },
  {
    key: 'oncology',
    label: 'Oncology (Cancer)',
    doctorTitle: 'Oncologist',
    conditions: /cancer|tumou?r|oncol|leukemia|lymphoma|carcinoma|chemo/i,
    osm: ['oncology', 'radiotherapy', 'haematology'],
    names: /cancer|onco|tumou?r/i,
  },
  {
    key: 'psychiatry',
    label: 'Mental health',
    doctorTitle: 'Psychiatrist',
    conditions: /depress|anxiety|bipolar|schizo|psych|mental|insomnia|\bocd\b|panic|stress/i,
    osm: ['psychiatry', 'psychology', 'psychotherapy'],
    names: /psych|mind|mental|de-?addiction/i,
  },
  {
    key: 'dermatology',
    label: 'Skin care',
    doctorTitle: 'Dermatologist',
    conditions: /skin|eczema|psoria|dermat|acne|vitiligo|fungal|rash/i,
    osm: ['dermatology', 'venereology'],
    names: /skin|derma|cosmetic/i,
  },
  {
    key: 'gynaecology',
    label: "Women's health",
    doctorTitle: 'Gynaecologist',
    conditions: /pregnan|gynae|gyne|menopaus|menstru|uter|ovar|fertility|breast/i,
    osm: ['gynaecology', 'obstetrics', 'gynecology', 'fertility'],
    names: /gyna?ec|women|maternity|fertility|mother/i,
  },
  {
    key: 'dentistry',
    label: 'Dental care',
    doctorTitle: 'Dentist',
    conditions: /dental|tooth|teeth|gum|denture/i,
    osm: ['dentistry', 'dental', 'orthodontics'],
    names: /\bdent(al|ist|istry)?\b|tooth|teeth|smile|orthodont/i,
  },
  {
    key: 'geriatrics',
    label: 'Elderly care',
    doctorTitle: 'Geriatrician',
    conditions: /geriatr|frailty|falls?\b|old age/i,
    osm: ['geriatrics', 'gerontology'],
    names: /geriatr|elder|senior|old age/i,
  },
];

// Used when a condition matches nothing above, and for patients without listed conditions
const GENERAL = {
  key: 'general',
  label: 'General medicine',
  doctorTitle: 'General physician',
  conditions: null,
  osm: ['general', 'family_medicine', 'internal', 'internal_medicine', 'general_medicine', 'multi_speciality'],
  names: /general|family|poly ?clinic|medical cent(er|re)|health cent(er|re)|dispensary/i,
};

const ALL = [...SPECIALTIES, GENERAL];
const byKey = new Map(ALL.map((s) => [s.key, s]));

/** "Multi Speciality" / " Dentistry" -> "multi_speciality" / "dentistry" */
const normalizeTag = (value) => value.trim().toLowerCase().replace(/[\s-]+/g, '_');

/** Specialties that treat a condition (a condition can need more than one, e.g. "diabetic kidney disease"). */
function specialtiesForCondition(condition) {
  const matched = SPECIALTIES.filter((s) => s.conditions.test(condition));
  return matched.length ? matched : [GENERAL];
}

/**
 * How a place relates to a specialty: 'speciality_tag' (tagged in OSM), 'name' (named after it)
 * or null (no match).
 */
function matchPlace(place, specialty) {
  const tags = place.specialities.map(normalizeTag);
  if (tags.some((t) => specialty.osm.includes(t))) return 'speciality_tag';
  if (specialty.names.test(place.name) || (place.localName && specialty.names.test(place.localName))) return 'name';
  return null;
}

const isMultiSpeciality = (place) =>
  place.specialities.map(normalizeTag).some((t) => t === 'multi_speciality' || t === 'general') ||
  /multi ?-?speciality|multi ?-?specialty|super ?-?speciality/i.test(place.name);

/** Public part of a specialty, safe to send to the client. */
const describe = ({ key, label, doctorTitle }) => ({ key, label, doctorTitle });

module.exports = { SPECIALTIES, GENERAL, byKey, specialtiesForCondition, matchPlace, isMultiSpeciality, describe };
