// Bootstrap: loader with real progress -> entry gate -> experience.
// Handles reduced-motion, no-WebGL fallback, tab-visibility pause.

import './styles/main.css';
import { LoaderMark } from './loader/mark.js';
import { Interface } from './ui/interface.js';
import { sound } from './audio/sound.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const loaderEl = document.getElementById('loader');
const progressEl = document.getElementById('loader-progress');
const enterWrap = document.getElementById('loader-enter');
const enterSound = document.getElementById('enter-sound');
const enterQuiet = document.getElementById('enter-quiet');

// per-letter spring hover on the primary CTA
enterSound.innerHTML = enterSound.textContent
  .split('')
  .map((c, i) => `<span class="ltr" style="transition-delay:${i * 14}ms">${c === ' ' ? '&nbsp;' : c}</span>`)
  .join('');

const ui = new Interface();
window.__haloSound = sound; // debug/verification handle (also used to wire music later)

// until the gate is passed, the page behind it is inert: no tab stops under it
const behindGate = [...document.querySelectorAll('header, main, #sound-btn')];
behindGate.forEach((el) => { el.inert = true; });
function releaseGate() {
  behindGate.forEach((el) => { el.inert = false; });
}
const mark = reducedMotion ? null : new LoaderMark(document.getElementById('loader-mark'));

const NO_PARALLAX = { x: 0, y: 0 };
let experience = null;
let progress = 0;

function setProgress(p) {
  progress = Math.max(progress, Math.min(1, p));
  progressEl.textContent = String(Math.round(progress * 100)).padStart(2, '0');
  mark?.setProgress(progress);
  if (progress >= 1) showEnter();
}

let enterShown = false;
function showEnter() {
  if (enterShown) return;
  enterShown = true;
  enterWrap.hidden = false;
}

function enter(withSound) {
  if (withSound) {
    sound.enable();
    ui.reflectSound(true);
  } else {
    sound.ensure?.();
    ui.reflectSound(false);
  }
  loaderEl.classList.add('done');
  loaderEl.setAttribute('aria-hidden', 'true');
  resetFocusStart();
  // hide the gate once its fade ends
  setTimeout(() => { loaderEl.hidden = true; }, 800);
  mark?.stop();
  releaseGate();
  document.body.classList.add('entered');
  experience?.begin();
  startDeepLinks();
}

// Reduced motion or no WebGL: there is nothing to wait for, so the gate is
// skipped entirely and the static project list, About and menu are the site.
function skipGate() {
  enterShown = true; // the gate's enter buttons never appear
  mark?.stop();
  loaderEl.hidden = true;
  loaderEl.setAttribute('aria-hidden', 'true');
  releaseGate();
  document.body.classList.add('entered');
  startDeepLinks();
}

let deepLinksOn = false;
function startDeepLinks() {
  ui.openFromHash();
  if (deepLinksOn) return;
  deepLinksOn = true;
  window.addEventListener('hashchange', () => ui.openFromHash());
}

// the gate button that was clicked is hidden next: move the sequential focus
// start point to the top of the page so the next Tab lands on the skip link
// (the first stop on the page), not on the header or wherever the gate sat
function resetFocusStart() {
  const top = document.getElementById('focus-top');
  top.focus({ preventScroll: true });
  top.blur();
}

enterSound.addEventListener('click', () => enter(true));
enterQuiet.addEventListener('click', () => enter(false));

/* ---------------- boot ---------------- */
async function boot() {
  setProgress(0.08);

  // real work 1: fonts (textures draw with Clash Display)
  await document.fonts.ready.catch(() => {});
  setProgress(0.35);

  if (reducedMotion) {
    // calm path: no WebGL scene and no entry gate
    document.body.classList.add('no-webgl');
    skipGate();
    setProgress(1);
    return;
  }

  // real work 2: three.js + experience modules (dynamic = code-split)
  try {
    const [{ Stage }, { Carousel }, { Input }] = await Promise.all([
      import('./experience/Stage.js'),
      import('./experience/Carousel.js'),
      import('./experience/Input.js'),
    ]);
    setProgress(0.6);

    const { projects } = await import('./data/projects.js');
    const canvas = document.getElementById('webgl');

    const viewport = { w: innerWidth, h: innerHeight };
    const stage = new Stage(canvas, viewport);
    const input = new Input(canvas, viewport);
    const carousel = new Carousel({ stage, input, projects });
    setProgress(0.92);

    carousel.onOpen = (i) => ui.openDetail(i);
    carousel.onFocusChange = (i) => {
      // the DOM list owns focus while the pointer is over it
      ui.setListFocus(i !== null ? i : ui.domFocus);
      if (i !== null) sound.hoverTick();
    };
    ui.carousel = carousel;

    let raf = null;
    let last = performance.now();

    function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      input.update(dt);
      carousel.update(dt, now / 1000);
      // touch screens keep the camera centred: a tap must not shift the spiral
      stage.updateCamera(input.isTouch ? NO_PARALLAX : input.pointer, dt);
      stage.render(now / 1000);
      raf = requestAnimationFrame(frame);
    }

    experience = {
      begin() {
        carousel.show();
        last = performance.now();
        raf ??= requestAnimationFrame(frame);
      },
      pause() {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
      },
      resume() {
        if (!raf && document.body.classList.contains('entered')) {
          last = performance.now();
          raf = requestAnimationFrame(frame);
        }
      },
    };

    // resize
    addEventListener('resize', () => {
      viewport.w = innerWidth;
      viewport.h = innerHeight;
      stage.resize();
    });

    // pause when tab hidden
    document.addEventListener('visibilitychange', () => {
      document.hidden ? experience.pause() : experience.resume();
    });

    // context loss -> graceful fallback
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      experience.pause();
      document.body.classList.add('no-webgl');
    });

    setProgress(1);
  } catch (err) {
    console.error('WebGL unavailable, falling back to static list', err);
    document.body.classList.add('no-webgl');
    skipGate();
    setProgress(1);
  }
}

boot();
