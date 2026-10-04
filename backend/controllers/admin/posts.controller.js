const Post = require('../../models/Post');
const Comment = require('../../models/Comment');
const storage = require('../../services/storage');
const { asyncHandler, httpError } = require('../../utils/http');
const { uniqueSlug } = require('../../utils/slug');
const { stripTags, escapeRegex } = require('../../utils/sanitize');

const PAGE_SIZE = 20;

/** Splits validated form data into Post fields (plus the derived search text) and the featured image. */
function splitBody(body) {
  const { image, ...rest } = body;
  return { fields: { ...rest, plainText: stripTags(rest.content, 20_000) }, image: image || undefined };
}

const list = asyncHandler(async (req, res) => {
  const { page, q, status } = req.valid.query;
  const filter = {};
  if (status) filter.status = status;
  if (q) filter.title = new RegExp(escapeRegex(q), 'i');
  const [posts, total] = await Promise.all([
    Post.find(filter).select('-content').populate('author', 'name').sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE),
    Post.countDocuments(filter),
  ]);
  res.json({ posts, page, pages: Math.ceil(total / PAGE_SIZE), total });
});

const getOne = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw httpError(404, 'Post not found');
  res.json({ post });
});

const create = asyncHandler(async (req, res) => {
  const { fields, image } = splitBody(req.valid.body);
  const post = await Post.create({
    ...fields,
    image,
    slug: await uniqueSlug(Post, fields.title),
    author: req.user.id,
    publishedAt: fields.status === 'published' ? new Date() : undefined,
  });
  res.status(201).json({ post });
});

const update = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw httpError(404, 'Post not found');
  const { fields, image } = splitBody(req.valid.body);
  const previousImageKey = post.image?.key;

  if (fields.status === 'published' && !post.publishedAt) post.publishedAt = new Date();
  post.set(fields);
  post.image = image;
  await post.save();

  if (previousImageKey && previousImageKey !== post.image?.key) await storage.remove(previousImageKey);
  res.json({ post });
});

const remove = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw httpError(404, 'Post not found');
  await post.deleteOne();
  await Comment.deleteMany({ post: post.id });
  await storage.remove(post.image?.key);
  res.json({ ok: true });
});

module.exports = { list, getOne, create, update, remove };
