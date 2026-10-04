const Post = require('../../models/Post');
const User = require('../../models/User');
const Comment = require('../../models/Comment');
const { asyncHandler } = require('../../utils/http');

const stats = asyncHandler(async (req, res) => {
  const [posts, published, users, comments, hiddenComments] = await Promise.all([
    Post.countDocuments(),
    Post.countDocuments({ status: 'published' }),
    User.countDocuments(),
    Comment.countDocuments(),
    Comment.countDocuments({ status: 'hidden' }),
  ]);
  res.json({ posts, published, drafts: posts - published, users, comments, hiddenComments });
});

module.exports = { stats };
