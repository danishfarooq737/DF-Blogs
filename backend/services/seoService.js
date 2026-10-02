const Post = require('../models/Post');
const config = require('../config');
const { escapeXml } = require('../utils/sanitize');
const { publishedTaxonomy } = require('./postService');

const STATIC_PATHS = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/blog', priority: '0.9', changefreq: 'daily' },
  { path: '/contact', priority: '0.4', changefreq: 'yearly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
];

const urlEntry = ({ loc, lastmod, changefreq, priority }) =>
  `  <url>\n    <loc>${escapeXml(loc)}</loc>\n${lastmod ? `    <lastmod>${lastmod.toISOString()}</lastmod>\n` : ''}` +
  `    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

async function buildSitemap() {
  const base = config.clientUrl;
  const [posts, taxonomy] = await Promise.all([
    Post.find({ status: 'published' }).select('slug updatedAt').sort({ publishedAt: -1 }).limit(5000).lean(),
    publishedTaxonomy(),
  ]);
  const entries = [
    ...STATIC_PATHS.map((item) => ({ ...item, loc: `${base}${item.path}` })),
    ...taxonomy.categories.map((c) => ({ loc: `${base}/category/${encodeURIComponent(c.name)}`, changefreq: 'weekly', priority: '0.6' })),
    ...taxonomy.tags.map((t) => ({ loc: `${base}/tag/${encodeURIComponent(t.name)}`, changefreq: 'weekly', priority: '0.5' })),
    ...posts.map((p) => ({ loc: `${base}/blog/${encodeURIComponent(p.slug)}`, lastmod: p.updatedAt, changefreq: 'monthly', priority: '0.8' })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map(urlEntry).join('\n')}\n</urlset>\n`;
}

function buildRobots() {
  return ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /login', 'Disallow: /api/', '', `Sitemap: ${config.clientUrl}/sitemap.xml`, ''].join('\n');
}

module.exports = { buildSitemap, buildRobots };
