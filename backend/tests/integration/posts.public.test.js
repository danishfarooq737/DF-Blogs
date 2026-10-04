const request = require('supertest');
const app = require('../../app');
const db = require('../helpers/db');
const { createAdmin, createUser, createPost, createComment } = require('../helpers/factories');

let admin;
beforeAll(async () => {
  await db.connect();
});
beforeEach(async () => {
  admin = await createAdmin();
});
afterEach(db.clear);
afterAll(db.disconnect);

describe('GET /api/posts', () => {
  it('lists only published posts, newest first, without the full content', async () => {
    const older = await createPost(admin, { title: 'Older', publishedAt: new Date('2025-01-01') });
    const newer = await createPost(admin, { title: 'Newer', publishedAt: new Date('2026-01-01') });
    await createPost(admin, { title: 'Hidden draft', status: 'draft' });

    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(200);
    expect(res.body.posts.map((p) => p.title)).toEqual([newer.title, older.title]);
    expect(res.body.posts[0].content).toBeUndefined();
    expect(res.body.posts[0].plainText).toBeUndefined();
    expect(res.body.posts[0].author).toEqual({ _id: admin.id, name: admin.name });
    expect(res.body).toMatchObject({ page: 1, pages: 1, total: 2 });
  });

  it('paginates', async () => {
    for (let i = 0; i < 11; i += 1) await createPost(admin);
    const first = await request(app).get('/api/posts?limit=5');
    const third = await request(app).get('/api/posts?limit=5&page=3');
    expect(first.body).toMatchObject({ pages: 3, total: 11 });
    expect(first.body.posts).toHaveLength(5);
    expect(third.body.posts).toHaveLength(1);
  });

  it('filters by category, tag, and both combined', async () => {
    await createPost(admin, { title: 'A', category: 'design', tags: ['ux'] });
    await createPost(admin, { title: 'B', category: 'design', tags: ['css'] });
    await createPost(admin, { title: 'C', category: 'security', tags: ['ux'] });

    const titles = async (qs) => (await request(app).get(`/api/posts?${qs}`)).body.posts.map((p) => p.title).sort();
    expect(await titles('category=design')).toEqual(['A', 'B']);
    expect(await titles('tag=ux')).toEqual(['A', 'C']);
    expect(await titles('category=design&tag=ux')).toEqual(['A']);
    expect(await titles('category=nothing')).toEqual([]);
  });

  describe('search', () => {
    beforeEach(async () => {
      await createPost(admin, { title: 'Securing Express APIs', excerpt: 'headers and limits', content: '<p>Use helmet</p>', tags: ['node'] });
      await createPost(admin, { title: 'Design tokens', excerpt: 'colour systems', content: '<p>Semantic variables for theming</p>', tags: ['css'] });
    });
    const search = (q) => request(app).get('/api/posts').query({ q });

    it('matches titles, excerpts, body text and tags, case-insensitively', async () => {
      expect((await search('SECUR')).body.total).toBe(1);
      expect((await search('colour')).body.total).toBe(1);
      expect((await search('theming')).body.total).toBe(1);
      expect((await search('css')).body.total).toBe(1);
    });

    it('requires every word to match', async () => {
      expect((await search('express helmet')).body.total).toBe(1);
      expect((await search('express theming')).body.total).toBe(0);
    });

    it('treats regex characters literally and never errors', async () => {
      for (const q of ['.*', '(unclosed', '[a-', '\\', 'a{1,', '$where']) {
        const res = await search(q);
        expect(res.status).toBe(200);
        expect(res.body.total).toBe(0);
      }
    });

    it('returns an empty list for no results and everything for empty/blank search', async () => {
      expect((await search('zzzzzz')).body).toMatchObject({ posts: [], total: 0 });
      expect((await search('')).body.total).toBe(2);
      expect((await search('   ')).body.total).toBe(2);
    });

    it('does not search draft posts', async () => {
      await createPost(admin, { title: 'Secret unreleased plan', status: 'draft' });
      expect((await search('unreleased')).body.total).toBe(0);
    });

    it('rejects malformed (array / object) query parameters', async () => {
      expect((await request(app).get('/api/posts?q[]=a&q[]=b')).status).toBe(400);
      expect((await request(app).get('/api/posts?category[a]=b')).status).toBe(400);
    });
  });

  it('ignores operator injection in filters', async () => {
    await createPost(admin, { category: 'design' });
    const res = await request(app).get('/api/posts?category[$ne]=design');
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) expect(res.body.total).toBe(0);
  });
});

describe('GET /api/posts/meta and /popular', () => {
  it('returns category and tag counts for published posts only', async () => {
    await createPost(admin, { category: 'design', tags: ['ux', 'css'] });
    await createPost(admin, { category: 'design', tags: ['ux'] });
    await createPost(admin, { category: 'draft-only', tags: ['secret'], status: 'draft' });

    const { body } = await request(app).get('/api/posts/meta');
    expect(body.categories).toEqual([{ name: 'design', count: 2 }]);
    expect(body.tags).toEqual([{ name: 'ux', count: 2 }, { name: 'css', count: 1 }]);
  });

  it('ranks popular posts by approved comments', async () => {
    const quiet = await createPost(admin, { title: 'Quiet' });
    const busy = await createPost(admin, { title: 'Busy' });
    const reader = await createUser();
    await createComment(busy, reader);
    await createComment(busy, reader);
    await createComment(quiet, reader);
    await createComment(quiet, reader, { status: 'hidden' });
    await createComment(quiet, reader, { status: 'hidden' });
    await createComment(quiet, reader, { status: 'hidden' });

    const { body } = await request(app).get('/api/posts/popular');
    expect(body.posts.map((p) => p.title)).toEqual(['Busy', 'Quiet']);
  });
});

describe('GET /api/posts/:slug', () => {
  it('returns the post, approved comments only, and related posts', async () => {
    const post = await createPost(admin, { title: 'Main', category: 'design', tags: ['ux'] });
    const related = await createPost(admin, { title: 'Related by tag', category: 'other', tags: ['ux'] });
    await createPost(admin, { title: 'Unrelated', category: 'other', tags: ['zzz'] });
    const reader = await createUser();
    await createComment(post, reader, { content: 'visible comment' });
    await createComment(post, reader, { content: 'moderated comment', status: 'hidden' });

    const res = await request(app).get(`/api/posts/${post.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.post.content).toContain('Body of post');
    expect(res.body.comments.map((c) => c.content)).toEqual(['visible comment']);
    expect(res.body.related.map((p) => p.title)).toEqual([related.title]);
    expect(res.body.comments[0].author).toEqual({ _id: reader.id, name: reader.name });
    expect(JSON.stringify(res.body)).not.toContain(reader.email);
  });

  it('returns 404 for unknown slugs and for drafts', async () => {
    const draft = await createPost(admin, { status: 'draft' });
    expect((await request(app).get('/api/posts/does-not-exist')).status).toBe(404);
    expect((await request(app).get(`/api/posts/${draft.slug}`)).status).toBe(404);
  });
});
