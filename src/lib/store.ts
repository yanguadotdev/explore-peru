import { useSyncExternalStore } from 'react'

export type Phase = 'loading' | 'hero' | 'to-map' | 'map'
export type VehicleId = 'combi' | 'llama' | 'tren'

export type State = {
  phase: Phase
  /** real loading progress 0..1 */
  progress: number
  collected: string[]
  vehicle: VehicleId
  hovered: string | null
  openStop: string | null
  sound: boolean
  stampsOpen: boolean
  listOpen: boolean
}

let state: State = {
  phase: 'loading',
  progress: 0,
  collected: [],
  vehicle: 'combi',
  hovered: null,
  openStop: null,
  sound: true,
  stampsOpen: false,
  listOpen: false,
}

const listeners = new Set<() => void>()

export const store = {
  get: () => state,
  set(patch: Partial<State>) {
    state = { ...state, ...patch }
    listeners.forEach((l) => l())
  },
  subscribe(l: () => void) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(store.subscribe, () => selector(state))
}
