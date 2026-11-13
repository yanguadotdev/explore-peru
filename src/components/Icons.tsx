import type { JSX } from 'react'
import type { IconKey } from '../data/stops'
import type { VehicleId } from '../lib/store'

type P = { size?: number; className?: string }

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const STOP_PATHS: Record<IconKey, JSX.Element> = {
  cherry: (
    <g {...stroke}>
      <path d="M24 8c-2 6-6 10-11 13M24 8c3 7 6 10 11 12" />
      <path d="M24 8c4-3 9-3 12-1-3 3-8 3-12 1z" />
      <circle cx="14" cy="29" r="7" />
      <circle cx="34" cy="28" r="7" />
      <path d="M12 26c1-1 2-1.5 3.5-1.5M32 25c1-1 2-1.5 3.5-1.5" />
    </g>
  ),
  tanks: (
    <g {...stroke}>
      <rect x="6" y="18" width="12" height="20" rx="2" />
      <rect x="22" y="14" width="12" height="24" rx="2" />
      <path d="M6 24h12M22 21h12M38 30c0 3-2 5-2 5s-2-2-2-5 2-6 2-6 2 3 2 6z" />
      <path d="M4 40h40" />
    </g>
  ),
  patio: (
    <g {...stroke}>
      <circle cx="35" cy="12" r="5" />
      <path d="M35 3v2M35 19v2M26 12h2M42 12h2" />
      <path d="M5 38l6-12h26l6 12z" />
      <path d="M14 32h20M10 36h28" strokeDasharray="1 4" />
    </g>
  ),
  sack: (
    <g {...stroke}>
      <path d="M15 10h18l-3 5c6 4 9 11 8 18-1 5-6 7-14 7s-13-2-14-7c-1-7 2-14 8-18z" />
      <path d="M17 15h14" />
      <ellipse cx="24" cy="29" rx="3.5" ry="5" transform="rotate(-25 24 29)" />
      <path d="M22.5 25c2 2 1 6 3 8" />
    </g>
  ),
  roaster: (
    <g {...stroke}>
      <path d="M10 22h24a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H10z" />
      <path d="M10 22v14M38 29h4M16 36l-3 6M30 36l3 6" />
      <path d="M17 18c-2-3 2-5 0-9M24 18c-2-3 2-5 0-9M31 18c-2-3 2-5 0-9" />
    </g>
  ),
  cup: (
    <g {...stroke}>
      <path d="M8 20h26v6c0 8-6 13-13 13S8 34 8 26z" />
      <path d="M34 23h3a4 4 0 0 1 0 8h-4" />
      <path d="M5 42h34" />
      <path d="M15 15c-2-3 2-4 0-8M22 15c-2-3 2-4 0-8M29 15c-2-3 2-4 0-8" />
    </g>
  ),
  mirador: (
    <g {...stroke}>
      <path d="M16 42l3-24h10l3 24M18 30h12M14 18h20l-10-9z" />
      <path d="M4 42h40" />
    </g>
  ),
  waterfall: (
    <g {...stroke}>
      <path d="M6 10h14v10M28 10h14" />
      <path d="M20 14v20M24 12v24M28 14v20" />
      <path d="M12 40c4-3 8-3 12 0s8 3 12 0" />
    </g>
  ),
  market: (
    <g {...stroke}>
      <path d="M6 18l4-9h28l4 9z" />
      <path d="M6 18c0 3 3 4 6 4s6-1 6-4c0 3 3 4 6 4s6-1 6-4c0 3 3 4 6 4s6-1 6-4" />
      <path d="M10 22v18h28V22M20 40v-9h8v9" />
    </g>
  ),
}

export function StopIcon({ icon, size = 32, className }: P & { icon: IconKey }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      {STOP_PATHS[icon]}
    </svg>
  )
}

export function VehicleIcon({ id, size = 56 }: P & { id: VehicleId }) {
  if (id === 'mula')
    return (
      <svg width={size} height={size} viewBox="0 0 64 48" aria-hidden="true">
        <rect x="14" y="16" width="30" height="13" rx="5" fill="#6A4A33" />
        <path d="M42 18l8-9 4 2-1 10-7 4z" fill="#6A4A33" />
        <path d="M49 9l1-6 2 6M52 10l3-5 0 6" stroke="#6A4A33" strokeWidth="2" fill="none" />
        <rect x="20" y="14" width="16" height="12" rx="2" fill="#CDB68A" />
        <rect x="19" y="12" width="18" height="3" rx="1" fill="#B24A2C" />
        <path d="M18 29v12M23 29v12M37 29v12M41 29v12" stroke="#4E3524" strokeWidth="3" strokeLinecap="round" />
        <path d="M14 19l-5 6" stroke="#3B281C" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  if (id === 'chiva')
    return (
      <svg width={size} height={size} viewBox="0 0 64 48" aria-hidden="true">
        <rect x="6" y="20" width="50" height="14" rx="2" fill="#F2C230" />
        <rect x="6" y="26" width="50" height="3" fill="#C8412B" />
        <rect x="6" y="29" width="50" height="2.5" fill="#2F6B9A" />
        <rect x="8" y="12" width="40" height="9" fill="#F7EEDC" />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={8 + i * 9.5} y="12" width="2" height="9" fill="#3E6A35" />
        ))}
        <rect x="48" y="16" width="10" height="16" rx="2" fill="#C8412B" />
        <rect x="6" y="10" width="44" height="3" fill="#3A2418" />
        <rect x="12" y="5" width="8" height="5" rx="1" fill="#CDB68A" />
        <rect x="22" y="5" width="8" height="5" rx="1" fill="#BFA676" />
        <rect x="32" y="5" width="8" height="5" rx="1" fill="#CDB68A" />
        <circle cx="16" cy="36" r="5" fill="#2B241F" />
        <circle cx="46" cy="36" r="5" fill="#2B241F" />
      </svg>
    )
  return (
    <svg width={size} height={size} viewBox="0 0 64 48" aria-hidden="true">
      <rect x="8" y="20" width="44" height="11" rx="2" fill="#3F7F86" />
      <rect x="40" y="16" width="14" height="6" rx="1" fill="#3F7F86" />
      <path d="M36 21l2-10" stroke="#2B4F55" strokeWidth="2.5" />
      <rect x="14" y="10" width="24" height="3" rx="1" fill="#E9DDC3" />
      <rect x="12" y="14" width="8" height="6" rx="1" fill="#CDB68A" />
      <rect x="21" y="14" width="8" height="6" rx="1" fill="#BFA676" />
      <rect x="54" y="25" width="5" height="4" fill="#2B241F" />
      <circle cx="18" cy="33" r="5.5" fill="#2B241F" />
      <circle cx="44" cy="33" r="5.5" fill="#2B241F" />
      <circle cx="18" cy="33" r="2.2" fill="#D9CFBB" />
      <circle cx="44" cy="33" r="2.2" fill="#D9CFBB" />
    </svg>
  )
}

export function Mark({ size = 28 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M6 48 L24 20 L33 32 L40 23 L58 48 Z" fill="currentColor" />
      <ellipse cx="32" cy="43" rx="7.5" ry="10.5" transform="rotate(-25 32 43)" fill="var(--cherry)" />
      <path d="M29 35 C34 40 30 46 35 51" stroke="var(--paper-3)" strokeWidth="2.2" fill="none" />
    </svg>
  )
}

export function Arrow({ size = 18 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={2.2}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function Close({ size = 18 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function Chevron({ size = 16, up = false }: P & { up?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...stroke} style={{ transform: up ? 'rotate(180deg)' : undefined }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function SoundIcon({ on, size = 18 }: P & { on: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={2}>
      <path d="M4 9h4l5-4v14l-5-4H4z" />
      {on ? <path d="M16 8.5c1.5 2 1.5 5 0 7M19 6c3 3.5 3 8.5 0 12" /> : <path d="M17 9l5 6M22 9l-5 6" />}
    </svg>
  )
}

export function MapIcon({ size = 18 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={2}>
      <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  )
}

export function ListIcon({ size = 18 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={2}>
      <circle cx="5" cy="6" r="1.4" />
      <circle cx="5" cy="12" r="1.4" />
      <circle cx="5" cy="18" r="1.4" />
      <path d="M10 6h10M10 12h10M10 18h10" />
    </svg>
  )
}
