const crypto = require('crypto');

/** Lower-case, URL-safe slug. Returns an empty string when nothing usable remains. */
const slugify = (text) =>
  String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');

/** Produces a slug that does not collide with an existing document of `Model`. */
async function uniqueSlug(Model, text) {
  const base = slugify(text) || 'post';
  let candidate = base;
  let attempt = 1;
  while (await Model.exists({ slug: candidate })) {
    attempt += 1;
    candidate = attempt <= 5 ? `${base}-${attempt}` : `${base}-${crypto.randomBytes(3).toString('hex')}`;
  }
  return candidate;
}

module.exports = { slugify, uniqueSlug };
