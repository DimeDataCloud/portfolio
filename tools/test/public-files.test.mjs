// Checks the public files that ship with the site: robots.txt, sitemap.xml and
// the security headers in public/_headers. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (p) => readFileSync(fileURLToPath(new URL(`../../public/${p}`, import.meta.url)), 'utf8');
const SITE = 'https://portfolio.dimedata.cloud';

test('robots.txt points at the sitemap', () => {
  assert.match(read('robots.txt'), new RegExp(`^Sitemap: ${SITE}/sitemap\.xml$`, 'm'));
});

test('sitemap.xml lists the canonical home URL', () => {
  const xml = read('sitemap.xml');
  assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.match(xml, new RegExp(`<loc>${SITE}/</loc>`));
});

test('_headers sets the framing, permissions and transport headers', () => {
  const headers = read('_headers');
  assert.match(headers, /^\s+Permissions-Policy: camera=\(\), microphone=\(\), geolocation=\(\)$/m);
  assert.match(headers, /^\s+X-Frame-Options: DENY$/m);
  assert.match(headers, /^\s+Strict-Transport-Security: max-age=31536000$/m);
});

// No script-src on purpose: Cloudflare injects an inline snippet and an
// analytics beacon at the edge, and a strict script-src turns both into
// console errors on the live site.
test('_headers sets a scoped Content-Security-Policy', () => {
  const csp = read('_headers').match(/^\s+Content-Security-Policy: (.+)$/m);
  assert.ok(csp, 'Content-Security-Policy missing');
  const directives = Object.fromEntries(csp[1].split(';').map((d) => d.trim().split(/\s+/)).map(([k, ...v]) => [k, v.join(' ')]));
  assert.equal(directives['base-uri'], "'self'");
  assert.equal(directives['object-src'], "'none'");
  assert.equal(directives['frame-ancestors'], "'none'");
  assert.equal(directives['script-src'], undefined);
});
