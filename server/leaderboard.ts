// Server bảng xếp hạng: lưu kết quả mỗi lượt chơi (thua / phá sản / chơi mới) vào file JSON.
// Chạy: `bun run server` (cổng LEADERBOARD_PORT, mặc định 8787). Khi dev, Vite proxy `/api` về đây.
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const PORT = Number(process.env.LEADERBOARD_PORT ?? 8787)
const FILE = process.env.LEADERBOARD_FILE ?? join(import.meta.dir, 'data', 'leaderboard.json')
/** số lượt trả về mỗi lần xem bảng */
const TOP = 50
/** số lượt giữ trong file (bỏ bớt lượt ít tiền nhất) */
const KEEP = 5000

const REASONS = ['rep', 'money', 'bankrupt', 'newgame'] as const
const KEYS = ['rep', 'done', 'money', 'stars', 'day'] as const

interface Run {
  runId: string
  name: string
  reason: (typeof REASONS)[number]
  day: number
  done: number
  money: number
  rep: number
  stars: number
  version: string
  at: number
}

let runs: Run[] = []
try {
  runs = (await Bun.file(FILE).json()) as Run[]
} catch {
  // chưa có file: bảng trống
}

// ghi file tuần tự để 2 request cùng lúc không đè nhau
let writing = Promise.resolve()
function persist() {
  writing = writing.then(async () => {
    await mkdir(dirname(FILE), { recursive: true })
    await Bun.write(FILE, JSON.stringify(runs))
  })
  return writing
}

const num = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : null

/** kiểm tra dữ liệu client gửi lên, sai thì trả null */
function parseRun(body: unknown): Run | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const runId = typeof b.runId === 'string' ? b.runId.slice(0, 64) : ''
  const name = typeof b.name === 'string' ? b.name.trim().slice(0, 24) : ''
  const reason = REASONS.find((r) => r === b.reason)
  const day = num(b.day, 1, 1e5)
  const done = num(b.done, 0, 1e6)
  const money = num(b.money, -1e9, 1e9)
  const rep = num(b.rep, -1e6, 1e6)
  const stars = num(b.stars, 0, 5)
  if (!runId || !name || !reason || day === null || done === null) return null
  if (money === null || rep === null || stars === null) return null
  const version = typeof b.version === 'string' ? b.version.slice(0, 16) : ''
  return {
    runId,
    name,
    reason,
    day: Math.round(day),
    done: Math.round(done),
    money: Math.round(money),
    rep: Math.round(rep),
    stars,
    version,
    at: Date.now(),
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: CORS })

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
    if (url.pathname !== '/api/leaderboard') return json({ error: 'not found' }, 404)

    if (req.method === 'GET') {
      const key = KEYS.find((k) => k === url.searchParams.get('key')) ?? 'money'
      const sorted = [...runs].sort((a, b) => b[key] - a[key] || a.at - b.at)
      return json({ total: runs.length, runs: sorted.slice(0, TOP) })
    }

    if (req.method === 'POST') {
      const run = parseRun(await req.json().catch(() => null))
      if (!run) return json({ error: 'bad run' }, 400)
      // 1 lượt chơi chỉ giữ 1 dòng (gửi lại thì ghi đè)
      runs = [...runs.filter((r) => r.runId !== run.runId), run]
      if (runs.length > KEEP) runs = runs.sort((a, b) => b.money - a.money).slice(0, KEEP)
      await persist()
      const rank = [...runs]
        .sort((a, b) => b.money - a.money)
        .findIndex((r) => r.runId === run.runId)
      return json({ ok: true, rank: rank + 1, total: runs.length })
    }

    return json({ error: 'method not allowed' }, 405)
  },
})

console.log(`Bảng xếp hạng chạy ở http://localhost:${PORT}/api/leaderboard (lưu: ${FILE})`)
