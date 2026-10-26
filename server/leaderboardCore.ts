// Phần dùng chung của bảng xếp hạng: server Bun (`server/leaderboard.ts`, chạy dev) và
// Vercel Function (`api/leaderboard.ts`, lưu Upstash Redis). Chỉ dùng API web chuẩn, không Bun / Node.

/** số lượt trả về mỗi lần xem bảng */
export const TOP = 50
/** số lượt giữ lại (bỏ bớt lượt điểm tổng thấp nhất) */
export const KEEP = 5000

/** save = người chơi tự lưu tiến trình giữa chừng (lượt vẫn đang chơi) */
export const REASONS = ['rep', 'money', 'bankrupt', 'newgame', 'save'] as const
/** score = điểm tổng hợp (`runScore`), các khoá còn lại là trường của lượt chơi */
export const KEYS = ['score', 'rep', 'done', 'money', 'stars', 'day'] as const
export type RankKey = (typeof KEYS)[number]

export interface Run {
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

const num = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : null

/** kiểm tra dữ liệu client gửi lên, sai thì trả null */
export function parseRun(body: unknown): Run | null {
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

/** tiền khởi đầu (START.money): chỉ tiền lãi so với vốn ban đầu mới được tính điểm */
export const START_MONEY = 7500

/**
 * Điểm tổng hợp xếp hạng: ưu tiên tiền lãi + uy tín + sao; số ngày không cộng điểm (ngồi chơi qua ngày không lên top).
 * Mỗi 100k lãi 1, mỗi uy tín 20, mỗi sao trung bình 20, mỗi đơn 10 × (sao TB / 5) (đơn làm ẩu ít điểm).
 * Vd 30 đơn 4★ · uy tín 15 · 30.000k ≈ 225 + 300 + 80 + 240 = 845 điểm; 40 ngày không làm gì = 0 điểm
 */
export const runScore = (r: Pick<Run, 'done' | 'rep' | 'money' | 'stars'>) =>
  Math.round(
    (r.money - START_MONEY) / 100 + r.rep * 20 + r.stars * 20 + (r.done * 10 * r.stars) / 5,
  )

/** giá trị xếp hạng của 1 lượt theo khoá */
export const rankValue = (r: Run, key: RankKey) => (key === 'score' ? runScore(r) : r[key])

/** khoá xếp hạng trong query (?key=...), sai thì theo điểm tổng */
export const rankKey = (v: string | null): RankKey => KEYS.find((k) => k === v) ?? 'score'

/** xếp giảm dần theo khoá, bằng nhau thì ai lên bảng trước đứng trước */
export const sortRuns = (runs: Run[], key: RankKey) =>
  [...runs].sort((a, b) => rankValue(b, key) - rankValue(a, key) || a.at - b.at)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
export const json = (data: unknown, status = 200) => Response.json(data, { status, headers: CORS })
export const preflight = () => new Response(null, { headers: CORS })
