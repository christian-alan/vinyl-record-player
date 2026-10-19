import { arcPath } from '../../lib/geometry'

const TEETH = Array.from({ length: 40 }, (_, i) => i * 9)

/** 33/45 switch, start/stop button with its quartz-lock LED, and the volume wheel. */
export default function Controls({ deck }) {
  return (
    <>
      <g
        ref={deck.ref('speed')}
        className="deck-focus cursor-pointer"
        tabIndex={0}
        role="switch"
        aria-label="Speed, 33 or 45 rpm"
        aria-checked="false"
        onClick={deck.toggleSpeed}
        onKeyDown={deck.onSpeedKey}
      >
        <rect x="1010" y="468" width="96" height="88" fill="transparent" />
        <rect x="1018" y="480" width="80" height="40" rx="20" fill="#CF4219" />
        <rect x="1019" y="481" width="78" height="38" rx="19" fill="none" stroke="rgba(0,0,0,.14)" strokeWidth="2" />
        <g ref={deck.ref('speedKnob')}>
          <rect x="1022" y="484" width="40" height="32" rx="16" fill="#28282B" />
          <rect x="1029" y="488" width="26" height="5" rx="2.5" fill="rgba(255,255,255,.12)" />
        </g>
        <text className="eng" x="1040" y="546">
          33
        </text>
        <text className="eng" x="1078" y="546">
          45
        </text>
      </g>

      <g
        ref={deck.ref('start')}
        className="deck-focus cursor-pointer"
        tabIndex={0}
        role="button"
        aria-label="Start or stop the platter"
        aria-pressed="false"
        onClick={deck.toggleMotor}
        onKeyDown={deck.onStartKey}
        onPointerDown={deck.onStartPress}
        onPointerUp={deck.onStartRelease}
        onPointerLeave={deck.onStartRelease}
        onPointerCancel={deck.onStartRelease}
      >
        <rect x="1016" y="556" width="84" height="126" fill="transparent" />
        <circle ref={deck.ref('ledGlow')} cx="1058" cy="574" r="15" fill="#FF5A2A" opacity="0" filter="url(#b4)" />
        <circle ref={deck.ref('led')} cx="1058" cy="574" r="5" fill="#8A2E12" />
        <rect x="1032" y="592" width="52" height="52" rx="16" fill="#CF4219" />
        <rect x="1033" y="593" width="50" height="50" rx="15" fill="none" stroke="rgba(0,0,0,.14)" strokeWidth="2" />
        <g ref={deck.ref('startKnob')}>
          <rect x="1037" y="596" width="42" height="42" rx="13" fill="#28282B" />
          <rect x="1043" y="600" width="30" height="5" rx="2.5" fill="rgba(255,255,255,.12)" />
        </g>
        <path d="M1052 658 L1066 666 L1052 674 Z" fill="#C2401A" />
      </g>

      <g
        ref={deck.ref('vol')}
        className="deck-focus cursor-pointer"
        tabIndex={0}
        role="slider"
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={70}
        onPointerDown={deck.onVolDown}
        onPointerMove={deck.onVolMove}
        onPointerUp={deck.onVolUp}
        onPointerCancel={deck.onVolUp}
        onKeyDown={deck.onVolKey}
      >
        <circle cx="990" cy="840" r="92" fill="transparent" />
        <path d={arcPath(990, 840, 78, -135, 135)} fill="none" stroke="#CF4219" strokeWidth="7" strokeLinecap="round" />
        <path ref={deck.ref('volFill')} fill="none" stroke="#2A2A2D" strokeWidth="7" strokeLinecap="round" />
        <circle cx="993" cy="846" r="58" fill="rgba(0,0,0,.3)" filter="url(#b4)" />
        <g ref={deck.ref('volKnob')}>
          {TEETH.map((a) => (
            <rect key={a} x="986.5" y="782" width="7" height="12" rx="2" fill="#E9E9E7" transform={`rotate(${a} 990 840)`} />
          ))}
          <circle cx="990" cy="840" r="52" fill="#EFEFED" />
          <circle cx="990" cy="840" r="40" fill="url(#knobG)" />
          <circle cx="990" cy="840" r="40" fill="none" stroke="rgba(0,0,0,.06)" strokeWidth="2" />
          <circle cx="990" cy="812" r="5" fill="#E8501F" />
        </g>
      </g>
    </>
  )
}
