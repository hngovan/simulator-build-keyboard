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
  NotifyItem,
  Parcel,
  Spare,
  StepId,
} from '@/types'
import type { HistoryEntry } from './buildSlice'
import { buildContext, remapStepIdx } from '@/data/steps'
import { CASES, SCREW_FULL } from '@/data/parts'
import type { Listing, Stolen } from '@/data/selling'

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
  /** tua vít đang chọn dùng (bậc trong TOOLS.screw); null = loại xịn nhất đã mua */
  screwPick: number | null
  /** màu khay đựng ốc (`TRAY_COLORS`), bấm khay trên bàn để đổi */
  trayColor: string
  /** hình nền desktop KeebOS (`WALLPAPERS`), đổi ở Cài đặt */
  wallpaper: string
  /** phiên bản dữ liệu lưu, để nâng cấp bản lưu cũ */
  rev: number
  /** số lần đã dùng dụng cụ có độ bền (mỏ hàn, bùi nhùi); đủ ToolDef.life thì hỏng */
  wear: Partial<Record<ToolKind, number>>
  /** đánh giá khách để lại (mới nhất ở cuối, giữ tối đa REVIEW_KEEP) */
  reviews: Review[]
  /** switch / stab dư từ đơn trước, dùng cho đơn sau */
  spare: Spare
  /** bị ban khỏi chợ Hội Phím Cơ tới trước ngày này (đi ăn xin, gỡ bài quá nhiều, bán hàng lỗi bị tố) */
  marketBanUntil: number
  /** lý do bị ban gần nhất (hiện ở chợ); bản lưu cũ không có = đi ăn xin */
  marketBanWhy: string
  /** số lần gỡ bài đăng bán trong ngày (quá UNLIST_FREE thì bị ban) */
  unlists: { day: number; n: number }
  /** mã lượt chơi (gửi bảng xếp hạng server, 1 lượt 1 dòng); bản lưu cũ: rỗng */
  runId: string
  /** dấu tiến trình (`runSig`) lần cuối đã ghi lên bảng xếp hạng; khác hiện tại = chưa lưu bản mới */
  lbSynced: string
  /** bài shop tự đăng bán ở Hội Phím Cơ */
  listings: Listing[]
  /** vụ bán phím của khách bị lộ (chuộc lại được trong vài ngày) */
  stolen: Stolen[]
  /** NPC hướng dẫn: mẹo đã bấm "Hiểu rồi" */
  guideSeen: string[]
  /** ẩn NPC Keeb-chan (máy tính + bàn build), bật / tắt ở Cài đặt */
  guideHidden: boolean
  /** thông báo đã nhận (mới nhất trước, giữ tối đa INBOX_KEEP), xem lại / xoá ở chuông góc phải */
  inbox: NotifyItem[]
  /** số thông báo chưa xem (mở chuông thì về 0) */
  unread: number
  /** kiện hàng Shopii đã đặt chưa nhận (đang giao / đã tới cửa); bản lưu cũ không có = [] */
  parcels: Parcel[]
  /** món đang sale đã mua trong ngày sale (mỗi món sale chỉ mua 1 lần); bản lưu cũ không có */
  saleBought: { day: number; ids: string[] }
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
  /** số đơn nhận hôm nay + id đơn đã làm hôm nay (luật qua ngày); bản lưu cũ không có */
  acceptedToday?: number
  worked?: string[]
  /** tiền / uy tín đầu ngày (tổng kết ngày); bản lưu cũ không có */
  dayStart?: { money: number; rep: number } | null
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
// 6: thêm bước tuỳ chọn lót foam PCB trước bước plate → dời stepIdx theo tên bước (addFoamStep)
// 7: tiến độ vít tính theo tua vít tay (SCREW_FULL); bản cũ dùng tua vít điện (1 click = xong) → vít ≥ 1 thành đầy (fillScrews)
const SAVE_REV = 7

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
  // bản cũ này chưa có bước foam (rev 6)
  const at = ctx.steps.filter((s) => s !== 'foam').indexOf('feet')
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
  // bản cũ này chưa có bước foam (rev 6)
  const steps: StepId[] = buildContext(order, sess.inventory, sess.mount).steps.filter(
    (s) => s !== 'foam',
  )
  const old: StepId[] = steps.filter((s) => s !== 'ring')
  old.splice(old.indexOf('plate'), 0, 'ring')
  const cur = old[b.stepIdx]
  // đang ở bước gá vòng cũ (chưa đặt plate): làm tiếp từ bước plate, vòng gá sau
  const stepIdx = cur === 'ring' ? steps.indexOf('plate') : steps.indexOf(cur)
  if (stepIdx < 0 || stepIdx === b.stepIdx) return sess
  return { ...sess, build: { ...b, stepIdx }, history: [] }
}

/** Build làm dở từ bản cũ (chưa có bước `foam`): tìm lại đúng bước đang làm trong danh sách mới */
function addFoamStep<S extends Pick<JobSession, 'inventory' | 'mount' | 'build' | 'history'>>(
  order: Order | null | undefined,
  sess: S,
): S {
  const b = sess.build
  if (!order || !b || !sess.mount || !sess.inventory.case || !sess.inventory.pcb) return sess
  const steps = buildContext(order, sess.inventory, sess.mount).steps
  const cur = steps.filter((s) => s !== 'foam')[b.stepIdx]
  const stepIdx = steps.indexOf(cur)
  if (stepIdx < 0 || stepIdx === b.stepIdx) return sess
  return { ...sess, build: { ...b, stepIdx }, history: [] }
}

/** đơn kit khách gửi case mà khách dặn mount case không còn làm được (dữ liệu case đổi, vd Blossom → chỉ gasket) */
function fixOrderMount(order: Order): Order {
  const c = order.kit?.case && CASES[order.kit.case.id]
  return c && order.mount && !c.mounts.includes(order.mount)
    ? { ...order, mount: c.mounts[0] }
    : order
}

/**
 * Mount đã chọn mà case không còn làm được (dữ liệu case đổi: Blossom / Catto HHKB thành 2 mảnh chỉ gasket) → đổi sang mount
 * hợp lệ, build làm dở tìm lại bước (`remapStepIdx`). Chạy mọi lần nạp save (không theo rev: dữ liệu case đổi lúc nào cũng được)
 */
function fixMount<S extends Pick<JobSession, 'inventory' | 'mount' | 'build' | 'history'>>(
  order: Order | null | undefined,
  sess: S,
): S {
  const c = sess.inventory.case && CASES[sess.inventory.case.id]
  if (!order || !c || !sess.mount || c.mounts.includes(sess.mount)) return sess
  const mount = order.mount && c.mounts.includes(order.mount) ? order.mount : c.mounts[0]
  const b = sess.build
  if (!b || !sess.inventory.pcb) return { ...sess, mount }
  const old = buildContext(order, sess.inventory, sess.mount).steps
  const steps = buildContext(order, sess.inventory, mount).steps
  return {
    ...sess,
    mount,
    build: { ...b, stepIdx: remapStepIdx(old, steps, b.stepIdx) },
    history: [],
  }
}

/** Bản cũ có tua vít điện: vít đã vặn (≥ 1 click) là xong → đổi sang mức đầy SCREW_FULL; lịch sử hoàn tác bỏ đi */
function fillScrews<S extends Pick<JobSession, 'build' | 'history'>>(sess: S): S {
  const b = sess.build
  if (!b) return sess
  const screws = Object.fromEntries(
    Object.entries(b.screws).map(([id, n]) => [id, n >= 1 ? SCREW_FULL : n]),
  )
  return { ...sess, build: { ...b, screws }, history: [] }
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
    screwTray: 0,
    tipCleaner: 0,
    cert: 0,
    clipper: 0,
    brush: 0,
    opener: 0,
  },
  screwBit: 'phillips',
  screwPick: null,
  trayColor: 'silver',
  wallpaper: 'aurora',
  rev: SAVE_REV,
  wear: {},
  solderOwned: {},
  reviews: [],
  spare: { switches: {}, stabs: {}, items: [] },
  marketBanUntil: 0,
  marketBanWhy: '',
  unlists: { day: 0, n: 0 },
  runId: '',
  lbSynced: '',
  listings: [],
  stolen: [],
  guideSeen: [],
  guideHidden: false,
  inbox: [],
  unread: 0,
  parcels: [],
  saleBought: { day: 0, ids: [] },
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
    if ((save.rev ?? 0) < 6 && session) {
      session = {
        ...addFoamStep(session.order, { ...session, history: session.history ?? [] }),
        jobs: session.jobs?.map((j) => ({ ...j, session: addFoamStep(j.order, j.session) })),
      }
    }
    if ((save.rev ?? 0) < 7 && session && tools.screw > 0) {
      session = {
        ...fillScrews({ ...session, history: session.history ?? [] }),
        jobs: session.jobs?.map((j) => ({ ...j, session: fillScrews(j.session) })),
      }
    }
    if (session) {
      const order = session.order && fixOrderMount(session.order)
      session = {
        ...fixMount(order, { ...session, order, history: session.history ?? [] }),
        offers: session.offers?.map(fixOrderMount),
        jobs: session.jobs?.map((j) => {
          const o = fixOrderMount(j.order)
          return { order: o, session: fixMount(o, j.session) }
        }),
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
