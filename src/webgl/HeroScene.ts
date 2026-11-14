import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { NOISE } from './shaders/chunks'
import { fbm2, mulberry32, ridged2 } from './utils/noise'

/*
  Hero (3D fallback): a dawn over the Andes, built entirely from layered ridge
  silhouettes with aerial perspective, valley fog, drifting mist sheets,
  wax palms and a few birds. The camera slowly dollies forward with pointer
  parallax — standing in for the filmed road of the original reference.
*/

const LAYER_VERT = /* glsl */ `
attribute vec3 color;
varying vec3 vColor;
varying float vY;
void main() {
  vColor = color;
  vec4 wp = modelMatrix * vec4(position, 1.);
  vY = wp.y;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`
const LAYER_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vY;
uniform vec3 uMist;
uniform float uMistHeight;
uniform float uMistAmount;
void main() {
  float fog = smoothstep(uMistHeight + 5., uMistHeight - 7., vY) * uMistAmount;
  vec3 col = mix(vColor, uMist, fog);
  gl_FragColor = vec4(col, 1.);
  #include <colorspace_fragment>
}
`

const SKY_FRAG = /* glsl */ `
varying vec3 vWorld;
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uSun;
uniform vec3 uSunPos;
${NOISE}
void main() {
  float y = clamp((vWorld.y + 10.) / 200., 0., 1.);
  vec3 col = mix(uHorizon, uMid, smoothstep(0., .25, y));
  col = mix(col, uTop, smoothstep(.2, .85, y));
  float d = length(vWorld.xy - uSunPos.xy);
  col += uSun * (exp(-d / 26.) * .9 + exp(-d / 110.) * .35);
  // soft high clouds
  float c = fbm(vWorld.xy * vec2(.006, .02) + vec2(3., 1.));
  col = mix(col, uHorizon * 1.05, smoothstep(.55, .8, c) * .35 * smoothstep(.15, .6, y));
  gl_FragColor = vec4(col, 1.);
  #include <colorspace_fragment>
}
`
const SKY_VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const MIST_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`
const MIST_FRAG = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
uniform float uTime;
uniform float uSpeed;
uniform float uOpacity;
uniform float uSeed;
uniform vec3 uColor;
${NOISE}
void main() {
  vec2 p = vWorld.xy * vec2(.018, .05) + vec2(uTime * uSpeed, uSeed);
  float n = fbm(p) ;
  n = smoothstep(.35, .78, n + fbm(p * 2.3 - uTime * uSpeed * .6) * .25);
  float v = smoothstep(0., .35, vUv.y) * smoothstep(1., .45, vUv.y);
  float h = smoothstep(0., .12, vUv.x) * smoothstep(1., .88, vUv.x);
  float a = n * v * h * uOpacity;
  gl_FragColor = vec4(uColor, a);
  #include <colorspace_fragment>
}
`

type LayerDef = {
  z: number
  width: number
  base: number
  amp: number
  freq: number
  seed: number
  body: string
  rim: string
  mistHeight: number
  mistAmount: number
}

const LAYERS: LayerDef[] = [
  { z: -190, width: 900, base: 34, amp: 46, freq: 0.006, seed: 11, body: '#C9CBC1', rim: '#F1DDBE', mistHeight: 30, mistAmount: 0.75 },
  { z: -140, width: 680, base: 22, amp: 38, freq: 0.008, seed: 23, body: '#A9B5AA', rim: '#E7CFA8', mistHeight: 20, mistAmount: 0.8 },
  { z: -98, width: 500, base: 12, amp: 30, freq: 0.011, seed: 37, body: '#7D9383', rim: '#D5BB8C', mistHeight: 12, mistAmount: 0.75 },
  { z: -64, width: 340, base: 4, amp: 22, freq: 0.016, seed: 41, body: '#55705B', rim: '#B5A06C', mistHeight: 4, mistAmount: 0.7 },
  { z: -36, width: 220, base: -3, amp: 14, freq: 0.024, seed: 53, body: '#36523D', rim: '#7E7C48', mistHeight: -3, mistAmount: 0.55 },
  { z: -12, width: 140, base: -8, amp: 7, freq: 0.04, seed: 67, body: '#203A2A', rim: '#495C30', mistHeight: -9, mistAmount: 0.35 },
]

function profile(x: number, def: LayerDef) {
  const r = ridged2(x * def.freq + def.seed, def.seed * 0.37, 5)
  const f = fbm2(x * def.freq * 3 + def.seed * 2, 4.2, 3)
  return def.base + def.amp * (r * 0.85 + f * 0.35)
}

export class HeroScene {
  scene = new THREE.Scene()
  camera: THREE.PerspectiveCamera
  private mists: THREE.ShaderMaterial[] = []
  private birds: { g: THREE.Group; l: THREE.Mesh; r: THREE.Mesh; speed: number; phase: number }[] = []
  private pointer = new THREE.Vector2()
  private smooth = new THREE.Vector2()
  /** 0 = rest, 1 = pushed into the mist (transition) */
  push = { value: 0 }
  private baseZ = 34

  constructor() {
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.5, 1200)
    this.camera.position.set(0, 6, this.baseZ)
    this.buildSky()
    LAYERS.forEach((def, i) => this.buildLayer(def, i))
    this.buildMists()
    this.buildBirds()
    window.addEventListener('pointermove', this.onPointer)
  }

  private onPointer = (e: PointerEvent) => {
    this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1))
  }

  private buildSky() {
    const mat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color('#8FB2C2') },
        uMid: { value: new THREE.Color('#E9CBA2') },
        uHorizon: { value: new THREE.Color('#F7E2C0') },
        uSun: { value: new THREE.Color('#FFD7A0') },
        uSunPos: { value: new THREE.Vector3(-70, 52, -260) },
      },
    })
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(2200, 900), mat)
    sky.position.set(0, 220, -280)
    sky.renderOrder = -10
    this.scene.add(sky)
  }

  private buildLayer(def: LayerDef, i: number) {
    const N = 360
    const pos: number[] = []
    const col: number[] = []
    const idx: number[] = []
    const body = new THREE.Color(def.body)
    const rim = new THREE.Color(def.rim)
    const deep = body.clone().multiplyScalar(0.82)
    const bottom = -80
    for (let s = 0; s <= N; s++) {
      const x = -def.width / 2 + (def.width * s) / N
      const y = profile(x, def)
      // rim light on the crest, fading down into the body colour
      pos.push(x, y, 0, x, y - 3.5 - i * 0.6, 0, x, bottom, 0)
      col.push(rim.r, rim.g, rim.b, body.r, body.g, body.b, deep.r, deep.g, deep.b)
      if (s < N) {
        const a = s * 3
        const b = (s + 1) * 3
        idx.push(a, a + 1, b, b, a + 1, b + 1, a + 1, a + 2, b + 1, b + 1, a + 2, b + 2)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    geo.setIndex(idx)
    const mat = new THREE.ShaderMaterial({
      vertexShader: LAYER_VERT,
      fragmentShader: LAYER_FRAG,
      uniforms: {
        uMist: { value: new THREE.Color('#F2E4CC') },
        uMistHeight: { value: def.mistHeight },
        uMistAmount: { value: def.mistAmount },
      },
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.z = def.z
    this.scene.add(mesh)

    // vegetation on the nearest ridges
    if (i >= 4) this.scatterBushes(def, i)
    if (i === 3 || i === 4) this.scatterPalms(def, i)
  }

  private scatterBushes(def: LayerDef, i: number) {
    const rnd = mulberry32(def.seed * 13)
    const count = i === 5 ? 520 : 420
    const geo = new THREE.IcosahedronGeometry(1, 1)
    const mat = new THREE.MeshBasicMaterial({ color: '#ffffff' })
    const mesh = new THREE.InstancedMesh(geo, mat, count)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const c = new THREE.Color()
    const base = new THREE.Color(i === 5 ? '#1F3826' : '#34503A')
    for (let k = 0; k < count; k++) {
      const x = -def.width / 2 + rnd() * def.width
      const y = profile(x, def)
      const s = (i === 5 ? 0.42 : 0.36) * (0.6 + rnd() * 1.1)
      q.setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3))
      m.compose(new THREE.Vector3(x, y - s * 0.35, def.z + 0.5 + rnd()), q, new THREE.Vector3(s * 1.3, s, s))
      mesh.setMatrixAt(k, m)
      c.copy(base).offsetHSL(0, 0, (rnd() - 0.5) * 0.05)
      mesh.setColorAt(k, c)
    }
    this.scene.add(mesh)
  }

  private scatterPalms(def: LayerDef, i: number) {
    const rnd = mulberry32(def.seed * 7)
    const color = new THREE.Color(i === 3 ? '#4C6754' : '#2F4A36')
    const mat = new THREE.MeshBasicMaterial({ color })
    const parts: THREE.BufferGeometry[] = []
    const trunk = new THREE.CylinderGeometry(0.12, 0.2, 14, 5)
    trunk.translate(0, 7, 0)
    parts.push(trunk)
    for (let f = 0; f < 7; f++) {
      const leaf = new THREE.ConeGeometry(0.35, 4.2, 3)
      leaf.translate(0, 2.1, 0)
      leaf.rotateZ(Math.PI / 2.3)
      leaf.rotateY((f / 7) * Math.PI * 2)
      leaf.translate(0, 14, 0)
      parts.push(leaf)
    }
    const geo = mergeGeometries(parts)!
    const count = i === 3 ? 9 : 6
    for (let k = 0; k < count; k++) {
      const x = -def.width * 0.35 + rnd() * def.width * 0.7
      const palm = new THREE.Mesh(geo, mat)
      const s = (i === 3 ? 0.9 : 1.15) * (0.75 + rnd() * 0.5)
      palm.scale.setScalar(s)
      palm.rotation.z = (rnd() - 0.5) * 0.12
      palm.position.set(x, profile(x, def) - 1.5, def.z + 0.4)
      this.scene.add(palm)
    }
  }

  private buildMists() {
    const zs = [-170, -120, -84, -52, -26, -4]
    zs.forEach((z, i) => {
      const def = LAYERS[Math.min(i, LAYERS.length - 1)]
      const mat = new THREE.ShaderMaterial({
        vertexShader: MIST_VERT,
        fragmentShader: MIST_FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uSpeed: { value: 0.012 + i * 0.006 },
          uOpacity: { value: i === 5 ? 0.0 : 0.55 + i * 0.05 },
          uSeed: { value: i * 4.7 },
          uColor: { value: new THREE.Color('#F6EBD8') },
        },
      })
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(def.width * 1.1, 46), mat)
      plane.position.set(0, def.base + 4, z)
      this.scene.add(plane)
      this.mists.push(mat)
    })
  }

  private buildBirds() {
    const wing = new THREE.BufferGeometry()
    wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.18, 0, 0, 0.18, 1.1, 0.15, 0], 3))
    wing.computeVertexNormals()
    const mat = new THREE.MeshBasicMaterial({ color: '#3B3A33', side: THREE.DoubleSide })
    const rnd = mulberry32(9)
    for (let k = 0; k < 7; k++) {
      const g = new THREE.Group()
      const l = new THREE.Mesh(wing, mat)
      const r = new THREE.Mesh(wing, mat)
      r.scale.x = -1
      g.add(l, r)
      g.position.set(-60 + rnd() * 50, 18 + rnd() * 10, -50 - rnd() * 30)
      g.scale.setScalar(0.9 + rnd() * 0.5)
      this.scene.add(g)
      this.birds.push({ g, l, r, speed: 2.2 + rnd() * 1.5, phase: rnd() * 6 })
    }
  }

  resize(aspect: number) {
    this.camera.aspect = aspect
    // keep the composition on portrait screens
    this.camera.fov = aspect < 1 ? 52 : 36
    this.camera.updateProjectionMatrix()
  }

  update(t: number, dt: number) {
    this.smooth.lerp(this.pointer, 1 - Math.exp(-dt * 2.5))
    const push = this.push.value
    const idle = Math.sin(t * 0.05) * 2.5
    this.camera.position.set(
      this.smooth.x * 2.2,
      6 + this.smooth.y * 0.9 - push * 3,
      this.baseZ - idle - push * 62,
    )
    this.camera.lookAt(this.smooth.x * 0.8, 8 + this.smooth.y * 0.4 - push * 4, -120)
    this.mists.forEach((m, i) => {
      m.uniforms.uTime.value = t
      if (i === this.mists.length - 1) m.uniforms.uOpacity.value = push * 0.95
    })
    for (const b of this.birds) {
      b.g.position.x += b.speed * dt
      if (b.g.position.x > 70) b.g.position.x = -70
      const flap = Math.sin(t * 7 + b.phase) * 0.6
      b.l.rotation.z = flap
      b.r.rotation.z = -flap
      b.g.position.y += Math.sin(t * 1.3 + b.phase) * 0.01
    }
  }

  dispose() {
    window.removeEventListener('pointermove', this.onPointer)
  }
}
