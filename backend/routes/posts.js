const router = require('express').Router();
const controller = require('../controllers/posts.controller');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { commentLimiter } = require('../middleware/rateLimiters');
const { listQuerySchema, commentBodySchema } = require('../validators/post.validators');

router.get('/', validate(listQuerySchema, 'query'), controller.list);
router.get('/meta', controller.meta);
router.get('/popular', controller.popular);
router.get('/:slug', controller.detail);
router.post('/:slug/comments', requireAuth, commentLimiter, validate(commentBodySchema), controller.addComment);

module.exports = router;
