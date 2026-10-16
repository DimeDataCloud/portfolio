// Renders public/og.png (1200x630) from an inline HTML card.
import { chromium } from 'playwright';
import { fileURLToPath } from "url";

const OUT = fileURLToPath(new URL("../public/og.png", import.meta.url));
const html = `<!doctype html><html><head><style>
@import url('https://api.fontshare.com/v2/css?f[]=clash-display@600&f[]=satoshi@500&display=swap');
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:radial-gradient(90% 70% at 70% 20%,rgba(47,128,255,.12),transparent 60%),#0a0a0a;
color:#fafafa;font-family:'Satoshi',sans-serif;display:flex;flex-direction:column;justify-content:center;padding:90px;position:relative;overflow:hidden}
h1{font-family:'Clash Display',sans-serif;font-weight:600;font-size:86px;letter-spacing:-.02em;line-height:1}
p{font-size:30px;color:#9a9aa2;margin-top:26px}
.chip{position:absolute;bottom:64px;left:90px;font-family:ui-monospace,Consolas,monospace;font-size:20px;letter-spacing:.08em;text-transform:uppercase;color:#9a9aa2;display:flex;align-items:center;gap:12px}
.dot{width:12px;height:12px;border-radius:50%;background:#34d17b;box-shadow:0 0 12px rgba(52,209,123,.8)}
svg{position:absolute;top:70px;right:90px;opacity:.9}
</style></head><body>
<svg width="150" height="150" viewBox="0 0 64 64"><circle cx="22" cy="24" r="5" fill="#2f80ff"/><circle cx="44" cy="20" r="3.5" fill="#fafafa"/><circle cx="40" cy="44" r="4.5" fill="#fafafa"/><circle cx="18" cy="46" r="3" fill="#2f80ff"/><path d="M22 24L44 20M44 20L40 44M40 44L18 46M18 46L22 24M22 24L40 44" stroke="#fafafa" stroke-opacity=".5" stroke-width="1.5"/></svg>
<h1>Christian Dixon</h1>
<p>Full-Stack AI Developer - AI agents, SaaS, mobile apps,<br>and the automation pipelines that connect them.</p>
<div class="chip"><span class="dot"></span>Dime Data</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.screenshot({ path: OUT });
await browser.close();
console.log('og.png written');
