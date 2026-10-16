// Shared hologram look - additive, accent-tinted, animated scanlines +
// flicker, global reveal/dim control. One factory covers solid holo
// surfaces, the volumetric beam shells (fresnel + local-height fade),
// the dais status arc, the ground-glow disc, the radar sweep wedge,
// and the beam dust motes. Original GLSL.

import * as THREE from 'three';

const baseVertex = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec3 vLocal;
varying vec2 vUv;
void main() {
  vLocal = position;
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
  gl_PointSize = 4.0;
}
`;

const holoFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
uniform float uAlpha;    // per-material base alpha
uniform float uGlobal;   // reveal * distance-dim, set per hologram per frame
varying vec3 vWorld;

float hash(float n) { return fract(sin(n) * 43758.5453); }

void main() {
  // horizontal scanlines drifting upward
  float scan = 0.78 + 0.22 * sin(vWorld.y * 46.0 - uTime * 6.0);
  // occasional soft flicker
  float flick = 0.92 + 0.08 * hash(floor(uTime * 24.0));
  gl_FragColor = vec4(uColor, uAlpha * uGlobal * scan * flick);
}
`;

// Beam shell: fade is a function of LOCAL height (survives repositioning
// and scaling), fresnel edge-brightening sells the volume.
const coneFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
uniform float uAlpha;
uniform float uGlobal;
uniform float uH;        // local-space height of the cone geometry
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec3 vLocal;

void main() {
  float up = clamp(vLocal.y / uH + 0.5, 0.0, 1.0);
  float fade = pow(1.0 - up, 1.35);
  vec3 viewDir = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - abs(dot(viewDir, normalize(vNormalW))), 1.6);
  float scan = 0.85 + 0.15 * sin(vLocal.y * 26.0 - uTime * 4.0);
  gl_FragColor = vec4(uColor, uAlpha * uGlobal * fade * (0.35 + 0.75 * fres) * scan);
}
`;

// Segmented status arc around the dais mid housing - ~24 segments cut
// out of one band purely in the fragment shader; a brightness chase runs
// around it and accelerates + fills on hover.
const arcFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
uniform float uAlpha;
uniform float uGlobal;
uniform float uHover;
varying vec3 vLocal;

void main() {
  float ang = atan(vLocal.z, vLocal.x);
  float s = fract((ang / 6.2831853 + 0.5) * 24.0);
  float gap = smoothstep(0.05, 0.16, s) * smoothstep(0.05, 0.16, 1.0 - s);
  float chase = pow(0.5 + 0.5 * sin(ang * 2.0 - uTime * (1.4 + uHover * 5.0)), 4.0);
  float level = mix(0.16 + 0.84 * chase, 1.0, uHover * 0.85);
  gl_FragColor = vec4(uColor, uAlpha * uGlobal * gap * level);
}
`;

// Ground glow under the dais - radial gradient falloff, gentle breathing.
const glowFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
uniform float uAlpha;
uniform float uGlobal;
varying vec2 vUv;

void main() {
  float d = clamp(length(vUv - 0.5) * 2.0, 0.0, 1.0);
  float fall = pow(1.0 - d, 2.3);
  float breathe = 0.85 + 0.15 * sin(uTime * 1.7);
  gl_FragColor = vec4(uColor, uAlpha * uGlobal * fall * breathe);
}
`;

// Radar sweep wedge - per-vertex fade baked into an attribute so the
// leading edge is bright and the trail dissolves.
const wedgeVertex = /* glsl */ `
attribute float aFade;
varying float vFade;
void main() {
  vFade = aFade;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
`;

const wedgeFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uAlpha;
uniform float uGlobal;
varying float vFade;
void main() {
  gl_FragColor = vec4(uColor, uAlpha * uGlobal * vFade * vFade);
}
`;

// Dust motes inside the beam - positions computed in the vertex shader
// from uTime (stateless), drifting upward with a slight sine wander,
// widening with the cone.
const motesVertex = /* glsl */ `
attribute vec3 aSeed;    // x: phase, y: radial fraction, z: angle seed
uniform float uTime;
uniform float uH;        // beam height the motes traverse
varying float vP;
void main() {
  float p = fract(aSeed.x + uTime * 0.045);
  vP = p;
  float r = mix(0.05, 0.36, p) * aSeed.y;
  float ang = aSeed.z * 6.2831853 + uTime * 0.25 + sin(uTime * 0.7 + aSeed.z * 21.0) * 0.35;
  vec3 pos = vec3(cos(ang) * r, p * uH, sin(ang) * r);
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
  gl_PointSize = 2.0 + 2.0 * aSeed.y;
}
`;

const motesFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uAlpha;
uniform float uGlobal;
varying float vP;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float disc = smoothstep(1.0, 0.2, d);
  float life = smoothstep(0.0, 0.12, vP) * (1.0 - smoothstep(0.72, 1.0, vP));
  gl_FragColor = vec4(uColor, uAlpha * uGlobal * disc * life);
}
`;

const shaders = {
  holo: [baseVertex, holoFragment],
  cone: [baseVertex, coneFragment],
  arc: [baseVertex, arcFragment],
  glow: [baseVertex, glowFragment],
  wedge: [wedgeVertex, wedgeFragment],
  motes: [motesVertex, motesFragment],
};

/**
 * Create a hologram ShaderMaterial.
 * kind: 'holo' | 'cone' | 'arc' | 'glow' | 'wedge' | 'motes'
 * height: local-space height for 'cone'/'motes' fades.
 */
export function holoMat(color, { alpha = 0.85, kind = 'holo', height = 1 } = {}) {
  const [vertexShader, fragmentShader] = shaders[kind];
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uTime: { value: 0 },
      uAlpha: { value: alpha },
      uGlobal: { value: 0 },
      uHover: { value: 0 },
      uH: { value: height },
    },
  });
}
