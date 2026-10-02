const bcrypt = require('bcryptjs');
const User = require('../models/User');
const config = require('../config');
const { asyncHandler, httpError } = require('../utils/http');
const tokens = require('../services/tokenService');

const DUMMY_HASH = bcrypt.hashSync('timing-equaliser', config.bcryptCost);

/** Fields that are safe to expose to the browser. */
const toPublicUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role });

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.valid.body;
  if (await User.exists({ email })) throw httpError(409, 'Email already registered');
  const user = await User.create({ name, email, password: await bcrypt.hash(password, config.bcryptCost) });
  await tokens.startSession(res, user);
  res.status(201).json({ user: toPublicUser(user) });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email }).select('+password');
  // Always run bcrypt so response time does not reveal whether the email exists.
  const passwordMatches = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
  if (!user || !user.active || !passwordMatches) throw httpError(401, 'Invalid credentials');
  await tokens.startSession(res, user);
  res.json({ user: toPublicUser(user) });
});

/** Resolves the refresh cookie to an active user whose stored hash matches, otherwise null. */
async function userFromRefreshCookie(refreshToken) {
  const userId = tokens.verifyRefreshToken(refreshToken);
  if (!userId) return null;
  const user = await User.findById(userId).select('+refreshHash');
  if (!user || !user.active || !tokens.matchesStoredRefresh(refreshToken, user.refreshHash)) return null;
  return user;
}

const refresh = asyncHandler(async (req, res) => {
  const user = await userFromRefreshCookie(req.cookies?.refresh);
  if (!user) {
    tokens.clearSessionCookies(res);
    throw httpError(401, 'Session expired');
  }
  await tokens.startSession(res, user);
  res.json({ user: toPublicUser(user) });
});

/**
 * Used by the SPA on start-up. Never responds 401: an anonymous visitor simply gets `{ user: null }`.
 * If only the short-lived access token has expired, the session is silently renewed from the refresh cookie.
 */
const session = asyncHandler(async (req, res) => {
  const accessUserId = tokens.verifyAccessToken(req.cookies?.access);
  if (accessUserId) {
    const user = await User.findById(accessUserId);
    if (user && user.active) return res.json({ user: toPublicUser(user) });
  }
  const user = await userFromRefreshCookie(req.cookies?.refresh);
  if (!user) return res.json({ user: null });
  await tokens.startSession(res, user);
  return res.json({ user: toPublicUser(user) });
});

const logout = asyncHandler(async (req, res) => {
  const userId = tokens.verifyRefreshToken(req.cookies?.refresh);
  if (userId) await User.updateOne({ _id: userId }, { $unset: { refreshHash: 1 } });
  tokens.clearSessionCookies(res);
  res.json({ ok: true });
});

const me = (req, res) => res.json({ user: toPublicUser(req.user) });

module.exports = { register, login, refresh, session, logout, me, toPublicUser };
