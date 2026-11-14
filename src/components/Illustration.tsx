import type { Region, Stop } from '../data/stops'
import { StopIcon } from './Icons'

/** Palette per natural region: sky (top → bottom) and three hill layers. */
const LOOK: Record<Region, { sky: [string, string]; hills: [string, string, string]; dots: string }> = {
  Costa: { sky: ['#F0C48E', '#F8E6C4'], hills: ['#E2C590', '#CFA769', '#B98A52'], dots: '#8E6A3E' },
  Sierra: { sky: ['#A9C5D6', '#F1E2C2'], hills: ['#A5ABB5', '#7E9468', '#4F7346'], dots: '#3E5A35' },
  Selva: { sky: ['#B9D3C2', '#EEF0D6'], hills: ['#6E9A72', '#3F7A45', '#285E33'], dots: '#1E4A28' },
}

/** Flat landscape vignette used on hover cards and the stop panel header. */
export function Illustration({ stop, className }: { stop: Stop; className?: string }) {
  const look = LOOK[stop.stage]
  const [top, bottom] = look.sky
  const gid = `sky-${stop.id}`
  const hi = Math.min(1, stop.altitude / 4000)
  return (
    <svg className={className} viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${gid})`} />
      <circle cx="250" cy={58 - hi * 12} r="18" fill="#FBEBC9" opacity=".9" />
      {stop.stage === 'Sierra' && (
        <path d={`M0 ${118 - hi * 40} L60 ${70 - hi * 30} L95 ${100 - hi * 30} L150 ${60 - hi * 35} L205 ${95 - hi * 25} L260 ${72 - hi * 30} L320 ${105 - hi * 30} V180 H0Z`} fill={look.hills[0]} />
      )}
      {stop.stage === 'Sierra' && hi > 0.55 && <path d={`M150 ${60 - hi * 35} L138 ${74 - hi * 35} L162 ${74 - hi * 35}Z`} fill="#F4F2EC" />}
      {stop.stage !== 'Sierra' && <path d="M0 120 C60 88 90 110 140 94 S230 78 320 100 V180 H0Z" fill={look.hills[0]} />}
      <path d="M0 140 C70 110 120 135 180 118 S270 112 320 128 V180 H0Z" fill={look.hills[1]} />
      <path d="M0 160 C80 140 150 162 220 148 S300 146 320 152 V180 H0Z" fill={look.hills[2]} />
      {Array.from({ length: 14 }).map((_, i) => (
        <circle key={i} cx={12 + i * 23} cy={156 - Math.sin(i * 1.3) * 4} r={stop.stage === 'Costa' ? 3 : 5 + (i % 3)} fill={look.dots} />
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
