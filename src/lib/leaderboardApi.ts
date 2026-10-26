// Gửi / lấy bảng xếp hạng ở server (`server/leaderboard.ts`).
// Gửi lỗi (mất mạng, server tắt) thì cất vào hàng chờ, lần mở bảng xếp hạng sau gửi lại.

export type RunEndReason = 'rep' | 'money' | 'bankrupt' | 'newgame'
/** lý do ghi bảng xếp hạng: kết thúc lượt, hoặc 'save' = lưu tiến trình khi đang chơi */
export type RunReason = RunEndReason | 'save'
import type { RankKey } from '../../server/leaderboardCore'
export type ServerRankKey = RankKey
export { runScore } from '../../server/leaderboardCore'

export interface RunEntry {
  runId: string
  name: string
  reason: RunReason
  day: number
  done: number
  money: number
  rep: number
  stars: number
  version: string
}
export interface ServerRun extends RunEntry {
  at: number
}

const API = (import.meta.env.VITE_LEADERBOARD_URL as string | undefined) ?? '/api'
const PENDING_KEY = 'sbk-lb-pending'

function readPending(): RunEntry[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]') as RunEntry[]
  } catch {
    return []
  }
}
function writePending(list: RunEntry[]) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-20)))
  } catch {
    // storage bị chặn: bỏ qua
  }
}

async function post(entry: RunEntry) {
  const res = await fetch(`${API}/leaderboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as { rank: number; total: number }
}

/** gửi kết quả 1 lượt chơi; trả hạng theo điểm tổng, lỗi thì cất hàng chờ và trả null */
export async function submitRun(entry: RunEntry) {
  try {
    return await post(entry)
  } catch {
    writePending([...readPending().filter((e) => e.runId !== entry.runId), entry])
    return null
  }
}

/** gửi lúc đóng tab (trình duyệt vẫn gửi nốt dù trang đã tắt); không gửi được thì cất hàng chờ */
export function beaconRun(entry: RunEntry) {
  const ok =
    typeof navigator.sendBeacon === 'function' &&
    navigator.sendBeacon(
      `${API}/leaderboard`,
      new Blob([JSON.stringify(entry)], { type: 'application/json' }),
    )
  if (!ok) writePending([...readPending().filter((e) => e.runId !== entry.runId), entry])
}

/** gửi lại các lượt chưa gửi được */
export async function flushPending() {
  const list = readPending()
  if (!list.length) return
  const left: RunEntry[] = []
  for (const e of list) await post(e).catch(() => left.push(e))
  writePending(left)
}

export async function fetchBoard(key: ServerRankKey) {
  const res = await fetch(`${API}/leaderboard?key=${key}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as { total: number; runs: ServerRun[] }
}
