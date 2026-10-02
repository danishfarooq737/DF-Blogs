const { Schema, model } = require('mongoose');

const postSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String, maxlength: 300, default: '' },
    content: { type: String, required: true },
    /** Plain-text copy of `content`, used only for search. Never sent to clients. */
    plainText: { type: String, select: false },
    image: {
      url: String,
      key: String,
      alt: { type: String, maxlength: 140 },
    },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, default: 'general' },
    tags: { type: [String], default: [] },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    publishedAt: Date,
  },
  { timestamps: true },
);

postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ status: 1, category: 1, publishedAt: -1 });
postSchema.index({ status: 1, tags: 1, publishedAt: -1 });
postSchema.index({ createdAt: -1 });

module.exports = model('Post', postSchema);
