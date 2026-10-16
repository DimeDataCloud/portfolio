// Accessibility pass with axe-core against the built site. Run: npm run a11y
//   node tools/a11y.mjs [url]
// With no url it starts `vite preview` on a free port and stops it afterwards.
// Covers: the static project list (reduced-motion, no WebGL) at desktop and phone
// widths, and the case-study dialog open in the motion view at both widths.
// Fails on any serious or critical WCAG 2.0/2.1 A and AA violation. Minor and
// moderate findings are printed for review but do not fail the run.

import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { spawn } from 'child_process';
import { createServer } from 'net';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const BLOCKING = new Set(['serious', 'critical']);

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function startPreview() {
  const port = await freePort();
  const child = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), 'preview', '--port', String(port), '--strictPort'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const url = `http://localhost:${port}/`;
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return { url, child };
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  child.kill();
  throw new Error('vite preview did not start');
}

const summarise = (node) => node.target.join(' ').slice(0, 120);

// Run axe on the current page state, print every violation and return the blocking ones.
async function audit(page, label) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  console.log(`\n${label}: ${violations.length} rule(s) with violations`);
  for (const v of violations) {
    console.log(`  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`);
    for (const n of v.nodes.slice(0, 3)) console.log(`      ${summarise(n)}`);
  }
  return violations.filter((v) => BLOCKING.has(v.impact)).map((v) => `${label}: ${v.id} (${v.impact})`);
}

async function main() {
  let server = null;
  let url = process.argv[2] || process.env.SMOKE_URL;
  if (!url) {
    server = await startPreview();
    url = server.url;
  }
  console.log(`a11y: ${url}`);

  const browser = await chromium.launch({ args: GL_ARGS });
  const blocking = [];
  try {
    // 1. Static project list: reduced motion means no WebGL, so the list is the page.
    for (const [name, viewport] of [['static 1440', DESKTOP], ['static 390', MOBILE]]) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForSelector('body.no-webgl');
      blocking.push(...(await audit(page, name)));
      await context.close();
    }

    // 2. Case-study dialog open in the motion view.
    for (const [name, viewport] of [['dialog 1440', DESKTOP], ['dialog 390', MOBILE]]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForSelector('#loader-enter:not([hidden])', { timeout: 30000 });
      await page.click('#enter-quiet');
      await page.waitForSelector('body.entered');
      await page.evaluate(() => { location.hash = '#agent-eval'; });
      await page.waitForSelector('#detail.open', { timeout: 10000 });
      await page.waitForTimeout(900); // let the panel finish its entrance
      blocking.push(...(await audit(page, name)));
      await context.close();
    }
  } finally {
    await browser.close();
    server?.child.kill();
  }

  if (blocking.length) {
    console.error(`\na11y: ${blocking.length} serious or critical violation(s):`);
    for (const b of blocking) console.error(`  ${b}`);
    process.exit(1);
  }
  console.log('\na11y: OK (no serious or critical violations)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
