// Live sound: the record's buffer played at the platter's speed, surface crackle,
// and the small mechanical sounds of the deck.
//
//   music source ─▶ gate ─▶ norm ─▶ volume ─▶ out
//   crackle loop ─────────────────▶ volume
//   clicks, thuds ─▶ sfx ─────────────────────▶ out   (acoustic, ignore the volume knob)

import { clamp, mulberry } from './geometry'

export class LiveAudio {
  ctx = null
  src = null
  srcPos = 0
  buffer = null

  /** Must run inside a user gesture the first time. */
  ensure(volume) {
    if (this.ctx) {
      if (this.ctx.state !== 'running') this.ctx.resume()
      return
    }
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    const ctx = (this.ctx = new AC())
    this.volume = ctx.createGain()
    this.volume.gain.value = Math.pow(volume, 1.6)
    this.volume.connect(ctx.destination)
    this.norm = ctx.createGain()
    this.norm.connect(this.volume)
    this.gate = ctx.createGain()
    this.gate.gain.value = 0
    this.gate.connect(this.norm)
    this.crackleGain = ctx.createGain()
    this.crackleGain.gain.value = 0
    this.crackleGain.connect(this.volume)
    this.sfx = ctx.createGain()
    this.sfx.gain.value = 0.5
    this.sfx.connect(ctx.destination)

    this.crackle = ctx.createBufferSource()
    this.crackle.buffer = this.makeCrackle()
    this.crackle.loop = true
    this.crackle.connect(this.crackleGain)
    this.crackle.start()
  }

  /** Four seconds of hiss and pops, looped under the needle. */
  makeCrackle() {
    const ctx = this.ctx
    const sr = ctx.sampleRate
    const n = sr * 4
    const buf = ctx.createBuffer(2, n, sr)
    const rng = mulberry(11)
    const pops = Array.from({ length: 46 }, () => ({
      pos: (rng() * n) | 0,
      amp: Math.pow(rng(), 3) * 0.55 + 0.03,
      dec: sr * (0.0005 + rng() * 0.0018),
      s: rng() < 0.5 ? -1 : 1,
    }))
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c)
      let lp = 0
      for (let i = 0; i < n; i++) {
        lp += (rng() * 2 - 1 - lp) * 0.07
        d[i] = lp * 0.06
      }
      const k = c ? 0.85 : 1
      for (const o of pops)
        for (let j = 0; j < o.dec * 6 && o.pos + j < n; j++)
          d[o.pos + j] += o.s * o.amp * k * Math.exp(-j / o.dec) * (1 - 2 * (j & 1) * 0.4)
    }
    return buf
  }

  setRecord(buffer, norm) {
    this.stopMusic()
    this.buffer = buffer
    if (this.norm) this.norm.gain.value = norm
  }

  startMusic(pos, rate, duration) {
    this.stopMusic()
    const s = (this.src = this.ctx.createBufferSource())
    s.buffer = this.buffer
    s.playbackRate.value = Math.max(rate, 0.001)
    s.connect(this.gate)
    s.start(0, clamp(pos, 0, duration - 0.05))
    this.srcPos = pos
  }

  stopMusic() {
    if (!this.src) return
    try {
      this.src.stop()
    } catch {
      /* already stopped */
    }
    this.src.disconnect()
    this.src = null
  }

  /**
   * Called every frame. `pos` is where the needle is (seconds into the side), `rate` the
   * playback rate implied by the platter speed. Keeps the buffer source in step with the
   * needle and restarts it after a backwards scratch or a jump.
   */
  update({ dt, playing, needleDown, pos, rate, duration, dust, runout, volume }) {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    const r = Math.max(rate, 0)
    if (playing && this.buffer) {
      if (!this.src) {
        if (r > 0.02) this.startMusic(pos, r, duration)
      } else {
        this.srcPos += r * dt
        if (Math.abs(this.srcPos - pos) > 0.12 && r > 0.02) this.startMusic(pos, r, duration)
        else this.src.playbackRate.setTargetAtTime(Math.max(r, 0.001), t, 0.012)
      }
    } else if (this.src) this.stopMusic()

    this.gate.gain.setTargetAtTime(playing && rate > 0 ? Math.min(1, r / 0.08) : 0, t, 0.015)
    const cr = needleDown ? Math.min(1.3, Math.abs(rate)) * dust * (runout ? 0.75 : 1) : 0
    this.crackleGain.gain.setTargetAtTime(cr * 0.5, t, 0.02)
    this.crackle.playbackRate.setTargetAtTime(Math.max(Math.abs(rate), 0.001), t, 0.02)
    this.volume.gain.setTargetAtTime(Math.pow(volume, 1.6), t, 0.02)
  }

  // ── one-shot sounds ──

  burst(dest, v, type, f, dur) {
    if (!this.ctx || !dest) return
    const ctx = this.ctx
    const n = Math.ceil(ctx.sampleRate * dur)
    const b = ctx.createBuffer(1, n, ctx.sampleRate)
    const d = b.getChannelData(0)
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n / 5))
    const s = ctx.createBufferSource()
    s.buffer = b
    const fl = ctx.createBiquadFilter()
    fl.type = type
    fl.frequency.value = f
    fl.Q.value = 1.2
    const g = ctx.createGain()
    g.gain.value = v
    s.connect(fl).connect(g).connect(dest)
    s.start(ctx.currentTime)
  }

  thud(dest, v, f0, f1, dur) {
    if (!this.ctx) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6)
    g.gain.setValueAtTime(v, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(dest)
    o.start(t)
    o.stop(t + dur + 0.02)
  }

  click(f = 2600, v = 0.35) {
    this.burst(this.sfx, v, 'bandpass', f, 0.018)
    try {
      navigator.vibrate?.(6)
    } catch {
      /* not supported */
    }
  }
  /** Needle meets vinyl: goes through the amp, so it follows the volume knob. */
  needleDrop() {
    this.thud(this.volume, 0.55, 75, 38, 0.22)
    this.burst(this.volume, 0.5, 'lowpass', 2500, 0.012)
  }
  needleLift() {
    this.burst(this.volume, 0.25, 'highpass', 1800, 0.01)
  }
  runoutTick() {
    this.burst(this.volume, 0.28, 'lowpass', 1600, 0.008)
  }
  /** Record lands on the platter mat. */
  settle() {
    this.thud(this.sfx, 0.5, 90, 50, 0.16)
    this.burst(this.sfx, 0.25, 'lowpass', 900, 0.05)
  }
  /** Paper sleeve sliding. */
  slide() {
    this.burst(this.sfx, 0.18, 'highpass', 2800, 0.12)
  }
}
