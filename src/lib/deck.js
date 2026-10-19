// The turntable engine. It owns the physics (platter motor, tonearm, needle position),
// the record-handling gestures and the per-frame drawing.
//
// React renders the markup once and hands element refs to the engine. Everything that
// moves at 60 fps is written straight to those elements in `frame()`, so React only
// re-renders for the few things it shows itself (which record is out of its sleeve,
// the pressing status and the artwork URLs). Those are published via `subscribe`.

import {
  C, R_REC, R_OUT, R_IN, R_LABEL, PIV, NOM33, NOM45, TH_MAX,
  clamp, ease, arcPath, stylusR, thetaForR,
} from './geometry'
import { drawRecord, drawSheen, drawCover } from './artwork'
import { pressRecord } from './music'
import { LiveAudio } from './audio'

const DISC_SIZE = 0.92 // disc diameter relative to the sleeve

export class Deck {
  // controls
  motorOn = false
  speed = 33
  pitch = 0 // -1…1, maps to ±8 %
  volume = 0.7
  dust = 1 // surface noise, cleaned down by the brush
  brushDown = false
  // platter
  omega = 0 // rev/s
  angle = 0 // deg
  strobe = 0
  lastRev = 0
  hand = null // a finger on the grooves
  // tonearm & needle
  th = 0 // arm angle, rad
  lift = 0 // 0 resting on something, 1 fully raised
  armState = 'rest' // rest | drag | move | lower | down
  p = 0 // needle position, seconds into the side
  pendingP = 0
  needleDown = false
  inRunout = false
  runoutT = 0
  move = null
  drag = null
  stopAfterReturn = false
  brushLift = 1
  // records
  current = null // index of the record on the platter
  puckT = 0
  holding = null // a record in your hand
  flies = new Set() // records gliding between sleeve and platter
  pressedButton = false
  volDrag = null

  els = { slot: [], float: [] }
  audio = new LiveAudio()

  constructor(records) {
    this.records = records
    this.rt = records.map(() => ({ buffer: null, norm: 1, img: null, cover: null, fpos: null, pending: null }))
    this.snapshot = this.makeSnapshot()
    this.listeners = new Set()
    this.refCache = new Map()
  }

  // ───────────── React glue ─────────────

  /** Stable ref callbacks: deck.ref('arm'), deck.ref('slot', 2). */
  ref(name, i) {
    const key = i == null ? name : `${name}:${i}`
    if (!this.refCache.has(key))
      this.refCache.set(key, (el) => {
        if (i == null) this.els[name] = el
        else this.els[name][i] = el
      })
    return this.refCache.get(key)
  }

  subscribe = (fn) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  getSnapshot = () => this.snapshot
  makeSnapshot() {
    return {
      current: this.current,
      pressed: this.rt.filter((r) => r.buffer).length,
      waiting: this.current != null && !this.rt[this.current].buffer,
      art: this.rt.map((r) => ({ img: r.img, cover: r.cover })),
    }
  }
  emit() {
    this.snapshot = this.makeSnapshot()
    this.listeners.forEach((fn) => fn())
  }

  start() {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    const loop = (now) => {
      if (!this.running) return
      this.frame(now)
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
    window.addEventListener('pointermove', this.onWindowMove)
    window.addEventListener('pointerup', this.onWindowUp)
    window.addEventListener('pointercancel', this.onWindowUp)
    document.addEventListener('keydown', this.onDocKey)
    this.els.vol?.addEventListener('wheel', this.onVolWheel, { passive: false })
    this.load()
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
    window.removeEventListener('pointermove', this.onWindowMove)
    window.removeEventListener('pointerup', this.onWindowUp)
    window.removeEventListener('pointercancel', this.onWindowUp)
    document.removeEventListener('keydown', this.onDocKey)
    this.els.vol?.removeEventListener('wheel', this.onVolWheel)
  }

  /** Paint the artwork, then press every record in the background. */
  async load() {
    if (this.loading) return
    this.loading = true
    if (document.fonts?.ready) await document.fonts.ready.catch(() => {})
    this.els.sheen?.setAttribute('href', await drawSheen())
    for (const rec of this.records) {
      const rt = this.rt[rec.index]
      rt.img = await drawRecord(rec)
      rt.cover = await drawCover(rec)
      this.emit()
    }
    for (const rec of this.records) await this.press(rec.index)
  }

  press(i) {
    const rt = this.rt[i]
    if (!rt.pending)
      rt.pending = pressRecord(this.records[i])
        .then(({ buffer, norm }) => {
          rt.buffer = buffer
          rt.norm = norm
          if (this.current === i) this.audio.setRecord(buffer, norm)
          this.emit()
        })
        .catch(() => {})
    return rt.pending
  }

  get rec() {
    return this.current == null ? null : this.records[this.current]
  }
  rForP = (p) => R_OUT - (R_OUT - R_IN) * clamp(p / this.rec.duration, 0, 1)
  pForR = (r) => clamp((R_OUT - r) / (R_OUT - R_IN), 0, 1) * this.rec.duration

  // ───────────── tonearm ─────────────

  dropNeedle(p) {
    this.p = p
    this.needleDown = true
    this.armState = 'down'
    this.inRunout = p >= this.rec.duration
    this.runoutT = 0
    this.audio.needleDrop()
  }
  liftNeedle() {
    if (!this.needleDown) return
    this.needleDown = false
    this.inRunout = false
    this.audio.stopMusic()
    this.audio.needleLift()
  }
  startMove(to, then) {
    this.armState = 'move'
    this.move = { from: this.th, to, t0: performance.now(), dur: 420 + Math.abs(to - this.th) * 1100, then }
  }
  /** Swing the arm over position p (seconds) and lower it, starting the motor if needed. */
  cueTo(p) {
    if (!this.rec) return
    if (!this.motorOn) this.setMotor(true)
    this.liftNeedle()
    this.startMove(thetaForR(this.rForP(p)), () => {
      this.armState = 'lower'
      this.pendingP = p
    })
  }
  returnToRest(stopMotor = false) {
    this.liftNeedle()
    this.stopAfterReturn = stopMotor
    if (this.armState === 'rest' && this.th === 0) return
    this.startMove(0, () => {
      this.armState = 'rest'
      if (this.stopAfterReturn) {
        this.stopAfterReturn = false
        this.setMotor(false, true)
      }
    })
  }

  armAngle(q) {
    return Math.atan2(-(q.x - PIV.x), q.y - PIV.y)
  }
  onArmDown = (e) => {
    if (!this.grab(e)) return
    const q = this.pt(e)
    this.drag = { off: this.th - this.armAngle(q), x: q.x, y: q.y, moved: false, was: this.armState }
    this.move = null
    this.liftNeedle()
    this.armState = 'drag'
  }
  onArmMove = (e) => {
    if (!this.drag) return
    const q = this.pt(e)
    if (Math.hypot(q.x - this.drag.x, q.y - this.drag.y) > 8) this.drag.moved = true
    this.th = clamp(this.armAngle(q) + this.drag.off, 0, TH_MAX)
  }
  onArmUp = () => {
    const d = this.drag
    if (!d) return
    this.drag = null
    // A tap plays from the start, or sends a playing arm home
    if (!d.moved) {
      this.armState = 'rest'
      if (d.was === 'rest' && this.rec) this.cueTo(0)
      else this.returnToRest()
      return
    }
    const r = stylusR(this.th)
    if (r <= R_REC && this.rec) {
      this.pendingP = r >= R_OUT ? 0 : this.pForR(r)
      this.armState = 'lower'
    } else this.returnToRest()
  }
  onArmKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      this.audio.ensure(this.volume)
      if (this.armState === 'rest') this.cueTo(0)
      else this.returnToRest()
    } else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && this.needleDown) {
      e.preventDefault()
      this.p = clamp(this.p + (e.key === 'ArrowRight' ? 5 : -5), 0, this.rec.duration)
    }
  }

  // ───────────── platter: label lifts the record, grooves scratch ─────────────

  onPlatterDown = (e) => {
    if (!this.grab(e)) return
    const q = this.pt(e)
    if (this.rec && Math.hypot(q.x - C.x, q.y - C.y) < R_LABEL) {
      const i = this.liftFromPlatter()
      this.audio.slide()
      const f = this.rt[i].fpos
      this.holding = { i, ox: f.x - e.clientX, oy: f.y - e.clientY, x: e.clientX, y: e.clientY }
      return
    }
    this.hand = { a: Math.atan2(q.y - C.y, q.x - C.x), t: performance.now(), w: 0 }
  }
  onPlatterMove = (e) => {
    if (!this.hand) return
    const q = this.pt(e)
    const a = Math.atan2(q.y - C.y, q.x - C.x)
    const now = performance.now()
    let d = a - this.hand.a
    if (d > Math.PI) d -= 2 * Math.PI
    if (d < -Math.PI) d += 2 * Math.PI
    const dt = Math.max(0.004, (now - this.hand.t) / 1000)
    this.angle += (d * 180) / Math.PI // the record sticks to your finger
    this.hand.w = d / (2 * Math.PI) / dt
    this.hand.a = a
    this.hand.t = now
  }
  onPlatterUp = () => {
    this.hand = null
  }

  // ───────────── records between sleeve and platter ─────────────

  platterScreen() {
    const m = this.els.svg.getScreenCTM()
    return { x: m.a * C.x + m.c * C.y + m.e, y: m.b * C.x + m.d * C.y + m.f, d: 2 * R_REC * m.a }
  }
  overPlatter(x, y) {
    const ps = this.platterScreen()
    return Math.hypot(x - ps.x, y - ps.y) < ps.d * 0.5
  }
  /** Where the disc sits when it pokes out of sleeve i, in viewport coordinates. */
  sleeveSpot(i) {
    const slot = this.els.slot[i]
    const r = slot.getBoundingClientRect()
    const s = slot.offsetWidth
    return { x: r.left + r.width / 2, y: r.top + (r.height - slot.offsetHeight) / 2 + (s * DISC_SIZE) / 2, d: s * DISC_SIZE }
  }
  setFloat(i, pos, lifted) {
    this.rt[i].fpos = pos
    const el = this.els.float[i]
    el.hidden = false
    el.classList.toggle('lifted', !!lifted)
    el.style.width = el.style.height = pos.d + 'px'
    el.style.transform = `translate3d(${pos.x - pos.d / 2}px,${pos.y - pos.d / 2}px,0) rotate(${pos.r}deg)`
  }
  fly(i, to, dur, done) {
    for (const f of this.flies) if (f.i === i) this.flies.delete(f)
    this.flies.add({ i, from: { ...this.rt[i].fpos }, to, t0: performance.now(), dur, done })
  }
  /** Toggle a sleeve class without its CSS transition, so the hand-off to the floating disc is seamless. */
  setOut(i, out) {
    const slot = this.els.slot[i]
    slot.classList.add('instant')
    slot.classList.toggle('out', out)
    void slot.offsetWidth
    slot.classList.remove('instant')
  }

  showOnPlatter(i, rot) {
    this.current = i
    this.angle = rot
    this.p = 0
    this.puckT = 0
    this.els.recImg.setAttribute('href', this.rt[i].img)
    for (const k of ['rec', 'sheen', 'recShadow']) this.els[k].setAttribute('opacity', 1)
    this.audio.setRecord(this.rt[i].buffer, this.rt[i].norm)
    this.audio.settle()
    setTimeout(() => this.current === i && this.audio.click(1900, 0.3), 180)
    this.press(i)
    this.emit()
  }
  clearPlatter() {
    for (const k of ['rec', 'sheen', 'recShadow', 'puck']) this.els[k].setAttribute('opacity', 0)
    this.audio.setRecord(null, 1)
    this.current = null
    this.p = 0
    this.emit()
  }
  liftFromPlatter() {
    const i = this.current
    const ps = this.platterScreen()
    if (this.needleDown || this.armState !== 'rest') this.returnToRest()
    this.clearPlatter()
    this.setOut(i, true)
    this.setFloat(i, { x: ps.x, y: ps.y, d: ps.d, r: this.angle % 360 }, true)
    return i
  }
  sendHome(i) {
    this.fly(i, { ...this.sleeveSpot(i), r: 0 }, 520, () => {
      this.els.float[i].hidden = true
      this.setOut(i, false)
      this.audio.slide()
    })
  }
  placeOnPlatter(i, dur = 480) {
    if (this.current != null && this.current !== i) this.sendHome(this.liftFromPlatter())
    else if (this.needleDown || this.armState !== 'rest') this.returnToRest()
    const ps = this.platterScreen()
    const r = this.rt[i].fpos.r || 0
    this.fly(i, { x: ps.x, y: ps.y, d: ps.d, r }, dur, () => {
      this.els.float[i].hidden = true
      this.showOnPlatter(i, r)
    })
  }
  /** Tap or Enter on a sleeve: put that record on, or take it back off. */
  activate(i) {
    this.audio.ensure(this.volume)
    if (i === this.current) return this.sendHome(this.liftFromPlatter())
    if (this.els.slot[i].classList.contains('out')) return
    const s = this.sleeveSpot(i)
    this.setOut(i, true)
    this.setFloat(i, { ...s, r: 0 }, true)
    this.audio.slide()
    this.placeOnPlatter(i, 620)
  }
  dropHolding() {
    const h = this.holding
    if (!h) return
    this.holding = null
    this.els.dropRing.setAttribute('opacity', 0)
    const c = this.rt[h.i].fpos
    this.els.float[h.i].classList.remove('lifted')
    if (this.overPlatter(c.x, c.y)) this.placeOnPlatter(h.i, 260)
    else this.sendHome(h.i)
  }

  onSleeveDown = (i, e) => {
    if (e.button > 0 || this.holding) return
    this.audio.ensure(this.volume)
    this.sleevePress = { i, x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  onSleeveMove = (i, e) => {
    const sp = this.sleevePress
    if (!sp || sp.i !== i || this.holding) return
    if (Math.hypot(e.clientX - sp.x, e.clientY - sp.y) < 7 || this.els.slot[i].classList.contains('out')) return
    // Pull the disc out of the sleeve and hand it to the floating layer
    const s = this.sleeveSpot(i)
    this.setOut(i, true)
    this.setFloat(i, { ...s, r: 0 }, true)
    this.audio.slide()
    this.holding = { i, ox: s.x - e.clientX, oy: s.y - e.clientY, x: e.clientX, y: e.clientY }
    this.sleevePress = null
  }
  onSleeveUp = (i, e) => {
    if (this.holding?.i === i) return this.dropHolding()
    if (this.sleevePress?.i === i && e.type === 'pointerup') this.activate(i)
    this.sleevePress = null
  }
  onSleeveKey = (i, e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      this.activate(i)
    }
  }

  onWindowMove = (e) => {
    if (!this.holding) return
    this.holding.x = e.clientX
    this.holding.y = e.clientY
  }
  onWindowUp = () => this.dropHolding()

  // ───────────── controls ─────────────

  setMotor(on, silent) {
    this.motorOn = on
    this.stopAfterReturn = false
    if (!silent) this.audio.click(1300, 0.45)
    this.els.start?.setAttribute('aria-pressed', on)
  }
  toggleMotor = () => {
    this.audio.ensure(this.volume)
    this.setMotor(!this.motorOn)
  }
  onStartKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      this.toggleMotor()
    }
  }
  onStartPress = () => (this.pressedButton = true)
  onStartRelease = () => (this.pressedButton = false)
  onDocKey = (e) => {
    if (e.key === ' ' && e.target === document.body) {
      e.preventDefault()
      this.toggleMotor()
    }
  }

  toggleSpeed = () => {
    this.audio.ensure(this.volume)
    this.speed = this.speed === 33 ? 45 : 33
    this.audio.click(2000)
    this.els.speed?.setAttribute('aria-checked', this.speed === 45)
  }
  onSpeedKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      this.toggleSpeed()
    }
  }

  toggleBrush = () => {
    this.audio.ensure(this.volume)
    this.brushDown = !this.brushDown
    this.audio.click(this.brushDown ? 900 : 1300, 0.4)
    this.els.brush?.setAttribute('aria-checked', this.brushDown)
  }
  onBrushKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      this.toggleBrush()
    }
  }

  onVolDown = (e) => {
    if (!this.grab(e)) return
    const q = this.pt(e)
    this.volDrag = { v: this.volume, x: q.x, y: q.y }
  }
  onVolMove = (e) => {
    if (!this.volDrag) return
    const q = this.pt(e)
    this.volume = clamp(this.volDrag.v + (q.x - this.volDrag.x - (q.y - this.volDrag.y)) / 280, 0, 1)
  }
  onVolUp = () => (this.volDrag = null)
  onVolWheel = (e) => {
    e.preventDefault()
    this.volume = clamp(this.volume - e.deltaY / 1500, 0, 1)
  }
  onVolKey = (e) => {
    const k = { ArrowUp: 0.05, ArrowRight: 0.05, ArrowDown: -0.05, ArrowLeft: -0.05 }[e.key]
    if (k) {
      e.preventDefault()
      this.volume = clamp(this.volume + k, 0, 1)
    }
  }

  /** Pitch fader with a centre detent you can feel (and hear). */
  setPitch(v) {
    const wasZero = Math.abs(this.pitch) < 0.001
    let n = clamp(v, -1, 1)
    if (Math.abs(n) < 0.05) n = 0
    if (n === 0 && !wasZero) this.audio.click(3200, 0.25)
    this.pitch = n
  }
  onPitchDown = (e) => {
    if (!this.grab(e)) return
    this.pitchDrag = true
    this.setPitch((730 - this.pt(e).y) / 120)
  }
  onPitchMove = (e) => this.pitchDrag && this.setPitch((730 - this.pt(e).y) / 120)
  onPitchUp = () => (this.pitchDrag = false)
  onPitchReset = () => this.setPitch(0)
  onPitchKey = (e) => {
    const k = { ArrowUp: 0.0625, ArrowDown: -0.0625 }[e.key]
    if (k) {
      e.preventDefault()
      this.pitch = clamp(Math.round((this.pitch + k) * 16) / 16, -1, 1)
    } else if (e.key === '0' || e.key === 'Home') this.setPitch(0)
  }

  // ───────────── helpers ─────────────

  /** Common pointerdown bookkeeping for deck controls. */
  grab(e) {
    if (e.button > 0 || this.holding) return false
    e.preventDefault()
    this.audio.ensure(this.volume)
    e.currentTarget.setPointerCapture?.(e.pointerId)
    return true
  }
  pt(e) {
    const svg = this.els.svg
    const q = svg.createSVGPoint()
    q.x = e.clientX
    q.y = e.clientY
    return q.matrixTransform(svg.getScreenCTM().inverse())
  }

  // ───────────── frame ─────────────

  frame(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    const els = this.els
    const nominal = this.speed === 33 ? NOM33 : NOM45
    const target = this.motorOn ? nominal * (1 + this.pitch * 0.08) : 0

    // Records in hand and in flight
    if (this.holding) {
      const h = this.holding
      const ps = this.platterScreen()
      h.ox *= Math.exp(-dt * 9)
      h.oy *= Math.exp(-dt * 9)
      const x = h.x + h.ox
      const y = h.y + h.oy
      const over = this.overPlatter(x, y)
      const f = this.rt[h.i].fpos
      const td = over ? ps.d * 1.03 : ps.d * 0.86
      this.setFloat(h.i, { x, y, d: f.d + (td - f.d) * (1 - Math.exp(-dt * 10)), r: f.r }, true)
      els.dropRing.setAttribute('opacity', over ? 1 : 0.35)
    }
    for (const f of this.flies) {
      const t = clamp((now - f.t0) / f.dur, 0, 1)
      const e = ease(t)
      const bump = 1 + 0.05 * Math.sin(Math.PI * t) // a little lift mid-air
      const lerp = (k) => f.from[k] + (f.to[k] - f.from[k]) * e
      this.setFloat(f.i, { x: lerp('x'), y: lerp('y'), d: lerp('d') * bump, r: lerp('r') }, t < 1)
      if (t >= 1) {
        this.flies.delete(f)
        f.done?.()
      }
    }

    // Platter: motor with inertia, or your finger
    if (this.hand) {
      this.hand.w *= Math.exp(-dt * 14)
      this.omega += (this.hand.w - this.omega) * (1 - Math.exp(-dt * 22))
    } else {
      const k = this.motorOn ? (this.omega < target ? 3.4 : 5) : 0.85
      this.omega += (target - this.omega) * (1 - Math.exp(-dt * k))
      if (!this.motorOn && Math.abs(this.omega) < 0.003) this.omega = 0
      this.angle += this.omega * 360 * dt
    }
    // Strobe dots: lit by a mains-synced lamp, so they freeze only at true speed
    this.strobe += (this.motorOn && !this.hand ? this.omega - nominal : this.omega) * 360 * dt
    if (this.rec && this.brushDown && Math.abs(this.omega) > 0.1) this.dust = Math.max(0.14, this.dust - dt * 0.075)
    const rate = this.omega / NOM33
    if (this.rec) this.puckT = Math.min(1, this.puckT + dt * 4.5)

    // Tonearm
    if (this.armState === 'move' && this.move) {
      const m = this.move
      const t = clamp((now - m.t0) / m.dur, 0, 1)
      this.th = m.from + (m.to - m.from) * ease(t)
      if (t >= 1) {
        this.move = null
        m.then?.()
      }
    }
    const liftT = this.armState === 'drag' || this.armState === 'move' ? 1 : 0
    const k = liftT > this.lift ? 18 : this.armState === 'lower' ? 5.5 : 11 // the cue lever lowers slowly
    this.lift += (liftT - this.lift) * (1 - Math.exp(-dt * k))
    if (this.armState === 'lower' && this.lift < 0.035) {
      this.lift = 0
      if (this.rec) this.dropNeedle(this.pendingP)
      else this.returnToRest()
    }
    if (this.needleDown && this.rec) {
      const D = this.rec.duration
      if (!this.inRunout) {
        this.p = Math.max(0, this.p + rate * dt)
        if (this.p >= D) {
          this.p = D
          this.inRunout = true
          this.runoutT = 0
        }
      } else {
        // Locked groove: one click per turn, then the arm returns on its own
        if (Math.abs(this.omega) > 0.1) this.runoutT += dt
        const rev = Math.floor(this.angle / 360)
        if (rev !== this.lastRev && this.omega > 0.1) this.audio.runoutTick()
        this.lastRev = rev
        if (this.runoutT > 2.6 && this.armState === 'down') this.returnToRest(true)
      }
      if (this.armState === 'down')
        this.th = thetaForR(this.rForP(this.p)) + (this.inRunout ? 0.003 * Math.sin((this.angle * Math.PI) / 180) : 0)
    }
    const bT = this.brushDown ? 0 : 1
    this.brushLift += (bT - this.brushLift) * (1 - Math.exp(-dt * (bT < this.brushLift ? 6 : 16)))

    this.audio.update({
      dt,
      playing: this.needleDown && !this.inRunout && !!this.rec,
      needleDown: this.needleDown,
      pos: this.p,
      rate,
      duration: this.rec?.duration ?? 1,
      dust: this.dust,
      runout: this.inRunout,
      volume: this.volume,
    })

    this.draw(now)
  }

  draw(now) {
    const els = this.els
    if (!els.svg) return
    const set = (el, a, v) => el && el.setAttribute(a, v)
    set(els.rec, 'transform', `rotate(${(this.angle % 360).toFixed(2)} ${C.x} ${C.y})`)
    set(els.strobe, 'transform', `rotate(${(this.strobe % 360).toFixed(2)} ${C.x} ${C.y})`)

    const ps = this.rec ? 1 + 0.25 * (1 - ease(this.puckT)) : 1
    set(els.puck, 'opacity', this.rec ? Math.min(1, this.puckT * 2).toFixed(2) : 0)
    set(els.puck, 'transform', `translate(${C.x} ${C.y}) scale(${ps.toFixed(3)}) translate(${-C.x} ${-C.y})`)

    const deg = ((this.th * 180) / Math.PI).toFixed(3)
    const l = this.lift
    set(els.arm, 'transform', `translate(${PIV.x - 3 * l} ${PIV.y - 7 * l}) rotate(${deg})`)
    set(els.armShadow, 'transform', `translate(${PIV.x + 9 + 24 * l} ${PIV.y + 12 + 30 * l}) rotate(${deg})`)
    set(els.armShadow, 'opacity', (0.42 - 0.16 * l).toFixed(3))

    const b = this.brushLift
    set(els.brush, 'transform', `translate(${-2 * b} ${-6 * b})`)
    set(els.brushShadow, 'transform', `translate(${6 + 14 * b} ${8 + 18 * b})`)
    set(els.brushShadow, 'opacity', (0.45 - 0.15 * b).toFixed(3))
    set(els.brushLed, 'fill', this.brushDown ? '#FF6A3A' : '#5A2A1C')

    set(els.speedKnob, 'transform', `translate(${this.speed === 45 ? 32 : 0} 0)`)
    set(els.startKnob, 'transform', this.pressedButton ? 'translate(0 2.5)' : '')

    // Quartz-lock LED: blinks while the platter is finding its speed
    const nominal = this.speed === 33 ? NOM33 : NOM45
    const target = nominal * (1 + this.pitch * 0.08)
    const locked = this.motorOn && Math.abs(this.omega - target) < 0.0015
    const ledOn = this.motorOn && (locked || Math.floor(now / 180) % 2 === 0)
    set(els.led, 'fill', ledOn ? '#FF4A24' : '#8A2E12')
    set(els.ledGlow, 'opacity', ledOn ? 0.75 : 0)

    set(els.volKnob, 'transform', `rotate(${(-135 + 270 * this.volume).toFixed(1)} 990 840)`)
    set(els.volFill, 'd', this.volume > 0.004 ? arcPath(990, 840, 78, -135, -135 + 270 * this.volume) : '')
    set(els.vol, 'aria-valuenow', Math.round(this.volume * 100))
    set(els.pitchKnob, 'transform', `translate(0 ${(-this.pitch * 120).toFixed(1)})`)
    set(els.pitch, 'aria-valuenow', (this.pitch * 8).toFixed(1))
  }
}
