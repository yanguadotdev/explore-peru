import * as THREE from 'three'

/*
  Scroll-driven "liquid" fill: a flat colour rises from the bottom of the
  screen behind an organic fbm edge (technique from Codegrid's IronHill scroll
  animation). It only renders when its progress or size changes — no loop.
*/

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0., 1.);
}
`

const FRAG = /* glsl */ `
precision highp float;
uniform float uProgress;
uniform vec2 uResolution;
uniform vec3 uColor;
uniform float uSpread;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(vec3(p, 1.), vec3(37.1, 61.7, 12.4))) * 3758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f *= f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
}

float fbm(vec2 p) {
  return noise(p) * .5 + noise(p * 2.) * .25 + noise(p * 4.) * .125;
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 c = (vUv - .5) * vec2(aspect, 1.);
  float d = vUv.y - uProgress * 1.2 + fbm(c * 15.) * uSpread;
  float px = 1. / uResolution.y;
  float a = 1. - smoothstep(-px, px, d);
  gl_FragColor = vec4(uColor * a, a);
}
`

export class LiquidFill {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private material: THREE.ShaderMaterial
  private ro: ResizeObserver

  constructor(
    private canvas: HTMLCanvasElement,
    color: string,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    // keep the hex in sRGB: the shader writes it straight to the canvas
    const c = new THREE.Color().setStyle(color, THREE.SRGBColorSpace).getRGB({ r: 0, g: 0, b: 0 }, THREE.SRGBColorSpace)
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      blending: THREE.NoBlending,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uProgress: { value: 0 },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uColor: { value: new THREE.Vector3(c.r, c.g, c.b) },
        uSpread: { value: 0.5 },
      },
    })
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material))
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(canvas)
    this.resize()
  }

  set progress(v: number) {
    if (v === this.material.uniforms.uProgress.value) return
    this.material.uniforms.uProgress.value = v
    this.render()
  }

  private resize() {
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    if (!w || !h) return
    this.renderer.setSize(w, h, false)
    this.material.uniforms.uResolution.value.set(w, h)
    this.render()
  }

  private render() {
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.ro.disconnect()
    this.material.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
  }
}
