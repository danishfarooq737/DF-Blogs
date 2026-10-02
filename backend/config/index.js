/**
 * Central, validated application configuration.
 * Every environment variable used by the API is read here and nowhere else.
 */
const path = require('path');

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

const stripTrailingSlash = (url) => String(url).replace(/\/+$/, '');

const clientUrl = stripTrailingSlash(process.env.CLIENT_URL || 'http://localhost:5173');
const serverUrl = stripTrailingSlash(process.env.SERVER_URL || 'http://localhost:5000');

const config = {
  nodeEnv,
  isProduction,
  isTest,
  port: readInt('PORT', 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/df-blogs',
  clientUrl,
  serverUrl,
  trustProxy: readInt('TRUST_PROXY', 0),
  bcryptCost: isTest ? 4 : 12,

  jwt: {
    accessSecret: readSecret('JWT_ACCESS_SECRET'),
    refreshSecret: readSecret('JWT_REFRESH_SECRET'),
    accessTtlSeconds: 15 * 60,
    refreshTtlSeconds: 7 * 24 * 60 * 60,
  },

  cookies: {
    secure: isProduction,
    sameSite: (process.env.COOKIE_SAMESITE || 'lax').toLowerCase(),
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

module.exports = config;
