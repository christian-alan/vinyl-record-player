// Record faces, the static sheen and the sleeve covers are painted once on canvas
// and handed around as image URLs (SVG <image>, sleeve <img>, floating <img>).

import { R_REC, R_OUT, R_IN, mulberry } from './geometry'

const toURL = (cv) =>
  new Promise((res) =>
    cv.toBlob
      ? cv.toBlob((b) => res(b ? URL.createObjectURL(b) : cv.toDataURL()), 'image/png')
      : res(cv.toDataURL()),
  )

const SCALE = 2 // render at 2× the SVG size for crisp grooves

function canvas(size) {
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  return [cv, cv.getContext('2d')]
}

export async function drawRecord(rec) {
  const v = rec.vinyl
  const size = R_REC * 2 * SCALE
  const [cv, g] = canvas(size)
  g.translate(size / 2, size / 2)
  g.scale(SCALE, SCALE)
  const disc = (r, c) => {
    g.beginPath()
    g.arc(0, 0, r, 0, Math.PI * 2)
    g.fillStyle = c
    g.fill()
  }
  const ring = (r, c, w) => {
    g.beginPath()
    g.arc(0, 0, r, 0, Math.PI * 2)
    g.strokeStyle = c
    g.lineWidth = w
    g.stroke()
  }
  const [br, bg, bb] = v.base
  const rng = mulberry(rec.seed)

  disc(R_REC, `rgb(${br},${bg},${bb})`)

  // Marbled vinyl: soft streaks under the grooves
  if (v.marble) {
    g.save()
    g.beginPath()
    g.arc(0, 0, R_REC, 0, Math.PI * 2)
    g.clip()
    g.filter = 'blur(14px)'
    for (let i = 0; i < 26; i++) {
      const a = rng() * Math.PI * 2
      const d = 110 + rng() * 240
      g.beginPath()
      g.ellipse(Math.cos(a) * d, Math.sin(a) * d, 30 + rng() * 70, 8 + rng() * 20, a + Math.PI / 2, 0, Math.PI * 2)
      g.fillStyle = v.marble
      g.globalAlpha = 0.25 + rng() * 0.3
      g.fill()
    }
    g.restore()
    g.globalAlpha = 1
    g.filter = 'none'
  }

  // Translucent vinyl: brighter towards the rim
  if (v.clear) {
    const rg = g.createRadialGradient(0, 0, 100, 0, 0, R_REC)
    rg.addColorStop(0, 'rgba(255,255,255,0)')
    rg.addColorStop(1, 'rgba(255,255,255,.10)')
    disc(R_REC, rg)
  }

  // Grooves
  g.globalAlpha = 0.6
  for (let r = R_IN - 3; r <= R_OUT; r += 0.55) {
    const l = v.lift[0] + rng() * (v.lift[1] - v.lift[0])
    ring(r, `rgb(${(br + l) | 0},${(bg + l) | 0},${(bb + l) | 0})`, 0.42)
  }
  g.globalAlpha = 1

  // Smooth lead-in rim
  g.beginPath()
  g.arc(0, 0, R_REC, 0, Math.PI * 2)
  g.arc(0, 0, R_OUT + 1, 0, Math.PI * 2, true)
  g.fillStyle = `rgba(${br},${bg},${bb},.92)`
  g.fill()
  ring(R_REC - 0.8, 'rgba(255,255,255,.10)', 1.2)

  // Dead wax
  disc(R_IN - 4, `rgba(${Math.max(0, br - 4)},${Math.max(0, bg - 4)},${Math.max(0, bb - 4)},.96)`)
  ring(R_IN - 4, 'rgba(255,255,255,.06)', 1)
  ring(118, 'rgba(255,255,255,.05)', 1)

  // Label, with its text set along an arc
  disc(94, v.label)
  ring(91, 'rgba(0,0,0,.12)', 1.2)
  ring(56, 'rgba(0,0,0,.10)', 1)
  g.fillStyle = v.ink
  g.font = '600 9.5px "Familjen Grotesk", Arial, sans-serif'
  const txt = `${rec.title.toUpperCase()}  ·  ${rec.artist.toUpperCase()}  ·  33⅓ RPM  ·  `
  let ang = -Math.PI / 2
  const rr = 72
  for (const ch of txt) {
    const w = g.measureText(ch).width
    g.save()
    g.rotate(ang + w / (2 * rr))
    g.translate(0, -rr)
    g.fillText(ch, -w / 2, 0)
    g.restore()
    ang += w / rr + 0.012
  }
  // An off-centre dot, so you can see the record turning
  g.beginPath()
  g.arc(0, 62, 2.6, 0, Math.PI * 2)
  g.fill()

  return toURL(cv)
}

/** Fixed reflection that stays put while the record turns underneath it. */
export async function drawSheen() {
  const size = R_REC * 2 * SCALE
  const [cv, g] = canvas(size)
  g.translate(size / 2, size / 2)
  g.scale(SCALE, SCALE)
  if (g.createConicGradient) {
    const cg = g.createConicGradient(-0.9, 0, 0)
    for (const [o, a] of [[0, 0], [0.06, 0.12], [0.12, 0], [0.5, 0], [0.56, 0.09], [0.62, 0], [1, 0]])
      cg.addColorStop(o, `rgba(255,255,255,${a})`)
    g.beginPath()
    g.arc(0, 0, R_REC - 1, 0, Math.PI * 2)
    g.arc(0, 0, 95, 0, Math.PI * 2, true)
    g.fillStyle = cg
    g.fill('evenodd')
  }
  return toURL(cv)
}

/** Original sleeve art, one simple graphic idea per record. */
export async function drawCover(rec) {
  const n = 360
  const [cv, g] = canvas(n)
  const c = rec.cover
  const r = mulberry(rec.seed + 7)
  g.fillStyle = c.bg
  g.fillRect(0, 0, n, n)

  if (rec.index === 0) {
    // Lantern: a hanging orange light
    g.fillStyle = c.a
    g.beginPath()
    g.arc(n * 0.56, n * 0.6, n * 0.27, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = c.b
    g.beginPath()
    g.arc(n * 0.56, n * 0.6, n * 0.035, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = c.b
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(n * 0.56, n * 0.08)
    g.lineTo(n * 0.56, n * 0.33)
    g.stroke()
  } else if (rec.index === 1) {
    // Low Tide: drawn waves
    for (let k = 0; k < 9; k++) {
      g.strokeStyle = k % 3 ? c.b : c.a
      g.lineWidth = k % 3 ? 3 : 6
      g.beginPath()
      for (let x = 0; x <= n; x += 6) {
        const y = n * 0.32 + k * 22 + Math.sin(x / 38 + k * 0.9) * 7
        if (x) g.lineTo(x, y)
        else g.moveTo(x, y)
      }
      g.stroke()
    }
  } else if (rec.index === 2) {
    // Afterglow: a striped setting sun
    g.save()
    g.beginPath()
    g.rect(0, 0, n, n * 0.66)
    g.clip()
    g.fillStyle = c.a
    g.beginPath()
    g.arc(n * 0.5, n * 0.66, n * 0.3, Math.PI, 0)
    g.fill()
    g.fillStyle = c.bg
    for (let k = 0; k < 5; k++) g.fillRect(0, n * 0.66 - n * 0.04 - k * n * 0.055, n, 3 + k * 1.2)
    g.restore()
    g.fillStyle = c.b
    g.fillRect(0, n * 0.66, n, n * 0.34)
  } else {
    // Night Bus: lit windows
    g.fillStyle = c.b
    g.fillRect(n * 0.08, n * 0.3, n * 0.84, n * 0.3)
    for (let k = 0; k < 6; k++) {
      g.fillStyle = r() < 0.75 ? c.a : '#55575D'
      g.fillRect(n * 0.11 + k * n * 0.135, n * 0.34, n * 0.11, n * 0.13)
    }
    g.fillStyle = '#0B0B0C'
    g.beginPath()
    g.arc(n * 0.25, n * 0.62, n * 0.05, 0, Math.PI * 2)
    g.arc(n * 0.75, n * 0.62, n * 0.05, 0, Math.PI * 2)
    g.fill()
  }

  const titleInk = rec.index === 2 ? c.bg : rec.index === 0 ? c.b : c.a
  g.fillStyle = titleInk
  g.font = `600 ${n * 0.075}px "Familjen Grotesk", Arial, sans-serif`
  g.fillText(rec.title, n * 0.07, n * 0.9)
  g.font = `500 ${n * 0.04}px "IBM Plex Mono", monospace`
  g.globalAlpha = 0.75
  g.fillText(rec.artist.toUpperCase(), n * 0.07, n * 0.13)
  g.globalAlpha = 1

  return toURL(cv)
}
