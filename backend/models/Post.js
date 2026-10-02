const config = require('../config'); // Make sure config is imported

const postSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String, maxlength: 300, default: '' },
    content: { type: String, required: true },
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