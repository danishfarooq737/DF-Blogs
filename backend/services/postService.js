const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { escapeRegex } = require('../utils/sanitize');

const PUBLISHED = { status: 'published' };
const LIST_FIELDS = '-content';
const MAX_SEARCH_TERMS = 5;

/** Builds a MongoDB filter for published posts from validated query values. */
function buildPublicFilter({ q, category, tag }) {
  const filter = { ...PUBLISHED };
  if (category) filter.category = category;
  if (tag) filter.tags = tag;
  if (q) {
    const terms = q.split(/\s+/).filter(Boolean).slice(0, MAX_SEARCH_TERMS);
    filter.$and = terms.map((term) => {
      const pattern = new RegExp(escapeRegex(term), 'i');
      return { $or: [{ title: pattern }, { excerpt: pattern }, { category: pattern }, { tags: pattern }, { plainText: pattern }] };
    });
  }
  return filter;
}

async function listPublished(query) {
  const filter = buildPublicFilter(query);
  const skip = (query.page - 1) * query.limit;
  const [posts, total] = await Promise.all([
    Post.find(filter).select(LIST_FIELDS).populate('author', 'name').sort({ publishedAt: -1, _id: -1 }).skip(skip).limit(query.limit),
    Post.countDocuments(filter),
  ]);
  return { posts, page: query.page, pages: Math.ceil(total / query.limit), total };
}

/** Category and tag names with the number of published posts using each. */
async function publishedTaxonomy() {
  const [categories, tags] = await Promise.all([
    Post.aggregate([{ $match: PUBLISHED }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }]),
    Post.aggregate([{ $match: PUBLISHED }, { $unwind: '$tags' }, { $group: { _id: '$tags', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }]),
  ]);
  const shape = (rows) => rows.filter((row) => row._id).map((row) => ({ name: row._id, count: row.count }));
  return { categories: shape(categories), tags: shape(tags) };
}

/** Posts ranked by number of approved comments, newest first as tie-breaker. */
async function popularPosts(limit = 4) {
  const ranked = await Comment.aggregate([
    { $match: { status: 'approved' } },
    { $group: { _id: '$post', comments: { $sum: 1 } } },
    { $sort: { comments: -1 } },
    { $limit: limit * 3 },
  ]);
  const posts = await Post.find({ ...PUBLISHED, _id: { $in: ranked.map((row) => row._id) } })
    .select(LIST_FIELDS)
    .populate('author', 'name');
  const order = new Map(ranked.map((row, index) => [String(row._id), index]));
  return posts.sort((a, b) => order.get(String(a._id)) - order.get(String(b._id))).slice(0, limit);
}

async function relatedPosts(post, limit = 3) {
  const or = [];
  if (post.category) or.push({ category: post.category });
  if (post.tags.length) or.push({ tags: { $in: post.tags } });
  if (!or.length) return [];
  return Post.find({ ...PUBLISHED, _id: { $ne: post._id }, $or: or })
    .select(LIST_FIELDS)
    .populate('author', 'name')
    .sort({ publishedAt: -1 })
    .limit(limit);
}

module.exports = { buildPublicFilter, listPublished, publishedTaxonomy, popularPosts, relatedPosts };
