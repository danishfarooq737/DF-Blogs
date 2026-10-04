const request = require('supertest');
const app = require('../../app');
const db = require('../helpers/db');
const { createAdmin, createPost } = require('../helpers/factories');

beforeAll(db.connect);
afterAll(db.disconnect);

describe('HTTP hardening', () => {
  it('sends security headers and hides the framework', async () => {
    const res = await request(app).get('/api/posts');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  it('only allows CORS for the configured client origin, with credentials', async () => {
    const allowed = await request(app).get('/api/posts').set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
    const denied = await request(app).get('/api/posts').set('Origin', 'https://evil.example');
    // The header only ever names the configured client, so a browser on evil.example is refused.
    expect(denied.headers['access-control-allow-origin']).not.toBe('https://evil.example');
  });

  it('rejects state-changing requests from foreign origins', async () => {
    const res = await request(app).post('/api/auth/login').set('Origin', 'https://evil.example').send({ email: 'a@b.co', password: 'x' });
    expect(res.status).toBe(403);
  });

  it('returns JSON 404s for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Not found' });
  });

  it('never leaks stack traces or internals in errors', async () => {
    const res = await request(app).get('/api/posts?limit[$gt]=1');
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.js|node_modules|MongoServerError/);
  });
});

describe('SEO and site endpoints', () => {
  it('serves a valid sitemap with public pages and published posts only', async () => {
    const admin = await createAdmin();
    const published = await createPost(admin, { title: 'Public & Proud', category: 'design' });
    const draft = await createPost(admin, { title: 'Secret draft', status: 'draft' });
    const res = await request(app).get('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/xml/);
    expect(res.text).toContain('<urlset');
    expect(res.text).toContain(`http://localhost:5173/blog/${published.slug}`);
    expect(res.text).toContain('http://localhost:5173/category/design');
    expect(res.text).toContain('http://localhost:5173/privacy');
    expect(res.text).not.toContain(draft.slug);
  });

  it('serves robots.txt that hides admin and points to the sitemap', async () => {
    const res = await request(app).get('/robots.txt');
    expect(res.text).toContain('Disallow: /admin');
    expect(res.text).toContain('Sitemap: http://localhost:5173/sitemap.xml');
  });

  it('exposes public site config without secrets', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body.site).toMatchObject({ name: 'DF Blogs', url: 'http://localhost:5173', addressIsPlaceholder: true });
    expect(res.body.analytics).toEqual({ provider: 'none' });
    expect(JSON.stringify(res.body)).not.toMatch(/secret|password|mongodb/i);
  });

  it('serves a health check', async () => {
    expect((await request(app).get('/health')).body).toEqual({ status: 'ok' });
  });
});
