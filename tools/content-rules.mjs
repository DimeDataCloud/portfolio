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
// Status values a project may carry (its `status`, which picks the status dot).
// `case` is the neutral case-study state: no claim about whether it is running.
export const STATUSES = ['live', 'progress', 'paused', 'archived', 'case', 'private'];

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
  if (p.status !== undefined && !STATUSES.includes(p.status)) {
    problems.push(`${id} has a status outside ${STATUSES.join(', ')}`);
  }
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

// Small figures. A metric chip whose value is a bare integer under 100 is a
// count or tally, so it is removed. Percentages, thresholds ("< 2 s", "0.85")
// and time budgets ("60 ms") do not match. Approved exceptions are listed here.
export const SMALL_CHIP_VALUE = /^[~<>+]?\s*(\d{1,2})$/;
export const APPROVED_SMALL_CHIPS = ['~47']; // hypothesis-test count, kept by the owner
// Counts used as evidence in prose: "45 tests", "11 of them", "35 of 35".
// Architecture facts ("27 agents", "four providers") are deliberately not matched.
export const SMALL_COUNT_PROSE = /\b\d{1,2}\s+(?:tests?|tools?|files?|answers?|histories|findings|points|domains|notes)\b|\b\d{1,2} of \d+\b/i;

// Problems with the metric chips of one project. `metrics` is its array of { value, label }.
export function smallChipProblems(id, metrics = []) {
  const problems = [];
  for (const m of metrics) {
    const v = String(m?.value ?? '').trim();
    const hit = v.match(SMALL_CHIP_VALUE);
    if (hit && Number(hit[1]) < 100 && !APPROVED_SMALL_CHIPS.includes(v)) {
      problems.push(`${id} has a metric chip "${v}" that is a small count; remove it or use a large figure`);
    }
  }
  return problems;
}

// Problems with prose strings (copy) of one record. `texts` is a list of strings.
export function smallCountProblems(id, texts = []) {
  const problems = [];
  for (const t of texts) {
    const hit = typeof t === 'string' ? t.match(SMALL_COUNT_PROSE) : null;
    if (hit) problems.push(`${id} has a small count used as evidence in prose: "${hit[0]}"`);
  }
  return problems;
}

// Test counts used as evidence: "283 tests", "231 enterprise tests". A bare count
// of tests under 1,000 fails the build. Thousands separators (3,567) do not match
// because the count must not follow a digit, comma or period.
export const TEST_COUNT = /(?<![\d,.])(\d{1,3})\s+(?:(?:passing|automated|enterprise|unit|property|integration)\s+)?tests?\b/gi;

// Test counts under 1,000 in one line of text. Returns the matched phrases.
export function smallTestCounts(line) {
  const out = [];
  for (const m of String(line).matchAll(TEST_COUNT)) {
    if (Number(m[1]) < 1000) out.push(m[0]);
  }
  return out;
}

// Every `related` slug must name a project, and a project cannot relate to itself.
export function relatedProblems(projects) {
  const problems = [];
  const slugs = new Set(projects.map((p) => p.slug));
  for (const p of projects) {
    const id = p.slug ?? '?';
    if (p.related === undefined) continue;
    if (!Array.isArray(p.related)) {
      problems.push(`${id} "related" must be an array of slugs`);
      continue;
    }
    if (new Set(p.related).size !== p.related.length) problems.push(`${id} lists a related slug more than once`);
    for (const s of p.related) {
      if (!slugs.has(s)) problems.push(`${id} lists unknown related slug "${s}"`);
      else if (s === id) problems.push(`${id} lists itself as related`);
    }
  }
  return problems;
}

// Shared patterns: each definition needs an id, title and line, ids must be unique,
// every project pattern must be defined, and every defined pattern needs a project.
export function patternProblems(defs, projects) {
  const problems = [];
  const ids = defs.map((d) => d.id);
  for (const id of new Set(ids.filter((id, i) => ids.indexOf(id) !== i))) {
    problems.push(`pattern "${id}" is defined more than once`);
  }
  for (const d of defs) {
    for (const k of ['id', 'title', 'line']) {
      if (typeof d[k] !== 'string' || !d[k].trim()) problems.push(`pattern "${d.id ?? '?'}" is missing "${k}"`);
    }
    if (!projects.some((p) => p.patterns?.includes(d.id))) problems.push(`pattern "${d.id}" has no projects`);
  }
  for (const p of projects) {
    if (p.patterns === undefined) continue;
    if (!Array.isArray(p.patterns)) {
      problems.push(`${p.slug ?? '?'} "patterns" must be an array of ids`);
      continue;
    }
    for (const id of p.patterns) {
      if (!ids.includes(id)) problems.push(`${p.slug ?? '?'} uses unknown pattern "${id}"`);
    }
  }
  return problems;
}
