// Gzipped JS budget. Run after `npm run build`: node tools/check-bundle.mjs
// Gzips every dist/assets/*.js and fails if the total exceeds the budget.
import { existsSync, readdirSync, readFileSync } from 'fs';
import { gzipSync } from 'zlib';
import { fileURLToPath } from 'url';
import { join } from 'path';

const BUDGET_KB = 160;
const dir = fileURLToPath(new URL('../dist/assets/', import.meta.url));

if (!existsSync(dir)) {
  console.error('check-bundle: dist/assets not found. Run `npm run build` first.');
  process.exit(1);
}

const files = readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
if (files.length === 0) {
  console.error('check-bundle: no JS files in dist/assets.');
  process.exit(1);
}

const rows = files.map((f) => {
  const raw = readFileSync(join(dir, f));
  const gz = gzipSync(raw, { level: 9 });
  return { file: f, raw: raw.length, gz: gz.length };
});

const kb = (bytes) => (bytes / 1024).toFixed(2);
const width = Math.max(...rows.map((r) => r.file.length), 'file'.length);
console.log(`${'file'.padEnd(width)}  ${'raw KB'.padStart(9)}  ${'gzip KB'.padStart(9)}`);
console.log('-'.repeat(width + 24));
for (const r of rows) {
  console.log(`${r.file.padEnd(width)}  ${kb(r.raw).padStart(9)}  ${kb(r.gz).padStart(9)}`);
}
const total = rows.reduce((s, r) => s + r.gz, 0);
console.log('-'.repeat(width + 24));
console.log(`${'total gzip'.padEnd(width)}  ${''.padStart(9)}  ${kb(total).padStart(9)}`);
console.log(`budget ${BUDGET_KB} KB gzip`);

if (total > BUDGET_KB * 1024) {
  console.error(`check-bundle: FAIL gzipped JS is ${kb(total)} KB, over the ${BUDGET_KB} KB budget.`);
  process.exit(1);
}
console.log(`check-bundle: OK (${kb(total)} KB of ${BUDGET_KB} KB)`);
