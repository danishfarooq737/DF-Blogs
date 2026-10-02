const { slugify, uniqueSlug } = require('../../utils/slug');

describe('slugify', () => {
  it('produces lower-case URL-safe slugs', () => {
    expect(slugify('Hello, World! 2026')).toBe('hello-world-2026');
  });

  it('strips accents', () => {
    expect(slugify('Café Déjà Vu')).toBe('cafe-deja-vu');
  });

  it('returns an empty string when nothing usable remains', () => {
    expect(slugify('!!!')).toBe('');
    expect(slugify(null)).toBe('');
  });

  it('caps the length and never ends with a dash', () => {
    const slug = slugify(`${'word '.repeat(40)}`);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('uniqueSlug', () => {
  it('appends a counter when the slug is taken', async () => {
    const taken = new Set(['my-post', 'my-post-2']);
    const Model = { exists: async ({ slug }) => (taken.has(slug) ? { _id: 1 } : null) };
    await expect(uniqueSlug(Model, 'My Post')).resolves.toBe('my-post-3');
  });

  it('falls back to "post" for titles without usable characters', async () => {
    const Model = { exists: async () => null };
    await expect(uniqueSlug(Model, '???')).resolves.toBe('post');
  });
});
