import * as THREE from 'three'
import { FULLSCREEN_VERT, NOISE } from './shaders/chunks'

/*
  Photo hero.
  A still image rendered inside WebGL (so the roast-burn transition can eat it),
  "cover"-fitted, with a slow Ken Burns drift, pointer parallax, drifting dust
  and — on transition — a zoom-blur push into the image's vanishing point.
*/
const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uReady;
uniform float uAspect;
uniform float uTexAspect;
uniform float uTime;
uniform float uPush;
uniform vec2 uParallax;
uniform vec2 uFocus;
uniform vec3 uTint;
${NOISE}

vec2 coverUv(vec2 uv, float zoom, vec2 focus) {
  vec2 s = uAspect > uTexAspect ? vec2(1., uTexAspect / uAspect) : vec2(uAspect / uTexAspect, 1.);
  vec2 p = (uv - .5) * s / zoom;
  return focus + p;
}

void main() {
  // Ken Burns: slow breathing zoom; the push dives into the focus point
  float zoom = 1.06 + sin(uTime * .05) * .025 + uPush * uPush * 1.6;
  vec2 focus = mix(vec2(.5) + uParallax * .012, uFocus, smoothstep(0., .6, uPush));
  vec2 uv = coverUv(vUv, zoom, focus);

  // zoom blur grows with the push
  vec2 dir = (uv - focus);
  float strength = uPush * .09;
  vec3 col = vec3(0.);
  for (int i = 0; i < 12; i++) {
    float t = float(i) / 11.;
    col += texture2D(uTex, clamp(uv - dir * strength * t, 0., 1.)).rgb;
  }
  col /= 12.;

  // drifting dust / heat haze
  float dust = fbm(vUv * vec2(3., 1.5) + vec2(uTime * .02, 0.));
  col += uTint * smoothstep(.55, .9, dust) * .06;

  // soften the centre band so the cream title reads, keep a warm vignette
  float band = smoothstep(.42, 0., abs(vUv.y - .52));
  col *= 1. - band * .14;
  vec2 v = (vUv - .5) * vec2(uAspect, 1.);
  col *= 1. - smoothstep(.55, 1.3, length(v)) * .35;
  // fade towards warm haze at the end of the push
  col = mix(col, uTint, smoothstep(.55, 1., uPush) * .55);

  col = mix(uTint, col, uReady);
  gl_FragColor = vec4(col, 1.);
  #include <colorspace_fragment>
}
`

export type HeroImage = {
  src: string
  /** vanishing point to push into, in UV space (0,0 = bottom-left) */
  focus: [number, number]
}

export const HERO_IMAGES = {
  route: { src: 'route.jpg', focus: [0.512, 0.42] },
  mountain: { src: 'mountain.jpg', focus: [0.72, 0.38] },
} satisfies Record<string, HeroImage>

export class PhotoHero {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera()
  push = { value: 0 }
  private mat: THREE.ShaderMaterial
  private pointer = new THREE.Vector2()
  private smooth = new THREE.Vector2()

  constructor(private image: HeroImage) {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTex: { value: null },
        uReady: { value: 0 },
        uAspect: { value: 1 },
        uTexAspect: { value: 16 / 9 },
        uTime: { value: 0 },
        uPush: { value: 0 },
        uParallax: { value: new THREE.Vector2() },
        uFocus: { value: new THREE.Vector2(...image.focus) },
        uTint: { value: new THREE.Color('#F2D9B4') },
      },
    })
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat)
    quad.frustumCulled = false
    this.scene.add(quad)
    window.addEventListener('pointermove', this.onPointer)
  }

  /** Resolves once the image is uploaded, so the loader can wait for it. */
  load() {
    const src = `${import.meta.env.BASE_URL}${this.image.src}`
    return new Promise<void>((resolve) => {
      new THREE.TextureLoader().load(
        src,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace
          tex.minFilter = THREE.LinearMipmapLinearFilter
          tex.anisotropy = 8
          this.mat.uniforms.uTex.value = tex
          this.mat.uniforms.uTexAspect.value = tex.image.width / tex.image.height
          this.mat.uniforms.uReady.value = 1
          resolve()
        },
        undefined,
        () => resolve(),
      )
    })
  }

  private onPointer = (e: PointerEvent) => {
    this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1))
  }

  resize(aspect: number) {
    this.mat.uniforms.uAspect.value = aspect
  }

  update(t: number, dt: number) {
    this.smooth.lerp(this.pointer, 1 - Math.exp(-dt * 2.5))
    const u = this.mat.uniforms
    u.uTime.value = t
    u.uPush.value = this.push.value
    ;(u.uParallax.value as THREE.Vector2).copy(this.smooth)
  }
}
