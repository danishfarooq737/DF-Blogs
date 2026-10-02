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
