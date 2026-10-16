// Content and repo guardrails. Zero dependencies. Run: node tools/check-content.mjs
// Exits 1 and prints every failure, one per line, if any rule is broken.
import { readdirSync, readFileSync, statSync } from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { join, relative, extname } from 'path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const failures = [];
const fail = (rule, msg) => failures.push(`FAIL [${rule}] ${msg}`);

const EM_DASH = '\u2014';
const CONTACT_EMAIL = 'chris@dimedata.cloud';
const PHONE = /\+?1?[ -.]?\d{3}[ -.]\d{3}[ -.]\d{4}/;
const SECRETS = [
  ['sk-', /\bsk-[A-Za-z0-9_-]{20,}/],
  ['ghp_', /\bghp_[A-Za-z0-9]{20,}/],
  ['github_pat_', /\bgithub_pat_[A-Za-z0-9_]{20,}/],
  ['AKIA', /\bAKIA[0-9A-Z]{16}\b/],
  ['eyJ', /\beyJ[A-Za-z0-9_-]{20,}/],
  ['re_', /\bre_[A-Za-z0-9_]{20,}/],
];

const abs = (p) => join(ROOT, p);
const rel = (p) => relative(ROOT, p).split(String.fromCharCode(92)).join("/");

function walk(dir, filter, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, filter, out);
    else if (filter(p)) out.push(p);
  }
  return out;
}

const text = (p) => readFileSync(p, 'utf8');
const lines = (s) => s.split(/\r?\n/);

// Scan files for a pattern and report each hit with file and line number.
function scan(rule, files, test, describe) {
  for (const f of files) {
    lines(text(f)).forEach((line, i) => {
      if (test(line)) fail(rule, `${rel(f)}:${i + 1} ${describe}`);
    });
  }
}

// 1. Em dashes in site source, index, README and docs.
const emDashFiles = [
  ...walk(abs('src'), () => true),
  abs('index.html'),
  abs('README.md'),
  ...walk(abs('docs'), (p) => extname(p) === '.md'),
];
scan('em-dash', emDashFiles, (l) => l.includes(EM_DASH), 'contains an em dash (U+2014); use a comma, colon or period');

// 2. Phone numbers in site source, index and README.
const phoneFiles = [...walk(abs('src'), () => true), abs('index.html'), abs('README.md')];
scan('phone', phoneFiles, (l) => PHONE.test(l), 'looks like a phone number; remove it');

// 3. Secret shapes anywhere tracked by git.
let tracked = [];
try {
  tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' })
    .split('\0').filter(Boolean).map(abs);
} catch {
  fail('secrets', 'could not run git ls-files; secret scan skipped');
}
for (const f of tracked) {
  let buf;
  try { buf = readFileSync(f); } catch { continue; }
  if (buf.includes(0)) continue; // skip binary files
  const s = buf.toString('utf8');
  for (const [name, re] of SECRETS) {
    const m = s.match(re);
    if (m) fail('secrets', `${rel(f)} matches a ${name} secret shape (value not printed)`);
  }
}

// 4 and 5. Project records and their links.
const { projects } = await import(new URL('../src/data/projects.js', import.meta.url));
const { contact } = await import(new URL('../src/data/profile.js', import.meta.url));

const REQUIRED = ['slug', 'title', 'desc', 'problem', 'built', 'result'];
const seen = new Map();
projects.forEach((p, i) => {
  const id = p.slug || `#${i}`;
  for (const k of REQUIRED) {
    if (typeof p[k] !== 'string' || !p[k].trim()) fail('projects', `${id} is missing "${k}"`);
  }
  if (!Array.isArray(p.stack) || p.stack.length === 0) fail('projects', `${id} is missing "stack"`);
  if (p.slug) {
    if (seen.has(p.slug)) fail('projects', `slug "${p.slug}" is not unique`);
    seen.set(p.slug, true);
  }
  for (const k of ['repoUrl', 'liveUrl']) {
    if (p[k] == null) continue;
    let ok = false;
    try { ok = new URL(p[k]).protocol === 'https:'; } catch { ok = false; }
    if (!ok) fail('projects', `${id} ${k} must be an https URL`);
  }
  const isPrivate = p.status === 'private' || (!p.repoUrl && !p.liveUrl);
  if (isPrivate && !(typeof p.privateNote === 'string' && p.privateNote.trim())) {
    fail('projects', `${id} is private (no public link) but has no privateNote`);
  }
});

// 6. Contact email.
if (contact?.email !== CONTACT_EMAIL) {
  fail('contact', `contact.email in src/data/profile.js must be ${CONTACT_EMAIL}`);
}

// 7. Every project slug has a scene builder. Read the file as text; do not import three.
const scenesSrc = text(abs('src/experience/scenes.js'));
const block = scenesSrc.match(/(?:export\s+)?const\s+builders\s*=\s*\{([\s\S]*?)\n\};/);
if (!block) {
  fail('scenes', 'could not find "const builders = { ... };" in src/experience/scenes.js');
} else {
  if (!/export\s+(const|\{)[^;]*\bbuilders\b/.test(scenesSrc)) {
    console.warn('WARN [scenes] builders is not exported from src/experience/scenes.js');
  }
  const keys = new Set([...block[1].matchAll(/^\s*['"]?([a-z0-9-]+)['"]?\s*:/gm)].map((m) => m[1]));
  for (const p of projects) {
    if (!keys.has(p.slug)) {
      fail('scenes', `missing scene builder for slug "${p.slug}" (add the key to builders in src/experience/scenes.js)`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  console.error(`\ncheck-content: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log(`check-content: OK (${projects.length} projects, ${tracked.length} tracked files scanned)`);
