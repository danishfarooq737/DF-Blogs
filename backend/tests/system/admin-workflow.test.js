/**
 * System test: the complete administrator journey.
 * login → dashboard → upload image → create post with category/tags → publish → edit
 * → moderate comments → manage users → logout.
 */
const request = require('supertest');
const app = require('../../app');
const db = require('../helpers/db');
const { createAdmin, createUser, createPost, createComment, makeImage, PASSWORD } = require('../helpers/factories');

beforeAll(db.connect);
afterAll(db.disconnect);

it('lets an administrator run the whole publishing workflow and log out', async () => {
  const admin = await createAdmin();
  const reader = await createUser({ name: 'Rita Reader' });
  const existing = await createPost(admin, { title: 'Existing article' });
  await createComment(existing, reader, { content: 'Spammy comment' });

  const agent = request.agent(app);

  // 1-2. Login and dashboard.
  expect((await agent.get('/api/admin/stats')).status).toBe(401);
  const login = await agent.post('/api/auth/login').send({ email: admin.email, password: PASSWORD });
  expect(login.body.user.role).toBe('admin');
  const stats = await agent.get('/api/admin/stats');
  expect(stats.body).toMatchObject({ posts: 1, published: 1, drafts: 0, users: 2, comments: 1 });

  // 3-4. Upload a featured image.
  const upload = await agent.post('/api/admin/upload').field('alt', 'Blue cover image').attach('image', await makeImage('jpeg'), { filename: 'cover.jpg', contentType: 'image/jpeg' });
  expect(upload.status).toBe(201);

  // 5. Create a draft with category, tags, rich text and the image.
  const draft = await agent.post('/api/admin/posts').send({
    title: 'Launch Announcement',
    excerpt: 'Big news',
    content: '<h2>We launched</h2><p>Read <a href="https://example.com">more</a>.</p>',
    category: 'news',
    tags: ['launch', 'product'],
    image: upload.body.image,
    status: 'draft',
  });
  expect(draft.status).toBe(201);
  const { _id: postId, slug } = draft.body.post;
  expect((await request(app).get(`/api/posts/${slug}`)).status).toBe(404);

  // 6. Publish: now public, visible in filters and sitemap.
  await agent.put(`/api/admin/posts/${postId}`).send({ ...draft.body.post, status: 'published' });
  const publicPost = await request(app).get(`/api/posts/${slug}`);
  expect(publicPost.status).toBe(200);
  expect(publicPost.body.post.image.alt).toBe('Blue cover image');
  expect((await request(app).get('/api/posts?category=news&tag=launch')).body.total).toBe(1);
  expect((await request(app).get('/sitemap.xml')).text).toContain(`/blog/${slug}`);

  // 7. Edit, then unpublish.
  const edited = await agent.put(`/api/admin/posts/${postId}`).send({ title: 'Launch Announcement (updated)', content: '<p>Updated body</p>', category: 'news', tags: ['launch'], image: upload.body.image, status: 'published' });
  expect(edited.body.post.title).toContain('updated');
  expect(edited.body.post.slug).toBe(slug);
  await agent.put(`/api/admin/posts/${postId}`).send({ title: 'Launch Announcement (updated)', content: '<p>Updated body</p>', category: 'news', tags: ['launch'], status: 'draft' });
  expect((await request(app).get(`/api/posts/${slug}`)).status).toBe(404);

  // 8. Moderate comments.
  const comments = await agent.get('/api/admin/comments');
  const spam = comments.body.comments[0];
  await agent.patch(`/api/admin/comments/${spam._id}`).send({ status: 'hidden' });
  expect((await request(app).get(`/api/posts/${existing.slug}`)).body.comments).toHaveLength(0);
  expect((await agent.delete(`/api/admin/comments/${spam._id}`)).status).toBe(200);

  // 9. Manage users.
  const found = await agent.get('/api/admin/users?q=rita');
  expect(found.body.users).toHaveLength(1);
  const deactivated = await agent.patch(`/api/admin/users/${found.body.users[0]._id}`).send({ active: false });
  expect(deactivated.body.user.active).toBe(false);

  // 10. Taxonomy.
  expect((await agent.get('/api/admin/taxonomy')).body.categories.map((c) => c.name)).toContain('news');

  // 11. Logout ends the session everywhere.
  expect((await agent.post('/api/auth/logout')).status).toBe(200);
  expect((await agent.get('/api/admin/stats')).status).toBe(401);
});
