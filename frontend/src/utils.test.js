import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, parseTags, pageWindow, readingMinutes, secureUrl, secureHtml } from './utils.js';

test('formatDate formats valid dates and ignores invalid input', () => {
  assert.equal(formatDate('2026-03-12T10:00:00Z'), '12 Mar 2026');
  assert.equal(formatDate('not a date'), '');
});

test('parseTags trims, lowercases and de-duplicates', () => {
  assert.deepEqual(parseTags('  Web Dev, security ,, web dev '), ['web dev', 'security']);
  assert.deepEqual(parseTags(''), []);
  assert.deepEqual(parseTags(undefined), []);
});

test('pageWindow keeps first, last and neighbours with gaps', () => {
  assert.deepEqual(pageWindow(1, 3), [1, 2, 3]);
  assert.deepEqual(pageWindow(5, 10), [1, null, 4, 5, 6, null, 10]);
  assert.deepEqual(pageWindow(1, 1), [1]);
});

test('readingMinutes is at least one minute and ignores markup', () => {
  assert.equal(readingMinutes('<p>short</p>'), 1);
  assert.equal(readingMinutes(`<p>${'word '.repeat(660)}</p>`), 3);
});

const live = { protocol: 'https:', hostname: 'blog.example.com' };
const dev = { protocol: 'http:', hostname: 'localhost' };

test('secureUrl upgrades http to https on an https page', () => {
  assert.equal(secureUrl('http://api.example.com/uploads/a.webp', live), 'https://api.example.com/uploads/a.webp');
  assert.equal(secureUrl('https://api.example.com/uploads/a.webp', live), 'https://api.example.com/uploads/a.webp');
});

test('secureUrl re-points localhost URLs on a public site, but not during development', () => {
  assert.equal(secureUrl('http://localhost:5000/uploads/a.webp', live), '/uploads/a.webp');
  assert.equal(secureUrl('http://localhost:5000/uploads/a.webp', { ...live, base: 'https://api.example.com' }), 'https://api.example.com/uploads/a.webp');
  assert.equal(secureUrl('http://localhost:5000/uploads/a.webp', dev), 'http://localhost:5000/uploads/a.webp');
});

test('secureUrl tolerates empty and non-string input', () => {
  assert.equal(secureUrl('', live), '');
  assert.equal(secureUrl(undefined, live), undefined);
  assert.equal(secureUrl(null, live), null);
});

test('secureHtml fixes every embedded image src but not links', () => {
  const html = '<p><img src="http://localhost:5000/uploads/a.webp"><img src=\'http://x.example.com/b.webp\'></p><a href="http://x.example.com">x</a>';
  assert.equal(
    secureHtml(html, live),
    '<p><img src="/uploads/a.webp"><img src=\'https://x.example.com/b.webp\'></p><a href="http://x.example.com">x</a>',
  );
  assert.equal(secureHtml(undefined, live), '');
});
