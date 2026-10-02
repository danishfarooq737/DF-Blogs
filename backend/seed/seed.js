/**
 * Seeds the database with demo users, posts, images and comments.
 * WARNING: deletes existing users, posts and comments. Refuses to run in production
 * unless ALLOW_SEED=true is set explicitly.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const sharp = require('sharp');
const config = require('../config');
const storage = require('../services/storage');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { uniqueSlug } = require('../utils/slug');
const { stripTags } = require('../utils/sanitize');
const { articles, draftArticle } = require('./content');

const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'Password@123';

const coverSvg = (hue) => `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue},70%,52%)"/><stop offset="1" stop-color="hsl(${(hue + 50) % 360},75%,38%)"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#g)"/>
  <circle cx="1320" cy="180" r="260" fill="#fff" fill-opacity=".10"/>
  <circle cx="1180" cy="700" r="380" fill="#fff" fill-opacity=".07"/>
  <rect x="140" y="520" width="520" height="24" rx="12" fill="#fff" fill-opacity=".35"/>
  <rect x="140" y="580" width="380" height="24" rx="12" fill="#fff" fill-opacity=".22"/>
</svg>`;

async function createCover(hue) {
  const png = await sharp(Buffer.from(coverSvg(hue))).png().toBuffer();
  return storage.save(png);
}

async function seed() {
  if (config.isProduction && process.env.ALLOW_SEED !== 'true') {
    throw new Error('Refusing to seed in production. Set ALLOW_SEED=true if you really intend to wipe the database.');
  }
  await mongoose.connect(config.mongoUri);
  await Promise.all([User.deleteMany({}), Post.deleteMany({}), Comment.deleteMany({})]);

  const password = await bcrypt.hash(DEMO_PASSWORD, config.bcryptCost);
  const [admin, editor, reader, omar, inactive] = await User.create([
    { name: 'DF Admin', email: 'admin@dfblogs.dev', password, role: 'admin' },
    { name: 'Amina Editor', email: 'editor@dfblogs.dev', password, role: 'admin' },
    { name: 'Sara Reader', email: 'reader@dfblogs.dev', password },
    { name: 'Omar Khan', email: 'omar@dfblogs.dev', password },
    { name: 'Lina Park', email: 'lina@dfblogs.dev', password, active: false },
  ]);

  const posts = [];
  const day = 24 * 60 * 60 * 1000;
  for (const [index, article] of [...articles, draftArticle].entries()) {
    const isDraft = article === draftArticle;
    const content = article.body.join('');
    const cover = await createCover(article.hue);
    posts.push(
      await Post.create({
        title: article.title,
        slug: await uniqueSlug(Post, article.title),
        excerpt: article.excerpt,
        content,
        plainText: stripTags(content, 20_000),
        image: { url: cover.url, key: cover.key, alt: article.alt },
        author: index % 2 === 0 ? admin.id : editor.id,
        category: article.category,
        tags: article.tags,
        status: isDraft ? 'draft' : 'published',
        publishedAt: isDraft ? undefined : new Date(Date.now() - index * 2 * day),
      }),
    );
  }

  await Comment.create([
    { post: posts[0].id, author: reader.id, content: 'Great introduction, the data-first advice is spot on.' },
    { post: posts[0].id, author: omar.id, content: 'Would love a follow-up on deploying this stack.' },
    { post: posts[1].id, author: omar.id, content: 'The keyboard-first testing tip found three bugs in our app today.' },
    { post: posts[2].id, author: reader.id, content: 'Very helpful security checklist. Bookmarked.' },
    { post: posts[2].id, author: omar.id, content: 'Rate limiting on auth routes saved us during a credential-stuffing attempt.' },
    { post: posts[5].id, author: reader.id, content: 'Finally an explanation of rotation that makes sense.' },
    { post: posts[3].id, author: inactive.id, content: 'This comment was hidden by a moderator.', status: 'hidden' },
  ]);

  console.log(`Seeded ${posts.length} posts, 5 users and 7 comments.`);  
  console.log('Development credentials (NOT for production):');  
  console.log(`  admin  admin@dfblogs.dev / ${DEMO_PASSWORD}`);  
  console.log(`  user   reader@dfblogs.dev / ${DEMO_PASSWORD}`);  
}

seed()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error('Seed failed:', error.message);  
    await mongoose.disconnect();
    process.exitCode = 1;
  });
