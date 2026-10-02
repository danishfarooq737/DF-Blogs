const request = require('supertest');
const app = require('../../app');
const db = require('../helpers/db');
const { createAdmin, createUser, createPost, loginAs } = require('../helpers/factories');
const Comment = require('../../models/Comment');

let post;
beforeAll(db.connect);
beforeEach(async () => {
  post = await createPost(await createAdmin());
});
afterEach(db.clear);
afterAll(db.disconnect);

describe('POST /api/posts/:slug/comments', () => {
  it('rejects anonymous visitors with 401', async () => {
    const res = await request(app).post(`/api/posts/${post.slug}/comments`).send({ content: 'hello there' });
    expect(res.status).toBe(401);
    expect(await Comment.countDocuments()).toBe(0);
  });

  it('lets a signed-in user comment', async () => {
    const user = await createUser();
    const agent = await loginAs(user);
    const res = await agent.post(`/api/posts/${post.slug}/comments`).send({ content: 'Great article!' });
    expect(res.status).toBe(201);
    expect(res.body.comment).toMatchObject({ content: 'Great article!', status: 'approved', author: { name: user.name } });
    expect(JSON.stringify(res.body)).not.toContain(user.email);
  });

  it('strips HTML and scripts from comments (stored XSS)', async () => {
    const agent = await loginAs(await createUser());
    const res = await agent
      .post(`/api/posts/${post.slug}/comments`)
      .send({ content: '<img src=x onerror=alert(1)>Nice <script>alert(2)</script><b>post</b>' });
    expect(res.status).toBe(201);
    expect(res.body.comment.content).toBe('Nice post');
    const stored = await Comment.findOne();
    expect(stored.content).not.toMatch(/[<>]/);
  });

  it.each([
    ['too short', { content: 'a' }],
    ['only markup', { content: '<b></b><i></i>' }],
    ['missing', {}],
    ['wrong type', { content: { $gt: '' } }],
    ['too long (still accepted but truncated)', { content: 'x'.repeat(5000) }],
  ])('validates payloads: %s', async (label, body) => {
    const agent = await loginAs(await createUser());
    const res = await agent.post(`/api/posts/${post.slug}/comments`).send(body);
    if (label.startsWith('too long')) {
      expect(res.status).toBe(201);
      expect(res.body.comment.content).toHaveLength(1000);
    } else {
      expect(res.status).toBe(400);
    }
  });

  it('returns 404 when commenting on unknown or draft posts', async () => {
    const draft = await createPost(await createAdmin(), { status: 'draft' });
    const agent = await loginAs(await createUser());
    expect((await agent.post('/api/posts/nope/comments').send({ content: 'hello' })).status).toBe(404);
    expect((await agent.post(`/api/posts/${draft.slug}/comments`).send({ content: 'hello' })).status).toBe(404);
  });

  it('does not let a deactivated user comment with an old session', async () => {
    const user = await createUser();
    const agent = await loginAs(user);
    user.active = false;
    await user.save();
    const res = await agent.post(`/api/posts/${post.slug}/comments`).send({ content: 'still here?' });
    expect(res.status).toBe(401);
  });
});
