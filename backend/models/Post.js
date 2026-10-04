const { Schema, model } = require('mongoose');
const config = require('../config');
const { fixUploadUrl, fixUploadHtml } = require('../utils/url');

/**
 * Image URLs are stored as absolute URLs. Posts created while developing (http://localhost:5000/...)
 * or before the API moved to https would be blocked by browsers as "mixed content" on a live HTTPS
 * site. These getters rewrite such legacy origins to the current public API origin whenever a
 * post is read, so old data heals itself without a migration.
 */
const healImageUrl = (value) => fixUploadUrl(value, config.serverUrl);
const healContent = (value) => fixUploadHtml(value, config.serverUrl);

/** Heals legacy URLs on the JSON form only. A schema-level transform (unlike `getters: true`) does not leak into populated children, so e.g. `author` keeps its { _id, name } shape. */
function healJson(doc, ret) {
  if (typeof ret.content === 'string') ret.content = healContent(ret.content);
  if (ret.image && typeof ret.image.url === 'string') ret.image.url = healImageUrl(ret.image.url);
  return ret;
}

const postSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String, maxlength: 300, default: '' },
    content: { type: String, required: true, get: healContent },
    plainText: { type: String, select: false },
    image: {
      url: { type: String, get: healImageUrl },
      key: String,
      alt: { type: String, maxlength: 140 },
    },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, default: 'general' },
    tags: { type: [String], default: [] },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    publishedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { transform: healJson },
  },
);

postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ status: 1, category: 1, publishedAt: -1 });
postSchema.index({ status: 1, tags: 1, publishedAt: -1 });
postSchema.index({ createdAt: -1 });

module.exports = model('Post', postSchema);
