// Build-time static HTML for SEO and no-JS readers.
// Injects the project list, a visually hidden profile article and the
// JSON-LD Person block into index.html, all read from src/data/*.js so the
// data files stay the single source of truth.
//
// Placeholders in index.html:
//   <!--STATIC_CONTENT-->  project list + profile article (inside <main>)
//   <!--JSON_LD-->         Person structured data (inside <head>)
//   <!--INTRO_LINKS-->     external contact links in the first-screen action row
//   __DESCRIPTION__        meta description, og and twitter description
//   __EMAIL__              contact email
//   __VALUE_PROP__         one-sentence value proposition under the identity line
//
// Build output: dist/sitemap.xml gets a <lastmod> with the build date (closeBundle).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { contact, experience, profile } from '../src/data/profile.js';
import { projects } from '../src/data/projects.js';

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// First clause of the summary, e.g. "I build, measure and operate ... end to end".
function describe() {
  const clause = profile.summary.split(':')[0].trim().replace(/\.$/, '');
  return `Christian Dixon. ${clause}.`;
}

// host name for a link label, e.g. "omnisdr.com"
const hostOf = (url) => new URL(url).hostname.replace(/^www\./, '');

// One list item per project: the case-study link, then the status and first
// headline metric, then a link to the live site and/or repo (or the private
// note). The links sit beside the title, not inside it, because anchors cannot nest.
function projectItemHtml(p, i) {
  const first = p.metrics[0];
  const meta =
    `<p class="pl-meta">` +
    `<span class="pl-status"><span class="status-dot ${esc(p.status)}" aria-hidden="true"></span>${esc(p.statusText)}</span>` +
    (first
      ? `<span class="pl-metric"><span class="pl-value">${esc(first.value)}</span> ` +
        `<span class="pl-label">${esc(first.label)}</span></span>`
      : '') +
    `</p>`;
  const links = [];
  if (p.liveUrl) links.push(`<a class="pl-link" href="${esc(p.liveUrl)}" rel="noopener">Visit ${esc(hostOf(p.liveUrl))}</a>`);
  if (p.repoUrl) links.push(`<a class="pl-link" href="${esc(p.repoUrl)}" rel="noopener">Source on GitHub</a>`);
  const tail = links.length
    ? `<div class="pl-links">${links.join('')}</div>`
    : p.privateNote
      ? `<p class="pl-private">${esc(p.privateNote)}</p>`
      : '';
  return (
    `<li class="pl-item">` +
    `<a href="#${esc(p.slug)}" data-slug="${esc(p.slug)}" data-index="${i}">` +
    `<span class="pl-title">${esc(p.title)}</span>` +
    `<span class="pl-year mono">${esc(p.year)}</span>` +
    `<span class="pl-desc">${esc(p.desc)}</span></a>` +
    meta +
    tail +
    `</li>`
  );
}

function projectListHtml() {
  const items = projects.map((p, i) => projectItemHtml(p, i)).join('');
  // tabindex -1 lets the "Skip to projects" link move focus into the list
  return `<ul class="project-list" id="project-list" tabindex="-1">${items}</ul>`;
}

function profileArticleHtml() {
  const roles = experience
    .map(
      (e) =>
        `<article><h3>${esc(e.role)}, ${esc(e.org)}</h3>` +
        `<p>${esc(e.place)}. ${esc(e.blurb)}</p>` +
        `<ul>${e.points.map((pt) => `<li>${esc(pt)}</li>`).join('')}</ul></article>`,
    )
    .join('');
  return (
    `<article class="visually-hidden" id="profile-static">` +
    `<h2>About Christian Dixon</h2>` +
    `<p>${esc(profile.headline)}, ${esc(profile.location)}.</p>` +
    `<p>${esc(profile.summary)}</p>` +
    `<p>${esc(profile.running)}</p>` +
    `<h2>Experience</h2>${roles}</article>`
  );
}

// External contact links for the first-screen action row, from contact.links.
function introLinksHtml() {
  const links = contact.links.map(
    (l) => `<a class="intro-action" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.name)}</a>`,
  );
  return links.join('\n        ');
}

function jsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    jobTitle: profile.headline,
    email: `mailto:${contact.email}`,
    url: 'https://portfolio.dimedata.cloud/',
    address: { '@type': 'PostalAddress', addressLocality: 'Nashville', addressRegion: 'TN' },
    sameAs: contact.links.map((l) => l.url),
  };
  // Escape "<" so no value can close the script tag early.
  const json = JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">\n${json}\n</script>`;
}

// Build date as YYYY-MM-DD (UTC), the sitemap <lastmod> value.
export const buildDate = (now = new Date()) => now.toISOString().slice(0, 10);

// Gives every <url> in a sitemap a <lastmod> set to `date`, replacing any
// existing one. Pure, so the build step and the unit tests share it.
export function withLastmod(xml, date) {
  return xml.replace(
    /<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>[^<]*<\/lastmod>)?/g,
    (_, loc) => `<url>\n    <loc>${loc}</loc>\n    <lastmod>${date}</lastmod>`,
  );
}

export default function staticContent() {
  let outDir = null;
  return {
    name: 'static-content',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    // sitemap.xml is copied from public/ by the time the bundle is written;
    // stamp the build date into the copy in dist/, never into the source file
    closeBundle() {
      const file = resolve(outDir, 'sitemap.xml');
      if (!existsSync(file)) return;
      writeFileSync(file, withLastmod(readFileSync(file, 'utf8'), buildDate()));
    },
    transformIndexHtml(html) {
      const description = esc(describe());
      return html
        .replace('<!--STATIC_CONTENT-->', () => `${projectListHtml()}\n    ${profileArticleHtml()}`)
        .replace('<!--JSON_LD-->', () => jsonLd())
        .replace('<!--INTRO_LINKS-->', () => introLinksHtml())
        .replaceAll('__DESCRIPTION__', description)
        .replaceAll('__VALUE_PROP__', esc(profile.valueProp))
        .replaceAll('__EMAIL__', esc(contact.email));
    },
  };
}
