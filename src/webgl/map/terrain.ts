import * as THREE from 'three'
import { STOPS } from '../../data/stops'
import { NOISE } from '../shaders/chunks'
import { clamp, fbm2, lerp, ridged2, smoothstep } from '../utils/noise'

export const MAP_W = 124
export const MAP_D = 84
export const BASE_Y = -6
export const WATER_Y = 1.15

// River runs along the lower valley, west → east, exiting near the town.
export const RIVER_POINTS = [
  new THREE.Vector2(-64, 13),
  new THREE.Vector2(-44, 17),
  new THREE.Vector2(-24, 13),
  new THREE.Vector2(-4, 19),
  new THREE.Vector2(16, 26),
  new THREE.Vector2(36, 29),
  new THREE.Vector2(52, 25),
  new THREE.Vector2(64, 28),
]

const riverCurve = new THREE.SplineCurve(RIVER_POINTS)
const riverSamples = riverCurve.getSpacedPoints(260)

function distToRiverExact(x: number, z: number) {
  let best = Infinity
  for (const p of riverSamples) {
    const d = (p.x - x) ** 2 + (p.y - z) ** 2
    if (d < best) best = d
  }
  return Math.sqrt(best)
}

/** Regular grid cache over the map with bilinear lookup. */
class Grid {
  data: Float32Array
  nx: number
  nz: number
  constructor(
    private step: number,
    fn: (x: number, z: number) => number,
    private x0 = -MAP_W / 2 - 2,
    private z0 = -MAP_D / 2 - 2,
  ) {
    this.nx = Math.ceil((MAP_W + 4) / step) + 1
    this.nz = Math.ceil((MAP_D + 4) / step) + 1
    this.data = new Float32Array(this.nx * this.nz)
    for (let j = 0; j < this.nz; j++)
      for (let i = 0; i < this.nx; i++) this.data[j * this.nx + i] = fn(this.x0 + i * step, this.z0 + j * step)
  }
  get(x: number, z: number) {
    const fx = clamp((x - this.x0) / this.step, 0, this.nx - 1.001)
    const fz = clamp((z - this.z0) / this.step, 0, this.nz - 1.001)
    const i = Math.floor(fx)
    const j = Math.floor(fz)
    const tx = fx - i
    const tz = fz - j
    const d = this.data
    const a = d[j * this.nx + i]
    const b = d[j * this.nx + i + 1]
    const c = d[(j + 1) * this.nx + i]
    const e = d[(j + 1) * this.nx + i + 1]
    return a + (b - a) * tx + (c - a) * tz + (a - b - c + e) * tx * tz
  }
}

let riverGrid: Grid | null = null
export const distToRiver = (x: number, z: number) => (riverGrid ??= new Grid(0.5, distToRiverExact)).get(x, z)

/** Raw mountain field: high in the north-west, falling to a south-east valley. */
function rawHeight(x: number, z: number) {
  const g = smoothstep(-1.15, 1.05, (-x * 0.62 - z * 0.95) / 52)
  const base = 1.6 + g * 9
  const m = ridged2(x * 0.032 + 4.1, z * 0.032 - 2.7, 5) * (1.4 + g * 17)
  const detail = fbm2(x * 0.16, z * 0.16, 3) * 0.8
  return base + m + detail
}

const flats = STOPS.map((s) => ({ x: s.x, z: s.z, h: 0, r: s.kind === 'stop' ? (s.id === 'pueblo' ? 6.5 : 3.6) : 2.6 }))

// Pre-compute pad heights after river carving so pads sit on the carved ground.
function carved(x: number, z: number, h: number) {
  const d = distToRiver(x, z)
  // broad, gentle valley floor; terraces rise from it
  const valley = smoothstep(20, 4, d)
  const floor = WATER_Y + 0.7 + Math.max(0, d - 3) * 0.09 + (h - WATER_Y) * 0.08
  h = lerp(h, floor, Math.pow(valley, 0.75) * 0.97)
  // narrow river bed
  const bed = smoothstep(3.3, 1.2, d)
  return lerp(h, WATER_Y - 0.9, bed)
}
let flatsReady = false
function ensureFlats() {
  if (flatsReady) return
  flatsReady = true
  for (const f of flats) f.h = Math.max(carved(f.x, f.z, rawHeight(f.x, f.z)), WATER_Y + 0.9)
}

function heightExact(x: number, z: number) {
  ensureFlats()
  let h = carved(x, z, rawHeight(x, z))
  for (const f of flats) {
    const d = Math.hypot(x - f.x, z - f.z)
    if (d < f.r * 1.8) h = lerp(h, f.h, smoothstep(f.r * 1.8, f.r, d))
  }
  // soften the diorama rim so the sides read cleanly
  const ex = Math.abs(x) / (MAP_W / 2)
  const ez = Math.abs(z) / (MAP_D / 2)
  const edge = smoothstep(0.9, 1, Math.max(ex, ez))
  return lerp(h, Math.max(h * 0.7, WATER_Y - 0.2), edge * 0.4)
}

// terrain mesh spacing is 0.5 → a 0.25 grid keeps lookups visually exact
let heightGrid: Grid | null = null
export const heightAt = (x: number, z: number) => (heightGrid ??= new Grid(0.25, heightExact)).get(x, z)

export function slopeAt(x: number, z: number) {
  const e = 0.6
  const dx = heightAt(x + e, z) - heightAt(x - e, z)
  const dz = heightAt(x, z + e) - heightAt(x, z - e)
  return Math.hypot(dx, dz) / (2 * e)
}

export const H_MIN = 0
export const H_MAX = 28

/** Ecological band of a point. */
export function zoneAt(h: number) {
  const n = clamp((h - H_MIN) / (H_MAX - H_MIN))
  if (n < 0.2) return 'valley'
  if (n < 0.66) return 'coffee'
  if (n < 0.86) return 'forest'
  return 'paramo'
}

const C = {
  valley: new THREE.Color('#8FA35A'),
  valley2: new THREE.Color('#A8B467'),
  sand: new THREE.Color('#CDB68A'),
  coffee: new THREE.Color('#3E6A35'),
  coffee2: new THREE.Color('#2F5A2E'),
  forest: new THREE.Color('#284A30'),
  forest2: new THREE.Color('#1F3D29'),
  paramo: new THREE.Color('#8D8A63'),
  rock: new THREE.Color('#8F7E66'),
  soil: new THREE.Color('#8A5534'),
}

const TERRAIN_PARS = /* glsl */ `
varying float vH;
varying float vCoffee;
attribute float aCoffee;
`

export function buildTerrain() {
  const segX = 248
  const segZ = 168
  const geo = new THREE.PlaneGeometry(MAP_W, MAP_D, segX, segZ)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(pos.count * 3)
  const coffee = new Float32Array(pos.count)
  const c = new THREE.Color()

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const h = heightAt(x, z)
    pos.setY(i, h)
  }
  geo.computeVertexNormals()
  const nrm = geo.attributes.normal as THREE.BufferAttribute

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const h = pos.getY(i)
    const slope = 1 - nrm.getY(i)
    const n = clamp((h - H_MIN) / (H_MAX - H_MIN))
    const v = fbm2(x * 0.09, z * 0.09, 3) + 0.5
    const zone = zoneAt(h)
    if (zone === 'valley') c.copy(C.valley).lerp(C.valley2, v)
    else if (zone === 'coffee') c.copy(C.coffee).lerp(C.coffee2, v)
    else if (zone === 'forest') c.copy(C.forest).lerp(C.forest2, v)
    else c.copy(C.paramo).lerp(C.rock, v)

    // smooth transitions between bands
    const t1 = smoothstep(0.16, 0.24, n)
    if (n < 0.24 && n > 0.16) c.lerp(C.coffee, t1 * 0.5)
    const t2 = smoothstep(0.62, 0.7, n)
    if (n > 0.62 && n < 0.7) c.lerp(C.forest, t2 * 0.5)

    // red Andean soil on steep cuts
    c.lerp(C.soil, smoothstep(0.32, 0.6, slope) * 0.75)
    // river banks
    const dr = distToRiver(x, z)
    c.lerp(C.sand, smoothstep(3.7, 2.5, dr) * 0.85)

    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
    coffee[i] = zone === 'coffee' ? smoothstep(0.35, 0.05, slope) : 0
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.setAttribute('aCoffee', new THREE.BufferAttribute(coffee, 1))

  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 })
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${TERRAIN_PARS}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvH = position.y;\nvCoffee = aCoffee;`)
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\nvarying float vH;\nvarying float vCoffee;\n${NOISE}`,
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        // coffee terraces follow the contour lines
        float rv = vH * 3.2;
        float rows = smoothstep(.18, .42, abs(fract(rv) - .5));
        diffuseColor.rgb *= mix(1., .74 + rows * .3, vCoffee);
        // faint topographic contour lines — echo of the loader
        float cv = vH * .9;
        float cfw = fwidth(cv);
        float cl = 1. - smoothstep(0., cfw * 1.2, abs(fract(cv - .5) - .5));
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * .72, cl * .32);
        `,
      )
  }
  const mesh = new THREE.Mesh(geo, mat)
  mesh.receiveShadow = true
  mesh.castShadow = true
  return mesh
}

/** Layered soil skirt around the diorama block. */
export function buildSkirt() {
  // first band hugs the terrain (topsoil); the rest are horizontal strata
  const bands = [
    { level: (h: number) => h - 0.7, color: '#4A3122' },
    { level: () => -0.9, color: '#9B5A36' },
    { level: () => -2.5, color: '#C48D52' },
    { level: () => -4.1, color: '#7A4A2E' },
    { level: () => BASE_Y, color: '#4B2F1F' },
  ]
  const pos: number[] = []
  const col: number[] = []
  const nrm: number[] = []
  const steps = 160
  const edges: [THREE.Vector2, THREE.Vector2, THREE.Vector3][] = [
    [new THREE.Vector2(-MAP_W / 2, MAP_D / 2), new THREE.Vector2(MAP_W / 2, MAP_D / 2), new THREE.Vector3(0, 0, 1)],
    [new THREE.Vector2(MAP_W / 2, MAP_D / 2), new THREE.Vector2(MAP_W / 2, -MAP_D / 2), new THREE.Vector3(1, 0, 0)],
    [new THREE.Vector2(MAP_W / 2, -MAP_D / 2), new THREE.Vector2(-MAP_W / 2, -MAP_D / 2), new THREE.Vector3(0, 0, -1)],
    [new THREE.Vector2(-MAP_W / 2, -MAP_D / 2), new THREE.Vector2(-MAP_W / 2, MAP_D / 2), new THREE.Vector3(-1, 0, 0)],
  ]
  const c = new THREE.Color()
  for (const [a, b, n] of edges) {
    for (let s = 0; s < steps; s++) {
      const p0 = a.clone().lerp(b, s / steps)
      const p1 = a.clone().lerp(b, (s + 1) / steps)
      const h0 = heightAt(p0.x, p0.y)
      const h1 = heightAt(p1.x, p1.y)
      let top0 = h0
      let top1 = h1
      for (let bi = 0; bi < bands.length; bi++) {
        const band = bands[bi]
        const last = bi === bands.length - 1
        // band boundaries wobble a little, like real strata
        const w0 = last ? 0 : Math.sin(p0.x * 0.21 + p0.y * 0.17 + bi * 1.7) * 0.22
        const w1 = last ? 0 : Math.sin(p1.x * 0.21 + p1.y * 0.17 + bi * 1.7) * 0.22
        const bot0 = Math.max(BASE_Y, Math.min(top0, band.level(h0) + w0))
        const bot1 = Math.max(BASE_Y, Math.min(top1, band.level(h1) + w1))
        c.set(band.color)
        pos.push(p0.x, top0, p0.y, p0.x, bot0, p0.y, p1.x, top1, p1.y, p1.x, top1, p1.y, p0.x, bot0, p0.y, p1.x, bot1, p1.y)
        for (let k = 0; k < 6; k++) {
          col.push(c.r, c.g, c.b)
          nrm.push(n.x, n.y, n.z)
        }
        top0 = bot0
        top1 = bot1
      }
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }))
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

/** Paper table the diorama rests on: contour lines + contact shadow. */
export function buildPaper() {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uPaper: { value: new THREE.Color('#EDE3CC') },
      uInk: { value: new THREE.Color('#6B4A33') },
      uShadow: { value: new THREE.Color('#5E4A36') },
      uSize: { value: new THREE.Vector2(MAP_W, MAP_D) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vWorld;
      uniform vec3 uPaper;
      uniform vec3 uInk;
      uniform vec3 uShadow;
      uniform vec2 uSize;
      ${NOISE}
      float sdBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.)) + min(max(d.x, d.y), 0.); }
      void main() {
        vec2 p = vWorld.xz;
        float h = fbm(p * .012 + 7.) * 24.;
        float fw = fwidth(h);
        float line = 1. - smoothstep(0., fw * 1.3, abs(fract(h - .5) - .5));
        float fade = smoothstep(260., 70., length(p));
        vec3 col = mix(uPaper, uInk, line * .16 * fade);
        float d = sdBox(p - vec2(3., 4.), uSize * .5);
        float sh = smoothstep(16., -2., d);
        col = mix(col, uShadow, sh * .32);
        gl_FragColor = vec4(col, 1.);
        #include <colorspace_fragment>
      }`,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = BASE_Y - 0.02
  return mesh
}

/** Animated river ribbon. */
export function buildRiver() {
  const curve = new THREE.CatmullRomCurve3(RIVER_POINTS.map((p) => new THREE.Vector3(p.x, WATER_Y, p.y)))
  const N = 400
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const len = curve.getLength()
  for (let i = 0; i <= N; i++) {
    const u = i / N
    const p = curve.getPointAt(u)
    const t = curve.getTangentAt(u)
    const nx = -t.z
    const nz = t.x
    const w = 2.6 + Math.sin(u * 23) * 0.5
    let ax = p.x + nx * w
    let az = p.z + nz * w
    let bx = p.x - nx * w
    let bz = p.z - nz * w
    const lim = (v: number, m: number) => Math.max(-m, Math.min(m, v))
    ax = lim(ax, MAP_W / 2)
    bx = lim(bx, MAP_W / 2)
    az = lim(az, MAP_D / 2)
    bz = lim(bz, MAP_D / 2)
    pos.push(ax, WATER_Y, az, bx, WATER_Y, bz)
    uv.push(u * len, 0, u * len, 1)
    if (i < N) {
      const a = i * 2
      idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.setIndex(idx)
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color('#2E6F78') },
      uShallow: { value: new THREE.Color('#7DB3AC') },
      uFoam: { value: new THREE.Color('#F3EEDF') },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uFoam;
      ${NOISE}
      void main() {
        float across = abs(vUv.y - .5) * 2.;
        vec3 col = mix(uDeep, uShallow, smoothstep(.1, .95, across));
        float flow = fbm(vec2(vUv.x * .45 - uTime * .9, vUv.y * 3.));
        float streak = smoothstep(.62, .7, fbm(vec2(vUv.x * .18 - uTime * .6, vUv.y * 9.)));
        col += streak * .12;
        col = mix(col, uFoam, smoothstep(.72, .98, across + flow * .25) * .8);
        float a = smoothstep(1., .9, across);
        gl_FragColor = vec4(col, .92 * a + .08);
        #include <colorspace_fragment>
      }`,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.receiveShadow = true
  return mesh
}
