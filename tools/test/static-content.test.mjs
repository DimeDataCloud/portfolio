// Unit tests for the build-time static content plugin (tools/vite-static-content.js).
// Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import staticContent from '../vite-static-content.js';
import { profile } from '../../src/data/profile.js';

const EM_DASH = '\u2014';
const template = readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');
const output = staticContent().transformIndexHtml(template);

const jsonLdBlocks = [...output.matchAll(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/g)].map((m) => m[1]);

test('every placeholder is replaced', () => {
  for (const token of ['<!--STATIC_CONTENT-->', '<!--JSON_LD-->', '__DESCRIPTION__', '__EMAIL__']) {
    assert.ok(!output.includes(token), `${token} is still in the output`);
  }
});

test('exactly one JSON-LD block and it parses as a Person', () => {
  assert.equal(jsonLdBlocks.length, 1);
  const data = JSON.parse(jsonLdBlocks[0]);
  assert.equal(data['@context'], 'https://schema.org');
  assert.equal(data['@type'], 'Person');
  assert.equal(data.name, profile.name);
  assert.equal(data.jobTitle, profile.headline);
  assert.ok(Array.isArray(data.sameAs) && data.sameAs.length > 0);
  for (const url of data.sameAs) assert.match(url, /^https:\/\//);
});

test('JSON-LD escapes "<" so no value can close the script tag early', () => {
  const raw = jsonLdBlocks[0];
  assert.ok(!raw.includes('<'), 'raw "<" found inside JSON-LD');
});

test('title and meta description are present and non-empty', () => {
  const title = output.match(/<title>([^<]*)<\/title>/);
  assert.ok(title && title[1].trim().length > 10, 'title missing or too short');
  const desc = output.match(/<meta name="description" content="([^"]*)"/);
  assert.ok(desc && desc[1].startsWith('Christian Dixon.'), 'meta description missing');
  assert.ok(desc[1].length > 20 && desc[1].length <= 320, `meta description length ${desc[1].length}`);
});

test('og and twitter descriptions mirror the meta description', () => {
  const desc = output.match(/<meta name="description" content="([^"]*)"/)[1];
  for (const prop of ['og:description', 'twitter:description']) {
    const m = output.match(new RegExp(`<meta property="${prop}" content="([^"]*)"|<meta name="${prop}" content="([^"]*)"`));
    assert.ok(m, `${prop} missing`);
    assert.equal(m[1] ?? m[2], desc, `${prop} differs from meta description`);
  }
});

test('static list has one item per project and the profile article is present', () => {
  const items = output.match(/<li class="pl-item">/g) ?? [];
  assert.equal(items.length, 9);
  assert.match(output, /<article class="visually-hidden" id="profile-static">/);
  assert.ok(output.includes(profile.summary), 'profile summary missing from the static article');
});

test('no em dash anywhere in the built HTML', () => {
  assert.ok(!output.includes(EM_DASH), 'em dash found in built output');
});

test('contact email is escaped into the mailto link and the menu', () => {
  assert.match(output, /href="mailto:chris@dimedata\.cloud"/);
  assert.match(output, /id="menu-mail"[^>]*>chris@dimedata\.cloud</);
});

test('value proposition comes from profile data and sits in the first-screen markup', () => {
  assert.ok(profile.valueProp && profile.valueProp.endsWith('.'), 'valueProp must be one sentence');
  assert.ok(output.includes(`<p class="value-line" id="value-line">${profile.valueProp}</p>`), 'value line missing from output');
});
