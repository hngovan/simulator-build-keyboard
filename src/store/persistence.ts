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
} from '@/types'
import type { HistoryEntry } from './buildSlice'

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

export interface Session {
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
const SAVE_REV = 3

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
    return {
      ...START,
      ...save,
      rev: SAVE_REV,
      wear: save.wear ?? {},
      tools,
      solderOwned: {
        ...save.solderOwned,
        ...(tools.solder > 0 ? { [tools.solder]: save.wear?.solder ?? 0 } : {}),
      },
      supplies,
      audio: { ...START.audio, ...save.audio },
    }
  } catch {
    return null
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
