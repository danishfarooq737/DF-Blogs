const jwt = require('jsonwebtoken');
const tokens = require('../../services/tokenService');
const config = require('../../config');

const fakeRes = () => {
  const cookies = {};
  return { cookies, cookie: (name, value, options) => { cookies[name] = { value, options }; }, clearCookie: jest.fn() };
};

describe('tokenService', () => {
  it('startSession sets HTTP-only cookies and stores only a hash of the refresh token', async () => {
    const res = fakeRes();
    const user = { id: 'u1', save: jest.fn() };
    await tokens.startSession(res, user);

    expect(res.cookies.access.options).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' });
    expect(res.cookies.refresh.options).toMatchObject({ httpOnly: true, path: '/api/auth' });
    expect(user.refreshHash).toBe(tokens.sha256(res.cookies.refresh.value));
    expect(user.refreshHash).not.toBe(res.cookies.refresh.value);
    expect(user.save).toHaveBeenCalled();
  });

  it('issues a short-lived access token and a longer-lived refresh token', async () => {
    const res = fakeRes();
    await tokens.startSession(res, { id: 'u1', save: jest.fn() });
    const access = jwt.decode(res.cookies.access.value);
    const refresh = jwt.decode(res.cookies.refresh.value);
    expect(access.exp - access.iat).toBe(15 * 60);
    expect(refresh.exp - refresh.iat).toBe(7 * 24 * 60 * 60);
  });

  it('verifies tokens with the right secret only', () => {
    const access = jwt.sign({ sub: 'abc' }, config.jwt.accessSecret, { expiresIn: 60 });
    expect(tokens.verifyAccessToken(access)).toBe('abc');
    expect(tokens.verifyRefreshToken(access)).toBeNull();
  });

  it.each([
    ['garbage', 'not-a-token'],
    ['empty', ''],
    ['undefined', undefined],
    ['an object', { a: 1 }],
  ])('rejects %s', (_label, value) => {
    expect(tokens.verifyAccessToken(value)).toBeNull();
  });

  it('rejects expired tokens and tokens signed with alg "none"', () => {
    const expired = jwt.sign({ sub: 'abc' }, config.jwt.accessSecret, { expiresIn: -10 });
    expect(tokens.verifyAccessToken(expired)).toBeNull();
    const unsigned = jwt.sign({ sub: 'abc' }, '', { algorithm: 'none' });
    expect(tokens.verifyAccessToken(unsigned)).toBeNull();
  });

  it('compares refresh tokens against the stored hash', () => {
    expect(tokens.matchesStoredRefresh('tok', tokens.sha256('tok'))).toBe(true);
    expect(tokens.matchesStoredRefresh('other', tokens.sha256('tok'))).toBe(false);
    expect(tokens.matchesStoredRefresh('tok', undefined)).toBe(false);
  });
});
