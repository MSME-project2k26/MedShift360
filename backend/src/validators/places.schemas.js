const { z } = require('zod');

const latitude = z.coerce
  .number({ invalid_type_error: 'Latitude must be a number.' })
  .min(-90, 'Latitude must be between -90 and 90.')
  .max(90, 'Latitude must be between -90 and 90.');
const longitude = z.coerce
  .number({ invalid_type_error: 'Longitude must be a number.' })
  .min(-180, 'Longitude must be between -180 and 180.')
  .max(180, 'Longitude must be between -180 and 180.');
const radiusKm = z.coerce
  .number({ invalid_type_error: 'Distance must be a number.' })
  .min(1, 'Distance must be between 1 and 50 km.')
  .max(50, 'Distance must be between 1 and 50 km.')
  .default(10);
const queryBool = z
  .enum(['true', 'false', '1', '0'])
  .default('false')
  .transform((v) => v === 'true' || v === '1');

const bothOrNeither = (v) => (v.lat === undefined) === (v.lng === undefined);
const bothOrNeitherIssue = { message: 'Provide both lat and lng.', path: ['lat'] };

const nearbyHospitals = z.object({
  lat: latitude,
  lng: longitude,
  radiusKm,
  type: z
    .enum(['all', 'government', 'private'], {
      errorMap: () => ({ message: 'Type must be all, government or private.' }),
    })
    .default('all'),
  emergencyOnly: queryBool,
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// Location is optional here: it only adds the distance to the hospital
const hospitalDetail = z
  .object({ lat: latitude.optional(), lng: longitude.optional() })
  .refine(bothOrNeither, bothOrNeitherIssue);

// Without lat/lng the patient's saved home location is used
const suggestedDoctors = z
  .object({ lat: latitude.optional(), lng: longitude.optional(), radiusKm })
  .refine(bothOrNeither, bothOrNeitherIssue);

module.exports = { nearbyHospitals, hospitalDetail, suggestedDoctors };
