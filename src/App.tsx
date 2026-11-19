import { useEffect, useRef, useState } from 'react'
import { Hero, type HeroHandle } from './components/Hero'
import { Loader } from './components/Loader'
import { MapUI } from './components/MapUI'
import { audio } from './lib/audio'
import { gsap } from './lib/ease'
import { setExperience } from './lib/experience'
import { useRegionRoute, useUrlRegion } from './lib/useRegionRoute'
import { store, useStore } from './lib/store'
import { Experience } from './webgl/Experience'

export default function App() {
  const phase = useStore((s) => s.phase)
  const canvas = useRef<HTMLCanvasElement>(null)
  const hero = useRef<HeroHandle>(null)
  const exp = useRef<Experience | null>(null)
  const [loader, setLoader] = useState(true)
  useRegionRoute()
  // a deep link (/regions/<id>) skips the hero: after the loader it goes straight to the map
  const urlRegion = useUrlRegion()
  const deepLink = useRef(urlRegion !== null)

  useEffect(() => {
    if (exp.current || !canvas.current) return
    const e = new Experience(canvas.current, {
      onHover: (id) => store.set({ hovered: id }),
      onSelect: (id) => store.set({ openStop: id, listOpen: false }),
    })
    exp.current = e
    setExperience(e)

    // weighted loading progress: fonts, audio, then the WebGL world
    const p = { fonts: 0, audio: 0, world: 0 }
    const update = () => store.set({ progress: p.fonts * 0.1 + p.audio * 0.15 + p.world * 0.75 })
    document.fonts.ready.then(() => {
      p.fonts = 1
      update()
    })
    audio.load((v) => {
      p.audio = v
      update()
    })
    e.init((v) => {
      p.world = v
      update()
    }).then(() => {
      const params = new URLSearchParams(location.search)
      if ((import.meta.env.DEV || import.meta.env.VITE_E2E === '1') && params.has('map')) {
        setLoader(false)
        e.jumpToMap()
        store.set({ phase: 'map', sound: false })
      }
    })

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return
      const s = store.get()
      if (s.stampsOpen) store.set({ stampsOpen: false })
      else if (s.openStop) store.set({ openStop: null })
      else if (s.listOpen) store.set({ listOpen: false })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const reveal = () => {
    const e = exp.current
    if (deepLink.current && e) {
      e.jumpToMap()
      audio.setEnabled(store.get().sound)
      store.set({ phase: 'map' })
      return
    }
    store.set({ phase: 'hero' })
    hero.current?.intro()
    exp.current?.heroIntro()
  }

  const start = (withSound: boolean) => {
    const e = exp.current
    if (!e || store.get().phase !== 'hero') return
    store.set({ phase: 'to-map', sound: withSound })
    audio.setEnabled(withSound)
    audio.play('whoosh')
    hero.current?.outro()
    e.goToMap()
    gsap.delayedCall(3.3, () => {
      e.map.interactive = true
      store.set({ phase: 'map' })
    })
  }

  return (
    <>
      <canvas ref={canvas} className="webgl" aria-label="Mapa interactivo en 3D del Perú" />
      <Hero ref={hero} onStart={start} />
      {phase === 'map' && <MapUI />}
      {loader && <Loader onRevealStart={reveal} onDone={() => setLoader(false)} />}
    </>
  )
}
