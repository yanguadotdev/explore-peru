import * as THREE from 'three'
import { MAIN_STOPS, STOPS, type Stop } from '../../data/stops'
import { heightAt } from './terrain'

/** Winding road through the six stops, from the mountain to the town. */
export function buildRouteCurve() {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i < MAIN_STOPS.length; i++) {
    const a = MAIN_STOPS[i]
    pts.push(new THREE.Vector3(a.x, 0, a.z))
    const b = MAIN_STOPS[i + 1]
    if (!b) break
    const dx = b.x - a.x
    const dz = b.z - a.z
    const len = Math.hypot(dx, dz)
    const nx = -dz / len
    const nz = dx / len
    const wig = [2.8, -3.2, 2.2]
    for (let k = 1; k <= 3; k++) {
      const t = k / 4
      const w = wig[(k + i) % 3] * (i % 2 ? -1 : 1)
      pts.push(new THREE.Vector3(a.x + dx * t + nx * w, 0, a.z + dz * t + nz * w))
    }
  }
  const flat = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5)
  // drape on terrain
  const samples = flat.getSpacedPoints(900).map((p) => new THREE.Vector3(p.x, heightAt(p.x, p.z), p.z))
  return new THREE.CatmullRomCurve3(samples, false, 'centripetal')
}

export function routeSamples2D(curve: THREE.CatmullRomCurve3, n = 500) {
  return curve.getSpacedPoints(n).map((p) => new THREE.Vector2(p.x, p.z))
}

function ribbon(curve: THREE.CatmullRomCurve3, width: number, lift: number, N = 1200) {
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const len = curve.getLength()
  for (let i = 0; i <= N; i++) {
    const u = i / N
    const p = curve.getPointAt(u)
    const t = curve.getTangentAt(u)
    const l = Math.hypot(t.x, t.z) || 1
    const nx = -t.z / l
    const nz = t.x / l
    const ax = p.x + nx * width * 0.5
    const az = p.z + nz * width * 0.5
    const bx = p.x - nx * width * 0.5
    const bz = p.z - nz * width * 0.5
    pos.push(ax, heightAt(ax, az) + lift, az, bx, heightAt(bx, bz) + lift, bz)
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
  geo.computeVertexNormals()
  return { geo, len }
}

export function buildRoad(curve: THREE.CatmullRomCurve3) {
  const group = new THREE.Group()
  const road = ribbon(curve, 1.55, 0.07)
  const roadMat = new THREE.MeshStandardMaterial({
    side: THREE.DoubleSide,
    color: '#D8C29A',
    roughness: 1,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })
  const roadMesh = new THREE.Mesh(road.geo, roadMat)
  roadMesh.receiveShadow = true
  group.add(roadMesh)

  const line = ribbon(curve, 0.32, 0.12)
  const lineMat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    uniforms: {
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uLength: { value: line.len },
      uColor: { value: new THREE.Color('#C8412B') },
      uGlow: { value: new THREE.Color('#F2B04B') },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uReveal;
      uniform float uLength;
      uniform vec3 uColor;
      uniform vec3 uGlow;
      void main() {
        float s = vUv.x;
        float head = uReveal * uLength;
        if (s > head) discard;
        float dash = step(.42, fract(s * .55 - uTime * .45));
        float edge = smoothstep(.5, .32, abs(vUv.y - .5));
        float spark = smoothstep(3., 0., head - s) * (1. - step(.999, uReveal));
        vec3 col = mix(uColor, uGlow, spark);
        float a = edge * mix(.35, 1., dash);
        a = max(a, spark * edge);
        gl_FragColor = vec4(col, a);
        #include <colorspace_fragment>
      }`,
  })
  const lineMesh = new THREE.Mesh(line.geo, lineMat)
  lineMesh.renderOrder = 2
  group.add(lineMesh)
  return { group, lineMat }
}

// ---------------------------------------------------------------- markers

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function pinTexture(stop: Stop, collected: boolean) {
  const W = 256
  const H = 320
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')!
  const detour = stop.kind === 'detour'
  const fill = collected ? '#E2A43A' : detour ? '#F4EBD8' : '#C8412B'
  const ink = detour ? '#3A2418' : '#F7EEDC'
  // drop shape
  ctx.save()
  ctx.shadowColor = 'rgba(40,20,10,.35)'
  ctx.shadowBlur = 14
  ctx.shadowOffsetY = 6
  ctx.beginPath()
  const cx = W / 2
  const cy = 118
  const r = 92
  ctx.arc(cx, cy, r, Math.PI * 0.78, Math.PI * 2.22)
  ctx.quadraticCurveTo(cx + 26, 236, cx, 300)
  ctx.quadraticCurveTo(cx - 26, 236, cx - r * Math.cos(Math.PI * 0.22), cy + r * Math.sin(Math.PI * 0.22))
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.restore()
  // inner ring
  ctx.lineWidth = 6
  ctx.strokeStyle = detour ? 'rgba(58,36,24,.35)' : 'rgba(247,238,220,.55)'
  ctx.beginPath()
  ctx.arc(cx, cy, r - 16, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (collected) {
    ctx.lineWidth = 16
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#3A2418'
    ctx.beginPath()
    ctx.moveTo(cx - 38, cy + 2)
    ctx.lineTo(cx - 10, cy + 30)
    ctx.lineTo(cx + 42, cy - 28)
    ctx.stroke()
  } else if (detour) {
    // signpost glyph
    ctx.fillRect(cx - 5, cy - 46, 10, 92)
    roundRect(ctx, cx - 44, cy - 40, 80, 28, 6)
    ctx.fill()
    roundRect(ctx, cx - 36, cy - 2, 80, 28, 6)
    ctx.fill()
  } else {
    ctx.font = '800 118px Barlow, "Centra No2", sans-serif'
    ctx.fillText(String(stop.index), cx, cy + 6)
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export type Marker = {
  stop: Stop
  sprite: THREE.Sprite
  ring: THREE.Mesh
  base: THREE.Vector3
  hover: number
  setCollected: (v: boolean) => void
}

export function buildMarkers() {
  const group = new THREE.Group()
  const markers: Marker[] = []
  const ringGeo = new THREE.RingGeometry(0.9, 1.15, 40)
  ringGeo.rotateX(-Math.PI / 2)
  for (const stop of STOPS) {
    // pins always read on top of trees and terrain
    const mat = new THREE.SpriteMaterial({ map: pinTexture(stop, false), transparent: true, depthTest: false, depthWrite: false })
    const sprite = new THREE.Sprite(mat)
    sprite.center.set(0.5, 0)
    const s = stop.kind === 'stop' ? 4.4 : 3.2
    sprite.scale.set(s * 0.8, s, 1)
    const h = heightAt(stop.x, stop.z)
    const base = new THREE.Vector3(stop.x, h + 2.2, stop.z)
    sprite.position.copy(base)
    sprite.renderOrder = 10 + (stop.kind === 'stop' ? 1 : 0)
    sprite.userData.stopId = stop.id
    const ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({ color: stop.kind === 'stop' ? '#F7EEDC' : '#3A2418', transparent: true, opacity: 0.8, depthWrite: false }),
    )
    ring.position.set(stop.x, h + 0.15, stop.z)
    group.add(sprite, ring)
    const m: Marker = {
      stop,
      sprite,
      ring,
      base,
      hover: 0,
      setCollected: (v) => {
        mat.map?.dispose()
        mat.map = pinTexture(stop, v)
        mat.needsUpdate = true
      },
    }
    markers.push(m)
  }
  return { group, markers }
}
