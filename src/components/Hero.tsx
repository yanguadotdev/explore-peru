import { forwardRef, useImperativeHandle, useRef } from 'react'
import { gsap } from '../lib/ease'
import { Mark } from './Icons'
import s from './Hero.module.css'

export type HeroHandle = { intro: () => void; outro: () => gsap.core.Timeline }

// Route line across the hero (solid + offset dashed shadow), 1920×640 viewBox.
const LINE =
  'M1 558.922c12.228 3.058 40.963 1.427 58.082-29.563 21.398-38.739 44.835-40.778 54.006-40.778s48.91 22.428 84.575 8.156c35.664-14.272 38.721-18.35 51.967-19.37s15.285-19.369 21.399-24.466 17.323-9.175 36.683 0c19.361 9.175 63.177 8.155 86.613 0 23.437-8.155 37.702 8.156 56.044 10.195s31.588 0 43.816 0 12.228 4.077 22.418 5.097c10.189 1.019 23.436-7.137 31.588-15.292s19.36-6.116 31.588-6.116 30.57-20.39 42.797-22.428c12.228-2.039 27.513-4.078 34.645-11.214s16.304-11.214 33.627 0c17.322 11.214 37.702 18.35 62.157 6.117 24.456-12.233 39.74-30.583 69.291-15.291s21.398 25.484 57.063 20.388c35.664-5.097 31.588-4.078 43.816 3.058 12.227 7.136 30.569 3.059 42.797 0 12.227-3.058 45.858-13.251 57.058-8.155 11.21 5.097 29.55-.001 36.69-6.117 5.7-4.893 16.64-2.039 21.4 0 20.04 7.476 70.31 20.185 111.06 11.214 50.95-11.214 43.82-18.35 46.88-26.505 3.05-8.156 16.3-21.409 23.43-22.428 5.71-.815 13.93-5.777 17.33-8.155h16.3c9.85-3.738 32.2-9.787 42.8-4.078 10.59 5.709 56.04-32.283 77.44-51.992 8.15-7.476 31.18-24.058 58.08-30.583 33.63-8.155 72.35-20.388 81.52-66.263s49.93-118.254 78.46-135.585c28.53-17.33 29.55-4.078 35.67-4.078 6.11 0 10.18-4.077 20.37 0 10.19 4.078 88.66 36.701 99.86 24.468 11.21-12.233 19.36-16.312 31.59-20.39s15.29 7.137 38.72-27.523c18.75-27.73 56.73-29.904 73.37-27.525'
const LINE_SHADOW = LINE.replace(/^M1 558\.922/, 'M-1 554.922')

const TITLE = 'Explora Perú'
/** Letters (by index in TITLE) that sit IN FRONT of the route line; the rest go behind it. */
const FRONT_LETTERS = new Set([0, 2, 5, 9, 11])

function Letters({ front = false }: { front?: boolean }) {
  return (
    <>
      {TITLE.split('').map((ch, i) => (
        <span key={i} aria-hidden="true" className={front && FRONT_LETTERS.has(i) ? s.letterFront : undefined}>
          {ch}
        </span>
      ))}
    </>
  )
}

/**
 * The hero copy. Rendered twice with identical layout:
 *  - layer "back": everything, under the route line
 *  - layer "front": only the FRONT_LETTERS are visible, over the route line
 * so the line weaves through the title.
 */
function HeroCopy({ layer }: { layer: 'back' | 'front' }) {
  const front = layer === 'front'
  return (
    <>
      <div className={s.brand}>
        <Mark size={24} />
        <span className={s.brandName}>KUNTUR</span>
        <span className={s.brandSep} />
        <span className={s.brandSub}>Viajes por el Perú</span>
      </div>

      <div className={s.titleRow}>
        <span className={s.label}>0 msnm</span>
        {/* identical letter spans in both layers so they overlap pixel-perfectly */}
        {front ? (
          <div className={s.title}>
            <Letters front />
          </div>
        ) : (
          <h1 className={s.title} aria-label={TITLE}>
            <Letters />
          </h1>
        )}
        <span className={s.label}>6 768 msnm</span>
      </div>

      <div className={s.sub}>
        <span>25</span>
        <span className="script">Regiones</span>
        <span>3</span>
        <span className="script">Mundos</span>
      </div>
      <p className={s.kicker}>
        Costa, sierra
        <br />
        y selva en un
        <br />
        solo viaje
      </p>
    </>
  )
}

type Props = { onStart: (withSound: boolean) => void }

export const Hero = forwardRef<HeroHandle, Props>(function Hero({ onStart }, ref) {
  const root = useRef<HTMLElement>(null)
  const scene = useRef<HTMLDivElement>(null)
  const back = useRef<HTMLDivElement>(null)
  const front = useRef<HTMLDivElement>(null)
  const line = useRef<SVGSVGElement>(null)
  const claim = useRef<HTMLParagraphElement>(null)
  const cta = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => ({
    // Everything is already in place under the loader; as the burn uncovers it
    // the composition grows into place (inside → out), the route draws
    // right → left, then the call to action arrives.
    intro() {
      gsap.set(root.current, { autoAlpha: 1 })
      const tl = gsap.timeline({ defaults: { ease: 'alt.out' } })
      tl.fromTo(scene.current, { scale: 0.88 }, { scale: 1, duration: 2.8 }, 0)
        .fromTo(line.current, { '--line-reveal': '100%' }, { '--line-reveal': '0%', duration: 2.4, ease: 'alt.inOut' }, 0.25)
        .fromTo([claim.current, cta.current], { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.12 }, 0.75)
    },
    outro() {
      const tl = gsap.timeline({ defaults: { ease: 'alt.in' } })
      tl.to([cta.current, claim.current], { autoAlpha: 0, y: 16, duration: 0.45, stagger: 0.05 }, 0)
        .to(line.current, { '--line-reveal': '100%', duration: 0.9, ease: 'alt.inOut' }, 0)
        .to([back.current, front.current], { autoAlpha: 0, duration: 0.9, ease: 'alt.inOut' }, 0.1)
        .to(scene.current, { scale: 1.06, duration: 0.9, ease: 'alt.inOut' }, 0.1)
        .set(root.current, { autoAlpha: 0 })
      return tl
    },
  }))

  return (
    <section className={s.hero} ref={root} aria-label="Explora Perú">
      {/* back copy → route line → front letters, zoomed together so they stay aligned */}
      <div className={s.scene} ref={scene}>
        <div className={s.stage} ref={back}>
          <HeroCopy layer="back" />
        </div>

        <svg className={s.line} ref={line} viewBox="0 0 1920 640" preserveAspectRatio="none" fill="none" aria-hidden="true" focusable="false">
          <path d={LINE} vectorEffect="non-scaling-stroke" />
          <path d={LINE_SHADOW} vectorEffect="non-scaling-stroke" strokeDasharray="2 2" opacity=".4" />
        </svg>

        <div className={`${s.stage} ${s.stageFront}`} ref={front} aria-hidden="true">
          <HeroCopy layer="front" />
        </div>
      </div>

      <p className={s.claim} ref={claim}>
        Del Pacífico a la Amazonía,
        <br />
        cruzando los Andes.
      </p>

      <div className={s.cta} ref={cta}>
        {/* fixed-size hit area; only the inner shape animates (no edge flicker) */}
        <button className={s.start} onClick={() => onStart(true)}>
          <span className={s.startShape} aria-hidden="true">
            <span className={s.startRoad} />
            <span className={s.startIcon}>
              <svg width="18" height="20" viewBox="0 0 18 20">
                <path d="M9 1 L17 19 L9 14.5 L1 19 Z" fill="currentColor" />
              </svg>
            </span>
          </span>
          <span className={s.startLabel}>Iniciar el viaje</span>
        </button>
        <button className={s.mute} onClick={() => onStart(false)}>
          Entrar sin sonido
        </button>
      </div>
    </section>
  )
})
