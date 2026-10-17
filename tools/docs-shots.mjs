// Regenerates the README screenshots in docs/screens from the live site.
// Usage: npm run docs:shots [site-url]
//   default site-url: https://portfolio.dimedata.cloud
// Writes carousel, case-study, about, mobile, mobile-case-study and holograms
// PNGs into docs/screens/. demo.gif is not touched by this script.
import { chromium } from "playwright";
import { fileURLToPath } from "url";

const SITE = process.argv[2] || "https://portfolio.dimedata.cloud";
const OUT = fileURLToPath(new URL("../docs/screens/", import.meta.url));

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const OMNI_SDR_INDEX = "0"; // first project in the menu and carousel
const SETTLE_MS = 4000;

const browser = await chromium.launch({
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});

async function openSite(viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(SITE, { waitUntil: "load" });
  await page.waitForSelector("#loader-enter:not([hidden])", { timeout: 30000 });
  await page.click("#enter-btn");
  await page.waitForTimeout(SETTLE_MS);
  return { page, errors };
}

async function openMenuItem(page, selector) {
  await page.click("#menu-btn");
  await page.waitForTimeout(700);
  await page.click(selector);
  await page.waitForTimeout(SETTLE_MS);
}

async function assertOpen(page, selector, name) {
  const hidden = await page.getAttribute(selector, "aria-hidden");
  if (hidden !== "false") throw new Error(`${name}: ${selector} is not open`);
}

async function shoot(name, viewport, setup) {
  const { page, errors } = await openSite(viewport);
  await setup?.(page);
  await page.screenshot({ path: `${OUT}${name}.png` });
  await page.close();
  console.log("shot:", name, errors.length ? `(page errors: ${errors.join("; ")})` : "");
}

// Desktop home view
await shoot("carousel", DESKTOP);

// Omni SDR case study overlay
await shoot("case-study", DESKTOP, async (page) => {
  await openMenuItem(page, `#menu-links a[data-index="${OMNI_SDR_INDEX}"]`);
  await assertOpen(page, "#detail", "case-study");
});

// About overlay
await shoot("about", DESKTOP, async (page) => {
  await openMenuItem(page, "#menu-about");
  await assertOpen(page, "#about", "about");
});

// Mobile home view
await shoot("mobile", MOBILE);

// Mobile Omni SDR case study overlay
await shoot("mobile-case-study", MOBILE, async (page) => {
  await openMenuItem(page, `#menu-links a[data-index="${OMNI_SDR_INDEX}"]`);
  await assertOpen(page, "#detail", "mobile-case-study");
});

// Carousel with a hologram scene prominent (desktop)
await shoot("holograms", DESKTOP, async (page) => {
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(1700);
});

await browser.close();
console.log("Done. demo.gif was not regenerated.");
