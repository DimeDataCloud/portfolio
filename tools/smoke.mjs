// End-to-end smoke test against the built site. Run: npm run smoke
//   node tools/smoke.mjs [url]
// With no url it starts `vite preview` on a free port, runs the checks, and
// stops the server. CI starts its own preview and passes the url.
//
// Checks: load and click Enter, the site starts silent, the first Tab after
// entry lands on the skip link, the first-screen actions (email, GitHub,
// LinkedIn, Projects and About) are visible inside the viewport and do not
// overlap the text above them, deep-link a case study by hash, open About, the
// phone identity line is one line, zero console errors and no horizontal
// overflow at 1440 and 390 px. Also: a run that never clicks must enter by
// itself, and a reduced-motion run that must show no entry gate, no Motion
// control and the first Tab on the skip link.

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { createServer } from 'net';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const failures = [];
const check = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`);
  if (!ok) failures.push(msg);
};

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

async function newPage(browser, viewport, extra = {}, errors) {
  const page = await browser.newPage({ viewport, ...extra });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  return page;
}

const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

// bounding box of the first match, or null
const boxOf = async (page, selector) => {
  const loc = page.locator(selector).first();
  if ((await loc.count()) === 0) return null;
  return loc.boundingBox();
};

const within = (box, viewport) =>
  !!box && box.width > 0 && box.height > 0 && box.x >= 0 && box.y >= 0 &&
  box.x + box.width <= viewport.width + 0.5 && box.y + box.height <= viewport.height + 0.5;

const overlaps = (a, b) =>
  !!a && !!b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function main() {
  let server = null;
  let url = process.argv[2] || process.env.SMOKE_URL;
  if (!url) {
    server = await startPreview();
    url = server.url;
  }
  console.log(`smoke: ${url}`);

  const browser = await chromium.launch({ args: GL_ARGS });
  try {
    // 1. motion run at desktop and phone widths
    for (const [name, viewport] of [['1440', DESKTOP], ['390', MOBILE]]) {
      const errors = [];
      const page = await newPage(browser, viewport, {}, errors);
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForSelector('#loader-enter:not([hidden])', { timeout: 30000 });
      await page.click('#enter-btn');
      await page.waitForSelector('body.entered');
      check(true, `${name}: entry gate passed`);
      const sound = await page.getAttribute('#sound-btn', 'aria-pressed');
      check(sound === 'false', `${name}: site starts silent (sound toggle aria-pressed="${sound}")`);
      await page.keyboard.press('Tab');
      const firstStop = await page.evaluate(() => document.activeElement?.className);
      check(firstStop === 'skip-link', `${name}: first Tab after entry lands on skip link (got "${firstStop}")`);
      const idBox = await boxOf(page, '#id-line');
      if (name === '390') {
        check(idBox && idBox.height < 30, `${name}: identity line is one line (height ${idBox && Math.round(idBox.height)}px)`);
      }
      const valueBox = await boxOf(page, '#value-line');
      check(within(valueBox, viewport), `${name}: value proposition is visible inside the viewport`);

      // first-screen actions: each visible, inside the viewport, and not overlapping the text above
      const actions = [
        ['#intro-mail', 'mailto:chris@dimedata.cloud'],
        ['.intro-action[href*="github.com"]', 'https://github.com/DimeDataCloud'],
        ['.intro-action[href*="linkedin.com"]', 'https://www.linkedin.com/in/christian-s-dixon'],
        ['#intro-menu', null],
      ];
      for (const [sel, href] of actions) {
        const box = await boxOf(page, sel);
        check(within(box, viewport), `${name}: action ${sel} is visible inside the viewport`);
        if (href) {
          const got = await page.getAttribute(sel, 'href');
          check(got === href, `${name}: action ${sel} links to ${href} (got "${got}")`);
        }
        check(!overlaps(box, valueBox) && !overlaps(box, idBox), `${name}: action ${sel} does not overlap the text above`);
      }
      check(!overlaps(idBox, valueBox), `${name}: identity line and value proposition do not overlap`);
      const actionsBox = await boxOf(page, '.intro-actions');
      check(actionsBox && actionsBox.y >= (valueBox?.y ?? 0) + (valueBox?.height ?? 0) - 0.5, `${name}: actions sit below the value proposition`);
      await page.click('#intro-menu');
      await page.waitForSelector('#menu-panel.open', { timeout: 5000 });
      check(true, `${name}: Projects and About action opens the menu`);
      await page.keyboard.press('Escape');
      await page.waitForSelector('#menu-panel:not(.open)');

      await page.evaluate(() => { location.hash = '#agent-eval'; });
      await page.waitForSelector('#detail.open', { timeout: 10000 });
      const title = (await page.textContent('#detail-title')).trim();
      check(title === 'Agent Evaluation Harness', `${name}: #agent-eval opens detail titled "${title}"`);
      check((await overflow(page)) <= 0, `${name}: no horizontal overflow with case study open`);
      await page.keyboard.press('Escape');
      await page.waitForSelector('#detail:not(.open)');

      await page.click('#menu-btn');
      await page.click('#menu-about');
      await page.waitForSelector('#about.open', { timeout: 10000 });
      check(true, `${name}: About opens`);
      check((await overflow(page)) <= 0, `${name}: no horizontal overflow with About open`);
      await page.keyboard.press('Escape');
      await page.waitForSelector('#about:not(.open)');

      check((await overflow(page)) <= 0, `${name}: no horizontal overflow on home`);
      check(errors.length === 0, `${name}: zero console errors${errors.length ? ` (${errors.slice(0, 3).join(' | ')})` : ''}`);
      await page.close();
    }

    // 1b. no click: the gate enters by itself after loading, still silent
    {
      const errors = [];
      const page = await newPage(browser, DESKTOP, {}, errors);
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForSelector('body.entered', { timeout: 20000 });
      const sound = await page.getAttribute('#sound-btn', 'aria-pressed');
      check(sound === 'false', `auto-enter: entered without a click, silent (aria-pressed="${sound}")`);
      check(errors.length === 0, `auto-enter: zero console errors${errors.length ? ` (${errors.slice(0, 3).join(' | ')})` : ''}`);
      await page.close();
    }

    // 2. reduced-motion run: no entry gate, static list is the page
    {
      const errors = [];
      const page = await newPage(browser, DESKTOP, { reducedMotion: 'reduce' }, errors);
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForSelector('body.no-webgl');
      const gate = await page.evaluate(() => {
        const loader = document.getElementById('loader');
        return { hidden: loader.hidden || getComputedStyle(loader).display === 'none', entered: document.body.classList.contains('entered') };
      });
      check(gate.hidden && gate.entered, 'reduced motion: no entry gate, site entered directly');
      await page.keyboard.press('Tab');
      const firstStop = await page.evaluate(() => document.activeElement?.className);
      check(firstStop === 'skip-link', `reduced motion: first Tab lands on skip link (got "${firstStop}")`);
      check(!(await page.isVisible('#mode-motion')), 'reduced motion: Motion control is hidden');
      check(await page.isVisible('#sound-btn'), 'reduced motion: sound control is visible');
      check(await page.isVisible('#project-list'), 'reduced motion: static project list is visible');
      check(errors.length === 0, `reduced motion: zero console errors${errors.length ? ` (${errors.slice(0, 3).join(' | ')})` : ''}`);
      await page.close();
    }
  } finally {
    await browser.close();
    server?.child.kill();
  }

  if (failures.length) {
    console.error(`\nsmoke: ${failures.length} failure(s)`);
    process.exit(1);
  }
  console.log('\nsmoke: OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
