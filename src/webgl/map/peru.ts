import * as THREE from 'three'
import { project } from '../../data/geo'
import { STOPS } from '../../data/stops'
import { fbm2 } from '../utils/noise'

/*
  Stylised geography of Peru (lon/lat, hand-simplified — this is an
  illustrated diorama, not a survey map).
*/

type LL = [number, number]
const toXZ = (pts: LL[]) => pts.map(([lon, lat]) => new THREE.Vector2(...project(lon, lat)))

/** Peru outline, clockwise from the Tumbes coast. */
const PERU_LL: LL[] = [
  [-80.34, -3.39], [-80.65, -3.55], [-80.95, -3.85], [-81.15, -4.25], [-81.33, -4.68],
  [-81.2, -5.05], [-81.12, -5.4], [-80.95, -5.85], [-81.18, -6.05], [-80.6, -6.4],
  [-79.98, -6.8], [-79.6, -7.35], [-79.2, -7.95], [-78.95, -8.4], [-78.6, -9.05],
  [-78.35, -9.6], [-78.15, -10.1], [-77.75, -10.75], [-77.6, -11.15], [-77.15, -11.9],
  [-77.16, -12.1], [-76.85, -12.45], [-76.55, -12.95], [-76.25, -13.4], [-76.3, -13.85],
  [-76.05, -14.25], [-75.65, -14.75], [-75.2, -15.35], [-74.5, -15.75], [-73.65, -16.25],
  [-72.75, -16.65], [-72.0, -17.05], [-71.35, -17.65], [-70.9, -17.95], [-70.38, -18.35],
  // Chile / Bolivia
  [-70.05, -18.2], [-69.85, -17.85], [-69.5, -17.5], [-69.04, -16.57], [-68.95, -16.2],
  [-69.35, -15.75], [-69.25, -15.3], [-68.85, -14.85], [-69.0, -14.2], [-68.85, -13.65],
  [-68.95, -12.9], [-68.68, -12.5], [-69.57, -10.95],
  // Brazil
  [-70.62, -11.0], [-70.6, -9.45], [-71.4, -9.95], [-72.15, -10.0], [-72.3, -9.5],
  [-73.2, -9.4], [-72.95, -8.95], [-73.55, -8.35], [-74.0, -7.5], [-73.7, -7.3],
  [-73.75, -6.6], [-73.1, -5.6], [-72.95, -5.15], [-71.9, -4.5], [-70.95, -4.38],
  [-70.0, -4.35], [-69.95, -4.2],
  // Colombia
  [-70.05, -2.65], [-70.8, -2.3], [-71.9, -2.35], [-72.95, -2.45], [-73.6, -1.7],
  [-74.4, -1.0], [-74.95, -0.6], [-75.25, -0.05],
  // Ecuador
  [-75.55, -0.95], [-75.25, -1.55], [-76.6, -2.6], [-77.8, -2.95], [-78.35, -3.5],
  [-78.6, -4.5], [-79.05, -4.95], [-79.45, -4.55], [-79.8, -4.4], [-80.15, -4.25],
  [-80.45, -3.95], [-80.25, -3.6],
]

/** Pacific Ocean: everything west of the Ecuador–Peru–Chile coastline. */
const OCEAN_LL: LL[] = [
  // far north: Colombia's Pacific coast
  [-120, 20], [-79.5, 20], [-78.2, 9.0], [-77.4, 7.2], [-77.5, 5.5], [-77.3, 4.0], [-78.0, 2.6], [-79.0, 1.4], [-79.7, 1.0], [-80.1, 0.4], [-80.45, -0.3],
  [-80.7, -0.9], [-80.9, -1.5], [-80.95, -2.2], [-80.3, -2.55], [-79.9, -2.75], [-80.2, -3.2],
  ...PERU_LL.slice(0, 35),
  // Chile's coast running south
  [-70.3, -19.0], [-70.2, -21.5], [-70.45, -24.0], [-70.65, -27.0], [-71.35, -30.0], [-71.6, -33.0], [-73.0, -37.0], [-73.6, -42.0],
  [-120, -42.0],
]

/** Andes spine (Cordillera), north-west → south-east. */
const SPINE_LL: LL[] = [
  // Andes of Colombia / Ecuador
  [-76.5, 6.0], [-77.3, 3.0], [-78.2, 0.5], [-78.9, -1.8], [-79.5, -3.4],
  [-79.6, -4.6], [-79.3, -5.6], [-78.8, -6.8], [-78.2, -7.9], [-77.5, -9.2], [-76.8, -10.4],
  [-76.1, -11.5], [-75.2, -12.6], [-74.2, -13.6], [-73.0, -14.4], [-71.8, -15.2], [-70.6, -16.1],
  [-69.6, -17.2], [-69.3, -18.4],
  // Bolivian / Chilean Andes
  [-68.8, -20.5], [-68.4, -23.0], [-68.9, -26.5], [-69.8, -30.0], [-70.3, -34.0],
]

export const RIVERS_LL: { name: string; pts: LL[]; width: number }[] = [
  {
    name: 'Amazonas',
    width: 1.5,
    pts: [[-73.45, -4.5], [-73.1, -3.9], [-72.3, -3.6], [-71.3, -3.7], [-70.5, -3.85], [-69.95, -4.25], [-69.0, -4.3], [-67.0, -3.4]],
  },
  {
    name: 'Marañón',
    width: 1.0,
    pts: [[-77.8, -7.6], [-78.3, -6.3], [-78.15, -5.2], [-77.5, -4.7], [-76.5, -4.75], [-75.4, -4.6], [-74.3, -4.6], [-73.45, -4.5]],
  },
  {
    name: 'Ucayali',
    width: 1.05,
    pts: [[-73.75, -10.7], [-74.2, -9.4], [-74.5, -8.4], [-74.6, -7.2], [-74.2, -6.4], [-73.9, -5.4], [-73.45, -4.5]],
  },
  {
    name: 'Urubamba',
    width: 0.7,
    pts: [[-71.9, -13.5], [-72.6, -13.1], [-73.0, -12.3], [-73.4, -11.4], [-73.75, -10.7]],
  },
  {
    name: 'Madre de Dios',
    width: 0.85,
    pts: [[-71.6, -12.75], [-70.4, -12.6], [-69.2, -12.55], [-68.7, -12.5], [-67.5, -12.0]],
  },
]

export const PERU = toXZ(PERU_LL)
export const OCEAN = toXZ(OCEAN_LL)
export const SPINE = toXZ(SPINE_LL)
export const RIVERS = RIVERS_LL.map((r) => ({ ...r, xz: toXZ(r.pts) }))

const [tx, tz] = project(-69.85, -15.6)
/** Lake Titicaca, Peruvian side (rotated ellipse, world units). */
export const TITICACA = { x: tx, z: tz, rx: 3.1, rz: 2.3, angle: -0.75 }

export function inTiticaca(x: number, z: number, grow = 0) {
  const c = Math.cos(TITICACA.angle)
  const s = Math.sin(TITICACA.angle)
  const dx = x - TITICACA.x
  const dz = z - TITICACA.z
  const u = (dx * c - dz * s) / (TITICACA.rx + grow)
  const v = (dx * s + dz * c) / (TITICACA.rz + grow)
  return u * u + v * v
}

// ------------------------------------------------------------------ geometry helpers

export function pointInPolygon(x: number, z: number, poly: THREE.Vector2[]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > z !== b.y > z && x < ((b.x - a.x) * (z - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

export function distToPolyline(x: number, z: number, pts: THREE.Vector2[], closed = false) {
  let best = Infinity
  const n = closed ? pts.length : pts.length - 1
  for (let i = 0; i < n; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const abx = b.x - a.x
    const abz = b.y - a.y
    const t = Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.y) * abz) / (abx * abx + abz * abz)))
    const dx = a.x + abx * t - x
    const dz = a.y + abz * t - z
    const d = dx * dx + dz * dz
    if (d < best) best = d
  }
  return Math.sqrt(best)
}

/** Signed distance to Peru: negative inside. */
export function peruSDF(x: number, z: number) {
  const d = distToPolyline(x, z, PERU, true)
  return pointInPolygon(x, z, PERU) ? -d : d
}

/** Signed distance to the ocean: negative inside the sea. */
export function oceanSDF(x: number, z: number) {
  const d = distToPolyline(x, z, OCEAN, true)
  return pointInPolygon(x, z, OCEAN) ? -d : d
}

/** Distance to the Andes spine and which side of it we are on (-1 = west/coast, +1 = east/selva). */
export function spineInfo(x: number, z: number) {
  let best = Infinity
  let side = 1
  for (let i = 0; i < SPINE.length - 1; i++) {
    const a = SPINE[i]
    const b = SPINE[i + 1]
    const abx = b.x - a.x
    const abz = b.y - a.y
    const t = Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.y) * abz) / (abx * abx + abz * abz)))
    const dx = x - (a.x + abx * t)
    const dz = z - (a.y + abz * t)
    const d = Math.hypot(dx, dz)
    if (d < best) {
      best = d
      // spine runs NW→SE (towards +x,+z); cross > 0 → east side
      side = abx * dz - abz * dx > 0 ? -1 : 1
    }
  }
  return { d: best, side }
}

// ------------------------------------------------------------------ departments

/** Weighted-Voronoi seeds: weight ≈ how much territory a seed claims. */
const WEIGHTS: Record<string, number> = {
  loreto: 2.4,
  ucayali: 1.45,
  madrededios: 1.35,
  puno: 1.15,
  cusco: 1.2,
  arequipa: 1.2,
  junin: 1.05,
  amazonas: 0.85,
  sanmartin: 0.95,
  cajamarca: 0.95,
  piura: 0.95,
  lalibertad: 0.9,
  ancash: 0.85,
  lima: 0.9,
  ica: 0.85,
  ayacucho: 1.0,
  huanuco: 0.85,
  pasco: 0.7,
  huancavelica: 0.75,
  apurimac: 0.75,
  moquegua: 0.65,
  tacna: 0.7,
  lambayeque: 0.6,
  tumbes: 0.45,
  callao: 0.18,
}

export const DEPT_SEEDS = STOPS.map((s, i) => ({ id: s.id, i, x: s.x, z: s.z, w: WEIGHTS[s.id] ?? 1 }))

/** Organic wobble applied to department borders. */
export function deptJitter(x: number, z: number): [number, number] {
  return [fbm2(x * 0.18 + 11, z * 0.18, 3) * 2.6, fbm2(x * 0.18, z * 0.18 - 7, 3) * 2.6]
}

/** Index of the department at a point, plus a border factor (0 on a border). */
export function deptAt(x: number, z: number, jitter: (x: number, z: number) => [number, number] = deptJitter) {
  const [jx, jz] = jitter(x, z)
  const px = x + jx
  const pz = z + jz
  let b1 = Infinity
  let b2 = Infinity
  let i1 = 0
  for (const s of DEPT_SEEDS) {
    const f = Math.hypot(px - s.x, pz - s.z) / s.w
    if (f < b1) {
      b2 = b1
      b1 = f
      i1 = s.i
    } else if (f < b2) b2 = f
  }
  return { index: i1, border: b2 - b1 }
}
