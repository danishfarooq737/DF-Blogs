const Post = require('../models/Post');
const Comment = require('../models/Comment');
const config = require('../config');
const { asyncHandler, httpError } = require('../utils/http');
const postService = require('../services/postService');

const list = asyncHandler(async (req, res) => res.json(await postService.listPublished(req.valid.query)));

const meta = asyncHandler(async (req, res) => res.json(await postService.publishedTaxonomy()));

const popular = asyncHandler(async (req, res) => res.json({ posts: await postService.popularPosts() }));

const findPublishedBySlug = async (slug) => {
  const post = await Post.findOne({ slug: String(slug), status: 'published' }).populate('author', 'name');
  if (!post) throw httpError(404, 'Post not found');
  return post;
};

const detail = asyncHandler(async (req, res) => {
  const post = await findPublishedBySlug(req.params.slug);
  const [comments, related] = await Promise.all([
    Comment.find({ post: post.id, status: 'approved' }).populate('author', 'name').sort({ createdAt: -1 }).limit(200),
    postService.relatedPosts(post),
  ]);
  res.json({ post, comments, related });
});

const addComment = asyncHandler(async (req, res) => {
  const post = await findPublishedBySlug(req.params.slug);
  const comment = await Comment.create({ post: post.id, author: req.user.id, content: req.valid.body.content });
  res.status(201).json({ comment: await comment.populate('author', 'name') });
});

/** Public site configuration the SPA needs (contact details, analytics settings). */
const siteConfig = (req, res) => {
  const { site, analytics, clientUrl } = config;
  res.json({
    site: { ...site, url: clientUrl, addressIsPlaceholder: !site.address },
    analytics: analytics.provider === 'none' || !analytics.id ? { provider: 'none' } : { ...analytics },
  });
};

module.exports = { list, meta, popular, detail, addComment, siteConfig };
