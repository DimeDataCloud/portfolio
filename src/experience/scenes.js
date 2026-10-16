// Miniature hologram scenes - one per project, fully 3D, built entirely
// from Three.js primitives with the shared hologram material. Each builder
// returns { group, update(t), beat?(t) } where t is elapsed seconds (with a
// per-hologram phase offset so ring duplicates don't animate in lockstep).
//
// Every update(t) is a pure function of t - no accumulated state - so
// tab-hide rAF pauses and phase desync cost nothing, and every loop is
// phase-continuous (cycle end state === cycle start state).
// Content budget: XZ radius ≈ 0.42, local y ∈ [0.05, 0.80].

import * as THREE from 'three';
import { holoMat } from './holoMaterial.js';

/* ---------- easing kit ---------- */
const TAU = Math.PI * 2;
const c01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const outCubic = (p) => 1 - Math.pow(1 - c01(p), 3);
const inCubic = (p) => { p = c01(p); return p * p * p; };
const inOut = (p) => { p = c01(p); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
const backOut = (p) => { p = c01(p); const c = 2.2; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const bump = (p) => Math.sin(Math.PI * c01(p));                    // 0 → 1 → 0
const spike = (p, k = 3) => Math.pow(bump(p), k);                  // sharp bump
const seg = (t, a, b) => c01((t - a) / (b - a));                   // storyboard window
// damped landing spring: 1 at rest, squashes by `amt` on touch, rings out
const impact = (q, amt = 0.35) => { q = c01(q); return 1 - amt * Math.exp(-5 * q) * Math.cos(11 * q) * (1 - q); };
const lerp = (a, b, p) => a + (b - a) * p;

// scratch vectors - zero allocations inside update()
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

// deterministic pseudo-random
const rnd = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

/* ---------- geometry cache (duplicated ring builds every scene twice) ---------- */
const geo = {
  // generic
  oct: new THREE.OctahedronGeometry(0.02),
  sphXS: new THREE.SphereGeometry(0.018, 8, 6),
  sphS: new THREE.SphereGeometry(0.032, 10, 8),
  sphM: new THREE.SphereGeometry(0.06, 14, 10),
  ringThin: new THREE.TorusGeometry(0.16, 0.005, 4, 36),
  // receptionist
  head: new THREE.SphereGeometry(0.125, 16, 12),
  visor: new THREE.TorusGeometry(0.128, 0.018, 6, 28),
  neck: new THREE.TorusGeometry(0.06, 0.01, 4, 20),
  stem: new THREE.CylinderGeometry(0.004, 0.004, 0.09, 5),
  handsetBar: new THREE.CapsuleGeometry(0.014, 0.09, 3, 8),
  ear: new THREE.SphereGeometry(0.024, 8, 6),
  ico: new THREE.IcosahedronGeometry(0.032, 0),
  wavebar: new THREE.BoxGeometry(0.012, 0.05, 0.012),
  // crm
  trayBase: new THREE.BoxGeometry(0.16, 0.01, 0.11),
  trayWallX: new THREE.BoxGeometry(0.008, 0.03, 0.11),
  trayWallZ: new THREE.BoxGeometry(0.16, 0.03, 0.008),
  tile: new THREE.BoxGeometry(0.10, 0.016, 0.07),
  // leadgen
  dish: new THREE.LatheGeometry(
    [new THREE.Vector2(0.01, 0), new THREE.Vector2(0.14, 0.014), new THREE.Vector2(0.26, 0.04), new THREE.Vector2(0.34, 0.075)],
    30
  ),
  rangeA: new THREE.TorusGeometry(0.16, 0.0045, 3, 40),
  rangeB: new THREE.TorusGeometry(0.27, 0.0045, 3, 48),
  pinNeedle: new THREE.CylinderGeometry(0.0035, 0.0035, 0.05, 5),
  envBody: new THREE.BoxGeometry(0.046, 0.008, 0.032),
  envFlap: new THREE.ConeGeometry(0.02, 0.016, 4),
  // brainai
  wire: new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.125, 0)),
  // app builder
  pillar: new THREE.BoxGeometry(0.014, 0.34, 0.014),
  rail: new THREE.BoxGeometry(0.32, 0.012, 0.012),
  carriage: new THREE.BoxGeometry(0.05, 0.03, 0.05),
  nozzle: new THREE.ConeGeometry(0.012, 0.03, 6),
  block: new THREE.BoxGeometry(0.15, 0.068, 0.15),
  screenBlock: new THREE.BoxGeometry(0.13, 0.075, 0.028),
  // portfolio micro-carousel
  microDais: new THREE.CylinderGeometry(0.032, 0.042, 0.012, 10),
  microBeam: new THREE.CylinderGeometry(0.024, 0.008, 0.08, 8, 1, true),
  axis: new THREE.CylinderGeometry(0.0025, 0.0025, 0.62, 5),
  riseRing: new THREE.TorusGeometry(0.05, 0.003, 3, 20),
  // agent eval - bars rise from base y (unit height, scaled to value)
  evalFloor: new THREE.BoxGeometry(0.36, 0.006, 0.02),
  evalBar: new THREE.BoxGeometry(0.07, 1, 0.07).translate(0, 0.5, 0),
  evalGlow: new THREE.BoxGeometry(0.086, 1, 0.086).translate(0, 0.5, 0),
  // confidence whisker: unit-span stem with two end caps, scaled on y
  evalWhisk: new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(0, 0.5, 0),
    new THREE.Vector3(-0.014, -0.5, 0), new THREE.Vector3(0.014, -0.5, 0),
    new THREE.Vector3(-0.014, 0.5, 0), new THREE.Vector3(0.014, 0.5, 0),
  ]),
  // omni sdr
  lane: new THREE.BoxGeometry(0.80, 0.006, 0.02),
  msgTile: new THREE.BoxGeometry(0.07, 0.05, 0.008),
  gatePost: new THREE.BoxGeometry(0.012, 0.22, 0.012),
  gateBeam: new THREE.BoxGeometry(0.012, 0.012, 0.18),
};

// radar sweep wedge - fan of triangles, per-vertex trail fade
const wedgeGeo = (() => {
  const slices = 10, r = 0.32, arc = 0.95;
  const pos = [], fade = [];
  for (let i = 0; i < slices; i++) {
    const a0 = -(i / slices) * arc, a1 = -((i + 1) / slices) * arc;
    const f0 = 1 - i / slices, f1 = 1 - (i + 1) / slices;
    pos.push(0, 0, 0, Math.cos(a0) * r, 0, Math.sin(a0) * r, Math.cos(a1) * r, 0, Math.sin(a1) * r);
    fade.push(f0 * 0.5, f0, f1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aFade', new THREE.Float32BufferAttribute(fade, 1));
  return g;
})();

function mesh(g, mat) { return new THREE.Mesh(g, mat); }

/** Sample a quadratic bezier into a Line geometry (n points). */
function curveLine(curve, n, mat) {
  const pts = [];
  for (let i = 0; i < n; i++) pts.push(curve.getPoint(i / (n - 1)));
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
}

/** Quadratic bezier between two points, midpoint pushed outward + up. */
function arcCurve(a, b, out = 1.3, upBias = 0.02) {
  const mid = a.clone().add(b).multiplyScalar(0.5 * out);
  mid.y += upBias;
  return new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
}

/* =====================================================================
 * 2. H.A.L.O Agent OS - a living hierarchy in 3D.
 * Exec orb → 3 C-suite on an arc → 6 workers on a wider arc. Pulses run
 * down curved links, splitting per layer; acks run back up. One branch
 * stays highlighted per cycle. The whole tree precesses; every orb bobs.
 * ===================================================================== */
function haloAgentOs(mats) {
  const g = new THREE.Group();
  const T = 4.4;

  const exec = mesh(geo.sphM, mats.bright());
  exec.position.set(0, 0.70, 0);
  const cs = [];
  for (let i = 0; i < 3; i++) {
    const o = mesh(geo.sphS, mats.soft());
    const a = (i / 3) * TAU + 0.5;
    o.position.set(Math.cos(a) * 0.19, 0.44, Math.sin(a) * 0.19);
    cs.push(o);
  }
  const workers = [];
  for (let i = 0; i < 6; i++) {
    const o = mesh(geo.sphXS, mats.soft());
    const a = (i / 6) * TAU + 0.2;
    o.position.set(Math.cos(a) * 0.34, 0.16, Math.sin(a) * 0.34);
    workers.push(o);
  }
  g.add(exec, ...cs, ...workers);

  // curved links; each branch (1 exec-link + 2 worker-links) shares a
  // material so the "active task" branch can glow
  const branchMats = [0, 1, 2].map(() => mats.line());
  const curvesA = cs.map((o, i) => arcCurve(exec.position, o.position, 1.15, 0.03));
  const curvesB = workers.map((o, i) => arcCurve(cs[i >> 1].position, o.position, 1.15, 0.02));
  curvesA.forEach((c, i) => g.add(curveLine(c, 9, branchMats[i])));
  curvesB.forEach((c, i) => g.add(curveLine(c, 9, branchMats[i >> 1])));

  // pulse spheres: 3 for the exec layer, 6 for the worker layer (reused
  // as acks on the way back up)
  const pAMat = mats.bright();
  const pBMat = mats.bright();
  const pulsesA = [0, 1, 2].map(() => { const p = mesh(geo.sphXS, pAMat); p.scale.setScalar(0.7); g.add(p); return p; });
  const pulsesB = [0, 1, 2, 3, 4, 5].map(() => { const p = mesh(geo.sphXS, pBMat); p.scale.setScalar(0.55); g.add(p); return p; });

  const bobs = { exec: 0.7, cs: [0.44, 0.44, 0.44], w: [0.16, 0.16, 0.16, 0.16, 0.16, 0.16] };

  return {
    group: g,
    update(t) {
      const u = (t / T) % 1;
      const k = Math.floor(t / T) % 3; // highlighted branch

      // pulses down: exec → cs, then split cs → workers
      const dA = inOut(seg(u, 0.02, 0.30));
      pulsesA.forEach((p, i) => {
        curvesA[i].getPoint(dA, p.position);
        p.visible = u > 0.01 && u < 0.32;
      });
      pAMat.uniforms.uAlpha.value = 0.95 * bump(seg(u, 0.0, 0.34));
      const dB = inOut(seg(u, 0.30, 0.60));
      // acks run back up, smaller and faster
      const dAck = inOut(seg(u, 0.66, 0.80));
      pulsesB.forEach((p, i) => {
        if (u < 0.64) {
          curvesB[i].getPoint(dB, p.position);
          p.scale.setScalar(0.55);
          p.visible = u > 0.29 && u < 0.62;
        } else {
          curvesB[i].getPoint(1 - dAck, p.position);
          p.scale.setScalar(0.35);
          p.visible = u > 0.65 && u < 0.82;
        }
      });
      pBMat.uniforms.uAlpha.value = u < 0.64
        ? 0.9 * bump(seg(u, 0.28, 0.63))
        : 0.8 * bump(seg(u, 0.65, 0.83));

      // arrival flares + idle bobbing (independent slower rhythm)
      const csFlare = spike(seg(u, 0.27, 0.42));
      cs.forEach((o, i) => {
        o.position.y = bobs.cs[i] + Math.sin(t * 1.2 + i * 2.0) * 0.012;
        o.scale.setScalar(1 + csFlare * 0.35);
        o.material.uniforms.uAlpha.value = 0.55 + (i === k ? 0.3 : 0) + csFlare * 0.3;
      });
      const wFlare = spike(seg(u, 0.58, 0.72));
      workers.forEach((o, i) => {
        o.position.y = bobs.w[i] + Math.sin(t * 1.5 + i * 1.3) * 0.010;
        o.scale.setScalar(1 + wFlare * 0.4);
        o.material.uniforms.uAlpha.value = 0.5 + ((i >> 1) === k ? 0.25 : 0) + wFlare * 0.35;
      });
      exec.position.y = bobs.exec + Math.sin(t * 1.0) * 0.014;
      exec.scale.setScalar(1 + 0.08 * Math.sin(t * 2.1) + spike(seg(u, 0.78, 0.9)) * 0.2);

      // the active branch stays lit a beat longer
      branchMats.forEach((m, i) => {
        m.uniforms.uAlpha.value = i === k ? 0.8 : 0.32;
      });

      // slow precession
      g.rotation.y = t * 0.22;
    },
    beat(t) {
      return spike(seg((t / T) % 1, 0.58, 0.72));
    },
  };
}

/* =====================================================================
 * 3. ReceptionistLIVE - the bot answers.
 * Incoming call shivers → handset arcs up along a bezier with overshoot →
 * talking: ripple tori + 5-bar waveform → handset returns, nod, blink.
 * ===================================================================== */
function receptionist(mats) {
  const g = new THREE.Group();
  const T = 6;

  // robot head group (nods as one)
  const headG = new THREE.Group();
  headG.position.set(0, 0.47, 0);
  headG.add(mesh(geo.head, mats.soft()));
  const visor = mesh(geo.visor, mats.line());
  visor.rotation.x = Math.PI / 2;
  visor.position.y = 0.02;
  headG.add(visor);
  const eyeL = mesh(geo.sphXS, mats.bright());
  const eyeR = mesh(geo.sphXS, mats.bright());
  eyeL.position.set(-0.05, 0.022, 0.112);
  eyeR.position.set(0.05, 0.022, 0.112);
  headG.add(eyeL, eyeR);
  const stem = mesh(geo.stem, mats.line());
  stem.position.y = 0.16;
  const tipMat = mats.bright();
  const tip = mesh(geo.sphXS, tipMat);
  tip.scale.setScalar(0.7);
  tip.position.y = 0.21;
  headG.add(stem, tip);
  g.add(headG);

  const neck = mesh(geo.neck, mats.line());
  neck.rotation.x = Math.PI / 2;
  neck.position.y = 0.31;
  g.add(neck);

  // handset: capsule bar + ear spheres
  const handMat = mats.bright();
  const handset = new THREE.Group();
  const bar = mesh(geo.handsetBar, handMat);
  bar.rotation.z = Math.PI / 2;
  handset.add(bar);
  const earA = mesh(geo.ear, handMat);
  const earB = mesh(geo.ear, handMat);
  earA.position.x = -0.062;
  earB.position.x = 0.062;
  handset.add(earA, earB);
  g.add(handset);
  const handCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0.27, 0.13, 0.04),
    new THREE.Vector3(0.35, 0.36, 0.10),
    new THREE.Vector3(0.16, 0.50, 0.09)
  );

  // incoming-call marker: icosahedron + expanding ring
  const icoMat = mats.bright();
  const ico = mesh(geo.ico, icoMat);
  ico.position.set(0.29, 0.25, 0.04);
  const callRingMat = mats.soft();
  const callRing = mesh(geo.ringThin, callRingMat);
  callRing.position.copy(ico.position);
  g.add(ico, callRing);

  // talk ripples at varied 3D orientations + waveform bars
  const ripples = [
    [Math.PI / 2, 0, 0],
    [Math.PI / 3, 0.5, 0],
    [0.3, 0, 0.9],
  ].map((rot) => {
    const m = mats.soft();
    const r = mesh(geo.ringThin, m);
    r.rotation.set(...rot);
    r.position.y = 0.47;
    g.add(r);
    return { r, m };
  });
  const waveMat = mats.bright();
  const waves = [0, 1, 2, 3, 4].map((i) => {
    const w = mesh(geo.wavebar, waveMat);
    w.position.set(-0.036 + i * 0.018, 0.415, 0.155);
    g.add(w);
    return w;
  });

  return {
    group: g,
    update(t) {
      const u = (t / T) % 1;

      // incoming: shiver + ring pulse
      const incoming = 1 - seg(u, 0.12, 0.17);
      ico.position.x = 0.29 + Math.sin(t * 43) * 0.007 * incoming;
      ico.rotation.y = t * 0.8;
      icoMat.uniforms.uAlpha.value = 0.25 + 0.65 * incoming * (0.6 + 0.4 * Math.sin(t * 12));
      const rp = (t * 1.7) % 1;
      callRing.scale.setScalar(0.25 + rp * 0.9);
      callRingMat.uniforms.uAlpha.value = 0.5 * (1 - rp) * incoming;

      // handset: pick up with overshoot, hold while talking, return
      const up = backOut(seg(u, 0.14, 0.28));
      const down = inOut(seg(u, 0.78, 0.90));
      // up rises 0→1 with overshoot; down retraces 1→0
      const pos = c01(up) * (1 - down) + Math.max(0, up - 1) * 0.5;
      handCurve.getPoint(c01(pos), handset.position);
      handset.rotation.z = lerp(-0.45, 0.35, c01(pos)) + (up > 1 ? (up - 1) * 1.5 : 0);
      handset.position.y += Math.sin(t * 2.2) * 0.005; // held-hand micro-bob

      // talking window
      const talk = Math.min(seg(u, 0.30, 0.37), 1 - seg(u, 0.72, 0.79));
      ripples.forEach(({ r, m }, i) => {
        const p = (t * 0.55 + i / 3) % 1;
        r.scale.setScalar(0.4 + p * 1.7);
        m.uniforms.uAlpha.value = 0.5 * (1 - p) * talk;
      });
      waves.forEach((w, i) => {
        w.scale.y = 0.15 + talk * Math.abs(Math.sin(t * 8.5 + i * 1.9)) * 1.0;
      });
      waveMat.uniforms.uAlpha.value = 0.9 * talk;

      // satisfied nod + blink at the end; independent periodic blink too
      headG.rotation.x = 0.16 * spike(seg(u, 0.90, 0.985));
      headG.rotation.y = Math.sin(t * 0.7) * 0.06; // secondary idle sway
      const blink = 1 - 0.85 * Math.pow(bump((t / 3.3) % 1), 24) - 0.85 * spike(seg(u, 0.93, 0.99));
      eyeL.scale.y = Math.max(0.12, blink);
      eyeR.scale.y = Math.max(0.12, blink);

      // antenna tip blinks
      tipMat.uniforms.uAlpha.value = 0.35 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2.3)) ** 4;
    },
    beat(t) {
      return spike(seg((t / T) % 1, 0.14, 0.30));
    },
  };
}

/* =====================================================================
 * 4. CRMLIVE - pipeline with physics feel.
 * A hot lead tile leaps tray to tray: anticipation dip, stretch at apex,
 * squash on landing; the receiving tray flashes and residents nudge.
 * Final tray: flip, glow, star spark. Then a fresh tile slides in.
 * ===================================================================== */
function crm(mats) {
  const g = new THREE.Group();
  const T = 6.4;
  const xs = [-0.26, 0, 0.26];
  const zs = [0.02, -0.02, 0.02];
  const restY = 0.155;

  const rimMats = [];
  xs.forEach((x, i) => {
    const rim = mats.soft();
    rimMats.push(rim);
    const base = mesh(geo.trayBase, mats.faint());
    base.position.set(x, 0.10, zs[i]);
    g.add(base);
    const wL = mesh(geo.trayWallX, rim); wL.position.set(x - 0.076, 0.115, zs[i]);
    const wR = mesh(geo.trayWallX, rim); wR.position.set(x + 0.076, 0.115, zs[i]);
    const wF = mesh(geo.trayWallZ, rim); wF.position.set(x, 0.115, zs[i] + 0.051);
    const wB = mesh(geo.trayWallZ, rim); wB.position.set(x, 0.115, zs[i] - 0.051);
    g.add(wL, wR, wF, wB);
  });

  // resident tiles: two per tray, slight z offsets
  const residents = [];
  xs.forEach((x, i) => {
    for (let r = 0; r < 2; r++) {
      const tl = mesh(geo.tile, mats.soft());
      tl.position.set(x + (r ? 0.008 : -0.006), 0.118 + r * 0.018, zs[i] + (r ? -0.012 : 0.01));
      tl.userData.tray = i;
      tl.userData.restY = tl.position.y;
      g.add(tl);
      residents.push(tl);
    }
  });

  const hotMat = mats.bright();
  const hot = mesh(geo.tile, hotMat);
  g.add(hot);

  // 4-point star spark for the "won" moment
  const sparkMat = mats.bright();
  const sparks = [0, 1, 2, 3].map((i) => {
    const s = mesh(geo.oct, sparkMat);
    s.scale.setScalar(0.6);
    g.add(s);
    return s;
  });

  return {
    group: g,
    update(t) {
      const u = (t / T) % 1;
      const ph = Math.floor(u * 4);
      const q = (u * 4) % 1;

      g.rotation.y = 0.06 * Math.sin(t * 0.5); // secondary sway

      let hotX = xs[0], hotY = restY, hotZ = zs[0] + 0.01;
      let sy = 1, rotX = 0, rotZ = 0, alpha = 0.95;
      let landGlow = -1, landAmt = 0;
      let sparkP = 0;

      if (ph <= 1) {
        const aw = seg(q, 0, 0.18);
        const fw = seg(q, 0.18, 0.68);
        const lw = seg(q, 0.68, 1);
        hotX = xs[ph] + (xs[ph + 1] - xs[ph]) * inOut(fw);
        hotZ = lerp(zs[ph], zs[ph + 1], fw) + 0.01;
        hotY = restY - 0.014 * bump(aw) + bump(fw) * 0.17;
        sy = 1 - 0.28 * bump(aw) + 0.30 * bump(fw);
        if (q >= 0.68) sy = impact(lw, 0.38);
        rotZ = -0.25 * bump(fw);
        landGlow = ph + 1;
        landAmt = spike(seg(q, 0.68, 0.88));
      } else if (ph === 2) {
        hotX = xs[2]; hotZ = zs[2] + 0.01;
        const fl = inOut(seg(q, 0.08, 0.5));
        rotX = Math.PI * fl;
        hotY = restY + 0.03 * bump(seg(q, 0.08, 0.5));
        alpha = 0.95 + 0.05 * spike(seg(q, 0.4, 0.9));
        sy = 1 + 0.15 * spike(seg(q, 0.45, 0.75));
        sparkP = seg(q, 0.5, 0.95);
      } else {
        // fade the won tile, slide a fresh one into stage one
        const fadeOut = seg(q, 0, 0.25);
        const sl = seg(q, 0.3, 0.75);
        alpha = q < 0.3 ? 0.95 * (1 - fadeOut) : 0.95 * seg(q, 0.3, 0.45);
        rotX = q < 0.3 ? Math.PI : 0;
        hotX = q < 0.3 ? xs[2] : lerp(-0.48, xs[0], outCubic(sl));
        hotZ = q < 0.3 ? zs[2] + 0.01 : zs[0] + 0.01;
        sy = impact(seg(q, 0.72, 1), 0.2);
      }

      hot.position.set(hotX, hotY, hotZ);
      hot.rotation.set(rotX, 0, rotZ);
      hot.scale.set(1 + (1 - sy) * 0.6, sy, 1 + (1 - sy) * 0.6);
      hotMat.uniforms.uAlpha.value = alpha;

      // receiving tray flash + resident nudge
      rimMats.forEach((m, i) => {
        m.uniforms.uAlpha.value = 0.3 + (i === landGlow ? landAmt * 0.65 : 0);
      });
      residents.forEach((tl) => {
        const dip = tl.userData.tray === landGlow ? landAmt * 0.012 : 0;
        tl.position.y = tl.userData.restY - dip;
      });

      // star spark on "won"
      sparks.forEach((s, i) => {
        const a = i * (TAU / 4) + 0.6;
        const rr = 0.03 + outCubic(sparkP) * 0.10;
        s.position.set(xs[2] + Math.cos(a) * rr, restY + 0.04 + outCubic(sparkP) * 0.08, zs[2] + Math.sin(a) * rr * 0.5);
        s.scale.setScalar(Math.max(0.001, (1 - sparkP) * 0.6));
      });
      sparkMat.uniforms.uAlpha.value = bump(sparkP) * 0.9;
    },
    beat(t) {
      const u = (t / T) % 1;
      const ph = Math.floor(u * 4);
      const q = (u * 4) % 1;
      if (ph <= 1) return spike(seg(q, 0.68, 0.88));
      if (ph === 2) return spike(seg(q, 0.4, 0.7));
      return 0;
    },
  };
}

/* =====================================================================
 * 5. LeadGenLIVE - radar that produces outreach.
 * Lathe dish + range rings; a translucent sweep wedge with a baked trail;
 * pin blips pop up out of the dish as it passes; once per revolution one
 * qualifies and launches a tiny envelope up out of the beam.
 * ===================================================================== */
function leadgen(mats) {
  const g = new THREE.Group();
  const W = 0.9; // sweep angular speed (rad/s)

  const dish = mesh(geo.dish, mats.faint());
  dish.position.y = 0.08;
  const ringA = mesh(geo.rangeA, mats.line());
  ringA.rotation.x = Math.PI / 2;
  ringA.position.y = 0.105;
  const ringB = mesh(geo.rangeB, mats.line());
  ringB.rotation.x = Math.PI / 2;
  ringB.position.y = 0.125;
  g.add(dish, ringA, ringB);

  const sweep = mesh(wedgeGeo, mats.custom({ alpha: 0.55, kind: 'wedge' }));
  sweep.position.y = 0.115;
  g.add(sweep);

  // pin blips: needle + glowing tip
  const angs = [0.6, 2.1, 3.5, 5.0];
  const rads = [0.24, 0.15, 0.28, 0.20];
  const blips = angs.map((a, i) => {
    const pin = new THREE.Group();
    const nm = mats.line();
    pin.add(mesh(geo.pinNeedle, nm));
    const tm = mats.bright();
    const tipM = mesh(geo.sphXS, tm);
    tipM.position.y = 0.028;
    pin.add(tipM);
    pin.position.set(Math.cos(a) * rads[i], 0.02, Math.sin(a) * rads[i]);
    g.add(pin);
    return { pin, tip: tipM, tm, nm, a };
  });

  // the outreach envelope: folded prism (body + flap)
  const envMat = mats.bright();
  const env = new THREE.Group();
  env.add(mesh(geo.envBody, envMat));
  const flap = mesh(geo.envFlap, envMat);
  flap.position.y = 0.008;
  flap.scale.set(1.15, 0.6, 0.8);
  env.add(flap);
  g.add(env);
  const QUAL = 1; // blip index that qualifies

  return {
    group: g,
    update(t) {
      const A = W * t;
      sweep.rotation.y = A;

      blips.forEach(({ pin, tip, tm, nm, a }, i) => {
        const d = ((A - a) % TAU + TAU) % TAU;
        const up = backOut(c01(d / 0.45));
        const down = 1 - inOut(seg(d, 2.6, 3.6));
        const h = up * down;
        pin.position.y = 0.02 + h * 0.09;
        const flare = i === QUAL ? spike(seg(d, 0.6, 1.1)) : 0;
        tip.scale.setScalar(0.8 + h * 0.5 + flare * 0.9);
        tm.uniforms.uAlpha.value = 0.12 + h * 0.75 + flare * 0.5;
        nm.uniforms.uAlpha.value = 0.1 + h * 0.4;
      });

      // qualified blip launches the envelope
      const dq = ((A - angs[QUAL]) % TAU + TAU) % TAU;
      const e = seg(dq, 0.9, 3.4);
      const bx = Math.cos(angs[QUAL]) * rads[QUAL];
      const bz = Math.sin(angs[QUAL]) * rads[QUAL];
      env.position.set(
        bx * (1 - e * 0.5) + Math.sin(e * 7) * 0.03 * e,
        0.13 + inOut(e) * 0.62,
        bz * (1 - e * 0.5) + Math.cos(e * 6) * 0.03 * e
      );
      env.rotation.y = e * 4;
      env.rotation.z = 0.25 * Math.sin(e * 9);
      envMat.uniforms.uAlpha.value = e > 0 && e < 1 ? 0.95 * (1 - seg(e, 0.7, 1)) : 0;

      // secondary: range rings shimmer on offset rhythms
      ringA.material.uniforms.uAlpha.value = 0.35 + 0.15 * Math.sin(t * 1.3);
      ringB.material.uniforms.uAlpha.value = 0.3 + 0.15 * Math.sin(t * 1.0 + 2);
    },
    beat(t) {
      const dq = ((W * t - angs[1]) % TAU + TAU) % TAU;
      return spike(seg(dq, 0.85, 1.35));
    },
  };
}

/* =====================================================================
 * 6. BrainAI - a graph that learns.
 * Octahedron nodes, curved links; a signal pulse walks a multi-hop path
 * lighting each edge; a breathing core inside a counter-rotating wireframe
 * icosahedron; a new node pops in and its link draws itself. Tumbles on
 * two axes.
 * ===================================================================== */
function brainai(mats) {
  const wrapper = new THREE.Group();
  const inner = new THREE.Group(); // centered at origin so tumble pivots cleanly
  inner.position.y = 0; wrapper.add(inner);
  wrapper.position.y = 0.46;
  const T = 5.5;

  // nodes on a sphere, varied sizes
  const nodePos = [];
  for (let i = 0; i < 13; i++) {
    const th = rnd(i) * TAU, ph = Math.acos(2 * rnd(i + 40) - 1);
    nodePos.push(new THREE.Vector3(
      Math.sin(ph) * Math.cos(th) * 0.27,
      Math.cos(ph) * 0.27,
      Math.sin(ph) * Math.sin(th) * 0.27
    ));
  }
  const nodes = nodePos.map((p, i) => {
    const n = mesh(geo.oct, mats.soft());
    n.position.copy(p);
    n.scale.setScalar(0.7 + rnd(i + 7) * 0.9);
    n.userData.s = n.scale.x;
    inner.add(n);
    return n;
  });

  // the pulse path (4 hops) gets individual curves + materials
  const path = [0, 3, 7, 11, 5];
  const pathMats = [0, 1, 2, 3].map(() => mats.line());
  const pathCurves = [];
  for (let j = 0; j < 4; j++) {
    const c = arcCurve(nodePos[path[j]], nodePos[path[j + 1]], 1.35, 0);
    pathCurves.push(c);
    inner.add(curveLine(c, 9, pathMats[j]));
  }
  // remaining edges merged into one faint LineSegments
  const restPairs = [[0, 1], [1, 4], [2, 6], [4, 8], [6, 9], [8, 12], [2, 10], [9, 12]];
  const restPts = [];
  restPairs.forEach(([a, b]) => {
    const c = arcCurve(nodePos[a], nodePos[b], 1.35, 0);
    for (let s = 0; s < 6; s++) restPts.push(c.getPoint(s / 6), c.getPoint((s + 1) / 6));
  });
  inner.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(restPts), mats.faint()));

  const pulseMat = mats.bright();
  const pulse = mesh(geo.oct, pulseMat);
  pulse.scale.setScalar(0.85);
  inner.add(pulse);

  // double-shell core
  const core = mesh(geo.sphM, mats.bright());
  core.scale.setScalar(1.1);
  const wire = new THREE.LineSegments(geo.wire, mats.line());
  inner.add(core, wire);

  // newcomer node: 4 preset spots, link draws itself via drawRange
  const spots = [0, 1, 2, 3].map((i) => {
    const th = rnd(i + 90) * TAU, ph = Math.acos(2 * rnd(i + 130) - 1);
    return new THREE.Vector3(Math.sin(ph) * Math.cos(th) * 0.37, Math.cos(ph) * 0.37, Math.sin(ph) * Math.sin(th) * 0.37);
  });
  const attach = [2, 8, 5, 12];
  const newMat = mats.bright();
  const newcomer = mesh(geo.oct, newMat);
  inner.add(newcomer);
  const newLinkMats = spots.map(() => mats.line());
  const newLinks = spots.map((sp, i) => {
    const line = curveLine(arcCurve(nodePos[attach[i]], sp, 1.2, 0), 9, newLinkMats[i]);
    line.geometry.setDrawRange(0, 0);
    inner.add(line);
    return line;
  });

  return {
    group: wrapper,
    update(t) {
      const u = (t / T) % 1;

      // signal pulse walks the path
      const pu = seg(u, 0.02, 0.66) * 4;
      const j = Math.min(3, Math.floor(pu));
      pathCurves[j].getPoint(inOut(c01(pu - j)), pulse.position);
      pulse.rotation.y = t * 3;
      pulseMat.uniforms.uAlpha.value = 0.95 * Math.min(seg(u, 0.02, 0.06), 1 - seg(u, 0.62, 0.68));

      // traversed edges light up, then decay before the wrap
      const tailFade = 1 - seg(u, 0.8, 0.95);
      pathMats.forEach((m, i) => {
        const lit = pu < i ? 0 : Math.max(0, 1 - (pu - i) * 0.45);
        m.uniforms.uAlpha.value = 0.28 + 0.6 * lit * tailFade;
      });
      // node flash as the pulse passes
      path.forEach((ni, i) => {
        const flare = spike(seg(pu, i - 0.15, i + 0.35));
        nodes[ni].scale.setScalar(nodes[ni].userData.s * (1 + flare * 0.5));
      });

      // core breathes; wireframe counter-rotates
      core.scale.setScalar(1.1 * (1 + 0.14 * Math.sin(t * 1.5)));
      wire.rotation.y = -t * 0.4;
      wire.rotation.z = t * 0.17;

      // newcomer pops in, link draws itself, both fade before the wrap
      const cyc = Math.floor(t / T) % 4;
      const popIn = backOut(seg(u, 0.72, 0.82));
      const fadeOut = 1 - seg(u, 0.94, 1);
      newcomer.position.copy(spots[cyc]);
      newcomer.scale.setScalar(Math.max(0.001, popIn * fadeOut));
      newMat.uniforms.uAlpha.value = 0.95 * popIn * fadeOut;
      newLinks.forEach((line, i) => {
        if (i === cyc) {
          line.geometry.setDrawRange(0, Math.floor(outCubic(seg(u, 0.78, 0.9)) * 9));
          newLinkMats[i].uniforms.uAlpha.value = 0.6 * fadeOut;
        } else {
          line.geometry.setDrawRange(0, 0);
        }
      });

      // slow tumble on two axes
      inner.rotation.y = t * 0.26;
      inner.rotation.x = Math.sin(t * 0.11) * 0.25;
    },
    beat(t) {
      return spike(seg((t / T) % 1, 0.72, 0.84));
    },
  };
}

/* =====================================================================
 * 8. App Builder - idea in, app out.
 * A prompt orb descends into a gantry and dissolves; a printhead carriage
 * sweeps while blocks materialize with weight, building an app tower
 * topped by a bright screen; the tower takes a proud 360° turn, then
 * deconstructs bottom-up as the next orb arrives.
 * ===================================================================== */
function appBuilder(mats) {
  const g = new THREE.Group();
  const T = 9;

  const gantryMat = mats.line();
  [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]].forEach(([x, z]) => {
    const p = mesh(geo.pillar, gantryMat);
    p.position.set(x, 0.22, z);
    g.add(p);
  });
  [[-0.15, 0, 0], [0.15, 0, 0], [0, 0, -0.15], [0, 0, 0.15]].forEach(([x, , z], i) => {
    const r = mesh(geo.rail, gantryMat);
    r.position.set(x, 0.395, z);
    if (i < 2) r.rotation.y = Math.PI / 2;
    g.add(r);
  });

  const carMat = mats.soft();
  const car = new THREE.Group();
  car.add(mesh(geo.carriage, carMat));
  const noz = mesh(geo.nozzle, carMat);
  noz.rotation.x = Math.PI;
  noz.position.y = -0.03;
  car.add(noz);
  car.position.y = 0.40;
  g.add(car);

  const orbMat = mats.bright();
  const orb = mesh(geo.sphS, orbMat);
  g.add(orb);

  const tower = new THREE.Group();
  g.add(tower);
  const blockMats = [];
  const blocks = [0, 1, 2, 3].map((i) => {
    const m = i === 3 ? mats.bright() : mats.soft();
    blockMats.push(m);
    const b = mesh(i === 3 ? geo.screenBlock : geo.block, m);
    b.userData.restY = 0.10 + i * 0.078 + (i === 3 ? 0.01 : 0);
    tower.add(b);
    return b;
  });

  const starts = [0.16, 0.265, 0.37, 0.475]; // per-block build windows

  return {
    group: g,
    update(t) {
      const u = (t / T) % 1;

      // prompt orb: descend, dissolve; reappear at the very end
      const d = seg(u, 0, 0.12);
      const dis = seg(u, 0.10, 0.15);
      const back = seg(u, 0.955, 1);
      orb.position.set(0, u < 0.5 ? 0.78 - inCubic(d) * 0.36 : 0.78, 0);
      orb.scale.setScalar(Math.max(0.001, u < 0.5 ? 1 - dis : back));
      orbMat.uniforms.uAlpha.value = 0.95 * (u < 0.5 ? 1 - dis : back);

      // carriage sweeps while building, parks after
      const building = Math.min(seg(u, 0.13, 0.18), 1 - seg(u, 0.55, 0.62));
      car.position.x = Math.sin(t * 2.6) * 0.11 * building;
      carMat.uniforms.uAlpha.value = 0.3 + 0.4 * building + 0.5 * spike(dis);

      // blocks materialize with weight, deconstruct bottom-up
      const turn = inOut(seg(u, 0.58, 0.75));
      blocks.forEach((b, i) => {
        const grow = backOut(seg(u, starts[i], starts[i] + 0.055));
        const seat = seg(u, starts[i] + 0.055, starts[i] + 0.12);
        const gone = inCubic(seg(u, 0.78 + i * 0.04, 0.82 + i * 0.04));
        const s = Math.max(0.001, grow * (1 - gone));
        const sy = impact(seat, 0.32);
        b.scale.set(s * (1 + (1 - sy) * 0.5), s * sy, s * (1 + (1 - sy) * 0.5));
        b.position.y = b.userData.restY - gone * 0.03;
        blockMats[i].uniforms.uAlpha.value = (i === 3 ? 0.95 : 0.6) * grow * (1 - gone);
      });

      // proud 360° turn (ends exactly where it began)
      tower.rotation.y = TAU * turn;
      gantryMat.uniforms.uAlpha.value = 0.30 * (1 - 0.55 * bump(seg(u, 0.58, 0.75)));

      // secondary: whole rig sways gently
      g.rotation.y = 0.08 * Math.sin(t * 0.33);
    },
    beat(t) {
      const u = (t / T) % 1;
      let b = 0;
      for (let i = 0; i < 4; i++) b = Math.max(b, spike(seg(u, starts[i] + 0.05, starts[i] + 0.13)));
      return b;
    },
  };
}

/* =====================================================================
 * 9. Portfolio Website - the site inside itself.
 * Five micro-projectors (dais + beam + glowing dot) on a mini helix with
 * the real focus model in miniature; the ring periodically accelerates,
 * friction-glides, and a new micro settles front-center. A faint axis
 * with one slow-rising ring anchors the center.
 * ===================================================================== */
function portfolioSite(mats) {
  const g = new THREE.Group();
  const P = 4.6; // scroll period

  const axis = mesh(geo.axis, mats.faint());
  axis.position.y = 0.38;
  g.add(axis);
  const riseMat = mats.line();
  const rise = mesh(geo.riseRing, riseMat);
  rise.rotation.x = Math.PI / 2;
  g.add(rise);

  const micros = [0, 1, 2, 3, 4].map(() => {
    const solid = mats.soft();
    const beamM = mats.custom({ alpha: 0.3, kind: 'cone', height: 0.08 });
    const m = new THREE.Group();
    m.add(mesh(geo.microDais, solid));
    const beam = mesh(geo.microBeam, beamM);
    beam.position.y = 0.045;
    m.add(beam);
    const dot = mesh(geo.sphXS, solid);
    dot.scale.setScalar(0.8);
    dot.position.y = 0.10;
    m.add(dot);
    g.add(m);
    return { m, dot, solid, beamM };
  });

  return {
    group: g,
    update(t) {
      // offset: slow idle drift + a periodic accelerate-and-glide step -
      // continuous and stateless (floor + eased fractional step)
      const s = (t / P) % 1;
      const off = t * 0.10 + Math.floor(t / P) + inOut(seg(s, 0.58, 0.84));

      micros.forEach(({ m, dot, solid, beamM }, i) => {
        let rel = ((i - off) % 5 + 5) % 5;
        if (rel > 2.5) rel -= 5;
        const ang = rel * (TAU / 5);
        m.position.set(Math.sin(ang) * 0.20, 0.34 - rel * 0.045, Math.cos(ang) * 0.20);
        const bright = Math.max(0, 1 - Math.abs(rel) / 2.5);
        solid.uniforms.uAlpha.value = 0.15 + bright * 0.8;
        beamM.uniforms.uAlpha.value = 0.08 + bright * 0.35;
        dot.scale.setScalar(0.6 + bright * 0.4 + 0.15 * Math.sin(t * 3 + i));
      });

      // rising ring on the axis
      const p = (t * 0.1) % 1;
      rise.position.y = 0.12 + p * 0.55;
      rise.scale.setScalar(1 + p * 0.6);
      riseMat.uniforms.uAlpha.value = bump(p) * 0.4;
    },
    beat(t) {
      // the moment a new micro settles front-center
      return spike(seg((t / P) % 1, 0.76, 0.9));
    },
  };
}

/* =====================================================================
 * 7. Agent Evaluation - the numbers, pinned before they are read.
 * Two bar pairs rise in turn: an accent bar beside a dim comparator.
 * A confidence whisker pops onto each bar as it lands. The second pair's
 * top 22 points glow, then dissolve into run-to-run variance.
 * ===================================================================== */
function agentEval(mats) {
  const g = new THREE.Group();
  const T = 8;
  const K = 0.0061;      // world height per percentage point (75 -> 0.46)
  const BASE = 0.10;

  const floor = mesh(geo.evalFloor, mats.faint());
  floor.position.set(0, BASE - 0.003, 0);
  g.add(floor);

  // value, CI half-width, x, landing time, accent (bright) or dim
  const spec = [
    { v: 75, ci: 6, x: -0.14, land: 0.20, accent: true },
    { v: 50, ci: 6, x: -0.06, land: 0.30, accent: false },
    { v: 70, ci: 7, x: 0.06, land: 0.56, accent: true },
    { v: 44, ci: 6, x: 0.14, land: 0.66, accent: false },
  ];
  const bars = spec.map((s) => {
    const m = s.accent ? mats.bright() : mats.faint();
    const b = mesh(geo.evalBar, m);
    b.position.set(s.x, BASE, 0);
    g.add(b);
    const wm = mats.line();
    const w = new THREE.LineSegments(geo.evalWhisk, wm);
    w.position.set(s.x, BASE, 0);
    g.add(w);
    return { ...s, b, m, w, wm };
  });

  // glowing band over the top 22 points of the second accent bar, cut
  // into four slabs so the dissolve can scatter them
  const bandMats = [0, 1, 2, 3].map(() => mats.bright());
  const band = bandMats.map((bm) => {
    const s = mesh(geo.evalGlow, bm);
    g.add(s);
    return s;
  });

  return {
    group: g,
    update(t) {
      const u = (t / T) % 1;
      const out = 1 - inCubic(seg(u, 0.92, 0.99)); // loop reset: everything drops away

      bars.forEach(({ v, ci, x, land, accent, b, m, w, wm }) => {
        const rise = backOut(seg(u, land - 0.16, land));
        const h = v * K * rise * out;
        b.scale.y = Math.max(0.0005, h);
        const flare = spike(seg(u, land, land + 0.12));
        m.uniforms.uAlpha.value = (accent ? 0.9 : 0.3) + 0.4 * flare;

        const pop = backOut(seg(u, land, land + 0.06)) * out;
        w.position.y = BASE + Math.max(0, h);
        w.scale.y = Math.max(0.0005, 2 * ci * K * pop);
        wm.uniforms.uAlpha.value = 0.75 * pop;
      });

      // top 22 points of the 70 bar glow, then dissolve (slabs scatter)
      const glow = outCubic(seg(u, 0.64, 0.72));
      const dis = inOut(seg(u, 0.76, 0.90));
      const bandA = 0.95 * glow * (1 - dis);
      band.forEach((s, i) => {
        s.position.set(0.06 + (rnd(i) - 0.5) * 0.05 * dis, BASE + 48 * K + i * 5.5 * K + rnd(i + 3) * 0.02 * dis, 0);
        s.scale.y = 5.5 * K;
        bandMats[i].uniforms.uAlpha.value = bandA;
      });

      g.rotation.y = 0.08 * Math.sin(t * 0.33);
    },
    beat(t) {
      const u = (t / T) % 1;
      let b = 0;
      for (let i = 0; i < spec.length; i++) b = Math.max(b, spike(seg(u, spec[i].land, spec[i].land + 0.12)));
      return b;
    },
  };
}

/* ---------- fallback - slow-turning wireframe sphere ---------- */
function generic(mats) {
  const g = new THREE.Group();
  const globe = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.SphereGeometry(0.28, 10, 8)),
    mats.line()
  );
  globe.position.y = 0.42;
  g.add(globe);
  return { group: g, update(t) { globe.rotation.y = t * 0.5; } };
}

const builders = {
  'halo-agent-os': haloAgentOs,
  'receptionist-live': receptionist,
  'crm-live': crm,
  'leadgen-live': leadgen,
  'brainai': brainai,
  'agent-eval': agentEval,
  'app-builder': appBuilder,
  'portfolio-site': portfolioSite,
};

/**
 * Build the mini scene for a project.
 * Provides a material registry so the hologram can drive uTime/uGlobal.
 */
export function buildScene(project, registerMaterial) {
  const color = new THREE.Color(project.accent).lerp(new THREE.Color('#7ec4ff'), 0.45);
  const mats = {
    bright: () => registerMaterial(holoMat(color, { alpha: 0.95 })),
    soft: () => registerMaterial(holoMat(color, { alpha: 0.55 })),
    faint: () => registerMaterial(holoMat(color, { alpha: 0.22 })),
    line: () => registerMaterial(holoMat(color, { alpha: 0.5 })),
    custom: (opts) => registerMaterial(holoMat(color, opts)),
  };
  return (builders[project.slug] || generic)(mats);
}
