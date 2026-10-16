<div align="center">

# Christian Dixon

**An interactive 3D portfolio where every project is a procedural hologram**

[portfolio.dimedata.cloud](https://portfolio.dimedata.cloud)

[![CI](https://github.com/DimeDataCloud/portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/DimeDataCloud/portfolio/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![three.js 0.170](https://img.shields.io/badge/three.js-0.170-black?logo=three.js)](https://threejs.org)
[![Vite 6](https://img.shields.io/badge/vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)

![Animated demo of the portfolio](docs/screens/demo.gif)

</div>

| | |
|---|---|
| ![Carousel](docs/screens/carousel.png) | ![Case study](docs/screens/case-study.png) |
| ![Profile](docs/screens/about.png) | ![Mobile carousel](docs/screens/mobile.png) |
| ![Mobile case study](docs/screens/mobile-case-study.png) | ![Holograms](docs/screens/holograms.png) |

## What this shows

- **No asset files.** Every scene is built from Three.js primitives and custom GLSL. Sound is synthesised with Web Audio. The repository has no 3D models, textures or audio files.
- **A performance budget that CI enforces.** Gzipped JavaScript, Three.js included, must stay under 160 KB. A build check fails the pipeline when it does not. The current build measures 150 KB.
- **Content as data.** Two data files drive the WebGL interface, the no-JavaScript HTML, the meta tags and the JSON-LD. A Vite plugin writes the same content into the built `index.html`.
- **Guardrails in the pipeline.** A content check fails the build on broken or private links, missing scene builders, em dashes, phone numbers and secret-shaped strings.

## The person behind it

**Applied AI & Machine Learning Engineer**, Nashville, TN.

> I build, measure and operate applied machine learning and generative AI systems end to end: the discovery that finds which process is worth automating, the engineering that takes it from prototype to production, and the statistical evaluation that proves whether it worked.

Email chris@dimedata.cloud · [LinkedIn](https://www.linkedin.com/in/christian-s-dixon) · [GitHub](https://github.com/DimeDataCloud)

| Headline number | What it measures (self-reported from my own production logs and evaluation runs) | Evidence |
|---|---|---|
| 27 | agents running unattended in a four-layer hierarchy | private, walkthrough on request |
| < 2 s | voice response budget, speech in to speech out | private, walkthrough on request |
| 75.0% | solve rate vs 50.0% for the closest open-source comparator (n=20) | private, walkthrough on request |
| 4 | model providers behind one interface, with automatic failover | private, walkthrough on request |
| 3,000+ | automated tests behind CI/CD | [HALO showcase](https://github.com/DimeDataCloud/halo-agent-showcase#by-the-numbers): 3,567 passing tests |
| 30+ days | with no outages or incidents across every deployment | private, walkthrough on request |

## Case studies

| Project | What it is | Key metric | Status | Link |
|---|---|---|---|---|
| AI Voice Receptionist | Virtual agent that answers the phone, qualifies the caller and books the appointment | 83 after-hours calls and 11 appointments in the first 30 days | Archived | private, available on request |
| Self-Hosted CRM | Pipelines, funnels and a Call Room that prepares the rep before every dial | Under 10% of replies escalated to a person | Archived | [repo](https://github.com/DimeDataCloud/crm-showcase) |
| Lead-Generation Engine | Two-axis lead scoring from free public signals | 27.2% open and 4.3% book across 233 sends | Archived | [repo](https://github.com/DimeDataCloud/lead-engine-showcase) |
| H.A.L.O Agent OS | Operating system for a one-person business, 27 agents in four layers | 578 tokens of fixed overhead per turn | Paused | [repo](https://github.com/DimeDataCloud/halo-agent-showcase) |
| Agent Evaluation Harness | Statistical harness on benchmarks written outside the company | 75.0% solve rate vs 50.0% | Operational | private, available on request |
| BrainAI Knowledge Graph | 300+ wikilinked notes in Neo4j, read by Claude over a read-only MCP server | 27 agents read it over MCP | Operational | [repo](https://github.com/DimeDataCloud/brain-graph) |
| Omni SDR | Sales development layer that checks every claim before a human-approved send | None published yet | Pre-launch | [live](https://omnisdr.com), [repo](https://github.com/DimeDataCloud/omni-sdr-showcase) |
| App Builder | Plain-language app idea to a 12-section build specification | 12 blueprint sections | In the lab | [repo](https://github.com/DimeDataCloud/app-builder) |
| This Portfolio | Procedural 3D portfolio on Three.js, with a custom post pass | About 150 KB gzipped, Three.js included | Live | [live](https://portfolio.dimedata.cloud), [repo](https://github.com/DimeDataCloud/portfolio) |

Private projects appear on the site with their case study text and no links.

## How it works

```mermaid
flowchart LR
    subgraph Build
        PD[src/data/profile.js]
        JD[src/data/projects.js]
        IH[index.html template]
        VP[tools/vite-static-content.js<br/>Vite plugin]
        PD --> VP
        JD --> VP
        IH --> VP
        VP --> DIST[dist/index.html<br/>project list, profile text,<br/>JSON-LD, meta tags]
    end
    subgraph Runtime
        BOOT[main.js<br/>fonts, loader, entry gate]
        BOOT -->|motion allowed, WebGL available| STG[Stage<br/>renderer, camera, post pass]
        BOOT -->|reduced motion or no WebGL| FB[no-webgl layout]
        IN[Input.js<br/>wheel, drag, keys, touch] --> CAR
        STG --> CAR[Carousel<br/>ring layout, hover]
        JD --> CAR
        CAR --> HOLO[Holo, two per project<br/>dais, beam, label]
        HOLO --> SC[scenes.js<br/>one builder per slug]
        HOLO --> MAT[holoMaterial.js<br/>GLSL shaders]
        CAR --> UI[interface.js<br/>menu, case study, profile]
        JD --> UI
        PD --> UI
        UI --> SND[sound.js<br/>Web Audio]
    end
    DIST --> BOOT
```

- **Content flows one way.** `src/data/` is the only copy. The build plugin writes it into the HTML for crawlers and no-JavaScript readers. The runtime reads the same files for the holograms, the menu and the overlays.
- **The 3D view is optional.** Reduced-motion visitors and browsers without WebGL get the same content as a list, and the WebGL view is never created for them.
- **Each hologram is built in code.** A shared shader factory provides the scanlines, fresnel edges, status arc and dust motes. Each project supplies one mini scene that runs inside the beam.

Full detail is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Project structure

```
index.html                       Page shell, loader, overlays, build placeholders
public/og.png                    1200 x 630 social card (rendered by tools/og.mjs)
src/main.js                      Boot: fonts, loader, entry gate, WebGL or fallback
src/data/profile.js              Profile, headline metrics, experience, skills, contact
src/data/projects.js             The nine projects: the single source for project copy
src/experience/Stage.js          Renderer, camera, parallax, post pass
src/experience/Carousel.js       Spiral layout, hover picking, focus
src/experience/Holo.js           One hologram: dais, beam, caustics, motes, label
src/experience/holoMaterial.js   Hologram shader factory (GLSL)
src/experience/scenes.js         Nine procedural mini scenes, keyed by slug
src/experience/Input.js          Wheel, drag, touch, keyboard, pointer
src/shaders/postShader.js        Grain and vignette composite
src/audio/sound.js               Web Audio ambient pad and interaction sounds
src/loader/mark.js               Canvas loader animation
src/ui/interface.js              Menu, case study, profile overlay, focus management
src/ui/icons.js                  Brand icon paths (simple-icons)
src/styles/main.css             Design tokens, layout, reduced-motion and no-WebGL styles
tools/vite-static-content.js     Vite plugin: build-time HTML, JSON-LD, meta tags
tools/check-content.mjs          Guardrails: links, copy rules, secrets, scene builders
tools/check-bundle.mjs           Gzipped JavaScript budget (160 KB)
tools/deploy.mjs                 Cloudflare Workers deploy, credentials from the environment
tools/shots.mjs                  Playwright screenshots of key states
tools/holo-shots.mjs             Playwright captures of each hologram and a rough frame rate
tools/fps-check.mjs              Relative frame-rate comparison of two URLs
tools/audio-check.mjs            Playwright check that the sound engine starts and responds
tools/sound-verify.html          Manual page for checking the sound engine
tools/og.mjs                     Renders public/og.png
docs/                            Architecture, design, content guide, screenshots
wrangler.toml                    Cloudflare route and static asset directory
vite.config.js                   Vite config with the static-content plugin
.github/workflows/ci.yml         Guardrails, build and bundle budget on every push and PR
```

## Quick start

Requires Node 22 (see `.nvmrc`) and a WebGL-capable browser.

```bash
npm ci                    # install
npm run dev               # Vite dev server
npm run verify            # content guardrails, then production build
npm run check:bundle      # gzipped JS budget, run after a build
npm run preview           # serve dist/ locally
```

Playwright tools need a browser once: `npx playwright install chromium`.

On Windows arm64, npm can skip the native rollup and esbuild binaries and the build fails. Add them with `npm install --no-save --force @rollup/rollup-win32-arm64-msvc@<rollup> @esbuild/win32-arm64@<esbuild>`, using the versions in `package-lock.json`.

## Deploy

The site deploys to Cloudflare Workers as static assets from `dist/`. The route `portfolio.dimedata.cloud/*` on the `dimedata.cloud` zone is set in `wrangler.toml`.

Credentials come from the environment only. Nothing is written to disk.

| Variable | Purpose |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Token with Workers and DNS edit access |
| `CLOUDFLARE_ACCOUNT_ID` | Account that owns the zone |

```bash
cp .env.example .env                       # fill in the two values; .env is git-ignored
npm run build
node --env-file=.env tools/deploy.mjs      # or: npm run deploy, with the variables exported
```

To deploy under another domain, change the route in `wrangler.toml` and make sure the zone exists on the account.

## Quality gates

- **`npm run verify`** runs the content guardrails (`tools/check-content.mjs`) and then the production build.
- **CI** (`.github/workflows/ci.yml`) runs on every push and pull request on Ubuntu with Node 22. It installs with `npm ci --ignore-scripts`, then runs the content guardrails, the build and the bundle budget.
- **Bundle budget.** Gzipped JavaScript across `dist/assets` must stay under 160 KB. The current build measures 150.15 KB, with Three.js included.
- **Content rules** enforced by the guardrails: every project has the required fields and a unique slug; links are `https`; a project with no public link has a `privateNote`; every slug has a scene builder; the contact email is the public one; no em dashes, phone numbers or secret-shaped strings in site source.
- **Review** uses the Playwright scripts above on desktop and phone sizes. They run locally and are not part of CI. The repository has no unit test suite.

## Fonts, icons and licence

- Typefaces are Clash Display and Satoshi from [Fontshare](https://www.fontshare.com), loaded from the Fontshare CDN under the Fontshare licence.
- Brand icons are path data from [simple-icons](https://github.com/simple-icons/simple-icons), used under its licence.
- Code is released under the [MIT License](LICENSE). Copyright Dime Data, built by [Dime Data](https://dimedata.cloud).

For contributions, see [CONTRIBUTING.md](CONTRIBUTING.md). For the design principles and the content guide, see [docs/DESIGN.md](docs/DESIGN.md) and [docs/CONTENT.md](docs/CONTENT.md).
