import * as THREE from 'three'
import { gsap } from '../lib/ease'
import { BURN, FULLSCREEN_VERT, NOISE } from './shaders/chunks'

/*
  Loader veil.
  A flat paper-coloured sheet printed with the topographic pattern
  (public/pattern-alt.png), faded out towards the edges. When loading completes
  it is "roasted" away with the same fbm burn used for the hero → map
  transition, revealing the site beneath.
*/
const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uAspect;
uniform float uProgress;
uniform float uPattern;
uniform float uSeed;
uniform sampler2D uPatternTex;
uniform float uTexAspect;
uniform vec3 uPaper;
uniform vec3 uLine;
uniform vec3 uChar;
uniform vec3 uEmber;
${NOISE}
${BURN}

void main() {
  vec2 p = (vUv - .5) * vec2(uAspect, 1.);

  // pattern image, "contain"-fitted into ~94% of the viewport with a slow breathe
  float ph = min(.94, .94 * uAspect / uTexAspect);
  vec2 size = vec2(ph * uTexAspect, ph) * (1. + sin(uTime * .25) * .012);
  vec2 tuv = p / size + .5; // TextureLoader flips Y, so +y is the image top
  float inside = step(0., tuv.x) * step(tuv.x, 1.) * step(0., tuv.y) * step(tuv.y, 1.);
  float lineA = texture2D(uPatternTex, clamp(tuv, 0., 1.)).a * inside;
  float mask = smoothstep(.82, .12, length(p * vec2(.78, 1.1)));
  float ink = lineA * mask * uPattern * .26;

  vec3 col = mix(uPaper, uLine, ink);
  // paper grain
  col *= .985 + hash12(vUv * 913.7 + fract(uTime)) * .03;

  vec3 b = burnField(vUv, uAspect, uProgress, uSeed);
  float alpha = 1. - b.x;
  col = mix(col, uChar, b.y * .9);
  col += uEmber * b.z * 1.6;
  alpha = max(alpha, b.z * .9);

  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
  gl_FragColor.rgb *= gl_FragColor.a;
}
`

export class LoaderOverlay {
  renderer: THREE.WebGLRenderer
  scene = new THREE.Scene()
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  material: THREE.ShaderMaterial
  private running = true
  private timer = new THREE.Timer()

  constructor(public canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    this.material = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: FRAG,
      transparent: true,
      blending: THREE.NoBlending,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uAspect: { value: 1 },
        uProgress: { value: 0 },
        uPattern: { value: 0 },
        uSeed: { value: Math.random() * 10 },
        uPatternTex: { value: null },
        uTexAspect: { value: 1301 / 807 },
        uPaper: { value: new THREE.Color('#EDE3CC') },
        uLine: { value: new THREE.Color('#5A3A26') },
        uChar: { value: new THREE.Color('#2A170E') },
        uEmber: { value: new THREE.Color('#FF8A3D') },
      },
    })
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material))
    this.resize()
    window.addEventListener('resize', this.resize)
    // the pattern fades in once its texture is ready
    const u = this.material.uniforms
    new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}pattern-alt.png`, (tex) => {
      tex.minFilter = THREE.LinearMipmapLinearFilter
      tex.anisotropy = 4
      u.uPatternTex.value = tex
      u.uTexAspect.value = tex.image.width / tex.image.height
      if (this.running) gsap.to(u.uPattern, { value: 1, duration: 2, ease: 'alt.out' })
    })
    this.renderer.setAnimationLoop(this.tick)
  }

  resize = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    if (!w || !h) return
    this.renderer.setSize(w, h, false)
    this.material.uniforms.uAspect.value = w / h
  }

  tick = (time: number) => {
    if (!this.running) return
    this.timer.update(time)
    this.material.uniforms.uTime.value = this.timer.getElapsed()
    this.renderer.render(this.scene, this.camera)
  }

  /** Fades the contour pattern, then burns the veil away. */
  dissolve({ delay = 0.35, duration = 2.2, onStart }: { delay?: number; duration?: number; onStart?: () => void } = {}) {
    const u = this.material.uniforms
    gsap.to(u.uPattern, { value: 0, duration: 1.1, ease: 'alt.inOut' })
    return gsap
      .to(u.uProgress, { value: 1, duration, delay, ease: 'alt.out', onStart })
      .then(() => this.dispose())
  }

  dispose() {
    this.running = false
    this.renderer.setAnimationLoop(null)
    window.removeEventListener('resize', this.resize)
    this.material.dispose()
    this.renderer.dispose()
    this.canvas.style.display = 'none'
  }
}
