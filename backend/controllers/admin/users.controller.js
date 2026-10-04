const User = require('../../models/User');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');
const { asyncHandler, httpError } = require('../../utils/http');
const { escapeRegex } = require('../../utils/sanitize');

const PAGE_SIZE = 25;

const list = asyncHandler(async (req, res) => {
  const { page, q, role } = req.valid.query;
  const filter = {};
  if (role) filter.role = role;
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE),
    User.countDocuments(filter),
  ]);
  res.json({ users, page, pages: Math.ceil(total / PAGE_SIZE), total });
});

const update = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw httpError(400, 'You cannot modify your own account');
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'User not found');
  user.set(req.valid.body);
  // Deactivated accounts lose their refresh session immediately.
  if (req.valid.body.active === false) user.refreshHash = undefined;
  await user.save();
  res.json({ user });
});

const remove = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw httpError(400, 'You cannot delete your own account');
  if (await Post.exists({ author: req.params.id })) {
    throw httpError(409, 'This user has authored posts. Deactivate the account instead of deleting it.');
  }
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'User not found');
  await user.deleteOne();
  await Comment.deleteMany({ author: user.id });
  res.json({ ok: true });
});

module.exports = { list, update, remove };
