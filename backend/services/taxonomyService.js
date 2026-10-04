const Post = require('../models/Post');
const { httpError } = require('../utils/http');

const DEFAULT_CATEGORY = 'general';

const rows = (aggregated) => aggregated.filter((row) => row._id).map((row) => ({ name: row._id, count: row.count }));

/** Categories and tags across ALL posts (drafts included), with usage counts. */
async function listTaxonomy() {
  const [categories, tags] = await Promise.all([
    Post.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Post.aggregate([{ $unwind: '$tags' }, { $group: { _id: '$tags', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
  ]);
  return { categories: rows(categories), tags: rows(tags) };
}

/** Renames (or merges into an existing) category/tag across every post. */
async function renameTerm(type, from, to) {
  if (from === to) return { updated: 0 };
  if (type === 'category') {
    const result = await Post.updateMany({ category: from }, { $set: { category: to } });
    return { updated: result.modifiedCount };
  }
  // Two steps so a post already carrying `to` does not end up with duplicates.
  const result = await Post.updateMany({ tags: from }, { $addToSet: { tags: to } });
  await Post.updateMany({ tags: from }, { $pull: { tags: from } });
  return { updated: result.modifiedCount };
}

/** Removes a tag from all posts, or moves a category's posts back to the default category. */
async function deleteTerm(type, name) {
  if (type === 'category') {
    if (name === DEFAULT_CATEGORY) throw httpError(400, `The "${DEFAULT_CATEGORY}" category cannot be deleted`);
    const result = await Post.updateMany({ category: name }, { $set: { category: DEFAULT_CATEGORY } });
    return { updated: result.modifiedCount };
  }
  const result = await Post.updateMany({ tags: name }, { $pull: { tags: name } });
  return { updated: result.modifiedCount };
}

module.exports = { listTaxonomy, renameTerm, deleteTerm, DEFAULT_CATEGORY };
