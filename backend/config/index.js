/**
 * Central, validated application configuration.
 * Every environment variable used by the API is read here and nowhere else.
 */
const path = require('path');
const { stripTrailingSlash, isLocalUrl, upgradeToHttps } = require('../utils/url');

// Loads backend/.env (frontend variables live separately in frontend/.env)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

const PLACEHOLDER_SECRET = /change-?me/i;
const MIN_SECRET_LENGTH = 32;

function readSecret(name) {
  const value = process.env[name];
  if (isTest) return value || `test-${name.toLowerCase()}-0123456789abcdef0123456789`;
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  if (isProduction && (PLACEHOLDER_SECRET.test(value) || value.length < MIN_SECRET_LENGTH)) {
    throw new Error(`${name} must be a random string of at least ${MIN_SECRET_LENGTH} characters in production`);
  }
  return value;
}

function readInt(name, fallback) {
  const parsed = Number.parseInt(process.env[name], 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Public URLs end up inside image links, the sitemap and CORS/Origin checks. In production they are
 * forced to https:// (an http:// URL on an HTTPS site is "mixed content" and gets blocked by browsers).
 * RENDER_EXTERNAL_URL is provided automatically by Render and is used when SERVER_URL is not set.
 */
const publicUrl = (value, fallback) => {
  const cleaned = stripTrailingSlash(value || fallback);
  return isProduction ? upgradeToHttps(cleaned) : cleaned;
};

const hasMongoUri = Boolean(process.env.MONGODB_URI);
const hasClientUrl = Boolean(process.env.CLIENT_URL);
const clientUrl = publicUrl(process.env.CLIENT_URL, 'http://localhost:5173');
const serverUrl = publicUrl(process.env.SERVER_URL || process.env.RENDER_EXTERNAL_URL, 'http://localhost:5000');

const SAME_SITE_VALUES = ['lax', 'strict', 'none'];
const requestedSameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
const sameSite = SAME_SITE_VALUES.includes(requestedSameSite) ? requestedSameSite : 'lax';

const config = {
  nodeEnv,
  isProduction,
  isTest,
  port: readInt('PORT', 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/df-blogs',
  clientUrl,
  serverUrl,
  // Hosts such as Render/Heroku put one reverse proxy in front of the app; trust it by default in production.
  trustProxy: readInt('TRUST_PROXY', isProduction ? 1 : 0),
  bcryptCost: isTest ? 4 : 12,

  jwt: {
    accessSecret: readSecret('JWT_ACCESS_SECRET'),
    refreshSecret: readSecret('JWT_REFRESH_SECRET'),
    accessTtlSeconds: 15 * 60,
    refreshTtlSeconds: 7 * 24 * 60 * 60,
  },

  cookies: {
    // SameSite=None is only accepted by browsers together with Secure.
    secure: isProduction || sameSite === 'none',
    sameSite,
    domain: process.env.COOKIE_DOMAIN || undefined,
  },

  storage: {
    provider: (process.env.IMAGE_STORAGE || 'local').toLowerCase(),
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
      folder: process.env.CLOUDINARY_FOLDER || 'df-blogs',
    },
    maxUploadBytes: readInt('MAX_UPLOAD_MB', 2) * 1024 * 1024,
    uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'),
  },

  site: {
    name: process.env.SITE_NAME || 'DF Blogs',
    description:
      process.env.SITE_DESCRIPTION ||
      'Practical articles on engineering, design, security and search from the DF Blogs editorial team.',
    contactEmail: process.env.SITE_CONTACT_EMAIL || 'hello@dfblogs.example',
    contactPhone: process.env.SITE_CONTACT_PHONE || '',
    address: process.env.SITE_ADDRESS || '',
    legalEntity: process.env.SITE_LEGAL_ENTITY || 'DF Blogs',
  },

  analytics: {
    provider: (process.env.ANALYTICS_PROVIDER || 'none').toLowerCase(),
    id: process.env.ANALYTICS_ID || '',
    scriptUrl: process.env.ANALYTICS_SCRIPT_URL || 'https://plausible.io/js/script.js',
  },
};

if (config.storage.provider === 'cloudinary') {
  const { cloudName, apiKey, apiSecret } = config.storage.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('IMAGE_STORAGE=cloudinary requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET');
  }
}

/** URL prefixes the API accepts as "one of our own images". */
config.storage.allowedImagePrefixes = [
  `${serverUrl}/uploads/`,
  ...(config.storage.cloudinary.cloudName
    ? [`https://res.cloudinary.com/${config.storage.cloudinary.cloudName}/`]
    : []),
];

/**
 * Problems that would make a production deployment misbehave (checked when the server starts,
 * so a bad Render environment fails loudly instead of serving broken links).
 */
config.productionProblems = () => {
  if (!isProduction) return [];
  const problems = [];
  if (!hasMongoUri) problems.push('MONGODB_URI is not set');
  if (!hasClientUrl || isLocalUrl(clientUrl)) problems.push('CLIENT_URL must be the public https:// URL of the website (not localhost)');
  if (isLocalUrl(serverUrl)) problems.push('SERVER_URL must be the public https:// URL of this API (not localhost)');
  return problems;
};

module.exports = config;
