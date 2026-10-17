// Unit tests for the content guardrail predicates (tools/content-rules.mjs).
// Secret-shaped fixtures are assembled at runtime so this file never contains one.
// Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  THEMES,
  duplicateSlugs,
  hasEmDash,
  hasPhone,
  missingSceneBuilders,
  projectProblems,
  sceneBuilderKeys,
  secretNames,
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
