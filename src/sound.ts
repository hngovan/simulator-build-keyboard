// Âm thanh: sample CC0 trong public/audio/sfx (tải trước khi tạo AudioContext), thiếu file thì
// tổng hợp bằng WebAudio; nhạc nền xoay ngẫu nhiên public/audio/bgm*.mp3 hoặc loop tổng hợp
import type { AudioSettings, SoundProfile } from '@/types'

let ctx: AudioContext | undefined
let effectsGain: GainNode | undefined
let musicGain: GainNode | undefined
let bgmSource: AudioBufferSourceNode | undefined
let audioSettings: AudioSettings = { muted: false, musicVolume: 0.45, effectsVolume: 0.7 }
const sfxBuffers = new Map<string, AudioBuffer>()
const sfxLoading = new Map<string, Promise<AudioBuffer | null>>()
/** toàn bộ sample, tải ngay khi tạo AudioContext để lần phát đầu đã có tiếng thật */
const SFX_FILES = [
  'desolder-suction.wav',
  'keypress-1.wav',
  'keypress-2.wav',
  'keypress-3.wav',
  'screw-turn-1.wav',
  'screw-turn-2.wav',
  'assembly-click.wav',
  'box-tape-1.wav',
  'box-plastic.wav',
]

function loadSfx(name: string) {
  let pending = sfxLoading.get(name)
  if (!pending) {
    const a = ac()
    pending = fetch(`/audio/sfx/${name}`)
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .then((data) => (data ? a.decodeAudioData(data) : null))
      .then((buffer) => {
        if (buffer) sfxBuffers.set(name, buffer)
        return buffer
      })
      .catch(() => null)
    sfxLoading.set(name, pending)
  }
  return pending
}

/** Phát sample CC0 đã cache; lần đầu tải thì trả false để caller phát tiếng WebAudio dự phòng. */
function playSfx(name: string, volume = 0.7, rate = 1) {
  const a = ac()
  const buffer = sfxBuffers.get(name)
  if (!buffer) {
    void loadSfx(name)
    return false
  }
  void a.resume().catch(() => undefined)
  const source = a.createBufferSource()
  source.buffer = buffer
  source.playbackRate.value = rate
  const gain = a.createGain()
  gain.gain.value = volume
  source.connect(gain).connect(effectsGain!)
  source.start()
  source.onended = () => {
    source.disconnect()
    gain.disconnect()
  }
  return true
}

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
  SFX_FILES.forEach((name) => void loadSfx(name))
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
  const key = `keypress-${1 + Math.floor(Math.random() * 3)}.wav`
  const sampled = playSfx(key, 0.5 + profile.loud * 0.22, 0.92 + profile.pitch * 0.16)
  const synthGain = sampled ? gain * 0.28 : gain
  noiseBurst(t, { freq: body * j, q: 1.2, dur: 0.06 + (1 - profile.pitch) * 0.05, gain: synthGain })
  if (profile.kind === 'Tactile')
    noiseBurst(t, { freq: 1300 * j, q: 2, dur: 0.03, gain: synthGain * 0.35 })
  if (profile.kind === 'Clicky')
    noiseBurst(t, { freq: 4200 * j, q: 6, dur: 0.025, gain: sampled ? 0.34 : 1.2 })
}

export function playClick(freq = 2500) {
  if (playSfx('assembly-click.wav', 0.48, 0.94 + Math.random() * 0.12)) return
  noiseBurst(ac().currentTime, { freq, q: 3, dur: 0.04, gain: 0.5 })
}

export function playScrew() {
  const sound = Math.random() < 0.5 ? 'screw-turn-1.wav' : 'screw-turn-2.wav'
  if (playSfx(sound, 0.7, 0.92 + Math.random() * 0.16)) return
  const t = ac().currentTime
  for (let i = 0; i < 3; i++) noiseBurst(t + i * 0.04, { freq: 3500, q: 8, dur: 0.02, gain: 0.3 })
}

/** Bóc băng keo rồi tiếng túi/bao bì sột soạt khi mở kiện hàng. */
export function playOpenBox() {
  if (!playSfx('box-tape-1.wav', 0.72))
    noiseBurst(ac().currentTime, { freq: 850, q: 0.8, dur: 0.22, gain: 0.22 })
  setTimeout(() => {
    if (!playSfx('box-plastic.wav', 0.42, 0.88 + Math.random() * 0.18))
      noiseBurst(ac().currentTime, { freq: 1400, q: 0.7, dur: 0.16, gain: 0.14 })
  }, 280)
}

export function playTipWipe() {
  const t = ac().currentTime
  for (let i = 0; i < 6; i++) noiseBurst(t + i * 0.23, { freq: 3500, q: 0.7, dur: 0.16, gain: 0.1 })
}

export function playDesolder() {
  const t = ac().currentTime
  if (!playSfx('desolder-suction.wav', 0.75))
    noiseBurst(t, { freq: 1100, q: 0.8, dur: 0.18, gain: 0.22 })
  noiseBurst(t, { freq: 2800, q: 1.8, dur: 0.045, gain: 0.18 })
}

export function playSolder() {
  noiseBurst(ac().currentTime, { freq: 6000, q: 0.7, dur: 0.25, gain: 0.15 })
}

// Tua vít điện: tiếng rè của motor + tiếng ren ốc tua nhanh
export function playDrill() {
  const a = ac()
  playSfx('screw-turn-1.wav', 0.45, 1.6 + Math.random() * 0.2)
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

/**
 * Nhạc nền từ file (CC0, nguồn ở public/audio/README.md): phát ngẫu nhiên từng bài, hết bài thì
 * sang bài khác (không lặp bài vừa nghe); không tải được bài nào thì dùng loop ambient tổng hợp
 */
const BGM_URLS = ['/audio/bgm.mp3', '/audio/bgm-2.mp3', '/audio/bgm-3.mp3']
/** bài đã tải / đang tải (tải lười, mỗi bài một lần) */
const tracks = new Map<number, Promise<AudioBuffer | null>>()
/** bài tải lỗi, không chọn lại */
const badTracks = new Set<number>()
let lastTrack = -1
/** đang muốn phát nhạc (để huỷ nếu đã stopBgm trong lúc file còn đang tải) */
let bgmWanted = false

function loadTrack(a: AudioContext, idx: number) {
  let track = tracks.get(idx)
  if (!track) {
    track = fetch(BGM_URLS[idx])
      .then((res) =>
        res.ok && res.headers.get('content-type')?.startsWith('audio')
          ? res.arrayBuffer().then((buf) => a.decodeAudioData(buf))
          : null,
      )
      .catch(() => null)
    tracks.set(idx, track)
  }
  return track
}

/** chọn ngẫu nhiên bài còn dùng được, khác bài vừa phát (nếu còn bài khác) */
function pickTrack() {
  const ok = BGM_URLS.map((_, i) => i).filter((i) => !badTracks.has(i))
  const fresh = ok.filter((i) => i !== lastTrack)
  const pool = fresh.length ? fresh : ok
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : -1
}

/** Nhạc nền ở máy tính / bàn build: xoay ngẫu nhiên các bài trong BGM_URLS */
export function startBgm(settings = audioSettings) {
  applyAudioSettings(settings)
  const a = ac()
  void a.resume().catch(() => undefined)
  if (bgmSource || bgmWanted) return
  bgmWanted = true
  playNext(a)
}

function playNext(a: AudioContext) {
  const idx = pickTrack()
  if (idx < 0) {
    if (bgmWanted && !bgmSource) playBuffer(a, ambientLoop(a), true)
    return
  }
  void loadTrack(a, idx).then((buffer) => {
    if (!bgmWanted || bgmSource) return
    if (!buffer) {
      badTracks.add(idx)
      playNext(a)
      return
    }
    lastTrack = idx
    playBuffer(a, buffer, false)
  })
}

function playBuffer(a: AudioContext, buffer: AudioBuffer, loop: boolean) {
  const source = a.createBufferSource()
  source.buffer = buffer
  source.loop = loop
  source.connect(musicGain!)
  source.onended = () => {
    source.disconnect()
    if (bgmSource === source) bgmSource = undefined
    // hết bài: sang bài khác
    if (!loop && bgmWanted) playNext(a)
  }
  bgmSource = source
  source.start()
}

/** Loop ambient 12 giây tạo từ sóng sin (dự phòng khi chưa có file nhạc) */
function ambientLoop(a: AudioContext) {
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
  return buffer
}

export function stopBgm() {
  bgmWanted = false
  if (!bgmSource) return
  bgmSource.onended = null
  bgmSource.stop()
  bgmSource.disconnect()
  bgmSource = undefined
}
