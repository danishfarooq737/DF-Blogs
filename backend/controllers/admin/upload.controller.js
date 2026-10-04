const storage = require('../../services/storage');
const { asyncHandler, httpError } = require('../../utils/http');

const upload = asyncHandler(async (req, res) => {
  if (!req.file) throw httpError(400, 'Image file is required');
  const saved = await storage.save(req.file.buffer);
  res.status(201).json({ image: { url: saved.url, key: saved.key, alt: req.valid.body.alt } });
});

module.exports = { upload };
