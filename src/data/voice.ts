import VOICE from '@/data/generated/voice.json'
import { playVoice, stopVoice } from '@/sound'

// Giọng đọc sinh sẵn (`bun run gen:voice`, VieNeu-TTS): lời tự ngẫm của người chơi (phụ đề, `say` trong introStore) + lời Keeb-chan
// (màn chào, các tour, lời dẫn khi đi lại). Tra theo đúng chuỗi câu; câu không có file (câu ghép tên / số) thì im lặng

/** câu → file trong `public/audio/voice/` + độ dài (giây) */
export const VOICES: Record<string, { file: string; dur: number } | undefined> = VOICE

/** nghỉ giữa 2 câu đọc liền nhau (ms) */
const GAP = 250
let timer = 0
/** đang đọc dở chuỗi `speak` */
let speaking = false

/** dừng chuỗi `speak` đang đọc (không đụng giọng do chỗ khác phát) */
export function hush() {
  window.clearTimeout(timer)
  if (speaking) stopVoice()
  speaking = false
}

/** đọc lần lượt các câu có giọng (câu không có file thì bỏ qua); gọi lại = cắt chuỗi cũ */
export function speak(lines: string[]) {
  hush()
  const known = lines.flatMap((l) => VOICES[l] ?? [])
  const go = (i: number) => {
    if (i >= known.length) return void (speaking = false)
    speaking = true
    playVoice(known[i].file)
    timer = window.setTimeout(() => go(i + 1), known[i].dur * 1000 + GAP)
  }
  go(0)
}
