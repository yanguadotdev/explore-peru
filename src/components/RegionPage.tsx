import Lenis from 'lenis'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { regionPhotos } from '../data/regionPhotos'
import { STOPS, type Stop } from '../data/stops'
import { audio } from '../lib/audio'
import { gsap } from '../lib/ease'
import { getExperience } from '../lib/experience'
import { store, useStore } from '../lib/store'
import { LiquidFill } from '../webgl/LiquidFill'
import { LiquidSlider } from '../webgl/LiquidSlider'
import { LoaderOverlay } from '../webgl/LoaderOverlay'
import { Arrow, Close, Mark } from './Icons'
import { Stamp } from './Stamp'
import s from './RegionPage.module.css'

gsap.registerPlugin(ScrollTrigger)

/*
  Region page — replaces the old side panel. Mirrors the Route 66 state pages:
  paper loader with a counter → burn dissolve into a full-bleed hero → on scroll
  the hero folds away like a postcard, a giant headline rises word by word, a
  brown "liquid" fill with an organic noise edge floods the screen (IronHill
  technique) and the headline reappears in cream among floating photos, a story card that grows to full screen into a slider, nearby detours and a
  tilted card that leads to the next region.
*/

const STAGE_COPY: Record<Stop['stage'], { label: string }> = {
  Costa: { label: 'Región de la Costa' },
  Sierra: { label: 'Región de los Andes' },
  Selva: { label: 'Región de la Amazonía' },
}

const fmt = (n: number) => n.toLocaleString('es')

// ------------------------------------------------------------------ helpers

const near = (stop: Stop, n: number) =>
  STOPS.filter((o) => o.id !== stop.id)
    .map((o) => ({ o, d: Math.hypot(o.x - stop.x, o.z - stop.z) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.o)

const neighbourOf = (id: string, dir: 1 | -1) => {
  const i = STOPS.findIndex((x) => x.id === id)
  return STOPS[(i + dir + STOPS.length) % STOPS.length]
}

/** Resolves once the image is decoded, or after `timeout` ms at the latest (never blocks the loader). */
const decode = (src: string, timeout = 2500) =>
  new Promise<void>((resolve) => {
    const img = new Image()
    img.src = src
    img.decode().then(() => resolve(), () => resolve())
    window.setTimeout(resolve, timeout)
  })

/** Splits a string into masked words for line-by-line reveals. */
function Words({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className} aria-label={text}>
      {text.split(' ').map((w, i) => (
        <span key={i} className={s.wordMask} aria-hidden="true">
          <span className={s.word} data-word>
            {w}
          </span>
        </span>
      ))}
    </span>
  )
}

/**
 * Paints the text of `root` (and the Peru flag marks) into a canvas the size of
 * `frame`, at the exact positions the DOM lays them out — a WebGL twin of the
 * headline that the liquid edge can mask pixel-perfectly.
 */
function rasterize(root: HTMLElement, frame: HTMLElement) {
  const box = frame.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio, 2)
  const c = document.createElement('canvas')
  c.width = Math.round(box.width * dpr)
  c.height = Math.round(box.height * dpr)
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const raw = n.textContent ?? ''
    if (!raw.trim() || !n.parentElement) continue
    const cs = getComputedStyle(n.parentElement)
    const text = (cs.textTransform === 'uppercase' ? raw.toUpperCase() : raw).trim()
    range.selectNodeContents(n)
    const r = range.getBoundingClientRect()
    g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    g.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing
    g.fillStyle = cs.color
    g.textBaseline = 'alphabetic'
    const m = g.measureText(text)
    const y = r.top - box.top + (r.height - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent
    // collapsed whitespace is not part of the range box: it starts at the first glyph
    g.fillText(text, r.left - box.left, y)
  }
  root.querySelectorAll('svg.peru-flag').forEach((svg) => {
    const r = svg.getBoundingClientRect()
    const x = r.left - box.left
    const y = r.top - box.top
    const w = r.width / 3
    g.fillStyle = '#D91023'
    g.fillRect(x, y, w, r.height)
    g.fillRect(x + 2 * w, y, w, r.height)
    g.fillStyle = '#FFFFFF'
    g.fillRect(x + w, y, w, r.height)
  })
  return c
}

/** Plain word spans for scroll-scrubbed, word-by-word opacity reveals. */
function FadeWords({ text }: { text: string }) {
  const words = text.split(' ')
  return (
    <>
      {words.map((w, i) => (
        <span key={i} data-fw>
          {w}
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </>
  )
}

// ------------------------------------------------------------------ page

/** Loader route: a hand-drawn road (viewBox 510 × 148). */
const ROUTE_D =
  'M.233 146.084c3.233.776 10.81.282 15.257-7.894 5.558-10.22 11.736-10.808 14.156-10.829s12.955 5.777 22.332 1.949 10.174-4.906 13.666-5.204 3.99-5.12 5.59-6.473c1.602-1.352 4.55-2.448 9.679-.083 5.128 2.365 16.686 1.997 22.851-.197s9.965 2.055 14.809 2.549 8.334-.072 11.56-.1c3.226-.027 3.235 1.043 5.926 1.288 2.69.244 6.167-1.927 8.299-4.087s5.094-1.65 8.32-1.678 8.019-5.423 11.24-5.986 7.25-1.133 9.115-3.023 4.276-2.981 8.872-.077c4.595 2.905 9.988 4.733 16.413 1.465 6.424-3.267 10.415-8.12 18.246-4.172s5.703 6.642 15.101 5.223 8.324-1.142 11.567.703c3.242 1.846 8.072.734 11.291-.097s12.067-3.584 15.036-2.271 7.796-.067 9.664-1.69c1.495-1.297 4.387-.573 5.646-.048 5.304 1.917 18.595 5.14 29.328 2.691 13.417-3.06 11.519-4.917 12.307-7.065s4.253-5.658 6.132-5.942c1.504-.227 3.661-1.549 4.552-2.181l4.301-.037c2.591-1.004 8.473-2.643 11.282-1.168s14.713-8.604 20.314-13.827c2.134-1.981 8.172-6.388 15.254-8.162 8.854-2.218 19.042-5.518 21.357-17.584 2.316-12.065 12.905-31.162 20.394-35.777s7.787-1.138 9.4-1.152 2.679-1.094 5.376-.046c2.698 1.047 23.472 9.434 26.402 6.197 2.929-3.238 5.071-4.327 8.287-5.426 3.217-1.098 4.049 1.84 10.154-7.314 4.884-7.324 14.897-7.98 19.294-7.394'

const SECTIONS = [
  { id: 'welcome', label: 'Bienvenida' },
  { id: 'stories', label: 'Historias' },
  { id: 'detours', label: 'Desvíos' },
] as const

export function RegionPage() {
  const openId = useStore((st) => st.openStop)
  const [regionId, setRegionId] = useState<string | null>(null)
  const [loaderId, setLoaderId] = useState<string | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const loader = useRef<HTMLDivElement>(null)
  const counter = useRef<HTMLSpanElement>(null)
  const veil = useRef<{ overlay: LoaderOverlay; canvas: HTMLCanvasElement } | null>(null)
  const vanTween = useRef<gsap.core.Tween | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const lenis = useRef<Lenis | null>(null)
  const intro = useRef<gsap.core.Timeline | null>(null)
  const shown = useRef<string | null>(null)
  const seq = useRef<gsap.core.Timeline | null>(null)

  // ------------------------------------------------ open / switch / close
  useLayoutEffect(() => {
    const exp = getExperience()
    const el = root.current
    const ld = loader.current
    if (!el || !ld) return

    if (openId && openId !== shown.current) {
      const fromMap = shown.current === null
      shown.current = openId
      setLoaderId(openId)
      seq.current?.kill()

      // where the paper wipe starts: the clicked pin, or the screen centre
      const o = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
      if (fromMap && exp) {
        exp.map.diveTo(openId)
        exp.map.setSelected(openId)
        const p = { x: 0, y: 0 }
        if (exp.map.project(openId, p)) Object.assign(o, p)
        audio.play('whoosh')
      } else audio.play('click')

      const hero = regionPhotos(openId).hero
      const ready = decode(hero)
      const count = { v: 0 }
      gsap.set(el, { autoAlpha: 1, yPercent: 0, rotate: 0, scale: 1, borderRadius: 0 })
      gsap.set(ld, { autoAlpha: 1, backgroundColor: 'var(--paper)', clipPath: `circle(0% at ${o.x}px ${o.y}px)` })
      gsap.set(ld.querySelectorAll('[data-ld], [data-route-svg]'), { autoAlpha: 1 })
      if (counter.current) counter.current.textContent = '0'
      startVeil()
      startVan()
      const reveal = ld.querySelector('[data-route-reveal]')
      const progress = ld.querySelector('[data-route-progress]')
      // both clip rects grow from the right edge, so the road loads right → left
      gsap.set([reveal, progress], { attr: { x: 510, width: 0 } })

      const tl = gsap.timeline()
      seq.current = tl
      tl.to(ld, { clipPath: `circle(150% at ${o.x}px ${o.y}px)`, duration: fromMap ? 1.15 : 0.9, ease: 'alt.inOut' }, fromMap ? 0.45 : 0)
        .add(() => {
          // the map is fully covered: stop rendering it and mount the new page
          if (exp) exp.paused = true
          setRegionId(openId)
          lenis.current?.scrollTo(0, { immediate: true })
        })
        .fromTo(ld.querySelectorAll('[data-ld]'), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'alt.out' }, '<-0.35')
        // the dashed route draws in, then the solid line follows the counter
        .to(reveal, { attr: { x: 0, width: 510 }, duration: 1.1, ease: 'alt.inOut' }, '<')
        .to(count, {
          v: 100,
          duration: 1.9,
          ease: 'power2.inOut',
          onUpdate: () => {
            if (counter.current) counter.current.textContent = String(Math.round(count.v))
            gsap.set(progress, { attr: { x: 510 - (510 * count.v) / 100, width: (510 * count.v) / 100 } })
          },
        }, '<0.2')
        .add(() => {
          tl.pause()
          ready.then(() => tl.play())
        })
        .add(() => burnAway())
    } else if (!openId && shown.current) {
      shown.current = null
      seq.current?.kill()
      vanTween.current?.kill()
      stopVeil()
      exp && (exp.paused = false)
      exp?.map.zoomOut()
      exp?.map.setSelected(null)
      store.set({ hovered: null })
      audio.play('whoosh')
      // the page folds into a tilted card and drops away, revealing the map
      seq.current = gsap
        .timeline({
          onComplete: () => {
            setRegionId(null)
            setLoaderId(null)
            gsap.set(el, { autoAlpha: 0 })
          },
        })
        .to(el, { scale: 0.86, rotate: -3, borderRadius: 28, duration: 0.5, ease: 'alt.inOut' })
        .to(el, { yPercent: 110, rotate: -7, duration: 0.6, ease: 'alt.in' }, 0.3)
    }

    /** The same paper + topographic pattern as the site loader (WebGL). */
    function startVeil() {
      if (!ld) return
      stopVeil()
      const c = document.createElement('canvas')
      c.className = s.veil
      ld.prepend(c)
      veil.current = { overlay: new LoaderOverlay(c), canvas: c }
    }

    function stopVeil() {
      veil.current?.overlay.dispose()
      veil.current?.canvas.remove()
      veil.current = null
    }

    /** Van driving away: 11-frame sprite atlas (4 × 3 grid), looping. */
    function startVan() {
      const van = ld?.querySelector<HTMLElement>('[data-van]')
      if (!van) return
      vanTween.current?.kill()
      const fr = { f: 0 }
      vanTween.current = gsap.to(fr, {
        f: 11,
        duration: 11 / 14,
        ease: 'none',
        repeat: -1,
        onUpdate: () => {
          const i = Math.min(10, Math.floor(fr.f))
          van.style.backgroundPosition = `${((i % 4) * 100) / 3}% ${Math.floor(i / 4) * 50}%`
        },
      })
    }

    function burnAway() {
      if (!ld) return
      const v = veil.current
      // the content fades, then the patterned paper burns away revealing the page
      gsap.to(ld.querySelectorAll('[data-ld], [data-route-svg]'), { autoAlpha: 0, duration: 0.35, ease: 'alt.in' })
      gsap.delayedCall(0.3, () => {
        vanTween.current?.kill()
        gsap.set(ld, { backgroundColor: 'transparent' })
        if (!v) {
          gsap.set(ld, { autoAlpha: 0 })
          intro.current?.play(0)
          return
        }
        veil.current = null
        v.overlay.dissolve({ delay: 0, duration: 1.7, onStart: () => intro.current?.play(0) }).then(() => {
          v.canvas.remove()
          gsap.set(ld, { autoAlpha: 0 })
        })
      })
    }
  }, [openId])

  // ------------------------------------------------ smooth scroll + scroll scenes
  useLayoutEffect(() => {
    const sc = scroller.current
    const ct = content.current
    if (!regionId || !sc || !ct) return
    const stop = STOPS.find((x) => x.id === regionId)!
    sc.scrollTop = 0
    // smooth, inertial wheel scrolling inside the page (Lenis drives the wrapper's scrollTop)
    const l = new Lenis({ wrapper: sc, content: ct, lerp: 0.075, wheelMultiplier: 0.9, touchMultiplier: 1.4, smoothWheel: true })
    lenis.current = l
    l.on('scroll', ScrollTrigger.update)
    const raf = (t: number) => l.raf(t * 1000)
    gsap.ticker.add(raf)

    const liquids: LiquidFill[] = []
    const cleanups: (() => void)[] = []
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(ct)
      const vh = () => window.innerHeight

      // ---- hero intro (played when the burn starts)
      const it = gsap.timeline({ paused: true, defaults: { ease: 'alt.out' } })
      it.fromTo(q('[data-hero-img]'), { scale: 1.35 }, { scale: 1.08, duration: 2.6 }, 0)
        .fromTo(q('[data-hero-title] [data-char]'), { yPercent: 110, rotate: 8 }, { yPercent: 0, rotate: 0, duration: 1.2, stagger: 0.045 }, 0.35)
        .fromTo(q('[data-hero-kicker]'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.9 }, 0.55)
        .fromTo(q('[data-hero-side]'), { autoAlpha: 0, x: (i) => (i ? 30 : -30) }, { autoAlpha: 1, x: 0, duration: 0.9 }, 0.9)
        .fromTo(q('[data-hero-cue]'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 1.1)
        .fromTo(q('[data-pagehead]'), { yPercent: -100 }, { yPercent: 0, duration: 1 }, 0.6)
        .fromTo(q('[data-fab]'), { autoAlpha: 0, y: 30, rotate: 6 }, { autoAlpha: 1, y: 0, rotate: -2, duration: 0.9, ease: 'back.out(1.6)' }, 1.2)
      const stamp = q('[data-stamp]')[0]
      if (stamp && stop.kind === 'stop') {
        const already = store.get().collected.includes(stop.id)
        it.fromTo(stamp, { autoAlpha: 0, scale: already ? 1 : 2.4, rotate: -40 }, {
          autoAlpha: 1,
          scale: 1,
          rotate: -12,
          duration: already ? 0.4 : 0.6,
          ease: 'back.out(1.6)',
          onStart: () => {
            if (!already) audio.play('stamp')
          },
          onComplete: () => {
            const c = store.get().collected
            if (!c.includes(stop.id)) {
              const next = [...c, stop.id]
              store.set({ collected: next })
              getExperience()?.map.setCollected(next)
            }
          },
        }, 1.4)
      }
      intro.current = it
      // already revealed (e.g. a re-render) → jump to the end state
      if (gsap.getProperty(q('[data-hero-title] [data-char]')[0], 'yPercent') === 0) it.progress(1)

      // ---- stage: hero → postcard → headline (word by word) → liquid brown fill → photos
      const stage = q('[data-stage]')[0]
      const coverCanvas = q('[data-liquid]')[0] as HTMLCanvasElement
      const liquid = new LiquidFill(coverCanvas, '#ede3cc', true)
      const creamHead = q('[data-cream-head]')[0]
      const brown = q('[data-brown]')[0]
      const sticky = stage.querySelector<HTMLElement>('[data-sticky]')!
      // swap the DOM cream headline for its WebGL twin while the liquid is on screen
      let covering = false
      let rasterSize = ''
      const ensureRaster = () => {
        const size = `${window.innerWidth}x${window.innerHeight}`
        if (size === rasterSize) return
        rasterSize = size
        liquid.setTexture(rasterize(creamHead, sticky))
      }
      const setCovering = (on: boolean) => {
        if (on === covering) return
        covering = on
        if (on) ensureRaster()
        gsap.set(creamHead, { autoAlpha: on ? 0 : 1 })
        gsap.set([brown, coverCanvas], { autoAlpha: on ? 1 : 0 })
      }
      const onResize = () => {
        rasterSize = ''
        if (covering) ensureRaster()
      }
      window.addEventListener('resize', onResize)
      cleanups.push(() => window.removeEventListener('resize', onResize))
      // a second, cream flood closes the section and hands over to the stories
      const liquidOut = new LiquidFill(q('[data-liquid-out]')[0] as HTMLCanvasElement, '#ede3cc')
      liquids.push(liquid, liquidOut)
      const fill = { p: 0 }
      const fillOut = { p: 0 }
      const st = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: stage, scroller: sc, start: 'top top', end: 'bottom bottom', scrub: true } })
      // Route 66 pacing: the postcard tilts and shrinks a little, then rides up with the
      // scroll while the headline follows right underneath it (a constant gap, never touching)
      const T = 0.6
      st.to(q('[data-hero]'), { scale: 0.88, rotate: -5, borderRadius: 18, duration: 0.3, ease: 'power1.out' }, 0)
        .to(q('[data-hero]'), { yPercent: -118, duration: 1 }, 0)
        .to(q('[data-hero-ui]'), { autoAlpha: 0, duration: 0.2 }, 0)
        .fromTo(q('[data-cream-head]'), { autoAlpha: 1, y: () => vh() * 1.02 }, { y: 0, duration: 1 }, 0)
        // cream headline: each word fades in as it comes up
        .fromTo(q('[data-cream-head] [data-kick]'), { autoAlpha: 0.15 }, { autoAlpha: 1, duration: 0.2 }, 0.45)
        .fromTo(q('[data-cream-head] [data-fw]'), { opacity: 0.15 }, { opacity: 1, duration: 0.1, stagger: { amount: 0.45 } }, 0.5)
        // the brown floods up behind a noisy, liquid edge; the headline stays put and
        // simply changes colour under it (cream sheet in WebGL over the brown DOM layer)
        .to(fill, {
          p: 1.3,
          duration: 1.2,
          ease: 'power1.inOut',
          onUpdate: () => {
            setCovering(fill.p > 0.001)
            liquid.progress = fill.p
          },
        }, T + 0.85)
      // the photos ride up with (and only show inside) the brown
      q('[data-float]').forEach((f, i) => {
        const speed = [1, 1.5, 0.8, 1.25, 1.1][i % 5]
        st.fromTo(f, { y: () => vh() * 0.6 * speed, rotate: (i % 2 ? 6 : -6) }, { y: () => -vh() * 0.3 * speed, rotate: i % 2 ? -3 : 3, duration: 2.2 }, T + 0.85)
      })
      // end of the section: the cream rises over the brown with the same liquid edge
      // (linear and quick, so it stays ahead of the stories heading that scrolls in over it)
      st.to(fillOut, { p: 1.3, duration: 0.8, onUpdate: () => (liquidOut.progress = fillOut.p) }, T + 2.6)

      // ---- stories heading
      gsap.fromTo(q('[data-stories-head] [data-word]'), { yPercent: 110 }, {
        yPercent: 0,
        duration: 1,
        stagger: 0.05,
        ease: 'alt.out',
        scrollTrigger: { trigger: q('[data-stories-head]')[0], scroller: sc, start: 'top 75%' },
      })
      gsap.fromTo(q('[data-stories-head] [data-fade]'), { autoAlpha: 0, y: 20 }, {
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'alt.out',
        scrollTrigger: { trigger: q('[data-stories-head]')[0], scroller: sc, start: 'top 70%' },
      })

      // ---- story card grows to full screen
      const grow = q('[data-grow]')[0]
      // keep the element itself: function values are re-evaluated on refresh/revert,
      // even while the page content is being unmounted
      const card = q('[data-card]')[0] as HTMLElement | undefined
      const edge = () => (card?.offsetWidth ?? 0) * 0.24
      gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: grow, scroller: sc, start: 'top top', end: 'bottom bottom', scrub: true } })
        .fromTo(q('[data-card]'), { clipPath: 'inset(30% 24% 16% 24% round 28px)', rotate: -4, y: () => vh() * 0.08 }, { clipPath: 'inset(0% 0% 0% 0% round 22px)', rotate: 0, y: 0, duration: 1 }, 0)
        .fromTo(q('[data-card-zoom] [data-photo]'), { scale: 1.25 }, { scale: 1, duration: 1 }, 0)
        .fromTo(q('[data-slider-ui]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 0.35)
        // the arrows ride the card's clipped edges (24% each side → 0), so they are never cut off
        .fromTo(q('[data-slider-ui] [data-side="l"]'), { x: () => edge() }, { x: 0, duration: 1 }, 0)
        .fromTo(q('[data-slider-ui] [data-side="r"]'), { x: () => -edge() }, { x: 0, duration: 1 }, 0)

      // ---- detours + next
      q('[data-detour]').forEach((row) => {
        gsap.timeline({ scrollTrigger: { trigger: row, scroller: sc, start: 'top 78%' }, defaults: { ease: 'alt.out' } })
          .fromTo(row.querySelector('[data-detour-img]'), { clipPath: 'inset(100% 0% 0% 0% round 22px)' }, { clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 1.2 }, 0)
          .fromTo(row.querySelector('[data-detour-img] img'), { scale: 1.3 }, { scale: 1, duration: 1.6 }, 0)
          .fromTo(row.querySelectorAll('[data-fade]'), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08 }, 0.25)
      })
      gsap.fromTo(q('[data-next-card]'), { rotate: 9, y: 120, scale: 0.9 }, {
        rotate: -4,
        y: 0,
        scale: 1,
        ease: 'none',
        scrollTrigger: { trigger: q('[data-next]')[0], scroller: sc, start: 'top bottom', end: 'center center', scrub: true },
      })

      // ---- page header progress
      const bar = q('[data-progress]')[0]
      ScrollTrigger.create({
        trigger: ct,
        scroller: sc,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => bar && gsap.set(bar, { scaleX: self.progress }),
      })
      SECTIONS.forEach((sec, i) => {
        ScrollTrigger.create({
          trigger: q(`[data-sec="${sec.id}"]`)[0],
          scroller: sc,
          start: 'top 50%',
          end: 'bottom 50%',
          onToggle: (self) => {
            if (self.isActive) q('[data-nav]').forEach((n, j) => n.classList.toggle(s.navOn, j <= i))
          },
        })
      })
    }, ct)

    ScrollTrigger.refresh()
    return () => {
      ctx.revert()
      liquids.forEach((l) => l.dispose())
      cleanups.forEach((c) => c())
      intro.current = null
      gsap.ticker.remove(raf)
      l.destroy()
      lenis.current = null
    }
  }, [regionId])

  const stop = STOPS.find((x) => x.id === regionId)
  const loading = STOPS.find((x) => x.id === loaderId)

  return (
    <div className={s.root} ref={root} style={{ visibility: 'hidden' }} aria-hidden={!stop} role="dialog" aria-label={stop ? `Región ${stop.name}` : undefined}>
      <div className={s.page}>
        <div className={s.scroller} ref={scroller} data-scroller>
          <div ref={content}>{stop && <RegionContent key={stop.id} stop={stop} lenis={lenis} />}</div>
        </div>
      </div>

      {/* paper loader: patterned paper (WebGL canvas prepended at runtime), van, counter, route */}
      <div className={s.loader} ref={loader} style={{ visibility: 'hidden' }} aria-hidden="true">
        <div className={s.loaderCenter}>
          <span className={s.loaderVan} data-ld data-van />
          <span className={s.loaderCount} data-ld>
            <span ref={counter}>0</span>
          </span>
          <span className={s.loaderLabel} data-ld>
            Bienvenido <span className="script">a</span> {loading?.name}
          </span>
        </div>
        <svg className={s.loaderRoute} viewBox="0 0 510 148" preserveAspectRatio="none" data-route-svg>
          <defs>
            <clipPath id="loader-route-reveal" clipPathUnits="userSpaceOnUse">
              <rect x="0" y="0" width="0" height="148" data-route-reveal />
            </clipPath>
            <clipPath id="loader-route-progress" clipPathUnits="userSpaceOnUse">
              <rect x="0" y="0" width="0" height="148" data-route-progress />
            </clipPath>
          </defs>
          <path className={s.routeBase} d={ROUTE_D} clipPath="url(#loader-route-reveal)" />
          <path className={s.routeLine} d={ROUTE_D} clipPath="url(#loader-route-progress)" />
        </svg>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ content

function RegionContent({ stop, lenis }: { stop: Stop; lenis: React.RefObject<Lenis | null> }) {
  const ph = regionPhotos(stop.id)
  const prev = neighbourOf(stop.id, -1)
  const next = neighbourOf(stop.id, 1)
  const detours = useMemo(() => near(stop, 2), [stop])
  const copy = STAGE_COPY[stop.stage]
  const titleSize = `min(14vw, ${(80 / (stop.name.length * 0.66)).toFixed(2)}vw)`
  const go = (id: string) => store.set({ openStop: id })
  const scrollTo = (id: string) => {
    const el = document.querySelector(`[data-sec="${id}"]`) as HTMLElement | null
    if (el) lenis.current?.scrollTo(el, { duration: 1.6 })
  }

  return (
    <>
      {/* ---- page header */}
      <header className={s.head} data-pagehead>
        <div className={s.headLeft}>
          <img src={ph.hero} alt="" className={s.headThumb} />
          <span className={s.headName}>
            <em>Explorando</em>
            {stop.name}
          </span>
        </div>
        <nav className={s.headNav} aria-label="Secciones">
          <span className={s.headTrack}>
            <span className={s.headFill} data-progress />
          </span>
          {SECTIONS.map((sec) => (
            <button key={sec.id} className={s.headLink} data-nav onClick={() => scrollTo(sec.id)}>
              <i />
              {sec.label}
            </button>
          ))}
        </nav>
        <button className={s.headBack} onClick={() => store.set({ openStop: null })}>
          <span>Volver al mapa</span>
          <Close size={14} />
        </button>
      </header>

      {/* ---- stage: hero, cream headline, liquid brown fill */}
      <section className={s.stage} data-stage data-sec="welcome">
        <div className={s.sticky} data-sticky>
          <div className={s.creamHead} data-cream-head>
            <span className={s.kicker} data-kick>
              <Mark size={16} /> Bienvenido <span className="script">a</span> {stop.name}
            </span>
            <h2 className={s.giant} aria-label={stop.teaser}>
              <FadeWords text={stop.teaser} />
            </h2>
          </div>

          <div className={s.hero} data-hero>
            <img src={ph.hero} alt={`${stop.name}, Perú`} className={s.heroImg} data-hero-img />
            <div className={s.heroShade} />
            <div className={s.heroCenter}>
              <span className={s.heroKicker} data-hero-kicker>
                <Mark size={18} />
                <span className="script">Bienvenido a</span>
                <small>{copy.label}</small>
              </span>
              <h1 className={s.heroTitle} data-hero-title style={{ fontSize: titleSize }} aria-label={stop.name}>
                {[...stop.name].map((ch, i) => (
                  <span key={i} className={s.charMask} aria-hidden="true">
                    <span data-char>{ch === ' ' ? ' ' : ch}</span>
                  </span>
                ))}
              </h1>
              {stop.kind === 'stop' && (
                <div className={s.heroStamp} data-stamp style={{ visibility: 'hidden' }}>
                  <Stamp stop={stop} collected size={112} />
                </div>
              )}
            </div>
            <div className={s.heroUi} data-hero-ui>
              <button className={`${s.side} ${s.sideL}`} data-hero-side onClick={() => go(prev.id)}>
                <span className={s.sideBtn}>
                  <span className={s.flip}>
                    <Arrow size={16} />
                  </span>
                </span>
                <span>
                  <em>Anterior</em>
                  {prev.name}
                </span>
              </button>
              <button className={`${s.side} ${s.sideR}`} data-hero-side onClick={() => go(next.id)}>
                <span>
                  <em>Siguiente</em>
                  {next.name}
                </span>
                <span className={s.sideBtn}>
                  <Arrow size={16} />
                </span>
              </button>
              <div className={s.cue} data-hero-cue>
                <span className={s.cueArrows}>
                  <i />
                  <i />
                  <i />
                </span>
                Desliza para explorar
              </div>
            </div>
          </div>

          {/* brown side: always laid out exactly like the cream headline; revealed through the liquid */}
          <div className={s.brown} data-brown style={{ visibility: 'hidden' }}>
            <div className={s.creamHead}>
              <span className={`${s.kicker} ${s.kickerLight}`} data-kick>
                <Mark size={16} /> Bienvenido <span className="script">a</span> {stop.name}
              </span>
              <h2 className={`${s.giant} ${s.giantLight}`} aria-hidden="true">
                <FadeWords text={stop.teaser} />
              </h2>
            </div>
            {[ph.slides[0], ph.hero, ph.slides[1], ph.slides[2], ph.slides[0]].map((src, i) => (
              <figure key={i} className={`${s.float} ${s[`float${i}`]}`} data-float>
                <img src={src} alt="" loading="lazy" />
              </figure>
            ))}
          </div>

          {/* cream side in WebGL (paper + the headline in ink), eaten away by the liquid edge */}
          <canvas className={s.liquid} data-liquid aria-hidden="true" style={{ visibility: 'hidden' }} />

          <canvas className={s.liquid} data-liquid-out aria-hidden="true" />
        </div>
      </section>

      {/* ---- stories */}
      <section className={s.stories} data-sec="stories">
        <div className={s.storiesHead} data-stories-head>
          <span className={`script ${s.storiesScript}`} data-fade>
            Imperdibles en {stop.name}
          </span>
          <h2 className={s.storiesTitle}>
            <Words text="Historias" />
            <br />
            <Words text="del camino" />
          </h2>
          <p data-fade>{stop.note.replace(/^Imperdible:\s*/, 'Imperdible: ')}. Tres historias para conocer {stop.name} antes de llegar.</p>
        </div>
        <div className={s.grow} data-grow>
          <div className={s.growSticky}>
            <div className={s.card} data-card>
              <div className={s.cardZoom} data-card-zoom>
                <StorySlider stop={stop} slides={ph.slides} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- detours */}
      <section className={s.detours} data-sec="detours">
        <div className={s.detoursHead}>
          <span className="script">Desvíos</span>
          <h2>Explora también</h2>
        </div>
        {detours.map((d, i) => (
          <article key={d.id} className={`${s.detour} ${i % 2 ? s.detourAlt : ''}`} data-detour>
            <div className={s.detourImg} data-detour-img>
              <img src={regionPhotos(d.id).hero} alt={`${d.name}, Perú`} loading="lazy" />
            </div>
            <div className={s.detourText}>
              <span className="script" data-fade>
                Cerca de {stop.name}
              </span>
              <h3 data-fade>{d.name}</h3>
              <p data-fade>{d.teaser}</p>
              <p className={s.detourMeta} data-fade>
                {d.stage} · Capital: {d.capital} · {fmt(d.altitude)} msnm
              </p>
              <button className={s.pill} data-fade onClick={() => go(d.id)}>
                Visitar {d.name}
                <Arrow size={14} />
              </button>
            </div>
          </article>
        ))}
      </section>

      {/* ---- next region */}
      <section className={s.next} data-next>
        <span className={s.nextKicker}>
          <span className="script">Siguiente</span> región
        </span>
        <button className={s.nextCard} data-next-card onClick={() => go(next.id)}>
          <img src={regionPhotos(next.id).hero} alt="" loading="lazy" />
          <span className={s.nextShade} />
          <span className={s.nextName}>{next.name}</span>
          <span className={s.nextCta}>
            Continuar el viaje <Arrow size={14} />
          </span>
        </button>
        <p className={s.credits}>Fotos: Unsplash (licencia Unsplash). Geografía simplificada con fines ilustrativos.</p>
      </section>

      {/* ---- floating back-to-map button */}
      <button className={s.fab} data-fab onClick={() => store.set({ openStop: null })}>
        <img src={ph.hero} alt="" />
        <span>
          Explorar en <strong>3D</strong>
        </span>
      </button>
    </>
  )
}

// ------------------------------------------------------------------ story slider

function StorySlider({ stop, slides }: { stop: Stop; slides: string[] }) {
  // continuous position along the (infinite) road; the story shown is pos mod n
  const [pos, setPos] = useState(0)
  const n = stop.story.length
  const idx = ((pos % n) + n) % n
  const prevIdx = useRef(0)
  const prevPos = useRef(0)
  const root = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const gl = useRef<LiquidSlider | null>(null)
  const dir = useRef<1 | -1>(1)
  const swipe = useRef<{ x: number; y: number } | null>(null)

  // WebGL photo layer: transitions flood in behind the liquid noise edge
  useLayoutEffect(() => {
    if (!canvas.current) return
    const slider = new LiquidSlider(canvas.current, slides, (o, onUpdate, onComplete) =>
      gsap.to(o, { p: 1, z: 1.08, duration: 1.5, ease: 'alt.inOut', onUpdate, onComplete }),
    )
    gl.current = slider
    return () => {
      slider.dispose()
      gl.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuild only when the photo set changes
  }, [slides.join('|')])

  /** Moves to an absolute road position (prev/next are pos ∓ 1). */
  const go = (target: number) => setPos(target)

  // the photo floods in (WebGL); the old text leaves and the new one rises
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const items = el.querySelectorAll<HTMLElement>('[data-slide]')
    const from = prevIdx.current
    prevIdx.current = idx
    dir.current = pos >= prevPos.current ? 1 : -1
    prevPos.current = pos
    const cur = items[idx]
    const first = from === idx
    const tl = gsap.timeline({ defaults: { ease: 'alt.out' } })
    if (!first) {
      gl.current?.goTo(idx, dir.current)
      tl.to(items[from], { autoAlpha: 0, x: dir.current * 40, duration: 0.45, ease: 'alt.in' }, 0)
    }
    items.forEach((it, i) => i !== idx && i !== from && gsap.set(it, { autoAlpha: 0 }))
    tl.set(cur, { autoAlpha: 1, x: 0 }, first ? 0 : 0.45)
      .fromTo(cur.querySelectorAll('[data-word]'), { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.04 }, first ? 0 : 0.7)
      .fromTo(cur.querySelectorAll('[data-fade]'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08 }, first ? 0.2 : 0.9)
    // progress bar of the active slide; auto-advance when it fills
    const bars = el.querySelectorAll<HTMLElement>('[data-bar]')
    bars.forEach((b, i) => gsap.set(b, { scaleX: i < idx ? 1 : 0 }))
    const run = gsap.fromTo(bars[idx], { scaleX: 0 }, { scaleX: 1, duration: 8, ease: 'none', onComplete: () => go(pos + 1) })
    return () => {
      run.kill()
    }
  }, [pos])

  // swipe / drag sideways to change story
  const onPointerDown = (e: React.PointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const st = swipe.current
    swipe.current = null
    if (!st) return
    const dx = e.clientX - st.x
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - st.y)) go(pos + (dx < 0 ? 1 : -1))
  }

  return (
    <div className={s.slider} ref={root} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      <canvas className={s.sliderGl} ref={canvas} data-photo role="img" aria-label={stop.story[idx].title} />
      <span className={s.slideShade} />
      {stop.story.map((st, i) => (
        <div key={i} className={s.slide} data-slide style={i === 0 ? undefined : { visibility: 'hidden' }}>
          <div className={s.slideText}>
            <span className={s.slideBadge} data-fade>
              <em>Historia</em>
              {String(i + 1).padStart(2, '0')}
            </span>
            <h3>
              <Words text={st.title} />
            </h3>
            <p data-fade>{st.body}</p>
          </div>
        </div>
      ))}
      <div className={s.sliderUi} data-slider-ui>
        <div className={s.bars}>
          {stop.story.map((_, i) => (
            <span key={i}>
              <i data-bar />
            </span>
          ))}
        </div>
        <button className={`${s.side} ${s.sideL}`} data-side="l" onClick={() => go(pos - 1)}>
          <span className={s.sideBtn}>
            <span className={s.flip}>
              <Arrow size={16} />
            </span>
          </span>
          <span>
            <em>Anterior</em>
            historia
          </span>
        </button>
        <button className={`${s.side} ${s.sideR}`} data-side="r" onClick={() => go(pos + 1)}>
          <span>
            <em>Siguiente</em>
            historia
          </span>
          <span className={s.sideBtn}>
            <Arrow size={16} />
          </span>
        </button>
        <StoryTimeline pos={pos} slides={slides} titles={stop.story.map((x) => x.title)} onPick={go} />
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ story timeline (infinite road)

/** Road drawn under the story thumbnails: one segment, repeated forever (viewBox 1987 × 101). */
const ROAD_D =
  'M.252 71c16.667 4.333 54.8 9.128 74-6.072 24-19 37-15 51-11s28 0 32 0 11-7 25-10 11 10 23 10c6.895 0 14.546-3.439 19.916-6.612 3.43-2.027 7.229-3.614 11.182-3.112 6.43.816 15.41 3.385 22.902 9.724 13 11 58 41.007 76 29.003s22-18.006 32-12.003 21 10.007 25 5.003c3.707-4.637 12.569-10.13 21.807-10.91 1.454-.122 2.914.074 4.344.363 25.86 5.227 44.117-.456 53.849-.456 10 0 26-21 47-21s38 10 45 10 21 11 26 11 13-.993 21-5.997c2.925-1.829 5.822-4.424 8.329-7.02 4.532-4.696 10.558-7.983 17.085-7.983h3.586c4.8 0 11.333 6.667 14 10 3.333 3.667 11.8 11 19 11 6.531 0 10.956 3.158 15.95 2.599 4.298-.482 8.399-2.616 12.724-2.545 36.41.598 53.661 5.946 59.326 5.946 6 0 10 12.003 17 12.003s3 10 14 5c10.488-4.767 10.067 1.375 20.408-4.111 1.064-.565 2.065-1.29 2.973-2.083 19.579-17.075 18.821-22.806 27.619-22.806 9 0 14-10.006 24-5.003s20 5 26 11 8 11.003 14 11.003 22 5.004 29 0c5.705-4.077 8.089-6.158 12.565-2.999 2.454 1.732 4.926 3.511 7.749 4.538 12.593 4.584 12.303 5.32 18.958 5.439 3.104.055 6.179.755 8.967 2.122 18.179 8.91 21.099 9.037 25.759 10.9 4.69 1.877 8.51 7.277 17.22 1.323 1.22-.831 2.48-1.663 3.8-2.307 39.08-18.984 42.05-18.12 45.98-24.019 4-6 15-6 23-6s12-.993 19-5.997 4-15.003 12-15.003c2.96 0 5.74 1.421 8.08 3.28 4.37 3.474 9.34 6.72 14.92 6.72h9.68c4.73 0 9.33 1.654 12.74 4.932 7.06 6.788 11.73 12.179 18.06 10.216 4.78-1.481 9.31-4.21 14.31-3.945 26.29 1.39 42.11 9.644 48.82 15.416 1.7 1.463 3.36 2.98 5.31 4.084 12.58 7.096 34.96 17.208 43.08 11.3 3.58-2.6 7.05-4.958 10.12-6.953 6-3.898 13.49-9.244 19.88-6.047 25 13 22 17 30 5s5-6.996 19-12c12.57-4.492 16.27-8.985 24.14-6.233 1.95.681 3.91 1.4 5.95 1.692 10.38 1.478 18.42 1.873 24.42 1.716 8.28-.218 13.85-8.085 19.37-14.27.9-1.008 1.920-2.053 3.090-3.129 1.32-1.212 2.87-2.151 4.48-2.916 20.31-9.593 29.97-18.484 40.55-8.863 11 10 14 4.997 25 10s14-10 26-10 6-6.002 16-10.002 7-10 23-13c7.42-1.39 11.83-3.966 14.3-6.406 2.53-2.495 1.43-6.289 1.48-9.838.05-3.258 2.31-5.448 10.22-1.756 9.37 4.37 21.78 6.183 30.1 6.768 3.85.27 7.57-1.01 11.1-2.56 3.59-1.578 7.67-2.65 10.7-1.723 3.97 1.216 5.83 5.948 9.08 8.546 18.72 14.985 28.49 20.427 34.02 13.973 6-7.004 3 0 13 0s12 5.996 20 5.996 16 5.996 25 0 8-11.993 18-5.996 14 15.998 19 15.998h12.72c5.3 0 10.3-2.234 14.56-5.402 3.3-2.46 7-4.6 9.72-4.6 4.8 0 14 6.668 18 10.002 4.34 3.333 14 10 18 10h32c7 0 29.5 9.572 47 0 9.81-5.365 13.5 15.072 21 17.072'
const ROAD_W = 1987
/** Distance between two thumbnails, in % of the slider width. */
const STEP = 20

/** y of the road (viewBox units) for a horizontal fraction of one segment. */
const roadY = (() => {
  let table: number[] | null = null
  return (fx: number) => {
    if (!table) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('style', 'position:absolute;width:0;height:0;visibility:hidden')
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      p.setAttribute('d', ROAD_D)
      svg.appendChild(p)
      document.body.appendChild(svg)
      const len = p.getTotalLength()
      const pts = Array.from({ length: 800 }, (_, i) => p.getPointAtLength((len * i) / 799))
      svg.remove()
      // y sampled every 1/200 of the width
      table = Array.from({ length: 201 }, (_, i) => {
        const x = (ROAD_W * i) / 200
        let best = pts[0]
        for (const q of pts) if (Math.abs(q.x - x) < Math.abs(best.x - x)) best = q
        return best.y
      })
    }
    return table[Math.max(0, Math.min(200, Math.round(fx * 200)))]
  }
})()

const mod = (a: number, n: number) => ((a % n) + n) % n
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

/**
 * Infinite road of story thumbnails (Route 66 style): segments of the road repeat
 * forever, each thumbnail sits on the curve, the active one stays centred and
 * enlarged, and changing story slides the whole track sideways.
 */
function StoryTimeline({ pos, slides, titles, onPick }: { pos: number; slides: string[]; titles: string[]; onPick: (pos: number) => void }) {
  const n = slides.length
  const track = useRef<HTMLDivElement>(null)
  const placed = useRef(false)

  useLayoutEffect(() => {
    // thumbnail k sits at (k + 0.5) · STEP; keep the active one at the centre
    const x = -(pos + 0.5) * STEP
    if (!placed.current) {
      placed.current = true
      gsap.set(track.current, { xPercent: x })
    } else gsap.to(track.current, { xPercent: x, duration: 1.3, ease: 'alt.inOut', overwrite: true })
  }, [pos])

  const ks = range(pos - 4, pos + 4)
  // the road repeats every 100% (5 steps), independent of how many stories there are
  const segs = range(Math.floor(((pos - 4) * STEP) / 100), Math.floor(((pos + 5) * STEP) / 100))
  return (
    <div className={s.timeline}>
      <div className={s.timelineTrack} ref={track}>
        {segs.map((g) => (
          <svg key={`g${g}`} className={s.timelineRoad} style={{ left: `${g * 100}%`, width: "100%" }} viewBox={`0 0 ${ROAD_W} 101`} preserveAspectRatio="none" aria-hidden="true">
            <path d={ROAD_D} />
          </svg>
        ))}
        {ks.map((k) => {
          const i = mod(k, n)
          return (
            <button
              key={k}
              type="button"
              className={`${s.timelineStep} ${k === pos ? s.timelineOn : ''}`}
              style={{ left: `${(k + 0.5) * STEP}%`, top: roadY(mod((k + 0.5) * STEP, 100) / 100) }}
              onClick={() => onPick(k)}
              aria-label={titles[i]}
              tabIndex={k === pos - 1 || k === pos + 1 ? 0 : -1}
            >
              <img src={slides[i]} alt="" draggable={false} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
