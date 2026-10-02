const request = require('supertest');
const app = require('../../app');
const db = require('../helpers/db');
const { createUser, PASSWORD } = require('../helpers/factories');
const User = require('../../models/User');

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.disconnect);

const cookieNames = (res) => (res.headers['set-cookie'] || []).map((c) => c.split('=')[0]);
const cookieLine = (res, name) => (res.headers['set-cookie'] || []).find((c) => c.startsWith(`${name}=`)) || '';

describe('POST /api/auth/register', () => {
  const payload = { name: 'Ada Lovelace', email: 'ada@example.com', password: 'Analytical1' };

  it('creates an account, hashes the password and logs the user in', async () => {
    const res = await request(app).post('/api/auth/register').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({ id: expect.any(String), name: 'Ada Lovelace', email: 'ada@example.com', role: 'user' });
    expect(cookieNames(res)).toEqual(expect.arrayContaining(['access', 'refresh']));

    const stored = await User.findOne({ email: payload.email }).select('+password');
    expect(stored.password).not.toBe(payload.password);
    expect(stored.password).toMatch(/^\$2[aby]\$/);
  });

  it('never returns secrets in the response body', async () => {
    const res = await request(app).post('/api/auth/register').send(payload);
    expect(JSON.stringify(res.body)).not.toMatch(/password|refreshHash|\$2a\$|\$2b\$/i);
  });

  it('cannot be used to self-assign the admin role', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...payload, role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('user');
  });

  it('rejects duplicate emails with 409 (case-insensitive)', async () => {
    await request(app).post('/api/auth/register').send(payload);
    const res = await request(app).post('/api/auth/register').send({ ...payload, email: 'ADA@example.com' });
    expect(res.status).toBe(409);
  });

  it.each([
    ['weak password', { password: 'short1' }],
    ['no digit', { password: 'nodigitshere' }],
    ['invalid email', { email: 'nope' }],
    ['missing name', { name: '' }],
  ])('returns 400 for %s', async (_label, override) => {
    const res = await request(app).post('/api/auth/register').send({ ...payload, ...override });
    expect(res.status).toBe(400);
    expect(res.body.message).toEqual(expect.any(String));
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials and sets HttpOnly cookies', async () => {
    const user = await createUser();
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(user.email);
    expect(cookieLine(res, 'access')).toMatch(/HttpOnly/i);
    expect(cookieLine(res, 'access')).toMatch(/SameSite=Lax/i);
    expect(cookieLine(res, 'refresh')).toMatch(/HttpOnly/i);
    expect(cookieLine(res, 'refresh')).toMatch(/Path=\/api\/auth/);
  });

  it('gives the same 401 for wrong password and unknown email', async () => {
    const user = await createUser();
    const wrongPassword = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Wrong12345' });
    const unknownEmail = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'Wrong12345' });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it('rejects NoSQL-injection payloads', async () => {
    await createUser();
    const res = await request(app).post('/api/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(400);
    expect(cookieNames(res)).toEqual([]);
  });

  it('refuses deactivated accounts', async () => {
    const user = await createUser({ active: false });
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD });
    expect(res.status).toBe(401);
  });
});

describe('sessions', () => {
  it('GET /session returns { user: null } (200) for anonymous visitors', async () => {
    const res = await request(app).get('/api/auth/session');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: null });
  });

  it('GET /me requires authentication', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
  });

  it('rotates the refresh token and rejects the previous one', async () => {
    const user = await createUser();
    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD });
    const oldRefresh = cookieLine(login, 'refresh').split(';')[0];

    const first = await request(app).post('/api/auth/refresh').set('Cookie', oldRefresh);
    expect(first.status).toBe(200);
    const newRefresh = cookieLine(first, 'refresh').split(';')[0];
    expect(newRefresh).not.toBe(oldRefresh);

    const replay = await request(app).post('/api/auth/refresh').set('Cookie', oldRefresh);
    expect(replay.status).toBe(401);

    const again = await request(app).post('/api/auth/refresh').set('Cookie', newRefresh);
    expect(again.status).toBe(200);
  });

  it('GET /session silently renews an expired access token from the refresh cookie', async () => {
    const user = await createUser();
    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD });
    const refreshOnly = cookieLine(login, 'refresh').split(';')[0];
    const res = await request(app).get('/api/auth/session').set('Cookie', refreshOnly);
    expect(res.body.user.email).toBe(user.email);
    expect(cookieNames(res)).toContain('access');
  });

  it('logout revokes the refresh token server-side', async () => {
    const user = await createUser();
    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD });
    const cookies = login.headers['set-cookie'].map((c) => c.split(';')[0]);

    const logout = await request(app).post('/api/auth/logout').set('Cookie', cookies);
    expect(logout.status).toBe(200);
    expect(cookieLine(logout, 'access')).toMatch(/Expires=Thu, 01 Jan 1970/);

    const stolenReuse = await request(app).post('/api/auth/refresh').set('Cookie', cookies);
    expect(stolenReuse.status).toBe(401);
  });

  it('rejects forged, tampered and garbage tokens', async () => {
    for (const token of ['garbage', 'a.b.c', '']) {
      const res = await request(app).get('/api/auth/me').set('Cookie', `access=${token}`);
      expect(res.status).toBe(401);
    }
  });

  it('stops honouring sessions of deactivated users immediately', async () => {
    const user = await createUser();
    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD });
    const cookies = login.headers['set-cookie'].map((c) => c.split(';')[0]);
    await User.updateOne({ _id: user.id }, { active: false });
    expect((await request(app).get('/api/auth/me').set('Cookie', cookies)).status).toBe(401);
  });
});
