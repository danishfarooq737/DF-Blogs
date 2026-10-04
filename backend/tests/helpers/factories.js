const bcrypt = require('bcryptjs');
const request = require('supertest');
const sharp = require('sharp');
const app = require('../../app');
const User = require('../../models/User');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');
const { stripTags } = require('../../utils/sanitize');
const { uniqueSlug } = require('../../utils/slug');

const PASSWORD = 'Password123';
let counter = 0;
const next = () => (counter += 1);

async function createUser(overrides = {}) {
  const n = next();
  return User.create({
    name: `User ${n}`,
    email: `user${n}@example.com`,
    password: await bcrypt.hash(PASSWORD, 4),
    ...overrides,
  });
}

const createAdmin = (overrides = {}) => createUser({ role: 'admin', ...overrides });

async function createPost(author, overrides = {}) {
  const n = next();
  const title = overrides.title || `Post number ${n}`;
  const content = overrides.content || `<p>Body of post ${n}</p>`;
  return Post.create({
    title,
    slug: await uniqueSlug(Post, title),
    content,
    plainText: stripTags(content),
    excerpt: `Excerpt ${n}`,
    category: 'engineering',
    tags: ['node'],
    status: 'published',
    publishedAt: new Date(Date.now() - n * 1000),
    author: author.id,
    ...overrides,
  });
}

const createComment = (post, author, overrides = {}) =>
  Comment.create({ post: post.id, author: author.id, content: 'A perfectly fine comment', ...overrides });

/** A supertest agent (cookie jar) already logged in as the given user. */
async function loginAs(user) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email: user.email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`Login failed in test helper: ${res.status}`);
  return agent;
}

const makeImage = (format = 'png', size = 64) =>
  sharp({ create: { width: size, height: size, channels: 3, background: { r: 40, g: 90, b: 200 } } })[format]().toBuffer();

module.exports = { PASSWORD, createUser, createAdmin, createPost, createComment, loginAs, makeImage };
