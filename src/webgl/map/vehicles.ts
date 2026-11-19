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

/** Combi: the white-and-blue minibus that moves half of Peru. +X is forward. */
function combi(): Built {
  const root = new THREE.Group()
  root.add(box(2.1, 0.62, 0.98, '#F4F1EA', 0, 0.62, 0))
  root.add(box(2.1, 0.14, 1.0, '#2F6B9A', 0, 0.42, 0)) // stripe
  root.add(box(2.1, 0.08, 1.0, '#C8412B', 0, 0.52, 0)) // stripe
  root.add(box(1.7, 0.26, 1.0, '#3A4B5A', -0.1, 0.86, 0)) // windows
  root.add(box(0.08, 0.36, 0.9, '#3A4B5A', 1.06, 0.8, 0)) // windscreen
  root.add(box(2.12, 0.08, 1.0, '#F4F1EA', 0, 1.0, 0)) // roof
  root.add(box(1.0, 0.12, 0.8, '#3A2418', -0.3, 1.1, 0)) // roof rack
  root.add(box(0.36, 0.24, 0.5, '#E2A43A', -0.5, 1.28, 0.05)) // luggage
  root.add(box(0.3, 0.2, 0.4, '#3E7A4A', -0.1, 1.26, -0.1))
  root.add(box(0.05, 0.12, 0.14, '#FFE7A8', 1.06, 0.5, 0.32))
  root.add(box(0.05, 0.12, 0.14, '#FFE7A8', 1.06, 0.5, -0.32))
  const wheels = [wheel(0.65, 0.5, 0.25), wheel(0.65, -0.5, 0.25), wheel(-0.65, 0.5, 0.25), wheel(-0.65, -0.5, 0.25)]
  root.add(...wheels)
  return { root, wheels, legs: [] }
}

/** Llama with a colourful woven blanket. */
function llama(): Built {
  const root = new THREE.Group()
  const wool = '#EFE4D0'
  root.add(box(1.05, 0.5, 0.5, wool, 0, 0.98, 0))
  const neck = box(0.24, 0.85, 0.26, wool, 0.48, 1.5, 0)
  neck.rotation.z = -0.12
  const head = box(0.42, 0.22, 0.24, wool, 0.64, 1.95, 0)
  const muzzle = box(0.14, 0.14, 0.18, '#3A2A20', 0.86, 1.92, 0)
  const ear1 = box(0.05, 0.22, 0.06, wool, 0.55, 2.15, 0.08)
  const ear2 = box(0.05, 0.22, 0.06, wool, 0.55, 2.15, -0.08)
  const tail = box(0.12, 0.2, 0.12, wool, -0.58, 1.08, 0)
  root.add(neck, head, muzzle, ear1, ear2, tail)
  // woven blanket (manta) in stripes + pompoms
  root.add(box(0.62, 0.06, 0.62, '#C8412B', 0, 1.25, 0))
  root.add(box(0.62, 0.3, 0.04, '#C8412B', 0, 1.1, 0.29), box(0.62, 0.3, 0.04, '#C8412B', 0, 1.1, -0.29))
  root.add(box(0.62, 0.07, 0.05, '#E2A43A', 0, 1.0, 0.3), box(0.62, 0.07, 0.05, '#2F6B9A', 0, 1.14, 0.3))
  root.add(box(0.62, 0.07, 0.05, '#E2A43A', 0, 1.0, -0.3), box(0.62, 0.07, 0.05, '#2F6B9A', 0, 1.14, -0.3))
  root.add(box(0.08, 0.08, 0.08, '#E83F8C', 0.55, 2.28, 0.08), box(0.08, 0.08, 0.08, '#2FA36B', 0.55, 2.28, -0.08))
  const legs: THREE.Object3D[] = []
  for (const [x, z] of [
    [0.38, 0.15],
    [0.38, -0.15],
    [-0.38, 0.15],
    [-0.38, -0.15],
  ]) {
    const pivot = new THREE.Group()
    pivot.position.set(x, 0.74, z)
    pivot.add(box(0.11, 0.74, 0.11, '#D9CCB4', 0, -0.37, 0))
    root.add(pivot)
    legs.push(pivot)
  }
  return { root, wheels: [], legs }
}

/** Andean train: a blue locomotive pulling one panoramic carriage. */
function tren(): Built {
  const root = new THREE.Group()
  // locomotive
  root.add(box(1.3, 0.62, 0.9, '#23466E', 0.75, 0.62, 0))
  root.add(box(0.5, 0.36, 0.86, '#23466E', 0.2, 1.05, 0)) // cab
  root.add(box(0.06, 0.2, 0.7, '#9FC3DA', 0.46, 1.08, 0))
  root.add(box(1.3, 0.08, 0.92, '#E2A43A', 0.75, 0.5, 0)) // gold band
  root.add(box(0.14, 0.34, 0.14, '#2B241F', 1.2, 1.08, 0)) // chimney
  root.add(box(0.1, 0.12, 0.6, '#FFE7A8', 1.42, 0.7, 0))
  // carriage
  root.add(box(1.5, 0.66, 0.9, '#23466E', -0.95, 0.64, 0))
  root.add(box(1.4, 0.24, 0.92, '#9FC3DA', -0.95, 0.86, 0)) // panoramic windows
  root.add(box(1.5, 0.08, 0.92, '#E2A43A', -0.95, 0.52, 0))
  root.add(box(1.52, 0.06, 0.94, '#F4F1EA', -0.95, 1.0, 0))
  root.add(box(0.2, 0.08, 0.1, '#2B241F', -0.1, 0.45, 0)) // coupling
  const wheels = [
    wheel(1.15, 0.42, 0.2), wheel(1.15, -0.42, 0.2), wheel(0.4, 0.42, 0.2), wheel(0.4, -0.42, 0.2),
    wheel(-0.45, 0.42, 0.2), wheel(-0.45, -0.42, 0.2), wheel(-1.45, 0.42, 0.2), wheel(-1.45, -0.42, 0.2),
  ]
  root.add(...wheels)
  return { root, wheels, legs: [] }
}

const BUILDERS: Record<VehicleId, () => Built> = { combi, llama, tren }

export class VehicleRig {
  group = new THREE.Group()
  private built = new Map<VehicleId, Built>()
  current: VehicleId = 'combi'
  private u = 0.04
  private dir = 1
  private speed = 0.008
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
    this.speed = id === 'llama' ? 0.005 : id === 'tren' ? 0.009 : 0.008
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
      if (id === 'llama') {
        b.legs.forEach((l, i) => (l.rotation.z = Math.sin(t * 7 + (i % 2 === (i < 2 ? 0 : 1) ? 0 : Math.PI)) * 0.45))
      }
    }
  }
}
