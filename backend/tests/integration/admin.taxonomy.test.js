const request = require('supertest');
const app = require('../../app');
const db = require('../helpers/db');
const { createAdmin, createPost, loginAs } = require('../helpers/factories');
const Post = require('../../models/Post');

let admin;
let agent;
beforeAll(db.connect);
beforeEach(async () => {
  admin = await createAdmin();
  agent = await loginAs(admin);
  await createPost(admin, { category: 'design', tags: ['ux', 'css'] });
  await createPost(admin, { category: 'design', tags: ['ux'], status: 'draft' });
  await createPost(admin, { category: 'security', tags: ['node', 'ux'] });
});
afterEach(db.clear);
afterAll(db.disconnect);

it('lists categories and tags across drafts and published posts with counts', async () => {
  const { body } = await agent.get('/api/admin/taxonomy');
  expect(body.categories).toEqual([{ name: 'design', count: 2 }, { name: 'security', count: 1 }]);
  expect(body.tags).toEqual([{ name: 'css', count: 1 }, { name: 'node', count: 1 }, { name: 'ux', count: 3 }]);
});

it('renames a category everywhere', async () => {
  const res = await agent.patch('/api/admin/taxonomy/category/design').send({ name: 'Product Design' });
  expect(res.status).toBe(200);
  expect(await Post.countDocuments({ category: 'product design' })).toBe(2);
  expect((await request(app).get('/api/posts?category=product%20design')).body.total).toBe(1);
});

it('merges a tag into an existing tag without creating duplicates', async () => {
  await agent.patch('/api/admin/taxonomy/tag/css').send({ name: 'ux' });
  const post = await Post.findOne({ title: /Post number/ , tags: 'ux' });
  const all = await Post.find();
  expect(all.every((p) => new Set(p.tags).size === p.tags.length)).toBe(true);
  expect(all.some((p) => p.tags.includes('css'))).toBe(false);
  expect(post).toBeTruthy();
});

it('deletes a tag from all posts', async () => {
  await agent.delete('/api/admin/taxonomy/tag/ux');
  expect(await Post.countDocuments({ tags: 'ux' })).toBe(0);
});

it('moves posts of a deleted category to "general" and protects "general" itself', async () => {
  await agent.delete('/api/admin/taxonomy/category/security');
  expect(await Post.countDocuments({ category: 'general' })).toBe(1);
  expect((await agent.delete('/api/admin/taxonomy/category/general')).status).toBe(400);
});

it('validates taxonomy input', async () => {
  expect((await agent.patch('/api/admin/taxonomy/tag/ux').send({ name: '' })).status).toBe(400);
  expect((await agent.patch('/api/admin/taxonomy/tag/ux').send({ name: '../x' })).status).toBe(400);
  expect((await agent.patch('/api/admin/taxonomy/colour/ux').send({ name: 'y' })).status).toBe(400);
});
