import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { project } from '../../data/geo'
import { STOPS } from '../../data/stops'
import { mulberry32 } from '../utils/noise'
import { TITICACA, deptAt } from './peru'
import { LAKE_Y, MAP_D, MAP_W, distToRiver, heightAt, slopeAt, zoneAt } from './terrain'

type Uniforms = { uTime: { value: number } }

/** Gentle wind sway for instanced foliage (top of mesh moves most). */
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
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3)
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
  if (distToRiver(x, z) < 0.8) return false
  // keep department borders clear so the lines read through the forest
  if (deptAt(x, z).border < 0.9) return false
  for (const s of STOPS) if (Math.hypot(s.x - x, s.z - z) < (s.kind === 'stop' ? stopGap : stopGap * 0.5)) return false
  for (let i = 0; i < avoid.route.length; i += 2) {
    const p = avoid.route[i]
    if (Math.abs(p.x - x) < routeGap && Math.abs(p.y - z) < routeGap && Math.hypot(p.x - x, p.y - z) < routeGap) return false
  }
  return true
}

// ------------------------------------------------------------------ vegetation

export function buildVegetation(avoid: Avoid, uniforms: Uniforms) {
  const group = new THREE.Group()
  const rnd = mulberry32(2026)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const s = new THREE.Vector3()
  const p = new THREE.Vector3()
  const c = new THREE.Color()
  const up = new THREE.Vector3(0, 1, 0)

  // rainforest tree (two-blob canopy)
  const trunk = colorize(nonIndexed(new THREE.CylinderGeometry(0.1, 0.17, 1.2, 5).translate(0, 0.6, 0)), '#5B3B26')
  const can1 = colorize(nonIndexed(new THREE.IcosahedronGeometry(0.8, 0).translate(0, 1.6, 0)), '#ffffff')
  const can2 = colorize(nonIndexed(new THREE.IcosahedronGeometry(0.6, 0).translate(0.4, 2.15, 0.1)), '#ffffff')
  const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true })
  windify(treeMat, uniforms, 0.05)
  const TREE_MAX = 4200
  const trees = new THREE.InstancedMesh(mergeGeometries([trunk, can1, can2])!, treeMat, TREE_MAX)
  trees.castShadow = true
  trees.receiveShadow = true
  const greens = ['#2C5F30', '#3A7036', '#24522A', '#4B813C', '#1F4A27', '#5A8A3E']

  // jungle palm (aguaje)
  const palmParts: THREE.BufferGeometry[] = [colorize(nonIndexed(new THREE.CylinderGeometry(0.06, 0.1, 2.2, 5).translate(0, 1.1, 0)), '#7A5A3A')]
  for (let f = 0; f < 6; f++) {
    const leaf = new THREE.ConeGeometry(0.2, 1.4, 3)
    leaf.translate(0, 0.7, 0)
    leaf.rotateZ(Math.PI / 2.4)
    leaf.rotateY((f / 6) * Math.PI * 2)
    leaf.translate(0, 2.2, 0)
    palmParts.push(colorize(nonIndexed(leaf), '#ffffff'))
  }
  const palmMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true })
  windify(palmMat, uniforms, 0.07)
  const PALM_MAX = 500
  const palms = new THREE.InstancedMesh(mergeGeometries(palmParts)!, palmMat, PALM_MAX)
  palms.castShadow = true

  // Andean shrubs / queñua (small, flat)
  const shrubGeo = new THREE.IcosahedronGeometry(0.45, 0).scale(1.3, 0.75, 1.3).translate(0, 0.3, 0)
  const shrubMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true })
  windify(shrubMat, uniforms, 0.05)
  const SHRUB_MAX = 1400
  const shrubs = new THREE.InstancedMesh(shrubGeo, shrubMat, SHRUB_MAX)
  shrubs.castShadow = true

  // coastal huarango (wide, sparse) + cactus
  const huarango = mergeGeometries([
    colorize(nonIndexed(new THREE.CylinderGeometry(0.08, 0.14, 1.3, 5).translate(0, 0.65, 0)), '#6A4A30'),
    colorize(nonIndexed(new THREE.IcosahedronGeometry(1, 0).scale(1.5, 0.45, 1.5).translate(0, 1.45, 0)), '#ffffff'),
  ])!
  const huarangoMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true })
  const HUAR_MAX = 220
  const huarangos = new THREE.InstancedMesh(huarango, huarangoMat, HUAR_MAX)
  huarangos.castShadow = true
  const cactusGeo = mergeGeometries([
    nonIndexed(new THREE.CylinderGeometry(0.12, 0.14, 1.1, 6).translate(0, 0.55, 0)),
    nonIndexed(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 6).rotateZ(Math.PI / 2).translate(0.2, 0.55, 0)),
    nonIndexed(new THREE.CylinderGeometry(0.07, 0.07, 0.4, 6).translate(0.42, 0.75, 0)),
  ])!
  const CACTUS_MAX = 260
  const cacti = new THREE.InstancedMesh(cactusGeo, new THREE.MeshStandardMaterial({ color: '#5E7A42', roughness: 0.8, flatShading: true }), CACTUS_MAX)
  cacti.castShadow = true

  // rocks
  const ROCK_MAX = 420
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.5, 0), new THREE.MeshStandardMaterial({ color: '#9B8D79', roughness: 1, flatShading: true }), ROCK_MAX)
  rocks.castShadow = true
  rocks.receiveShadow = true

  const counts = { trees: 0, palms: 0, shrubs: 0, huar: 0, cacti: 0, rocks: 0 }
  const place = (im: THREE.InstancedMesh, k: keyof typeof counts, x: number, z: number, sc: THREE.Vector3, color?: THREE.Color, sink = 0.08) => {
    q.setFromAxisAngle(up, rnd() * Math.PI * 2)
    m.compose(p.set(x, heightAt(x, z) - sink, z), q, sc)
    im.setMatrixAt(counts[k], m)
    if (color) im.setColorAt(counts[k], color)
    counts[k]++
  }

  for (let k = 0; k < 60000; k++) {
    const x = (rnd() - 0.5) * (MAP_W - 2)
    const z = (rnd() - 0.5) * (MAP_D - 2)
    const zone = zoneAt(x, z)
    if (zone === 'ocean' || zone === 'neighbor' || zone === 'lake' || zone === 'snow') continue
    const r = rnd()
    if (zone === 'selva') {
      if (!clearOf(x, z, avoid, 1.6, 3)) continue
      if (slopeAt(x, z) > 1.5) continue
      if (r < 0.88 && counts.trees < TREE_MAX) {
        const sc = 0.75 + rnd() * 0.65
        place(trees, 'trees', x, z, s.set(sc, sc * (0.85 + rnd() * 0.4), sc), c.set(greens[Math.floor(rnd() * greens.length)]).offsetHSL(0, 0, (rnd() - 0.5) * 0.04))
      } else if (counts.palms < PALM_MAX) {
        const sc = 0.8 + rnd() * 0.5
        place(palms, 'palms', x, z, s.set(sc, sc, sc), c.set(rnd() > 0.5 ? '#4E8A3A' : '#3F7A35'))
      }
    } else if (zone === 'sierra' || zone === 'puna') {
      if (r > 0.12) continue
      if (!clearOf(x, z, avoid, 1.4, 2.6)) continue
      if (rnd() < 0.55 && counts.shrubs < SHRUB_MAX && slopeAt(x, z) < 1.4) {
        const sc = 0.6 + rnd() * 0.7
        place(shrubs, 'shrubs', x, z, s.set(sc, sc, sc), c.set(zone === 'puna' ? '#8C8A4E' : rnd() > 0.5 ? '#5E7A3A' : '#6F8743'))
      } else if (counts.rocks < ROCK_MAX) {
        const sc = 0.4 + rnd() * 1.1
        q.setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3))
        m.compose(p.set(x, heightAt(x, z) - sc * 0.15, z), q, s.set(sc * 1.3, sc * 0.75, sc))
        rocks.setMatrixAt(counts.rocks++, m)
      }
    } else if (zone === 'coast') {
      if (r > 0.035) continue
      if (!clearOf(x, z, avoid, 1.4, 2.6)) continue
      if (rnd() < 0.55 && counts.huar < HUAR_MAX) {
        const sc = 0.6 + rnd() * 0.5
        place(huarangos, 'huar', x, z, s.set(sc, sc, sc), c.set(rnd() > 0.5 ? '#7C8F4A' : '#8E9A55'))
      } else if (counts.cacti < CACTUS_MAX) {
        const sc = 0.7 + rnd() * 0.6
        place(cacti, 'cacti', x, z, s.set(sc, sc, sc), undefined, 0.02)
      }
    }
  }

  const all: [THREE.InstancedMesh, keyof typeof counts][] = [
    [trees, 'trees'],
    [palms, 'palms'],
    [shrubs, 'shrubs'],
    [huarangos, 'huar'],
    [cacti, 'cacti'],
    [rocks, 'rocks'],
  ]
  for (const [im, k] of all) {
    im.count = counts[k]
    im.instanceMatrix.needsUpdate = true
    if (im.instanceColor) im.instanceColor.needsUpdate = true
    im.computeBoundingSphere()
    group.add(im)
  }
  return group
}

// ------------------------------------------------------------------ landmarks

const std = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...extra })

function shadowed<T extends THREE.Object3D>(o: T) {
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true
      c.receiveShadow = true
    }
  })
  return o
}

function box(w: number, h: number, d: number, color: string, x = 0, y = 0, z = 0) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std(color))
  b.position.set(x, y + h / 2, z)
  return b
}

function house(w: number, d: number, h: number, wall = '#F3EADB', roof = '#B24A2C') {
  const g = new THREE.Group()
  g.add(box(w, h, d, wall))
  const shape = new THREE.Shape()
  shape.moveTo(-w / 2 - 0.15, 0)
  shape.lineTo(0, h * 0.7)
  shape.lineTo(w / 2 + 0.15, 0)
  shape.lineTo(-w / 2 - 0.15, 0)
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: d + 0.3, bevelEnabled: false })
  roofGeo.translate(0, 0, -(d + 0.3) / 2)
  const roofMesh = new THREE.Mesh(roofGeo, std(roof))
  roofMesh.position.y = h
  g.add(roofMesh)
  return shadowed(g)
}

function at(o: THREE.Object3D, x: number, z: number, rotY = 0, lift = 0) {
  o.position.set(x, heightAt(x, z) - 0.05 + lift, z)
  o.rotation.y = rotY
  return o
}

function palm(scale = 1) {
  const g = new THREE.Group()
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.6, 5), std('#7A5A3A'))
  t.position.y = 0.8
  g.add(t)
  for (let f = 0; f < 6; f++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.1, 3), std('#4E8A3A'))
    leaf.position.set(Math.cos((f / 6) * Math.PI * 2) * 0.4, 1.6, Math.sin((f / 6) * Math.PI * 2) * 0.4)
    leaf.rotation.set(0, -(f / 6) * Math.PI * 2, Math.PI / 2.3)
    g.add(leaf)
  }
  g.scale.setScalar(scale)
  return shadowed(g)
}

export function buildLandmarks(uniforms: Uniforms) {
  const group = new THREE.Group()
  const get = (id: string) => STOPS.find((s) => s.id === id)!
  const rnd = mulberry32(51)
  const smoke: THREE.Vector3[] = []

  // Loreto — stilt houses and a riverboat
  {
    const s = get('loreto')
    for (let i = 0; i < 5; i++) {
      const h = new THREE.Group()
      for (const [dx, dz] of [
        [-0.35, -0.3],
        [0.35, -0.3],
        [-0.35, 0.3],
        [0.35, 0.3],
      ])
        h.add(box(0.08, 0.6, 0.08, '#6B4630', dx, 0, dz))
      const hut = house(1, 0.9, 0.55, '#C9A877', '#8C7A45')
      hut.position.y = 0.6
      h.add(hut)
      group.add(at(shadowed(h), s.x - 1.8 + i * 0.95, s.z + 1.2 + (i % 2) * 0.6, rnd()))
    }
    const boat = new THREE.Group()
    boat.add(box(2.2, 0.3, 0.7, '#F1ECE0'), box(1.3, 0.45, 0.6, '#3E7AA0', -0.2, 0.3, 0))
    boat.add(box(1.5, 0.06, 0.75, '#B24A2C', -0.2, 0.78, 0))
    group.add(at(shadowed(boat), s.x + 2.2, s.z - 1.0, 0.4, 0.15))
  }

  // Amazonas — Kuélap: oval wall with round houses
  {
    const s = get('amazonas')
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.4, 0.9, 24, 1, true), std('#9E9682', { side: THREE.DoubleSide }))
    wall.scale.set(1, 1, 0.55)
    wall.position.y = 0.45
    const k = new THREE.Group()
    k.add(wall)
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.8, 24), std('#8E9A58'))
    floor.scale.set(1, 1, 0.55)
    floor.position.y = 0.4
    k.add(floor)
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2
      const r = new THREE.Group()
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.35, 10), std('#A69C86'))
      base.position.y = 0.18
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.55, 10), std('#C2A464'))
      roof.position.y = 0.62
      r.add(base, roof)
      r.position.set(Math.cos(a) * 1.3, 0.8, Math.sin(a) * 0.55)
      k.add(r)
    }
    group.add(at(shadowed(k), s.x + 0.6, s.z - 1.6, 0.3))
  }

  // La Libertad — Chan Chan adobe walls + caballitos de totora
  {
    const s = get('lalibertad')
    const cc = new THREE.Group()
    const adobe = '#C9A374'
    cc.add(box(3.4, 0.45, 0.14, adobe, 0, 0, -1.2), box(3.4, 0.45, 0.14, adobe, 0, 0, 1.2))
    cc.add(box(0.14, 0.45, 2.4, adobe, -1.7, 0, 0), box(0.14, 0.45, 2.4, adobe, 1.7, 0, 0))
    for (let i = 0; i < 3; i++) cc.add(box(0.1, 0.32, 1.6, adobe, -0.9 + i * 0.9, 0, 0.2))
    for (let i = 0; i < 2; i++) cc.add(box(1.2, 0.32, 0.1, adobe, -0.4 + i * 1.1, 0, -0.5))
    group.add(at(shadowed(cc), s.x + 0.8, s.z - 0.4, 0.2))
    for (let i = 0; i < 3; i++) {
      const reed = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.2, 6), std('#C8B26A'))
      reed.rotation.z = Math.PI / 2 + 0.15
      group.add(at(shadowed(reed), s.x - 2.6 - i * 0.25, s.z + 0.6 + i * 0.6, 0.3, 0.1))
    }
  }

  // Lima — cathedral, plaza, colonial houses, a few towers
  {
    const s = get('lima')
    const plaza = new THREE.Group()
    plaza.add(box(3.6, 0.06, 2.8, '#D8CBB0'))
    const cat = new THREE.Group()
    cat.add(box(1.6, 1.1, 1, '#E9D3A6'))
    cat.add(box(0.4, 1.8, 0.4, '#E9D3A6', -0.65, 0, 0.35), box(0.4, 1.8, 0.4, '#E9D3A6', 0.65, 0, 0.35))
    const dome1 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), std('#B24A2C'))
    dome1.position.set(-0.65, 1.95, 0.35)
    const dome2 = dome1.clone()
    dome2.position.x = 0.65
    cat.add(dome1, dome2)
    cat.position.set(0, 0, -1.6)
    plaza.add(cat)
    const balcony = ['#F2D16B', '#E9A6A0', '#BFD8C5', '#A9C6E0', '#F3EADB']
    ;[
      [-2.3, -0.4],
      [-2.3, 0.6],
      [2.3, -0.4],
      [2.3, 0.6],
      [-1, 1.8],
      [0.4, 1.8],
      [1.6, 1.8],
    ].forEach(([dx, dz], i) => {
      const h = house(1, 0.8, 0.7, balcony[i % balcony.length], '#8E3B22')
      h.position.set(dx, 0, dz)
      plaza.add(h)
    })
    for (let i = 0; i < 4; i++) plaza.add(box(0.5, 1.4 + rnd() * 1.4, 0.5, '#CFCAC0', 3.4 + (i % 2) * 0.7, 0, -1.4 + i * 0.8))
    group.add(at(shadowed(plaza), s.x + 0.4, s.z + 0.2, 0.2))
  }

  // Ica — Huacachina oasis + dunes, and a Nazca hummingbird
  {
    const s = get('ica')
    const oasis = new THREE.Group()
    const pond = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24), std('#3F8FA3', { roughness: 0.3, flatShading: false }))
    pond.rotation.x = -Math.PI / 2
    pond.position.y = 0.06
    oasis.add(pond)
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2
      const p = palm(0.75 + rnd() * 0.3)
      p.position.set(Math.cos(a) * 1.2, 0, Math.sin(a) * 1.2)
      oasis.add(p)
    }
    for (let i = 0; i < 4; i++) {
      const dune = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), std('#DDBE84'))
      dune.scale.set(1.4, 0.55, 0.8)
      dune.position.set(-2.6 + i * 1.9, -0.05, -2.3 - (i % 2))
      oasis.add(dune)
    }
    group.add(at(shadowed(oasis), s.x - 0.6, s.z + 1.2))

    // Nazca hummingbird drawn on the desert floor
    const [nx, nz] = project(-75.05, -14.75)
    const bird = new THREE.Shape()
    const pts: [number, number][] = [
      [0, 0], [0.2, 0.9], [0.05, 1.6], [0.6, 2.4], [0.15, 2.1], [0, 3.2], [-0.15, 2.1], [-0.6, 2.4],
      [-0.05, 1.6], [-0.2, 0.9], [-1.6, 1.2], [-0.25, 0.4], [-0.4, -0.6], [0, -0.2], [0.4, -0.6], [0.25, 0.4], [1.6, 1.2],
    ]
    bird.moveTo(pts[0][0], pts[0][1])
    pts.forEach(([x, y]) => bird.lineTo(x, y))
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts.map(([x, y]) => new THREE.Vector3(x, 0, -y))), new THREE.LineBasicMaterial({ color: '#7A5A3A' }))
    line.scale.setScalar(0.8)
    group.add(at(line, nx, nz, 0.6, 0.06))
  }

  // Arequipa — white sillar church + El Misti
  {
    const s = get('arequipa')
    const c = new THREE.Group()
    c.add(box(1.6, 0.9, 1, '#F6F2EA'))
    c.add(box(0.36, 1.5, 0.36, '#F6F2EA', -0.6, 0, 0.32), box(0.36, 1.5, 0.36, '#F6F2EA', 0.6, 0, 0.32))
    for (let i = 0; i < 5; i++) c.add(house(0.9, 0.8, 0.6, '#F3EFE6', '#C9C2B4').translateX(-2 + i * 0.9).translateZ(1.6))
    group.add(at(shadowed(c), s.x + 0.6, s.z + 0.8, 0.1))
    const [mx, mz] = project(-71.65, -16.05)
    const misti = new THREE.Group()
    const cone = new THREE.Mesh(new THREE.ConeGeometry(3.4, 4.4, 28, 1, true), std('#8A7461'))
    cone.position.y = 2.2
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.25, 1.6, 28), std('#F4F2EC'))
    cap.position.y = 3.65
    misti.add(cone, cap)
    group.add(at(shadowed(misti), mx, mz, 0, -0.3))
    smoke.push(new THREE.Vector3(mx, heightAt(mx, mz) + 4.3, mz))
  }

  // Puno — Uros floating islands on Titicaca
  {
    for (let i = 0; i < 4; i++) {
      const isl = new THREE.Group()
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.14, 16), std('#D9C47A'))
      disc.position.y = 0.07
      isl.add(disc)
      for (let j = 0; j < 2; j++) {
        const hut = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 4), std('#C8A85A'))
        hut.position.set(-0.25 + j * 0.45, 0.35, 0.1 - j * 0.2)
        hut.rotation.y = Math.PI / 4
        isl.add(hut)
      }
      const a = 2.4 + i * 0.5
      isl.position.set(TITICACA.x - Math.cos(a) * 2.2, LAKE_Y + 0.02, TITICACA.z - 1.4 + Math.sin(a) * 1.2)
      group.add(shadowed(isl))
    }
    const reedBoat = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.4, 6), std('#C8B26A'))
    reedBoat.rotation.z = Math.PI / 2
    reedBoat.position.set(TITICACA.x + 1.2, LAKE_Y + 0.12, TITICACA.z + 0.4)
    group.add(shadowed(reedBoat))
  }

  // Cusco — Machu Picchu: stepped terraces on a ridge + Huayna Picchu
  {
    const s = get('cusco')
    const mp = new THREE.Group()
    const peak = new THREE.Mesh(new THREE.ConeGeometry(1.4, 4.2, 7), std('#3E6A35'))
    peak.position.set(0.4, 2.1, -2.2)
    mp.add(peak)
    for (let i = 0; i < 5; i++) {
      const t = box(3.2 - i * 0.45, 0.32, 1.9 - i * 0.22, i % 2 ? '#7FA65A' : '#8DB363', 0, i * 0.32, 0)
      mp.add(t)
    }
    for (let i = 0; i < 9; i++) mp.add(house(0.42, 0.42, 0.3, '#B7AE9C', '#9C8F78').translateX(-0.9 + (i % 3) * 0.6).translateY(1.6).translateZ(-0.5 + Math.floor(i / 3) * 0.4))
    group.add(at(shadowed(mp), s.x + 0.4, s.z - 1.1, -0.3))
  }

  // volcano smoke
  const smokeMat = new THREE.MeshStandardMaterial({ color: '#EFE8DC', roughness: 1, transparent: true, opacity: 0.8, depthWrite: false })
  const puffs: { mesh: THREE.Mesh; t: number; origin: THREE.Vector3 }[] = []
  for (const e of smoke)
    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), smokeMat.clone())
      group.add(mesh)
      puffs.push({ mesh, t: i / 8, origin: e })
    }
  const update = (dt: number) => {
    for (const p of puffs) {
      p.t = (p.t + dt * 0.12) % 1
      const t = p.t
      p.mesh.position.set(p.origin.x + t * 2 + Math.sin(t * 6 + uniforms.uTime.value) * 0.2, p.origin.y + t * 3, p.origin.z - t)
      p.mesh.scale.setScalar(0.6 + t * 2.4)
      ;(p.mesh.material as THREE.MeshStandardMaterial).opacity = Math.sin(t * Math.PI) * 0.6
    }
  }
  return { group, update }
}

// ------------------------------------------------------------------ clouds

export function buildClouds() {
  const group = new THREE.Group()
  const rnd = mulberry32(404)
  const mat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 1, flatShading: true, transparent: true, opacity: 0.94 })
  const clouds: { g: THREE.Group; speed: number }[] = []
  for (let i = 0; i < 6; i++) {
    const parts: THREE.BufferGeometry[] = []
    const n = 5 + Math.floor(rnd() * 4)
    for (let k = 0; k < n; k++) {
      const g = new THREE.IcosahedronGeometry(1.2 + rnd() * 1.6, 1)
      g.scale(1, 0.62, 1)
      g.translate((k - n / 2) * 1.5 + rnd(), rnd() * 0.6, (rnd() - 0.5) * 2)
      parts.push(nonIndexed(g))
    }
    const cg = new THREE.Group()
    const mesh = new THREE.Mesh(mergeGeometries(parts)!, mat)
    mesh.castShadow = true
    cg.add(mesh)
    // drift over the Andes, from north-west to south-east
    cg.position.set(-30 + rnd() * 55, 32 + rnd() * 6, -50 + rnd() * 95)
    cg.scale.setScalar(0.55 + rnd() * 0.35)
    group.add(cg)
    clouds.push({ g: cg, speed: 0.5 + rnd() * 0.7 })
  }
  const update = (dt: number) => {
    for (const c of clouds) {
      c.g.position.x += c.speed * dt
      if (c.g.position.x > 55) c.g.position.x = -55
    }
  }
  return { group, update }
}

// ------------------------------------------------------------------ labels

/** Country / ocean names printed flat on the board, like an illustrated map. */
export function buildLabels() {
  const group = new THREE.Group()
  const labels: { text: string; lon: number; lat: number; size: number; rot?: number; color?: string; y?: number }[] = [
    { text: 'ECUADOR', lon: -78.3, lat: -1.6, size: 3.2 },
    { text: 'COLOMBIA', lon: -71.6, lat: -0.9, size: 3.2 },
    { text: 'BRASIL', lon: -69.6, lat: -7.8, size: 3.6 },
    { text: 'BOLIVIA', lon: -67.9, lat: -16.2, size: 3.2, rot: -Math.PI / 2 },
    { text: 'CHILE', lon: -69.0, lat: -19.2, size: 3 },
    { text: 'OCÉANO PACÍFICO', lon: -80.4, lat: -12.6, size: 3, rot: -0.85, color: '#E9F3F6', y: 0.05 },
  ]
  for (const l of labels) {
    const cv = document.createElement('canvas')
    cv.width = 1024
    cv.height = 160
    const ctx = cv.getContext('2d')!
    ctx.font = '900 112px "Centra No2", system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = l.color ?? '#8A6E50'
    ctx.fillText(l.text, 512, 84)
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    const w = l.size * 6.4
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, w / 6.4),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: l.color ? 0.75 : 0.55, depthWrite: false }),
    )
    const [x, z] = project(l.lon, l.lat)
    mesh.rotation.set(-Math.PI / 2, 0, l.rot ?? 0)
    mesh.position.set(x, l.y ?? heightAt(x, z) + 0.06, z)
    mesh.renderOrder = 3
    group.add(mesh)
  }
  return group
}
