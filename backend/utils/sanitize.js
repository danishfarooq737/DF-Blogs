const sanitizeHtml = require('sanitize-html');
const config = require('../config');

const ENTITIES = { '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#x27;': "'" };

/** Removes every tag, returning plain text (entities decoded; render as text only). */
function stripTags(input, maxLength = Infinity) {
  const stripped = sanitizeHtml(String(input ?? ''), { allowedTags: [], allowedAttributes: {} });
  const decoded = stripped
    .replace(/&(lt|gt|quot|#39|#x27);/g, (entity) => ENTITIES[entity])
    .replace(/&amp;/g, '&');
  return decoded.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

/** True when a URL points at an image hosted by this application's own storage. */
function isOwnedImageUrl(url) {
  if (typeof url !== 'string') return false;
  return config.storage.allowedImagePrefixes.some((prefix) => url.startsWith(prefix));
}

const CONTENT_OPTIONS = {
  allowedTags: ['h2', 'h3', 'p', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'a', 'blockquote', 'br', 'img'],
  allowedAttributes: { a: ['href', 'target', 'rel'], img: ['src', 'alt'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  transformTags: {
    a: (tagName, attribs) => ({
      tagName: 'a',
      attribs: {
        ...(attribs.href ? { href: attribs.href } : {}),
        target: '_blank',
        rel: 'noopener noreferrer nofollow',
      },
    }),
  },
  exclusiveFilter: (frame) => frame.tag === 'img' && !isOwnedImageUrl(frame.attribs.src),
};

/** Sanitises rich-text (HTML) content coming from the editor. */
const cleanHtml = (html) => sanitizeHtml(String(html ?? ''), CONTENT_OPTIONS);

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const escapeXml = (value) =>
  String(value).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

module.exports = { stripTags, cleanHtml, isOwnedImageUrl, escapeRegex, escapeXml };
