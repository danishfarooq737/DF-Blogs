const { Schema, model } = require('mongoose');
const config = require('../config');

const postSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String, maxlength: 300, default: '' },
    content: { type: String, required: true },
    /** Plain-text copy of `content`, used only for search. Never sent to clients. */
    plainText: { type: String, select: false },
    image: {
      url: {
        type: String,
        get: function(v) {
          if (!v) return v;
          // If the URL points to localhost, dynamically swap it with your live serverUrl
          return v.replace(/^http:\/\/localhost:\d+/, config.serverUrl);
        }
      },
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
    toObject: { getters: true }, // Enables getters when converting to plain objects/JSON
    toJSON: { getters: true }    // Enables getters when sending JSON responses to the frontend
  },
);

postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ status: 1, category: 1, publishedAt: -1 });
postSchema.index({ status: 1, tags: 1, publishedAt: -1 });
postSchema.index({ createdAt: -1 });

module.exports = model('Post', postSchema);
