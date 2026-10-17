// Unit tests for the content guardrail predicates (tools/content-rules.mjs).
// Secret-shaped fixtures are assembled at runtime so this file never contains one.
// Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STATUSES,
  THEMES,
  connectionProblems,
  duplicateSlugs,
  hasEmDash,
  hasPhone,
  missingSceneBuilders,
  patternProblems,
  projectProblems,
  relatedProblems,
  sceneBuilderKeys,
  secretNames,
  smallChipProblems,
  smallCountProblems,
  smallTestCounts,
} from '../content-rules.mjs';

const EM = '\u2014';
const validProject = {
  slug: 'demo',
  title: 'Demo',
  desc: 'A demo.',
  problem: 'A problem.',
  built: 'Something built.',
  result: 'A result.',
  stack: ['Node.js'],
  theme: ['assist'],
  repoUrl: 'https://github.com/example/demo',
  liveUrl: null,
  privateNote: null,
};

test('em dash: flags U+2014 and nothing else', () => {
  assert.equal(hasEmDash(`a ${EM} b`), true);
  assert.equal(hasEmDash('a - b'), false);
  assert.equal(hasEmDash('a – b'), false, 'en dash is allowed');
  assert.equal(hasEmDash('plain text'), false);
});

test('phone: flags US-style numbers and ignores metrics', () => {
  assert.equal(hasPhone('call 615-555-0100 today'), true);
  assert.equal(hasPhone('call 615.555.0100'), true);
  assert.equal(hasPhone('call 615 555 0100'), true);
  assert.equal(hasPhone('3,567 passing tests'), false);
  assert.equal(hasPhone('measured 2026-09-10'), false);
  assert.equal(hasPhone('3,567 passing tests and 70K domains per day'), false);
});

test('secrets: detects each known shape by name without returning the value', () => {
  const fake = {
    'sk-': 'sk-' + 'a'.repeat(24),
    ghp_: 'ghp_' + 'B'.repeat(24),
    github_pat_: 'github_pat_' + 'C'.repeat(24),
    AKIA: 'AKIA' + 'D'.repeat(16),
    'eyJ': 'eyJ' + 'e'.repeat(24),
    're_': 're_' + 'f'.repeat(24),
  };
  for (const [name, value] of Object.entries(fake)) {
    assert.deepEqual(secretNames(`token = ${value}`), [name]);
  }
});

test('secrets: ordinary prose and short tokens are not flagged', () => {
  assert.deepEqual(secretNames('sk-short and re_x are fine'), []);
  assert.deepEqual(secretNames('Christian Dixon, Nashville'), []);
});

test('projects: a complete public record has no problems', () => {
  assert.deepEqual(projectProblems(validProject), []);
});

test('projects: a missing required field is reported by name', () => {
  const p = { ...validProject, problem: '   ' };
  assert.deepEqual(projectProblems(p), ['demo is missing "problem"']);
});

test('projects: a theme is required and must use the allowed ids', () => {
  assert.deepEqual(projectProblems({ ...validProject, theme: [] }), ['demo is missing "theme"']);
  assert.deepEqual(projectProblems({ ...validProject, theme: ['assist', 'nope'] }), [`demo has a theme outside ${THEMES.join(', ')}`]);
  assert.deepEqual(projectProblems({ ...validProject, theme: ['voice', 'sales'] }), []);
});

test('projects: status must be one of the allowed values', () => {
  assert.deepEqual(projectProblems({ ...validProject, status: 'case' }), []);
  assert.deepEqual(projectProblems({ ...validProject, status: 'live' }), []);
  assert.deepEqual(projectProblems({ ...validProject, status: 'shipped' }), [`demo has a status outside ${STATUSES.join(', ')}`]);
});

test('projects: empty stack is reported', () => {
  assert.deepEqual(projectProblems({ ...validProject, stack: [] }), ['demo is missing "stack"']);
});

test('projects: non-https links are rejected', () => {
  const http = projectProblems({ ...validProject, repoUrl: 'http://github.com/x/y' });
  assert.deepEqual(http, ['demo repoUrl must be an https URL']);
  const junk = projectProblems({ ...validProject, liveUrl: 'not a url' });
  assert.deepEqual(junk, ['demo liveUrl must be an https URL']);
});

test('projects: a project with no public link must carry a privateNote', () => {
  const bare = { ...validProject, repoUrl: null, liveUrl: null, privateNote: null };
  assert.deepEqual(projectProblems(bare), ['demo is private (no public link) but has no privateNote']);
  const noted = { ...bare, privateNote: 'Private, available on request' };
  assert.deepEqual(projectProblems(noted), []);
});

test('projects: status "private" also requires a privateNote even with a repo', () => {
  const p = { ...validProject, status: 'private' };
  assert.deepEqual(projectProblems(p), ['demo is private (no public link) but has no privateNote']);
});

test('slugs: duplicates are reported once per extra occurrence', () => {
  assert.deepEqual(duplicateSlugs([{ slug: 'a' }, { slug: 'b' }, { slug: 'a' }, { slug: 'a' }]), ['a', 'a']);
  assert.deepEqual(duplicateSlugs([{ slug: 'a' }, { slug: 'b' }]), []);
});

test('scene builders: keys are read from the builders object source', () => {
  const src = `
const other = { zzz: 1 };
export const builders = {
  'alpha-one': buildA,
  beta: buildB,
};
`;
  const keys = sceneBuilderKeys(src);
  assert.deepEqual([...keys].sort(), ['alpha-one', 'beta']);
});

test('scene builders: missing object is signalled with null', () => {
  assert.equal(sceneBuilderKeys('const x = 1;'), null);
});

test('scene builders: every project needs a key', () => {
  const keys = new Set(['a']);
  assert.deepEqual(missingSceneBuilders([{ slug: 'a' }, { slug: 'b' }], keys), ['b']);
});

// Connections: one per theme, each with projects, and every project under one.
const oneConnectionPerTheme = THEMES.map((id) => ({ id, title: `T ${id}`, line: `L ${id}.`, projects: ['demo'] }));

test('connections: a complete set covering every theme has no problems', () => {
  assert.deepEqual(connectionProblems(oneConnectionPerTheme, [validProject]), []);
});

test('connections: a theme with no connection is reported', () => {
  const short = oneConnectionPerTheme.filter((c) => c.id !== 'viz');
  assert.ok(connectionProblems(short, []).includes('theme "viz" has no connection'));
});

test('connections: a connection with no projects is reported', () => {
  const empty = oneConnectionPerTheme.map((c) => (c.id === 'sales' ? { ...c, projects: [] } : c));
  assert.ok(connectionProblems(empty, [validProject]).includes('connection "sales" has no projects'));
});

test('connections: a project under no connection is reported', () => {
  const orphan = { ...validProject, slug: 'orphan', theme: [] };
  assert.ok(connectionProblems(oneConnectionPerTheme, [orphan]).includes('orphan is under no connection'));
});

test('connections: missing text, unknown id and duplicate ids are reported', () => {
  const bad = [
    { id: 'voice', title: '', line: 'x', projects: ['demo'] },
    { id: 'voice', title: 'T', line: 'x', projects: ['demo'] },
    { id: 'nope', title: 'T', line: 'x', projects: ['demo'] },
  ];
  const problems = connectionProblems(bad, []);
  assert.ok(problems.includes('connection "voice" is missing "title"'));
  assert.ok(problems.includes('connection "voice" is listed more than once'));
  assert.ok(problems.includes('connection "nope" is not one of the theme ids'));
});

// Small figures: chips under 100 and counts used as evidence are removed.
test('small chips: bare integers under 100 are flagged, large figures and thresholds are not', () => {
  assert.equal(smallChipProblems('demo', [{ value: '45', label: 'tests' }]).length, 1);
  assert.equal(smallChipProblems('demo', [{ value: '35 of 35', label: 'correct' }]).length, 0);
  for (const ok of ['434', '283', '231', '300+', '70K', '3,567', '578 vs 656 to 3,878', '14.3%', '< 10%', '< 2 s', '~120 ms', '0.85', '60 ms', '~47', 'RLS', 'FIT']) {
    assert.deepEqual(smallChipProblems('demo', [{ value: ok, label: 'x' }]), [], `${ok} should be allowed`);
  }
});

test('small counts in prose: test, tool and file counts are flagged; architecture facts are not', () => {
  assert.equal(smallCountProblems('demo', ['The suite runs 45 tests.']).length, 1);
  assert.equal(smallCountProblems('demo', ['18 tools, 11 of them read-only']).length, 1);
  assert.equal(smallCountProblems('demo', ['35 of 35 were correct']).length, 1);
  assert.deepEqual(smallCountProblems('demo', ['3,567 tests across 264 files']), [], 'large figures stay');
  assert.deepEqual(smallCountProblems('demo', ['A set of 27 agents in four layers, four providers.']), []);
  assert.deepEqual(smallCountProblems('demo', ['About 47 hypothesis tests, a 0.85 gate, under 10% escalated.']), []);
});

test('test counts under 1,000 are flagged; thousands separators and large counts are not', () => {
  assert.deepEqual(smallTestCounts('The test suite runs 283 tests.'), ['283 tests']);
  assert.deepEqual(smallTestCounts('231 enterprise tests for the pipeline'), ['231 enterprise tests']);
  assert.deepEqual(smallTestCounts('3,567 tests in the public repo'), [], 'thousands separator stays');
  assert.deepEqual(smallTestCounts('3,000+ automated tests'), [], 'large figure stays');
  assert.deepEqual(smallTestCounts('1,000 tests'), [], 'at the threshold stays');
  assert.deepEqual(smallTestCounts('Four providers and a 0.85 gate'), []);
});

// Related systems and shared patterns.
test('related: a list naming an unknown slug, itself or a slug twice is reported', () => {
  const problems = relatedProblems([{ slug: 'a', related: ['b', 'ghost', 'a', 'b'] }, { slug: 'b' }]);
  assert.ok(problems.includes('a lists unknown related slug "ghost"'));
  assert.ok(problems.includes('a lists itself as related'));
  assert.ok(problems.includes('a lists a related slug more than once'));
});

test('related: a valid list and an absent field have no problems', () => {
  assert.deepEqual(relatedProblems([{ slug: 'a', related: ['b'] }, { slug: 'b' }]), []);
  assert.deepEqual(relatedProblems([{ slug: 'a' }]), []);
});

test('patterns: unknown uses, missing text and unused definitions are reported', () => {
  const defs = [
    { id: 'p1', title: 'T', line: 'L' },
    { id: 'p2', title: '', line: 'L' },
  ];
  const problems = patternProblems(defs, [{ slug: 'a', patterns: ['p1', 'nope'] }]);
  assert.ok(problems.includes('a uses unknown pattern "nope"'));
  assert.ok(problems.includes('pattern "p2" is missing "title"'));
  assert.ok(problems.includes('pattern "p2" has no projects'));
  assert.deepEqual(patternProblems([{ id: 'p1', title: 'T', line: 'L' }], [{ slug: 'a', patterns: ['p1'] }]), []);
});
