const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');

const ACCESS_COOKIE = 'access';
const REFRESH_COOKIE = 'refresh';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const baseCookie = () => ({
  httpOnly: true,
  secure: config.cookies.secure,
  sameSite: config.cookies.sameSite,
  domain: config.cookies.domain,
});
const accessCookieOptions = () => ({ ...baseCookie(), path: '/', maxAge: config.jwt.accessTtlSeconds * 1000 });
// The long-lived refresh token is only ever sent to the auth endpoints.
const refreshCookieOptions = () => ({ ...baseCookie(), path: '/api/auth', maxAge: config.jwt.refreshTtlSeconds * 1000 });

function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return null;
  try {
    return jwt.verify(token, secret, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
}

/** Returns the user id encoded in a valid access token, otherwise null. */
const verifyAccessToken = (token) => verifyToken(token, config.jwt.accessSecret)?.sub ?? null;

/** Returns the user id encoded in a valid refresh token, otherwise null. */
const verifyRefreshToken = (token) => verifyToken(token, config.jwt.refreshSecret)?.sub ?? null;

/** Constant-time comparison of a presented refresh token against the stored hash. */
function matchesStoredRefresh(token, storedHash) {
  if (!token || !storedHash) return false;
  const presented = Buffer.from(sha256(token));
  const stored = Buffer.from(storedHash);
  return presented.length === stored.length && crypto.timingSafeEqual(presented, stored);
}

/** Issues a fresh access/refresh pair, stores the refresh hash (rotation) and sets both cookies. */
async function startSession(res, user) {
  const access = jwt.sign({ sub: user.id }, config.jwt.accessSecret, { expiresIn: config.jwt.accessTtlSeconds });
  const refresh = jwt.sign({ sub: user.id, jti: crypto.randomUUID() }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshTtlSeconds,
  });
  user.refreshHash = sha256(refresh);
  await user.save();
  res.cookie(ACCESS_COOKIE, access, accessCookieOptions());
  res.cookie(REFRESH_COOKIE, refresh, refreshCookieOptions());
}

function clearSessionCookies(res) {
  const { maxAge: _a, ...access } = accessCookieOptions();
  const { maxAge: _r, ...refresh } = refreshCookieOptions();
  res.clearCookie(ACCESS_COOKIE, access);
  res.clearCookie(REFRESH_COOKIE, refresh);
}

module.exports = {
  sha256,
  verifyAccessToken,
  verifyRefreshToken,
  matchesStoredRefresh,
  startSession,
  clearSessionCookies,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
};
