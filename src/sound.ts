// Âm thanh: sample CC0 trong public/audio/sfx/<tương tác>/ (tải trước khi tạo AudioContext), thiếu file thì
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
  'desolder/suction.wav',
  'keypress/1.wav',
  'keypress/2.wav',
  'keypress/3.wav',
  'screw/1.wav',
  'screw/2.wav',
  'assembly/click.wav',
  'open-box/tape.wav',
  'open-box/plastic.wav',
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

/**
 * Phát sample CC0 đã cache; lần đầu tải thì trả false để caller phát tiếng WebAudio dự phòng.
 * `delay` = phát trễ (giây), `lowpass` = cắt tiếng cao trên tần số này (Hz, tiếng bị "bịt"), `dur` = chỉ phát chừng này giây
 * (tắt dần 0,25s cuối; sample dài hơn hoạt cảnh)
 */
function playSfx(
  name: string,
  volume = 0.7,
  rate = 1,
  { delay = 0, lowpass, dur }: { delay?: number; lowpass?: number; dur?: number } = {},
) {
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
  let head: AudioNode = source
  let filter: BiquadFilterNode | undefined
  if (lowpass) {
    filter = a.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = lowpass
    filter.Q.value = 0.7
    head = source.connect(filter)
  }
  head.connect(gain).connect(effectsGain!)
  const t0 = a.currentTime + delay
  source.start(t0)
  if (dur) {
    const fade = Math.min(0.25, dur / 2)
    gain.gain.setValueAtTime(volume, t0 + dur - fade)
    gain.gain.linearRampToValueAtTime(0.0001, t0 + dur)
    source.stop(t0 + dur + 0.02)
  }
  source.onended = () => {
    source.disconnect()
    filter?.disconnect()
    gain.disconnect()
  }
  return true
}

let voiceSource: AudioBufferSourceNode | undefined
/** lượt phát giọng mới nhất: file tải xong mà đã có lượt khác (hoặc đã dừng) thì bỏ */
let voiceTurn = 0
const voiceBuffers = new Map<string, Promise<AudioBuffer | null>>()

/** dừng giọng đọc phụ đề đang phát */
export function stopVoice() {
  voiceTurn++
  try {
    voiceSource?.stop()
  } catch {
    /* chưa kịp phát */
  }
  voiceSource = undefined
}

/**
 * Phát giọng đọc phụ đề (`public/audio/voice/<file>`, sinh bằng `bun run gen:voice`), theo âm lượng hiệu ứng; mỗi lúc chỉ 1 giọng
 * (câu mới cắt câu cũ). Thiếu file thì im lặng
 */
export function playVoice(file: string) {
  stopVoice()
  const turn = voiceTurn
  const a = ac()
  let pending = voiceBuffers.get(file)
  if (!pending) {
    pending = fetch(`/audio/voice/${file}`)
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .then((data) => (data ? a.decodeAudioData(data) : null))
      .catch(() => null)
    voiceBuffers.set(file, pending)
  }
  void pending.then((buffer) => {
    if (!buffer || turn !== voiceTurn) return
    void a.resume().catch(() => undefined)
    const source = a.createBufferSource()
    source.buffer = buffer
    source.connect(effectsGain!)
    source.onended = () => source.disconnect()
    source.start()
    voiceSource = source
  })
}

/**
 * Trang đã có tương tác (bấm / gõ phím) chưa: tạo AudioContext trước đó thì Chrome cảnh báo "AudioContext was not allowed to start"
 * (autoplay policy) → nhạc nền + tiếng rê chuột chờ tới lần tương tác đầu
 */
const activated = () =>
  typeof navigator === 'undefined' || (navigator.userActivation?.hasBeenActive ?? true)

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

/** hệ số hạ kênh nhạc (nhạc nền + nhạc mở đầu) so với mức người chơi đặt: nhạc nhỏ đi một chút cho khỏi lấn giọng đọc */
const MUSIC_TRIM = 0.7

/** Đồng bộ âm lượng đang lưu với các kênh Web Audio đã tạo. */
export function applyAudioSettings(settings: AudioSettings) {
  audioSettings = settings
  if (!ctx || !effectsGain || !musicGain) return
  const t = ctx.currentTime
  effectsGain.gain.setTargetAtTime(settings.muted ? 0 : settings.effectsVolume, t, 0.02)
  musicGain.gain.setTargetAtTime(
    settings.muted || settings.musicOff ? 0 : settings.musicVolume * MUSIC_TRIM,
    t,
    0.02,
  )
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

/** cỡ phím khi gõ: 1u thường, 2u có stab (Shift, Enter, Backspace...), space (≥ 4u, stab dài) */
export type KeySize = '1u' | '2u' | 'space'

/** cỡ phím theo bề ngang (u): phím có stab ≥ 4u là space, 2–4u là phím 2u */
export const keySize = (w: number): KeySize => (w >= 4 ? 'space' : w >= 2 ? '2u' : '1u')

/**
 * Tiếng theo cỡ phím: `rate` hạ cao độ sample (keycap dài nặng, vang trầm hơn), `thump` tiếng ầm thân phím (Hz),
 * `gain` độ to ầm, `lowpass` cắt bớt tiếng cao, `rattle` lạch xạch dây stab chưa mod
 */
const SIZE_TONE: Record<KeySize, { rate: number; thump: number; gain: number; rattle: number }> = {
  '1u': { rate: 1, thump: 0, gain: 0, rattle: 0 },
  '2u': { rate: 0.88, thump: 260, gain: 0.45, rattle: 0.22 },
  space: { rate: 0.74, thump: 150, gain: 0.8, rattle: 0.4 },
}

/** phím có tiếng riêng trong bộ tiếng switch (kbsim) */
export type KeyRole = 'generic' | 'space' | 'enter' | 'backspace'
/** bộ tiếng switch có tiếng riêng Space / Enter / Backspace (mxblue không có) */
const SPECIAL_PACKS = new Set([
  'mxblack',
  'mxbrown',
  'boxnavy',
  'alpaca',
  'blackink',
  'redink',
  'cream',
  'holypanda',
  'turquoise',
])
const ROLE_FILE: Record<Exclude<KeyRole, 'generic'>, string> = {
  space: 'SPACE',
  enter: 'ENTER',
  backspace: 'BACKSPACE',
}
/** file tiếng của 1 phím trong bộ `pack`: nhấn = GENERIC_R0–R4 theo hàng (hoặc tiếng riêng), nhả = GENERIC / tiếng riêng */
function packFile(pack: string, down: boolean, role: KeyRole, row: number) {
  const special = role !== 'generic' && SPECIAL_PACKS.has(pack) ? ROLE_FILE[role] : null
  const name = down
    ? (special ?? `GENERIC_R${Math.max(0, Math.min(4, row))}`)
    : (special ?? 'GENERIC')
  return { file: `switch/${pack}/${down ? 'press' : 'release'}/${name}.mp3`, special: !!special }
}
/** tải trước cả bộ tiếng 1 switch (vào bước test / bấm nghe thử) để lần gõ đầu đã có tiếng thật */
export function preloadSwitchSound(pack: string | undefined) {
  if (!pack) return
  ac()
  const names = [
    ...[0, 1, 2, 3, 4].map((r) => `press/GENERIC_R${r}`),
    'release/GENERIC',
    ...(SPECIAL_PACKS.has(pack)
      ? Object.values(ROLE_FILE).flatMap((f) => [`press/${f}`, `release/${f}`])
      : []),
  ]
  for (const n of names) void loadSfx(`switch/${pack}/${n}.mp3`)
}

/** tiếng lạch xạch dây stab: 2 tiếng kim loại ngắn lệch nhau (2 đầu dây) */
function stabRattle(t: number, gain: number, j: number) {
  noiseBurst(t, { freq: 3400 * j, q: 7, dur: 0.02, gain })
  noiseBurst(t + 0.012 + Math.random() * 0.008, {
    freq: 2700 * j,
    q: 6,
    dur: 0.025,
    gain: gain * 0.8,
  })
}

/**
 * Gõ 1 phím ở bước test. `profile` = { loud, pitch, kind } (`buildSound`): to / cao độ theo switch + plate + case + mount + lube + foam;
 * `kind` đổi kiểu tiếng: Linear chạm đáy gọn, Tactile có "tộc" qua khấc trước khi chạm đáy, Clicky có tiếng click sắc
 * trước, Silent bị bịt (cắt tiếng cao, nhỏ, nhả gần như không tiếng). `size` = cỡ phím (2u / space trầm, ầm hơn, có tiếng stab);
 * `rattle` 0..1 = mức lạch xạch dây stab (mod stab rồi thì nhỏ)
 */
export function playKey(
  profile: SoundProfile,
  down = true,
  {
    size = '1u',
    rattle = 1,
    role = 'generic',
    row = 2,
  }: { size?: KeySize; rattle?: number; role?: KeyRole; row?: number } = {},
) {
  const t = ac().currentTime
  const j = 0.9 + Math.random() * 0.2
  const gain = 0.15 + profile.loud * 1.1
  const body = 280 + profile.pitch * 1100
  const silent = profile.kind === 'Silent' || profile.kind === 'SilentTactile'
  const tactile = profile.kind === 'Tactile' || profile.kind === 'SilentTactile'
  const tone = SIZE_TONE[size]
  // bộ tiếng thật của switch: tiếng gốc đã có khấc / click / stab; plate, case, lube, foam chỉ chỉnh nhẹ cao độ + độ to
  if (profile.sound) {
    const { file, special } = packFile(profile.sound, down, role, row)
    const rate =
      (1 + (profile.dp ?? 0) * 0.35) * (special ? 1 : tone.rate) * (0.97 + Math.random() * 0.06)
    const vol = Math.max(0.15, 0.8 * (1 + (profile.dl ?? 0) * 1.5)) * (silent ? 0.55 : 1)
    if (
      playSfx(file, vol, rate, {
        lowpass: silent ? 1400 : !special && size === 'space' ? 5000 : undefined,
      })
    ) {
      // bộ không có tiếng phím to riêng (mxblue): thêm ầm thân phím
      if (!special && tone.thump && down)
        noiseBurst(t, { freq: tone.thump * j, q: 0.9, dur: 0.09, gain: tone.gain * 0.25 })
      // stab chưa mod: lạch xạch thêm (tiếng gốc thu bằng stab đã mod)
      if (tone.rattle && !silent)
        stabRattle(t + 0.004, tone.rattle * Math.max(0, rattle - 0.15) * (down ? 0.6 : 0.4), j)
      return
    }
  }
  if (!down) {
    // nhả: tiếng nảy lên (silent có đệm cao su nên gần như không tiếng); phím có stab kèm lạch xạch dây khi nảy lên
    noiseBurst(t, {
      freq: body * 2.5 * j * tone.rate,
      q: 1.5,
      dur: 0.03,
      gain: gain * (silent ? 0.05 : 0.25),
    })
    if (tone.rattle && !silent) stabRattle(t + 0.005, tone.rattle * rattle * 0.6, j)
    return
  }
  // tactile: qua khấc trước rồi mới chạm đáy · clicky: click trước chạm đáy
  const lead = tactile ? 0.02 : profile.kind === 'Clicky' ? 0.012 : 0
  const key = `keypress/${1 + Math.floor(Math.random() * 3)}.wav`
  const sampled = playSfx(
    key,
    (0.5 + profile.loud * 0.22) * (silent ? 0.6 : 1),
    (0.92 + profile.pitch * 0.16) * tone.rate,
    { delay: lead, lowpass: silent ? 1400 : size === 'space' ? 5000 : undefined },
  )
  const synthGain = (sampled ? gain * 0.28 : gain) * (silent ? 0.5 : 1)
  noiseBurst(t + lead, {
    freq: body * j * tone.rate * (silent ? 0.6 : 1),
    q: 1.2,
    dur: 0.06 + (1 - profile.pitch) * 0.05,
    gain: synthGain,
  })
  // ầm thân phím dài: keycap to + stab đẩy cả thanh xuống
  if (tone.thump)
    noiseBurst(t + lead, {
      freq: tone.thump * j,
      q: 0.9,
      dur: 0.09,
      gain: tone.gain * synthGain * 2,
    })
  if (tone.rattle && !silent) stabRattle(t + lead + 0.004, tone.rattle * rattle, j)
  if (tactile)
    noiseBurst(t, {
      freq: (silent ? 800 : 1300) * j,
      q: 2,
      dur: 0.025,
      gain: (sampled ? 0.22 : 0.5) * (silent ? 0.5 : 1),
    })
  if (profile.kind === 'Clicky')
    noiseBurst(t, { freq: 4200 * j, q: 6, dur: 0.025, gain: sampled ? 0.42 : 1.2 })
}

/** Menu màn tiêu đề: rê / đổi mục đang chọn = tiếng tick nhẹ */
export function playUiHover() {
  // rê chuột không tính là tương tác: chưa bấm / gõ phím lần nào thì im
  if (!activated()) return
  noiseBurst(ac().currentTime, { freq: 3200, q: 4, dur: 0.025, gain: 0.18 })
}

/** Menu màn tiêu đề: bấm chọn mục = tiếng gõ phím cơ (sample keypress, thiếu file thì tổng hợp) */
export function playUiSelect() {
  const key = `keypress/${1 + Math.floor(Math.random() * 3)}.wav`
  if (playSfx(key, 0.75, 0.95 + Math.random() * 0.1)) return
  noiseBurst(ac().currentTime, { freq: 900, q: 1.2, dur: 0.07, gain: 0.6 })
}

/**
 * Nút trả lời trong đoạn mở đầu (popup hỏi hướng dẫn, lời chào Keeb-chan): tiếng "tinh" giao diện mềm, khác hẳn tiếng gõ phím cơ
 * (`playUiSelect` nghe như đang lắp / gõ phím). `ok` = đồng ý: 2 nốt đi lên; không: 2 nốt đi xuống, trầm hơn
 */
export function playUiConfirm(ok = true) {
  const a = ac()
  const t = a.currentTime
  ;(ok ? [587, 880] : [494, 370]).forEach((f, i) => {
    const osc = a.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = f
    const g = a.createGain()
    const s = t + i * 0.09
    g.gain.setValueAtTime(0.0001, s)
    g.gain.exponentialRampToValueAtTime(0.22, s + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, s + 0.22)
    osc.connect(g).connect(effectsGain!)
    osc.start(s)
    osc.stop(s + 0.24)
  })
}

/** Tin nhắn mới (đoạn mở đầu: màn hình máy tính báo tin): 2 nốt chuông ngắn đi lên */
export function playNotify() {
  const a = ac()
  const t = a.currentTime
  ;[880, 1320].forEach((f, i) => {
    const osc = a.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = f
    const g = a.createGain()
    const s = t + i * 0.13
    g.gain.setValueAtTime(0.0001, s)
    g.gain.exponentialRampToValueAtTime(0.25, s + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, s + 0.45)
    osc.connect(g).connect(effectsGain!)
    osc.start(s)
    osc.stop(s + 0.47)
  })
}

export function playClick(freq = 2500) {
  if (playSfx('assembly/click.wav', 0.48, 0.94 + Math.random() * 0.12)) return
  noiseBurst(ac().currentTime, { freq, q: 3, dur: 0.04, gain: 0.5 })
}

export function playScrew() {
  const sound = Math.random() < 0.5 ? 'screw/1.wav' : 'screw/2.wav'
  if (playSfx(sound, 0.7, 0.92 + Math.random() * 0.16)) return
  const t = ac().currentTime
  for (let i = 0; i < 3; i++) noiseBurst(t + i * 0.04, { freq: 3500, q: 8, dur: 0.02, gain: 0.3 })
}

/** Bóc băng keo rồi tiếng túi/bao bì sột soạt khi mở kiện hàng. */
export function playOpenBox() {
  // tape 2s, plastic 6,3s: cắt theo hoạt cảnh bật nắp (~1,4s), không kêu lố sang bước sau
  if (!playSfx('open-box/tape.wav', 0.72, 1, { dur: 0.9 }))
    noiseBurst(ac().currentTime, { freq: 850, q: 0.8, dur: 0.22, gain: 0.22 })
  setTimeout(() => {
    if (!playSfx('open-box/plastic.wav', 0.42, 0.88 + Math.random() * 0.18, { dur: 1.1 }))
      noiseBurst(ac().currentTime, { freq: 1400, q: 0.7, dur: 0.16, gain: 0.14 })
  }, 280)
}

/** Dao rọc giấy rạch dọc băng keo thùng carton (`dur` giây): chuỗi tiếng sột ngắn, cao dần */
export function playCut(dur = 0.7) {
  const t = ac().currentTime
  const n = Math.round(dur / 0.045)
  for (let i = 0; i < n; i++)
    noiseBurst(t + i * 0.045 + Math.random() * 0.01, {
      freq: 2600 + (i / n) * 1400 + Math.random() * 400,
      q: 2.5,
      dur: 0.035,
      gain: 0.16,
    })
}

/** Súng băng keo kéo dán dọc nắp thùng: tiếng băng bong khỏi cuộn (sample bóc băng keo, chậm hơn) + tiếng xé cuối */
export function playTape(dur = 0.8) {
  if (!playSfx('open-box/tape.wav', 0.6, 0.82, { dur: dur + 0.2 })) {
    const t = ac().currentTime
    for (let i = 0; i < 10; i++)
      noiseBurst(t + (i * dur) / 10, { freq: 900 + i * 90, q: 1.2, dur: 0.09, gain: 0.14 })
  }
  setTimeout(
    () => noiseBurst(ac().currentTime, { freq: 3800, q: 2, dur: 0.05, gain: 0.25 }),
    dur * 1000,
  )
}

export function playTipWipe() {
  const t = ac().currentTime
  for (let i = 0; i < 6; i++) noiseBurst(t + i * 0.23, { freq: 3500, q: 0.7, dur: 0.16, gain: 0.1 })
}

export function playDesolder() {
  const t = ac().currentTime
  if (!playSfx('desolder/suction.wav', 0.75))
    noiseBurst(t, { freq: 1100, q: 0.8, dur: 0.18, gain: 0.22 })
  noiseBurst(t, { freq: 2800, q: 1.8, dur: 0.045, gain: 0.18 })
}

export function playSolder() {
  noiseBurst(ac().currentTime, { freq: 6000, q: 0.7, dur: 0.25, gain: 0.15 })
}

// Tua vít điện: tiếng rè của motor + tiếng ren ốc tua nhanh
export function playDrill() {
  const a = ac()
  playSfx('screw/1.wav', 0.45, 1.6 + Math.random() * 0.2)
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

/** lỗ ren: case (ngàm case), top (ốc top mount), tray (trụ đồng tray mount), stab (vít stab nhỏ), other (vít DTB / ốc tạ) */
export type ThreadKind = 'case' | 'top' | 'tray' | 'stab' | 'other'
/** cao độ tiếng ren theo lỗ: trụ đồng tray rít cao, ngàm case nhôm trầm hơn, vít stab nhỏ rít chói */
const THREAD_PITCH: Record<ThreadKind, number> = {
  case: 0.8,
  top: 1,
  tray: 1.18,
  stab: 1.35,
  other: 1.05,
}

/** tiếng kim loại cọ ren: răng cưa qua lọc dải, rè theo nhịp ren trượt (`rate` lần / giây), tụt cao độ dần */
function grind(t: number, dur: number, freq: number, gain: number, rate = 34) {
  const a = ac()
  const osc = a.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(freq, t)
  osc.frequency.exponentialRampToValueAtTime(freq * 0.62, t + dur)
  const filter = a.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = freq * 1.6
  filter.Q.value = 3
  // nhịp ren: LFO vuông bật / tắt âm lượng (0..1 quanh 0,5)
  const lfo = a.createOscillator()
  lfo.type = 'square'
  lfo.frequency.value = rate
  const depth = a.createGain()
  depth.gain.value = 0.5
  const trem = a.createGain()
  trem.gain.value = 0.5
  const g = a.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02)
  g.gain.setValueAtTime(gain, t + dur * 0.7)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  lfo.connect(depth).connect(trem.gain)
  osc.connect(filter).connect(trem).connect(g).connect(effectsGain!)
  osc.start(t)
  lfo.start(t)
  osc.stop(t + dur + 0.02)
  lfo.stop(t + dur + 0.02)
}

/**
 * Trượt ren: `final` = false là 1 lần trượt (ren rít két ngắn), true = tuôn ren hẳn (rít dài rồi vít quay lỏng lạch cạch);
 * cao độ theo loại lỗ (`THREAD_PITCH`)
 */
export function playStrip(kind: ThreadKind, final = false) {
  const t = ac().currentTime
  const p = THREAD_PITCH[kind] * (0.95 + Math.random() * 0.1)
  if (!final) {
    grind(t, 0.22, 1700 * p, 0.09, 42)
    noiseBurst(t, { freq: 4200 * p, q: 5, dur: 0.05, gain: 0.25 })
    return
  }
  grind(t, 0.6, 1500 * p, 0.12, 30)
  noiseBurst(t, { freq: 3600 * p, q: 4, dur: 0.08, gain: 0.3 })
  // vít mất ren quay trơn: lạch cạch thưa dần
  for (let i = 0; i < 5; i++)
    noiseBurst(t + 0.62 + i * (0.07 + i * 0.02), {
      freq: 2600 * p,
      q: 6,
      dur: 0.025,
      gain: 0.26 - i * 0.04,
    })
}

/** Case nứt: tiếng "rắc" khô + tiếng đục trầm */
export function playCrack() {
  const t = ac().currentTime
  noiseBurst(t, { freq: 2400, q: 0.6, dur: 0.07, gain: 0.9 })
  noiseBurst(t + 0.05, { freq: 5200, q: 1.5, dur: 0.04, gain: 0.5 })
  noiseBurst(t + 0.02, { freq: 220, q: 0.9, dur: 0.18, gain: 0.7 })
}

/** Tuôn ren quá số lỗ cho phép: hỏng hẳn, không lắp tiếp được (tuôn ren + tiếng chuông báo trầm 2 nốt đi xuống) */
export function playRuin(kind: ThreadKind) {
  playStrip(kind, true)
  const a = ac()
  const t = a.currentTime + 0.75
  ;[392, 262].forEach((f, i) => {
    const osc = a.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = f
    const g = a.createGain()
    const s = t + i * 0.22
    g.gain.setValueAtTime(0.0001, s)
    g.gain.exponentialRampToValueAtTime(0.22, s + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, s + 0.5)
    osc.connect(g).connect(effectsGain!)
    osc.start(s)
    osc.stop(s + 0.52)
  })
}

/**
 * Vang góc case (ping): vỏ nhôm viền mỏng rung "bong", các hoạ âm không điều hoà (kiểu chuông nhỏ) hơi lệch nhau
 * cho tiếng rền; `strength` 0..1 (foam lót thì nhỏ hơn)
 */
export function playPing(strength = 1) {
  const a = ac()
  const t = a.currentTime + 0.01
  const base = 760 * (0.94 + Math.random() * 0.12)
  const parts: [number, number, number][] = [
    // [hệ số tần số, âm lượng, thời gian tắt]
    [1, 1, 0.9],
    [1.006, 0.6, 0.85],
    [2.76, 0.35, 0.5],
    [5.4, 0.15, 0.25],
  ]
  for (const [m, v, dur] of parts) {
    const osc = a.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = base * m
    const g = a.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.11 * v * strength, t + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(g).connect(effectsGain!)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }
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

// Trình duyệt chặn phát âm thanh tới lần tương tác đầu tiên: nhạc nền gọi ở màn tiêu đề chỉ ghi lại (chưa tạo AudioContext),
// bấm / gõ phím lần đầu thì tạo / mở lại để nhạc chạy luôn
let bgmPending = false
if (typeof window !== 'undefined') {
  // cảm ứng: pointerdown chưa tính là tương tác (pointerup / touchend mới tính) → chờ tới khi trình duyệt ghi nhận rồi mới gỡ
  const EVENTS = ['pointerdown', 'pointerup', 'touchend', 'keydown'] as const
  const unlock = () => {
    if (!activated()) return
    if (ctx) void ctx.resume().catch(() => undefined)
    if (bgmPending) {
      bgmPending = false
      startBgm()
    }
    EVENTS.forEach((e) => window.removeEventListener(e, unlock))
  }
  EVENTS.forEach((e) => window.addEventListener(e, unlock))
}

/** Nhạc nền ở màn tiêu đề / máy tính / bàn build: xoay ngẫu nhiên các bài trong BGM_URLS */
export function startBgm(settings = audioSettings) {
  applyAudioSettings(settings)
  if (!activated()) {
    bgmPending = true
    return
  }
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

// Nhạc đoạn mở đầu (thay nhạc nền lúc chạy `features/intro`): file `public/audio/intro.mp3` nếu có, không thì bản tổng hợp
// `introTheme`. Lặp tới khi dừng, vào / ra đều tắt dần
let introMusic: { source: AudioBufferSourceNode; gain: GainNode } | undefined
let introWanted = false
let introTrack: Promise<AudioBuffer> | undefined

export function startIntroMusic() {
  if (introWanted || !activated()) return
  introWanted = true
  const a = ac()
  void a.resume().catch(() => undefined)
  introTrack ??= fetch('/audio/intro.mp3')
    .then((res) =>
      res.ok && res.headers.get('content-type')?.startsWith('audio')
        ? res.arrayBuffer().then((buf) => a.decodeAudioData(buf))
        : null,
    )
    .catch(() => null)
    .then((buffer) => buffer ?? introTheme(a))
  void introTrack.then((buffer) => {
    if (!introWanted || introMusic) return
    const source = a.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const gain = a.createGain()
    gain.gain.setValueAtTime(0, a.currentTime)
    gain.gain.linearRampToValueAtTime(1, a.currentTime + 1.2)
    source.connect(gain).connect(musicGain!)
    source.start()
    introMusic = { source, gain }
  })
}

/** dừng nhạc đoạn mở đầu, tắt dần trong `fade` giây */
export function stopIntroMusic(fade = 1.5) {
  introWanted = false
  if (!introMusic || !ctx) return
  const { source, gain } = introMusic
  introMusic = undefined
  const t = ctx.currentTime
  gain.gain.cancelScheduledValues(t)
  gain.gain.setValueAtTime(gain.gain.value, t)
  gain.gain.linearRampToValueAtTime(0, t + fade)
  source.onended = () => {
    source.disconnect()
    gain.disconnect()
  }
  source.stop(t + fade + 0.05)
}

/**
 * Nhạc mở đầu tổng hợp, loop 16 giây: 4 hợp âm (Cmaj7 → Am7 → Fmaj7 → G) nền sóng sin ngân dài + chuông rải từng nốt nửa giây một
 * (đuôi chuông vắt qua điểm nối loop cho liền)
 */
function introTheme(a: AudioContext) {
  const BAR = 4
  const CHORDS = [
    [130.81, 164.81, 196.0, 246.94],
    [110.0, 130.81, 164.81, 196.0],
    [87.31, 110.0, 130.81, 164.81],
    [98.0, 123.47, 146.83, 196.0],
  ]
  /** thứ tự rải nốt trong 1 hợp âm */
  const ARP = [0, 2, 1, 3, 2, 3, 1, 2]
  const rate = a.sampleRate
  const buffer = a.createBuffer(1, rate * BAR * CHORDS.length, rate)
  const data = buffer.getChannelData(0)
  const TAU = Math.PI * 2
  CHORDS.forEach((chord, c) => {
    // nền: mỗi hợp âm vào / ra êm 0,8s
    const start = c * BAR * rate
    for (let i = 0; i < BAR * rate; i++) {
      const local = i / rate
      const env = Math.min(local / 0.8, 1, (BAR - local) / 0.8)
      const time = (start + i) / rate
      let v = 0
      for (const f of chord) v += Math.sin(TAU * f * time) * 0.045
      data[start + i] += v * env
    }
    // chuông: cao hơn 2 quãng tám, tắt dần 1,6s
    ARP.forEach((n, k) => {
      const f = chord[n] * 4
      const at = start + Math.floor(k * 0.5 * rate)
      const len = Math.floor(1.6 * rate)
      for (let i = 0; i < len; i++) {
        const t = i / rate
        const env = Math.min(t / 0.005, 1) * Math.exp(-t * 3.2)
        data[(at + i) % data.length] +=
          (Math.sin(TAU * f * t) + Math.sin(TAU * f * 2 * t) * 0.25) * 0.07 * env
      }
    })
  })
  return buffer
}

export function stopBgm() {
  bgmWanted = false
  bgmPending = false
  if (!bgmSource) return
  bgmSource.onended = null
  bgmSource.stop()
  bgmSource.disconnect()
  bgmSource = undefined
}
