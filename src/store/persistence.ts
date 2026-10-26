import type {
  ScrewBit,
  ToolKind,
  BuildState,
  AudioSettings,
  DeliveryResult,
  GroupPost,
  Inventory,
  Order,
  PartCategory,
  ToolLevels,
  Review,
  Spare,
  StepId,
} from '@/types'
import type { HistoryEntry } from './buildSlice'
import { buildContext } from '@/data/steps'

const SAVE_KEY = 'sbk-save-v3'

// Tiến trình lâu dài của người chơi
export interface Profile {
  name: string
  money: number
  rep: number
  day: number
  done: number
  tools: ToolLevels
  /** Owned soldering irons: level -> used durability. */
  solderOwned: Record<number, number>
  supplies: Record<string, number>
  audio: AudioSettings
  /** đầu vít đang lắp trên tua vít (giữ nguyên khi thoát vào lại) */
  screwBit: ScrewBit
  /** phiên bản dữ liệu lưu, để nâng cấp bản lưu cũ */
  rev: number
  /** số lần đã dùng dụng cụ có độ bền (mỏ hàn, bùi nhùi); đủ ToolDef.life thì hỏng */
  wear: Partial<Record<ToolKind, number>>
  /** đánh giá khách để lại (mới nhất ở cuối, giữ tối đa REVIEW_KEEP) */
  reviews: Review[]
  /** switch / stab dư từ đơn trước, dùng cho đơn sau */
  spare: Spare
  /** bị ban khỏi chợ Hội Phím Cơ tới trước ngày này (đi ăn xin) */
  marketBanUntil: number
  /** mã lượt chơi (gửi bảng xếp hạng server, 1 lượt 1 dòng); bản lưu cũ: rỗng */
  runId: string
}

// Đơn đang làm dở (lưu lại để thoát game vào lại vẫn tiếp tục được)
/** Đơn đã nhận nhưng chưa làm tới: cất riêng kho đồ + tiến độ build của đơn */
export interface JobSession {
  inventory: Inventory
  provided: Partial<Record<PartCategory, true>>
  spent: number
  posts: GroupPost[]
  mount: string | null
  build: BuildState | null
  history: HistoryEntry[]
  supplyUsed: Record<string, number>
}
export interface Job {
  order: Order
  session: JobSession
}

interface Session {
  /** đơn mới trong ngày (chưa nhận) */
  offers?: Order[]
  /** bản lưu cũ: chỉ có 1 đơn chào */
  offer?: Order | null
  /** đơn đã nhận, đang chờ làm */
  jobs?: Job[]
  order: Order | null
  inventory: Inventory
  provided: Partial<Record<PartCategory, true>>
  spent: number
  posts: GroupPost[]
  mount: string | null
  result: DeliveryResult | null
  /** đơn đã đóng gói trong ngày, chờ "Kết thúc ngày" mới gửi (bản lưu cũ: không có) */
  packed?: PackedOrder[]
  build: BuildState | null
  /** lịch sử hoàn tác (đã rút gọn) + vật tư đã dùng, để tải lại trang vẫn quay lại được */
  history?: HistoryEntry[]
  supplyUsed?: Record<string, number>
  /** đơn đã từ chối hôm nay (vẫn hiện hội thoại ở Mezzenger; quá DECLINE_FREE đơn thì trừ uy tín) */
  rejected?: Order[]
}

/** 1 đơn đã đóng gói: kết quả chấm sẵn, tiền / uy tín cộng khi gửi cho khách (hoặc kết thúc ngày) */
export interface PackedOrder {
  order: Order
  result: DeliveryResult
  /** đã gửi cho khách trong ngày (giữ lại để hiện tin nhắn khách phản hồi tới hết ngày) */
  shipped?: boolean
}

export interface SaveData extends Profile {
  session?: Session
  savedAt?: number
}

/**
 * 1: thêm bậc "Chưa có mỏ hàn" ở đầu dụng cụ hàn (bản cũ bậc 0 = mỏ hàn 60W miễn phí → dời lên 1)
 */
// 2: bỏ jig / bàn ép switch + keycap (thay bằng chứng chỉ thợ), bàn mở 25 ô, gộp cọ lube còn 1 loại
// 3: băng Urgo đếm theo miếng (1 miếng = 2 stab) thay vì theo stab
// 4: thêm bước dán feet trước khi lắp case → build đang làm đã qua chỗ đó thì dời bước (addFeetStep)
// 5: O-ring mount gá vòng sau lắp switch / hàn (trước đây trước bước plate) → dời stepIdx theo tên bước (moveRingStep)
const SAVE_REV = 5

/**
 * Build làm dở từ bản cũ (chưa có bước `feet`): đã tới / qua chỗ chèn bước thì dời stepIdx lên 1 và coi như
 * đã dán đủ feet đen; lịch sử hoàn tác cũ bỏ đi (stepIdx trong đó lệch)
 */
function addFeetStep<S extends Pick<JobSession, 'inventory' | 'mount' | 'build' | 'history'>>(
  order: Order | null | undefined,
  sess: S,
): S {
  const b = sess.build
  if (!order || !b || !sess.mount || !sess.inventory.case || !sess.inventory.pcb) return sess
  const ctx = buildContext(order, sess.inventory, sess.mount)
  const at = ctx.steps.indexOf('feet')
  if (at < 0 || b.stepIdx < at || b.feet) return sess
  const feet = Object.fromEntries(ctx.feet.map((_, i) => [i, 'feetBlack']))
  return { ...sess, build: { ...b, stepIdx: b.stepIdx + 1, feet }, history: [] }
}

/** Build O-ring làm dở từ bản cũ: bước `ring` nằm trước `plate` → tìm lại đúng bước đang làm trong danh sách mới */
function moveRingStep<S extends Pick<JobSession, 'inventory' | 'mount' | 'build' | 'history'>>(
  order: Order | null | undefined,
  sess: S,
): S {
  const b = sess.build
  if (!order || !b || sess.mount !== 'oring' || !sess.inventory.case || !sess.inventory.pcb)
    return sess
  const steps = buildContext(order, sess.inventory, sess.mount).steps
  const old: StepId[] = steps.filter((s) => s !== 'ring')
  old.splice(old.indexOf('plate'), 0, 'ring')
  const cur = old[b.stepIdx]
  // đang ở bước gá vòng cũ (chưa đặt plate): làm tiếp từ bước plate, vòng gá sau
  const stepIdx = cur === 'ring' ? steps.indexOf('plate') : steps.indexOf(cur)
  if (stepIdx < 0 || stepIdx === b.stepIdx) return sess
  return { ...sess, build: { ...b, stepIdx }, history: [] }
}

export const START: Profile = {
  name: '',
  // = đơn ngày 1 đắt nhất (ngân sách linh kiện tối đa 6.100k, ứng trước, giao xong mới hoàn)
  //   + dụng cụ bắt buộc 605k (bút hàn 90, bùi nhùi 35, bút rã hàn 150, kìm cắt 120, cọ lube 60, đồ mở switch 150)
  //   + vật tư 235k (thiếc Sakura 90, Krytox 205g0 120, Urgo 25) = 6.940k, dư ~8% phòng mua hớ / bị lừa
  money: 7500,
  rep: 0,
  day: 1,
  done: 0,
  supplies: {},
  audio: { muted: false, musicVolume: 0.45, effectsVolume: 0.7 },
  tools: {
    switch: 0,
    keycap: 0,
    screw: 0,
    solder: 0,
    desolder: 0,
    spoolHolder: 0,
    tipCleaner: 0,
    cert: 0,
    clipper: 0,
    brush: 0,
    opener: 0,
  },
  screwBit: 'phillips',
  rev: SAVE_REV,
  wear: {},
  solderOwned: {},
  reviews: [],
  spare: { switches: {}, stabs: {}, items: [] },
  marketBanUntil: 0,
  runId: '',
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const save = JSON.parse(raw) as Partial<SaveData>
    // bản lưu cũ có thể thiếu dụng cụ / vật tư mới
    const tools = { ...START.tools, ...save.tools }
    if ((save.rev ?? 0) < 1) tools.solder += 1
    if ((save.rev ?? 0) < 2) {
      tools.switch = 0
      tools.keycap = 0
      tools.opener = Math.min(tools.opener, 1)
      tools.brush = Math.min(tools.brush, 1)
    }
    const supplies = { ...(save.supplies ?? {}) }
    if ((save.rev ?? 0) < 3 && supplies.urgo) supplies.urgo = Math.ceil(supplies.urgo / 2)
    let session = save.session
    if ((save.rev ?? 0) < 4 && session) {
      session = {
        ...addFeetStep(session.order, { ...session, history: session.history ?? [] }),
        jobs: session.jobs?.map((j) => ({ ...j, session: addFeetStep(j.order, j.session) })),
      }
    }
    if ((save.rev ?? 0) < 5 && session) {
      session = {
        ...moveRingStep(session.order, { ...session, history: session.history ?? [] }),
        jobs: session.jobs?.map((j) => ({ ...j, session: moveRingStep(j.order, j.session) })),
      }
    }
    return {
      ...START,
      ...save,
      session,
      rev: SAVE_REV,
      wear: save.wear ?? {},
      tools,
      solderOwned: {
        ...save.solderOwned,
        ...(tools.solder > 0 ? { [tools.solder]: save.wear?.solder ?? 0 } : {}),
      },
      supplies,
      audio: { ...START.audio, ...save.audio },
      spare: { ...START.spare, ...save.spare },
    }
  } catch {
    return null
  }
}

/** xoá bản lưu (thua game / phá sản) */
export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // storage bị chặn: bỏ qua
  }
}

export function writeSave(data: SaveData) {
  const put = (d: SaveData) =>
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...d, savedAt: Date.now() }))
  try {
    put(data)
  } catch {
    // quá dung lượng: vẫn lưu tiến trình, chỉ bỏ lịch sử hoàn tác
    try {
      put({ ...data, session: data.session && { ...data.session, history: [] } })
    } catch {
      // trình duyệt chặn storage: bỏ qua, game vẫn chạy
    }
  }
}
