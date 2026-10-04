const { stripTrailingSlash, isLocalUrl, upgradeToHttps, fixUploadUrl, fixUploadHtml } = require('../../utils/url');

const API = 'https://api.example.com';

describe('upgradeToHttps', () => {
  it('upgrades public http URLs', () => {
    expect(upgradeToHttps('http://api.example.com')).toBe('https://api.example.com');
    expect(upgradeToHttps('http://api.example.com:8080/x')).toBe('https://api.example.com:8080/x');
  });
  it('leaves https and localhost alone', () => {
    expect(upgradeToHttps('https://api.example.com')).toBe('https://api.example.com');
    expect(upgradeToHttps('http://localhost:5000')).toBe('http://localhost:5000');
    expect(upgradeToHttps('http://127.0.0.1:5000')).toBe('http://127.0.0.1:5000');
  });
  it('ignores values that are not absolute URLs', () => {
    expect(upgradeToHttps('not a url')).toBe('not a url');
  });
});

describe('isLocalUrl / stripTrailingSlash', () => {
  it('detects localhost-style URLs', () => {
    expect(isLocalUrl('http://localhost:5173')).toBe(true);
    expect(isLocalUrl('http://127.0.0.1:5000')).toBe(true);
    expect(isLocalUrl('https://blog.example.com')).toBe(false);
    expect(isLocalUrl('garbage')).toBe(false);
  });
  it('removes trailing slashes', () => {
    expect(stripTrailingSlash('https://a.com///')).toBe('https://a.com');
  });
});

describe('fixUploadUrl', () => {
  it('rewrites localhost upload URLs to the public API origin', () => {
    expect(fixUploadUrl('http://localhost:5000/uploads/a.webp', API)).toBe(`${API}/uploads/a.webp`);
    expect(fixUploadUrl('http://127.0.0.1:3000/uploads/a.webp', API)).toBe(`${API}/uploads/a.webp`);
  });
  it('rewrites the insecure form of the current https API origin', () => {
    expect(fixUploadUrl('http://api.example.com/uploads/a.webp', API)).toBe(`${API}/uploads/a.webp`);
  });
  it('does not touch cloudinary, already-correct or unrelated URLs', () => {
    const cloud = 'https://res.cloudinary.com/demo/image/upload/x.webp';
    expect(fixUploadUrl(cloud, API)).toBe(cloud);
    expect(fixUploadUrl(`${API}/uploads/a.webp`, API)).toBe(`${API}/uploads/a.webp`);
    expect(fixUploadUrl('http://other.com/uploads/a.webp', API)).toBe('http://other.com/uploads/a.webp');
    expect(fixUploadUrl(undefined, API)).toBeUndefined();
  });
});

describe('fixUploadHtml', () => {
  it('rewrites only img src attributes', () => {
    const html = '<p><img src="http://localhost:5000/uploads/a.webp" alt="x"></p><a href="http://localhost:5000/uploads/doc">doc</a>';
    expect(fixUploadHtml(html, API)).toBe(
      `<p><img src="${API}/uploads/a.webp" alt="x"></p><a href="http://localhost:5000/uploads/doc">doc</a>`,
    );
  });
  it('handles several images and single quotes', () => {
    const html = "<img src='http://localhost:5000/uploads/1.webp'><img src=\"http://api.example.com/uploads/2.webp\">";
    expect(fixUploadHtml(html, API)).toBe(`<img src='${API}/uploads/1.webp'><img src="${API}/uploads/2.webp">`);
  });
});
