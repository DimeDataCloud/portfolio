// Pure rule predicates for the content guardrails. No file or git access here,
// so tools/check-content.mjs does the scanning and tools/test/ can exercise each
// rule directly. Zero dependencies.

export const EM_DASH = '\u2014';
export const CONTACT_EMAIL = 'chris@dimedata.cloud';
export const PHONE = /\+?1?[ -.]?\d{3}[ -.]\d{3}[ -.]\d{4}/;
export const SECRETS = [
  ['sk-', /\bsk-[A-Za-z0-9_-]{20,}/],
  ['ghp_', /\bghp_[A-Za-z0-9]{20,}/],
  ['github_pat_', /\bgithub_pat_[A-Za-z0-9_]{20,}/],
  ['AKIA', /\bAKIA[0-9A-Z]{16}\b/],
  ['eyJ', /\beyJ[A-Za-z0-9_-]{20,}/],
  ['re_', /\bre_[A-Za-z0-9_]{20,}/],
];

export const REQUIRED_PROJECT_FIELDS = ['slug', 'title', 'desc', 'problem', 'built', 'result'];

export const hasEmDash = (line) => line.includes(EM_DASH);
export const hasPhone = (line) => PHONE.test(line);

// Names of every secret shape found in the text (values are never returned).
export function secretNames(text) {
  return SECRETS.filter(([, re]) => re.test(text)).map(([name]) => name);
}

// Human-readable problems for one project record. `id` names it in messages.
export function projectProblems(p, id = p?.slug ?? '?') {
  const problems = [];
  for (const k of REQUIRED_PROJECT_FIELDS) {
    if (typeof p[k] !== 'string' || !p[k].trim()) problems.push(`${id} is missing "${k}"`);
  }
  if (!Array.isArray(p.stack) || p.stack.length === 0) problems.push(`${id} is missing "stack"`);
  for (const k of ['repoUrl', 'liveUrl']) {
    if (p[k] == null) continue;
    let ok = false;
    try { ok = new URL(p[k]).protocol === 'https:'; } catch { ok = false; }
    if (!ok) problems.push(`${id} ${k} must be an https URL`);
  }
  const isPrivate = p.status === 'private' || (!p.repoUrl && !p.liveUrl);
  if (isPrivate && !(typeof p.privateNote === 'string' && p.privateNote.trim())) {
    problems.push(`${id} is private (no public link) but has no privateNote`);
  }
  return problems;
}

// Slugs that appear more than once.
export function duplicateSlugs(projects) {
  const seen = new Set();
  const dupes = [];
  for (const p of projects) {
    if (!p.slug) continue;
    if (seen.has(p.slug)) dupes.push(p.slug);
    seen.add(p.slug);
  }
  return dupes;
}

// Keys of the `builders` object in scenes.js source, or null if it is not found.
export function sceneBuilderKeys(scenesSrc) {
  const block = scenesSrc.match(/(?:export\s+)?const\s+builders\s*=\s*\{([\s\S]*?)\n\};/);
  if (!block) return null;
  return new Set([...block[1].matchAll(/^\s*['"]?([a-z0-9-]+)['"]?\s*:/gm)].map((m) => m[1]));
}

export function missingSceneBuilders(projects, keys) {
  return projects.filter((p) => !keys.has(p.slug)).map((p) => p.slug);
}
