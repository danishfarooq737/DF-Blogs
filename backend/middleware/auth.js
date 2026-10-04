const User = require('../models/User');
const { asyncHandler, httpError } = require('../utils/http');
const { verifyAccessToken } = require('../services/tokenService');

/** Requires a valid access cookie and an active account; re-checks the database on every request. */
const requireAuth = asyncHandler(async (req, res, next) => {
  const userId = verifyAccessToken(req.cookies?.access);
  if (!userId) throw httpError(401, 'Authentication required');
  const user = await User.findById(userId);
  if (!user || !user.active) throw httpError(401, 'Account unavailable');
  req.user = user;
  next();
});

const requireRole = (role) => (req, res, next) =>
  req.user.role === role ? next() : next(httpError(403, `${role[0].toUpperCase()}${role.slice(1)} access required`));

const requireAdmin = [requireAuth, requireRole('admin')];

module.exports = { requireAuth, requireAdmin, requireRole };
