const request = require('supertest');
const app = require('../../app');
const db = require('../helpers/db');
const { createAdmin, createUser, createPost, loginAs } = require('../helpers/factories');

beforeAll(db.connect);
afterAll(db.disconnect);

it('rate-limits comment spam per client (5 per minute) with 429', async () => {
  const post = await createPost(await createAdmin());
  const agent = await loginAs(await createUser());
  const statuses = [];
  for (let i = 0; i < 7; i += 1) {
    statuses.push((await agent.post(`/api/posts/${post.slug}/comments`).send({ content: `comment ${i}` })).status);
  }
  expect(statuses.slice(0, 5)).toEqual([201, 201, 201, 201, 201]);
  expect(statuses.slice(5)).toEqual([429, 429]);
});

it('rate-limits repeated failed logins (brute force) with 429', async () => {
  const statuses = [];
  for (let i = 0; i < 24; i += 1) {
    statuses.push((await request(app).post('/api/auth/login').send({ email: 'victim@example.com', password: `Guess${i}abcd` })).status);
  }
  expect(statuses.filter((s) => s === 401).length).toBeLessThanOrEqual(20);
  expect(statuses.slice(-3)).toEqual([429, 429, 429]);
});
