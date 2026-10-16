// The spiral of project holograms: duplicated ring for seamless wrap,
// raycast hover against each hologram's proxy volume, staggered show/hide,
// and focus-sync with the interface.

import * as THREE from 'three';
import { Holo, LABEL_W, LABEL_H } from './Holo.js';

// label slots, as local-space y drops from the home position under the dais
const LABEL_DROPS = [0, -0.2, -0.4];
// local-space outline of a hologram's projector and beam, for label clearance
const HOLO_BODY = [[-0.46, 0], [0.46, 0], [-0.46, 1.33], [0.46, 1.33]];

export class Carousel {
  constructor({ stage, input, projects }) {
    this.stage = stage;
    this.input = input;
    this.projects = projects;

    // narrow screens: a tighter ring, neighbours peek in from the edges as a
    // drag cue, and each hologram is scaled up so it fills the viewport
    const mobile = stage.viewport.w < 700;
    this.params = mobile
      ? { radius: 2.6, angleStep: 0.8, vStep: 0.3 }
      : { radius: 3.4, angleStep: 0.72, vStep: 0.32 };

    this.raycaster = new THREE.Raycaster();
    this.hovered = null;
    this.onFocusChange = null; // (projectIndex|null) => void
    this.onOpen = null;        // (projectIndex) => void

    this.holos = [];
    const ring = [...projects, ...projects];
    ring.forEach((project, i) => {
      const holo = new Holo({ project, index: i, total: ring.length });
      holo.zoom = mobile ? 1.45 : 1;
      holo.narrow = mobile;
      this.holos.push(holo);
      stage.scene.add(holo);
    });
    this.proxies = this.holos.map((h) => h.hitProxy);

    input.addEventListener('press', () => this.tryOpen());
    input.addEventListener('tap', () => { this.setHovered(this.pick()); this.tryOpen(); });
    input.addEventListener('step', (e) => {
      this.input.offset = Math.round(this.input.offset + e.detail);
    });
  }

  show() {
    this.holos.forEach((h, i) => setTimeout(() => h.show(), (i % 5) * 55));
  }

  hide() {
    this.holos.forEach((h, i) => setTimeout(() => h.hide(), (i % 5) * 30));
  }

  /** Raycast the pointer against hologram proxy volumes, near-front only. */
  pick() {
    this.raycaster.setFromCamera(this.input.pointer, this.stage.camera);
    const hits = this.raycaster.intersectObjects(this.proxies, false);
    for (const hit of hits) {
      const holo = hit.object.userData.holo;
      if (Math.abs(holo.relIndex) > 2.2 || holo.reveal < 0.6) continue;
      return holo;
    }
    return null;
  }

  tryOpen() {
    if (this.hovered && this.onOpen) this.onOpen(this.hovered.dataIndex);
  }

  /** Ease the ring so the given project lands front-center. */
  focusProject(projectIndex) {
    this.input.scrollToIndex(projectIndex, this.holos.length);
  }

  setHovered(holo) {
    if (this.hovered === holo) return;
    this.hovered?.setHovered(false);
    this.hovered = holo;
    if (holo) holo.setHovered(true);
    document.body.style.cursor = holo ? 'pointer' : '';
    this.onFocusChange?.(holo ? holo.dataIndex : null);
  }

  update(dt, elapsed) {
    if (!this.input.isTouch) this.setHovered(this.pick());
    for (const holo of this.holos) {
      holo.layout(this.input.offset, this.params);
      holo.update(dt, elapsed, this.input.velocity);
    }
    this.layoutLabels();
  }

  /**
   * Keep labels legible and off their neighbours. Each label is tried at its
   * home slot, then dropped a step at a time. A slot is taken only if the label
   * stays on screen, clears every label already placed nearer the front, and
   * sits clear of every other visible hologram's projector body. A label with
   * no free slot fades out. Closer labels are placed first, so the focused
   * card always keeps its label.
   */
  layoutLabels() {
    const cam = this.stage.camera;
    const v = this._labelV ??= new THREE.Vector3();
    // screen-space box of a set of local-space points on one hologram
    const boxOf = (holo, pts) => {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const [x, y] of pts) {
        v.set(x, y, 0);
        holo.localToWorld(v).project(cam);
        x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x);
        y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
      }
      return { x0, x1, y0, y1 };
    };
    const overlaps = (a, b, gap) => a.x0 < b.x1 + gap && a.x1 > b.x0 - gap && a.y0 < b.y1 && a.y1 > b.y0;

    const visible = this.holos.filter((h) => h.visible);
    const bodies = new Map(visible.map((h) => [h, boxOf(h, HOLO_BODY)]));
    const placed = [];
    const order = [...visible].sort((a, b) => Math.abs(a.relIndex) - Math.abs(b.relIndex));
    for (const holo of order) {
      const hw = (LABEL_W * holo.labelGrow) / 2;
      const hh = (LABEL_H * holo.labelGrow) / 2;
      let slot = null;
      for (const drop of LABEL_DROPS) {
        const cy = holo.labelY + drop;
        const box = boxOf(holo, [[-hw, cy - hh], [hw, cy - hh], [-hw, cy + hh], [hw, cy + hh]]);
        const onScreen = box.x0 > -0.96 && box.x1 < 0.96;
        if (!onScreen) break; // dropping lower only moves a label toward the bottom edge, so stop trying
        const hitsLabel = placed.some((b) => overlaps(box, b, 0.06));
        let hitsBody = false;
        for (const [other, body] of bodies) {
          if (other !== holo && overlaps(box, body, 0.02)) { hitsBody = true; break; }
        }
        if (!hitsLabel && !hitsBody) { slot = { drop, box }; break; }
      }
      if (slot) placed.push(slot.box);
      holo.setLabelOffset(slot ? slot.drop : 0);
      holo.setLabelClear(!!slot);
    }
  }

  dispose() {
    for (const holo of this.holos) {
      this.stage.scene.remove(holo);
      holo.dispose();
    }
  }
}
