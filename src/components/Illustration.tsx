import type { Stop } from '../data/stops'
import { StopIcon } from './Icons'

const SKIES: Record<string, [string, string]> = {
  finca: ['#B8CFD2', '#F4DDB8'],
  beneficio: ['#A9C5C9', '#EFD9B2'],
  patios: ['#F2C98F', '#F8E6C4'],
  trilladora: ['#C9D5CB', '#F1E2C2'],
  tostaduria: ['#E8A77C', '#F6D8B1'],
  pueblo: ['#E4B48C', '#F7E3C3'],
}

/** Flat landscape vignette used on hover cards and the stop panel header. */
export function Illustration({ stop, className }: { stop: Stop; className?: string }) {
  const [top, bottom] = SKIES[stop.id] ?? ['#BFD0CC', '#F2E2C4']
  const gid = `sky-${stop.id}`
  const hi = Math.min(1, (stop.altitude - 1200) / 1000)
  return (
    <svg className={className} viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${gid})`} />
      <circle cx="250" cy={56 - hi * 10} r="18" fill="#FBEBC9" opacity=".9" />
      <path d={`M0 ${120 - hi * 30} C60 ${80 - hi * 30} 90 ${110 - hi * 20} 140 ${90 - hi * 30} S230 ${70 - hi * 20} 320 ${100 - hi * 25} V180 H0Z`} fill="#9DB0A0" />
      <path d="M0 140 C70 110 120 135 180 118 S270 112 320 128 V180 H0Z" fill="#5E7E5C" />
      <path d="M0 160 C80 140 150 162 220 148 S300 146 320 152 V180 H0Z" fill="#2F5A33" />
      {Array.from({ length: 14 }).map((_, i) => (
        <circle key={i} cx={12 + i * 23} cy={156 - Math.sin(i * 1.3) * 4} r={5 + (i % 3)} fill="#244A2A" />
      ))}
      <g transform="translate(124 52)" color="#3A2418">
        <circle cx="36" cy="36" r="38" fill="#FBF7EE" opacity=".92" />
        <g transform="translate(6 6) scale(1.25)">
          <StopIcon icon={stop.icon} size={48} />
        </g>
      </g>
    </svg>
  )
}
