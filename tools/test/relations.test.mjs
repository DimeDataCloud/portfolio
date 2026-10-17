// Related systems and shared patterns on the real project data: symmetric links,
// every slug exists, the expected pairs are present, and the three shared patterns.
// Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { patternDefs, projects, relatedSlugs, sharedPatterns } from '../../src/data/projects.js';
import { patternProblems, relatedProblems, smallChipProblems, smallCountProblems } from '../content-rules.mjs';

const slugs = new Set(projects.map((p) => p.slug));

test('every declared related slug names a real project and no project relates to itself', () => {
  assert.deepEqual(relatedProblems(projects), []);
});

test('every derived related slug names a real project', () => {
  for (const [slug, list] of Object.entries(relatedSlugs)) {
    for (const other of list) assert.ok(slugs.has(other), `${slug} links to unknown ${other}`);
    assert.ok(!list.includes(slug), `${slug} links to itself`);
  }
});

test('related links are symmetric: if A lists B then B lists A', () => {
  for (const [a, list] of Object.entries(relatedSlugs)) {
    for (const b of list) {
      assert.ok(relatedSlugs[b].includes(a), `${a} lists ${b} but ${b} does not list ${a}`);
    }
  }
});

test('the relations named in the plan are present in both directions', () => {
  const pairs = [
    ['omni-sdr', 'crm-live'],
    ['omni-sdr', 'leadgen-live'],
    ['omni-sdr', 'halo-agent-os'],
    ['halo-agent-os', 'brainai'],
    ['halo-agent-os', 'agent-eval'],
    ['halo-agent-os', 'lobby'],
    ['halo-agent-os', 'claude-modder'],
    ['halo-agent-os', 'open-waddle'],
    ['receptionist-live', 'crm-live'],
    ['receptionist-live', 'halo-agent-os'],
    ['crm-live', 'leadgen-live'],
    ['brainai', 'lobby'],
    ['brainai', 'agent-eval'],
    ['open-claudeos', 'open-waddle'],
    ['open-claudeos', 'claude-modder'],
    ['trading-bot', 'agent-eval'],
    ['trading-bot', 'open-waddle'],
    ['jamlink', 'receptionist-live'],
    ['lobby', 'claude-modder'],
  ];
  for (const [a, b] of pairs) {
    assert.ok(relatedSlugs[a].includes(b), `${a} should relate to ${b}`);
    assert.ok(relatedSlugs[b].includes(a), `${b} should relate to ${a}`);
  }
});

test('portfolio-site relates to no project', () => {
  assert.deepEqual(relatedSlugs['portfolio-site'], []);
});

test('shared patterns: three entries with the plan titles and projects', () => {
  const expected = {
    approval: ['omni-sdr', 'open-claudeos', 'open-waddle', 'claude-modder'],
    tamper: ['open-waddle', 'trading-bot'],
    mcp: ['halo-agent-os', 'brainai', 'crm-live', 'lobby'],
  };
  assert.deepEqual(patternDefs.map((d) => d.title), [
    'Human approval before anything irreversible',
    'Tamper-evident logs',
    'Model Context Protocol as the seam',
  ]);
  for (const pattern of sharedPatterns) {
    assert.deepEqual([...pattern.projects].sort(), [...expected[pattern.id]].sort(), `projects for ${pattern.id}`);
  }
});

test('shared patterns: definitions are complete and every use is defined', () => {
  assert.deepEqual(patternProblems(patternDefs, projects), []);
});

test('the shipped project data has no small chips or small counts in prose', () => {
  for (const p of projects) {
    assert.deepEqual(smallChipProblems(p.slug, p.metrics), [], `${p.slug} chips`);
    assert.deepEqual(smallCountProblems(p.slug, [p.statusText, p.desc, p.problem, p.built, p.result]), [], `${p.slug} prose`);
  }
});
