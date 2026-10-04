const { httpError } = require('../utils/http');

/**
 * Validates `req[source]` with a zod schema. On success the parsed (sanitised)
 * value is available as `req.valid[source]`; on failure a 400 is raised.
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || source,
      message: issue.message,
    }));
    return next(httpError(400, errors[0].message, errors));
  }
  req.valid = { ...(req.valid || {}), [source]: result.data };
  return next();
};

module.exports = { validate };
