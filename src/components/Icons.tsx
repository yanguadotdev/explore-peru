import { useId, type JSX } from 'react'
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
  beach: (
    <g {...stroke}>
      <circle cx="34" cy="12" r="5" />
      <path d="M14 38c0-10 2-18 6-24M20 14c-5-1-9 1-11 4M20 14c4-3 9-3 12 0M20 14c-1 4 0 7 2 9" />
      <path d="M4 40c6-3 12-3 18 0s12 3 18 0" />
    </g>
  ),
  wave: (
    <g {...stroke}>
      <path d="M4 34c6-14 18-22 30-18 6 2 9 7 7 12-3-4-8-5-12-2-3 2-4 6-3 8" />
      <path d="M4 42c6-3 12-3 18 0s12 3 18 0" />
    </g>
  ),
  pyramid: (
    <g {...stroke}>
      <path d="M6 40h36L34 30H14z" />
      <path d="M14 30l3-8h14l3 8M17 22l3-7h8l3 7" />
    </g>
  ),
  ruins: (
    <g {...stroke}>
      <path d="M6 40h36M8 40V24h10v16M22 40V18h10v22M36 40V28h5v12" />
      <path d="M8 30h10M22 26h10M22 33h10" />
    </g>
  ),
  church: (
    <g {...stroke}>
      <path d="M10 40V20h28v20M14 20v-6h6v6M28 20v-6h6v6M17 14V9M31 14V9" />
      <path d="M20 40v-9a4 4 0 0 1 8 0v9" />
    </g>
  ),
  fortress: (
    <g {...stroke}>
      <ellipse cx="24" cy="30" rx="18" ry="8" />
      <path d="M6 30v6c0 4 8 8 18 8s18-4 18-8v-6" />
      <path d="M16 27l3-6 3 6M26 25l3-6 3 6" />
    </g>
  ),
  dolphin: (
    <g {...stroke}>
      <path d="M6 30c6-12 20-16 32-10l4-4 1 7c2 2 2 4 0 6-8-2-14 0-20 6l-2-5c-5 1-11 2-15 0z" />
      <path d="M4 42c6-3 12-3 18 0s12 3 18 0" />
    </g>
  ),
  orchid: (
    <g {...stroke}>
      <circle cx="24" cy="22" r="4" />
      <path d="M24 18c-3-8 3-12 6-8M24 18c3-8-3-12-6-8M20 22c-8-2-10 5-5 7M28 22c8-2 10 5 5 7M24 26c-2 6 0 10 0 10s2-4 0-10" />
      <path d="M24 36v6" />
    </g>
  ),
  mountain: (
    <g {...stroke}>
      <path d="M4 40l14-24 8 12 5-6 13 18z" />
      <path d="M14 23l4 2 4-3M28 26l3 1" />
    </g>
  ),
  textile: (
    <g {...stroke}>
      <rect x="8" y="8" width="32" height="32" rx="2" />
      <path d="M8 18h8v8h8v8h8M40 18h-8v8M16 40v-6M24 8v6h8" />
    </g>
  ),
  city: (
    <g {...stroke}>
      <path d="M6 40h36M10 40V22h8v18M22 40V12h8v28M34 40V18h6v22" />
      <path d="M25 18h2M25 24h2M25 30h2M13 28h2M13 34h2" />
    </g>
  ),
  port: (
    <g {...stroke}>
      <path d="M6 34h36l-5 6H11z" />
      <path d="M14 34V22h14v12M28 26h8v8M18 22v-6h6v6" />
    </g>
  ),
  train: (
    <g {...stroke}>
      <rect x="10" y="10" width="28" height="22" rx="4" />
      <path d="M10 22h28M16 32l-4 8M32 32l4 8M8 40h32" />
      <circle cx="17" cy="27" r="1.5" />
      <circle cx="31" cy="27" r="1.5" />
    </g>
  ),
  dance: (
    <g {...stroke}>
      <circle cx="24" cy="9" r="4" />
      <path d="M24 13v14l-6 13M24 27l6 13M24 18l-10-6M24 18l10-6" />
      <path d="M10 10l5 4M38 10l-5 4" />
    </g>
  ),
  desert: (
    <g {...stroke}>
      <path d="M4 38c8-10 16-10 24-4 6-6 12-5 16 4" />
      <path d="M24 26v-16M24 14l-5-4M24 18l5-4" />
      <path d="M4 42h40" />
    </g>
  ),
  canyon: (
    <g {...stroke}>
      <path d="M4 12l8 6 4 16 4 6h8l4-6 4-16 8-6" />
      <path d="M22 40c1-4-1-7 2-10 2-2 1-5 0-7" />
    </g>
  ),
  machu: (
    <g {...stroke}>
      <path d="M22 26l8-18 10 18" />
      <path d="M4 42h40M6 42v-6h36v6M9 36v-5h30v5M13 31v-5h22" />
    </g>
  ),
  macaw: (
    <g {...stroke}>
      <path d="M26 8c-6 0-10 4-10 10v6l-6 16 10-8 6 10 2-14c6-2 8-8 6-14-2-4-5-6-8-6z" />
      <path d="M30 14c3 0 5 2 5 4l-4 1" />
      <circle cx="27" cy="13" r="1.4" />
    </g>
  ),
  lake: (
    <g {...stroke}>
      <path d="M4 16l8-6 6 4 8-6 8 5 10-3" />
      <ellipse cx="24" cy="30" rx="18" ry="8" />
      <path d="M14 30c3-2 6-2 9 0M26 32c3-2 6-2 9 0" />
    </g>
  ),
  volcano: (
    <g {...stroke}>
      <path d="M4 40l14-22h12l14 22z" />
      <path d="M18 18l3 4 3-3 3 3 3-4" />
      <path d="M22 12c-2-3 2-5 0-8M28 12c-2-3 2-5 0-8" />
    </g>
  ),
  grape: (
    <g {...stroke}>
      <path d="M24 6v6M24 10c4-4 9-4 11-1" />
      <circle cx="18" cy="18" r="4" />
      <circle cx="26" cy="18" r="4" />
      <circle cx="22" cy="25" r="4" />
      <circle cx="30" cy="25" r="4" />
      <circle cx="26" cy="32" r="4" />
      <circle cx="22" cy="39" r="3.5" />
    </g>
  ),
  flag: (
    <g {...stroke}>
      <path d="M10 42V6" />
      <path d="M10 8h28v18H10" />
      <path d="M19 8v18M29 8v18" />
    </g>
  ),
  compass: (
    <g {...stroke}>
      <circle cx="24" cy="24" r="17" />
      <path d="M24 12l5 12-5 12-5-12z" />
      <path d="M24 4v4M24 40v4M4 24h4M40 24h4" />
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
  if (id === 'llama')
    return (
      <svg width={size} height={size} viewBox="0 0 64 48" aria-hidden="true">
        <rect x="16" y="20" width="24" height="11" rx="5" fill="#EFE4D0" />
        <path d="M36 22V8h6v14z" fill="#EFE4D0" />
        <rect x="36" y="6" width="12" height="6" rx="3" fill="#EFE4D0" />
        <path d="M38 6l1-5 2 5M42 6l1-5 2 5" fill="#EFE4D0" />
        <rect x="20" y="18" width="14" height="10" rx="2" fill="#C8412B" />
        <rect x="20" y="22" width="14" height="2" fill="#E2A43A" />
        <path d="M19 31v12M23 31v12M34 31v12M38 31v12" stroke="#D9CCB4" strokeWidth="3" strokeLinecap="round" />
        <circle cx="46" cy="9" r="1" fill="#3A2A20" />
      </svg>
    )
  if (id === 'tren')
    return (
      <svg width={size} height={size} viewBox="0 0 64 48" aria-hidden="true">
        <rect x="32" y="16" width="26" height="16" rx="3" fill="#23466E" />
        <rect x="34" y="10" width="10" height="8" fill="#23466E" />
        <rect x="52" y="10" width="4" height="7" fill="#2B241F" />
        <rect x="4" y="16" width="26" height="16" rx="3" fill="#23466E" />
        <rect x="6" y="18" width="22" height="6" rx="1" fill="#9FC3DA" />
        <rect x="4" y="26" width="54" height="2.5" fill="#E2A43A" />
        {[9, 21, 38, 52].map((x) => (
          <circle key={x} cx={x} cy="35" r="4" fill="#2B241F" />
        ))}
        <rect x="2" y="40" width="60" height="2" fill="#6B4630" />
      </svg>
    )
  return (
    <svg width={size} height={size} viewBox="0 0 64 48" aria-hidden="true">
      <rect x="6" y="14" width="50" height="18" rx="4" fill="#F4F1EA" />
      <rect x="6" y="25" width="50" height="3" fill="#2F6B9A" />
      <rect x="6" y="28" width="50" height="2" fill="#C8412B" />
      <rect x="10" y="17" width="38" height="6" rx="1" fill="#3A4B5A" />
      <rect x="49" y="17" width="6" height="7" rx="1" fill="#3A4B5A" />
      <rect x="16" y="9" width="22" height="4" rx="1" fill="#3A2418" />
      <rect x="18" y="5" width="8" height="4" rx="1" fill="#E2A43A" />
      <rect x="28" y="6" width="6" height="3" rx="1" fill="#3E7A4A" />
      <circle cx="17" cy="33" r="5" fill="#2B241F" />
      <circle cx="45" cy="33" r="5" fill="#2B241F" />
      <circle cx="17" cy="33" r="2" fill="#D9CFBB" />
      <circle cx="45" cy="33" r="2" fill="#D9CFBB" />
    </svg>
  )
}

/**
 * Brand mark: the flag of Peru (red · white · red), drawn waving with soft
 * fold shading. `size` is the flag height; width follows the 3:2 ratio.
 */
export function Mark({ size = 28, className }: P) {
  const w = Math.round(size * 1.5)
  // unique ids: a shared id would resolve to the first copy (e.g. inside the hidden hero)
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const clip = `flag-wave-${uid}`
  const folds = `flag-folds-${uid}`
  return (
    <svg width={w} height={size} viewBox="0 0 60 40" className={`peru-flag ${className ?? ''}`} aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <path d="M2 4 C14 1 22 7 32 4 S50 1 58 4 V36 C50 33 42 39 32 36 S14 33 2 36 Z" />
        </clipPath>
        <linearGradient id={folds} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity=".18" />
          <stop offset=".22" stopColor="#fff" stopOpacity=".16" />
          <stop offset=".45" stopColor="#000" stopOpacity=".12" />
          <stop offset=".7" stopColor="#fff" stopOpacity=".14" />
          <stop offset="1" stopColor="#000" stopOpacity=".16" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect x="0" y="0" width="20.5" height="40" fill="#D91023" />
        <rect x="20" y="0" width="20.5" height="40" fill="#FFFFFF" />
        <rect x="40" y="0" width="20" height="40" fill="#D91023" />
        <rect x="0" y="0" width="60" height="40" fill={`url(#${folds})`} />
      </g>
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
