// Thua game / kết thúc lượt chơi: uy tín quá thấp, hết tiền nhận đơn, tự phá sản (hoặc chơi mới đè bản lưu)
import type { Order, Review } from '@/types'
import type { RunEndReason, RunEntry, RunReason } from '@/lib/leaderboardApi'
import { estimateCost } from './orders'

/** uy tín từ mức này trở xuống thì thua (bị phốt quá nhiều) */
export const LOSE_REP = -10

export const END_TEXT: Record<RunEndReason, { title: string; text: string }> = {
  rep: {
    title: '💀 Shop sập vì phốt',
    text: 'Bạn đã bị phốt quá nhiều vì uy tín quá thấp, không còn khách nào dám gửi phím nữa.',
  },
  money: {
    title: '💸 Cạn vốn',
    text: 'Bạn không còn đủ tiền để nhận đơn: ví không đủ mua linh kiện cho đơn rẻ nhất hôm nay.',
  },
  bankrupt: {
    title: '🏳️ Tuyên bố phá sản',
    text: 'Bạn đã treo bảng nghỉ bán. Xưởng phím đóng cửa từ hôm nay.',
  },
  newgame: { title: 'Chơi lại từ đầu', text: 'Lượt chơi cũ đã được ghi lên bảng xếp hạng.' },
}

/** tiền linh kiện ước tính của đơn rẻ nhất (khách hoàn lại sau khi giao, nhưng phải ứng trước) */
export const cheapestOfferCost = (offers: Order[]) =>
  Math.min(...offers.map((o) => estimateCost(o.layout, o.kit, o.keycapKit, o.switchType, o)))

interface LossState {
  rep: number
  money: number
  offers: Order[]
  order: Order | null
  jobs: unknown[]
  packed: { shipped?: boolean }[]
}

/** lý do thua (null = vẫn chơi tiếp được) */
export function lossReason(s: LossState): RunEndReason | null {
  if (s.rep <= LOSE_REP) return 'rep'
  // còn đơn đang làm / đơn chờ gửi (sắp có tiền) thì chưa tính; hết đơn chào thì chờ qua ngày
  const idle = !s.order && !s.jobs.length && !s.packed.some((p) => !p.shipped)
  if (idle && s.offers.length && s.money < cheapestOfferCost(s.offers)) return 'money'
  return null
}

export const newRunId = () =>
  `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

interface RunProfile {
  runId?: string
  name: string
  day: number
  done: number
  money: number
  rep: number
  reviews: Review[]
}

/** kết quả 1 lượt chơi để gửi bảng xếp hạng */
/** dấu tiến trình: đổi thì bảng xếp hạng chưa có bản mới nhất (dùng cho nút Lưu / hỏi khi thoát) */
export const runSig = (p: Pick<RunProfile, 'day' | 'done' | 'money' | 'rep'>) =>
  `${p.day}|${p.done}|${p.money}|${p.rep}`

export function runEntry(p: RunProfile, reason: RunReason): RunEntry {
  const shipped = p.reviews.filter((r) => r.kind === 'ship')
  return {
    runId: p.runId || newRunId(),
    name: p.name,
    reason,
    day: p.day,
    done: p.done,
    money: p.money,
    rep: p.rep,
    stars: shipped.length ? shipped.reduce((a, r) => a + r.stars, 0) / shipped.length : 0,
    version: __APP_VERSION__,
  }
}
