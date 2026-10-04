const router = require('express').Router();
const multer = require('multer');
const { requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { uploadLimiter } = require('../middleware/rateLimiters');
const { httpError } = require('../utils/http');
const config = require('../config');
const v = require('../validators/admin.validators');
const { postBodySchema } = require('../validators/post.validators');
const posts = require('../controllers/admin/posts.controller');
const users = require('../controllers/admin/users.controller');
const comments = require('../controllers/admin/comments.controller');
const taxonomy = require('../controllers/admin/taxonomy.controller');
const { stats } = require('../controllers/admin/stats.controller');
const { upload } = require('../controllers/admin/upload.controller');

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSION = /\.(jpe?g|png|webp)$/i;

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.storage.maxUploadBytes, files: 1, fields: 5 },
  fileFilter: (req, file, callback) =>
    ALLOWED_MIME.includes(file.mimetype) && ALLOWED_EXTENSION.test(file.originalname)
      ? callback(null, true)
      : callback(httpError(400, 'Only JPG, PNG or WebP images are allowed')),
});

// Every admin route requires an authenticated administrator, verified server-side.
router.use(requireAdmin);

router.get('/stats', stats);

router.post('/upload', uploadLimiter, imageUpload.single('image'), validate(v.uploadBodySchema), upload);

router.get('/posts', validate(v.adminPostQuerySchema, 'query'), posts.list);
router.post('/posts', validate(postBodySchema), posts.create);
router.get('/posts/:id', validate(v.idParamSchema, 'params'), posts.getOne);
router.put('/posts/:id', validate(v.idParamSchema, 'params'), validate(postBodySchema), posts.update);
router.delete('/posts/:id', validate(v.idParamSchema, 'params'), posts.remove);

router.get('/users', validate(v.adminUserQuerySchema, 'query'), users.list);
router.patch('/users/:id', validate(v.idParamSchema, 'params'), validate(v.userUpdateSchema), users.update);
router.delete('/users/:id', validate(v.idParamSchema, 'params'), users.remove);

router.get('/comments', validate(v.adminCommentQuerySchema, 'query'), comments.list);
router.patch('/comments/:id', validate(v.idParamSchema, 'params'), validate(v.commentUpdateSchema), comments.updateStatus);
router.delete('/comments/:id', validate(v.idParamSchema, 'params'), comments.remove);

router.get('/taxonomy', taxonomy.list);
router.patch('/taxonomy/:type/:name', validate(v.taxonomyParamsSchema, 'params'), validate(v.taxonomyRenameSchema), taxonomy.rename);
router.delete('/taxonomy/:type/:name', validate(v.taxonomyParamsSchema, 'params'), taxonomy.remove);

module.exports = router;
