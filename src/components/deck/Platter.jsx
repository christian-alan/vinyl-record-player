import { C, R_REC } from '../../lib/geometry'

const STROBE_DOTS = Array.from({ length: 72 }, (_, i) => (i / 72) * Math.PI * 2)
const MAT_RINGS = Array.from({ length: 20 }, (_, i) => 40 + i * 16)
const box = { x: C.x - R_REC, y: C.y - R_REC, width: R_REC * 2, height: R_REC * 2 }

/** Platter, strobe dots, the record itself and the centre puck. */
export default function Platter({ deck }) {
  return (
    <>
      <circle cx={C.x} cy={C.y} r="381" fill="#D84A1D" />
      <circle cx={C.x} cy={C.y} r="379.5" fill="none" stroke="rgba(255,255,255,.24)" strokeWidth="1.5" />
      <g ref={deck.ref('strobe')}>
        {STROBE_DOTS.map((a, i) => (
          <circle key={i} cx={C.x + 371 * Math.cos(a)} cy={C.y + 371 * Math.sin(a)} r="2.3" fill="#A8320D" />
        ))}
      </g>

      {/* Rubber mat, visible when the platter is empty */}
      <circle cx={C.x} cy={C.y} r={R_REC} fill="#E0501F" />
      {MAT_RINGS.map((r) => (
        <circle key={r} cx={C.x} cy={C.y} r={r} fill="none" stroke="rgba(0,0,0,.07)" strokeWidth="2" />
      ))}
      <circle cx={C.x} cy={C.y} r={R_REC} fill="none" stroke="rgba(0,0,0,.1)" strokeWidth="3" />

      <circle
        ref={deck.ref('dropRing')}
        cx={C.x}
        cy={C.y}
        r="368"
        fill="rgba(255,255,255,.08)"
        stroke="rgba(255,255,255,.75)"
        strokeWidth="3"
        strokeDasharray="10 12"
        opacity="0"
      />
      <circle ref={deck.ref('recShadow')} cx={C.x + 4} cy={C.y + 8} r={R_REC} fill="rgba(0,0,0,.45)" filter="url(#b8)" opacity="0" />

      <g ref={deck.ref('rec')} opacity="0">
        <image ref={deck.ref('recImg')} {...box} />
      </g>
      <image ref={deck.ref('sheen')} {...box} opacity="0" pointerEvents="none" />

      {/* Hit area: grab the label to lift the record, the grooves to scratch */}
      <circle
        className="cursor-grab active:cursor-grabbing"
        cx={C.x}
        cy={C.y}
        r={R_REC}
        fill="transparent"
        aria-hidden="true"
        onPointerDown={deck.onPlatterDown}
        onPointerMove={deck.onPlatterMove}
        onPointerUp={deck.onPlatterUp}
        onPointerCancel={deck.onPlatterUp}
      />

      <g pointerEvents="none">
        <circle cx={C.x} cy={C.y} r="9" fill="url(#pinG)" />
        <g ref={deck.ref('puck')} opacity="0">
          <circle cx={C.x + 4} cy={C.y + 6} r="49" fill="rgba(0,0,0,.35)" filter="url(#b4)" />
          <circle cx={C.x} cy={C.y} r="48" fill="url(#puckG)" />
          <circle cx={C.x} cy={C.y} r="33" fill="#EE5A28" stroke="rgba(0,0,0,.08)" strokeWidth="1.5" />
          <circle cx={C.x} cy={C.y} r="8" fill="#F8784A" />
          <ellipse cx={C.x - 3} cy={C.y - 3.5} rx="3" ry="2" fill="rgba(255,255,255,.7)" />
        </g>
      </g>
    </>
  )
}
