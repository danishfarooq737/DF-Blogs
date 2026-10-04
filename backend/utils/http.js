/** Wraps an async route handler so rejected promises reach the error middleware. */
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

/** Creates an Error carrying an HTTP status (and optional field-level details). */
const httpError = (status, message, errors) => Object.assign(new Error(message), { status, errors });

module.exports = { asyncHandler, httpError };
