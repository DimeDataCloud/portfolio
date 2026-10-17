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
// Filter themes a project may carry (its `theme` array).
export const THEMES = ['voice', 'assist', 'llm', 'retrieval', 'eval', 'data', 'infra', 'viz', 'sales'];

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
  if (!Array.isArray(p.theme) || p.theme.length === 0) {
    problems.push(`${id} is missing "theme"`);
  } else if (p.theme.some((t) => !THEMES.includes(t))) {
    problems.push(`${id} has a theme outside ${THEMES.join(', ')}`);
  }
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

// Problems with the Connections view data. `linked` is the derived list from
// projects.js (each connection with its `projects` slugs). Every connection must
// name a theme and have at least one project; every project must sit under at
// least one connection; every theme must have exactly one connection.
export function connectionProblems(linked, projects) {
  const problems = [];
  const ids = linked.map((c) => c.id);
  for (const id of new Set(ids.filter((id, i) => ids.indexOf(id) !== i))) {
    problems.push(`connection "${id}" is listed more than once`);
  }
  for (const c of linked) {
    const id = c.id ?? '?';
    for (const k of ['title', 'line']) {
      if (typeof c[k] !== 'string' || !c[k].trim()) problems.push(`connection "${id}" is missing "${k}"`);
    }
    if (!THEMES.includes(id)) problems.push(`connection "${id}" is not one of the theme ids`);
    if (!Array.isArray(c.projects) || c.projects.length === 0) {
      problems.push(`connection "${id}" has no projects`);
    }
  }
  for (const t of THEMES) {
    if (!ids.includes(t)) problems.push(`theme "${t}" has no connection`);
  }
  for (const p of projects) {
    if (!linked.some((c) => p.theme?.includes(c.id))) {
      problems.push(`${p.slug ?? '?'} is under no connection`);
    }
  }
  return problems;
}
