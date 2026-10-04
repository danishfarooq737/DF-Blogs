/**
 * URL helpers that keep every link the API hands out safe for an HTTPS site.
 * Pure functions (no config import) so they can be used from config itself.
 */

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1', '0.0.0.0']);

const stripTrailingSlash = (url) => String(url).replace(/\/+$/, '');

const escapeForRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** True for localhost-style URLs that can never be reached from a visitor's browser in production. */
function isLocalUrl(url) {
  try {
    return LOCAL_HOSTNAMES.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Upgrades http:// to https:// for public hosts. localhost is left alone so development keeps working. */
function upgradeToHttps(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' && !LOCAL_HOSTNAMES.has(parsed.hostname)) {
      parsed.protocol = 'https:';
      return stripTrailingSlash(parsed.toString());
    }
  } catch {
    /* not an absolute URL - leave untouched */
  }
  return url;
}

/**
 * Regex source matching origins that older data may have been saved with and that must now
 * be rewritten to the current public API origin:
 *   - any localhost / 127.0.0.1 origin (images uploaded while developing)
 *   - the insecure http:// form of the current https:// API origin
 */
function legacyOriginPattern(serverUrl) {
  const origins = ['https?://localhost(?::\\d+)?', 'https?://127\\.0\\.0\\.1(?::\\d+)?', 'https?://\\[::1\\](?::\\d+)?'];
  try {
    const parsed = new URL(serverUrl);
    if (parsed.protocol === 'https:') origins.push(`http://${escapeForRegex(parsed.host)}`);
  } catch {
    /* ignore malformed serverUrl */
  }
  return origins.join('|');
}

/** Rewrites a single stored upload URL (e.g. post.image.url) to the current public API origin. */
function fixUploadUrl(url, serverUrl) {
  if (typeof url !== 'string' || !url) return url;
  const pattern = new RegExp(`^(?:${legacyOriginPattern(serverUrl)})(?=/uploads/)`, 'i');
  return url.replace(pattern, () => serverUrl);
}

/** Rewrites <img src="..."> upload URLs inside stored post HTML to the current public API origin. */
function fixUploadHtml(html, serverUrl) {
  if (typeof html !== 'string' || !html) return html;
  const pattern = new RegExp(`(\\bsrc=["'])(?:${legacyOriginPattern(serverUrl)})(?=/uploads/)`, 'gi');
  return html.replace(pattern, (_match, prefix) => `${prefix}${serverUrl}`);
}

module.exports = { stripTrailingSlash, isLocalUrl, upgradeToHttps, fixUploadUrl, fixUploadHtml };
