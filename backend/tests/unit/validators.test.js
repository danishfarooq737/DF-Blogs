const { registerSchema, loginSchema } = require('../../validators/auth.validators');
const { postBodySchema, listQuerySchema, commentBodySchema } = require('../../validators/post.validators');
const { userUpdateSchema, taxonomyParamsSchema } = require('../../validators/admin.validators');

describe('registerSchema', () => {
  const valid = { name: 'Ada', email: 'ADA@Example.com ', password: 'Passw0rdOK' };

  it('normalises email and accepts a strong password', () => {
    const result = registerSchema.parse(valid);
    expect(result.email).toBe('ada@example.com');
  });

  it.each([
    ['short password', { password: 'a1' }],
    ['no number', { password: 'onlyletters' }],
    ['no letter', { password: '12345678' }],
    ['password over bcrypt limit', { password: `a1${'x'.repeat(80)}` }],
    ['bad email', { email: 'not-an-email' }],
    ['empty name', { name: '   ' }],
    ['name is markup only', { name: '<script></script>' }],
  ])('rejects %s', (_label, override) => {
    expect(registerSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });

  it('rejects NoSQL-injection objects in place of strings', () => {
    expect(registerSchema.safeParse({ ...valid, email: { $ne: '' } }).success).toBe(false);
    expect(loginSchema.safeParse({ email: { $gt: '' }, password: { $gt: '' } }).success).toBe(false);
  });

  it('strips HTML from the name', () => {
    expect(registerSchema.parse({ ...valid, name: '<b>Ada</b>' }).name).toBe('Ada');
  });
});

describe('postBodySchema', () => {
  const valid = { title: 'Hello', content: '<p>World</p>' };

  it('applies safe defaults', () => {
    const post = postBodySchema.parse(valid);
    expect(post).toMatchObject({ status: 'draft', category: 'general', tags: [], excerpt: '' });
  });

  it('sanitises content and titles', () => {
    const post = postBodySchema.parse({ title: '<i>Hi</i>', content: '<p>ok</p><script>x()</script>' });
    expect(post.title).toBe('Hi');
    expect(post.content).toBe('<p>ok</p>');
  });

  it('lower-cases and de-duplicates tags and caps them at 8', () => {
    const tags = ['A', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    expect(postBodySchema.parse({ ...valid, tags }).tags).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  });

  it('rejects empty content and unknown statuses', () => {
    expect(postBodySchema.safeParse({ ...valid, content: '<p><br></p>' }).success).toBe(false);
    expect(postBodySchema.safeParse({ ...valid, status: 'archived' }).success).toBe(false);
  });

  it('rejects malformed category names and external image URLs', () => {
    expect(postBodySchema.safeParse({ ...valid, category: '../../etc' }).success).toBe(false);
    const image = { url: 'https://evil.example/x.png', alt: 'x' };
    expect(postBodySchema.safeParse({ ...valid, image }).success).toBe(false);
  });

  it('requires alt text on featured images', () => {
    const image = { url: 'http://localhost:5000/uploads/a.webp', alt: '' };
    expect(postBodySchema.safeParse({ ...valid, image }).success).toBe(false);
  });
});

describe('listQuerySchema', () => {
  it('falls back to safe defaults for junk paging values', () => {
    const query = listQuerySchema.parse({ page: '-5', limit: 'abc' });
    expect(query).toMatchObject({ page: 1, limit: 9, q: '', category: '', tag: '' });
  });

  it('caps the page size', () => {
    expect(listQuerySchema.parse({ limit: '9999' }).limit).toBe(9);
    expect(listQuerySchema.parse({ limit: '24' }).limit).toBe(24);
  });

  it('rejects array/object query values', () => {
    expect(listQuerySchema.safeParse({ q: ['a', 'b'] }).success).toBe(false);
    expect(listQuerySchema.safeParse({ category: { $ne: 'x' } }).success).toBe(false);
  });
});

describe('commentBodySchema', () => {
  it('strips markup and enforces a minimum length', () => {
    expect(commentBodySchema.parse({ content: '<b>Nice</b> post' }).content).toBe('Nice post');
    expect(commentBodySchema.safeParse({ content: '<b></b>a' }).success).toBe(false);
  });
});

describe('admin validators', () => {
  it('does not allow mass-assignment through the user update schema', () => {
    expect(userUpdateSchema.safeParse({ active: false }).success).toBe(true);
    expect(userUpdateSchema.safeParse({ role: 'admin', password: 'x' }).success).toBe(false);
    expect(userUpdateSchema.safeParse({}).success).toBe(false);
  });

  it('validates taxonomy route params', () => {
    expect(taxonomyParamsSchema.safeParse({ type: 'tag', name: 'node' }).success).toBe(true);
    expect(taxonomyParamsSchema.safeParse({ type: 'user', name: 'node' }).success).toBe(false);
  });
});
