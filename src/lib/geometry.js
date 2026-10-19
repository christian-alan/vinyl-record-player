// Everything on the deck is drawn in one SVG coordinate space (viewBox 0 0 1320 1000).

export const VIEWBOX = { w: 1320, h: 1000 }

/** Platter centre and record radii. Grooves run from R_OUT (lead-in) to R_IN (run-out). */
export const C = { x: 640, y: 510 }
export const R_REC = 362
export const R_OUT = 352
export const R_IN = 150
/** Grabbing inside this radius lifts the record off the platter; outside it you scratch. */
export const R_LABEL = 104

/** Tonearm pivot and the distance from pivot to stylus tip. */
export const PIV = { x: 1150, y: 96 }
export const ARM_L = 700

/** Platter speeds in revolutions per second. Records are cut at 33⅓. */
export const NOM33 = 100 / 3 / 60
export const NOM45 = 45 / 60

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Small seeded PRNG so artwork and melodies are the same on every load. */
export const mulberry = (a) => () => {
  a |= 0
  a = (a + 0x6d2b79f5) | 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export const fmt = (s) => {
  s = Math.max(0, Math.floor(s))
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
}

/** Stylus tip for an arm angle θ (0 = on the rest, positive = swung over the record). */
export const stylus = (th) => ({ x: PIV.x - ARM_L * Math.sin(th), y: PIV.y + ARM_L * Math.cos(th) })
export const stylusR = (th) => {
  const s = stylus(th)
  return Math.hypot(s.x - C.x, s.y - C.y)
}

/** Angle where the stylus passes closest to the spindle; stylusR falls monotonically up to here. */
const TH_CLOSE = Math.atan2(PIV.x - C.x, C.y - PIV.y)

/** Inverse of stylusR: the arm angle that puts the stylus at groove radius r. */
export function thetaForR(r) {
  let lo = 0
  let hi = TH_CLOSE
  for (let i = 0; i < 36; i++) {
    const m = (lo + hi) / 2
    if (stylusR(m) > r) lo = m
    else hi = m
  }
  return (lo + hi) / 2
}

export const TH_MAX = thetaForR(R_IN - 12)

/** SVG arc path, angles in degrees with 0 at 12 o'clock, clockwise. */
export function arcPath(cx, cy, r, a0, a1) {
  const p = (a) => {
    const t = (a * Math.PI) / 180
    return [cx + r * Math.sin(t), cy - r * Math.cos(t)]
  }
  const [x0, y0] = p(a0)
  const [x1, y1] = p(a1)
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}
