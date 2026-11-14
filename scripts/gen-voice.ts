// Sinh giọng đọc bằng VieNeu-TTS (github.com/pnnbao97/VieNeu-TTS, mã nguồn Apache 2.0, chạy tại máy):
// - lời tự ngẫm của người chơi (phụ đề dấu ? lúc tập đi lại, màn hình máy tính, tranh QMK): giọng `VOICE`
// - lời Keeb-chan (màn chào, tour máy tính / bàn build / thu tiền, lời dẫn khi đi lại): giọng `KEEB_VOICE`
// Mỗi câu 1 file mp3 trong public/audio/voice/ + src/data/generated/voice.json (câu → file + độ dài). Câu đã có file thì bỏ qua
// (FORCE=1 sinh lại hết); đổi giọng / đổi câu thì ra file mới, file cũ tự dọn. Câu ghép tên / số lúc chơi không có giọng.
// Cần: môi trường Python đã `pip install vieneu` (`VIENEU_PY` = python.exe của nó) + ffmpeg. Biến môi trường: xem .env.example
//   bun run gen:voice
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { GREET, GREET_END, PC_LINE, QMK_STORY, TIPS } from '../src/features/intro/introStore'
import { BENCH_LINES } from '../src/features/guide/benchLines'
import { ROOM_LINES } from '../src/features/guide/roomGuideSteps'
import { TOUR_LINES } from '../src/features/guide/Tour'

const VOICE = process.env.VOICE || 'Thái Sơn'
const KEEB_VOICE = process.env.KEEB_VOICE || 'Trúc Ly'
const PY = process.env.VIENEU_PY || 'D:/tools-vieneu/.venv/Scripts/python.exe'
const OUT = 'public/audio/voice'
const MANIFEST = 'src/data/generated/voice.json'

/** chữ máy đọc sai / ký hiệu: thay bằng cách đọc (chỉ lúc sinh giọng, chữ trên màn hình giữ nguyên) */
const SPEAK: [RegExp, string][] = [
  [/7\.500k/g, 'bảy triệu rưỡi'],
  [/(\d+)k\b/g, '$1 nghìn'],
  [/QuýB/g, 'Quý Bê'],
  [/QMK/g, 'Quy em ca'],
  [/\s*→\s*/g, ', '],
  [/\s=\s/g, ' là '],
  [/\s\+\s/g, ' và '],
  [/\+(?=\d)/g, 'cộng '],
  [/\s\/\s/g, ', '],
  [/\bvd\b/g, 'ví dụ'],
  // emoji
  [/\p{Extended_Pictographic}|\u{FE0F}/gu, ''],
]
const spoken = (text: string) =>
  SPEAK.reduce((s, [from, to]) => s.replace(from, to), text)
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Thẻ cảm xúc của VieNeu-TTS (chỉ trong câu đọc, chữ trên màn hình không có): lời tự ngẫm buồn thêm tiếng thở dài đầu câu,
 * Keeb-chan cười sau câu cảm thán đầu. Thẻ `[cười]` đứng đầu câu không ăn (đã thử), phải nằm giữa / cuối câu
 */
const SIGH = new Set([
  TIPS.bench,
  TIPS.calendar,
  QMK_STORY[0],
  QMK_STORY[3],
  QMK_STORY[5],
  QMK_STORY[6],
])
/** câu Keeb-chan bắt đầu bằng mấy chữ này thì cười sau dấu ! đầu tiên */
const LAUGH = [
  'Chào! Mình là',
  'Tên hay đó!',
  'Đủ đồ rồi!',
  'Đủ món rồi!',
  'Xong rồi!',
  'Thu tiền xong rồi!',
  'Đóng gói xong!',
]
const emote = (text: string, say: string) =>
  SIGH.has(text)
    ? `[thở dài] ${say}`
    : LAUGH.some((head) => say.startsWith(head))
      ? say.replace('!', '! [cười]')
      : say

/** câu → { giọng, câu đọc }; `say` = đọc khác chữ hiện (câu chốt màn chào: chữ hiện có tên xưởng đứng trước) */
const want = new Map<string, { voice: string; say: string }>()
const add = (voice: string, lines: string[], say?: (text: string) => string) => {
  for (const text of lines)
    if (!want.has(text)) want.set(text, { voice, say: emote(text, spoken(say ? say(text) : text)) })
}
add(VOICE, [...Object.values(TIPS), ...PC_LINE, ...QMK_STORY])
add(KEEB_VOICE, [...GREET, ...TOUR_LINES, ...BENCH_LINES, ...Object.values(ROOM_LINES)])
add(KEEB_VOICE, Object.values(GREET_END), (text) => `Tên hay đó! ${text}`)

const jobs = [...want].map(([text, { voice, say }]) => ({
  text,
  voice,
  speak: say,
  // tên file theo giọng + câu đọc: đổi câu / đổi giọng thì ra file mới
  file: `v-${createHash('sha1').update(`${voice}|${say}`).digest('hex').slice(0, 10)}.mp3`,
}))

mkdirSync(OUT, { recursive: true })
if (process.env.FORCE) for (const j of jobs) rmSync(join(OUT, j.file), { force: true })
const list = join(tmpdir(), 'sbk-voice-jobs.json')
const result = join(tmpdir(), 'sbk-voice-result.json')
writeFileSync(list, JSON.stringify({ out: OUT, result, jobs }))
const run = spawnSync(PY, ['scripts/gen-voice.py', list], {
  stdio: 'inherit',
  env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
})
if (run.status !== 0) {
  if (run.error) console.error(`Không chạy được Python "${PY}" (đặt VIENEU_PY, xem .env.example)`)
  process.exit(run.status ?? 1)
}

const durs: Record<string, number> = await Bun.file(result).json()
const manifest: Record<string, { file: string; dur: number }> = {}
for (const j of jobs)
  if (existsSync(join(OUT, j.file))) manifest[j.text] = { file: j.file, dur: durs[j.file] }
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
// dọn file của câu / giọng cũ
const keep = new Set(jobs.map((j) => j.file))
for (const f of readdirSync(OUT)) if (f.endsWith('.mp3') && !keep.has(f)) rmSync(join(OUT, f))
console.log(
  `${Object.keys(manifest).length} / ${jobs.length} câu (người chơi "${VOICE}", Keeb-chan "${KEEB_VOICE}") → ${OUT}`,
)
