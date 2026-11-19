import { useEffect, useRef } from 'react'
import { useMatch, useNavigate } from 'react-router'
import { STOPS } from '../data/stops'
import { store, useStore } from './store'

const DEFAULT_TITLE = document.title

export const regionPath = (id: string | null) => (id ? `/regions/${id}` : '/')

/** Region id in the current URL (null on any other route). */
export function useUrlRegion() {
  return useMatch('/regions/:regionId')?.params.regionId ?? null
}

/**
 * Two-way sync between the URL and the open region page, once the map is live:
 * - URL → store: deep links, back/forward and typed URLs open or close pages.
 * - store → URL: pins, the regions list, prev/next and "back to map" push history.
 */
export function useRegionRoute() {
  const navigate = useNavigate()
  const urlRegion = useUrlRegion()
  const phase = useStore((s) => s.phase)
  const openStop = useStore((s) => s.openStop)
  // the region the URL currently says, and the last openStop this hook has seen
  const synced = useRef<string | null>(null)
  const seen = useRef<string | null>(null)

  // URL → store
  useEffect(() => {
    if (phase !== 'map') return
    const valid = urlRegion && STOPS.some((s) => s.id === urlRegion) ? urlRegion : null
    if (urlRegion && !valid) {
      navigate('/', { replace: true })
      return
    }
    synced.current = valid
    if (store.get().openStop !== valid) store.set({ openStop: valid, listOpen: false, stampsOpen: false })
  }, [urlRegion, phase, navigate])

  // store → URL: only when the store itself changed (not when it is merely lagging
  // one render behind a URL change, e.g. right after the browser's back button)
  useEffect(() => {
    if (phase !== 'map' || openStop === seen.current) return
    seen.current = openStop
    if (openStop === synced.current) return
    synced.current = openStop
    navigate(regionPath(openStop))
  }, [openStop, phase, navigate])

  // page title
  useEffect(() => {
    const stop = STOPS.find((s) => s.id === openStop)
    document.title = stop ? `${stop.name} · Explora Perú — KUNTUR` : DEFAULT_TITLE
  }, [openStop])
}
