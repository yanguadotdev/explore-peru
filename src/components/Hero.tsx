import { forwardRef, useImperativeHandle, useRef } from 'react'
import { gsap } from '../lib/ease'
import { Arrow, Mark } from './Icons'
import s from './Hero.module.css'

export type HeroHandle = { intro: () => void; outro: () => gsap.core.Timeline }

const TITLE = ['RUTA', 'DEL', 'CAFÉ']

// Altitude profile from the summit (left) down to the town (right).
const PROFILE =
  'M0 210 C 60 200, 90 120, 150 118 S 230 40, 300 52 S 380 150, 450 140 S 540 70, 610 92 S 700 170, 780 160 S 880 120, 940 150 S 1060 230, 1120 214 S 1200 240, 1240 236'

type Props = { onStart: (withSound: boolean) => void }

export const Hero = forwardRef<HeroHandle, Props>(function Hero({ onStart }, ref) {
  const root = useRef<HTMLDivElement>(null)
  const brand = useRef<HTMLDivElement>(null)
  const letters = useRef<HTMLSpanElement[]>([])
  const sub = useRef<HTMLDivElement>(null)
  const kicker = useRef<HTMLParagraphElement>(null)
  const line = useRef<SVGPathElement>(null)
  const labels = useRef<HTMLSpanElement[]>([])
  const claim = useRef<HTMLParagraphElement>(null)
  const cta = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => ({
    intro() {
      gsap.set(root.current, { autoAlpha: 1 })
      const tl = gsap.timeline({ defaults: { ease: 'alt.out' } })
      tl.fromTo(letters.current, { yPercent: 110, rotate: 6 }, { yPercent: 0, rotate: 0, duration: 1.4, stagger: 0.045 }, 0)
        .fromTo(brand.current, { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, duration: 1.1 }, 0.25)
        .fromTo(sub.current?.children ?? [], { autoAlpha: 0, x: 28 }, { autoAlpha: 1, x: 0, duration: 1.15, stagger: 0.1 }, 0.5)
        .fromTo(line.current, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.6, ease: 'alt.inOut' }, 0.3)
        .fromTo(labels.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, stagger: 0.25 }, 1.1)
        .fromTo(kicker.current, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 1 }, 0.9)
        .fromTo(claim.current, { autoAlpha: 0, x: -20 }, { autoAlpha: 1, x: 0, duration: 1.1 }, 1.0)
        .fromTo(cta.current, { autoAlpha: 0, y: 24, scale: 0.92 }, { autoAlpha: 1, y: 0, scale: 1, duration: 1.1 }, 1.15)
    },
    outro() {
      const tl = gsap.timeline({ defaults: { ease: 'alt.in' } })
      tl.to(cta.current, { autoAlpha: 0, y: 20, duration: 0.5 }, 0)
        .to([claim.current, kicker.current, ...labels.current], { autoAlpha: 0, duration: 0.5, stagger: 0.04 }, 0)
        .to(letters.current, { yPercent: -110, duration: 0.8, stagger: 0.03 }, 0.1)
        .to(sub.current?.children ?? [], { autoAlpha: 0, x: -24, duration: 0.6, stagger: 0.06 }, 0.1)
        .to(line.current, { strokeDashoffset: -1, duration: 1.2, ease: 'alt.inOut' }, 0)
        .to(brand.current, { autoAlpha: 0, y: -12, duration: 0.6 }, 0.2)
        .set(root.current, { autoAlpha: 0 })
      return tl
    },
  }))

  let li = 0
  return (
    <section className={s.hero} ref={root} aria-label="Ruta del Café">
      <div className={s.brand} ref={brand}>
        <Mark size={26} />
        <span className={s.brandName}>ALTURA</span>
        <span className={s.brandSep} />
        <span className={s.brandSub}>Café de Origen</span>
      </div>

      <svg className={s.profile} viewBox="0 0 1240 260" preserveAspectRatio="none" aria-hidden="true">
        <path ref={line} d={PROFILE} pathLength={1} />
      </svg>

      <span className={s.label} ref={(el) => void (el && (labels.current[0] = el))}>
        2.100 msnm
      </span>
      <span className={`${s.label} ${s.labelRight}`} ref={(el) => void (el && (labels.current[1] = el))}>
        1.250 msnm
      </span>

      <div className={s.center}>
        <h1 className={s.title}>
          {TITLE.map((word, wi) => (
            <span className={s.word} key={wi}>
              {word.split('').map((ch) => {
                const i = li++
                return (
                  <span className={s.clip} key={i}>
                    <span className={s.letter} ref={(el) => void (el && (letters.current[i] = el))}>
                      {ch}
                    </span>
                  </span>
                )
              })}
            </span>
          ))}
        </h1>

        <div className={s.sub} ref={sub}>
          <span>De la</span>
          <span className="script">Montaña</span>
          <span>a tu</span>
          <span className="script">Taza</span>
        </div>
        <p className={s.kicker} ref={kicker}>
          Seis paradas · Una cosecha
        </p>
      </div>

      <p className={s.claim} ref={claim}>
        Cada grano recorre un camino
        <br />
        antes de llegar a tu taza.
      </p>

      <div className={s.cta} ref={cta}>
        <button className={s.start} onClick={() => onStart(true)}>
          <span className={s.startLabel}>Iniciar el viaje</span>
          <span className={s.startIcon}>
            <Arrow size={20} />
          </span>
        </button>
        <button className={s.mute} onClick={() => onStart(false)}>
          Entrar sin sonido
        </button>
      </div>
    </section>
  )
})
