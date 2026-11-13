import Lenis from 'lenis'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MAIN_STOPS, STOPS } from '../data/stops'
import { audio } from '../lib/audio'
import { gsap } from '../lib/ease'
import { getExperience } from '../lib/experience'
import { store, useStore, type VehicleId } from '../lib/store'
import { Arrow, Chevron, Close, ListIcon, MapIcon, Mark, SoundIcon, StopIcon, VehicleIcon } from './Icons'
import { Illustration } from './Illustration'
import { Stamp } from './Stamp'
import s from './MapUI.module.css'

export function MapUI() {
  const root = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const q = gsap.utils.selector(root)
    const tl = gsap.timeline({ defaults: { ease: 'alt.out' }, delay: 0.1 })
    tl.fromTo(q('[data-anim="header"]'), { yPercent: -100 }, { yPercent: 0, duration: 1.1 })
      .fromTo(q('[data-anim="header"] [data-i]'), { autoAlpha: 0, y: -10 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.06 }, 0.35)
      .fromTo(q('[data-anim="bl"]'), { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.12 }, 0.5)
      .fromTo(q('[data-anim="br"]'), { autoAlpha: 0, y: 40, rotate: 4 }, { autoAlpha: 1, y: 0, rotate: 0, duration: 1 }, 0.65)
  }, [])

  return (
    <div className={s.ui} ref={root}>
      <Header />
      <Onboarding />
      <SoundToggle />
      <VehicleSwitcher />
      <HoverCard />
      <StopPanel />
      <StampsModal />
    </div>
  )
}

// ------------------------------------------------------------------ header

function Header() {
  const collected = useStore((st) => st.collected.length)
  const listOpen = useStore((st) => st.listOpen)
  const countRef = useRef<HTMLSpanElement>(null)
  const prev = useRef(collected)

  useEffect(() => {
    if (collected > prev.current && countRef.current) {
      gsap.fromTo(countRef.current, { scale: 1.6, rotate: -12 }, { scale: 1, rotate: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)' })
    }
    prev.current = collected
  }, [collected])

  return (
    <header className={s.header} data-anim="header">
      <div className={s.logo} data-i>
        <Mark size={24} />
        <span className={s.logoName}>ALTURA</span>
        <span className={s.logoSub}>Café de Origen</span>
      </div>

      <div className={s.headerCenter} data-i>
        <span>De la</span>
        <span className="script">Montaña</span>
        <span className={s.headerBadge}>
          <StopIcon icon="cup" size={18} />
        </span>
        <span>a tu</span>
        <span className="script">Taza</span>
      </div>

      <nav className={s.headerNav}>
        <div className={s.listWrap}>
          <button
            data-i
            className={`${s.navBtn} ${listOpen ? s.navActive : ''}`}
            aria-expanded={listOpen}
            onClick={() => {
              audio.play('click')
              store.set({ listOpen: !listOpen })
            }}
          >
            <span>Paradas</span>
            <ListIcon size={16} />
          </button>
          <StopsList />
        </div>
        <button data-i className={`${s.navBtn} ${s.navDark}`} aria-current="page">
          <span>Mapa 3D</span>
          <MapIcon size={16} />
        </button>
        <button
          data-i
          className={s.navStamps}
          onClick={() => {
            audio.play('click')
            store.set({ stampsOpen: true })
          }}
        >
          <span className={s.navStampsLabel}>
            Colecciona
            <br />
            los sellos
          </span>
          <span className={s.navStampsCount} ref={countRef}>
            {collected}/{MAIN_STOPS.length}
          </span>
        </button>
      </nav>
    </header>
  )
}

function StopsList() {
  const open = useStore((st) => st.listOpen)
  const collected = useStore((st) => st.collected)
  const ref = useRef<HTMLDivElement>(null)
  const wasOpen = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open) {
      wasOpen.current = true
      gsap.fromTo(el, { autoAlpha: 0, y: -8, clipPath: 'inset(0 0 100% 0 round 18px)' }, { autoAlpha: 1, y: 0, clipPath: 'inset(0 0 0% 0 round 18px)', duration: 0.6, ease: 'alt.out' })
      gsap.fromTo(el.querySelectorAll('li'), { autoAlpha: 0, x: 12 }, { autoAlpha: 1, x: 0, duration: 0.5, stagger: 0.04, ease: 'alt.out', delay: 0.1 })
    } else if (wasOpen.current) gsap.to(el, { autoAlpha: 0, y: -8, duration: 0.3, ease: 'alt.in' })
  }, [open])

  return (
    <div className={s.list} ref={ref} style={{ visibility: 'hidden' }}>
      <ol>
        {MAIN_STOPS.map((stop) => (
          <li key={stop.id}>
            <button
              onClick={() => {
                audio.play('click')
                store.set({ listOpen: false, openStop: stop.id })
              }}
            >
              <span className={s.listNum}>{String(stop.index).padStart(2, '0')}</span>
              <span className={s.listText}>
                <strong>{stop.name}</strong>
                <em>
                  {stop.stage} · {stop.altitude.toLocaleString('es')} msnm
                </em>
              </span>
              {collected.includes(stop.id) && <span className={s.listCheck}>✓</span>}
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ------------------------------------------------------------------ onboarding

const STEPS = [
  { title: 'Recorre la ruta', body: 'Arrastra el mapa y usa la rueda para acercarte a la montaña.', icon: 'mirador' as const },
  { title: 'Explora las paradas', body: 'Haz clic en los pines para descubrir cada etapa y ganar su sello.', icon: 'cherry' as const },
  { title: 'Cambia de transporte', body: 'Recorre la ruta en jeep, a lomo de mula o en chiva.', icon: 'sack' as const },
]

function Onboarding() {
  const [step, setStep] = useState(0)
  const [closed, setClosed] = useState(false)
  const body = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLSpanElement>(null)
  const card = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (closed) return
    const tw = gsap.fromTo(
      bar.current,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: 6.5,
        ease: 'none',
        delay: step === 0 ? 1.4 : 0,
        onComplete: () => {
          gsap.to(body.current, {
            autoAlpha: 0,
            x: -14,
            duration: 0.35,
            ease: 'alt.in',
            onComplete: () => setStep((v) => (v + 1) % STEPS.length),
          })
        },
      },
    )
    gsap.fromTo(body.current, { autoAlpha: 0, x: 14 }, { autoAlpha: 1, x: 0, duration: 0.55, ease: 'alt.out' })
    return () => {
      tw.kill()
    }
  }, [step, closed])

  if (closed) return null
  const st = STEPS[step]
  return (
    <div className={s.onboard} data-anim="bl" ref={card}>
      <div className={s.onboardThumb}>
        <StopIcon icon={st.icon} size={36} />
        <span className={s.onboardBar}>
          <span ref={bar} />
        </span>
      </div>
      <div className={s.onboardBody} ref={body}>
        <h3>{st.title}</h3>
        <p>{st.body}</p>
        <div className={s.dots}>
          {STEPS.map((_, i) => (
            <span key={i} className={i === step ? s.dotOn : ''} />
          ))}
        </div>
      </div>
      <button
        className={s.onboardClose}
        aria-label="Cerrar ayuda"
        onClick={() => {
          gsap.to(card.current, { autoAlpha: 0, y: 20, duration: 0.4, ease: 'alt.in', onComplete: () => setClosed(true) })
        }}
      >
        <Close size={14} />
      </button>
    </div>
  )
}

function SoundToggle() {
  const sound = useStore((st) => st.sound)
  return (
    <button
      className={s.sound}
      data-anim="bl"
      onClick={() => {
        const next = !sound
        store.set({ sound: next })
        audio.setEnabled(next)
        if (next) audio.play('click')
      }}
    >
      <SoundIcon on={sound} />
      <span>
        {sound ? 'Apagar' : 'Encender'} <span className="script">sonido</span>
      </span>
    </button>
  )
}

// ------------------------------------------------------------------ vehicles

const VEHICLES: { id: VehicleId; name: string }[] = [
  { id: 'jeep', name: 'Jeep' },
  { id: 'mula', name: 'Mula' },
  { id: 'chiva', name: 'Chiva' },
]

function VehicleSwitcher() {
  const current = useStore((st) => st.vehicle)
  const [open, setOpen] = useState(false)
  const options = useRef<HTMLDivElement>(null)
  const promo = useRef<HTMLDivElement>(null)
  const mounted = useRef(false)

  useEffect(() => {
    const list = options.current
    const card = promo.current
    if (!list || !card) return
    const rows = list.querySelectorAll('[data-row]')
    if (!mounted.current) {
      mounted.current = true
      gsap.set(list, { height: 0 })
      gsap.set(card, { autoAlpha: 0 })
      return
    }
    if (open) {
      const tl = gsap.timeline({ defaults: { ease: 'alt.out', overwrite: true } })
      tl.to(list, { height: 'auto', duration: 0.65 }, 0)
        .fromTo(rows, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: { each: 0.06, from: 'end' } }, 0.1)
        .fromTo(card, { autoAlpha: 0, y: 40, rotate: 6, scale: 0.9 }, { autoAlpha: 1, y: 0, rotate: -3, scale: 1, duration: 0.8, ease: 'back.out(1.4)' }, 0.25)
    } else {
      const tl = gsap.timeline({ defaults: { ease: 'alt.in', overwrite: true } })
      tl.to(card, { autoAlpha: 0, y: 24, rotate: 3, duration: 0.3 }, 0)
        .to(rows, { autoAlpha: 0, y: 10, duration: 0.2, stagger: 0.03 }, 0)
        .to(list, { height: 0, duration: 0.45, ease: 'alt.inOut' }, 0.12)
    }
  }, [open])

  return (
    <div className={s.switcher} data-anim="br">
      <div className={s.promo} ref={promo} aria-hidden={!open}>
        <PromoArt />
        <div className={s.promoText}>
          <span className="script">Descubre</span>
          <strong>La Taza</strong>
          <button
            className={s.promoBtn}
            tabIndex={open ? 0 : -1}
            onClick={() => {
              audio.play('click')
              setOpen(false)
              store.set({ openStop: 'pueblo' })
            }}
          >
            Ir a la cafetería
          </button>
        </div>
      </div>

      <div className={`${s.stack} ${open ? s.stackOpen : ''}`}>
        <div className={s.options} ref={options} role="radiogroup" aria-label="Transporte">
          {VEHICLES.map((v) => (
            <button
              key={v.id}
              data-row
              role="radio"
              aria-checked={current === v.id}
              tabIndex={open ? 0 : -1}
              className={`${s.option} ${current === v.id ? s.optionActive : ''}`}
              onClick={() => {
                if (current === v.id) return
                audio.play('swap')
                store.set({ vehicle: v.id })
                getExperience()?.map.swapVehicle(v.id)
              }}
            >
              <span className={s.optionThumb}>
                <VehicleIcon id={v.id} size={40} />
              </span>
              <span className={s.optionLabel}>{v.name}</span>
            </button>
          ))}
        </div>

        <button
          className={s.toggle}
          aria-expanded={open}
          onClick={() => {
            audio.play('click')
            setOpen((o) => !o)
          }}
        >
          <span className={s.toggleThumb}>
            <DepotIcon />
          </span>
          <span className={s.toggleLabel}>
            Cambiar
            <br />
            transporte
          </span>
          <span className={s.toggleBtn}>{open ? <Close size={14} /> : <Chevron size={14} up />}</span>
        </button>
      </div>
    </div>
  )
}

/** Little coffee-depot illustration used on the switcher toggle. */
function DepotIcon() {
  return (
    <svg width="58" height="58" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M8 26 L32 14 L56 26 L32 38 Z" fill="#B24A2C" />
      <path d="M8 26 L32 38 V58 L8 46 Z" fill="#F3EADB" />
      <path d="M32 38 L56 26 V46 L32 58 Z" fill="#E1D3B8" />
      <path d="M13 34 L22 38.5 V49 L13 44.5 Z" fill="#3A2418" />
      <path d="M37 41 L50 34.5 V40 L37 46.5 Z" fill="#E2A43A" />
      <path d="M37 41 L50 34.5" stroke="#C8412B" strokeWidth="1.5" />
      <path d="M40 48 L47 44.5 V52 L40 55.5 Z" fill="#3F7F86" />
      <path d="M8 26 L32 38 L56 26" fill="none" stroke="#8E3B22" strokeWidth="1.5" />
      <ellipse cx="25" cy="27" rx="3" ry="4.2" transform="rotate(-25 25 27)" fill="#FBF7EE" />
    </svg>
  )
}

/** Promo card art: the town café at dusk. */
function PromoArt() {
  return (
    <svg className={s.promoArt} viewBox="0 0 240 130" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="promo-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E4A87F" />
          <stop offset="1" stopColor="#F6D9B4" />
        </linearGradient>
      </defs>
      <rect width="240" height="130" fill="url(#promo-sky)" />
      <path d="M0 78 C40 52 70 66 110 50 S190 46 240 64 V130 H0Z" fill="#8FA08C" />
      <rect x="40" y="52" width="150" height="62" fill="#F3EADB" />
      <path d="M32 54 L115 30 L198 54 Z" fill="#B24A2C" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={46 + i * 24} y="70" width="20" height="10" fill={i % 2 ? '#C8412B' : '#F7EEDC'} />
      ))}
      <rect x="54" y="84" width="22" height="30" fill="#3A2418" />
      <rect x="92" y="84" width="40" height="20" fill="#3F7F86" opacity=".85" />
      <rect x="146" y="84" width="30" height="20" fill="#3F7F86" opacity=".85" />
      <rect x="0" y="114" width="240" height="16" fill="#CDB68A" />
      <circle cx="205" cy="34" r="12" fill="#FBEBC9" opacity=".9" />
    </svg>
  )
}

// ------------------------------------------------------------------ hover card

function HoverCard() {
  const hovered = useStore((st) => st.hovered)
  const openStop = useStore((st) => st.openStop)
  // outer layer: positioned every frame (never animated by GSAP)
  const wrap = useRef<HTMLDivElement>(null)
  // inner layer: animated by GSAP (never positioned by code)
  const card = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState<string | null>(null)
  const follow = useRef<string | null>(null)
  const side = useRef<'right' | 'left'>('right')

  useEffect(() => {
    const el = card.current
    if (!el) return
    if (hovered && !openStop) {
      follow.current = hovered
      setShown(hovered)
      audio.play('hover')
      gsap.fromTo(
        el,
        { autoAlpha: 0, scale: 0.86, rotate: side.current === 'right' ? -8 : 8 },
        { autoAlpha: 1, scale: 1, rotate: side.current === 'right' ? -3 : 3, duration: 0.5, ease: 'alt.out', overwrite: true },
      )
    } else {
      gsap.to(el, {
        autoAlpha: 0,
        scale: 0.92,
        duration: 0.22,
        ease: 'alt.in',
        overwrite: true,
        onComplete: () => {
          // keep following the last pin until fully hidden, then stop
          if (!store.get().hovered) follow.current = null
        },
      })
    }
  }, [hovered, openStop])

  // follow the pin every frame
  useEffect(() => {
    const exp = getExperience()
    if (!exp) return
    const pos = { x: 0, y: 0 }
    exp.onFrame = () => {
      const id = follow.current
      const w = wrap.current
      if (!id || !w || !exp.map.project(id, pos)) return
      const cw = w.offsetWidth
      const ch = w.offsetHeight
      const gap = 26
      // flip to the left of the pin when there is no room on the right
      const right = pos.x + gap + cw <= window.innerWidth - 16
      side.current = right ? 'right' : 'left'
      const x = right ? pos.x + gap : pos.x - gap - cw
      const y = Math.min(window.innerHeight - ch - 16, Math.max(80, pos.y - ch * 0.55))
      w.style.transform = `translate3d(${Math.round(Math.max(16, x))}px, ${Math.round(y)}px, 0)`
      if (card.current) card.current.style.transformOrigin = right ? '0% 60%' : '100% 60%'
    }
    return () => {
      exp.onFrame = null
    }
  }, [])

  const stop = STOPS.find((x) => x.id === shown)
  return (
    <div className={s.hoverWrap} ref={wrap} aria-hidden="true">
      <div ref={card} className={`${s.hoverCard} ${stop?.kind === 'detour' ? s.hoverDetour : ''}`} style={{ visibility: 'hidden' }}>
        {stop && (
          <>
            <Illustration stop={stop} className={s.hoverArt} />
            <div className={s.hoverText}>
              <span className={s.hoverKicker}>{stop.kind === 'stop' ? `Parada ${String(stop.index).padStart(2, '0')} · ${stop.stage}` : 'Desvío'}</span>
              <strong>{stop.name}</strong>
              <span className={s.hoverAlt}>{stop.altitude.toLocaleString('es')} msnm</span>
              <p>{stop.teaser}</p>
              {stop.kind === 'stop' && <span className={s.hoverCta}>Clic para explorar</span>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ stop panel

function StopPanel() {
  const openId = useStore((st) => st.openStop)
  const collected = useStore((st) => st.collected)
  const [stopId, setStopId] = useState<string | null>(null)
  const panel = useRef<HTMLElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const stampRef = useRef<HTMLDivElement>(null)
  const lenis = useRef<Lenis | null>(null)

  const stop = STOPS.find((x) => x.id === stopId)

  // open / close orchestration
  useEffect(() => {
    const el = panel.current
    if (!el) return
    const exp = getExperience()
    if (openId) {
      const target = STOPS.find((x) => x.id === openId)!
      exp?.map.flyTo(openId, target.kind === 'stop')
      if (target.kind === 'detour') {
        // detours only get the hover card; nudge the camera there
        store.set({ openStop: null })
        return
      }
      setStopId(openId)
      audio.play('click')
    } else if (stopId) {
      gsap.to(el, {
        clipPath: 'inset(0 0 0 100% round 22px)',
        duration: 0.7,
        ease: 'alt.inOut',
        onComplete: () => {
          setStopId(null)
          gsap.set(el, { visibility: 'hidden' })
        },
      })
      exp?.map.zoomOut()
    }
  }, [openId])

  // animate content whenever the displayed stop changes
  useLayoutEffect(() => {
    const el = panel.current
    if (!el || !stopId) return
    gsap.set(el, { visibility: 'visible' })
    gsap.fromTo(el, { clipPath: 'inset(0 0 0 100% round 22px)' }, { clipPath: 'inset(0 0 0 0% round 22px)', duration: 0.9, ease: 'alt.out' })
    const items = content.current?.querySelectorAll('[data-reveal]') ?? []
    gsap.fromTo(items, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.07, ease: 'alt.out', delay: 0.25 })
    scroller.current?.scrollTo({ top: 0 })
    lenis.current?.scrollTo(0, { immediate: true })

    // passport stamp
    const already = store.get().collected.includes(stopId)
    const st = stampRef.current
    if (st) {
      if (!already) {
        gsap.fromTo(st, { autoAlpha: 0, scale: 2.2, rotate: -40 }, {
          autoAlpha: 1,
          scale: 1,
          rotate: -10,
          duration: 0.55,
          delay: 1.1,
          ease: 'back.out(1.6)',
          onStart: () => audio.play('stamp'),
          onComplete: () => {
            const c = store.get().collected
            if (!c.includes(stopId)) {
              const next = [...c, stopId]
              store.set({ collected: next })
              getExperience()?.map.setCollected(next)
            }
          },
        })
      } else gsap.set(st, { autoAlpha: 1, scale: 1, rotate: -10 })
    }
  }, [stopId])

  // Lenis smooth scroll inside the panel
  useEffect(() => {
    if (!scroller.current || !content.current) return
    const l = new Lenis({ wrapper: scroller.current, content: content.current, smoothWheel: true, lerp: 0.09 })
    lenis.current = l
    const raf = (time: number) => l.raf(time * 1000)
    gsap.ticker.add(raf)
    return () => {
      gsap.ticker.remove(raf)
      l.destroy()
    }
  }, [])

  const idx = stop ? MAIN_STOPS.findIndex((x) => x.id === stop.id) : -1
  const next = idx >= 0 ? MAIN_STOPS[(idx + 1) % MAIN_STOPS.length] : null
  const prev = idx >= 0 ? MAIN_STOPS[(idx - 1 + MAIN_STOPS.length) % MAIN_STOPS.length] : null

  return (
    <aside className={s.panel} ref={panel} style={{ visibility: 'hidden' }} aria-hidden={!stop} aria-label={stop?.name}>
      <button className={s.panelClose} aria-label="Cerrar" onClick={() => store.set({ openStop: null })}>
        <Close />
      </button>
      <div className={s.panelScroll} ref={scroller} data-lenis-prevent>
        <div ref={content}>
          {stop && (
            <>
              <div className={s.panelArtWrap} data-reveal>
                <Illustration stop={stop} className={s.panelArt} />
                <div className={s.panelStamp} ref={stampRef} style={{ visibility: 'hidden' }}>
                  <Stamp stop={stop} collected size={118} />
                </div>
              </div>
              <div className={s.panelBody}>
                <span className={s.panelKicker} data-reveal>
                  Parada {String(stop.index).padStart(2, '0')} / {String(MAIN_STOPS.length).padStart(2, '0')} · {stop.stage}
                </span>
                <h2 className={s.panelTitle} data-reveal>
                  {stop.name}
                </h2>
                <div className={s.panelMeta} data-reveal>
                  <span>{stop.altitude.toLocaleString('es')} msnm</span>
                  {collected.includes(stop.id) && <span className={s.panelGot}>Sello obtenido</span>}
                </div>
                <p className={s.panelLead} data-reveal>
                  {stop.teaser}
                </p>
                {stop.story.map((sec, i) => (
                  <section key={i} className={s.panelSection} data-reveal>
                    <span className={s.panelSecNum}>{String(i + 1).padStart(2, '0')}</span>
                    <h3>{sec.title}</h3>
                    <p>{sec.body}</p>
                  </section>
                ))}
                {stop.note && (
                  <div className={s.panelNote} data-reveal>
                    <StopIcon icon="cup" size={28} />
                    <div>
                      <span>En la taza</span>
                      <strong>{stop.note}</strong>
                    </div>
                  </div>
                )}
                <div className={s.panelNav} data-reveal>
                  {prev && (
                    <button onClick={() => store.set({ openStop: prev.id })}>
                      <span className={s.flip}>
                        <Arrow size={16} />
                      </span>
                      <span>
                        <em>Anterior</em>
                        {prev.name}
                      </span>
                    </button>
                  )}
                  {next && (
                    <button className={s.panelNext} onClick={() => store.set({ openStop: next.id })}>
                      <span>
                        <em>Siguiente parada</em>
                        {next.name}
                      </span>
                      <Arrow size={16} />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}

// ------------------------------------------------------------------ stamps modal

function StampsModal() {
  const open = useStore((st) => st.stampsOpen)
  const collected = useStore((st) => st.collected)
  const ref = useRef<HTMLDivElement>(null)
  const wasOpen = useRef(false)
  const all = collected.length === MAIN_STOPS.length

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!open && !wasOpen.current) return
    wasOpen.current = true
    if (open) {
      gsap.set(el, { visibility: 'visible' })
      gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, ease: 'alt.out' })
      gsap.fromTo(el.querySelector('[data-card]'), { y: 40, scale: 0.96 }, { y: 0, scale: 1, duration: 0.8, ease: 'alt.out' })
      gsap.fromTo(el.querySelectorAll('[data-stamp]'), { autoAlpha: 0, scale: 0.6, rotate: -30 }, { autoAlpha: 1, scale: 1, rotate: (i) => [-8, 6, -4, 9, -6, 4][i % 6], duration: 0.7, stagger: 0.07, ease: 'back.out(1.7)', delay: 0.15 })
    } else {
      gsap.to(el, { autoAlpha: 0, duration: 0.35, ease: 'alt.in' })
    }
  }, [open])

  return (
    <div className={s.modal} ref={ref} style={{ visibility: 'hidden' }} onClick={(e) => e.target === e.currentTarget && store.set({ stampsOpen: false })} role="dialog" aria-modal="true" aria-label="Pasaporte de sellos">
      <div className={s.modalCard} data-card>
        <button className={s.modalClose} aria-label="Cerrar" onClick={() => store.set({ stampsOpen: false })}>
          <Close />
        </button>
        <span className={s.modalKicker}>Pasaporte cafetero</span>
        <h2 className={s.modalTitle}>
          {all ? (
            <>
              ¡Ruta <span className="script">completa!</span>
            </>
          ) : (
            <>
              Tus <span className="script">sellos</span>
            </>
          )}
        </h2>
        <p className={s.modalLead}>
          {all
            ? 'Recorriste las seis paradas: ya conoces todo lo que hay detrás de tu taza.'
            : `Visita cada parada para ganar su sello. Llevas ${collected.length} de ${MAIN_STOPS.length}.`}
        </p>
        <div className={s.stamps}>
          {MAIN_STOPS.map((stop) => {
            const got = collected.includes(stop.id)
            return (
              <button
                key={stop.id}
                data-stamp
                className={s.stampBtn}
                onClick={() => {
                  store.set({ stampsOpen: false, openStop: stop.id })
                }}
              >
                <Stamp stop={stop} collected={got} size={112} />
                <span>{stop.stage}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
