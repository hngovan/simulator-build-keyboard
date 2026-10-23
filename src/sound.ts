// Tổng hợp tiếng gõ + nhạc nền bằng WebAudio, không cần file âm thanh
import type { AudioSettings, SoundProfile } from '@/types'

let ctx: AudioContext | undefined
let effectsGain: GainNode | undefined
let musicGain: GainNode | undefined
let bgmSource: AudioBufferSourceNode | undefined
let audioSettings: AudioSettings = { muted: false, musicVolume: 0.45, effectsVolume: 0.7 }

function ac() {
  if (ctx) return ctx
  ctx = new AudioContext()
  const master = ctx.createGain()
  effectsGain = ctx.createGain()
  musicGain = ctx.createGain()
  effectsGain.connect(master)
  musicGain.connect(master)
  master.connect(ctx.destination)
  applyAudioSettings(audioSettings)
  return ctx
}

/** Đồng bộ âm lượng đang lưu với các kênh Web Audio đã tạo. */
export function applyAudioSettings(settings: AudioSettings) {
  audioSettings = settings
  if (!ctx || !effectsGain || !musicGain) return
  const t = ctx.currentTime
  effectsGain.gain.setTargetAtTime(settings.muted ? 0 : settings.effectsVolume, t, 0.02)
  musicGain.gain.setTargetAtTime(settings.muted ? 0 : settings.musicVolume, t, 0.02)
}

interface Burst {
  freq: number
  q: number
  dur: number
  gain: number
}

function noiseBurst(t: number, { freq, q, dur, gain }: Burst) {
  const a = ac()
  const len = Math.floor(a.sampleRate * dur)
  const buf = a.createBuffer(1, len, a.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
  const src = a.createBufferSource()
  src.buffer = buf
  const filter = a.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = freq
  filter.Q.value = q
  const g = a.createGain()
  g.gain.value = gain
  src.connect(filter).connect(g).connect(effectsGain!)
  src.start(t)
}

// profile: { loud 0..1, pitch 0..1, kind } từ soundProfile()
export function playKey(profile: SoundProfile, down = true) {
  const t = ac().currentTime
  const j = 0.9 + Math.random() * 0.2
  const gain = 0.15 + profile.loud * 1.1
  const body = 280 + profile.pitch * 1100
  if (!down) {
    noiseBurst(t, { freq: body * 2.5 * j, q: 1.5, dur: 0.03, gain: gain * 0.25 })
    return
  }
  noiseBurst(t, { freq: body * j, q: 1.2, dur: 0.06 + (1 - profile.pitch) * 0.05, gain })
  if (profile.kind === 'Tactile')
    noiseBurst(t, { freq: 1300 * j, q: 2, dur: 0.03, gain: gain * 0.35 })
  if (profile.kind === 'Clicky') noiseBurst(t, { freq: 4200 * j, q: 6, dur: 0.025, gain: 1.2 })
}

export function playClick(freq = 2500) {
  noiseBurst(ac().currentTime, { freq, q: 3, dur: 0.04, gain: 0.5 })
}

export function playScrew() {
  const t = ac().currentTime
  for (let i = 0; i < 3; i++) noiseBurst(t + i * 0.04, { freq: 3500, q: 8, dur: 0.02, gain: 0.3 })
}

export function playSolder() {
  noiseBurst(ac().currentTime, { freq: 6000, q: 0.7, dur: 0.25, gain: 0.15 })
}

// Tua vít điện: tiếng rè của motor
export function playDrill() {
  const a = ac()
  const t = a.currentTime
  const osc = a.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(180, t)
  osc.frequency.linearRampToValueAtTime(260, t + 0.3)
  const g = a.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.03)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4)
  osc.connect(g).connect(effectsGain!)
  osc.start(t)
  osc.stop(t + 0.42)
}

// Cọ quét lube
export function playBrush() {
  const t = ac().currentTime
  for (let i = 0; i < 4; i++)
    noiseBurst(t + i * 0.06, { freq: 2000 + i * 300, q: 0.8, dur: 0.05, gain: 0.12 })
}

/** Nhạc nền nhẹ cho bàn build: tạo loop ambient từ oscillator thay vì tải file nhạc. */
export function startBgm(settings = audioSettings) {
  applyAudioSettings(settings)
  const a = ac()
  void a.resume().catch(() => undefined)
  if (bgmSource) return

  const seconds = 12
  const buffer = a.createBuffer(1, a.sampleRate * seconds, a.sampleRate)
  const data = buffer.getChannelData(0)
  const progression = [130.81, 146.83, 110, 123.47]
  for (let i = 0; i < data.length; i++) {
    const time = i / a.sampleRate
    const chord = Math.floor(time / 3) % progression.length
    const local = time % 3
    const envelope = Math.min(local * 2.5, 1, Math.max(0, (3 - local) * 1.4))
    const root = progression[chord]
    data[i] =
      (Math.sin(Math.PI * 2 * root * time) * 0.035 +
        Math.sin(Math.PI * 2 * root * 1.5 * time) * 0.018 +
        Math.sin(Math.PI * 2 * root * 2 * time) * 0.012) *
      envelope
  }
  bgmSource = a.createBufferSource()
  bgmSource.buffer = buffer
  bgmSource.loop = true
  bgmSource.connect(musicGain!)
  bgmSource.onended = () => {
    bgmSource = undefined
  }
  bgmSource.start()
}

export function stopBgm() {
  if (!bgmSource) return
  bgmSource.onended = null
  bgmSource.stop()
  bgmSource.disconnect()
  bgmSource = undefined
}
