/**
 * System test: the complete visitor journey through the HTTP API with a real cookie jar.
 * open site → browse → search → filter → read → sign up → comment → feedback.
 */
const request = require('supertest');
const app = require('../../app');
const db = require('../helpers/db');
const { createAdmin, createPost } = require('../helpers/factories');

beforeAll(async () => {
  await db.connect();
  const admin = await createAdmin();
  await createPost(admin, { title: 'Securing Express APIs', category: 'security', tags: ['node', 'jwt'], content: '<h2>Headers</h2><p>Use helmet and rate limits.</p>' });
  await createPost(admin, { title: 'Accessible design basics', category: 'design', tags: ['a11y'] });
  await createPost(admin, { title: 'Draft nobody should see', status: 'draft' });
});
afterAll(db.disconnect);

it('lets a visitor browse, search, filter, read, register and comment', async () => {
  const visitor = request.agent(app);

  // 1. Open the website: site config, session and the post list.
  expect((await visitor.get('/api/config')).status).toBe(200);
  expect((await visitor.get('/api/auth/session')).body).toEqual({ user: null });
  const home = await visitor.get('/api/posts');
  expect(home.body.total).toBe(2);
  const titles = home.body.posts.map((p) => p.title);
  expect(titles).not.toContain('Draft nobody should see');

  // 2. Filters and search.
  const meta = await visitor.get('/api/posts/meta');
  expect(meta.body.categories.map((c) => c.name).sort()).toEqual(['design', 'security']);
  expect((await visitor.get('/api/posts?category=security')).body.posts).toHaveLength(1);
  expect((await visitor.get('/api/posts?tag=a11y')).body.posts).toHaveLength(1);
  const search = await visitor.get('/api/posts?q=helmet');
  expect(search.body.posts.map((p) => p.title)).toEqual(['Securing Express APIs']);
  expect((await visitor.get('/api/posts?q=nothingmatches')).body.posts).toEqual([]);

  // 3. Read the article.
  const { slug } = search.body.posts[0];
  const article = await visitor.get(`/api/posts/${slug}`);
  expect(article.body.post.content).toContain('<h2>Headers</h2>');
  expect(article.body.comments).toEqual([]);

  // 4. Anonymous commenting is refused, so register.
  expect((await visitor.post(`/api/posts/${slug}/comments`).send({ content: 'first!' })).status).toBe(401);
  const register = await visitor.post('/api/auth/register').send({ name: 'New Reader', email: 'new@example.com', password: 'Readers12345' });
  expect(register.status).toBe(201);

  // 5. Validation feedback, then a successful comment that everyone can now see.
  const tooShort = await visitor.post(`/api/posts/${slug}/comments`).send({ content: 'x' });
  expect(tooShort.status).toBe(400);
  expect(tooShort.body.message).toMatch(/at least 2/);
  const posted = await visitor.post(`/api/posts/${slug}/comments`).send({ content: 'Thanks, very useful!' });
  expect(posted.status).toBe(201);
  const anonymousView = await request(app).get(`/api/posts/${slug}`);
  expect(anonymousView.body.comments.map((c) => c.content)).toEqual(['Thanks, very useful!']);
  expect(anonymousView.body.related.map((p) => p.title)).toEqual([]);

  // 6. Visitors cannot reach the admin area.
  expect((await visitor.get('/api/admin/stats')).status).toBe(403);
});
