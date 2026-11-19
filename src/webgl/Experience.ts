import * as THREE from 'three'
import { gsap } from '../lib/ease'
import { HeroScene } from './HeroScene'
import { HERO_IMAGES, PhotoHero } from './PhotoHero'

/**
 * Hero background: 'route' | 'mountain' use the photos in /public,
 * '3d' uses the procedural mountain scene (HeroScene).
 */
const HERO_BACKGROUND: keyof typeof HERO_IMAGES | '3d' = 'machu'
import { MapScene, type MapEvents } from './MapScene'
import { BURN, FULLSCREEN_VERT, NOISE } from './shaders/chunks'

/*
  Composite pass.
  Scene A (hero) and scene B (map) render into their own targets; this pass
  roasts A away into B with the burn field, applies tilt-shift blur to the
  diorama (miniature look), a warm vignette and film grain.
*/
const COMPOSITE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tA;
uniform sampler2D tB;
uniform vec2 uRes;
uniform float uAspect;
uniform float uTime;
uniform float uProgress;
uniform float uSeed;
uniform float uTilt;
uniform float uBlurAll;
uniform vec3 uChar;
uniform vec3 uEmber;
uniform vec3 uVignette;
${NOISE}
${BURN}

vec3 sampleB(vec2 uv) {
  float d = abs(uv.y - .52);
  float b = max(smoothstep(.1, .5, d) * uTilt, uBlurAll);
  vec3 acc = textureLod(tB, uv, 0.).rgb;
  if (b < .01) return acc;
  float w = 1.;
  for (int i = 0; i < 20; i++) {
    float fi = float(i);
    float r = sqrt((fi + .5) / 20.) * b * 9.;
    float a = fi * 2.39996;
    vec2 o = vec2(cos(a), sin(a)) * r / uRes;
    acc += textureLod(tB, uv + o, 0.).rgb;
    w += 1.;
  }
  return acc / w;
}

void main() {
  vec2 uv = vUv;
  vec3 col;
  if (uProgress <= 0.) {
    col = texture2D(tA, uv).rgb;
  } else if (uProgress >= 1.) {
    col = sampleB(uv);
  } else {
    vec3 burn = burnField(uv, uAspect, uProgress, uSeed);
    // heat shimmer near the burning edge
    vec2 warp = vec2(vnoise(uv * 40. + uTime * 3.), vnoise(uv * 40. - uTime * 3.)) - .5;
    vec3 a = texture2D(tA, uv + warp * burn.z * .01).rgb;
    vec3 b = sampleB(uv);
    col = mix(a, b, burn.x);
    col = mix(col, uChar, burn.y * .88);
    col += uEmber * burn.z * 1.5;
  }

  // vignette + grain
  vec2 p = (uv - .5) * vec2(uAspect, 1.);
  float v = smoothstep(.45, 1.25, length(p));
  col = mix(col, col * uVignette, v * .55);
  col += (hash12(uv * uRes + fract(uTime * 13.) * 100.) - .5) * .035;

  gl_FragColor = vec4(col, 1.);
  #include <colorspace_fragment>
}
`

export class Experience {
  renderer: THREE.WebGLRenderer
  hero: HeroScene | PhotoHero = HERO_BACKGROUND === '3d' ? new HeroScene() : new PhotoHero(HERO_IMAGES[HERO_BACKGROUND])
  map: MapScene
  private rtA: THREE.WebGLRenderTarget
  private rtB: THREE.WebGLRenderTarget
  private post: THREE.ShaderMaterial
  private postScene = new THREE.Scene()
  private postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private timer = new THREE.Timer()
  private hasSize = false
  private mode: 'hero' | 'transition' | 'map' = 'hero'
  onFrame: (() => void) | null = null
  /** Skip rendering while a full-screen page covers the canvas. */
  paused = false

  constructor(public canvas: HTMLCanvasElement, events: MapEvents) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    const opts: THREE.RenderTargetOptions = { type: THREE.HalfFloatType, samples: 4 }
    this.rtA = new THREE.WebGLRenderTarget(1, 1, opts)
    this.rtB = new THREE.WebGLRenderTarget(1, 1, opts)

    this.post = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: COMPOSITE_FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tA: { value: this.rtA.texture },
        tB: { value: this.rtB.texture },
        uRes: { value: new THREE.Vector2(1, 1) },
        uAspect: { value: 1 },
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uSeed: { value: 4.2 },
        uTilt: { value: 1.0 },
        uBlurAll: { value: 1.6 },
        uChar: { value: new THREE.Color('#2A170E') },
        uEmber: { value: new THREE.Color('#FF8A3D') },
        uVignette: { value: new THREE.Color('#7A5236') },
      },
    })
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post))

    this.map = new MapScene(canvas, events)
    this.resize()
    window.addEventListener('resize', this.resize)
  }

  async init(progress: (p: number) => void) {
    // pin numbers are drawn into canvases: make sure their font is ready first
    const [, , photoOk] = await Promise.all([
      document.fonts.load('800 100px Barlow').catch(() => null),
      document.fonts.load('900 100px "Centra No2"').catch(() => null),
      this.hero instanceof PhotoHero ? this.hero.load() : Promise.resolve(true),
    ])
    // missing hero photo → fall back to the procedural Andes scene
    if (!photoOk) {
      this.hero = new HeroScene()
      this.hero.resize(window.innerWidth / Math.max(1, window.innerHeight))
    }
    progress(0.05)
    const t0 = performance.now()
    await this.map.build((p) => progress(0.05 + p * 0.85))
    if (import.meta.env.DEV) console.info(`[world] built in ${Math.round(performance.now() - t0)}ms`)
    // warm up shaders so the transition never hitches
    this.renderer.compile(this.hero.scene, this.hero.camera)
    this.renderer.compile(this.map.scene, this.map.camera)
    if (this.hasSize) {
      this.renderer.setRenderTarget(this.rtB)
      this.renderer.render(this.map.scene, this.map.camera)
      this.renderer.setRenderTarget(null)
    }
    progress(1)
    this.renderer.setAnimationLoop(this.tick)
  }

  resize = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    // a hidden/collapsed viewport reports 0 — skip until it has real size
    this.hasSize = w > 0 && h > 0
    if (!this.hasSize) return
    this.renderer.setSize(w, h, false)
    const pr = this.renderer.getPixelRatio()
    this.rtA.setSize(Math.floor(w * pr), Math.floor(h * pr))
    this.rtB.setSize(Math.floor(w * pr), Math.floor(h * pr))
    this.post.uniforms.uRes.value.set(w * pr, h * pr)
    this.post.uniforms.uAspect.value = w / h
    this.hero.resize(w / h)
    this.map.resize(w / h)
  }

  /** Background half of the hero reveal (the DOM half lives in Hero.tsx). */
  heroIntro() {
    if (this.hero instanceof PhotoHero) this.hero.intro()
  }

  /** Hero → map: push into the mist, roast the frame away, land on the diorama. */
  goToMap() {
    const u = this.post.uniforms
    this.mode = 'transition'
    const tl = gsap.timeline({
      onComplete: () => {
        this.mode = 'map'
        this.map.interactive = true
      },
    })
    tl.to(this.hero.push, { value: 1, duration: 2.2, ease: 'alt.in' }, 0)
    tl.to(u.uProgress, { value: 1, duration: 2.6, ease: 'alt.out' }, 0.9)
    tl.to(u.uBlurAll, { value: 0, duration: 2.6, ease: 'alt.out' }, 1.4)
    tl.add(this.map.intro(), 1.2)
    return tl
  }

  /** Skip straight to the map (dev shortcut: ?map). */
  jumpToMap() {
    this.post.uniforms.uProgress.value = 1
    this.post.uniforms.uBlurAll.value = 0
    this.mode = 'map'
    this.map.interactive = true
    this.map.intro().progress(1)
    this.map.snap()
  }

  private tick = (time: number) => {
    this.timer.update(time)
    if (!this.hasSize) return this.resize()
    if (this.paused) return
    const dt = Math.min(this.timer.getDelta(), 1 / 20)
    const t = this.timer.getElapsed()
    this.post.uniforms.uTime.value = t
    const r = this.renderer

    if (this.mode !== 'map') {
      this.hero.update(t, dt)
      r.setRenderTarget(this.rtA)
      r.render(this.hero.scene, this.hero.camera)
    }
    if (this.mode !== 'hero') {
      this.map.update(t, dt)
      r.setRenderTarget(this.rtB)
      r.render(this.map.scene, this.map.camera)
    }
    r.setRenderTarget(null)
    r.render(this.postScene, this.postCam)
    this.onFrame?.()
  }
}
