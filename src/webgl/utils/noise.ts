// Deterministic CPU noise used to sculpt terrain and ridge silhouettes.

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const perm = new Uint8Array(512)
const gx = new Float32Array(256)
const gy = new Float32Array(256)
{
  const rnd = mulberry32(1926)
  const p = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
  for (let i = 0; i < 256; i++) {
    const a = rnd() * Math.PI * 2
    gx[i] = Math.cos(a)
    gy[i] = Math.sin(a)
  }
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)

/** 2D gradient noise, roughly in [-0.7, 0.7] */
export function noise2(x: number, y: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const X = xi & 255
  const Y = yi & 255
  const g = (ix: number, iy: number, dx: number, dy: number) => {
    const h = perm[perm[ix] + iy]
    return gx[h] * dx + gy[h] * dy
  }
  const n00 = g(X, Y, xf, yf)
  const n10 = g(X + 1, Y, xf - 1, yf)
  const n01 = g(X, Y + 1, xf, yf - 1)
  const n11 = g(X + 1, Y + 1, xf - 1, yf - 1)
  const u = fade(xf)
  const v = fade(yf)
  return n00 + u * (n10 - n00) + v * (n01 - n00) + u * v * (n00 - n10 - n01 + n11)
}

export function fbm2(x: number, y: number, octaves = 5) {
  let sum = 0
  let amp = 0.5
  let freq = 1
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2(x * freq, y * freq)
    freq *= 2.03
    amp *= 0.5
  }
  return sum
}

/** Ridged multifractal — sharp crests, used for mountain ranges. ~[0, 1] */
export function ridged2(x: number, y: number, octaves = 5) {
  let sum = 0
  let amp = 0.55
  let freq = 1
  let weight = 1
  for (let i = 0; i < octaves; i++) {
    let n = 1 - Math.abs(noise2(x * freq, y * freq) * 1.4)
    n = n * n * weight
    weight = Math.min(1, Math.max(0, n * 1.6))
    sum += n * amp
    freq *= 2.1
    amp *= 0.5
  }
  return sum
}

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
