// The guardrail script end to end: it must pass on this repository.
// Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../check-content.mjs', import.meta.url));

test('check-content passes on the repository', () => {
  const run = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.equal(run.status, 0, `check-content failed:\n${run.stdout}${run.stderr}`);
  assert.match(run.stdout, /check-content: OK/);
});
