// Fullscreen composite pass: animated film grain + radial vignette
// with a faint cool tint at the frame edges. Original GLSL.

export const postVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const postFragment = /* glsl */ `
uniform sampler2D uScene;
uniform float uTime;
uniform float uGrain;     // grain intensity
uniform vec2 uRes;
varying vec2 vUv;

// cheap hash noise
float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

void main() {
  vec3 col = texture2D(uScene, vUv).rgb;

  // animated grain
  float g = hash(vUv * uRes + fract(uTime) * 191.0) - 0.5;
  col += g * uGrain;

  // radial vignette, slightly blue at the edges
  vec2 c = vUv - 0.5;
  c.x *= uRes.x / uRes.y;
  float d = length(c);
  float vig = smoothstep(0.35, 1.05, d);
  col = mix(col, vec3(0.012, 0.016, 0.028), vig * 0.75);

  gl_FragColor = vec4(col, 1.0);
}
`;
