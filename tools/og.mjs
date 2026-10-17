// Renders public/og.png (1200x630), the social card, from an inline HTML page.
// Copy follows the site rules: no em dashes, no eyebrow label, no scroll cue,
// no live clock, no device mockups. Numbers match src/data/profile.js.
// Run: node tools/og.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

const OUT = fileURLToPath(new URL('../public/og.png', import.meta.url));

const metrics = [
  { value: '27', label: 'agents running unattended in a four-layer hierarchy' },
  { value: '3,567', label: 'passing tests in the public H.A.L.O showcase repo' },
  { value: '70K', label: 'domains scanned per day by the lead engine' },
];

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@import url('https://api.fontshare.com/v2/css?f[]=clash-display@500,600&f[]=satoshi@400,500&display=swap');
:root { --bg:#0a0a0a; --ink:#fafafa; --dim:#9a9aa2; --accent:#2f80ff; --hair:rgba(250,250,250,.12); }
* { margin:0; box-sizing:border-box; }
html, body { width:1200px; height:630px; background:var(--bg); }
body {
  position:relative; overflow:hidden; color:var(--ink);
  font-family:'Satoshi','Segoe UI',system-ui,sans-serif;
  padding:84px 92px 72px; display:flex; flex-direction:column; justify-content:space-between;
  background:
    radial-gradient(70% 90% at 85% 0%, rgba(47,128,255,.16), transparent 62%),
    radial-gradient(50% 60% at 0% 100%, rgba(47,128,255,.06), transparent 70%),
    var(--bg);
}
h1 { font-family:'Clash Display','Segoe UI',system-ui,sans-serif; font-weight:600; font-size:100px; line-height:.95; letter-spacing:-.025em; }
h2 { font-family:'Clash Display','Segoe UI',system-ui,sans-serif; font-weight:500; font-size:44px; line-height:1.1; color:var(--accent); margin-top:26px; letter-spacing:-.01em; }
.metrics { display:grid; grid-template-columns:repeat(3,1fr); gap:0; border-top:1px solid var(--hair); padding-top:34px; }
.m { padding-right:40px; }
.m + .m { padding-left:40px; border-left:1px solid var(--hair); }
.v { font-family:'Clash Display','Segoe UI',system-ui,sans-serif; font-weight:600; font-size:60px; line-height:1; letter-spacing:-.02em; }
.l { margin-top:12px; font-size:22px; line-height:1.35; color:var(--dim); }
</style></head><body>
<div>
  <h1>Christian Dixon</h1>
  <h2>Applied AI &amp; Machine Learning Engineer</h2>
</div>
<div class="metrics">
  ${metrics.map((m) => `<div class="m"><div class="v">${m.value}</div><div class="l">${m.label}</div></div>`).join('')}
</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
await page.screenshot({ path: OUT });
await browser.close();
console.log('og.png written');
