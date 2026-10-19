// The black rail on the left: the dust-brush carriage on top, the pitch fader below.

const RACK = Array.from({ length: 37 }, (_, i) => 602 + i * 7)
const TICKS = [
  ['+8', 610],
  ['', 670],
  ['0', 730],
  ['', 790],
  ['−8', 850],
]
const BRISTLES = Array.from({ length: 16 }, (_, i) => 474 + i * 6)

function BrushShape({ silhouette, deck }) {
  const f = (c) => (silhouette ? '#000' : c)
  return (
    <>
      <rect x="70" y="312" width="700" height="38" rx="10" fill={f('#2A2A2D')} />
      {!silhouette && <rect x="78" y="318" width="686" height="4" rx="2" fill="rgba(255,255,255,.07)" />}
      <rect x="296" y="352" width="128" height="26" rx="9" fill={f('#DADADC')} />
      {!silhouette && (
        <>
          <rect x="296" y="352" width="22" height="26" rx="8" fill="#C4C4C8" />
          <rect x="330" y="357" width="80" height="3" rx="1.5" fill="rgba(255,255,255,.6)" />
        </>
      )}
      <circle cx="444" cy="365" r="15" fill={f('#F3F3F1')} />
      {!silhouette && <circle cx="444" cy="365" r="6" fill="#D6D6D4" />}
      <rect x="470" y="388" width="100" height="14" rx="5" fill={f('#A39686')} />
      {!silhouette && (
        <g stroke="rgba(0,0,0,.18)" strokeWidth="1.2">
          {BRISTLES.map((x) => (
            <line key={x} x1={x} y1="391" x2={x} y2="401" />
          ))}
        </g>
      )}
      <circle cx="520" cy="331" r="64" fill={f('#262629')} />
      {!silhouette && (
        <>
          <circle cx="520" cy="331" r="56" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="2" />
          <circle cx="520" cy="331" r="31" fill="url(#domeG)" />
          <circle ref={deck.ref('brushLed')} cx="568" cy="372" r="4.5" fill="#5A2A1C" />
          <rect x="60" y="290" width="720" height="130" fill="transparent" />
        </>
      )}
    </>
  )
}

export default function LeftRail({ deck }) {
  return (
    <>
      {/* Cable loop off the left edge */}
      <path d="M150 300 C 70 300, 18 320, 22 352 C 26 384, 90 396, 150 386" fill="none" stroke="#141415" strokeWidth="2.5" />
      <path d="M150 316 C 96 316, 44 330, 46 354 C 48 374, 100 380, 150 372" fill="none" stroke="#141415" strokeWidth="2" />
      <rect x="150" y="180" width="72" height="750" rx="18" fill="#232325" />
      <rect x="151" y="181" width="70" height="748" rx="17" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="2" />

      {/* Pitch fader */}
      <text className="rail-t" x="186" y="580" textAnchor="middle" letterSpacing="2">
        PITCH
      </text>
      {RACK.map((y) => (
        <rect key={y} x="158" y={y} width="7" height="3" rx="1" fill="#3A3A3E" />
      ))}
      <rect x="168" y="596" width="16" height="268" rx="8" fill="#0E0E0F" />
      {TICKS.map(([t, y]) => (
        <g key={y}>
          <rect x="190" y={y - 1} width={t === '0' ? 12 : 8} height="2" fill="#6E6E74" />
          {t && (
            <text className="rail-t" x="220" y={y + 4.5} textAnchor="end">
              {t}
            </text>
          )}
        </g>
      ))}
      <g
        ref={deck.ref('pitch')}
        className="deck-focus cursor-pointer"
        tabIndex={0}
        role="slider"
        aria-label="Pitch, percent"
        aria-valuemin={-8}
        aria-valuemax={8}
        aria-valuenow={0}
        onPointerDown={deck.onPitchDown}
        onPointerMove={deck.onPitchMove}
        onPointerUp={deck.onPitchUp}
        onPointerCancel={deck.onPitchUp}
        onDoubleClick={deck.onPitchReset}
        onKeyDown={deck.onPitchKey}
      >
        <rect x="150" y="590" width="72" height="280" fill="transparent" />
        <g ref={deck.ref('pitchKnob')}>
          <circle cx="176" cy="733" r="25" fill="rgba(0,0,0,.4)" filter="url(#b4)" />
          <circle cx="176" cy="730" r="24" fill="url(#pknobG)" />
          <circle cx="176" cy="730" r="16" fill="none" stroke="rgba(0,0,0,.12)" strokeWidth="2" />
          <rect x="164" y="728.5" width="24" height="3" rx="1.5" fill="rgba(255,255,255,.55)" />
        </g>
      </g>

      {/* Brush carriage */}
      <rect x="146" y="276" width="80" height="210" rx="10" fill="#28282B" />
      <rect x="160" y="290" width="52" height="182" rx="6" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="2" />
      {[262, 502].map((y) => (
        <g key={y}>
          <circle cx="186" cy={y} r="13" fill="#F2F2F0" stroke="#CFCFCF" strokeWidth="1.5" />
          <circle cx="186" cy={y} r="5" fill="#DCDCDC" />
        </g>
      ))}

      {/* Dust brush arm: tap to lower it onto the record */}
      <g ref={deck.ref('brushShadow')} filter="url(#b8)" pointerEvents="none" transform="translate(20 26)">
        <BrushShape silhouette deck={deck} />
      </g>
      <g
        ref={deck.ref('brush')}
        transform="translate(-2 -6)"
        className="deck-focus cursor-pointer"
        tabIndex={0}
        role="switch"
        aria-checked="false"
        aria-label="Dust brush"
        onClick={deck.toggleBrush}
        onKeyDown={deck.onBrushKey}
      >
        <BrushShape deck={deck} />
      </g>
    </>
  )
}
