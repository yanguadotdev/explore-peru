import type { Stop } from '../data/stops'
import { StopIcon } from './Icons'

/** Passport-style stamp for a stop. */
export function Stamp({ stop, collected, size = 132 }: { stop: Stop; collected: boolean; size?: number }) {
  const id = `ring-${stop.id}`
  const color = collected ? 'var(--cherry)' : 'rgba(58,36,24,.28)'
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" aria-hidden="true" style={{ color }}>
      <defs>
        <path id={id} d="M70 70 m-50 0 a50 50 0 1 1 100 0 a50 50 0 1 1 -100 0" />
      </defs>
      <circle cx="70" cy="70" r="66" fill="none" stroke="currentColor" strokeWidth={collected ? 3 : 2} strokeDasharray={collected ? undefined : '5 6'} />
      <circle cx="70" cy="70" r="40" fill="none" stroke="currentColor" strokeWidth="2" />
      {collected && (
        <text fontFamily="var(--sans)" fontSize="10.5" fontWeight="800" letterSpacing="2.2" fill="currentColor">
          <textPath href={`#${id}`}>
            {`ALTURA · RUTA DEL CAFÉ · ${stop.altitude} MSNM ·`}
          </textPath>
        </text>
      )}
      <g transform="translate(46 40)">
        <StopIcon icon={stop.icon} size={48} />
      </g>
      <text x="70" y="102" textAnchor="middle" fontFamily="var(--display)" fontWeight="700" fontSize="13" fill="currentColor">
        {String(stop.index).padStart(2, '0')}
      </text>
    </svg>
  )
}
