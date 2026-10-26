// Vercel Function bảng xếp hạng (`/api/leaderboard`), cùng API với server Bun chạy local (`server/leaderboard.ts`).
// Lưu ở Upstash Redis (Vercel → Storage / Marketplace → Upstash Redis, tự gắn biến môi trường):
//   lb:runs        hash runId → JSON 1 lượt chơi
//   lb:z:<khoá>    sorted set runId theo từng khoá xếp hạng (rep / done / money / stars / day)
// Gọi REST API của Upstash bằng fetch, không cần thư viện.
import {
  KEEP,
  KEYS,
  TOP,
  json,
  parseRun,
  preflight,
  rankKey,
  sortRuns,
  type Run,
} from '../server/leaderboardCore.js'

declare const process: { env: Record<string, string | undefined> }

// tích hợp Upstash trên Vercel đặt KV_REST_API_* (có thể kèm tiền tố tự chọn, vd STORAGE_KV_REST_API_URL);
// tạo database Upstash tay thì là UPSTASH_REDIS_REST_*. Lấy biến đầu tiên khớp đuôi tên
const envEnd = (...ends: string[]) => {
  const name = Object.keys(process.env).find(
    (k) => ends.some((e) => k.endsWith(e)) && process.env[k],
  )
  return name ? process.env[name] : undefined
}
const URL_ = envEnd('KV_REST_API_URL', 'REDIS_REST_URL')
// token chỉ đọc (KV_REST_API_READ_ONLY_TOKEN) không ghi được: không khớp đuôi này
const TOKEN = envEnd('KV_REST_API_TOKEN', 'REDIS_REST_TOKEN')
/** thiếu cấu hình: báo tên các biến liên quan đang có (không lộ giá trị) để dò */
const notConfigured = () =>
  json(
    {
      error: 'chưa cấu hình Upstash Redis',
      env: Object.keys(process.env).filter((k) => /KV|REDIS|UPSTASH/.test(k)),
    },
    503,
  )

const RUNS = 'lb:runs'
const zkey = (k: string) => `lb:z:${k}`

type Cmd = (string | number)[]
/** chạy nhiều lệnh Redis trong 1 request (transaction), trả kết quả từng lệnh */
async function redis(cmds: Cmd[]): Promise<unknown[]> {
  const res = await fetch(`${URL_}/multi-exec`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(cmds),
  })
  if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`)
  const out = (await res.json()) as { result?: unknown; error?: string }[]
  const err = out.find((r) => r.error)
  if (err) throw new Error(err.error)
  return out.map((r) => r.result)
}

const parse = (raw: unknown) => {
  try {
    return typeof raw === 'string' ? (JSON.parse(raw) as Run) : null
  } catch {
    return null
  }
}

async function board(key: ReturnType<typeof rankKey>) {
  const [ids, total] = await redis([
    ['ZRANGE', zkey(key), 0, TOP - 1, 'REV'],
    ['HLEN', RUNS],
  ])
  const list = ids as string[]
  if (!list.length) return { total: Number(total), runs: [] }
  const [raws] = await redis([['HMGET', RUNS, ...list]])
  const runs = (raws as unknown[]).map(parse).filter((r): r is Run => !!r)
  return { total: Number(total), runs: sortRuns(runs, key) }
}

async function submit(run: Run) {
  // 1 lượt chơi chỉ giữ 1 dòng (gửi lại thì ghi đè cả hash lẫn điểm)
  await redis([
    ['HSET', RUNS, run.runId, JSON.stringify(run)],
    ...KEYS.map((k): Cmd => ['ZADD', zkey(k), run[k], run.runId]),
  ])
  // quá KEEP lượt thì bỏ bớt lượt ít tiền nhất
  const [count] = await redis([['ZCARD', zkey('money')]])
  const extra = Number(count) - KEEP
  if (extra > 0) {
    const [drop] = await redis([['ZRANGE', zkey('money'), 0, extra - 1]])
    const ids = drop as string[]
    if (ids.length)
      await redis([['HDEL', RUNS, ...ids], ...KEYS.map((k): Cmd => ['ZREM', zkey(k), ...ids])])
  }
  const [rank, total] = await redis([
    ['ZREVRANK', zkey('money'), run.runId],
    ['HLEN', RUNS],
  ])
  return { ok: true, rank: Number(rank) + 1, total: Number(total) }
}

export async function OPTIONS() {
  return preflight()
}

export async function GET(req: Request) {
  if (!URL_ || !TOKEN) return notConfigured()
  try {
    return json(await board(rankKey(new URL(req.url).searchParams.get('key'))))
  } catch (e) {
    return json({ error: String(e) }, 502)
  }
}

export async function POST(req: Request) {
  if (!URL_ || !TOKEN) return notConfigured()
  const run = parseRun(await req.json().catch(() => null))
  if (!run) return json({ error: 'bad run' }, 400)
  try {
    return json(await submit(run))
  } catch (e) {
    return json({ error: String(e) }, 502)
  }
}
