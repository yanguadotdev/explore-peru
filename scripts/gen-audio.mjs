// Procedurally synthesises the experience's audio (no third-party samples).
// Run: pnpm audio  → writes WAV files into public/audio
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SR = 22050
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'audio')
mkdirSync(out, { recursive: true })

let seed = 66
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 4294967296
}

function writeWav(name, data) {
  const buf = Buffer.alloc(44 + data.length * 2)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + data.length * 2, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(SR, 24)
  buf.writeUInt32LE(SR * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(data.length * 2, 40)
  for (let i = 0; i < data.length; i++) {
    const v = Math.max(-1, Math.min(1, data[i]))
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2)
  }
  writeFileSync(join(out, name), buf)
  console.log('wrote', name, (buf.length / 1024).toFixed(0) + 'kb')
}

const normalize = (d, peak = 0.9) => {
  let m = 0
  for (const v of d) m = Math.max(m, Math.abs(v))
  return d.map((v) => (v / (m || 1)) * peak)
}

// ---------- ambient: wind + distant stream + birds, seamless 24s loop ----------
{
  const len = 25 * SR
  const loop = 24 * SR
  const d = new Float32Array(len)
  let brown = 0
  let lp = 0
  for (let i = 0; i < len; i++) {
    const t = i / SR
    const white = rnd() * 2 - 1
    brown = (brown + 0.02 * white) * 0.995
    lp += 0.35 * (white - lp)
    const gust = 0.55 + 0.45 * Math.sin(t * 0.37) * Math.sin(t * 0.13 + 1.2)
    d[i] = brown * 2.2 * gust + lp * 0.05
  }
  // birds
  for (let k = 0; k < 14; k++) {
    const start = Math.floor(rnd() * (len - SR))
    const notes = 2 + Math.floor(rnd() * 4)
    const f0 = 2300 + rnd() * 1600
    for (let n = 0; n < notes; n++) {
      const s = start + Math.floor(n * SR * (0.09 + rnd() * 0.05))
      const dur = Math.floor(SR * (0.05 + rnd() * 0.05))
      let ph = 0
      for (let i = 0; i < dur && s + i < len; i++) {
        const p = i / dur
        const f = f0 * (1 + 0.35 * Math.sin(p * Math.PI)) * (n % 2 ? 1.12 : 1)
        ph += (2 * Math.PI * f) / SR
        d[s + i] += Math.sin(ph) * Math.sin(p * Math.PI) ** 2 * 0.09
      }
    }
  }
  const res = new Float32Array(loop)
  const xf = SR
  for (let i = 0; i < loop; i++) res[i] = d[i]
  for (let i = 0; i < xf; i++) {
    const a = i / xf
    res[i] = d[i] * a + d[loop + i] * (1 - a)
  }
  writeWav('ambient.wav', normalize(res, 0.7))
}

// ---------- ui ticks ----------
function tone(dur, fn) {
  const n = Math.floor(dur * SR)
  const d = new Float32Array(n)
  for (let i = 0; i < n; i++) d[i] = fn(i / SR, i / n)
  return d
}
writeWav(
  'click.wav',
  normalize(tone(0.08, (t, p) => (Math.sin(2 * Math.PI * 1600 * t) * 0.7 + (rnd() * 2 - 1) * 0.3 * (1 - p) ** 8) * (1 - p) ** 4), 0.6),
)
writeWav('hover.wav', normalize(tone(0.05, (t, p) => Math.sin(2 * Math.PI * 1150 * t) * (1 - p) ** 3), 0.4))
writeWav(
  'swap.wav',
  normalize(
    tone(0.22, (t, p) => {
      const f = 280 + 520 * p
      return Math.sin(2 * Math.PI * f * t) * Math.sin(Math.PI * p) * (1 - p)
    }),
    0.6,
  ),
)

// ---------- stamp: low thud + paper slap ----------
{
  let ph = 0
  let lp = 0
  writeWav(
    'stamp.wav',
    normalize(
      tone(0.45, (t, p) => {
        const f = 95 - 45 * p
        ph += (2 * Math.PI * f) / SR
        lp += 0.25 * (rnd() * 2 - 1 - lp)
        return Math.sin(ph) * (1 - p) ** 3 + lp * 1.4 * Math.exp(-t * 45)
      }),
      0.85,
    ),
  )
}

// ---------- whoosh: swept filtered noise ----------
{
  let lp = 0
  let lp2 = 0
  writeWav(
    'whoosh.wav',
    normalize(
      tone(1.8, (t, p) => {
        const env = Math.sin(Math.PI * Math.min(1, p * 1.25)) ** 2
        const c = 0.02 + 0.25 * Math.sin(Math.PI * p)
        lp += c * (rnd() * 2 - 1 - lp)
        lp2 += c * (lp - lp2)
        return lp2 * env
      }),
      0.7,
    ),
  )
}
