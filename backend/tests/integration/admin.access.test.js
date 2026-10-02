const request = require('supertest');
const app = require('../../app');
const db = require('../helpers/db');
const { createAdmin, createUser, createPost, createComment, loginAs } = require('../helpers/factories');

const ID = '64b7f0f0f0f0f0f0f0f0f0f0';
const ADMIN_ROUTES = [
  ['get', '/api/admin/stats'],
  ['post', '/api/admin/upload'],
  ['get', '/api/admin/posts'],
  ['post', '/api/admin/posts'],
  ['get', `/api/admin/posts/${ID}`],
  ['put', `/api/admin/posts/${ID}`],
  ['delete', `/api/admin/posts/${ID}`],
  ['get', '/api/admin/users'],
  ['patch', `/api/admin/users/${ID}`],
  ['delete', `/api/admin/users/${ID}`],
  ['get', '/api/admin/comments'],
  ['patch', `/api/admin/comments/${ID}`],
  ['delete', `/api/admin/comments/${ID}`],
  ['get', '/api/admin/taxonomy'],
  ['patch', '/api/admin/taxonomy/tag/node'],
  ['delete', '/api/admin/taxonomy/tag/node'],
];

let regularAgent;
beforeAll(async () => {
  await db.connect();
  regularAgent = await loginAs(await createUser());
});
afterAll(db.disconnect);

describe('admin API authorization matrix', () => {
  it.each(ADMIN_ROUTES)('%s %s → 401 for anonymous visitors', async (method, url) => {
    const res = await request(app)[method](url).send({});
    expect(res.status).toBe(401);
  });

  it.each(ADMIN_ROUTES)('%s %s → 403 for signed-in non-admins', async (method, url) => {
    const res = await regularAgent[method](url).send({});
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/admin/i);
  });

  it('ignores role claims sent by the client', async () => {
    const res = await regularAgent.get('/api/admin/stats').set('X-User-Role', 'admin').query({ role: 'admin' });
    expect(res.status).toBe(403);
  });

  it('allows administrators', async () => {
    const agent = await loginAs(await createAdmin());
    expect((await agent.get('/api/admin/stats')).status).toBe(200);
  });

  it('revokes admin access the moment the role is removed', async () => {
    const admin = await createAdmin();
    const agent = await loginAs(admin);
    expect((await agent.get('/api/admin/stats')).status).toBe(200);
    admin.role = 'user';
    await admin.save();
    expect((await agent.get('/api/admin/stats')).status).toBe(403);
  });

  it('rejects state-changing admin requests from foreign origins (CSRF defence in depth)', async () => {
    const agent = await loginAs(await createAdmin());
    const res = await agent.post('/api/admin/posts').set('Origin', 'https://evil.example').send({ title: 'x', content: '<p>x</p>' });
    expect(res.status).toBe(403);
  });
});

describe('malformed identifiers', () => {
  it('return 400, not 500', async () => {
    const agent = await loginAs(await createAdmin());
    for (const url of ['/api/admin/posts/not-an-id', '/api/admin/users/123', '/api/admin/comments/%24where']) {
      expect((await agent.get(url)).status).toBeLessThan(500);
    }
    expect((await agent.get('/api/admin/posts/not-an-id')).status).toBe(400);
    expect((await agent.delete('/api/admin/comments/xyz')).status).toBe(400);
    expect((await agent.patch('/api/admin/users/abc').send({ active: false })).status).toBe(400);
  });

  it('return 404 for well-formed ids that do not exist', async () => {
    const agent = await loginAs(await createAdmin());
    expect((await agent.get(`/api/admin/posts/${ID}`)).status).toBe(404);
    expect((await agent.delete(`/api/admin/comments/${ID}`)).status).toBe(404);
    expect((await agent.patch(`/api/admin/comments/${ID}`).send({ status: 'hidden' })).status).toBe(404);
  });
});

describe('dashboard stats', () => {
  it('counts posts, drafts, users and comments', async () => {
    await db.clear();
    const admin = await createAdmin();
    const agent = await loginAs(admin);
    const published = await createPost(admin);
    await createPost(admin, { status: 'draft' });
    await createComment(published, admin);
    await createComment(published, admin, { status: 'hidden' });
    const { body } = await agent.get('/api/admin/stats');
    expect(body).toEqual({ posts: 2, published: 1, drafts: 1, users: 1, comments: 2, hiddenComments: 1 });
  });
});
