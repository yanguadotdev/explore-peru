import { Howl, Howler } from 'howler'

type SfxName = 'click' | 'hover' | 'stamp' | 'whoosh' | 'swap'

const base = `${import.meta.env.BASE_URL}audio/`
let ambient: Howl | null = null
const sfx: Partial<Record<SfxName, Howl>> = {}
let enabled = false

function loadHowl(src: string, opts: Partial<ConstructorParameters<typeof Howl>[0]> = {}) {
  return new Promise<Howl>((resolve) => {
    const h = new Howl({
      src: [base + src],
      preload: true,
      ...opts,
      onload: () => resolve(h),
      onloaderror: () => resolve(h),
    })
  })
}

export const audio = {
  async load(onProgress?: (p: number) => void) {
    const names: SfxName[] = ['click', 'hover', 'stamp', 'whoosh', 'swap']
    let done = 0
    const total = names.length + 1
    const tick = () => onProgress?.(++done / total)
    const jobs: Promise<unknown>[] = [
      loadHowl('ambient.wav', { loop: true, volume: 0 }).then((h) => {
        ambient = h
        tick()
      }),
      ...names.map((n) =>
        loadHowl(`${n}.wav`, { volume: n === 'hover' ? 0.25 : 0.6 }).then((h) => {
          sfx[n] = h
          tick()
        }),
      ),
    ]
    await Promise.all(jobs)
  },

  get enabled() {
    return enabled
  },

  setEnabled(on: boolean) {
    enabled = on
    Howler.mute(!on)
    if (!ambient) return
    if (on) {
      if (!ambient.playing()) ambient.play()
      ambient.fade(ambient.volume(), 0.55, 1800)
    }
  },

  play(name: SfxName) {
    if (!enabled) return
    sfx[name]?.play()
  },
}
