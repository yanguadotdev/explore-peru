// Shared GLSL snippets.

export const NOISE = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6. - 15.) + 10.);
  float a = hash12(i);
  float b = hash12(i + vec2(1., 0.));
  float c = hash12(i + vec2(0., 1.));
  float d = hash12(i + vec2(1., 1.));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.;
  float a = .5;
  mat2 r = mat2(.8, .6, -.6, .8);
  for (int i = 0; i < 6; i++) {
    v += a * vnoise(p);
    p = r * p * 2.03 + 17.1;
    a *= .5;
  }
  return v;
}
float turb(vec2 p) {
  float v = 0.;
  float a = .5;
  mat2 r = mat2(.8, .6, -.6, .8);
  for (int i = 0; i < 5; i++) {
    v += a * abs(vnoise(p) * 2. - 1.);
    p = r * p * 2.07 + 9.3;
    a *= .5;
  }
  return v;
}
`

/**
 * "Tostado" burn field: turbulent fbm biased by distance to the centre, so the
 * burn opens from the middle of the screen outwards like paper over a flame.
 * Returns: x = amount revealed (0..1), y = char band, z = ember glow.
 */
export const BURN = /* glsl */ `
vec3 burnField(vec2 uv, float aspect, float progress, float seed) {
  vec2 p = (uv - .5) * vec2(aspect, 1.);
  float n = fbm(p * 2.4 + seed);
  float t = turb(p * 5.5 - seed * 1.7);
  float f = length(p) * .78 + n * .42 + t * .16;
  float th = progress * 1.55 - .1;
  float revealed = 1. - smoothstep(th - .012, th + .012, f);
  float d = f - th;
  float charBand = smoothstep(.07, .0, d) * step(0., d);
  float glow = exp(-abs(d) * 70.) * step(.0001, progress) * step(progress, .9999);
  return vec3(revealed, charBand, glow);
}
`

export const FULLSCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0., 1.);
}
`
