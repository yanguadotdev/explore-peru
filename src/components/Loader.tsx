import { useEffect, useRef, useState } from 'react'
import { FACTS } from '../data/stops'
import { gsap } from '../lib/ease'
import { useStore } from '../lib/store'
import { LoaderOverlay } from '../webgl/LoaderOverlay'
import s from './Loader.module.css'

const PATH =
  'M24 30 C 70 26, 92 52, 132 50 S 186 30, 222 44 S 268 84, 312 78 S 362 56, 398 72 S 450 112, 492 104 S 548 92, 576 114'

type Props = { onRevealStart: () => void; onDone: () => void }

export function Loader({ onRevealStart, onDone }: Props) {
  const progress = useStore((st) => st.progress)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlay = useRef<LoaderOverlay | null>(null)
  const target = useRef(0)
  const shown = useRef(0)
  const exiting = useRef(false)
  const [count, setCount] = useState(0)
  const [fact, setFact] = useState(0)

  const root = useRef<HTMLDivElement>(null)
  const counterRow = useRef<HTMLDivElement>(null)
  const tagline = useRef<HTMLDivElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const bean = useRef<SVGGElement>(null)
  const routeWrap = useRef<HTMLDivElement>(null)
  const factWrap = useRef<HTMLDivElement>(null)
  const factText = useRef<HTMLParagraphElement>(null)

  target.current = progress

  useEffect(() => {
    if (!canvasRef.current) return
    const o = new LoaderOverlay(canvasRef.current)
    overlay.current = o
    gsap.fromTo([counterRow.current, routeWrap.current, factWrap.current], { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.12, ease: 'alt.out', delay: 0.2 })
    return () => {
      // StrictMode re-mounts in dev: tear down this instance cleanly
      if (!exiting.current) o.dispose()
    }
  }, [])

  // smooth, never-faster-than-reading counter
  useEffect(() => {
    const tick = (_t: number, deltaMs: number) => {
      // time-based so it behaves the same at any frame rate (max ~45%/s)
      const k = Math.min(deltaMs, 250) / 16.67
      const goal = target.current * 100
      const step = Math.min(0.75, Math.max(0.12, (goal - shown.current) * 0.06)) * k
      const next = Math.min(goal, shown.current + step)
      shown.current = next
      const v = Math.floor(next)
      setCount((c) => (c === v ? c : v))
      const p = pathRef.current
      if (p) {
        p.style.strokeDashoffset = String(1 - next / 100)
        const len = p.getTotalLength()
        const pt = p.getPointAtLength((len * next) / 100)
        bean.current?.setAttribute('transform', `translate(${pt.x} ${pt.y})`)
      }
      if (next >= 100 && !exiting.current) {
        exiting.current = true
        exit()
      }
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])

  // rotating facts
  useEffect(() => {
    const id = setInterval(() => {
      if (exiting.current) return
      gsap.to(factText.current, {
        autoAlpha: 0,
        y: -6,
        duration: 0.35,
        ease: 'alt.in',
        onComplete: () => {
          setFact((f) => (f + 1) % FACTS.length)
          gsap.fromTo(factText.current, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'alt.out' })
        },
      })
    }, 3600)
    return () => clearInterval(id)
  }, [])

  function exit() {
    const words = tagline.current?.querySelectorAll('[data-w]') ?? []
    const tl = gsap.timeline({ defaults: { ease: 'alt.inOut' } })
    tl.to(counterRow.current, { autoAlpha: 0, y: -18, duration: 0.6 }, 0.15)
      .fromTo(words, { autoAlpha: 0, x: 32 }, { autoAlpha: 1, x: 0, duration: 1.1, stagger: 0.09, ease: 'alt.out' }, 0.45)
      .to({}, { duration: 0.9 })
      .add(() => {
        gsap.to([tagline.current, routeWrap.current, factWrap.current], { autoAlpha: 0, duration: 1.1, stagger: 0.1, ease: 'power1.inOut' })
        overlay.current
          ?.dissolve({
            delay: 0.35,
            duration: 2.2,
            // the hero is already composed underneath: it starts its settle-zoom
            // the moment the burn opens
            onStart: onRevealStart,
          })
          .then(() => {
            onDone()
          })
      })
  }

  return (
    <div className={s.loader} ref={root} data-loader>
      <canvas ref={canvasRef} className={s.canvas} />
      <p className="sr-only" role="status">
        {count >= 100 ? 'Experiencia cargada' : ''}
      </p>

      <div className={s.center}>
        <div className={s.counterRow} ref={counterRow}>
          <div className={s.counter} role="progressbar" aria-label="Cargando la experiencia" aria-valuemin={0} aria-valuemax={100} aria-valuenow={count}>
            <span aria-hidden="true">{count}</span>
          </div>
          <div className={s.label}>
            Cargando <span className="script">la</span> experiencia
          </div>
        </div>

        <div className={s.tagline} ref={tagline} aria-hidden="true">
          <span data-w className={s.tagWord}>
            De la
          </span>
          <span data-w className={`${s.tagScript} script`}>
            Montaña
          </span>
          <span data-w className={s.tagWord}>
            a tu
          </span>
          <span data-w className={`${s.tagScript} script`}>
            Taza
          </span>
        </div>
      </div>

      <div className={s.route} ref={routeWrap} aria-hidden="true">
        <svg viewBox="0 0 600 140">
          <path d={PATH} className={s.routeGhost} />
          <path d={PATH} ref={pathRef} className={s.routeLine} pathLength={1} />
          <circle cx="24" cy="30" r="6" className={s.node} />
          <circle cx="576" cy="114" r="6" className={s.node} />
          <text x="24" y="12" className={s.nodeLabel} textAnchor="start">
            2.100 msnm
          </text>
          <text x="576" y="136" className={s.nodeLabel} textAnchor="end">
            tu taza
          </text>
          <g ref={bean}>
            <ellipse rx="6.5" ry="9" transform="rotate(-25)" className={s.bean} />
            <path d="M-2 -7 C 3 -2, -3 3, 2 8" className={s.beanCrease} />
          </g>
        </svg>
      </div>

      <div className={s.fact} ref={factWrap}>
        <h2>¿Sabías que?</h2>
        <p ref={factText}>{FACTS[fact]}</p>
      </div>
    </div>
  )
}
