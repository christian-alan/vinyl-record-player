import { PIV } from '../../lib/geometry'

const BEAM = 'M0 0 C -4 110, -20 190, -18 300 S 0 470, 0 556'

/** Arm drawn pointing down from its pivot at the origin; the stylus tip is at (0, 700). */
function ArmShape({ silhouette }) {
  const f = (c) => (silhouette ? '#000' : c)
  return (
    <>
      <rect x="-30" y="-104" width="60" height="58" rx="14" fill={f('#2B2B2E')} />
      {!silhouette && (
        <>
          <rect x="-30" y="-82" width="60" height="3" fill="rgba(255,255,255,.08)" />
          <rect x="-30" y="-70" width="60" height="3" fill="rgba(255,255,255,.08)" />
        </>
      )}
      <path d={BEAM} fill="none" stroke={f('#2A2A2D')} strokeWidth="30" strokeLinecap="round" />
      {!silhouette && (
        <path
          d="M-8 8 C -12 110, -28 190, -26 300 S -8 470, -8 548"
          fill="none"
          stroke="rgba(255,255,255,.10)"
          strokeWidth="4"
          strokeLinecap="round"
        />
      )}
      <circle r="40" fill={f('#2F2F33')} />
      {!silhouette && (
        <>
          <circle r="18" fill="#1D1D20" />
          <circle r="5" fill="#CFCFD2" />
        </>
      )}
      {/* Headshell, cartridge and finger lift */}
      <path d="M-26 540 L24 540 L32 706 Q33 724 16 724 L-14 724 Q-30 724 -30 708 Z" fill={f('#222225')} />
      <path d="M28 628 L72 660" stroke={f('#222225')} strokeWidth="10" strokeLinecap="round" />
      {!silhouette && (
        <>
          <rect x="-14" y="636" width="30" height="72" rx="5" fill="#141416" />
          <circle cx="0" cy="700" r="3.2" fill="#E6E6E6" />
          {/* Generous invisible grab area */}
          <path d={BEAM} fill="none" stroke="transparent" strokeWidth="80" />
          <rect x="-60" y="520" width="140" height="230" fill="transparent" />
        </>
      )}
    </>
  )
}

export default function Tonearm({ deck }) {
  return (
    <>
      <circle cx={PIV.x} cy={PIV.y} r="66" fill="#232325" />
      <circle cx={PIV.x} cy={PIV.y} r="58" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="2" />
      <rect x="1126" y="548" width="48" height="26" rx="8" fill="#1D1D1F" />
      <g ref={deck.ref('armShadow')} filter="url(#b8)" pointerEvents="none" transform={`translate(${PIV.x + 9} ${PIV.y + 12})`}>
        <ArmShape silhouette />
      </g>
      <g
        ref={deck.ref('arm')}
        transform={`translate(${PIV.x} ${PIV.y})`}
        className="deck-focus cursor-grab active:cursor-grabbing"
        tabIndex={0}
        role="button"
        aria-label="Tonearm. Enter plays from the start, or returns the arm to rest."
        onPointerDown={deck.onArmDown}
        onPointerMove={deck.onArmMove}
        onPointerUp={deck.onArmUp}
        onPointerCancel={deck.onArmUp}
        onKeyDown={deck.onArmKey}
      >
        <ArmShape />
      </g>
    </>
  )
}
