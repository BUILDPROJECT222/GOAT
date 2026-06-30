// Synthesized SFX via Web Audio API (no asset files). hit / whale / ko.
let ctx = null
let enabled = true
let lastHit = 0

const ac = () => {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext
    if (C) ctx = new C()
  }
  return ctx
}

// Browsers block audio until a user gesture — call this on first interaction.
export const unlockSound = () => { const c = ac(); if (c && c.state === 'suspended') c.resume() }
export const setSoundEnabled = (v) => { enabled = v; if (v) unlockSound() }
export const isSoundEnabled = () => enabled

const env = (g, t0, peak, dur) => {
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
}

const blip = ({ f0, f1, dur, type = 'square', peak = 0.25 }) => {
  const c = ac(); if (!c) return
  const t0 = c.currentTime
  const o = c.createOscillator(); const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(f0, t0)
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur)
  env(g, t0, peak, dur)
  o.connect(g).connect(c.destination)
  o.start(t0); o.stop(t0 + dur + 0.03)
}

const noise = ({ dur = 0.12, peak = 0.2, hp = 800 }) => {
  const c = ac(); if (!c) return
  const t0 = c.currentTime
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const src = c.createBufferSource(); src.buffer = buf
  const g = c.createGain(); env(g, t0, peak, dur)
  const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp
  src.connect(f).connect(g).connect(c.destination)
  src.start(t0); src.stop(t0 + dur)
}

export const playHit = () => {
  if (!enabled) return
  const now = performance.now()
  if (now - lastHit < 70) return // throttle bursts
  lastHit = now
  blip({ f0: 230, f1: 90, dur: 0.09, type: 'square', peak: 0.2 })
  noise({ dur: 0.05, peak: 0.1, hp: 1400 })
}

export const playWhale = () => {
  if (!enabled) return
  blip({ f0: 160, f1: 45, dur: 0.5, type: 'sawtooth', peak: 0.3 })
  blip({ f0: 320, f1: 120, dur: 0.4, type: 'triangle', peak: 0.16 })
  noise({ dur: 0.25, peak: 0.16, hp: 400 })
}

export const playKO = () => {
  if (!enabled) return
  blip({ f0: 520, f1: 60, dur: 0.7, type: 'sawtooth', peak: 0.32 })
  blip({ f0: 90, f1: 38, dur: 0.6, type: 'sine', peak: 0.3 })
  noise({ dur: 0.4, peak: 0.22, hp: 300 })
}
