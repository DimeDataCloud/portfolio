// Relative fps probe: same headless renderer, two URLs. Run:
// node tools/fps-check.mjs <urlA> <urlB>
import { chromium } from 'playwright';

const browser = await chromium.launch();

async function probe(url) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('#loader-enter:not([hidden])', { timeout: 15000 });
  await page.click('#enter-btn');
  await page.waitForTimeout(3000);
  const fps = await page.evaluate(
    () =>
      new Promise((res) => {
        let n = 0;
        const t0 = performance.now();
        const loop = () => {
          n++;
          if (performance.now() - t0 < 4000) requestAnimationFrame(loop);
          else res((n / 4).toFixed(1));
        };
        requestAnimationFrame(loop);
      })
  );
  await page.close();
  return fps;
}

for (const url of process.argv.slice(2)) {
  console.log(url, '->', await probe(url), 'fps (headless software render)');
}
await browser.close();
