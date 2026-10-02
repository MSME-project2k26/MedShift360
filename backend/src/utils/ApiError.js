/**
 * An error that is safe to send to the client. `code` is a stable,
 * machine-readable string the frontend can switch on; `message` is a
 * plain-language sentence that can be shown to the user directly.
 */
class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(code, message, details) {
    return new ApiError(400, code, message, details);
  }

  static unauthorized(code, message, details) {
    return new ApiError(401, code, message, details);
  }

  static forbidden(code, message, details) {
    return new ApiError(403, code, message, details);
  }

  static notFound(code, message, details) {
    return new ApiError(404, code, message, details);
  }

  static conflict(code, message, details) {
    return new ApiError(409, code, message, details);
  }

  static locked(code, message, details) {
    return new ApiError(423, code, message, details);
  }

  static tooMany(code, message, details) {
    return new ApiError(429, code, message, details);
  }

  static badGateway(code, message, details) {
    return new ApiError(502, code, message, details);
  }
}

module.exports = ApiError;
