import Platter from './deck/Platter'
import LeftRail from './deck/LeftRail'
import Controls from './deck/Controls'
import Tonearm from './deck/Tonearm'
import { VIEWBOX } from '../lib/geometry'

/** Top-down turntable. Layers are drawn back to front: plinth, platter and record, rail, controls, tonearm. */
export default function Turntable({ deck }) {
  return (
    <svg
      ref={deck.ref('svg')}
      viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
      aria-label="Turntable"
      className="block h-auto w-full touch-none overflow-visible select-none"
    >
      <defs>
        <filter id="b30" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="26" />
        </filter>
        <filter id="b8" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id="b4" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <linearGradient id="plinthG" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#F6652F" />
          <stop offset="1" stopColor="#EA5224" />
        </linearGradient>
        <radialGradient id="puckG" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#FF8456" />
          <stop offset="1" stopColor="#DF4D1C" />
        </radialGradient>
        <radialGradient id="domeG" cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#8E8E94" />
          <stop offset=".55" stopColor="#3A3A3F" />
          <stop offset="1" stopColor="#202023" />
        </radialGradient>
        <radialGradient id="knobG" cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E4E4E2" />
        </radialGradient>
        <radialGradient id="pknobG" cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#FF7D4D" />
          <stop offset="1" stopColor="#D9471A" />
        </radialGradient>
        <radialGradient id="pinG" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#A9A9AD" />
        </radialGradient>
      </defs>

      {/* Plinth */}
      <rect x="150" y="96" width="1040" height="860" rx="34" fill="var(--shadow)" filter="url(#b30)" />
      <rect x="140" y="60" width="1060" height="880" rx="34" fill="url(#plinthG)" />
      <rect x="141.5" y="61.5" width="1057" height="877" rx="33" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2" />
      <line x1="252" y1="62" x2="252" y2="938" stroke="#CC4519" strokeWidth="2" />
      <line x1="255" y1="62" x2="255" y2="938" stroke="rgba(255,255,255,.22)" strokeWidth="1.5" />
      <text x="300" y="900" className="font-display" fontWeight="600" fontSize="24" letterSpacing="9" fill="#C9431A">
        SPINDLE
      </text>
      <text x="300" y="922" className="font-mono" fontSize="12" letterSpacing="2" fill="#C9431A">
        TT‑1 · 33⅓ / 45
      </text>

      <Platter deck={deck} />
      <LeftRail deck={deck} />
      <Controls deck={deck} />

      {/* Power cable */}
      <rect x="1196" y="756" width="124" height="22" rx="5" fill="#ECECEA" />
      <rect x="1196" y="756" width="34" height="22" rx="4" fill="#DADAD8" />

      <Tonearm deck={deck} />
    </svg>
  )
}
