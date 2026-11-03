import { levelFor } from '@/data/unlocks'
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
  CartLine,
  LayoutId,
} from '@/types'
import type { BoxSpot } from '@/data/boxes'
import type { HistoryEntry } from './buildSlice'
import { DTB_MM, buildContext, coverBeforeJst, remapStepIdx, stepProgress } from '@/data/steps'
import { CASES, SCREW_FULL, caseFits } from '@/data/parts'
import { LAYOUTS, getLayout } from '@/data/layouts'
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
  /** cấp xưởng cao nhất đã đạt (data/unlocks.ts, chỉ tăng): mở khoá món Shopii / loại đơn */
  shopLv: number
  /** thông báo đã nhận (mới nhất trước, giữ tối đa INBOX_KEEP), xem lại / xoá ở chuông góc phải */
  inbox: NotifyItem[]
  /** số thông báo chưa xem (mở chuông thì về 0) */
  unread: number
  /** kiện hàng Shopii đã đặt chưa nhận (đang giao / đã tới cửa); bản lưu cũ không có = [] */
  parcels: Parcel[]
  /** món đang sale đã mua trong ngày sale (mỗi món sale chỉ mua 1 lần); bản lưu cũ không có */
  saleBought: { day: number; ids: string[] }
  /** giỏ hàng Shopii (chưa đặt); bản lưu cũ không có = [] */
  cart: CartLine[]
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
  /** thùng hàng trong phòng (carrySlice): ô kệ, thùng trên bàn build, thùng đang cầm; bản lưu cũ không có */
  boxes?: Record<string, BoxSpot>
  benchBox?: string | null
  held?: string | null
}

/** 1 đơn đã đóng gói: kết quả chấm sẵn, tiền / uy tín cộng khi gửi cho khách (hoặc kết thúc ngày) */
export interface PackedOrder {
  order: Order
  result: DeliveryResult
  /** đã gửi cho khách trong ngày (giữ lại để hiện tin nhắn khách phản hồi tới hết ngày) */
  shipped?: boolean
  /**
   * dữ liệu đơn lúc đóng gói (kho đồ, build...): thùng chưa gửi mở ra build lại được (`unpackBox`); gửi khách thì bỏ
   * (switch / stab thừa vào kho chung lúc gửi). Bản lưu cũ không có = không mở lại được
   */
  session?: JobSession
  /** gửi rồi nhưng chưa thu thù lao (vào Mezzenger bấm "Thu tiền"); `false` = chưa thu, không có = đã thu / bản lưu cũ */
  paid?: boolean
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
// 8: thêm bước lắp daughterboard (`dtb`) + cắm dây JST (`jst`) → dời stepIdx theo tên bước, đã qua thì coi như đã lắp (addDtbSteps)
// 9: case dây JST luồn qua tạ (`CaseDef.jstUp`, Duality): đổi thứ tự bước (case trên bắt vào plate trước, lắp tạ trước khi cắm
//    dây) → tìm lại bước đang làm theo tên (reorderJstUp)
const SAVE_REV = 9

/** danh sách bước của bản lưu trước rev 8 (chưa có bước daughterboard) */
const noDtb = (steps: StepId[]) => steps.filter((s) => s !== 'dtb' && s !== 'jst')

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
  const at = noDtb(ctx.steps)
    .filter((s) => s !== 'foam')
    .indexOf('feet')
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
  const steps: StepId[] = noDtb(buildContext(order, sess.inventory, sess.mount).steps).filter(
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
  const steps = noDtb(buildContext(order, sess.inventory, sess.mount).steps)
  const cur = steps.filter((s) => s !== 'foam')[b.stepIdx]
  const stepIdx = steps.indexOf(cur)
  if (stepIdx < 0 || stepIdx === b.stepIdx) return sess
  return { ...sess, build: { ...b, stepIdx }, history: [] }
}

/**
 * Build làm dở từ bản cũ (chưa có bước daughterboard): tìm lại bước đang làm trong danh sách mới; đã qua chỗ chèn bước
 * thì coi như đã lắp DTB (đủ vít, cắm dây) / đã cắm dây vào PCB
 */
function addDtbSteps<S extends Pick<JobSession, 'inventory' | 'mount' | 'build' | 'history'>>(
  order: Order | null | undefined,
  sess: S,
): S {
  const b = sess.build
  if (!order || !b || !sess.mount || !sess.inventory.case || !sess.inventory.pcb) return sess
  const steps = buildContext(order, sess.inventory, sess.mount).steps
  if (!steps.includes('dtb')) return sess
  const cur = noDtb(steps)[b.stepIdx]
  const stepIdx = steps.indexOf(cur)
  if (stepIdx < 0) return sess
  const dtb =
    stepIdx > steps.indexOf('dtb')
      ? {
          placed: true as const,
          screws: Object.fromEntries(DTB_MM.holes.map((_, i) => [i, true as const])),
          plugged: true as const,
        }
      : undefined
  const jst = stepIdx > steps.indexOf('jst') ? (true as const) : undefined
  return { ...sess, build: { ...b, stepIdx, dtb, jst }, history: [] }
}

/**
 * Build làm dở của case `jstUp` từ bản cũ: thứ tự cũ feet → coverOff → dtb → (topCase → topScrew) → jst → coverOn; tìm lại bước
 * đang làm theo tên trong thứ tự mới (bước đã làm mà giờ nằm sau vẫn giữ tiến độ, tới nơi bấm qua)
 */
function reorderJstUp<S extends Pick<JobSession, 'inventory' | 'mount' | 'build' | 'history'>>(
  order: Order | null | undefined,
  sess: S,
): S {
  const b = sess.build
  if (!order || !b || !sess.mount || !sess.inventory.case || !sess.inventory.pcb) return sess
  const ctx = buildContext(order, sess.inventory, sess.mount)
  const steps = ctx.steps
  if (!coverBeforeJst(steps)) return sess
  const moved: StepId[] = ['topCase', 'topScrew', 'coverOff', 'dtb', 'coverOn', 'jst']
  const rest = steps.filter((s) => !moved.includes(s))
  const at = rest.indexOf('feet') + 1
  const top: StepId[] = steps.includes('topCase') ? ['topCase', 'topScrew'] : []
  const old = [
    ...rest.slice(0, at),
    'coverOff',
    'dtb',
    ...top,
    'jst',
    'coverOn',
    ...rest.slice(at),
  ] as StepId[]
  let stepIdx = steps.indexOf(old[b.stepIdx])
  // úp / bắt vít case trên giờ nằm trước mà chưa làm xong (thứ tự cũ làm sau DTB) → quay về làm bước đó trước
  const todo = top.findIndex((st) => {
    const i = steps.indexOf(st)
    const [d, t] = stepProgress(st, b, ctx, SCREW_FULL)
    return i < stepIdx && d < t
  })
  if (todo >= 0) stepIdx = steps.indexOf(top[todo])
  if (stepIdx < 0 || stepIdx === b.stepIdx) return sess
  return { ...sess, build: { ...b, stepIdx }, history: [] }
}

/**
 * Layout mới cùng cỡ mà case khách gửi lắp được, khi case không còn hợp layout của đơn (dữ liệu case đổi: Duality Horns từ case TKL
 * thành chỉ TKL F13 `strict`) → null = đơn vẫn hợp / không có layout thay
 */
function kitLayoutFix(order: Order): LayoutId | null {
  const c = order.kit?.case && CASES[order.kit.case.id]
  if (!c || caseFits(c, order.layout)) return null
  const ff = LAYOUTS[order.layout]?.ff
  return (
    (Object.keys(LAYOUTS) as LayoutId[]).find((l) => LAYOUTS[l].ff === ff && caseFits(c, l)) ?? null
  )
}

/** variant đơn giữ lựa chọn cũ nếu layout mới có, không thì lấy lựa chọn đầu (vd TKL F13 chỉ hàng dưới WKL) */
function fitVariant(layout: LayoutId, old: Order['variant']): Order['variant'] {
  const opts = LAYOUTS[layout].variants as Record<string, string[]>
  const prev = (old ?? {}) as Record<string, string | undefined>
  return Object.fromEntries(
    Object.entries(opts).map(([k, list]) => [
      k,
      prev[k] && list.includes(prev[k]) ? prev[k] : list[0],
    ]),
  ) as Order['variant']
}

/** đổi đơn sang layout mới: layout, variant, PCB / plate khách gửi theo layout */
function relayoutOrder(order: Order, layout: LayoutId): Order {
  const kit = order.kit && {
    ...order.kit,
    ...(order.kit.pcb ? { pcb: { ...order.kit.pcb, layout } } : {}),
    ...(order.kit.plate ? { plate: { ...order.kit.plate, layout } } : {}),
  }
  return { ...order, layout, variant: fitVariant(layout, order.variant), ...(kit ? { kit } : {}) }
}

/** đơn kit case không còn hợp layout (kitLayoutFix): đổi đơn + PCB / plate trong kho sang layout mới */
function fixKitLayoutOrder(order: Order): Order {
  const l = kitLayoutFix(order)
  return l ? relayoutOrder(order, l) : order
}

/**
 * Như trên cho đơn đã nhận: PCB / plate trong kho theo layout cũ đổi theo; build làm dở dời dữ liệu từng phím (switch, keycap, đã test,
 * mối hàn, stab, lỗi test, hoàn hảo) sang id phím mới khớp theo tên phím (id = thứ tự phím: TKL F13 chèn F13 sau F12 nên id sau đó + 1);
 * phím mới (F13) để trống, lắp thêm switch / keycap. Lịch sử hoàn tác bỏ (id cũ)
 */
function fixKitLayout<S extends Pick<JobSession, 'inventory' | 'build' | 'history'>>(
  order: Order | null | undefined,
  sess: S,
): { order: Order | null | undefined; sess: S } {
  const l = order && kitLayoutFix(order)
  if (!order || !l) return { order, sess }
  const next = relayoutOrder(order, l)
  const inv = sess.inventory
  const relay = <T extends { layout: LayoutId } | null | undefined>(it: T) =>
    it && it.layout === order.layout ? { ...it, layout: l } : it
  const inventory = { ...inv, pcb: relay(inv.pcb), plate: relay(inv.plate) }
  const b = sess.build
  if (!b) return { order: next, sess: { ...sess, inventory } }
  // id cũ → id mới theo tên phím (+ lần xuất hiện: 2 phím Del khi backspace tách)
  const seen: Record<string, number> = {}
  const tag = (label: string) => `${label}#${(seen[label] = (seen[label] ?? 0) + 1)}`
  const newIds: Record<string, string> = {}
  for (const k of getLayout(l, next.variant).keys) newIds[tag(k.label)] = k.id
  for (const key of Object.keys(seen)) delete seen[key]
  const idMap: Record<string, string> = {}
  for (const k of getLayout(order.layout, order.variant).keys) {
    const id = newIds[tag(k.label)]
    if (id) idMap[k.id] = id
  }
  const remap = <V>(rec: Record<string, V> | undefined) =>
    rec &&
    Object.fromEntries(
      Object.entries(rec).flatMap(([id, v]) =>
        // khoá không phải id phím (vd id vít trong `perfect`) giữ nguyên
        /^\d+$/.test(id) ? (idMap[id] ? [[idMap[id], v]] : []) : [[id, v]],
      ),
    )
  const build = {
    ...b,
    switches: remap(b.switches)!,
    keycaps: remap(b.keycaps)!,
    tested: remap(b.tested)!,
    solder: remap(b.solder)!,
    stabs: remap(b.stabs)!,
    testFaults: remap(b.testFaults),
    perfect: remap(b.perfect),
  }
  return { order: next, sess: { ...sess, inventory, build, history: [] } }
}

/**
 * Build đã qua bước lắp switch / hàn / lắp keycap mà còn phím trống: đơn thật không qua được các bước đó khi chưa đủ (đơn dev bỏ qua được nên
 * bỏ qua), chỉ xảy ra khi layout đơn bị đổi lúc nạp (`fixKitLayout` thêm phím, vd F13; lịch sử hoàn tác đã xoá nên không quay lại bước cũ
 * được) → lắp nốt: switch lấy từ kho (đủ thì lắp, thiếu thì để trống), hàn sẵn nếu đã qua bước hàn, keycap nếu đã qua bước keycap.
 * Chạy mọi lần nạp
 */
function fillAddedKeys<S extends Pick<JobSession, 'inventory' | 'mount' | 'build'>>(
  order: Order | null | undefined,
  sess: S,
): S {
  const b = sess.build
  if (!order || order.dev || !b || !sess.mount || !sess.inventory.case || !sess.inventory.pcb)
    return sess
  const ctx = buildContext(order, sess.inventory, sess.mount)
  const past = (st: StepId) => {
    const i = ctx.steps.indexOf(st)
    return i >= 0 && b.stepIdx > i
  }
  if (!past('switch')) return sess
  const inv = sess.inventory.switch
  const missing = ctx.keys.filter((k) => !b.switches[k.id]).slice(0, inv?.count ?? 0)
  const switches = { ...b.switches }
  for (const k of missing) switches[k.id] = true
  const solder = { ...b.solder }
  if (past('solder')) for (const k of missing) solder[k.id] ??= true
  const keycaps = { ...b.keycaps }
  if (past('keycap')) for (const k of ctx.keys) if (switches[k.id]) keycaps[k.id] = true
  const changed = missing.length || Object.keys(keycaps).length !== Object.keys(b.keycaps).length
  if (!changed) return sess
  return {
    ...sess,
    inventory: inv
      ? { ...sess.inventory, switch: { ...inv, count: inv.count - missing.length } }
      : sess.inventory,
    build: { ...b, switches, solder, keycaps },
  }
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
  shopLv: 1,
  inbox: [],
  unread: 0,
  parcels: [],
  saleBought: { day: 0, ids: [] },
  cart: [],
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
    if ((save.rev ?? 0) < 8 && session) {
      session = {
        ...addDtbSteps(session.order, { ...session, history: session.history ?? [] }),
        jobs: session.jobs?.map((j) => ({ ...j, session: addDtbSteps(j.order, j.session) })),
        // thùng đã đóng gói chưa gửi mở lại được: build trong đó cũng dời bước
        packed: session.packed?.map((p) =>
          p.session ? { ...p, session: addDtbSteps(p.order, p.session) } : p,
        ),
      }
    }
    if ((save.rev ?? 0) < 9 && session) {
      session = {
        ...reorderJstUp(session.order, { ...session, history: session.history ?? [] }),
        jobs: session.jobs?.map((j) => ({ ...j, session: reorderJstUp(j.order, j.session) })),
        packed: session.packed?.map((p) =>
          p.session ? { ...p, session: reorderJstUp(p.order, p.session) } : p,
        ),
      }
    }
    if (session) {
      // đơn kit có case không còn hợp layout (vd Duality TKL → TKL F13): đổi layout + dời dữ liệu phím của build dở
      const fix = fixKitLayout(session.order, { ...session, history: session.history ?? [] })
      session = {
        ...fix.sess,
        order: fix.order ?? null,
        offers: session.offers?.map(fixKitLayoutOrder),
        jobs: session.jobs?.map((j) => {
          const f = fixKitLayout(j.order, j.session)
          return { order: f.order!, session: f.sess }
        }),
      }
      const order = session.order && fixOrderMount(session.order)
      session = {
        ...fixMount(order, { ...session, order, history: session.history ?? [] }),
        offers: session.offers?.map(fixOrderMount),
        jobs: session.jobs?.map((j) => {
          const o = fixOrderMount(j.order)
          return { order: o, session: fixMount(o, j.session) }
        }),
      }
      // phím mới thêm do đổi layout (vd F13) mà build đã qua bước lắp: lắp nốt
      session = {
        ...fillAddedKeys(session.order, session),
        jobs: session.jobs?.map((j) => ({ ...j, session: fillAddedKeys(j.order, j.session) })),
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
      // bản lưu trước khi có cấp xưởng: tính theo số đơn đã giao + uy tín
      shopLv: Math.max(save.shopLv ?? 1, levelFor(save.done ?? 0, save.rep ?? 0)),
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
