# Content

All copy and facts live in two files:

- `src/data/projects.js` holds the project records. The array order is the carousel order, and each project's position sets its `P-01` index.
- `src/data/profile.js` holds the profile, headline metrics, experience, skills, education and contact details.

The carousel, the case-study panel, the menu, the profile overlay, the build-time HTML and the JSON-LD all read these files. There is no other copy to keep in sync, except the case-study table in `README.md`, which is written by hand.

## Adding a project

### 1. Add the record

Append an object to `projects` in `src/data/projects.js`:

| Field | Required | Type and rules |
|---|---|---|
| `slug` | Yes | Lowercase, hyphenated, unique. It is the URL hash (`#slug`) and the key in `builders`. |
| `title` | Yes | Shown on the hologram label, the menu and the case-study panel. |
| `year` | Yes | Four-digit string. Shown on the hologram label. |
| `status` | Yes | One of `live`, `paused`, `progress`, `case` or `archived`. Each colours the status dot in `main.css`; `case` has no class of its own, so it takes the neutral base dot. Use `case` for case-study-only records whose live state is not verified. |
| `statusText` | Yes | Label shown next to the status dot, for example `Operational`, `Pre-launch`, `In the lab`, `Case study`, `Paused, case study`. Describe the state without changing any claim. |
| `desc` | Yes | One sentence. Used in the list and the case-study panel. |
| `problem` | Yes | What was broken. One paragraph. |
| `built` | Yes | What was made. One paragraph. |
| `result` | Yes | What it measured. One paragraph. Numbers here must come from the record or from a measurement. |
| `metrics` | No | Array of `{ value, label }`. The case-study panel shows the first three. May be `[]`. |
| `stack` | Yes | Non-empty array of strings, shown as tags. |
| `liveUrl` | Yes, may be `null` | `https://` URL, or `null`. |
| `repoUrl` | Yes, may be `null` | `https://` URL, or `null`. Only public repositories. |
| `related` | No | Array of project slugs this one works with. The reverse link is derived, so list a pair once. Shown as Related systems in the case study and in the Connections view. |
| `patterns` | No | Array of ids from `patternDefs` in `src/data/projects.js`, shown under Shared patterns in the Connections view. |
| `privateNote` | Conditional | Required when there is no public link or when `status` is `private`. Use `"Private, available on request"`. Otherwise `null`. |
| `accent` | Yes | Hex colour. It tints the hologram, lightened 45 percent toward `#7ec4ff`. |

The guardrail (`tools/check-content.mjs`) checks that the required strings are present and non-empty, that the slug is unique, that links are `https`, and that a project with no public link has a `privateNote`.

### 2. Add a scene builder

Each project needs a mini scene. In `src/experience/scenes.js`, add a function that takes the material factory and returns `{ group, update(t), beat?(t) }`, then add the slug as a key in the `builders` object:

```js
const builders = {
  // ...existing keys
  'your-slug': yourScene,
};
```

Rules for scenes:

- `update(t)` must be a pure function of `t`. Do not accumulate state between frames.
- Loops must be phase-continuous, so the state at the end of a cycle matches the start.
- Keep geometry within the content budget described at the top of the file: radius about 0.42 on the XZ plane and local y between 0.05 and 0.80.
- Create materials with the `mats` helpers (`bright`, `soft`, `faint`, `line`, `custom`, `tint`) so the hologram can drive its time and reveal uniforms.

If a slug has no builder, the guardrail fails. At runtime the site would fall back to a wireframe sphere, but that is not an acceptable release state.

### 3. Check it

```bash
npm run check    # content, link and scene-builder guardrails
npm run dev      # then look at the carousel, the menu entry and the case study
npm run build && npm run check:bundle
```

Look at the new hologram at desktop width and at a phone width (under 700 px). Open the case study and confirm the three metrics, the links or the private note, and the stack tags.

### 4. Update the README

Add a row to the case-study table in `README.md`. Use the first metric as the key metric, the same `statusText`, and the same link policy as the record.

## Link policy

- A project shows a live URL when one exists, and a public repository link when the repository is public.
- A project with neither shows `privateNote`. The site renders it as text and does not link.
- Do not add a link to a private repository.

## Profile content

`src/data/profile.js` holds:

- `profile`: name, headline, location, summary and the running line. The summary's first clause becomes the meta description, so keep that clause a complete statement.
- `metrics`: the headline strip, shown in the profile overlay. Each value needs a source in the résumé or in a public repository.
- `experience`, `skills`, `education`: rendered in the profile overlay and in the build-time article.
- `contact`: `email` must be `chris@dimedata.cloud`. The guardrail enforces it. `links` drives the menu icons, the JSON-LD `sameAs` list and the overlay links.

## Copy rules

These rules are checked or enforced in review.

- No em dashes (U+2014) in site source, `index.html`, `README.md` or `docs/*.md`. The guardrail fails on them.
- No phone numbers in site source, `index.html` or `README.md`. The guardrail matches phone-number-shaped strings.
- No credentials. The guardrail scans tracked files for common key shapes.
- No eyebrow labels, scroll cues or live clocks in copy.
- Numbers must trace to the record or to a measurement you can reproduce. Do not round up.
- No small counts as evidence. A metric chip that is a bare count under 100 is removed, and copy does not use a test count under 1,000 (the check flags a bare count of tests) or a count such as "11 of them". Percentages, thresholds ("0.85", "< 2 s") and time budgets ("60 ms") stay, as do architecture facts in words ("four providers", "27 agents"). The guardrail flags the cases it can match.
