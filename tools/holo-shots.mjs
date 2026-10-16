// Hologram v2 verification pass — captures each of the 9 projects
// front-center (arrow keys step the ring), a hover state, a mobile
// viewport, and logs a rough fps average. Run: node tools/holo-shots.mjs [url]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { fileURLToPath } from "url";

const URL = process.argv[2] || 'http://localhost:4400/';
const OUT = fileURLToPath(new URL("../shots/holo", import.meta.url));
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const errors = [];

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('#loader-enter:not([hidden])', { timeout: 15000 });
await page.click('#enter-quiet');
await page.waitForTimeout(2600);

for (let i = 0; i < 9; i++) {
  await page.screenshot({ path: `${OUT}/scene-${i}.png` });
  console.log('shot: scene-' + i);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(1700);
}

// hover state on the front hologram
await page.mouse.move(720, 560);
await page.waitForTimeout(1300);
await page.screenshot({ path: `${OUT}/hover.png` });
console.log('shot: hover');

// rough fps
const fps = await page.evaluate(
  () =>
    new Promise((res) => {
      let n = 0;
      const t0 = performance.now();
      const loop = () => {
        n++;
        if (performance.now() - t0 < 2000) requestAnimationFrame(loop);
        else res(Math.round(n / 2));
      };
      requestAnimationFrame(loop);
    })
);
console.log('fps ~', fps);
await page.close();

// mobile
const mp = await browser.newPage({ viewport: { width: 375, height: 720 } });
mp.on('console', (m) => m.type() === 'error' && errors.push('[mobile] ' + m.text()));
mp.on('pageerror', (e) => errors.push('[mobile] ' + e.message));
await mp.goto(URL, { waitUntil: 'networkidle' });
await mp.waitForSelector('#loader-enter:not([hidden])', { timeout: 15000 });
await mp.click('#enter-quiet');
await mp.waitForTimeout(2600);
await mp.screenshot({ path: `${OUT}/mobile.png` });
console.log('shot: mobile');
await mp.close();

await browser.close();
if (errors.length) {
  console.log('\nCONSOLE/PAGE ERRORS:');
  errors.forEach((e) => console.log(' -', e));
  process.exit(1);
}
console.log('\nAll holo captures complete, zero console errors.');
