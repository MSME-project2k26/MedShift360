const { sendSuccess } = require('../utils/response');
const hospitalService = require('../services/hospital.service');
const doctorSuggestionService = require('../services/doctorSuggestion.service');

/** GET /hospitals/nearby */
async function nearbyHospitals(req, res) {
  const data = await hospitalService.nearbyHospitals(req.validatedQuery);
  return sendSuccess(res, { data });
}

/** GET /hospitals/:hospitalId */
async function hospitalDetail(req, res) {
  const { lat, lng } = req.validatedQuery;
  const data = await hospitalService.hospitalDetail(req.params.hospitalId, lat === undefined ? null : { lat, lng });
  return sendSuccess(res, { data });
}

/** GET .../suggested-doctors (acts on req.subjectId) */
async function suggestedDoctors(req, res) {
  const data = await doctorSuggestionService.suggestDoctors(req.subjectId, req.validatedQuery);
  return sendSuccess(res, { data });
}

module.exports = { nearbyHospitals, hospitalDetail, suggestedDoctors };
