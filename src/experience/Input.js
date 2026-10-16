// Unified input: wheel, pointer position, touch drag with momentum,
// tap-vs-drag disambiguation, and keyboard arrows.

const TAP_DRAG_PX = 9;
const SETTLE_AFTER_S = 2.5; // idle seconds before the ring eases to the nearest card

export class Input extends EventTarget {
  constructor(canvas, viewport) {
    super();
    this.canvas = canvas;
    this.viewport = viewport;

    this.velocityTarget = 0;    // desired scroll velocity (card-units/frame-ish)
    this.velocity = 0;          // eased actual velocity
    this.offset = 0;            // accumulated scroll offset (card units)
    this.driftDir = 1;          // last scroll direction, drives idle drift
    this.pointer = { x: 0, y: 0 };        // NDC -1..1
    this.paused = false;
    this.idle = 0;              // seconds since the last wheel, touch or key input

    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this._drag = null;

    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: true });
    window.addEventListener('pointermove', (e) => this.onMove(e), { passive: true });
    canvas.addEventListener('click', (e) => this.emit('press', e));

    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: true });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));

    window.addEventListener('keydown', (e) => this.onKey(e));
  }

  emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  onWheel(e) {
    if (this.paused) return;
    this.idle = 0;
    // wheel accelerates the spiral; scrolling the other way flips its direction
    this.velocityTarget = clamp(this.velocityTarget + e.deltaY * 0.00030, -0.22, 0.22);
    this.driftDir = Math.sign(e.deltaY) || this.driftDir;
  }

  onMove(e) {
    if (this.paused) return;
    this.pointer.x = (e.clientX / this.viewport.w) * 2 - 1;
    this.pointer.y = -(e.clientY / this.viewport.h) * 2 + 1;
  }

  onTouchStart(e) {
    if (this.paused) return;
    this.idle = 0;
    const t = e.touches[0];
    if (!t) return;
    this._drag = { x0: t.clientX, y0: t.clientY, lastX: t.clientX, vx: 0, moved: false };
  }

  onTouchMove(e) {
    if (this.paused || !this._drag) return;
    const t = e.touches[0];
    if (!t) return;
    const dx = t.clientX - this._drag.x0;
    if (!this._drag.moved && Math.abs(dx) > TAP_DRAG_PX) this._drag.moved = true;
    if (this._drag.moved) {
      e.preventDefault();
      const step = t.clientX - this._drag.lastX;
      this.velocityTarget = clamp(this.velocityTarget - step * 0.0016, -0.18, 0.18);
      this.driftDir = step < 0 ? 1 : -1;
      this._drag.vx = step;
    }
    this._drag.lastX = t.clientX;
  }

  onTouchEnd(e) {
    if (this.paused || !this._drag) return;
    if (this._drag.moved) {
      // momentum flick
      this.velocityTarget = clamp(this.velocityTarget - this._drag.vx * 0.0012, -0.2, 0.2);
    } else {
      const t = e.changedTouches[0];
      if (t) {
        this.pointer.x = (t.clientX / this.viewport.w) * 2 - 1;
        this.pointer.y = -(t.clientY / this.viewport.h) * 2 + 1;
        this.emit('tap', e);
      }
    }
    this._drag = null;
  }

  onKey(e) {
    if (this.paused) return;
    this.idle = 0;
    if (e.key === 'ArrowRight') { this.emit('step', 1); }
    else if (e.key === 'ArrowLeft') { this.emit('step', -1); }
  }

  /** Ease velocity, integrate offset, apply idle drift + friction. */
  update(dt) {
    if (this.paused) return;
    this.idle += dt;
    // at rest the spiral settles so the nearest project sits dead centre
    // (idle drift alone would leave the active hologram off-centre)
    if (this.idle > SETTLE_AFTER_S && !this._drag) {
      this.velocityTarget = 0;
      this.velocity *= Math.pow(0.05, dt);
      this.offset += (Math.round(this.offset) - this.offset) * (1 - Math.pow(0.04, dt));
      return;
    }
    const ease = 1 - Math.pow(0.002, dt); // frame-rate independent
    this.velocity += (this.velocityTarget - this.velocity) * ease;
    this.offset += this.velocity * dt * 60;

    // idle drift: the spiral always turns very slowly in the last direction
    const IDLE = 0.0011;
    if (Math.abs(this.velocityTarget) < IDLE) this.velocityTarget = this.driftDir * IDLE;
    // gentle friction: scroll bursts glide back down to the idle spin
    this.velocityTarget *= Math.pow(0.3, dt);
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; }

  /** Ease the offset toward a specific card index (used by list/menu focus). */
  scrollToIndex(i, count) {
    // choose nearest wrap
    const cur = ((this.offset % count) + count) % count;
    let d = i - cur;
    if (d > count / 2) d -= count;
    if (d < -count / 2) d += count;
    this.offset += d;
    this.velocityTarget = 0;
    this.velocity = 0;
  }
}

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
