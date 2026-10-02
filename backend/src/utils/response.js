/**
 * Every successful response has the same shape:
 * { "success": true, "message": "...", "data": { ... } }
 */
function sendSuccess(res, { status = 200, message = 'OK', data = null } = {}) {
  return res.status(status).json({ success: true, message, data });
}

module.exports = { sendSuccess };
