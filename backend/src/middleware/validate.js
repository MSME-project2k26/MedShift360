/**
 * Validates req.body (and optionally req.query) against Zod schemas.
 * On success, req.body is replaced with the parsed (trimmed, normalised)
 * value and the parsed query is placed on req.validatedQuery.
 * ZodErrors are turned into a 400 response by the error handler.
 */
function validate({ body, query } = {}) {
  return (req, res, next) => {
    if (body) req.body = body.parse(req.body ?? {});
    if (query) req.validatedQuery = query.parse(req.query ?? {});
    next();
  };
}

module.exports = validate;
