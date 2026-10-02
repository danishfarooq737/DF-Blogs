import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, parseTags, pageWindow, readingMinutes } from './utils.js';

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
