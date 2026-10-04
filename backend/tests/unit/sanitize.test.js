const { stripTags, cleanHtml, isOwnedImageUrl, escapeRegex, escapeXml } = require('../../utils/sanitize');

describe('stripTags', () => {
  it('removes all markup and scripts', () => {
    expect(stripTags('<b>Hello</b> <script>alert(1)</script>world')).toBe('Hello world');
  });

  it('keeps ampersands and angle brackets as readable text, not entities', () => {
    expect(stripTags('Q&A: 2 < 3')).toBe('Q&A: 2 < 3');
  });

  it('does not double-decode encoded entities', () => {
    expect(stripTags('&amp;lt;')).toBe('&lt;');
  });

  it('trims, collapses whitespace and enforces a maximum length', () => {
    expect(stripTags('  a   b  ')).toBe('a b');
    expect(stripTags('abcdefghij', 4)).toBe('abcd');
  });

  it('handles null and non-string input', () => {
    expect(stripTags(null)).toBe('');
    expect(stripTags(undefined)).toBe('');
    expect(stripTags(42)).toBe('42');
  });
});

describe('cleanHtml', () => {
  it('keeps the formatting tags the editor produces', () => {
    const html = '<h2>T</h2><p><strong>b</strong><em>i</em></p><ul><li>x</li></ul><blockquote>q</blockquote>';
    expect(cleanHtml(html)).toBe(html);
  });

  it.each([
    ['script tag', '<p>a</p><script>alert(1)</script>', 'alert'],
    ['inline event handler', '<p onclick="steal()">a</p>', 'onclick'],
    ['javascript: link', '<a href="javascript:alert(1)">x</a>', 'javascript:'],
    ['iframe', '<iframe src="https://evil.example"></iframe>', 'iframe'],
    ['style attribute', '<p style="background:url(x)">a</p>', 'style'],
    ['svg payload', '<svg onload="alert(1)"></svg>', 'svg'],
    ['data: image', '<img src="data:text/html;base64,PHNjcmlwdD4=">', 'data:'],
  ])('neutralises %s', (_name, payload, forbidden) => {
    expect(cleanHtml(payload)).not.toContain(forbidden);
  });

  it('forces safe rel/target on links', () => {
    const output = cleanHtml('<a href="https://example.com">x</a>');
    expect(output).toContain('rel="noopener noreferrer nofollow"');
    expect(output).toContain('target="_blank"');
  });

  it('drops images that are not hosted by our own storage', () => {
    expect(cleanHtml('<p>a</p><img src="https://tracker.example/pixel.gif" alt="x">')).toBe('<p>a</p>');
  });

  it('keeps images hosted by our own storage', () => {
    const html = '<img src="http://localhost:5000/uploads/abc.webp" alt="ok" />';
    expect(cleanHtml(html)).toContain('/uploads/abc.webp');
  });
});

describe('isOwnedImageUrl', () => {
  it('accepts only URLs under an allowed storage prefix', () => {
    expect(isOwnedImageUrl('http://localhost:5000/uploads/a.webp')).toBe(true);
    expect(isOwnedImageUrl('http://localhost:5000.evil.example/uploads/a.webp')).toBe(false);
    expect(isOwnedImageUrl('https://evil.example/uploads/a.webp')).toBe(false);
    expect(isOwnedImageUrl(undefined)).toBe(false);
  });
});

describe('escaping helpers', () => {
  it('escapes regex metacharacters so user input is matched literally', () => {
    const pattern = new RegExp(escapeRegex('a.b*(c)'));
    expect(pattern.test('a.b*(c)')).toBe(true);
    expect(pattern.test('aXbbbc')).toBe(false);
  });

  it('escapes XML special characters', () => {
    expect(escapeXml(`<a href="x">&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;');
  });
});
