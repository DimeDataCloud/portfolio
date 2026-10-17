# Design

The site is a dark, low-light space with one 3D object type: a projected hologram per project. The design choices below are the ones the code enforces. Tokens are defined on `:root` in `src/styles/main.css`.

## Principles

1. **The work is the object.** Each project is a hologram that carries its own accent colour, index, status and title. Text supports the object and does not compete with it.
2. **Every mark means something.** The status dot shows a project's state (live, paused, in progress, archived). The `P-01` index, the year and the stack use the monospace face because they are reference data.
3. **Procedural, not decorative.** Scenes are built from primitives and shaders. Nothing is a stock asset, which keeps the page light and makes each motif something that was built on purpose.
4. **Content first, enhancement second.** The same facts appear in semantic HTML, in the structured data and in the WebGL interface. If WebGL is unavailable or motion is reduced, the site is still complete.

## Colour

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0a0a0a` | Page and WebGL clear colour |
| `--bg-soft` | `#121216` | Case-study and profile panels |
| `--panel` | `#f4f4f5` | Menu sheet, the one light surface |
| `--panel-ink` | `#0a0a0a` | Text and the close button on the menu sheet |
| `--ink` | `#fafafa` | Primary text on dark surfaces |
| `--ink-dim` | `#9a9aa2` | Secondary text, labels |
| `--ink-faint` | `#55555c` | Archived status, quiet detail |
| `--accent` | `#2f80ff` | Primary accent, focus ring, links |
| `--live` | `#34d17b` | Live status |
| `--amber` | `#e8a33d` | Paused and pre-launch status |
| `--hairline` | `rgba(250,250,250,0.12)` | Panel borders and dividers |

Each project carries an `accent` in its data record. The current projects use blue, green or amber, and the scene colour is that accent lerped 45 percent toward a light blue (`#7ec4ff`) so the holograms read as one family. Status colours are reserved for status. They are not used as decoration.

## Type

- **Display**: Clash Display, weights 500 and 600, for headings, metric values and the hologram titles.
- **Body**: Satoshi, weights 400 to 700.
- **Mono**: `ui-monospace`, Cascadia Code, JetBrains Mono, Consolas, for indexes, years, stack tags and the status line. Set at the small end of the scale and uppercase.
- **Scale**: fluid tokens (`--text-xs` to `--text-mega`) with `clamp()` so the type moves with the viewport and no breakpoint is needed for size.
- Fonts load from Fontshare. `display=swap` is set, and the boot waits for `document.fonts.ready` before any canvas text is drawn.

## Layout and space

- Edge gutter: `clamp(16px, 2.4vw, 32px)`.
- Spacing tokens: 12, 24 and 48 px.
- Radii: 8, 14, 22 px and a pill.
- The spiral is the layout on desktop. Below 700 px the field of view widens from 35 to 46 degrees and the ring tightens, so the cards stay readable on a phone.
- The motion view is a fixed viewport (`overflow: hidden` on `html` and `body`). The wheel and drag move the ring, not the page.

## Motion

- Easing tokens: `--out-expo` for panels and labels, `--inout` for symmetric moves, and `--spring`, a `linear()` curve that approximates a damped spring with a small overshoot.
- Hologram motion is a function of time, not of accumulated state. Rings rotate with opposite spins and small wobbles. Caustic rings rise and fade. Scene beats flare the emitter lens.
- Hover speeds up the scene clock by 60 percent and brightens the hologram. It does not move the object off its track.
- Entrance and exit use staggered timers (55 ms and 30 ms steps) so the ring assembles and dissolves in a sequence.
- Under `prefers-reduced-motion: reduce`, the WebGL view is not created and CSS animation durations drop to 0.01 ms. Transitions are kept at 0.15 s so state changes still read.

## Accessibility

- Real HTML under the canvas holds the full content. The canvas is `aria-hidden`.
- Focus ring: 2 px solid accent with a 3 px offset, on every focusable element.
- Overlays are modal dialogs. Tab is trapped in the open layer. Escape closes it. Focus returns to the trigger.
- Keyboard controls: arrow keys move the ring. Enter opens the hovered project. Every case study is reachable from the menu.
- Sound is opt-in. The entry gate has a single silent "Enter" button, and the sound toggle is labelled with `aria-pressed`.
- On dark surfaces, primary text is `#fafafa` and secondary text is `#9a9aa2`. The menu sheet inverts this to dark text on `#f4f4f5`.
- The no-WebGL layout is a plain list of projects with titles, years and summaries.

## Deliberately absent

These are not gaps. Each one was left out on purpose.

- No 3D models, textures or audio files. The whole visual and sound design is code. The only raster image is the social card.
- No hero video, autoplay media or sound without a click.
- No bloom, colour grading or heavy post effects. The post pass is grain and vignette only, so the frame budget goes to the holograms.
- No analytics, cookies, local storage or third-party scripts.
- No scroll cues, arrows that ask the visitor to scroll, or "scroll to explore" text. The wheel is the interaction and the ring shows it.
- No live clocks or time-of-day greetings. The page content does not change with the time.
- No eyebrow labels above headings. Section titles stand alone.
- No em dashes in copy. Copy uses commas, colons and full stops.
- No stock photography. The icons are simple-icons brand marks, the logo, and the close and sound glyphs.
