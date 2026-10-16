// The build stamps <lastmod> into dist/sitemap.xml. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildDate, withLastmod } from '../vite-static-content.js';

const source = readFileSync(fileURLToPath(new URL('../../public/sitemap.xml', import.meta.url)), 'utf8');

test('buildDate is a UTC YYYY-MM-DD string', () => {
  assert.equal(buildDate(new Date('2026-10-16T23:59:59Z')), '2026-10-16');
  assert.match(buildDate(), /^\d{4}-\d{2}-\d{2}$/);
});

test('withLastmod adds one <lastmod> per <url> after its <loc>', () => {
  const out = withLastmod(source, '2026-10-16');
  assert.match(out, /<loc>https:\/\/portfolio\.dimedata\.cloud\/<\/loc>\s*<lastmod>2026-10-16<\/lastmod>/);
  assert.equal((out.match(/<lastmod>/g) || []).length, (source.match(/<url>/g) || []).length);
});

test('withLastmod replaces an existing <lastmod> rather than duplicating it', () => {
  const stale = source.replace('</loc>', '</loc><lastmod>2000-01-01</lastmod>');
  const out = withLastmod(stale, '2026-10-16');
  assert.doesNotMatch(out, /2000-01-01/);
  assert.equal((out.match(/<lastmod>/g) || []).length, 1);
});

test('the stamped sitemap is still a valid urlset with the same locations', () => {
  const out = withLastmod(source, '2026-10-16');
  assert.match(out, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.deepEqual(out.match(/<loc>[^<]+<\/loc>/g), source.match(/<loc>[^<]+<\/loc>/g));
});
