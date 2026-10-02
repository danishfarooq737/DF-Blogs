const db = require('../helpers/db');
const { createAdmin, createPost, loginAs } = require('../helpers/factories');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');
const request = require('supertest');
const app = require('../../app');

let admin;
let agent;
beforeAll(db.connect);
beforeEach(async () => {
  admin = await createAdmin();
  agent = await loginAs(admin);
});
afterEach(db.clear);
afterAll(db.disconnect);

const body = (overrides = {}) => ({ title: 'My First Post', content: '<p>Hello <strong>world</strong></p>', ...overrides });

describe('creating posts', () => {
  it('creates a draft with safe defaults and a slug', async () => {
    const res = await agent.post('/api/admin/posts').send(body());
    expect(res.status).toBe(201);
    expect(res.body.post).toMatchObject({ title: 'My First Post', slug: 'my-first-post', status: 'draft', category: 'general', tags: [] });
    expect(res.body.post.publishedAt).toBeUndefined();
    expect(res.body.post.author).toBe(admin.id);
  });

  it('sets publishedAt when created as published, and exposes it publicly', async () => {
    const res = await agent.post('/api/admin/posts').send(body({ status: 'published', category: 'Design', tags: ['UX', 'ux', 'CSS'] }));
    expect(res.body.post.publishedAt).toBeTruthy();
    expect(res.body.post).toMatchObject({ category: 'design', tags: ['ux', 'css'] });
    const publicRes = await request(app).get('/api/posts/my-first-post');
    expect(publicRes.status).toBe(200);
  });

  it('generates unique slugs for duplicate titles', async () => {
    await agent.post('/api/admin/posts').send(body());
    const second = await agent.post('/api/admin/posts').send(body());
    const third = await agent.post('/api/admin/posts').send(body());
    expect(second.body.post.slug).toBe('my-first-post-2');
    expect(third.body.post.slug).toBe('my-first-post-3');
  });

  it('sanitises rich text before storing it (XSS)', async () => {
    const res = await agent.post('/api/admin/posts').send(
      body({
        title: '<script>alert(1)</script>Safe title',
        content: '<h2>Ok</h2><script>alert(1)</script><p onmouseover="x()">hi</p><a href="javascript:alert(1)">bad</a><img src=x onerror=alert(1)>',
      }),
    );
    expect(res.status).toBe(201);
    expect(res.body.post.title).toBe('Safe title');
    const html = res.body.post.content;
    expect(html).toContain('<h2>Ok</h2>');
    expect(html).not.toMatch(/script|onmouseover|javascript:|onerror|<img/i);
  });

  it('does not allow mass-assignment of protected fields', async () => {
    const other = await createAdmin();
    const res = await agent.post('/api/admin/posts').send(body({ author: other.id, slug: 'hijacked', _id: '64b7f0f0f0f0f0f0f0f0f0f0', publishedAt: '2001-01-01' }));
    expect(res.status).toBe(201);
    expect(res.body.post.author).toBe(admin.id);
    expect(res.body.post.slug).toBe('my-first-post');
    expect(res.body.post._id).not.toBe('64b7f0f0f0f0f0f0f0f0f0f0');
    expect(res.body.post.publishedAt).toBeUndefined();
  });

  it.each([
    ['missing title', { title: '' }],
    ['empty content', { content: '<p><br></p>' }],
    ['unknown status', { status: 'archived' }],
    ['invalid category', { category: '../etc/passwd' }],
    ['external featured image', { image: { url: 'https://evil.example/a.png', alt: 'x' } }],
    ['featured image without alt text', { image: { url: 'http://localhost:5000/uploads/a.webp', alt: '' } }],
    ['title as object', { title: { $ne: '' } }],
  ])('returns 400 for %s', async (_label, override) => {
    const res = await agent.post('/api/admin/posts').send(body(override));
    expect(res.status).toBe(400);
  });

  it('rejects oversized bodies with 413', async () => {
    const res = await agent.post('/api/admin/posts').send(body({ content: `<p>${'x'.repeat(300_000)}</p>` }));
    expect(res.status).toBe(413);
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await agent.post('/api/admin/posts').set('Content-Type', 'application/json').send('{"title": ');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Malformed JSON body');
  });
});

describe('updating, publishing and unpublishing', () => {
  it('edits a post, keeping its slug stable', async () => {
    const post = await createPost(admin, { title: 'Original title' });
    const res = await agent.put(`/api/admin/posts/${post.id}`).send(body({ title: 'Renamed', status: 'published' }));
    expect(res.status).toBe(200);
    expect(res.body.post).toMatchObject({ title: 'Renamed', slug: post.slug });
  });

  it('publishes, unpublishes and republishes while preserving the original publish date', async () => {
    const draft = await createPost(admin, { status: 'draft', publishedAt: undefined });
    const published = await agent.put(`/api/admin/posts/${draft.id}`).send(body({ status: 'published' }));
    const firstDate = published.body.post.publishedAt;
    expect(firstDate).toBeTruthy();
    expect((await request(app).get(`/api/posts/${draft.slug}`)).status).toBe(200);

    await agent.put(`/api/admin/posts/${draft.id}`).send(body({ status: 'draft' }));
    expect((await request(app).get(`/api/posts/${draft.slug}`)).status).toBe(404);

    const again = await agent.put(`/api/admin/posts/${draft.id}`).send(body({ status: 'published' }));
    expect(again.body.post.publishedAt).toBe(firstDate);
  });

  it('returns 404 when updating a missing post', async () => {
    const res = await agent.put('/api/admin/posts/64b7f0f0f0f0f0f0f0f0f0f0').send(body());
    expect(res.status).toBe(404);
  });
});

describe('listing and deleting', () => {
  it('lists drafts and published posts, with search and status filters', async () => {
    await createPost(admin, { title: 'Alpha guide' });
    await createPost(admin, { title: 'Beta draft', status: 'draft' });
    const all = await agent.get('/api/admin/posts');
    expect(all.body.total).toBe(2);
    expect(all.body.posts[0].content).toBeUndefined();
    expect((await agent.get('/api/admin/posts?status=draft')).body.posts.map((p) => p.title)).toEqual(['Beta draft']);
    expect((await agent.get('/api/admin/posts?q=alph')).body.posts.map((p) => p.title)).toEqual(['Alpha guide']);
  });

  it('deletes a post together with its comments', async () => {
    const post = await createPost(admin);
    await Comment.create({ post: post.id, author: admin.id, content: 'to be removed' });
    const res = await agent.delete(`/api/admin/posts/${post.id}`);
    expect(res.status).toBe(200);
    expect(await Post.countDocuments()).toBe(0);
    expect(await Comment.countDocuments()).toBe(0);
    expect((await agent.delete(`/api/admin/posts/${post.id}`)).status).toBe(404);
  });
});
