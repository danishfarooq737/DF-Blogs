const request = require('supertest');
const app = require('../../app');
const db = require('../helpers/db');
const { createAdmin, createUser, createPost, createComment, loginAs, PASSWORD } = require('../helpers/factories');
const User = require('../../models/User');

let admin;
let agent;
beforeAll(db.connect);
beforeEach(async () => {
  admin = await createAdmin();
  agent = await loginAs(admin);
});
afterEach(db.clear);
afterAll(db.disconnect);

describe('user management', () => {
  it('lists users without exposing password hashes or refresh hashes', async () => {
    await createUser({ name: 'Grace Hopper' });
    const res = await agent.get('/api/admin/users');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(JSON.stringify(res.body)).not.toMatch(/password|refreshHash|\$2[aby]\$/i);
  });

  it('searches by name or email and filters by role', async () => {
    await createUser({ name: 'Grace Hopper', email: 'grace@navy.example' });
    await createUser({ name: 'Alan Turing', email: 'alan@bletchley.example' });
    expect((await agent.get('/api/admin/users?q=grace')).body.users.map((u) => u.name)).toEqual(['Grace Hopper']);
    expect((await agent.get('/api/admin/users?q=BLETCHLEY')).body.total).toBe(1);
    expect((await agent.get('/api/admin/users?role=admin')).body.total).toBe(1);
    expect((await agent.get('/api/admin/users?q=(')).status).toBe(200);
  });

  it('promotes and demotes users', async () => {
    const user = await createUser();
    const up = await agent.patch(`/api/admin/users/${user.id}`).send({ role: 'admin' });
    expect(up.body.user.role).toBe('admin');
    const down = await agent.patch(`/api/admin/users/${user.id}`).send({ role: 'user' });
    expect(down.body.user.role).toBe('user');
  });

  it('deactivating a user blocks login and kills the existing session', async () => {
    const user = await createUser();
    const userAgent = await loginAs(user);
    expect((await userAgent.get('/api/auth/me')).status).toBe(200);

    expect((await agent.patch(`/api/admin/users/${user.id}`).send({ active: false })).body.user.active).toBe(false);
    expect((await userAgent.get('/api/auth/me')).status).toBe(401);
    expect((await userAgent.post('/api/auth/refresh')).status).toBe(401);
    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD });
    expect(login.status).toBe(401);

    await agent.patch(`/api/admin/users/${user.id}`).send({ active: true });
    expect((await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD })).status).toBe(200);
  });

  it('refuses self-modification and self-deletion', async () => {
    expect((await agent.patch(`/api/admin/users/${admin.id}`).send({ role: 'user' })).status).toBe(400);
    expect((await agent.patch(`/api/admin/users/${admin.id}`).send({ active: false })).status).toBe(400);
    expect((await agent.delete(`/api/admin/users/${admin.id}`)).status).toBe(400);
  });

  it('rejects mass-assignment and invalid updates', async () => {
    const user = await createUser();
    expect((await agent.patch(`/api/admin/users/${user.id}`).send({ email: 'x@y.z' })).status).toBe(400);
    expect((await agent.patch(`/api/admin/users/${user.id}`).send({ role: 'superuser' })).status).toBe(400);
    expect((await agent.patch(`/api/admin/users/${user.id}`).send({})).status).toBe(400);
  });

  it('deletes a user and their comments, but not users who authored posts', async () => {
    const commenter = await createUser();
    const post = await createPost(admin);
    await createComment(post, commenter);
    expect((await agent.delete(`/api/admin/users/${commenter.id}`)).status).toBe(200);
    expect(await User.findById(commenter.id)).toBeNull();
    expect((await request(app).get(`/api/posts/${post.slug}`)).body.comments).toHaveLength(0);

    const author = await createAdmin();
    await createPost(author);
    expect((await agent.delete(`/api/admin/users/${author.id}`)).status).toBe(409);
  });
});

describe('comment moderation', () => {
  let post;
  let commenter;
  beforeEach(async () => {
    post = await createPost(admin);
    commenter = await createUser();
  });

  it('lists comments with author and post context, with search and status filters', async () => {
    await createComment(post, commenter, { content: 'Buy cheap watches' });
    await createComment(post, commenter, { content: 'Lovely read', status: 'hidden' });
    const all = await agent.get('/api/admin/comments');
    expect(all.body.total).toBe(2);
    expect(all.body.comments[0]).toMatchObject({ post: { slug: post.slug }, author: { name: commenter.name } });
    expect((await agent.get('/api/admin/comments?q=watches')).body.total).toBe(1);
    expect((await agent.get('/api/admin/comments?status=hidden')).body.total).toBe(1);
  });

  it('hides and re-approves a comment, which controls public visibility', async () => {
    const comment = await createComment(post, commenter);
    const publicComments = async () => (await request(app).get(`/api/posts/${post.slug}`)).body.comments.length;
    expect(await publicComments()).toBe(1);
    await agent.patch(`/api/admin/comments/${comment.id}`).send({ status: 'hidden' });
    expect(await publicComments()).toBe(0);
    await agent.patch(`/api/admin/comments/${comment.id}`).send({ status: 'approved' });
    expect(await publicComments()).toBe(1);
  });

  it('rejects invalid statuses', async () => {
    const comment = await createComment(post, commenter);
    const res = await agent.patch(`/api/admin/comments/${comment.id}`).send({ status: 'deleted' });
    expect(res.status).toBe(400);
  });

  it('deletes comments', async () => {
    const comment = await createComment(post, commenter);
    expect((await agent.delete(`/api/admin/comments/${comment.id}`)).status).toBe(200);
    expect((await agent.get('/api/admin/comments')).body.total).toBe(0);
  });
});
