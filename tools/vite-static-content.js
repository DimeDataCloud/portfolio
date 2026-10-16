// Build-time static HTML for SEO and no-JS readers.
// Injects the project list, a visually hidden profile article and the
// JSON-LD Person block into index.html, all read from src/data/*.js so the
// data files stay the single source of truth.
//
// Placeholders in index.html:
//   <!--STATIC_CONTENT-->  project list + profile article (inside <main>)
//   <!--JSON_LD-->         Person structured data (inside <head>)
//   __DESCRIPTION__        meta description, og and twitter description
//   __EMAIL__              contact email

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

function projectListHtml() {
  const items = projects
    .map(
      (p, i) =>
        `<li><a href="#${esc(p.slug)}" data-slug="${esc(p.slug)}" data-index="${i}">` +
        `<span class="pl-title">${esc(p.title)}</span>` +
        `<span class="pl-year mono">${esc(p.year)}</span>` +
        `<span class="pl-desc">${esc(p.desc)}</span></a></li>`,
    )
    .join('');
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

export default function staticContent() {
  return {
    name: 'static-content',
    transformIndexHtml(html) {
      const description = esc(describe());
      return html
        .replace('<!--STATIC_CONTENT-->', () => `${projectListHtml()}\n    ${profileArticleHtml()}`)
        .replace('<!--JSON_LD-->', () => jsonLd())
        .replaceAll('__DESCRIPTION__', description)
        .replaceAll('__EMAIL__', esc(contact.email));
    },
  };
}
