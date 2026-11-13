import * as THREE from 'three'
import { STOPS } from '../data/stops'
import { gsap } from '../lib/ease'
import type { VehicleId } from '../lib/store'
import { buildBuildings, buildClouds, buildVegetation } from './map/props'
import { buildMarkers, buildRoad, buildRouteCurve, routeSamples2D, type Marker } from './map/route'
import { buildPaper, buildRiver, buildSkirt, buildTerrain, heightAt } from './map/terrain'
import { VehicleRig } from './map/vehicles'

// yield to the browser between build steps (setTimeout keeps going in background tabs)
const nextFrame = () => new Promise<void>((r) => setTimeout(r, 0))

export type MapEvents = {
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
}

export class MapScene {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(30, 1, 1, 900)
  uniforms = { uTime: { value: 0 } }
  markers: Marker[] = []
  vehicles!: VehicleRig
  private routeLine!: THREE.ShaderMaterial
  private river!: THREE.Mesh
  private updateSmoke: (dt: number) => void = () => {}
  private updateClouds: (dt: number) => void = () => {}

  // camera rig (desired → current, damped)
  rig = {
    target: new THREE.Vector3(-1, 4, -7),
    distance: 162,
    polar: 0.86,
    azimuth: 0,
  }
  private cur = { target: new THREE.Vector3(-1, 4, -7), distance: 230, polar: 0.5, azimuth: -0.25 }
  private velocity = new THREE.Vector2()
  private pointer = new THREE.Vector2(-10, -10)
  private pointerNdc = new THREE.Vector2()
  private dragging = false
  private downAt = new THREE.Vector2()
  private moved = 0
  private raycaster = new THREE.Raycaster()
  interactive = false
  hovered: Marker | null = null
  private flying = false

  constructor(private dom: HTMLElement, private events: MapEvents) {
    this.scene.background = new THREE.Color('#EDE3CC')
  }

  async build(progress: (p: number) => void) {
    const s = this.scene
    const hemi = new THREE.HemisphereLight('#FFF4DE', '#5F6B3A', 1.25)
    const sun = new THREE.DirectionalLight('#FFE3B5', 2.6)
    sun.position.set(-48, 70, 42)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    const sc = sun.shadow.camera
    sc.left = -78
    sc.right = 78
    sc.top = 60
    sc.bottom = -60
    sc.near = 10
    sc.far = 220
    sun.shadow.bias = -0.0006
    sun.shadow.normalBias = 0.04
    sun.shadow.radius = 3
    s.add(hemi, sun, sun.target)

    s.add(buildPaper())
    s.add(buildTerrain())
    progress(0.25)
    await nextFrame()
    s.add(buildSkirt())
    this.river = buildRiver()
    s.add(this.river)
    progress(0.35)
    await nextFrame()

    const curve = buildRouteCurve()
    const road = buildRoad(curve)
    this.routeLine = road.lineMat
    s.add(road.group)
    progress(0.45)
    await nextFrame()

    s.add(buildVegetation({ route: routeSamples2D(curve, 700) }, this.uniforms))
    progress(0.7)
    await nextFrame()

    const b = buildBuildings(this.uniforms)
    this.updateSmoke = b.updateSmoke
    s.add(b.group)
    const clouds = buildClouds()
    this.updateClouds = clouds.update
    s.add(clouds.group)
    progress(0.82)
    await nextFrame()

    const m = buildMarkers()
    this.markers = m.markers
    s.add(m.group)
    this.vehicles = new VehicleRig(curve)
    s.add(this.vehicles.group)
    progress(0.9)

    this.bind()
  }

  private bind() {
    const el = this.dom
    el.addEventListener('pointerdown', this.onDown)
    window.addEventListener('pointermove', this.onMove)
    window.addEventListener('pointerup', this.onUp)
    el.addEventListener('wheel', this.onWheel, { passive: false })
  }

  private onDown = (e: PointerEvent) => {
    if (!this.interactive) return
    this.dragging = true
    this.moved = 0
    this.downAt.set(e.clientX, e.clientY)
    this.velocity.set(0, 0)
    this.dom.style.cursor = 'grabbing'
  }

  private onMove = (e: PointerEvent) => {
    this.pointer.set(e.clientX, e.clientY)
    this.pointerNdc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
    if (!this.dragging || !this.interactive) return
    const dx = e.movementX
    const dy = e.movementY
    this.moved += Math.abs(dx) + Math.abs(dy)
    const k = this.rig.distance * 0.0016
    this.rig.target.x -= dx * k
    this.rig.target.z -= dy * k * 1.35
    this.velocity.set(dx * k, dy * k * 1.35)
    this.clampTarget()
  }

  private onUp = () => {
    if (!this.dragging) return
    this.dragging = false
    this.dom.style.cursor = this.hovered ? 'pointer' : 'grab'
    if (this.moved < 6 && this.hovered) this.events.onSelect(this.hovered.stop.id)
  }

  private onWheel = (e: WheelEvent) => {
    if (!this.interactive) return
    e.preventDefault()
    this.rig.distance = THREE.MathUtils.clamp(this.rig.distance * (1 + e.deltaY * 0.0011), 40, 200)
  }

  private clampTarget() {
    this.rig.target.x = THREE.MathUtils.clamp(this.rig.target.x, -48, 48)
    this.rig.target.z = THREE.MathUtils.clamp(this.rig.target.z, -30, 30)
  }

  /** Intro: the route draws itself while the camera settles into place. */
  intro() {
    const tl = gsap.timeline()
    tl.to(this.routeLine.uniforms.uReveal, { value: 1, duration: 3.4, ease: 'alt.inOut' }, 0.6)
    return tl
  }

  flyTo(id: string, panelOpen: boolean) {
    const s = STOPS.find((x) => x.id === id)
    if (!s) return
    this.flying = true
    const offsetX = panelOpen && window.innerWidth > 900 ? 9 : 0
    const offsetZ = panelOpen && window.innerWidth <= 900 ? 6 : 0
    gsap.to(this.rig.target, {
      x: s.x + offsetX,
      y: heightAt(s.x, s.z),
      z: s.z + offsetZ,
      duration: 1.6,
      ease: 'alt.inOut',
      onComplete: () => {
        this.flying = false
      },
    })
    gsap.to(this.rig, { distance: 46, polar: 0.92, duration: 1.6, ease: 'alt.inOut' })
  }

  /** Jump the damped camera straight to its target pose. */
  snap() {
    this.cur.target.copy(this.rig.target)
    this.cur.distance = this.rig.distance
    this.cur.polar = this.rig.polar
    this.cur.azimuth = this.rig.azimuth
  }

  zoomOut() {
    gsap.to(this.rig, { distance: 162, polar: 0.86, duration: 1.4, ease: 'alt.inOut' })
    gsap.to(this.rig.target, { y: 4, duration: 1.4, ease: 'alt.inOut' })
  }

  setCollected(ids: string[]) {
    for (const m of this.markers) {
      const v = ids.includes(m.stop.id)
      if (m.sprite.userData.collected !== v) {
        m.sprite.userData.collected = v
        m.setCollected(v)
      }
    }
  }

  swapVehicle(id: VehicleId) {
    this.vehicles?.swap(id)
  }

  /** Project a stop's pin to screen pixels (for DOM hover cards). */
  project(id: string, out: { x: number; y: number }) {
    const m = this.markers.find((k) => k.stop.id === id)
    if (!m) return false
    const v = m.sprite.position.clone()
    v.y += m.sprite.scale.y
    v.project(this.camera)
    out.x = (v.x * 0.5 + 0.5) * window.innerWidth
    out.y = (-v.y * 0.5 + 0.5) * window.innerHeight
    return v.z < 1
  }

  resize(aspect: number) {
    this.camera.aspect = aspect
    this.camera.fov = aspect < 1 ? 46 : 30
    this.camera.updateProjectionMatrix()
  }

  private pick() {
    if (!this.interactive || this.dragging) return
    this.raycaster.setFromCamera(this.pointerNdc, this.camera)
    const hits = this.raycaster.intersectObjects(
      this.markers.map((m) => m.sprite),
      false,
    )
    const hit = hits[0] ? this.markers.find((m) => m.sprite === hits[0].object) ?? null : null
    if (hit !== this.hovered) {
      this.hovered = hit
      this.dom.style.cursor = hit ? 'pointer' : 'grab'
      this.events.onHover(hit ? hit.stop.id : null)
    }
  }

  update(t: number, dt: number) {
    this.uniforms.uTime.value = t
    ;(this.river.material as THREE.ShaderMaterial).uniforms.uTime.value = t
    this.routeLine.uniforms.uTime.value = t

    // inertia after drag release
    if (!this.dragging && !this.flying && this.velocity.lengthSq() > 1e-6) {
      this.rig.target.x -= this.velocity.x
      this.rig.target.z -= this.velocity.y
      this.velocity.multiplyScalar(Math.exp(-dt * 5))
      this.clampTarget()
    }

    // damped camera
    const k = 1 - Math.exp(-dt * 4)
    this.cur.target.lerp(this.rig.target, k)
    this.cur.distance += (this.rig.distance - this.cur.distance) * k
    this.cur.polar += (this.rig.polar - this.cur.polar) * k
    const az = this.rig.azimuth + (this.interactive ? this.pointerNdc.x * 0.04 : 0)
    this.cur.azimuth += (az - this.cur.azimuth) * k
    const { target, distance, polar, azimuth } = this.cur
    this.camera.position.set(
      target.x + Math.sin(azimuth) * Math.sin(polar) * distance,
      target.y + Math.cos(polar) * distance,
      target.z + Math.cos(azimuth) * Math.sin(polar) * distance,
    )
    this.camera.lookAt(target)

    // markers bob + hover scale
    for (const m of this.markers) {
      const isHover = this.hovered === m
      m.hover += ((isHover ? 1 : 0) - m.hover) * (1 - Math.exp(-dt * 10))
      const base = m.stop.kind === 'stop' ? 4.4 : 3.2
      const sc = base * (1 + m.hover * 0.22)
      m.sprite.scale.set(sc * 0.8, sc, 1)
      m.sprite.position.y = m.base.y + Math.sin(t * 2 + m.base.x) * 0.18 + m.hover * 0.4
      const pulse = (t * 0.6 + m.base.x * 0.1) % 1
      m.ring.scale.setScalar(1 + pulse * 1.4)
      ;(m.ring.material as THREE.MeshBasicMaterial).opacity = (1 - pulse) * 0.75
    }

    this.vehicles.update(t, dt)
    this.updateSmoke(dt)
    this.updateClouds(dt)
    this.pick()
  }
}
