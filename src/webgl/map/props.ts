import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { STOPS } from '../../data/stops'
import { mulberry32 } from '../utils/noise'
import { MAP_D, MAP_W, distToRiver, heightAt, slopeAt, zoneAt } from './terrain'

type Uniforms = { uTime: { value: number } }

/** Adds a gentle wind sway to any instanced material (top of mesh moves most). */
function windify(mat: THREE.Material, uniforms: Uniforms, strength = 0.12) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #else
          vec3 ip = vec3(0.);
        #endif
        float sway = sin(uTime * 1.6 + ip.x * .35 + ip.z * .22) * .6 + sin(uTime * 2.7 + ip.x) * .25;
        transformed.x += sway * ${strength.toFixed(3)} * max(position.y, 0.);
        transformed.z += sway * ${(strength * 0.5).toFixed(3)} * max(position.y, 0.);
        `,
      )
  }
}

function colorize(geo: THREE.BufferGeometry, color: string) {
  const c = new THREE.Color(color)
  const n = geo.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r
    arr[i * 3 + 1] = c.g
    arr[i * 3 + 2] = c.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return geo
}

function nonIndexed(g: THREE.BufferGeometry) {
  const r = g.index ? g.toNonIndexed() : g
  r.deleteAttribute('uv')
  return r
}

type Avoid = { route: THREE.Vector2[] }

function clearOf(x: number, z: number, avoid: Avoid, routeGap: number, stopGap: number) {
  if (distToRiver(x, z) < 4.2) return false
  for (const s of STOPS) if (Math.hypot(s.x - x, s.z - z) < (s.id === 'pueblo' ? stopGap + 4 : stopGap)) return false
  for (let i = 0; i < avoid.route.length; i += 2) {
    const p = avoid.route[i]
    if (Math.abs(p.x - x) < routeGap && Math.abs(p.y - z) < routeGap && Math.hypot(p.x - x, p.y - z) < routeGap) return false
  }
  return true
}

// ------------------------------------------------------------------ vegetation

export function buildVegetation(avoid: Avoid, uniforms: Uniforms) {
  const group = new THREE.Group()
  const rnd = mulberry32(2100)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const s = new THREE.Vector3()
  const p = new THREE.Vector3()
  const c = new THREE.Color()

  // --- broadleaf / cloud-forest trees (two-blob canopy)
  const trunk = colorize(nonIndexed(new THREE.CylinderGeometry(0.12, 0.2, 1.4, 5).translate(0, 0.7, 0)), '#5B3B26')
  const can1 = colorize(nonIndexed(new THREE.IcosahedronGeometry(0.95, 0).translate(0, 1.9, 0)), '#ffffff')
  const can2 = colorize(nonIndexed(new THREE.IcosahedronGeometry(0.7, 0).translate(0.45, 2.55, 0.1)), '#ffffff')
  const treeGeo = mergeGeometries([trunk, can1, can2])!
  const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true })
  windify(treeMat, uniforms, 0.05)
  const TREE_MAX = 1700
  const trees = new THREE.InstancedMesh(treeGeo, treeMat, TREE_MAX)
  trees.castShadow = true
  trees.receiveShadow = true
  const greens = ['#2F5A33', '#3B6B37', '#24492C', '#4A7A3C', '#1F3F28']

  // --- shade trees in the coffee belt (taller, flatter canopies: guamo)
  const shadeTrunk = colorize(nonIndexed(new THREE.CylinderGeometry(0.1, 0.16, 2.4, 5).translate(0, 1.2, 0)), '#6A4630')
  const shadeCan = colorize(nonIndexed(new THREE.IcosahedronGeometry(1.2, 0).scale(1.4, 0.55, 1.4).translate(0, 2.7, 0)), '#ffffff')
  const shadeGeo = mergeGeometries([shadeTrunk, shadeCan])!
  const shadeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true })
  windify(shadeMat, uniforms, 0.04)
  const SHADE_MAX = 260
  const shade = new THREE.InstancedMesh(shadeGeo, shadeMat, SHADE_MAX)
  shade.castShadow = true

  // --- coffee shrubs + red cherries
  const shrubGeo = new THREE.IcosahedronGeometry(0.42, 0).scale(1, 1.25, 1).translate(0, 0.4, 0)
  const shrubMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, flatShading: true })
  windify(shrubMat, uniforms, 0.06)
  const SHRUB_MAX = 3600
  const shrubs = new THREE.InstancedMesh(shrubGeo, shrubMat, SHRUB_MAX)
  shrubs.castShadow = true
  const cherryGeo = new THREE.IcosahedronGeometry(0.075, 0)
  const cherryMat = new THREE.MeshStandardMaterial({ color: '#C8302A', roughness: 0.4, emissive: '#4a0d08' })
  const CHERRY_MAX = SHRUB_MAX * 3
  const cherries = new THREE.InstancedMesh(cherryGeo, cherryMat, CHERRY_MAX)

  // --- rocks
  const rockGeo = new THREE.DodecahedronGeometry(0.6, 0)
  const rockMat = new THREE.MeshStandardMaterial({ color: '#9B8D79', roughness: 1, flatShading: true })
  const ROCK_MAX = 160
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, ROCK_MAX)
  rocks.castShadow = true
  rocks.receiveShadow = true

  let nt = 0
  let ns = 0
  let nsh = 0
  let nc = 0
  let nr = 0

  // trees: rejection sampling across the map
  for (let k = 0; k < 9000 && nt < TREE_MAX; k++) {
    const x = (rnd() - 0.5) * (MAP_W - 3)
    const z = (rnd() - 0.5) * (MAP_D - 3)
    const h = heightAt(x, z)
    const zone = zoneAt(h)
    const density = zone === 'forest' ? 0.7 : zone === 'paramo' ? 0.08 : zone === 'valley' ? 0.025 : 0.012
    if (rnd() > density) continue
    if (slopeAt(x, z) > 1.35) continue
    if (!clearOf(x, z, avoid, 3.4, 4)) continue
    const sc = (zone === 'paramo' ? 0.6 : 0.8) + rnd() * 0.65
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * Math.PI * 2)
    m.compose(p.set(x, h - 0.1, z), q, s.set(sc, sc * (0.85 + rnd() * 0.4), sc))
    trees.setMatrixAt(nt, m)
    c.set(greens[Math.floor(rnd() * greens.length)]).offsetHSL(0, 0, (rnd() - 0.5) * 0.04)
    if (zone === 'paramo') c.set('#5E6A3E')
    trees.setColorAt(nt, c)
    nt++
  }

  // coffee terraces: shrubs aligned to contour rows
  for (let k = 0; k < 40000 && ns < SHRUB_MAX; k++) {
    const x = (rnd() - 0.5) * (MAP_W - 4)
    const z = (rnd() - 0.5) * (MAP_D - 4)
    const h = heightAt(x, z)
    if (zoneAt(h) !== 'coffee') continue
    const row = Math.abs(((h * 3.2) % 1) - 0.5)
    if (row > 0.12) continue
    if (slopeAt(x, z) > 0.95) continue
    if (!clearOf(x, z, avoid, 1.7, 3.2)) continue
    const sc = 0.75 + rnd() * 0.5
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * Math.PI * 2)
    m.compose(p.set(x, h - 0.05, z), q, s.set(sc, sc, sc))
    shrubs.setMatrixAt(ns, m)
    c.set(rnd() > 0.5 ? '#2C5B2C' : '#36693A').offsetHSL(0, 0, (rnd() - 0.5) * 0.05)
    shrubs.setColorAt(ns, c)
    ns++
    const nCh = 1 + Math.floor(rnd() * 3)
    for (let j = 0; j < nCh && nc < CHERRY_MAX; j++) {
      const a = rnd() * Math.PI * 2
      const r = 0.36 * sc
      m.compose(
        p.set(x + Math.cos(a) * r, h + (0.3 + rnd() * 0.45) * sc, z + Math.sin(a) * r),
        q.identity(),
        s.setScalar(0.8 + rnd() * 0.6),
      )
      cherries.setMatrixAt(nc++, m)
    }
    // occasional shade tree among the coffee
    if (rnd() < 0.022 && nsh < SHADE_MAX) {
      const ss = 0.8 + rnd() * 0.4
      m.compose(p.set(x + 0.8, h - 0.1, z + 0.6), q, s.set(ss, ss, ss))
      shade.setMatrixAt(nsh, m)
      c.set(rnd() > 0.5 ? '#3F6E38' : '#4A773F')
      shade.setColorAt(nsh, c)
      nsh++
    }
  }

  for (let k = 0; k < 4000 && nr < ROCK_MAX; k++) {
    const x = (rnd() - 0.5) * (MAP_W - 3)
    const z = (rnd() - 0.5) * (MAP_D - 3)
    const h = heightAt(x, z)
    const zone = zoneAt(h)
    const sl = slopeAt(x, z)
    const chance = zone === 'paramo' ? 0.5 : sl > 0.9 ? 0.35 : distToRiver(x, z) < 6 ? 0.25 : 0.02
    if (rnd() > chance) continue
    if (!clearOf(x, z, avoid, 1.6, 3)) continue
    const sc = 0.4 + rnd() * 1.1
    q.setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3))
    m.compose(p.set(x, h - sc * 0.15, z), q, s.set(sc * 1.3, sc * 0.75, sc))
    rocks.setMatrixAt(nr++, m)
  }

  trees.count = nt
  shrubs.count = ns
  cherries.count = nc
  shade.count = nsh
  rocks.count = nr
  for (const im of [trees, shrubs, cherries, shade, rocks]) {
    im.instanceMatrix.needsUpdate = true
    if (im.instanceColor) im.instanceColor.needsUpdate = true
    im.computeBoundingSphere()
    group.add(im)
  }
  return group
}

// ------------------------------------------------------------------ buildings

const WALL = '#F3EADB'
const ROOF = '#B24A2C'
const WOOD = '#6B4630'

function std(color: string, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...extra })
}

function shadowed<T extends THREE.Object3D>(o: T) {
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true
      c.receiveShadow = true
    }
  })
  return o
}

function house(w: number, d: number, h: number, wall = WALL, roof = ROOF, trim = '#3E6A8A') {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std(wall))
  body.position.y = h / 2
  // gable roof
  const shape = new THREE.Shape()
  shape.moveTo(-w / 2 - 0.25, 0)
  shape.lineTo(0, h * 0.75)
  shape.lineTo(w / 2 + 0.25, 0)
  shape.lineTo(-w / 2 - 0.25, 0)
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: d + 0.4, bevelEnabled: false })
  roofGeo.translate(0, 0, -(d + 0.4) / 2)
  const roofMesh = new THREE.Mesh(roofGeo, std(roof))
  roofMesh.position.y = h
  // balcony / plinth band (colour trim, typical of coffee-region houses)
  const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.22, d + 0.04), std(trim))
  band.position.y = 0.11
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.6, 0.04), std(trim))
  door.position.set(0, 0.3, d / 2 + 0.02)
  const win1 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.04), std(trim))
  win1.position.set(-w * 0.3, h * 0.6, d / 2 + 0.02)
  const win2 = win1.clone()
  win2.position.x = w * 0.3
  g.add(body, roofMesh, band, door, win1, win2)
  return shadowed(g)
}

function place(o: THREE.Object3D, x: number, z: number, rotY = 0) {
  o.position.set(x, heightAt(x, z) - 0.05, z)
  o.rotation.y = rotY
  return o
}

export function buildBuildings(uniforms: Uniforms) {
  const group = new THREE.Group()
  const smokeEmitters: THREE.Vector3[] = []
  const rnd = mulberry32(77)
  const get = (id: string) => STOPS.find((s) => s.id === id)!

  // 1 · finca
  {
    const s = get('finca')
    group.add(place(house(2.4, 1.6, 1.1), s.x + 1.2, s.z - 1.4, 0.4))
    group.add(place(house(1.2, 1, 0.8, '#E9DCC4', '#8E3B22', '#2F6B4F'), s.x - 1.8, s.z - 0.6, -0.3))
    // picking baskets
    for (let i = 0; i < 3; i++) {
      const b = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.26, 8), std('#B8925A')))
      group.add(place(b, s.x - 0.4 + i * 0.4, s.z + 1.3))
      b.position.y += 0.13
    }
  }
  // 2 · beneficio: house + fermentation tanks + canal
  {
    const s = get('beneficio')
    group.add(place(house(2.2, 1.5, 1), s.x - 1.2, s.z - 1.1, -0.2))
    for (let i = 0; i < 3; i++) {
      const tank = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.7, 14), std('#D9D3C4')))
      group.add(place(tank, s.x + 0.6 + i * 0.95, s.z + 0.9))
      tank.position.y += 0.35
      const water = new THREE.Mesh(new THREE.CircleGeometry(0.36, 14), std('#7C5A3A'))
      water.rotation.x = -Math.PI / 2
      water.position.set(tank.position.x, tank.position.y + 0.33, tank.position.z)
      group.add(water)
    }
    const canal = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 0.3), std('#6FA0A0', { roughness: 0.3 }))
    group.add(place(canal, s.x + 1.4, s.z - 0.2))
  }
  // 3 · patios: drying beds + marquesina
  {
    const s = get('patios')
    const beans = std('#A8743E')
    for (let i = 0; i < 3; i++) {
      const bed = new THREE.Group()
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 1.1), std('#CFC2A5'))
      const grain = new THREE.Mesh(new THREE.BoxGeometry(2, 0.06, 0.9), beans)
      grain.position.y = 0.09
      bed.add(frame, grain)
      shadowed(bed)
      group.add(place(bed, s.x - 1.4 + (i % 2) * 2.5, s.z - 1 + Math.floor(i / 2) * 1.6, 0.15))
    }
    // marquesina: translucent half-cylinder greenhouse
    const dome = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.75, 2.4, 14, 1, true, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: '#F4F1E8', transparent: true, opacity: 0.55, roughness: 0.2, side: THREE.DoubleSide }),
    )
    dome.rotation.z = Math.PI / 2
    dome.rotation.y = Math.PI / 2
    const domeG = new THREE.Group()
    dome.position.y = 0.05
    domeG.add(dome)
    const domeBed = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 1.4), beans)
    domeG.add(domeBed)
    group.add(place(domeG, s.x + 1.6, s.z + 1.3, 0.15))
  }
  // 4 · trilladora: long shed + sacks
  {
    const s = get('trilladora')
    group.add(place(house(3.6, 1.8, 1.3, '#E6DCC8', '#6E5A48', '#8A3A28'), s.x, s.z - 1.2, 0.1))
    const sackMat = std('#C9B184')
    for (let i = 0; i < 8; i++) {
      const sack = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.6), sackMat))
      const row = Math.floor(i / 4)
      group.add(place(sack, s.x - 0.9 + (i % 4) * 0.48, s.z + 1.0))
      sack.position.y += 0.14 + row * 0.28
      sack.rotation.y = (rnd() - 0.5) * 0.2
    }
  }
  // 5 · tostaduría: brick building + chimney with smoke
  {
    const s = get('tostaduria')
    const b = house(2.6, 1.8, 1.3, '#B9673F', '#5A3424', '#F3EADB')
    group.add(place(b, s.x, s.z - 0.9, -0.15))
    const chim = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 1.5, 8), std('#7E3F25')))
    chim.position.set(0.7, 1.8, -0.3)
    b.add(chim)
    const top = new THREE.Vector3()
    b.updateMatrixWorld(true)
    chim.getWorldPosition(top)
    top.y += 0.8
    smokeEmitters.push(top)
  }
  // 6 · pueblo: plaza, church, colourful houses
  {
    const s = get('pueblo')
    const plaza = new THREE.Mesh(new THREE.BoxGeometry(5, 0.08, 4), std('#D8CBB0'))
    group.add(place(plaza, s.x, s.z))
    const fountain = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.3, 12), std('#E7E0D0')))
    group.add(place(fountain, s.x, s.z))
    fountain.position.y += 0.15
    // church
    const church = new THREE.Group()
    const nave = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 3), std('#F6F0E4'))
    nave.position.y = 0.8
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.2, 0.9), std('#F6F0E4'))
    tower.position.set(0, 1.6, 1.6)
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.1, 4), std('#B24A2C'))
    spire.position.set(0, 3.75, 1.6)
    spire.rotation.y = Math.PI / 4
    const roofN = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.8, 4), std('#B24A2C'))
    roofN.scale.set(1, 1, 2.3)
    roofN.rotation.y = Math.PI / 4
    roofN.position.y = 2
    church.add(nave, tower, spire, roofN)
    shadowed(church)
    group.add(place(church, s.x, s.z - 3.8, Math.PI))
    const palette = [
      ['#F3EADB', '#2F6B9A'],
      ['#F2D16B', '#A33A2A'],
      ['#E9A6A0', '#2E6A4F'],
      ['#BFD8C5', '#8A3A28'],
      ['#F3EADB', '#C8412B'],
      ['#A9C6E0', '#6B4630'],
    ]
    const spots: [number, number, number][] = [
      [-4.2, -1.5, Math.PI / 2],
      [-4.2, 1.2, Math.PI / 2],
      [4.2, -1.6, -Math.PI / 2],
      [4.2, 1.1, -Math.PI / 2],
      [-2, 3.4, Math.PI],
      [0.6, 3.5, Math.PI],
      [2.9, 3.3, Math.PI],
      [-6.3, 0, Math.PI / 2],
      [6.4, -0.6, -Math.PI / 2],
      [-2.6, -4.3, 0],
      [2.8, -4.2, 0],
    ]
    spots.forEach(([dx, dz, r], i) => {
      const [wall, trim] = palette[i % palette.length]
      group.add(place(house(1.5 + rnd() * 0.5, 1.2, 0.9 + rnd() * 0.5, wall, ROOF, trim), s.x + dx, s.z + dz, r))
    })
  }
  // detours
  {
    const m = get('mirador')
    const tower = new THREE.Group()
    for (const [dx, dz] of [
      [-0.4, -0.4],
      [0.4, -0.4],
      [-0.4, 0.4],
      [0.4, 0.4],
    ]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 0.1), std(WOOD))
      leg.position.set(dx, 1.1, dz)
      tower.add(leg)
    }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 1.2), std(WOOD))
    deck.position.y = 2.2
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.6, 4), std(ROOF))
    cap.position.y = 3.1
    cap.rotation.y = Math.PI / 4
    tower.add(deck, cap)
    group.add(place(shadowed(tower), m.x + 1.5, m.z + 0.5))

    const k = get('mercado')
    const awnings = ['#C8412B', '#E2A43A', '#2F6B9A', '#3E7A4A']
    awnings.forEach((col, i) => {
      const st = new THREE.Group()
      const table = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.6), std('#B8925A'))
      table.position.y = 0.2
      const roof = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.06, 0.8), std(col))
      roof.position.y = 0.95
      roof.rotation.x = 0.18
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.95, 0.05), std(WOOD))
      pole.position.set(0.45, 0.47, 0.3)
      st.add(table, roof, pole)
      group.add(place(shadowed(st), k.x - 1.6 + i * 1.1, k.z + (i % 2) * 0.4))
    })
  }

  // smoke puffs
  const smokeGeo = new THREE.IcosahedronGeometry(0.28, 1)
  const smokeMat = new THREE.MeshStandardMaterial({ color: '#EFE8DC', roughness: 1, transparent: true, opacity: 0.85, depthWrite: false })
  const puffs: { mesh: THREE.Mesh; t: number; origin: THREE.Vector3 }[] = []
  for (const e of smokeEmitters) {
    for (let i = 0; i < 9; i++) {
      const mesh = new THREE.Mesh(smokeGeo, smokeMat.clone())
      group.add(mesh)
      puffs.push({ mesh, t: i / 9, origin: e })
    }
  }
  const updateSmoke = (dt: number) => {
    for (const p of puffs) {
      p.t = (p.t + dt * 0.18) % 1
      const t = p.t
      p.mesh.position.set(p.origin.x + t * 1.6 + Math.sin(t * 6 + uniforms.uTime.value) * 0.15, p.origin.y + t * 3.2, p.origin.z - t * 0.6)
      p.mesh.scale.setScalar(0.5 + t * 2.2)
      ;(p.mesh.material as THREE.MeshStandardMaterial).opacity = Math.sin(t * Math.PI) * 0.75
    }
  }

  return { group, updateSmoke }
}

// ------------------------------------------------------------------ clouds

export function buildClouds() {
  const group = new THREE.Group()
  const rnd = mulberry32(404)
  const mat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 1, flatShading: true, transparent: true, opacity: 0.94 })
  const clouds: { g: THREE.Group; speed: number }[] = []
  for (let i = 0; i < 7; i++) {
    const parts: THREE.BufferGeometry[] = []
    const n = 5 + Math.floor(rnd() * 4)
    for (let k = 0; k < n; k++) {
      const r = 1.2 + rnd() * 1.6
      const g = new THREE.IcosahedronGeometry(r, 1)
      g.scale(1, 0.62, 1)
      g.translate((k - n / 2) * 1.5 + rnd(), rnd() * 0.6, (rnd() - 0.5) * 2)
      parts.push(nonIndexed(g))
    }
    const cg = new THREE.Group()
    const mesh = new THREE.Mesh(mergeGeometries(parts)!, mat)
    mesh.castShadow = true
    cg.add(mesh)
    cg.position.set(-70 + rnd() * 140, 34 + rnd() * 6, -40 + rnd() * 22)
    cg.scale.setScalar(0.8 + rnd() * 0.5)
    group.add(cg)
    clouds.push({ g: cg, speed: 0.6 + rnd() * 0.8 })
  }
  const update = (dt: number) => {
    for (const c of clouds) {
      c.g.position.x += c.speed * dt
      if (c.g.position.x > 80) c.g.position.x = -80
    }
  }
  return { group, update }
}
