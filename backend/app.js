const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');

const config = require('./config');
const { apiLimiter } = require('./middleware/rateLimiters');
const { originCheck } = require('./middleware/originCheck');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { asyncHandler } = require('./utils/http');
const seo = require('./services/seoService');
const postsController = require('./controllers/posts.controller');

const app = express();

app.disable('x-powered-by');
if (config.trustProxy) app.set('trust proxy', config.trustProxy);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(originCheck);

app.use('/uploads', express.static(config.storage.uploadDir, { maxAge: '30d', immutable: true, index: false }));

app.get('/', (req, res) => res.json({ name: `${config.site.name} API`, status: 'ok' }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get(
  '/sitemap.xml',
  asyncHandler(async (req, res) => {
    res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(await seo.buildSitemap());
  }),
);
app.get('/robots.txt', (req, res) => res.type('text/plain').send(seo.buildRobots()));

app.use('/api', apiLimiter);
app.get('/api/config', postsController.siteConfig);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/admin', require('./routes/admin'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
