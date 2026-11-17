import * as THREE from 'three'

/*
  Photo slider whose transitions use the same liquid noise edge as LiquidFill
  (Codegrid's IronHill technique): the next photo floods in sideways
  (left → right; right → left when going back) behind an organic fbm edge, with a slow
  settle zoom. Renders on demand only.
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
uniform sampler2D uA;
uniform sampler2D uB;
uniform vec2 uSizeA;
uniform vec2 uSizeB;
uniform vec2 uRes;
uniform float uProgress;
uniform float uDir;
uniform float uZoomA;
uniform float uZoomB;
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

// object-fit: cover, around the centre, with a zoom factor
vec2 cover(vec2 uv, vec2 img, float zoom) {
  float rs = uRes.x / uRes.y;
  float ri = img.x / img.y;
  vec2 s = rs > ri ? vec2(1., ri / rs) : vec2(rs / ri, 1.);
  return (uv - .5) * s / zoom + .5;
}

void main() {
  vec3 a = texture2D(uA, cover(vUv, uSizeA, uZoomA)).rgb;
  vec3 b = texture2D(uB, cover(vUv, uSizeB, uZoomB)).rgb;

  float aspect = uRes.x / uRes.y;
  vec2 c = (vUv - .5) * vec2(aspect, 1.);
  // the edge sweeps left → right (next) or right → left (previous)
  float x = uDir > 0. ? vUv.x : 1. - vUv.x;
  float d = x - uProgress * 1.3 + fbm(c * 15.) * uSpread;
  float px = 1. / uRes.x;
  float m = 1. - smoothstep(-px, px, d);

  gl_FragColor = vec4(mix(a, b, m), 1.);
}
`

export class LiquidSlider {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private material: THREE.ShaderMaterial
  private textures: THREE.Texture[] = []
  private ro: ResizeObserver
  private current = 0
  private tween: { kill: () => void } | null = null

  constructor(
    private canvas: HTMLCanvasElement,
    srcs: string[],
    private animate: (o: { p: number; z: number }, onUpdate: () => void, onComplete: () => void) => { kill: () => void },
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    const blank = new THREE.DataTexture(new Uint8Array([42, 26, 18, 255]), 1, 1)
    blank.needsUpdate = true
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uA: { value: blank },
        uB: { value: blank },
        uSizeA: { value: new THREE.Vector2(1, 1) },
        uSizeB: { value: new THREE.Vector2(1, 1) },
        uRes: { value: new THREE.Vector2(1, 1) },
        uProgress: { value: 0 },
        uDir: { value: 1 },
        uZoomA: { value: 1.08 },
        uZoomB: { value: 1.08 },
        uSpread: { value: 0.5 },
      },
    })
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material))

    // photos stay in sRGB (no colour-space decode) so the shader can pass them straight out
    const loader = new THREE.TextureLoader()
    srcs.forEach((src, i) => {
      this.textures[i] = loader.load(src, (t) => {
        t.minFilter = THREE.LinearFilter
        t.generateMipmaps = false
        if (i === this.current) this.show(i)
        else this.render()
      })
    })

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(canvas)
    this.resize()
  }

  private size(i: number) {
    const img = this.textures[i]?.image as HTMLImageElement | undefined
    return img?.width ? new THREE.Vector2(img.width, img.height) : new THREE.Vector2(1, 1)
  }

  /** Shows a slide instantly. */
  private show(i: number) {
    const u = this.material.uniforms
    u.uA.value = this.textures[i]
    u.uSizeA.value = this.size(i)
    u.uProgress.value = 0
    this.render()
  }

  /** Floods in slide `i`; dir 1 sweeps left → right, -1 right → left. */
  goTo(i: number, dir: 1 | -1) {
    if (i === this.current) return
    const u = this.material.uniforms
    this.tween?.kill()
    // if a transition was mid-way, the incoming photo becomes the new base
    if (u.uProgress.value > 0.5) {
      u.uA.value = u.uB.value
      u.uSizeA.value = u.uSizeB.value
      u.uZoomA.value = u.uZoomB.value
    }
    u.uB.value = this.textures[i]
    u.uSizeB.value = this.size(i)
    u.uDir.value = dir
    this.current = i
    const o = { p: 0, z: 1.22 }
    this.tween = this.animate(
      o,
      () => {
        u.uProgress.value = o.p
        u.uZoomB.value = o.z
        this.render()
      },
      () => {
        u.uA.value = u.uB.value
        u.uSizeA.value = u.uSizeB.value
        u.uZoomA.value = u.uZoomB.value
        u.uProgress.value = 0
        this.render()
      },
    )
  }

  private resize() {
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    if (!w || !h) return
    this.renderer.setSize(w, h, false)
    this.material.uniforms.uRes.value.set(w, h)
    this.render()
  }

  private render() {
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.tween?.kill()
    this.ro.disconnect()
    this.textures.forEach((t) => t.dispose())
    this.material.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
  }
}
