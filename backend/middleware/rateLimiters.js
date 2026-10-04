const rateLimit = require('express-rate-limit');

const build = (windowMs, limit, message) =>
  rateLimit({ windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false, message: { message } });

const limiters = {
  apiLimiter: build(60_000, 300, 'Too many requests, please slow down'),
  authLimiter: build(15 * 60_000, 20, 'Too many attempts, please try again later'),
  commentLimiter: build(60_000, 5, 'Too many comments, please slow down'),
  uploadLimiter: build(60_000, 30, 'Too many uploads, please slow down'),
};

/** Clears the in-memory counters for a client address (used by the automated tests). */
const resetLimiters = (ip) => Object.values(limiters).forEach((limiter) => limiter.resetKey(ip));

module.exports = { ...limiters, resetLimiters };
