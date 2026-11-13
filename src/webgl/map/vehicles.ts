import * as THREE from 'three'
import { gsap } from '../../lib/ease'
import type { VehicleId } from '../../lib/store'
import { heightAt } from './terrain'

const mat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.7, flatShading: true, ...extra })

function box(w: number, h: number, d: number, color: string, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color))
  m.position.set(x, y, z)
  return m
}

type Built = { root: THREE.Group; wheels: THREE.Object3D[]; legs: THREE.Object3D[] }

function wheel(x: number, z: number, r = 0.26) {
  const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.2, 12), mat('#2B241F'))
  w.rotation.x = Math.PI / 2
  const g = new THREE.Group()
  g.add(w)
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, 0.22, 8), mat('#D9CFBB'))
  hub.rotation.x = Math.PI / 2
  g.add(hub)
  g.position.set(x, r, z)
  return g
}

function sacks(group: THREE.Group, x: number, y: number, n: number) {
  for (let i = 0; i < n; i++) {
    const s = box(0.32, 0.2, 0.42, i % 2 ? '#CDB68A' : '#BFA676', x + (i % 2) * 0.34 - 0.17, y + Math.floor(i / 2) * 0.2, 0)
    s.rotation.y = (i % 3) * 0.12
    group.add(s)
  }
}

/** Willys-style jeep — the workhorse of coffee mountains. +X is forward. */
function jeep(): Built {
  const root = new THREE.Group()
  const body = new THREE.Group()
  body.add(box(1.9, 0.42, 0.95, '#3F7F86', 0, 0.5, 0))
  body.add(box(0.6, 0.18, 0.86, '#3F7F86', 0.65, 0.78, 0)) // hood
  body.add(box(0.06, 0.38, 0.86, '#2B4F55', 0.32, 0.96, 0)) // windscreen
  body.add(box(0.12, 0.2, 1.1, '#2B241F', 1.0, 0.44, 0)) // bumper
  body.add(box(0.05, 0.12, 0.12, '#FFE7A8', 0.98, 0.66, 0.32))
  body.add(box(0.05, 0.12, 0.12, '#FFE7A8', 0.98, 0.66, -0.32))
  // canvas canopy over the cabin
  body.add(box(0.95, 0.06, 0.92, '#E9DDC3', -0.2, 1.17, 0))
  sacks(body, -0.55, 0.85, 4)
  root.add(body)
  const wheels = [wheel(0.6, 0.48), wheel(0.6, -0.48), wheel(-0.6, 0.48), wheel(-0.6, -0.48)]
  root.add(...wheels)
  return { root, wheels, legs: [] }
}

function mule(): Built {
  const root = new THREE.Group()
  const brown = '#6A4A33'
  root.add(box(1.3, 0.55, 0.5, brown, 0, 0.95, 0))
  const neck = box(0.28, 0.6, 0.3, brown, 0.62, 1.3, 0)
  neck.rotation.z = -0.6
  const head = box(0.5, 0.26, 0.26, brown, 0.92, 1.52, 0)
  head.rotation.z = -0.35
  const ear1 = box(0.06, 0.24, 0.06, brown, 0.78, 1.78, 0.08)
  const ear2 = box(0.06, 0.24, 0.06, brown, 0.78, 1.78, -0.08)
  const tail = box(0.06, 0.4, 0.06, '#3B281C', -0.7, 0.85, 0)
  tail.rotation.z = 0.4
  root.add(neck, head, ear1, ear2, tail)
  // saddle bags (sacks of coffee)
  root.add(box(0.7, 0.4, 0.22, '#CDB68A', 0, 0.95, 0.38))
  root.add(box(0.7, 0.4, 0.22, '#BFA676', 0, 0.95, -0.38))
  root.add(box(0.75, 0.08, 0.7, '#B24A2C', 0, 1.24, 0))
  const legs: THREE.Object3D[] = []
  for (const [x, z] of [
    [0.45, 0.16],
    [0.45, -0.16],
    [-0.45, 0.16],
    [-0.45, -0.16],
  ]) {
    const pivot = new THREE.Group()
    pivot.position.set(x, 0.72, z)
    const leg = box(0.12, 0.72, 0.12, '#4E3524', 0, -0.36, 0)
    pivot.add(leg)
    root.add(pivot)
    legs.push(pivot)
  }
  return { root, wheels: [], legs }
}

/** Chiva: the painted rural bus, roof loaded with sacks. */
function chiva(): Built {
  const root = new THREE.Group()
  root.add(box(2.6, 0.36, 1.05, '#F2C230', 0, 0.48, 0))
  root.add(box(2.6, 0.12, 1.06, '#C8412B', 0, 0.72, 0))
  root.add(box(2.6, 0.1, 1.06, '#2F6B9A', 0, 0.84, 0))
  root.add(box(2.1, 0.42, 1.0, '#F7EEDC', -0.2, 1.09, 0)) // windows band
  for (let i = 0; i < 5; i++) root.add(box(0.06, 0.42, 1.02, '#3E6A35', -1.15 + i * 0.48, 1.09, 0)) // pillars
  root.add(box(0.5, 0.5, 1.0, '#C8412B', 1.05, 0.88, 0)) // nose / cab
  root.add(box(2.4, 0.08, 1.1, '#3A2418', -0.15, 1.34, 0)) // roof
  // roof rack load
  sacks(root, -0.7, 1.48, 4)
  sacks(root, 0.3, 1.48, 3)
  root.add(box(0.3, 0.3, 0.3, '#3E7A4A', -1.1, 1.53, 0.2))
  const wheels = [wheel(0.75, 0.52, 0.28), wheel(0.75, -0.52, 0.28), wheel(-0.85, 0.52, 0.28), wheel(-0.85, -0.52, 0.28)]
  root.add(...wheels)
  return { root, wheels, legs: [] }
}

const BUILDERS: Record<VehicleId, () => Built> = { jeep, mula: mule, chiva }

export class VehicleRig {
  group = new THREE.Group()
  private built = new Map<VehicleId, Built>()
  current: VehicleId = 'jeep'
  private u = 0.04
  private dir = 1
  private speed = 0.012
  private dust: THREE.Mesh[] = []

  constructor(private curve: THREE.CatmullRomCurve3) {
    for (const id of Object.keys(BUILDERS) as VehicleId[]) {
      const b = BUILDERS[id]()
      b.root.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.castShadow = true
      })
      const holder = new THREE.Group()
      // toy-scale exaggeration so the vehicle reads at map distance
      b.root.scale.setScalar(1.9)
      holder.add(b.root)
      holder.visible = id === this.current
      holder.userData.id = id
      this.group.add(holder)
      this.built.set(id, { ...b, root: holder })
    }
    const dustMat = new THREE.MeshStandardMaterial({ color: '#E4D3AE', transparent: true, opacity: 0, depthWrite: false, roughness: 1 })
    for (let i = 0; i < 10; i++) {
      const d = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 1), dustMat.clone())
      this.group.add(d)
      this.dust.push(d)
    }
  }

  get position() {
    return this.built.get(this.current)!.root.position
  }

  swap(id: VehicleId) {
    if (id === this.current) return
    const prev = this.built.get(this.current)!.root
    const next = this.built.get(id)!.root
    next.position.copy(prev.position)
    next.quaternion.copy(prev.quaternion)
    gsap.to(prev.scale, {
      x: 0.01,
      y: 0.01,
      z: 0.01,
      duration: 0.35,
      ease: 'back.in(2)',
      onComplete: () => {
        prev.visible = false
        prev.scale.setScalar(1)
      },
    })
    next.visible = true
    next.scale.setScalar(0.01)
    gsap.to(next.scale, { x: 1, y: 1, z: 1, duration: 0.7, delay: 0.3, ease: 'back.out(2.2)' })
    this.puff(prev.position)
    this.current = id
    this.speed = id === 'mula' ? 0.007 : id === 'chiva' ? 0.01 : 0.012
  }

  private puff(at: THREE.Vector3) {
    this.dust.forEach((d, i) => {
      const a = (i / this.dust.length) * Math.PI * 2
      const m = d.material as THREE.MeshStandardMaterial
      d.position.copy(at).add(new THREE.Vector3(0, 0.4, 0))
      d.scale.setScalar(0.3)
      m.opacity = 0.9
      gsap.to(d.position, { x: at.x + Math.cos(a) * 1.6, z: at.z + Math.sin(a) * 1.6, y: at.y + 0.9 + (i % 3) * 0.3, duration: 0.9, ease: 'alt.out' })
      gsap.to(d.scale, { x: 1.4, y: 1.4, z: 1.4, duration: 0.9, ease: 'alt.out' })
      gsap.to(m, { opacity: 0, duration: 0.9, ease: 'power1.in', delay: 0.15 })
    })
  }

  update(t: number, dt: number) {
    this.u += this.dir * this.speed * dt
    if (this.u > 0.985) {
      this.u = 0.985
      this.dir = -1
    } else if (this.u < 0.015) {
      this.u = 0.015
      this.dir = 1
    }
    const p = this.curve.getPointAt(this.u)
    const tan = this.curve.getTangentAt(this.u).multiplyScalar(this.dir)
    const heading = Math.atan2(-tan.z, tan.x)
    const ahead = heightAt(p.x + tan.x * 0.8, p.z + tan.z * 0.8)
    const behind = heightAt(p.x - tan.x * 0.8, p.z - tan.z * 0.8)
    const pitch = Math.atan2(ahead - behind, 1.6)
    for (const [id, b] of this.built) {
      if (!b.root.visible) continue
      b.root.position.set(p.x, heightAt(p.x, p.z) + 0.1 + Math.abs(Math.sin(t * 9)) * 0.03, p.z)
      b.root.rotation.set(0, heading, pitch, 'YXZ')
      for (const w of b.wheels) w.rotation.z -= dt * 6
      if (id === 'mula') {
        b.legs.forEach((l, i) => (l.rotation.z = Math.sin(t * 7 + (i % 2 === (i < 2 ? 0 : 1) ? 0 : Math.PI)) * 0.45))
      }
    }
  }
}
