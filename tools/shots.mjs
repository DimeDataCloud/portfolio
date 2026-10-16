// Screenshot harness for the polish loop — captures every key state
// at desktop + mobile sizes. Run: node tools/shots.mjs [url]
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";

const URL = process.argv[2] || 'http://localhost:4400/';
const OUT = fileURLToPath(new URL("../shots", import.meta.url));
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const errors = [];

async function capture(name, vp, fn) {
  const page = await browser.newPage({ viewport: vp });
  page.on('console', (m) => m.type() === 'error' && errors.push(`[${name}] ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`[${name}] ${e.message}`));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await fn?.(page);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await page.close();
  console.log('shot:', name);
}

const D = { width: 1440, height: 900 };
const M = { width: 375, height: 720 };

// 1. loader / entry gate
await capture('01-loader-desktop', D, (p) => p.waitForTimeout(1600));

// 2. main view after entering
async function enter(p) {
  await p.waitForSelector('#loader-enter:not([hidden])', { timeout: 8000 });
  await p.click('#enter-quiet');
  await p.waitForTimeout(2200);
}
await capture('02-main-desktop', D, enter);
await capture('03-main-mobile', M, enter);

// 3. hovered card on the spiral (desktop) — pointer over the front card
await capture('04-hover-desktop', D, async (p) => {
  await enter(p);
  await p.mouse.move(720, 580);
  await p.waitForTimeout(1100);
});

// 4. menu open
await capture('05-menu-desktop', D, async (p) => {
  await enter(p);
  await p.click('#menu-btn');
  await p.waitForTimeout(1100);
});
await capture('06-menu-mobile', M, async (p) => {
  await enter(p);
  await p.click('#menu-btn');
  await p.waitForTimeout(1100);
});

// 5. project detail overlay — desktop opens by clicking the hovered front card,
// mobile opens through the menu (list is carousel-only now)
await capture('07-detail-desktop', D, async (p) => {
  await enter(p);
  await p.mouse.move(720, 580);
  await p.waitForTimeout(900);
  await p.mouse.click(720, 580);
  await p.waitForTimeout(900);
});
await capture('08-detail-mobile', M, async (p) => {
  await enter(p);
  await p.click('#menu-btn');
  await p.waitForTimeout(900);
  await p.click('#menu-links a[data-index="0"]');
  await p.waitForTimeout(1200);
});

// 6. about overlay
await capture('09-about-desktop', D, async (p) => {
  await enter(p);
  await p.click('#menu-btn');
  await p.waitForTimeout(700);
  await p.click('#menu-about');
  await p.waitForTimeout(900);
});

// 7. reduced motion
{
  const page = await browser.newPage({ viewport: D, reducedMotion: 'reduce' });
  page.on('pageerror', (e) => errors.push(`[reduced] ${e.message}`));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/10-reduced-motion.png` });
  await page.close();
  console.log('shot: 10-reduced-motion');
}

await browser.close();
if (errors.length) {
  console.log('\nCONSOLE/PAGE ERRORS:');
  errors.forEach((e) => console.log(' -', e));
  process.exit(1);
}
console.log('\nAll captures complete, zero console errors.');
