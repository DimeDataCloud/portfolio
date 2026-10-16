// Content and repo guardrails. Zero dependencies. Run: node tools/check-content.mjs
// Exits 1 and prints every failure, one per line, if any rule is broken.
// The rule predicates live in tools/content-rules.mjs and are unit tested in tools/test/.
import { readdirSync, readFileSync, statSync } from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { join, relative } from 'path';
import {
  CONTACT_EMAIL,
  duplicateSlugs,
  hasEmDash,
  hasPhone,
  missingSceneBuilders,
  projectProblems,
  sceneBuilderKeys,
  secretNames,
} from './content-rules.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const failures = [];
const fail = (rule, msg) => failures.push(`FAIL [${rule}] ${msg}`);

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

// Every tracked text file (binary files skipped). Git is the source of truth,
// so untracked scratch files and dist/ never trip the checks.
let tracked = [];
try {
  tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' })
    .split('\0').filter(Boolean).map(abs);
} catch {
  fail('secrets', 'could not run git ls-files; tracked-file scans skipped');
}
const isText = (f) => {
  try { return !readFileSync(f).includes(0); } catch { return false; }
};
const trackedText = tracked.filter(isText);

// 1. Em dashes in every tracked text file under src, tools, docs and .github,
//    root *.md files and index.html.
const EM_DASH_SCOPE = /^(src|tools|docs|\.github)\/|^[^/]+\.md$|^index\.html$/;
const emDashFiles = trackedText.filter((f) => EM_DASH_SCOPE.test(rel(f)));
scan('em-dash', emDashFiles, hasEmDash, 'contains an em dash (U+2014); use a comma, colon or period');

// 2. Phone numbers in site source, index and README.
const phoneFiles = [...walk(abs('src'), () => true), abs('index.html'), abs('README.md')];
scan('phone', phoneFiles, hasPhone, 'looks like a phone number; remove it');

// 3. Secret shapes anywhere tracked by git.
for (const f of tracked) {
  let buf;
  try { buf = readFileSync(f); } catch { continue; }
  if (buf.includes(0)) continue; // skip binary files
  for (const name of secretNames(buf.toString('utf8'))) {
    fail('secrets', `${rel(f)} matches a ${name} secret shape (value not printed)`);
  }
}

// 4 and 5. Project records and their links.
const { projects } = await import(new URL('../src/data/projects.js', import.meta.url));
const { contact } = await import(new URL('../src/data/profile.js', import.meta.url));

projects.forEach((p, i) => {
  for (const msg of projectProblems(p, p.slug || `#${i}`)) fail('projects', msg);
});
for (const slug of duplicateSlugs(projects)) {
  fail('projects', `slug "${slug}" is not unique`);
}

// 6. Contact email.
if (contact?.email !== CONTACT_EMAIL) {
  fail('contact', `contact.email in src/data/profile.js must be ${CONTACT_EMAIL}`);
}

// 7. Every project slug has a scene builder. Read the file as text; do not import three.
const keys = sceneBuilderKeys(text(abs('src/experience/scenes.js')));
if (!keys) {
  fail('scenes', 'could not find "const builders = { ... };" in src/experience/scenes.js');
} else {
  for (const slug of missingSceneBuilders(projects, keys)) {
    fail('scenes', `missing scene builder for slug "${slug}" (add the key to builders in src/experience/scenes.js)`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  console.error(`\ncheck-content: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log(`check-content: OK (${projects.length} projects, ${tracked.length} tracked files scanned)`);
