// Server bảng xếp hạng chạy local: lưu kết quả mỗi lượt chơi (thua / phá sản / chơi mới) vào file JSON.
// Chạy: `bun run server` (cổng LEADERBOARD_PORT, mặc định 8787). Khi dev, Vite proxy `/api` về đây.
// Bản deploy Vercel dùng `api/leaderboard.ts` (Upstash Redis), cùng API.
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import {
  KEEP,
  TOP,
  json,
  parseRun,
  preflight,
  rankKey,
  sortRuns,
  type Run,
} from './leaderboardCore'

const PORT = Number(process.env.LEADERBOARD_PORT ?? 8787)
const FILE = process.env.LEADERBOARD_FILE ?? join(import.meta.dir, 'data', 'leaderboard.json')

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

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)
    if (req.method === 'OPTIONS') return preflight()
    if (url.pathname !== '/api/leaderboard') return json({ error: 'not found' }, 404)

    if (req.method === 'GET') {
      const sorted = sortRuns(runs, rankKey(url.searchParams.get('key')))
      return json({ total: runs.length, runs: sorted.slice(0, TOP) })
    }

    if (req.method === 'POST') {
      const run = parseRun(await req.json().catch(() => null))
      if (!run) return json({ error: 'bad run' }, 400)
      // 1 lượt chơi chỉ giữ 1 dòng (gửi lại thì ghi đè)
      runs = [...runs.filter((r) => r.runId !== run.runId), run]
      if (runs.length > KEEP) runs = sortRuns(runs, 'money').slice(0, KEEP)
      await persist()
      const rank = sortRuns(runs, 'money').findIndex((r) => r.runId === run.runId)
      return json({ ok: true, rank: rank + 1, total: runs.length })
    }

    return json({ error: 'method not allowed' }, 405)
  },
})

console.log(`Bảng xếp hạng chạy ở http://localhost:${PORT}/api/leaderboard (lưu: ${FILE})`)
