const ApiError = require('../utils/ApiError');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** router.param handler that returns 404 for ids that are not UUIDs. */
function uuidParam(code, message) {
  return (req, res, next, value) => {
    if (!UUID_RE.test(value)) throw ApiError.notFound(code, message);
    next();
  };
}

module.exports = { uuidParam };
