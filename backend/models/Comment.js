const { Schema, model } = require('mongoose');

const commentSchema = new Schema(
  {
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 1000 },
    status: { type: String, enum: ['approved', 'hidden'], default: 'approved' },
  },
  { timestamps: true },
);

commentSchema.index({ post: 1, status: 1, createdAt: -1 });
commentSchema.index({ createdAt: -1 });

module.exports = model('Comment', commentSchema);
