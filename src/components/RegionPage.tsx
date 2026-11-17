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
import { Arrow, Close, Mark, VehicleIcon } from './Icons'
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

const decode = (src: string) =>
  new Promise<void>((resolve) => {
    const img = new Image()
    img.src = src
    img.decode().then(resolve, resolve)
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

const SECTIONS = [
  { id: 'welcome', label: 'Bienvenida' },
  { id: 'stories', label: 'Historias' },
  { id: 'detours', label: 'Desvíos' },
] as const

export function RegionPage() {
  const openId = useStore((st) => st.openStop)
  const vehicle = useStore((st) => st.vehicle)
  const [regionId, setRegionId] = useState<string | null>(null)
  const [loaderId, setLoaderId] = useState<string | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const loader = useRef<HTMLDivElement>(null)
  const counter = useRef<HTMLSpanElement>(null)
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
      gsap.set(ld, { autoAlpha: 1, clipPath: `circle(0% at ${o.x}px ${o.y}px)` })
      if (counter.current) counter.current.textContent = '0'

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
        .fromTo(ld.querySelector('[data-route]'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2, ease: 'alt.inOut' }, '<')
        .to(count, {
          v: 100,
          duration: 1.9,
          ease: 'power2.inOut',
          onUpdate: () => {
            if (counter.current) counter.current.textContent = String(Math.round(count.v))
          },
        }, '<')
        .add(() => {
          tl.pause()
          ready.then(() => tl.play())
        })
        .add(() => burnAway())
    } else if (!openId && shown.current) {
      shown.current = null
      seq.current?.kill()
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

    function burnAway() {
      if (!el || !ld) return
      // a WebGL copy of the paper takes over, then burns away revealing the page
      const c = document.createElement('canvas')
      c.className = s.burn
      el.appendChild(c)
      const veil = new LoaderOverlay(c)
      gsap.delayedCall(0.08, () => {
        gsap.set(ld, { autoAlpha: 0 })
        veil.dissolve({ delay: 0, duration: 1.7, onStart: () => intro.current?.play(0) }).then(() => c.remove())
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
      const liquid = new LiquidFill(q('[data-liquid]')[0] as HTMLCanvasElement, '#7a4a2e')
      // a second, cream flood closes the section and hands over to the stories
      const liquidOut = new LiquidFill(q('[data-liquid-out]')[0] as HTMLCanvasElement, '#ede3cc')
      liquids.push(liquid, liquidOut)
      const fill = { p: 0 }
      const fillOut = { p: 0 }
      const st = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: stage, scroller: sc, start: 'top top', end: 'bottom bottom', scrub: 0.6 } })
      // the headline only starts once the postcard has almost left the screen
      const T = 0.95
      st.to(q('[data-hero]'), { scale: 0.62, rotate: -5, yPercent: -18, borderRadius: 18, duration: 0.6 }, 0)
        .to(q('[data-hero]'), { yPercent: -125, rotate: -9, duration: 0.55, ease: 'power1.in' }, 0.45)
        .to(q('[data-hero-ui]'), { autoAlpha: 0, duration: 0.3 }, 0)
        .fromTo(q('[data-cream-head]'), { autoAlpha: 0, y: () => vh() * 0.22 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }, T)
        // cream headline: each word fades in as you scroll
        .fromTo(q('[data-cream-head] [data-kick]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, T)
        .fromTo(q('[data-cream-head] [data-fw]'), { opacity: 0 }, { opacity: 1, duration: 0.12, stagger: { amount: 0.6 } }, T + 0.05)
        // the brown fill rises from the bottom behind a noisy, liquid edge
        .to(fill, { p: 1.3, duration: 1, ease: 'power1.inOut', onUpdate: () => (liquid.progress = fill.p) }, T + 0.85)
        .set(q('[data-cream-head]'), { autoAlpha: 0 }, T + 1.85)
        // then the cream headline is written again, word by word, on the brown
        .fromTo(q('[data-brown] [data-kick]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, T + 1.65)
        .fromTo(q('[data-brown] [data-fw]'), { opacity: 0 }, { opacity: 1, duration: 0.12, stagger: { amount: 0.6 } }, T + 1.7)
      q('[data-float]').forEach((f, i) => {
        const speed = [1, 1.5, 0.8, 1.25, 1.1][i % 5]
        st.fromTo(f, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15 }, T + 1.55 + i * 0.06)
          .fromTo(f, { y: () => vh() * 0.45 * speed, rotate: (i % 2 ? 6 : -6) }, { y: () => -vh() * 0.38 * speed, rotate: i % 2 ? -3 : 3, duration: 1.7 }, T + 1.55)
      })
      // end of the section: the cream rises over the brown with the same liquid edge
      st.to(fillOut, { p: 1.3, duration: 1, ease: 'power1.inOut', onUpdate: () => (liquidOut.progress = fillOut.p) }, T + 2.8)

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
      gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: grow, scroller: sc, start: 'top top', end: 'bottom bottom', scrub: 0.6 } })
        .fromTo(q('[data-card]'), { clipPath: 'inset(30% 24% 16% 24% round 28px)', rotate: -4, y: () => vh() * 0.08 }, { clipPath: 'inset(0% 0% 0% 0% round 22px)', rotate: 0, y: 0, duration: 1 }, 0)
        .fromTo(q('[data-card-zoom]'), { scale: 1.25 }, { scale: 1, duration: 1 }, 0)
        .fromTo(q('[data-slider-ui]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 0.8)

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
        scrollTrigger: { trigger: q('[data-next]')[0], scroller: sc, start: 'top bottom', end: 'center center', scrub: 0.6 },
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

      {/* paper loader */}
      <div className={s.loader} ref={loader} style={{ visibility: 'hidden' }} aria-hidden="true">
        <div className={s.loaderCenter}>
          <span className={s.loaderVehicle} data-ld>
            <VehicleIcon id={vehicle} size={84} />
          </span>
          <span className={s.loaderCount} data-ld>
            <span ref={counter}>0</span>
          </span>
          <span className={s.loaderLabel} data-ld>
            Bienvenido <span className="script">a</span> {loading?.name}
          </span>
        </div>
        <svg className={s.loaderRoute} viewBox="0 0 600 140" aria-hidden="true">
          <path d="M20 120 C 120 120, 140 40, 230 60 S 360 130, 420 80 S 520 20, 580 30" pathLength={1} data-route className={s.loaderPath} />
          <circle cx="20" cy="120" r="5" />
          <circle cx="580" cy="30" r="5" />
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
        <div className={s.sticky}>
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

          <canvas className={s.liquid} data-liquid aria-hidden="true" />

          <div className={s.brown} data-brown>
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
  const [idx, setIdx] = useState(0)
  const prevIdx = useRef(0)
  const root = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const gl = useRef<LiquidSlider | null>(null)
  const dir = useRef<1 | -1>(1)
  const n = stop.story.length

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

  const go = (i: number, d: 1 | -1) => {
    dir.current = d
    setIdx(((i % n) + n) % n)
  }

  // the photo floods in (WebGL); the old text leaves and the new one rises
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const items = el.querySelectorAll<HTMLElement>('[data-slide]')
    const from = prevIdx.current
    prevIdx.current = idx
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
    const run = gsap.fromTo(bars[idx], { scaleX: 0 }, { scaleX: 1, duration: 8, ease: 'none', onComplete: () => go(idx + 1, 1) })
    return () => {
      run.kill()
    }
  }, [idx])

  return (
    <div className={s.slider} ref={root}>
      <canvas className={s.sliderGl} ref={canvas} role="img" aria-label={stop.story[idx].title} />
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
        <button className={`${s.side} ${s.sideL}`} onClick={() => go(idx - 1, -1)}>
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
        <button className={`${s.side} ${s.sideR}`} onClick={() => go(idx + 1, 1)}>
          <span>
            <em>Siguiente</em>
            historia
          </span>
          <span className={s.sideBtn}>
            <Arrow size={16} />
          </span>
        </button>
        <div className={s.trail}>
          <svg viewBox="0 0 1000 60" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 40 C 120 10, 200 55, 330 30 S 560 5, 670 34 S 880 55, 1000 22" />
          </svg>
          {slides.map((src, i) => (
            <button key={i} className={`${s.trailDot} ${i === idx ? s.trailOn : ''}`} style={{ left: `${18 + i * 32}%` }} onClick={() => go(i, i > idx ? 1 : -1)} aria-label={stop.story[i].title}>
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
