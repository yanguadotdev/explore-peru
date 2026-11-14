import * as THREE from 'three'
import { NOISE } from '../shaders/chunks'
import { clamp, fbm2, lerp, mulberry32, ridged2, smoothstep } from '../utils/noise'
import { DEPT_SEEDS, RIVERS, TITICACA, deptAt, inTiticaca, oceanSDF, peruSDF, spineInfo } from './peru'

/*
  Peru diorama terrain.
  One height field over the whole board: Pacific to the west (shallows near the
  coast), neighbouring countries as a low paper plain, and Peru raised as a
  diorama — desert coast, the Andes (snow, altiplano, Titicaca), Amazon lowlands
  and its rivers. Departments are weighted-Voronoi cells drawn on top.
*/

export const MAP_W = 96
export const MAP_D = 128
export const BASE_Y = -6
/** sea level */
export const WATER_Y = 0
export const NEIGHBOR_Y = 0.9
export const LAND_Y = 1.8
export const LAKE_Y = 9.05

export type Zone = 'ocean' | 'neighbor' | 'coast' | 'sierra' | 'puna' | 'snow' | 'selva' | 'lake'

// ------------------------------------------------------------------ grid cache

class Grid {
  data: Float32Array
  nx: number
  nz: number
  constructor(
    public step: number,
    fn: (x: number, z: number) => number,
    public x0 = -MAP_W / 2 - 1,
    public z0 = -MAP_D / 2 - 1,
  ) {
    this.nx = Math.ceil((MAP_W + 2) / step) + 1
    this.nz = Math.ceil((MAP_D + 2) / step) + 1
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
  nearest(x: number, z: number) {
    const i = Math.round(clamp((x - this.x0) / this.step, 0, this.nx - 1))
    const j = Math.round(clamp((z - this.z0) / this.step, 0, this.nz - 1))
    return this.data[j * this.nx + i]
  }
}

// ------------------------------------------------------------------ base relief

/** Peru relief before rivers/lake are carved. */
function peruRelief(x: number, z: number) {
  const { d, side } = spineInfo(x, z)
  const south = smoothstep(-20, 45, z) // the Andes widen and rise to the south
  const width = lerp(6.5, 13, south)
  const andes = smoothstep(width, width * 0.12, d)
  const ridge = ridged2(x * 0.085 + 3.1, z * 0.085 - 1.7, 5)
  const detail = fbm2(x * 0.2, z * 0.2, 3)
  let h = LAND_Y
  if (side < 0) {
    // desert coast: gentle dunes and foothills
    h += smoothstep(width * 1.7, width, d) * 1.2 + (fbm2(x * 0.11, z * 0.11, 3) + 0.4) * 0.45
  } else {
    // Amazon lowlands + "ceja de selva" climbing to the Andes
    h += (fbm2(x * 0.09, z * 0.09, 3) + 0.4) * 0.6 + smoothstep(width * 2.1, width, d) * 1.9
  }
  h += andes * (3.6 + ridge * 8.5 + south * 3.5) + detail * 0.35
  // altiplano around Titicaca
  const tdist = Math.hypot(x - TITICACA.x, z - TITICACA.z)
  const plateau = smoothstep(13, 6.5, tdist)
  h = lerp(h, Math.max(9.6 + detail * 0.5, h * 0.55 + 4.8), plateau * 0.9)
  return h
}

// ------------------------------------------------------------------ rivers

type RiverSample = { x: number; z: number; y: number; w: number; ri: number }
let riverSamples: RiverSample[] | null = null

/** Centre-line samples with a monotonic (downhill) water level. */
function getRiverSamples() {
  if (riverSamples) return riverSamples
  const out: RiverSample[] = []
  RIVERS.forEach((r, ri) => {
    const curve = new THREE.SplineCurve(r.xz)
    const pts = curve.getSpacedPoints(Math.ceil(curve.getLength() / 0.5))
    let y = Infinity
    for (const p of pts) {
      const inPeru = peruSDF(p.x, p.y) < 0
      const ground = inPeru ? peruRelief(p.x, p.y) : NEIGHBOR_Y
      y = Math.max(Math.min(y, ground - 0.25), inPeru ? 1.6 : 0.68)
      out.push({ x: p.x, z: p.y, y, w: r.width, ri })
    }
  })
  riverSamples = out
  return out
}

function nearestRiver(x: number, z: number) {
  let best = Infinity
  let s: RiverSample | null = null
  for (const r of getRiverSamples()) {
    const dx = r.x - x
    const dz = r.z - z
    if (Math.abs(dx) > 6 || Math.abs(dz) > 6) continue
    const d = dx * dx + dz * dz
    if (d < best) {
      best = d
      s = r
    }
  }
  return s ? { d: Math.sqrt(best) - s.w * 0.5, y: s.y, w: s.w } : null
}

// ------------------------------------------------------------------ height + zone

function zoneExact(x: number, z: number): Zone {
  if (oceanSDF(x, z) < 0) return 'ocean'
  if (peruSDF(x, z) > 0) return 'neighbor'
  if (inTiticaca(x, z) < 1) return 'lake'
  const h = peruRelief(x, z)
  if (h > 16.5) return 'snow'
  if (h > 9) return 'puna'
  const { d, side } = spineInfo(x, z)
  if (side < 0) return d < 4 || h > 5.2 ? 'sierra' : 'coast'
  return h > 6 ? 'sierra' : 'selva'
}

function heightExact(x: number, z: number) {
  const so = oceanSDF(x, z)
  if (so < 0) return WATER_Y - 0.35 - smoothstep(0, 9, -so) * 2.6
  const sp = peruSDF(x, z)
  let h = sp > 0 ? NEIGHBOR_Y + fbm2(x * 0.15, z * 0.15, 2) * 0.12 : peruRelief(x, z)
  // rivers
  const r = nearestRiver(x, z)
  if (r) {
    const bank = smoothstep(r.w * 0.9 + 0.5, 0, r.d)
    h = lerp(h, Math.min(h, r.y + 0.35), smoothstep(r.w * 2.4 + 1.5, r.w * 0.6, r.d) * 0.7)
    h = lerp(h, r.y - 0.4, bank)
  }
  // Titicaca
  if (sp <= 0) {
    const e = inTiticaca(x, z)
    if (e < 1.5) h = lerp(h, LAKE_Y - 0.5, smoothstep(1.5, 1, e))
  }
  return h
}

let heightGrid: Grid | null = null
let zoneGrid: Grid | null = null
let riverGrid: Grid | null = null
const ZONES: Zone[] = ['ocean', 'neighbor', 'coast', 'sierra', 'puna', 'snow', 'selva', 'lake']

export const heightAt = (x: number, z: number) => (heightGrid ??= new Grid(0.4, heightExact)).get(x, z)
export const zoneAt = (x: number, z: number): Zone =>
  ZONES[(zoneGrid ??= new Grid(0.8, (gx, gz) => ZONES.indexOf(zoneExact(gx, gz)))).nearest(x, z)]
/** Distance to the nearest river bank (large when no river around). */
export const distToRiver = (x: number, z: number) =>
  (riverGrid ??= new Grid(0.8, (gx, gz) => nearestRiver(gx, gz)?.d ?? 99)).get(x, z)

export function slopeAt(x: number, z: number) {
  const e = 0.6
  const dx = heightAt(x + e, z) - heightAt(x - e, z)
  const dz = heightAt(x, z + e) - heightAt(x, z - e)
  return Math.hypot(dx, dz) / (2 * e)
}

// ------------------------------------------------------------------ terrain mesh

const C = {
  seabed: new THREE.Color('#CDBB8A'),
  paper: new THREE.Color('#E7DCBC'),
  paper2: new THREE.Color('#DCCFAB'),
  dune: new THREE.Color('#DCC38C'),
  dune2: new THREE.Color('#C9A56B'),
  dry: new THREE.Color('#A99A62'),
  sierra: new THREE.Color('#8E9A58'),
  sierra2: new THREE.Color('#7C8A4C'),
  rock: new THREE.Color('#8A7461'),
  puna: new THREE.Color('#B9AA78'),
  snow: new THREE.Color('#F4F2EC'),
  selva: new THREE.Color('#2F6C35'),
  selva2: new THREE.Color('#3E7F3B'),
  ceja: new THREE.Color('#2A5A30'),
  reeds: new THREE.Color('#9AA35A'),
  soil: new THREE.Color('#9A6240'),
}

const deptTint = (i: number) => new THREE.Color().setHSL(((i * 0.61803) % 1 + 1) % 1, 0.45, 0.6)

export function buildTerrain() {
  const segX = 240
  const segZ = 320
  const geo = new THREE.PlaneGeometry(MAP_W, MAP_D, segX, segZ)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const n = pos.count
  const colors = new Float32Array(n * 3)
  const aDept = new Float32Array(n)
  const aBorder = new Float32Array(n)
  const aInside = new Float32Array(n)
  const c = new THREE.Color()

  for (let i = 0; i < n; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)))
  geo.computeVertexNormals()
  const nrm = geo.attributes.normal as THREE.BufferAttribute

  for (let i = 0; i < n; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const h = pos.getY(i)
    const slope = 1 - nrm.getY(i)
    const v = fbm2(x * 0.12, z * 0.12, 3) + 0.5
    const zone = zoneAt(x, z)
    switch (zone) {
      case 'ocean':
        c.copy(C.seabed)
        break
      case 'neighbor':
        c.copy(C.paper).lerp(C.paper2, v)
        break
      case 'coast':
        c.copy(C.dune).lerp(C.dune2, v)
        break
      case 'selva':
        c.copy(C.selva).lerp(C.selva2, v).lerp(C.ceja, smoothstep(3.2, 6, h))
        break
      case 'lake':
        c.copy(C.reeds)
        break
      default: {
        // Andes: dry slopes → green valleys → puna → snow
        c.copy(C.dry).lerp(C.sierra, v).lerp(C.sierra2, smoothstep(5, 8, h) * 0.6)
        c.lerp(C.puna, smoothstep(8.5, 11.5, h))
        c.lerp(C.rock, smoothstep(0.35, 0.65, slope) * 0.8)
        c.lerp(C.snow, smoothstep(16, 17.5, h))
      }
    }
    const inside = zone !== 'ocean' && zone !== 'neighbor' ? 1 : 0
    if (inside) {
      const r = distToRiver(x, z)
      c.lerp(C.selva2, smoothstep(2.4, 0.6, r) * 0.35)
      const dpt = deptAt(x, z)
      aDept[i] = dpt.index
      aBorder[i] = dpt.border
      c.lerp(deptTint(dpt.index), 0.1)
    } else {
      aDept[i] = -10
      aBorder[i] = 9
    }
    // steep cliffs at the diorama edge read as earth
    if (zone !== 'ocean') c.lerp(C.soil, smoothstep(0.8, 0.98, slope) * 0.7)
    aInside[i] = inside
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.setAttribute('aDept', new THREE.BufferAttribute(aDept, 1))
  geo.setAttribute('aBorder', new THREE.BufferAttribute(aBorder, 1))
  geo.setAttribute('aInside', new THREE.BufferAttribute(aInside, 1))

  const uniforms = { uHi: { value: -100 }, uHiAmt: { value: 0 } }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 })
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uHi = uniforms.uHi
    shader.uniforms.uHiAmt = uniforms.uHiAmt
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aDept;
        attribute float aBorder;
        attribute float aInside;
        uniform float uHi;
        varying float vH;
        varying float vBorder;
        varying float vInside;
        varying float vHi;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vH = position.y;
        vBorder = aBorder;
        vInside = aInside;
        vHi = (1. - step(.5, abs(aDept - uHi))) * aInside;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uHiAmt;
        varying float vH;
        varying float vBorder;
        varying float vInside;
        varying float vHi;
        ${NOISE}`,
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        // faint contour lines (echo of the loader pattern)
        float cv = vH * .9;
        float cl = 1. - smoothstep(0., fwidth(cv) * 1.2, abs(fract(cv - .5) - .5));
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * .8, cl * .22 * step(.2, vH));
        // department borders
        // vBorder is V-shaped (|f2 - f1|): vertices either side of a border sit
        // around .3–.4 on this 0.4-unit mesh, so the band must cover that range
        float border = 1. - smoothstep(.34, .52, vBorder);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.24, .15, .09), border * vInside * .8);
        // hovered / selected department glows warm
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.18 + vec3(.1, .07, .01), vHi * uHiAmt);
        `,
      )
  }
  const mesh = new THREE.Mesh(geo, mat)
  mesh.receiveShadow = true
  mesh.castShadow = true
  return { mesh, uniforms }
}

/** Layered soil skirt around the board; the sea shows as a water band. */
export function buildSkirt() {
  const bands = [
    { level: (h: number) => h - 0.7, color: '#4A3122' },
    { level: () => -2.2, color: '#9B5A36' },
    { level: () => -3.5, color: '#C48D52' },
    { level: () => -4.7, color: '#7A4A2E' },
    { level: () => BASE_Y, color: '#4B2F1F' },
  ]
  const water = new THREE.Color('#3C7FA8')
  const pos: number[] = []
  const col: number[] = []
  const nrm: number[] = []
  const steps = 200
  const W = MAP_W / 2
  const D = MAP_D / 2
  const edges: [THREE.Vector2, THREE.Vector2, THREE.Vector3][] = [
    [new THREE.Vector2(-W, D), new THREE.Vector2(W, D), new THREE.Vector3(0, 0, 1)],
    [new THREE.Vector2(W, D), new THREE.Vector2(W, -D), new THREE.Vector3(1, 0, 0)],
    [new THREE.Vector2(W, -D), new THREE.Vector2(-W, -D), new THREE.Vector3(0, 0, -1)],
    [new THREE.Vector2(-W, -D), new THREE.Vector2(-W, D), new THREE.Vector3(-1, 0, 0)],
  ]
  const c = new THREE.Color()
  const quad = (p0: THREE.Vector2, p1: THREE.Vector2, t0: number, t1: number, b0: number, b1: number, n: THREE.Vector3, color: THREE.Color) => {
    pos.push(p0.x, t0, p0.y, p0.x, b0, p0.y, p1.x, t1, p1.y, p1.x, t1, p1.y, p0.x, b0, p0.y, p1.x, b1, p1.y)
    for (let k = 0; k < 6; k++) {
      col.push(color.r, color.g, color.b)
      nrm.push(n.x, n.y, n.z)
    }
  }
  for (const [a, b, n] of edges) {
    for (let s = 0; s < steps; s++) {
      const p0 = a.clone().lerp(b, s / steps)
      const p1 = a.clone().lerp(b, (s + 1) / steps)
      const h0 = heightAt(p0.x, p0.y)
      const h1 = heightAt(p1.x, p1.y)
      let top0 = Math.max(h0, WATER_Y)
      let top1 = Math.max(h1, WATER_Y)
      // sea: a glassy water band down to the sea floor
      if (h0 < WATER_Y || h1 < WATER_Y) {
        quad(p0, p1, top0, top1, Math.min(h0, top0), Math.min(h1, top1), n, water)
        top0 = Math.min(h0, top0)
        top1 = Math.min(h1, top1)
      }
      for (let bi = 0; bi < bands.length; bi++) {
        const band = bands[bi]
        const last = bi === bands.length - 1
        const w0 = last ? 0 : Math.sin(p0.x * 0.21 + p0.y * 0.17 + bi * 1.7) * 0.22
        const w1 = last ? 0 : Math.sin(p1.x * 0.21 + p1.y * 0.17 + bi * 1.7) * 0.22
        const bot0 = Math.max(BASE_Y, Math.min(top0, band.level(h0) + w0))
        const bot1 = Math.max(BASE_Y, Math.min(top1, band.level(h1) + w1))
        c.set(band.color)
        quad(p0, p1, top0, top1, bot0, bot1, n, c)
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
        float line = 1. - smoothstep(0., fwidth(h) * 1.3, abs(fract(h - .5) - .5));
        float fade = smoothstep(300., 80., length(p));
        vec3 col = mix(uPaper, uInk, line * .16 * fade);
        float d = sdBox(p - vec2(3., 4.), uSize * .5);
        col = mix(col, uShadow, smoothstep(16., -2., d) * .32);
        gl_FragColor = vec4(col, 1.);
        #include <colorspace_fragment>
      }`,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = BASE_Y - 0.02
  return mesh
}

// ------------------------------------------------------------------ water

/** Heights as a texture so the sea shader knows the depth (shallows + shore foam). */
function heightTexture() {
  const step = 0.4
  const nx = Math.ceil(MAP_W / step) + 1
  const nz = Math.ceil(MAP_D / step) + 1
  const data = new Uint16Array(nx * nz)
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      // row 0 ↔ uv.y = 0 ↔ the south edge (z = +MAP_D/2) once the plane lies flat
      const x = -MAP_W / 2 + i * step
      const z = MAP_D / 2 - j * step
      data[j * nx + i] = THREE.DataUtils.toHalfFloat(heightAt(x, z))
    }
  const tex = new THREE.DataTexture(data, nx, nz, THREE.RedFormat, THREE.HalfFloatType)
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  tex.needsUpdate = true
  return tex
}

const WATER_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`

export function buildWater() {
  const group = new THREE.Group()
  const time = { value: 0 }

  // ---- Pacific
  const sea = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: time,
      uHeights: { value: heightTexture() },
      uLevel: { value: WATER_Y },
      uDeep: { value: new THREE.Color('#2C5E98') },
      uMid: { value: new THREE.Color('#3E86B8') },
      uShallow: { value: new THREE.Color('#79C3C6') },
      uFoam: { value: new THREE.Color('#F6F3E8') },
    },
    vertexShader: WATER_VERT,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      uniform float uTime;
      uniform float uLevel;
      uniform sampler2D uHeights;
      uniform vec3 uDeep;
      uniform vec3 uMid;
      uniform vec3 uShallow;
      uniform vec3 uFoam;
      ${NOISE}
      void main() {
        float ground = texture2D(uHeights, vUv).r;
        float depth = uLevel - ground;
        if (depth < -.02) discard;
        vec2 p = vWorld.xz;
        float n = fbm(p * .08 + vec2(uTime * .03, uTime * .02));
        vec3 col = mix(uShallow, uMid, smoothstep(.2, 1.3, depth + n * .3));
        col = mix(col, uDeep, smoothstep(1.3, 2.8, depth + n * .4));
        // painterly white flecks drifting on the open sea
        float fleck = smoothstep(.74, .8, fbm(p * .55 + vec2(uTime * .05, -uTime * .03)));
        col = mix(col, uFoam, fleck * .55 * smoothstep(.6, 1.6, depth));
        // shore foam that breathes in and out
        float shore = smoothstep(.55, .05, depth + sin(uTime * 1.3 + p.x * .6 + p.y * .4) * .08 + n * .12);
        col = mix(col, uFoam, shore * .85);
        gl_FragColor = vec4(col, .95);
        #include <colorspace_fragment>
      }`,
  })
  const seaMesh = new THREE.Mesh(new THREE.PlaneGeometry(MAP_W, MAP_D), sea)
  seaMesh.rotation.x = -Math.PI / 2
  seaMesh.position.y = WATER_Y
  seaMesh.receiveShadow = true
  group.add(seaMesh)

  // ---- Lake Titicaca
  const lakeMat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uTime: time, uDeep: { value: new THREE.Color('#2F6FA6') }, uShallow: { value: new THREE.Color('#6DB7C8') } },
    vertexShader: WATER_VERT,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      ${NOISE}
      void main() {
        float r = length(vUv - .5) * 2.;
        float n = fbm(vWorld.xz * .3 + uTime * .05);
        vec3 col = mix(uDeep, uShallow, smoothstep(.45, 1., r + n * .2));
        col += smoothstep(.75, .82, fbm(vWorld.xz * 1.1 + uTime * .08)) * .15;
        gl_FragColor = vec4(col, smoothstep(1., .94, r));
        #include <colorspace_fragment>
      }`,
  })
  const lake = new THREE.Mesh(new THREE.CircleGeometry(1, 64), lakeMat)
  lake.rotation.x = -Math.PI / 2
  lake.rotation.z = -TITICACA.angle
  lake.scale.set(TITICACA.rx + 0.4, TITICACA.rz + 0.4, 1)
  lake.position.set(TITICACA.x, LAKE_Y, TITICACA.z)
  group.add(lake)

  // ---- Rivers (ribbons following the downhill water level)
  const riverMat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: { uTime: time, uDeep: { value: new THREE.Color('#3A7FA4') }, uShallow: { value: new THREE.Color('#86BFC1') } },
    vertexShader: WATER_VERT,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      ${NOISE}
      void main() {
        float across = abs(vUv.y - .5) * 2.;
        vec3 col = mix(uDeep, uShallow, smoothstep(.1, .95, across));
        col += smoothstep(.62, .7, fbm(vec2(vUv.x * .4 - uTime * .8, vUv.y * 6.))) * .14;
        gl_FragColor = vec4(col, smoothstep(1., .82, across) * .95);
        #include <colorspace_fragment>
      }`,
  })
  const samples = getRiverSamples()
  for (let ri = 0; ri < RIVERS.length; ri++) {
    const seg = samples.filter((s) => s.ri === ri)
    if (seg.length < 2) continue
    const pos: number[] = []
    const uv: number[] = []
    const idx: number[] = []
    let acc = 0
    for (let k = 0; k < seg.length; k++) {
      const a = seg[Math.max(0, k - 1)]
      const b = seg[Math.min(seg.length - 1, k + 1)]
      const tx = b.x - a.x
      const tz = b.z - a.z
      const l = Math.hypot(tx, tz) || 1
      const nx = -tz / l
      const nz = tx / l
      const s = seg[k]
      if (k > 0) acc += Math.hypot(s.x - seg[k - 1].x, s.z - seg[k - 1].z)
      const w = s.w * 0.5 + 0.2
      const y = s.y + 0.06
      pos.push(s.x + nx * w, y, s.z + nz * w, s.x - nx * w, y, s.z - nz * w)
      uv.push(acc, 0, acc, 1)
      if (k < seg.length - 1) {
        const i0 = k * 2
        idx.push(i0, i0 + 1, i0 + 2, i0 + 2, i0 + 1, i0 + 3)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    geo.setIndex(idx)
    const mesh = new THREE.Mesh(geo, riverMat)
    mesh.renderOrder = 1
    group.add(mesh)
  }

  return { group, time }
}

/** Seeded RNG re-export for props. */
export { mulberry32, DEPT_SEEDS }
