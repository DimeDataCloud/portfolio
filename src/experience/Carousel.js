// The spiral of project holograms: duplicated ring for seamless wrap,
// raycast hover against each hologram's proxy volume, staggered show/hide,
// and focus-sync with the interface.

import * as THREE from 'three';
import { Holo, LABEL_W, LABEL_H } from './Holo.js';

export class Carousel {
  constructor({ stage, input, projects }) {
    this.stage = stage;
    this.input = input;
    this.projects = projects;

    const mobile = stage.viewport.w < 700;
    this.params = mobile
      ? { radius: 3.0, angleStep: 0.82, vStep: 0.3 }
      : { radius: 3.4, angleStep: 0.72, vStep: 0.32 };

    this.raycaster = new THREE.Raycaster();
    this.hovered = null;
    this.onFocusChange = null; // (projectIndex|null) => void
    this.onOpen = null;        // (projectIndex) => void

    this.holos = [];
    const ring = [...projects, ...projects];
    ring.forEach((project, i) => {
      const holo = new Holo({ project, index: i, total: ring.length });
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
   * Keep labels legible: a label fades out when its projected box would clip
   * the viewport edge or overlap a label already placed nearer the front.
   * Closer labels are placed first, so the focused card always keeps its label.
   */
  layoutLabels() {
    const cam = this.stage.camera;
    const v = this._labelV ??= new THREE.Vector3();
    const placed = [];
    const order = this.holos
      .filter((h) => h.visible)
      .sort((a, b) => Math.abs(a.relIndex) - Math.abs(b.relIndex));
    const hw = LABEL_W / 2;
    const hh = LABEL_H / 2;
    for (const holo of order) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const [dx, dy] of [[-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh]]) {
        v.set(dx, holo.labelY + dy, 0);
        holo.localToWorld(v).project(cam);
        x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x);
        y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
      }
      const onScreen = x0 > -0.96 && x1 < 0.96;
      const clear = onScreen && !placed.some((b) => x0 < b.x1 + 0.06 && x1 > b.x0 - 0.06 && y0 < b.y1 && y1 > b.y0);
      if (clear) placed.push({ x0, x1, y0, y1 });
      holo.setLabelClear(clear);
    }
  }

  dispose() {
    for (const holo of this.holos) {
      this.stage.scene.remove(holo);
      holo.dispose();
    }
  }
}
