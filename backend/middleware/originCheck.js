const config = require('../config');
const { httpError } = require('../utils/http');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Defence-in-depth CSRF protection. Browsers always attach an Origin header to
 * cross-site state-changing requests; anything not coming from our own client is refused.
 * Requests without an Origin (curl, server-to-server, tests) are not browser-driven CSRF vectors.
 */
const originCheck = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const { origin } = req.headers;
  if (origin && origin !== config.clientUrl) return next(httpError(403, 'Request origin not allowed'));
  return next();
};

module.exports = { originCheck };
