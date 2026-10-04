const Comment = require('../../models/Comment');
const { asyncHandler, httpError } = require('../../utils/http');
const { escapeRegex } = require('../../utils/sanitize');

const PAGE_SIZE = 25;

const list = asyncHandler(async (req, res) => {
  const { page, q, status } = req.valid.query;
  const filter = {};
  if (status) filter.status = status;
  if (q) filter.content = new RegExp(escapeRegex(q), 'i');
  const [comments, total] = await Promise.all([
    Comment.find(filter)
      .populate('author', 'name')
      .populate('post', 'title slug')
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE),
    Comment.countDocuments(filter),
  ]);
  res.json({ comments, page, pages: Math.ceil(total / PAGE_SIZE), total });
});

const updateStatus = asyncHandler(async (req, res) => {
  const comment = await Comment.findByIdAndUpdate(req.params.id, { status: req.valid.body.status }, { new: true });
  if (!comment) throw httpError(404, 'Comment not found');
  res.json({ comment });
});

const remove = asyncHandler(async (req, res) => {
  if (!(await Comment.findByIdAndDelete(req.params.id))) throw httpError(404, 'Comment not found');
  res.json({ ok: true });
});

module.exports = { list, updateStatus, remove };
