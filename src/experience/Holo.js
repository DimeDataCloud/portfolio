// One project hologram on the spiral: an "emitter dais" projector (lathe
// tri-layer base, shader-segmented status arc, counter-rotating halo rings,
// pulsing emitter lens, ground-glow disc), a double-shell fresnel beam with
// rising caustic rings and dust motes, the project's miniature animated
// scene floating inside the beam, and a billboard label with a draw-in
// accent underline.

import * as THREE from 'three';
import { holoMat } from './holoMaterial.js';
import { buildScene } from './scenes.js';

// Label canvas is 512 x 160 px and maps to a LABEL_W x LABEL_H world-unit sprite
// (same 3.2:1 aspect). Both lines shrink to fit, then truncate with an ellipsis,
// so nothing clips at the canvas edge or runs into the neighbouring label.
export const LABEL_W = 1.2;
export const LABEL_H = LABEL_W * 160 / 512;

// shrink a line to maxW (down to minPx), then cut it with an ellipsis if it
// still does not fit. Returns the text and the font size it settled on.
function fitLine(ctx, text, weight, family, startPx, minPx, maxW) {
  let px = startPx;
  const set = (p) => { ctx.font = `${weight} ${p}px ${family}`; };
  set(px);
  while (ctx.measureText(text).width > maxW && px > minPx) { px -= 2; set(px); }
  if (ctx.measureText(text).width <= maxW) return { text, px };
  let out = text;
  while (ctx.measureText(out + "…").width > maxW && out.length > 1) out = out.slice(0, -1);
  return { text: out === text ? text : out.trimEnd() + "…", px };
}

function makeLabelTexture(project, index) {
  const w = 512, h = 160;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  ctx.textAlign = "center";
  const maxW = w - 24;

  const titleFamily = '"Clash Display", "Segoe UI", sans-serif';
  const title = fitLine(ctx, project.title, 600, titleFamily, 56, 30, maxW);
  ctx.font = `600 ${title.px}px ${titleFamily}`;
  ctx.fillStyle = "rgba(250,250,250,0.98)";
  ctx.fillText(title.text, w / 2, 66);

  const metaFamily = "ui-monospace, Consolas, monospace";
  const meta = `P-${String(index + 1).padStart(2, "0")} · ${project.year} · ${project.statusText.toUpperCase()}`;
  const fitMeta = fitLine(ctx, meta, 500, metaFamily, 36, 24, maxW);
  ctx.font = `500 ${fitMeta.px}px ${metaFamily}`;
  ctx.fillStyle = "rgba(250,250,250,0.85)";
  ctx.fillText(fitMeta.text, w / 2, 130);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// shared geometry - 18 live instances reuse all of this
const dg = {
  dais: new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.001, 0),
      new THREE.Vector2(0.46, 0),
      new THREE.Vector2(0.46, 0.02),
      new THREE.Vector2(0.43, 0.038),
      new THREE.Vector2(0.36, 0.042),
      new THREE.Vector2(0.345, 0.05),
      new THREE.Vector2(0.345, 0.10),
      new THREE.Vector2(0.30, 0.105),
      new THREE.Vector2(0.235, 0.108),
      new THREE.Vector2(0.225, 0.148),
      new THREE.Vector2(0.001, 0.150),
    ],
    36
  ),
  arcBand: new THREE.CylinderGeometry(0.356, 0.356, 0.034, 48, 1, true),
  haloA: new THREE.TorusGeometry(0.26, 0.008, 4, 30),
  haloB: new THREE.TorusGeometry(0.31, 0.006, 4, 30),
  bead: new THREE.SphereGeometry(0.016, 8, 6),
  lens: new THREE.SphereGeometry(0.085, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2),
  glow: new THREE.CircleGeometry(0.62, 36),
  coneOuter: new THREE.CylinderGeometry(0.40, 0.09, 1.18, 30, 1, true),
  coneInner: new THREE.CylinderGeometry(0.26, 0.05, 1.14, 22, 1, true),
  caustic: new THREE.TorusGeometry(1, 0.022, 3, 26),
  proxy: new THREE.CylinderGeometry(0.55, 0.55, 1.7, 12),
};

// motes point cloud - positions live in the vertex shader, geometry only
// carries per-point seeds
const motesGeo = (() => {
  const n = 30;
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n * 3);
  const rnd = (x) => { const s = Math.sin(x * 127.1) * 43758.5453; return s - Math.floor(s); };
  for (let i = 0; i < n; i++) {
    seed[i * 3] = rnd(i + 1);
    seed[i * 3 + 1] = 0.35 + 0.65 * rnd(i + 51);
    seed[i * 3 + 2] = rnd(i + 101);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
  return g;
})();

export class Holo extends THREE.Group {
  constructor({ project, index, total }) {
    super();
    this.project = project;
    this.index = index;
    this.total = total;
    this.dataIndex = index % (total / 2);
    this.phase = (this.dataIndex * 7.31) % 5; // desync ring duplicates

    this.hover = 0;
    this.hoverTarget = 0;
    this.reveal = 0;
    this.revealTarget = 0;
    this.relIndex = 0;

    this.materials = [];
    const reg = (m) => { this.materials.push(m); return m; };
    const accent = new THREE.Color(project.accent);

    /* ---- emitter dais ---- */
    // dark tri-layer body - non-additive so glowing parts have contrast
    this.daisMat = new THREE.MeshBasicMaterial({ color: 0x14141a, transparent: true, opacity: 0 });
    const dais = new THREE.Mesh(dg.dais, this.daisMat);

    // segmented status arc around the mid housing (chase in the shader)
    const arc = new THREE.Mesh(dg.arcBand, reg(holoMat(accent, { alpha: 0.85, kind: 'arc' })));
    arc.position.y = 0.075;

    // counter-rotating halo rings with a marker bead each - gyroscope feel
    this.spinA = new THREE.Group();
    this.spinB = new THREE.Group();
    const ringA = new THREE.Mesh(dg.haloA, reg(holoMat(accent, { alpha: 0.5 })));
    const ringB = new THREE.Mesh(dg.haloB, reg(holoMat(accent, { alpha: 0.35 })));
    ringA.rotation.x = Math.PI / 2;
    ringB.rotation.x = Math.PI / 2;
    const beadA = new THREE.Mesh(dg.bead, reg(holoMat(accent, { alpha: 0.9 })));
    const beadB = new THREE.Mesh(dg.bead, reg(holoMat(accent, { alpha: 0.7 })));
    beadA.position.x = 0.26;
    beadB.position.x = -0.31;
    this.spinA.add(ringA, beadA);
    this.spinB.add(ringB, beadB);
    this.spinA.position.y = 0.205;
    this.spinB.position.y = 0.265;

    // emitter lens - pulses softly, flares on the scene's key beat
    this.lensMat = reg(holoMat(accent, { alpha: 0.6 }));
    this.lens = new THREE.Mesh(dg.lens, this.lensMat);
    this.lens.position.y = 0.148;

    // ground glow - the light spill that sells the projector
    const glow = new THREE.Mesh(dg.glow, reg(holoMat(accent, { alpha: 0.16, kind: 'glow' })));
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.004;

    /* ---- beam: double shell + caustics + motes ---- */
    const coneOuter = new THREE.Mesh(dg.coneOuter, reg(holoMat(accent, { alpha: 0.10, kind: 'cone', height: 1.18 })));
    coneOuter.position.y = 0.145 + 0.59;
    const coneInner = new THREE.Mesh(dg.coneInner, reg(holoMat(accent, { alpha: 0.14, kind: 'cone', height: 1.14 })));
    coneInner.position.y = 0.15 + 0.57;

    this.caustics = [0, 1, 2].map(() => {
      const r = new THREE.Mesh(dg.caustic, reg(holoMat(accent, { alpha: 0 })));
      r.rotation.x = Math.PI / 2;
      return r;
    });

    const motes = new THREE.Points(motesGeo, reg(holoMat(accent, { alpha: 0.5, kind: 'motes', height: 1.1 })));
    motes.position.y = 0.10;
    motes.frustumCulled = false;

    /* ---- the project's miniature animation ---- */
    this.scene = buildScene(project, reg);
    this.scene.group.position.y = 0.32;
    this.scene.group.scale.setScalar(1.15);

    /* ---- label + accent underline ---- */
    this.labelMat = new THREE.SpriteMaterial({
      map: makeLabelTexture(project, this.dataIndex),
      transparent: true,
      depthWrite: false,
    });
    const label = new THREE.Sprite(this.labelMat);
    label.scale.set(LABEL_W, LABEL_H, 1);
    this.labelY = -0.32;
    label.position.y = this.labelY;
    // screen-space clearance, set each frame by Carousel: 1 when the label is
    // on screen and clear of closer labels, eased toward 0 otherwise
    this.labelClip = 1;
    this.labelTarget = 1;

    this.underlineMat = new THREE.SpriteMaterial({
      color: accent,
      transparent: true,
      depthWrite: false,
      opacity: 0,
    });
    this.underline = new THREE.Sprite(this.underlineMat);
    this.underline.center.set(0, 0.5); // anchor left so it draws in left-to-right
    this.underline.position.set(-0.26, -0.5, 0);
    this.underline.scale.set(0.001, 0.012, 1);

    /* ---- invisible raycast proxy covering the whole hologram ---- */
    this.hitProxy = new THREE.Mesh(
      dg.proxy,
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
    );
    this.hitProxy.position.y = 0.6;
    this.hitProxy.userData.holo = this;

    this.add(
      dais, arc, this.spinA, this.spinB, this.lens, glow,
      coneOuter, coneInner, ...this.caustics, motes,
      this.scene.group, label, this.underline, this.hitProxy
    );
  }

  setHovered(on) { this.hoverTarget = on ? 1 : 0; }
  setLabelClear(on) { this.labelTarget = on ? 1 : 0; }
  show() { this.revealTarget = 1; }
  hide() { this.revealTarget = 0; }

  layout(offset, params) {
    const { radius, angleStep, vStep } = params;
    const n = this.total;
    let rel = ((this.index - offset) % n + n) % n;
    if (rel > n / 2) rel -= n;
    this.relIndex = rel;

    const angle = rel * angleStep;
    const r = radius * (1 - (1 - this.reveal) * 0.4);
    const y = rel * -vStep - 0.85 + (1 - this.reveal) * -1.3;
    this.position.set(Math.sin(angle) * r, y, Math.cos(angle) * r);
    this.rotation.y = angle;
  }

  update(dt, elapsed, scrollVelocity) {
    const hoverEase = 1 - Math.pow(this.hoverTarget > this.hover ? 0.0004 : 0.002, dt);
    this.hover += (this.hoverTarget - this.hover) * hoverEase;
    const revealEase = 1 - Math.pow(0.008, dt);
    this.reveal += (this.revealTarget - this.reveal) * revealEase;

    // hologram brightness: front bright, ring recedes, hover lifts to full;
    // far-side duplicates fade out completely so the back half never clutters
    const dist = Math.abs(this.relIndex);
    const farFade = 1 - Math.min(1, Math.max(0, (dist - 2.4) / 1.1));
    const dim = (Math.max(0.18, 0.8 - dist * 0.22) + this.hover * 0.2) * farFade;
    const global = this.reveal * dim;

    // fully faded holograms skip rendering AND animation work - roughly
    // half the ring at any moment
    this.visible = global > 0.004;

    // pop + slight tilt with scroll motion (kept live even while hidden so
    // re-entry doesn't snap)
    const s = (0.85 + this.hover * 0.12) * (0.25 + this.reveal * 0.75);
    this.scale.setScalar(s);
    this.rotation.z = -scrollVelocity * 1.6;

    if (!this.visible) return;

    const t = elapsed + this.phase;
    for (const m of this.materials) {
      m.uniforms.uTime.value = t;
      m.uniforms.uGlobal.value = global;
      m.uniforms.uHover.value = this.hover;
    }
    this.daisMat.opacity = Math.min(1, global * 1.5);
    // labels: front and side cards stay legible (floor 0.55), hover lifts to
    // full, back cards fade out with farFade
    const labelBase = 0.55 + 0.45 * Math.max(0, 1 - dist / 2);
    this.labelClip += (this.labelTarget - this.labelClip) * (1 - Math.pow(0.02, dt));
    this.labelMat.opacity = this.reveal * farFade * this.labelClip * Math.min(1, labelBase + this.hover * 0.45);
    this.underlineMat.opacity = global * 0.9;
    const drawIn = 1 - Math.pow(1 - Math.min(1, Math.max(0, (this.reveal - 0.25) / 0.75)), 3);
    this.underline.scale.set(Math.max(0.001, 0.52 * drawIn), 0.012, 1);

    // gyroscope halo rings - opposite spins, gentle wobble, all pure in t
    this.spinA.rotation.set(Math.sin(t * 0.9) * 0.14, t * 1.1, Math.cos(t * 0.7) * 0.10);
    this.spinB.rotation.set(-Math.sin(t * 0.6 + 1.7) * 0.11, -t * 0.7, -Math.cos(t * 0.5 + 0.6) * 0.13);

    // rising caustic rings - scale from the beam base to its mouth, fading
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.14 + i / 3) % 1;
      const ring = this.caustics[i];
      ring.scale.setScalar(0.09 + p * 0.30);
      ring.position.y = 0.16 + p * 1.0;
      ring.material.uniforms.uAlpha.value = 0.5 * Math.sin(Math.PI * p) * (1 - p * 0.35);
    }

    // scene time (hover speeds it up) + key-beat flare on the emitter lens
    const tScene = t * (1 + this.hover * 0.6);
    const beat = this.scene.beat ? this.scene.beat(tScene) : 0.15 + 0.15 * Math.sin(t * 2.2);
    this.lensMat.uniforms.uAlpha.value = 0.45 + 0.25 * Math.sin(t * 2.6) + beat * 0.8;
    this.lens.scale.setScalar(1 + beat * 0.22);

    this.scene.update(tScene);
  }

  dispose() {
    this.traverse((o) => {
      o.geometry?.dispose?.();
    });
    this.materials.forEach((m) => m.dispose());
    this.labelMat.map?.dispose();
    this.labelMat.dispose();
    this.underlineMat.dispose();
    this.daisMat.dispose();
  }
}
