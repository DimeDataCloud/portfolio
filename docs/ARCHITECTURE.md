# Architecture

This page describes what the code does. File paths are relative to the repository root. Numbers come from the source files named next to them.

## Layers

| Layer | Files | Role |
|---|---|---|
| Content | `src/data/profile.js`, `src/data/projects.js` | The only copy and facts on the site. Read by the build plugin, the carousel and the DOM interface. |
| Build | `tools/vite-static-content.js`, `vite.config.js` | A Vite plugin that writes content into `index.html` at build time. |
| Boot | `src/main.js` | Loader, entry gate, WebGL or fallback decision, tab visibility. |
| Experience | `src/experience/*.js`, `src/shaders/postShader.js` | Three.js renderer, carousel, holograms, input. |
| Interface | `src/ui/interface.js`, `src/ui/icons.js`, `src/styles/main.css` | Menu, case study and profile overlays, focus handling, styles. |
| Audio | `src/audio/sound.js` | Web Audio ambient pad and interaction sounds. No audio files. |

## Build-time content

`tools/vite-static-content.js` runs in `transformIndexHtml` and replaces four placeholders in `index.html`:

- `<!--STATIC_CONTENT-->` becomes the project list (anchors to `#slug`) and a visually hidden profile article with the headline, summary, running line and experience.
- `<!--JSON_LD-->` becomes a `Person` block: name, job title, email, URL, Nashville address and the `sameAs` links from `contact.links`. `<` is escaped so no value can close the script tag.
- `__DESCRIPTION__` becomes the meta description, Open Graph and Twitter description. It is built from the first clause of `profile.summary`.
- `__EMAIL__` becomes the menu email link.

Because the plugin reads the same data files the runtime reads, a content change is made once and appears in the crawlable HTML, the structured data and the WebGL interface.

## Boot sequence

`src/main.js` runs in this order:

1. The entry button labels are split into per-letter spans for a hover effect.
2. `await document.fonts.ready`. Hologram labels are drawn to canvas textures, so fonts must be loaded first.
3. If `prefers-reduced-motion: reduce` matches, the WebGL path is skipped entirely. The body gets `no-webgl` and the boot ends.
4. Otherwise `Stage`, `Carousel` and `Input` are imported dynamically, which places the Three.js code in its own chunk.
5. The loader progress is set at fixed checkpoints (0.08, 0.35, 0.6, 0.92, 1). The loader mark in `src/loader/mark.js` is a canvas node graph driven by the same progress value.
6. The entry gate shows loading progress, then one "Enter" button. Entering is always silent. If the visitor does not click, the gate enters by itself a few seconds after loading. Sound is off unless the visitor turns it on with the sound toggle.

Any exception inside the try block (module import, renderer creation, scene setup) logs a console error, adds `no-webgl` and completes the loader.

## Rendering pipeline

`src/experience/Stage.js` owns the renderer, camera and post pass.

- The renderer uses `antialias: true` and `powerPreference: 'high-performance'`. Pixel ratio is `min(devicePixelRatio, 2)`.
- The scene renders into a `WebGLRenderTarget` with `samples: 2`, which gives multisampled antialiasing into a texture.
- A second, fullscreen pass draws that texture through `src/shaders/postShader.js`. The pass adds animated film grain (amplitude 0.045) and a radial vignette with a faint blue-black tint at the edges. There is no bloom or colour grading.
- Field of view is 46 degrees below 700 px width and 35 degrees above. The camera sits at z = 8.6 and leans toward the pointer: its target is offset by up to 0.35 in x and 0.22 in y, eased with a frame-rate-independent factor, and it looks at (0, -0.5, 0).
- Background is `#0a0a0a`, matching the page.

Each frame in `main.js` runs `input.update`, `carousel.update`, `stage.updateCamera` and `stage.render`. The loop is paused and resumed by the visibility handler.

## Carousel math

`src/experience/Carousel.js` and `Holo.js` place the projects on a spiral.

- The ring is the project list written twice, so `n = 2 × projects.length` (18 for the current nine). Each entry is a `Holo` with `dataIndex = index % (n / 2)`.
- `offset` is the accumulated position of the ring in card units. For each holo, `rel = ((index - offset) mod n)`, wrapped into the range (-n/2, n/2]. `rel` is 0 for the card at front centre.
- Position: `angle = rel × angleStep`, `x = sin(angle) × r`, `z = cos(angle) × r`, and `y = -rel × vStep - 0.85`. During the entrance, `r` shrinks by up to 40 percent and `y` drops by up to 1.3 units, both scaled by `(1 - reveal)`.
- Parameters, from `Carousel.js`:

  | Viewport | radius | angleStep | vStep |
  |---|---|---|---|
  | width 700 px and up | 3.4 | 0.72 rad | 0.32 |
  | width under 700 px | 3.0 | 0.82 rad | 0.30 |

- Visibility: `dim = max(0.18, 0.8 - 0.22 × |rel|) + 0.2 × hover`, multiplied by a far-side fade that reaches zero at |rel| = 3.5. `global = reveal × dim`. A holo with `global <= 0.004` is set invisible and its animation is skipped.
- Staggered show and hide: each holo starts after `(index % 5) × 55 ms` on show and `× 30 ms` on hide.
- Hover: each frame, unless the device is touch, the pointer ray is tested against one invisible cylinder per holo (radius 0.55, height 1.7). A hit counts only if `|rel| <= 2.2` and `reveal >= 0.6`. Hover eases toward 1 and sets the cursor to pointer.
- Focus: the carousel reports the hovered index to `interface.js`, which syncs the DOM list. Keyboard and list focus call `focusProject`, which sets `offset` to the nearest wrap of the target index.

## Hologram material and composition

`src/experience/holoMaterial.js` is a shader factory. Every hologram surface is a `ShaderMaterial` with additive blending, `DoubleSide`, `depthWrite: false` and six shader kinds:

| Kind | Used for | Effect |
|---|---|---|
| `holo` | Solid parts of the mini scenes | Scanlines drifting upward, and a flicker that steps 24 times a second |
| `cone` | Beam shells | Height fade `(1 - up)^1.35` in local space, plus a fresnel edge term |
| `arc` | Status band on the dais | 24 segments cut in the fragment shader, a brightness chase that speeds up on hover |
| `glow` | Ground disc | Radial falloff with slow breathing |
| `wedge` | Radar sweep in one scene | Per-vertex trail fade |
| `motes` | Dust in the beam | Positions computed in the vertex shader from time, no per-frame CPU work |

`src/experience/Holo.js` composes one hologram from these parts:

- The dais: a lathe-profile base, the arc band, two counter-rotating halo rings with marker beads, and a pulsing emitter lens.
- The beam: two cone shells (outer and inner) and three caustic rings that rise from base to mouth on a repeating cycle.
- 30 motes.
- The project's mini scene, placed inside the beam at y = 0.32 and scaled 1.15.
- A canvas-texture label (512 × 128) with the title in Clash Display and a line of the form `P-01 · year · STATUS`, plus an accent underline that draws in on reveal.
- An invisible proxy cylinder used for raycasting.

The mini scenes are in `src/experience/scenes.js`. `builders` maps each `slug` to a function that returns `{ group, update(t), beat?(t) }`. Every `update` is a pure function of `t`, so a tab pause or a per-holo phase offset cannot leave a scene in a bad state. Unknown slugs fall back to a wireframe sphere. `tools/check-content.mjs` fails the build if a project has no builder.

## Input model

`src/experience/Input.js` turns five input types into one ring velocity and one pointer position.

| Input | Behaviour |
|---|---|
| Wheel on the canvas | Adds `deltaY × 0.0003` to target velocity, clamped to ±0.22. The sign of the last wheel event sets the idle drift direction. |
| Pointer move | Stored as normalised device coordinates for the raycast and the camera lean. |
| Touch drag | Moves the ring by `-step × 0.0016` per touch move, clamped to ±0.18. Drag beyond 9 px cancels a tap. A flick adds momentum. |
| Tap | Under the 9 px threshold. Picks the hologram under the touch point and opens it. |
| Arrow keys | Left and right step the ring by one card. |

Velocity eases toward its target, the offset integrates `velocity × dt × 60`, and the target decays by `0.3^dt` each frame. When the target is below 0.0011, it is set to 0.0011 in the last direction, so the ring keeps turning slowly when idle. Input is paused while any overlay is open.

Click on the canvas emits `press`, which opens the hovered project when there is one.

## Audio

`src/audio/sound.js` has no audio files. Everything is synthesised with Web Audio.

- Ambient: two chord stacks (A minor add 9 and F major 7) under a 0.02 Hz crossfade, a lowpass filter with a 0.05 Hz breathing LFO, a 4-second noise buffer low-passed to 240 Hz as room tone, and a 55 Hz sub tone. The ambient loops until sound is disabled.
- Hover tick: a short triangle-wave blip from 1400 to 900 Hz, about 70 ms. Plays on carousel focus change and list hover.
- Press thock: a sine from 210 to 70 Hz, about 220 ms. Plays on opening a case study and on opening the menu.
- Enable and disable ramp the master gain over 0.8 s and 0.4 s.
- A watchdog resumes the `AudioContext` if the browser suspends it, on visibility change, window focus and pointer down.
- `setMusicUrl()` can replace the ambient with a visitor-supplied track. The site does not set one.

## Fallbacks

| Condition | What happens |
|---|---|
| Reduced motion | WebGL is never created. The body gets `no-webgl`, the canvas is hidden and the DOM project list is shown with the case-study summaries. CSS also shortens animations and transitions. |
| WebGL unavailable | Any error in the boot try block logs to the console and falls back to the same `no-webgl` layout. |
| WebGL context lost | The handler calls `preventDefault`, pauses the loop and adds `no-webgl`. The code does not attempt a context restore. |
| Hidden tab | `visibilitychange` cancels the animation frame. It is requested again when the tab is visible. The audio watchdog runs on the same event. |
| Touch device | Hover raycasting is off. Tap selects and opens. Drag has momentum. |
| No JavaScript | The static project list and profile article from the build are in `<main>` for crawlers and readers without scripts. |

When WebGL runs, the CSS hides the DOM project list. The menu provides the same case-study links.

## Interface

`src/ui/interface.js` renders the profile overlay from `profile.js`, builds the menu from `projects.js` and `contact.links`, and renders the case-study panel from the project record. The case-study panel shows up to three metrics, the Problem, Built and Result sections, the stack, and the links. A project with no public link shows its `privateNote`.

Accessibility behaviour in the interface:

- Overlays are `role="dialog"` with `aria-modal`. Tab is trapped inside the open layer, and focus is restored to the element that opened it.
- Escape closes the topmost layer. Enter opens the hovered project when nothing has focus.
- The URL hash (`#slug` or `#about`) opens that layer on load. Opening or closing a layer updates the hash.
- The canvas is `aria-hidden`. The same content is available as HTML.

## SEO and sharing

- Real HTML: project list, profile article and the h1 are in the built `index.html`.
- Structured data: the `Person` JSON-LD described above.
- Metadata: canonical URL, Open Graph and Twitter card tags pointing at `public/og.png` (1200 × 630, rendered by `tools/og.mjs`), and a `theme-color` of `#0a0a0a`.
- Favicon: an inline SVG data URI, so there is no extra request.
- No analytics, cookies, local storage or third-party scripts. The only external request is the Fontshare stylesheet.

## Build and verification

- `npm run check` runs `tools/check-content.mjs`.
- `npm run build` produces `dist/`.
- `node tools/check-bundle.mjs` gzips every `dist/assets/*.js` file and enforces the 160 KB budget.
- `tools/shots.mjs`, `holo-shots.mjs`, `fps-check.mjs` and `audio-check.mjs` are Playwright scripts for manual review. They are not part of CI.
