/** Formats an ISO date for display, e.g. "12 Mar 2026". Returns an empty string for invalid input. */
export function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Turns "  Web Dev, security ,, Web Dev " into ["web dev", "security"]. */
export function parseTags(input) {
  const cleaned = String(input || '')
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(cleaned)];
}

/** Page numbers to render around the current page, with null marking a gap. */
export function pageWindow(current, total, span = 1) {
  const pages = [];
  for (let page = 1; page <= total; page += 1) {
    if (page === 1 || page === total || Math.abs(page - current) <= span) pages.push(page);
    else if (pages[pages.length - 1] !== null) pages.push(null);
  }
  return pages;
}

/** Estimated reading time in minutes from HTML content. */
export function readingMinutes(html) {
  const words = String(html || '').replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/** Absolute URL for the current site, used for canonical links and sharing. */
export const absoluteUrl = (path = '/') => `${window.location.origin}${path}`;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const LOCAL_ORIGIN = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?=\/|$)/i;

/**
 * Makes a URL safe to use on the current page:
 *  - on a public site, localhost URLs saved during development are re-pointed at `base`
 *    (empty = same origin, which Render rewrites to the API)
 *  - on an https page, http:// URLs are upgraded to https:// so browsers do not block them as mixed content
 */
export function secureUrl(url, { protocol = globalThis.location?.protocol, hostname = globalThis.location?.hostname, base = '' } = {}) {
  if (typeof url !== 'string' || !url) return url;
  let result = url;
  if (hostname && !LOCAL_HOSTS.has(hostname)) result = result.replace(LOCAL_ORIGIN, base);
  if (protocol === 'https:') result = result.replace(/^http:\/\//i, 'https://');
  return result;
}

/** Applies secureUrl to every src="..." attribute inside an HTML string (post content). */
export function secureHtml(html, options) {
  return String(html || '').replace(/(\bsrc=["'])([^"']+)/gi, (_match, prefix, url) => `${prefix}${secureUrl(url, options)}`);
}
