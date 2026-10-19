// Each record's music is synthesised once with an OfflineAudioContext and kept as an AudioBuffer.
// The turntable then plays that buffer at whatever speed the platter is turning.

import { clamp, mulberry } from './geometry'

const SAMPLE_RATE = 32000

/** Small synth kit: electric piano, bass, drums, pluck and pad, all from oscillators and noise. */
function kit(ctx, bus, noise) {
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12)
  const pan = (v) => {
    const p = ctx.createStereoPanner()
    p.pan.value = v
    p.connect(bus)
    return p
  }
  const env = (g, t, v, a, d, sus, end, rel) => {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(v, t + a)
    g.gain.setTargetAtTime(v * sus, t + a, d)
    g.gain.setTargetAtTime(0.0001, end, rel)
  }
  const osc = (type, f) => {
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.value = f
    return o
  }
  const hit = (t, v, type, fq, q, dec, pn = 0) => {
    const s = ctx.createBufferSource()
    s.buffer = noise
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = fq
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(v, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dec)
    s.connect(f).connect(g).connect(pan(pn))
    s.start(t, (t * 7.3) % 0.8, dec + 0.02)
  }

  return {
    /** Rhodes-style electric piano: two detuned sines plus a short bell tine. */
    ep(t, m, d, v, pn = 0) {
      const f = mtof(m)
      const out = pan(pn)
      const g = ctx.createGain()
      env(g, t, v, 0.006, 0.4, 0.35, t + d, 0.16)
      g.connect(out)
      const o1 = osc('sine', f)
      const o2 = osc('sine', f * 1.0032)
      o1.connect(g)
      o2.connect(g)
      const ti = osc('sine', f * 4.02)
      const tg = ctx.createGain()
      tg.gain.setValueAtTime(v * 0.22, t)
      tg.gain.setTargetAtTime(0.0001, t, 0.05)
      ti.connect(tg).connect(out)
      for (const o of [o1, o2, ti]) {
        o.start(t)
        o.stop(t + d + 1.2)
      }
    },
    bass(t, m, d, v) {
      const f = mtof(m)
      const g = ctx.createGain()
      const fl = ctx.createBiquadFilter()
      fl.type = 'lowpass'
      fl.frequency.value = 650
      env(g, t, v, 0.012, 0.5, 0.6, t + d, 0.07)
      const o = osc('triangle', f)
      const s = osc('sine', f)
      o.connect(fl)
      s.connect(fl)
      fl.connect(g).connect(pan(0))
      for (const x of [o, s]) {
        x.start(t)
        x.stop(t + d + 0.6)
      }
    },
    kick(t, v) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.setValueAtTime(130, t)
      o.frequency.exponentialRampToValueAtTime(46, t + 0.13)
      g.gain.setValueAtTime(v, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4)
      o.connect(g).connect(pan(0))
      o.start(t)
      o.stop(t + 0.42)
    },
    snare(t, v) {
      hit(t, v, 'bandpass', 1900, 0.7, 0.17, 0.05)
      const o = osc('sine', 185)
      const g = ctx.createGain()
      g.gain.setValueAtTime(v * 0.6, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
      o.connect(g).connect(pan(0))
      o.start(t)
      o.stop(t + 0.1)
    },
    hat: (t, v) => hit(t, v, 'highpass', 7600, 0.5, 0.035, 0.2),
    shaker: (t, v) => hit(t, v, 'highpass', 5200, 0.6, 0.07, -0.2),
    pluck(t, m, v, pn = 0) {
      const f = mtof(m)
      const fl = ctx.createBiquadFilter()
      fl.type = 'lowpass'
      fl.frequency.setValueAtTime(3200, t)
      fl.frequency.exponentialRampToValueAtTime(700, t + 0.35)
      const g = ctx.createGain()
      g.gain.setValueAtTime(v, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
      const o = osc('triangle', f)
      const o2 = osc('sine', f * 2)
      const g2 = ctx.createGain()
      g2.gain.value = 0.3
      o.connect(fl)
      o2.connect(g2).connect(fl)
      fl.connect(g).connect(pan(pn))
      for (const x of [o, o2]) {
        x.start(t)
        x.stop(t + 0.65)
      }
    },
    pad(t, m, d, v, pn) {
      const fl = ctx.createBiquadFilter()
      fl.type = 'lowpass'
      fl.frequency.value = 1000
      const g = ctx.createGain()
      env(g, t, v, 0.7, 1.5, 0.8, t + d, 0.35)
      fl.connect(g).connect(pan(pn))
      for (const c of [-6, 6]) {
        const o = osc('sawtooth', mtof(m) * Math.pow(2, c / 1200))
        o.connect(fl)
        o.start(t)
        o.stop(t + d + 1.6)
      }
    },
  }
}

/** One arrangement per record, in RECORDS order. Chords are [voicing, bass note] in MIDI. */
const COMPOSE = [
  // Lantern: swung Rhodes over a brushed kit
  (K, T) => {
    const B = 60 / T.bpm
    const bar = 4 * B
    const r = mulberry(T.seed)
    const sw = 0.66
    const ch = [[[53, 57, 60, 64], 38], [[53, 57, 59, 64], 43], [[52, 55, 59, 62], 36], [[55, 59, 60, 64], 45]]
    const pent = [62, 65, 67, 69, 72, 74, 77]
    for (let i = 0; i < T.bars; i++) {
      const tb = T.start + i * bar
      const [n, b] = ch[i % 4]
      const last = i === T.bars - 1
      n.forEach((m, k) => K.ep(tb, m, last ? 3 * B : 1.4 * B, 0.05, -0.3 + k * 0.2))
      if (!last) n.forEach((m, k) => K.ep(tb + (2 + sw) * B, m, 1.1 * B, 0.038, -0.3 + k * 0.2))
      if (i > 0) {
        K.bass(tb, b, 1.5 * B, 0.32)
        if (!last) K.bass(tb + (2 + sw) * B, b + 12, 0.7 * B, 0.24)
      }
      if (i >= 2 && i < T.bars - 1) {
        K.kick(tb, 0.55)
        K.kick(tb + (2 + sw / 2) * B, 0.4)
        K.snare(tb + B, 0.16)
        K.snare(tb + 3 * B, 0.18)
        for (let k = 0; k < 4; k++) {
          K.hat(tb + k * B, 0.07)
          K.hat(tb + (k + sw) * B, 0.04)
        }
      }
      if (i >= 4 && i < T.bars - 1)
        [0, sw, 1, 1 + sw, 2, 2 + sw, 3]
          .filter(() => r() < 0.45)
          .forEach((q) => K.ep(tb + q * B, pent[(r() * pent.length) | 0] + 12, 0.8 * B, 0.045, 0.25))
    }
  },
  // Low Tide: pads and a slow arpeggio
  (K, T) => {
    const B = 60 / T.bpm
    const bar = 4 * B
    const ch = [[[53, 57, 60, 64], 41], [[52, 55, 59, 62], 40], [[50, 53, 57, 60], 38], [[52, 55, 59, 64], 36]]
    for (let i = 0; i < T.bars; i++) {
      const tb = T.start + i * bar
      const [n, b] = ch[i % 4]
      const last = i === T.bars - 1
      n.forEach((m, k) => K.pad(tb, m, last ? 2.5 * B : bar, 0.022, -0.4 + k * 0.26))
      K.bass(tb, b, last ? 2.5 * B : 3.6 * B, 0.26)
      if (!last)
        [0, 1, 2, 3, 2, 1, 2, 3].forEach((ix, k) =>
          K.pluck(tb + (k * B) / 2, n[ix] + 12, k % 2 ? 0.06 : 0.08, k % 2 ? 0.3 : -0.3),
        )
      if (i >= 1 && !last) for (let k = 0; k < 16; k++) K.shaker(tb + (k * B) / 4, k % 4 === 2 ? 0.05 : 0.022)
      if (i >= 3 && !last) {
        K.kick(tb, 0.4)
        K.kick(tb + 2.5 * B, 0.3)
      }
    }
  },
  // Afterglow: pushed chords, tighter groove, a wandering lead
  (K, T) => {
    const B = 60 / T.bpm
    const bar = 4 * B
    const r = mulberry(T.seed)
    const ch = [[[55, 58, 62, 65], 39], [[51, 55, 58, 62], 36], [[55, 60, 63, 67], 44], [[53, 55, 58, 62], 46]]
    const pent = [63, 65, 67, 70, 72, 75, 77, 79]
    for (let i = 0; i < T.bars; i++) {
      const tb = T.start + i * bar
      const [n, b] = ch[i % 4]
      if (i === T.bars - 1) {
        n.forEach((m, k) => K.ep(tb, m, 3 * B, 0.05, -0.3 + k * 0.2))
        K.bass(tb, b, 3 * B, 0.3)
        continue
      }
      ;[[0, 1], [1.5, 0.5], [2.5, 1.2]].forEach(([q, d], j) =>
        n.forEach((m, k) => K.ep(tb + q * B, m, d * B, j ? 0.038 : 0.05, -0.3 + k * 0.2)),
      )
      K.bass(tb, b, 1.2 * B, 0.32)
      K.bass(tb + 1.5 * B, b + 12, 0.4 * B, 0.22)
      K.bass(tb + 2.5 * B, b + 7, 1.2 * B, 0.28)
      if (i >= 1) {
        K.kick(tb, 0.55)
        K.kick(tb + 1.5 * B, 0.42)
        K.kick(tb + 2.5 * B, 0.5)
        K.snare(tb + B, 0.2)
        K.snare(tb + 3 * B, 0.22)
        for (let k = 0; k < 16; k++) K.hat(tb + (k * B) / 4, k % 2 ? 0.03 : 0.06)
      }
      if (i >= 3) {
        let l = 3
        for (let k = 0; k < 8; k++)
          if (r() < 0.55) {
            l = clamp(l + ((r() * 5) | 0) - 2, 0, pent.length - 1)
            K.pluck(tb + (k * B) / 2, pent[l] + 12, 0.07, 0.2)
          }
      }
    }
  },
  // Night Bus: four on the floor, off-beat stabs, a minor lead
  (K, T) => {
    const B = 60 / T.bpm
    const bar = 4 * B
    const r = mulberry(T.seed)
    const ch = [[[60, 64, 67, 71], 45], [[57, 60, 64, 67], 41], [[53, 57, 60, 64], 38], [[52, 56, 59, 62], 40]]
    const pent = [69, 72, 74, 76, 79, 81]
    for (let i = 0; i < T.bars; i++) {
      const tb = T.start + i * bar
      const [n, b] = ch[i % 4]
      const last = i === T.bars - 1
      n.forEach((m, k) => K.pad(tb, m, last ? 3 * B : bar, 0.016, -0.35 + k * 0.23))
      if (last) {
        K.bass(tb, b, 3 * B, 0.3)
        n.forEach((m, k) => K.ep(tb, m, 3 * B, 0.045, -0.3 + k * 0.2))
        continue
      }
      ;[0.5, 1.5, 2.5, 3.5].forEach((q) => n.forEach((m, k) => K.ep(tb + q * B, m, 0.3 * B, 0.03, -0.3 + k * 0.2)))
      if (i >= 1) {
        K.bass(tb, b, 0.4 * B, 0.32)
        K.bass(tb + 0.75 * B, b, 0.3 * B, 0.24)
        K.bass(tb + 2 * B, b + 7, 0.4 * B, 0.28)
        K.bass(tb + 2.75 * B, b + 12, 0.3 * B, 0.22)
      }
      if (i >= 2) {
        for (let k = 0; k < 4; k++) {
          K.kick(tb + k * B, 0.45)
          K.hat(tb + (k + 0.5) * B, 0.06)
        }
        K.snare(tb + B, 0.14)
        K.snare(tb + 3 * B, 0.15)
        for (let k = 1; k < 16; k += 2) K.hat(tb + (k * B) / 4, 0.02)
      }
      if (i >= 6 && i < T.bars - 2)
        for (let k = 0; k < 8; k++) if (r() < 0.4) K.pluck(tb + (k * B) / 2, pent[(r() * pent.length) | 0], 0.07, -0.2)
    }
  },
]

/** Renders a record's side to a buffer. Resolves to { buffer, norm } where norm brings the peak to -1.4 dB. */
export async function pressRecord(rec) {
  const ctx = new OfflineAudioContext(2, Math.ceil(SAMPLE_RATE * rec.duration), SAMPLE_RATE)
  const bus = ctx.createGain()

  // Gentle tape-style saturation and a rolled-off top for warmth
  const sat = ctx.createWaveShaper()
  const curve = new Float32Array(1024)
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1
    curve[i] = Math.tanh(1.5 * x) / Math.tanh(1.5)
  }
  sat.curve = curve
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 7200
  lp.Q.value = 0.4
  bus.connect(sat).connect(lp).connect(ctx.destination)

  const noise = ctx.createBuffer(1, SAMPLE_RATE, SAMPLE_RATE)
  const nd = noise.getChannelData(0)
  const rn = mulberry(3)
  for (let i = 0; i < nd.length; i++) nd[i] = rn() * 2 - 1

  COMPOSE[rec.index](kit(ctx, bus, noise), rec)
  const buffer = await ctx.startRendering()

  let peak = 0
  for (let c = 0; c < 2; c++) {
    const d = buffer.getChannelData(c)
    for (let i = 0; i < d.length; i += 3) peak = Math.max(peak, Math.abs(d[i]))
  }
  return { buffer, norm: 0.85 / (peak || 1) }
}
