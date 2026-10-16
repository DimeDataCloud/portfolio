// Empirical audio verification: enter with sound, inspect AudioContext state,
// then exercise the sound toggle twice and confirm UI + engine stay in sync.
import { chromium } from 'playwright';

const URL = process.argv[2] || 'http://localhost:4400/';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('#loader-enter:not([hidden])', { timeout: 10000 });
await page.click('#enter-sound');
await page.waitForTimeout(1500);

const probe = () => page.evaluate(() => {
  const s = window.__haloSound;
  return {
    ctxState: s.ctx?.state ?? 'none',
    enabled: s.enabled,
    masterGain: s.master ? Number(s.master.gain.value.toFixed(3)) : null,
    ambientRunning: !!s.ambient,
    btnPressed: document.getElementById('sound-btn').getAttribute('aria-pressed'),
  };
});

console.log('after enter-with-sound:', JSON.stringify(await probe()));

// toggle off
await page.click('#sound-btn');
await page.waitForTimeout(700);
console.log('after toggle OFF:     ', JSON.stringify(await probe()));

// toggle back on
await page.click('#sound-btn');
await page.waitForTimeout(1200);
console.log('after toggle ON:      ', JSON.stringify(await probe()));

// simulate tab hide/show - ambient must survive (loop-forever requirement)
await page.evaluate(() => {
  Object.defineProperty(document, 'hidden', { value: true, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
});
await page.waitForTimeout(300);
await page.evaluate(() => {
  Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
});
await page.waitForTimeout(500);
console.log('after tab hide/show:  ', JSON.stringify(await probe()));

await browser.close();
if (errors.length) {
  console.log('ERRORS:'); errors.forEach((e) => console.log(' -', e));
  process.exit(1);
}
console.log('audio check complete, zero page errors');
