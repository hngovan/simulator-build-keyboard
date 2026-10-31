import { isSaleDay } from '@/data/sale'
import type { StateCreator } from 'zustand'
import { groupPosts, randomOffers } from '@/data/orders'
import { buildContext } from '@/data/steps'
import {
  CASES,
  CATS,
  PLATELESS,
  PLATELESS_MOUNTS,
  SWITCHES,
  TOOLS,
  switchOk,
  checkInventory,
  isPlateless,
  itemName,
  unusable,
  stabStock,
  addStab,
  stabTotal,
  type InventoryCheck,
} from '@/data/parts'
import { SUPPLIES } from '@/data/supplies'
import { cartItems, cartMax } from '@/data/cart'
import {
  SHIP_SPEEDS,
  arriveDay,
  parcelId,
  parcelStacks,
  stackLabels,
  toolOnWay,
  type ShipSpeed,
} from '@/data/shipping'
import type {
  Paid,
  CartLine,
  CaseItem,
  DeliveryResult,
  GroupPost,
  Inventory,
  Order,
  Parcel,
  ParcelItem,
  PartCategory,
  PartItem,
  StabItem,
  SupplyItem,
  Spare,
  SwitchItem,
  ToolItem,
  ToolKind,
} from '@/types'
import type { GameState } from '.'
import { onBench } from './carrySlice'
import { SHELF_SLOTS, freeSlot } from '@/data/boxes'
import { newBuild } from './buildSlice'
import {
  DECLINE_FREE,
  DECLINE_REP,
  cancelReview,
  declineReview,
  shipRep,
  shipReview,
} from '@/data/reviews'
import { certBonus } from '@/data/reputation'
import { FLAW_TEXT, dealFloor, negotiate, type InboxAction } from '@/data/market'
import type { Job, JobSession, PackedOrder } from './persistence'
import { addPart, fillFromStock, leftoverSpare, stashAll, takeSwitches, without } from './spare'
import { payout } from './scoring'

/** tiền nhận khi gửi đơn (âm nếu đền hỏng nhiều hơn tiền khách trả) */
const fmtGain = (n: number) => (n >= 0 ? `+${n}k` : `${n}k`)

type BuyResult = 'ok' | 'scam' | 'fail'
export interface LubePick {
  switch: string
  housing: string
  wire: string
  spring: string
}

// Đơn hàng, kho đồ, mua sắm (Shopii, Hội Phím Cơ)
export interface ShopSlice {
  lastSolderPurchase: {
    level: number
    cost: number
    previousLevel: number
    previousWear: number
    previousOwned: Record<number, number>
  } | null
  equipSolder: (level: number) => boolean
  undoSolderPurchase: () => void
  /** đơn mới trong ngày (1–5 đơn), nhận đơn nào cũng được */
  offers: Order[]
  /** đơn đã nhận, chờ làm (đơn đang làm nằm ở order) */
  jobs: Job[]
  order: Order | null
  inventory: Inventory
  /** món nào do khách gửi trong kit */
  provided: Partial<Record<PartCategory, true>>
  spent: number
  posts: GroupPost[]
  mount: string | null
  result: DeliveryResult | null
  /** lube đang chọn cho switch / housing stab / dây stab / lò xo */
  lubePick: LubePick
  acceptOrder: (id: string) => void
  declineOrder: (id: string) => void
  /** đánh dấu đơn chào đã xem (bấm hội thoại ở Mezzenger) */
  seeOffer: (id: string) => void
  /** đơn đã từ chối hôm nay (hội thoại vẫn còn ở Mezzenger tới hết ngày) */
  rejected: Order[]
  /** số đơn đã nhận hôm nay (hiện ở bảng tổng kết ngày) */
  acceptedToday: number
  /** tiền / uy tín lúc bắt đầu ngày (popup tổng kết ngày so chênh lệch); null = bản lưu cũ chưa có */
  dayStart: { money: number; rep: number } | null
  /** id đơn đã làm hôm nay (mua đồ / thao tác build); đơn đã nhận mà không làm thì qua ngày khách report, đền tiền */
  worked: string[]
  /**
   * chuyển sang làm 1 đơn đã nhận (đơn đang làm dở được cất lại nguyên trạng); `stay` = không về máy tính (đặt thùng lên bàn build).
   * Thùng đơn đang làm còn nằm trên bàn build thì không đổi được (phải cầm lên cất trước)
   */
  switchJob: (id: string, stay?: boolean) => void
  /** đơn đã đóng gói hôm nay, chờ kết thúc ngày mới gửi cho khách */
  packed: PackedOrder[]
  /** đơn vừa gửi chờ thu thù lao: banner đầu màn hình "Nhận thù lao của bạn" (không lưu) */
  payBanner: { id: string; customer: string; amount: number } | null
  /** thu thù lao đơn đã gửi (nút "Thu tiền" ở Mezzenger): cộng tiền */
  collectPay: (id: string) => void
  /** gửi 1 đơn đã đóng gói cho khách ngay: cộng uy tín + đánh giá, thù lao chờ thu ở Mezzenger */
  shipOrder: (id: string) => void
  nextDay: () => void
  buy: (cat: PartCategory, item: PartItem, price: number, scamRate?: number) => BuyResult
  /** lấy 1 món trong kho chung vào đơn đang làm (key: switch:<loại> / stab:<loại> / item:<chỉ số>), món đang có cất lại */
  takeStock: (key: string) => void
  /** cất 1 món của đơn đang chờ (chưa build) về kho chung */
  releasePart: (jobId: string, cat: PartCategory) => void
  /** đơn đang làm tự lấy đồ hợp yêu cầu trong kho chung */
  fillActive: () => void
  buyPost: (post: GroupPost) => BuyResult
  /** inbox người bán 1 hành động (xin hình, check var, xin bớt, lowball...) */
  inboxPost: (id: string, action: InboxAction, amount?: number) => void
  /** bị ban khỏi chợ Hội Phím Cơ tới hết ngày trước ngày này (đi ăn xin) */
  isMarketBanned: () => boolean
  buySupply: (id: string, n: number, price: number, scamRate?: number) => BuyResult
  buyTool: (kind: ToolKind, level: number, price?: number, scamRate?: number) => BuyResult
  /**
   * Giỏ hàng Shopii (mọi món Shopii đều qua giỏ): thêm món (cùng sản phẩm + loại cộng dồn được thì gộp 1 dòng), bỏ món,
   * đặt cả giỏ = trừ tiền theo tốc độ giao, 1 kiện tới cửa theo ngày; ra cửa nhận (`pickupParcel`) mới vào kho
   */
  cart: CartLine[]
  addCart: (line: CartLine) => void
  /** đổi loại (option) của 1 dòng giỏ, giữ số lượng */
  swapCart: (key: string, line: CartLine) => void
  /** đổi số lượng 1 dòng giỏ (ô nhập / + −) */
  setCartQty: (key: string, qty: number) => void
  removeCart: (key: string) => void
  /** xoá hết giỏ hàng */
  clearCart: () => void
  orderCart: (speed: ShipSpeed) => BuyResult
  /** nhận kiện đã tới cửa: cấp các món trong kiện rồi xoá kiện */
  pickupParcel: (id: string) => void
  /** huỷ kiện Shopii chưa tới cửa: hoàn đủ tiền (cả phí giao) */
  cancelParcel: (id: string) => void
  useSupply: (id: string, n: number) => boolean
  setLubePick: (kind: keyof LubePick, id: string) => void
  /** loại thiếc đang dùng ở bước hàn */
  solderPick: string
  setSolderPick: (id: string) => void
  /** loại feet đang dán ở bước dán feet (FEET_IDS) */
  feetPick: string
  setFeetPick: (id: string) => void
  /** loại dây O-ring đang chọn ở bước cuốn O-ring (ORING_IDS) */
  oringPick: string
  setOringPick: (id: string) => void
  setMount: (mount: string) => void
  /** bật / tắt plateless cho đơn đang làm (chưa vào build): plate đang có cất về kho chung */
  setPlateless: (on: boolean) => void
  startBuild: () => void
  /**
   * Chọn 1 đơn để build ngay từ bàn build trống (đơn mới thì nhận luôn, đơn chờ thì chuyển sang).
   * Đủ linh kiện thì vào build luôn (tự chọn mount); thiếu thì trả về các mục còn thiếu.
   * null = không chuyển được đơn (vd vừa giao xong, chưa kết thúc ngày)
   */
  buildOrder: (id: string) => InventoryCheck[] | null
}

export const emptyInventory = (): Inventory => ({
  case: null,
  pcb: null,
  plate: null,
  stab: null,
  switch: null,
  keycap: null,
})
const KIT_PARTS = ['case', 'pcb', 'plate', 'stab'] as const
/** trễ hạn quá số ngày này thì khách huỷ đơn */
export const CANCEL_AFTER = 3
/** uy tín bị trừ khi khách huỷ đơn (trễ hạn quá lâu / phát hiện shop bán đồ khách gửi) */
export const CANCEL_REP = 3
/** nhận đơn mà cả ngày không làm: đền khách phần này của tiền công */
export const NO_WORK_FINE = 0.2

/** Kho đồ ban đầu của 1 đơn: món khách gửi trong kit */
export function freshSession(order: Order, day: number): JobSession {
  const inventory = emptyInventory()
  const provided: JobSession['provided'] = {}
  if (order.kit)
    for (const cat of KIT_PARTS) {
      const part = order.kit[cat]
      if (part) {
        ;(inventory[cat] as PartItem) = part
        provided[cat] = true
      }
    }
  return {
    inventory,
    provided,
    spent: 0,
    posts: groupPosts(order, day),
    mount: order.mount ?? (order.kit?.case ? CASES[order.kit.case.id].mounts[0] : null),
    build: null,
    history: [],
    supplyUsed: {},
  }
}
/** mount mặc định của case: đang plateless thì ưu tiên mount không cần plate */
const firstMount = (mounts: string[], inv: Inventory, want?: string | null) =>
  // khách đòi mount (vd O-ring) mà case làm được thì chọn luôn mount đó
  (want && mounts.includes(want) && want) ||
  (isPlateless(inv.plate) && mounts.find((m) => PLATELESS_MOUNTS.includes(m))) ||
  mounts[0]

/** Cất đơn đang làm (nếu có) thành 1 job */
/** gửi khách 1 đơn đã đóng gói: switch / stab thừa trong thùng vào kho chung (bản lưu cũ không có dữ liệu đơn thì thôi) */
function packedLeftover(spare: Spare, p: PackedOrder): Spare {
  const j = p.session
  if (!j?.mount || !j.build) return spare
  const { keys } = buildContext(p.order, j.inventory, j.mount)
  return leftoverSpare(spare, j.inventory, keys, !!j.provided.stab)
}

export const stashActive = (s: GameState): Job[] =>
  s.order && !s.result
    ? [
        ...s.jobs,
        {
          order: s.order,
          session: {
            inventory: s.inventory,
            provided: s.provided,
            spent: s.spent,
            posts: s.posts,
            mount: s.mount,
            build: s.build,
            history: s.history,
            supplyUsed: s.supplyUsed,
          },
        },
      ]
    : s.jobs

/**
 * lý do món không vào thẳng đơn đang làm được (null = được). Không chặn mua: có tiền là mua, món không vào đơn được
 * thì cất kho chung (người dùng: "khách gửi kệ khách, mua thì có tiền cứ mua")
 */
function partBlock(s: GameState, cat: PartCategory): string | null {
  if (!s.order || s.result) return 'Nhận đơn trước rồi hãy mua đồ nhé'
  if (s.provided[cat]) return 'Khách đã gửi món này trong kit rồi'
  if (s.build && KIT_PARTS.includes(cat as (typeof KIT_PARTS)[number]))
    return 'Đã bắt đầu build, không thay được món này nữa'
  return null
}

/** Linh kiện đã trả tiền về tay: vào đơn đang làm (gộp / thay món cũ, món cũ cất kho chung). Gọi sau `partBlock` */
function receivePart(
  get: () => GameState,
  set: (p: Partial<GameState>) => void,
  cat: PartCategory,
  item: PartItem,
  price: number,
) {
  const s = get()
  if (!s.order) return
  const sw = item as SwitchItem
  // đơn đã có switch dùng được (hợp yêu cầu / đã cắm lên board) mà mua loại khác: không tự thay switch của đơn,
  // lô mới vào kho chung (giữ tiền đã trả) — chọn loại dùng cho đơn ở app Chi tiết đơn
  const curSw = s.inventory.switch
  const swToSpare =
    cat === 'switch' &&
    !!curSw &&
    curSw.type !== sw.type &&
    ((!curSw.flaw && curSw.count > 0 && switchOk(curSw.type, s.order)) ||
      (!!s.build && Object.keys(s.build.switches).length > 0))
  if (swToSpare) {
    set({
      spare: addPart(s.spare, 'switch', { ...sw, paid: price, paidN: sw.count }),
      spent: s.spent + price,
    })
    s.toast(
      `📦 Đã nhận: ${itemName(cat, item)} → cất vào kho chung (đơn đang dùng ${SWITCHES[curSw!.type]?.name ?? curSw!.type}, đổi ở Chi tiết đơn)`,
      'good',
    )
    return
  }
  // ghi giá đã trả lên món (gộp cùng loại thì cộng dồn) → "Đã chi linh kiện" (`partSpent`)
  const units =
    cat === 'switch' ? sw.count : cat === 'stab' ? stabTotal(stabStock(item as StabItem)) : 1
  const cur = s.inventory[cat] as Paid | null
  const paid = (merge: boolean): Paid => ({
    paid: (merge ? (cur?.paid ?? 0) : 0) + price,
    paidN: (merge ? (cur?.paidN ?? 0) : 0) + units,
  })
  let value: PartItem = { ...item, ...paid(false) }
  let spare = s.spare
  if (cat === 'switch' && s.inventory.switch?.type === sw.type)
    value = { ...sw, count: s.inventory.switch.count + sw.count, ...paid(true) }
  // stab cùng loại thì cộng dồn (bộ + lẻ), khác loại thì thay bộ cũ
  const st = item as StabItem
  if (cat === 'stab' && s.inventory.stab?.type === st.type) {
    const have = stabStock(s.inventory.stab)
    const add = stabStock(st)
    value = { type: st.type, ...addStab(have, add), ...paid(true) }
  }
  // đã có món khác loại (mua thay): món cũ (đã trả tiền) cất vào kho chung, không mất
  const old = s.inventory[cat]
  const merged =
    (cat === 'switch' && s.inventory.switch?.type === sw.type) ||
    (cat === 'stab' && s.inventory.stab?.type === st.type)
  if (old && !merged) spare = addPart(spare, cat, old)
  // switch / stab cùng loại trong kho chung tự gộp vào
  let fromSpare = 0
  if (cat === 'switch' && spare.switches[sw.type]) {
    const r = takeSwitches(spare, sw.type, value as SwitchItem)
    fromSpare = r.n
    value = r.item
    spare = r.spare
  }
  if (cat === 'stab' && !st.flaw && spare.stabs[st.type]) {
    const extra = spare.stabs[st.type]
    const have = stabStock(value as StabItem)
    fromSpare = stabTotal(stabStock(extra))
    value = { ...(value as StabItem), ...addStab(have, stabStock(extra)) }
    spare = { ...spare, stabs: without(spare.stabs, st.type) }
  }
  set({
    inventory: { ...s.inventory, [cat]: value },
    spent: s.spent + price,
    spare,
    ...(cat === 'case'
      ? { mount: firstMount(CASES[(item as CaseItem).id].mounts, s.inventory, s.order.mount) }
      : {}),
  })
  s.toast(
    `📦 Đã nhận: ${itemName(cat, item)}${fromSpare ? ` (+${fromSpare} trong kho chung)` : ''}`,
    'good',
  )
}

/** số món đã trả tiền của linh kiện (switch: số con, stab: số stab, còn lại 1) → `paidN` */
const paidUnits = (cat: PartCategory, item: PartItem) =>
  cat === 'switch'
    ? (item as SwitchItem).count
    : cat === 'stab'
      ? stabTotal(stabStock(item as StabItem))
      : 1

/** lý do không đặt mua dụng cụ được: đã có (hoặc bản tốt hơn) / đang trên đường giao; null = được */
function toolBlock(s: GameState, kind: ToolKind, level: number): string | null {
  const have =
    kind === 'solder'
      ? s.solderOwned[level] !== undefined || s.tools.solder === level
      : s.tools[kind] >= level
  if (have) return 'Bạn đã có dụng cụ này hoặc bản tốt hơn'
  if (toolOnWay(s.parcels, kind, level))
    return 'Dụng cụ này đang trên đường giao rồi, ra cửa nhận nhé'
  return null
}

/** tên kiện: 1 món = tên món, nhiều món = món đầu + số món còn lại */
const parcelLabel = (labels: string[]) =>
  labels.length > 1 ? `${labels[0]} +${labels.length - 1} món` : labels[0]

/** tên 1 món trong kiện */
const parcelItemName = (it: ParcelItem) =>
  it.kind === 'part'
    ? itemName(it.cat, it.item)
    : it.kind === 'supply'
      ? SUPPLIES[it.id].name
      : TOOLS[it.tool][it.level].name

/**
 * Đặt cả giỏ Shopii thành 1 kiện: kiểm tra (dụng cụ đã có / đang giao), trừ tiền theo tốc độ giao, linh kiện
 * vào được đơn đang làm thì gắn đơn (lúc nhận vào thẳng đơn), không thì nhận xong cất kho chung
 */
function placeOrder(
  get: () => GameState,
  set: (p: Partial<GameState>) => void,
  items: ParcelItem[],
  speed: ShipSpeed,
  lines: number,
): BuyResult {
  const s = get()
  const fail = (msg: string): BuyResult => (s.toast(msg, 'bad'), 'fail')
  const priced: ParcelItem[] = []
  for (const it of items) {
    if (it.kind === 'tool') {
      const err = toolBlock(s, it.tool, it.level)
      if (err) return fail(err)
    }
    const job = it.kind === 'part' && !partBlock(s, it.cat) ? s.order!.id : undefined
    priced.push({ ...it, ...(job ? { job } : {}) })
  }
  // phí giao theo từng dòng (từng món khác nhau) trong giỏ; cùng món mua nhiều cái không cộng thêm
  const fee = SHIP_SPEEDS[speed].fee * lines
  const cost = priced.reduce((a, it) => a + it.price, 0) + fee
  if (s.money < cost) return fail('Không đủ tiền!')
  const arrive = arriveDay(s.day, speed)
  const label = parcelLabel(priced.map(parcelItemName))
  const parcel: Parcel = {
    id: parcelId(),
    ordered: s.day,
    arrive,
    speed,
    label,
    items: priced,
    fee,
  }
  const jobs = priced.flatMap((it) => (it.job && !s.worked.includes(it.job) ? [it.job] : []))
  set({
    money: s.money - cost,
    parcels: [...s.parcels, parcel],
    // mua đồ cho đơn = hôm nay đã làm đơn đó (luật qua ngày)
    ...(jobs.length ? { worked: [...s.worked, ...new Set(jobs)] } : {}),
  })
  const how = `giao ${SHIP_SPEEDS[speed].name}`
  s.toast(
    arrive <= s.day
      ? `🚚 Đã đặt ${label} — ${how}, hàng tới cửa ngay`
      : `🚚 Đã đặt ${label} — ${how}, tới ngày ${arrive}`,
    'good',
  )
  return 'ok'
}

/** Nhận 1 món trong kiện hàng (tiền đã trả lúc đặt) */
function receiveParcelItem(
  get: () => GameState,
  set: (p: Partial<GameState>) => void,
  it: ParcelItem,
  job: string | undefined,
) {
  const s = get()
  if (it.note) s.toast(it.note, 'bad')
  if (it.kind === 'part') {
    // keycap / switch / stab lỗi (hàng chợ): không lắp cho khách được → cất thẳng vào kho chung để bán lại
    const flaw = (it.item as { flaw?: string }).flaw
    if (flaw && unusable(it.cat, it.item)) {
      set({ spare: addPart(s.spare, it.cat, it.item) })
      return s.notify(
        '😬 Dính hàng lỗi',
        `${itemName(it.cat, it.item)} bị ${flaw}: không lắp cho khách được, đã cất vào kho chung (viền đỏ). Chỉ đăng bán lại ở Hội Phím Cơ được thôi`,
      )
    }
    // đơn lúc đặt vẫn đang làm (và còn nhận món này được): nhận như mua cũ
    if (s.order && s.order.id === job && !partBlock(s, it.cat))
      return receivePart(get, set, it.cat, it.item, it.price)
    // đơn đã chuyển vào danh sách chờ / bị huỷ / đã giao: cất kho chung, đơn đang làm tự lấy món hợp
    set({
      spare: addPart(s.spare, it.cat, {
        ...it.item,
        paid: it.price,
        paidN: paidUnits(it.cat, it.item),
      }),
    })
    s.toast(`📦 Đã nhận: ${itemName(it.cat, it.item)} → cất vào kho chung`, 'good')
    return get().fillActive()
  }
  if (it.kind === 'supply') {
    set({ supplies: { ...s.supplies, [it.id]: (s.supplies[it.id] ?? 0) + it.n } })
    return s.toast(`🧴 Đã nhận: ${SUPPLIES[it.id].name} (+${it.n} ${SUPPLIES[it.id].unit})`, 'good')
  }
  const tool = TOOLS[it.tool][it.level]
  // lúc chờ giao đã có bản này / tốt hơn (vd mua tay ở Hội Phím Cơ): hoàn tiền
  const have =
    it.tool === 'solder'
      ? s.solderOwned[it.level] !== undefined || s.tools.solder === it.level
      : s.tools[it.tool] >= it.level
  if (have) {
    set({ money: s.money + it.price })
    return s.toast(`Đã có ${tool.name} rồi, hoàn ${it.price}k`, 'good')
  }
  if (it.tool === 'solder')
    set({
      solderOwned: {
        ...s.solderOwned,
        ...(s.tools.solder > 0 ? { [s.tools.solder]: s.wear.solder ?? 0 } : {}),
        [it.level]: 0,
      },
    })
  set({ tools: { ...get().tools, [it.tool]: it.level }, wear: { ...get().wear, [it.tool]: 0 } })
  s.toast(`🔧 Đã nhận ${tool.name}`, 'good')
}

export const createShopSlice: StateCreator<GameState, [], [], ShopSlice> = (set, get) => ({
  lastSolderPurchase: null,
  equipSolder: (level) => {
    const s = get()
    const owned = {
      ...s.solderOwned,
      ...(s.tools.solder > 0 ? { [s.tools.solder]: s.wear.solder ?? 0 } : {}),
    }
    if (owned[level] === undefined || !TOOLS.solder[level] || TOOLS.solder[level].none) return false
    set({
      solderOwned: owned,
      tools: { ...s.tools, solder: level },
      wear: { ...s.wear, solder: owned[level] },
    })
    s.toast(`Đang dùng ${TOOLS.solder[level].name}`, 'good')
    return true
  },
  undoSolderPurchase: () => {
    const s = get(),
      purchase = s.lastSolderPurchase
    if (!purchase) return
    set({
      money: s.money + purchase.cost,
      tools: { ...s.tools, solder: purchase.previousLevel },
      wear: { ...s.wear, solder: purchase.previousWear },
      solderOwned: purchase.previousOwned,
      lastSolderPurchase: null,
    })
    s.toast(`Đã hoàn tác mua ${TOOLS.solder[purchase.level].name}, hoàn ${purchase.cost}k`, 'good')
  },
  offers: randomOffers(),
  jobs: [],
  order: null,
  inventory: emptyInventory(),
  provided: {},
  spent: 0,
  posts: [],
  mount: null,
  result: null,
  packed: [],
  rejected: [],
  acceptedToday: 0,
  dayStart: null,
  worked: [],
  lubePick: { switch: 'g0', housing: 'g2', wire: 'bdz', spring: 'gpl105' },
  solderPick: 'solder6337',
  feetPick: 'feetBlack',
  oringPick: 'oring50',

  // ---------- đơn hàng ----------
  acceptOrder: (id) => {
    const s = get()
    const offer = s.offers.find((o) => o.id === id)
    if (!offer) return
    const order = { ...offer, dueDay: s.day + offer.days }
    const offers = s.offers.filter((o) => o.id !== id)
    set({ acceptedToday: s.acceptedToday + 1 })
    // chứng chỉ thợ: thu nhập cơ bản cộng ngay vào ví mỗi lần nhận đơn
    const bonus = certBonus(s.tools.cert ?? 0)
    if (bonus) {
      set({ money: s.money + bonus })
      s.toast(`+${bonus}k thu nhập cơ bản (${TOOLS.cert[s.tools.cert].name})`, 'good')
    }
    // chưa làm đơn nào thì làm luôn đơn này, không thì xếp vào danh sách chờ
    // (vừa giao xong thì cũng xếp chờ: phải bấm kết thúc ngày để sang ngày mới)
    // khách gửi đồ (đơn kit): thùng đơn tới kệ ngoài cửa (hết ô nhận đơn thì xếp dưới sàn trước kệ), ra lấy mang về bàn build.
    // Khách không gửi gì (đơn full): không có thùng gửi tới, shop lấy thùng trống để sẵn ở kệ cất đơn (đầy thì ra kệ cửa)
    const boxes = get().boxes
    const shelf = order.kit ? -1 : freeSlot(boxes, 'shelf', SHELF_SLOTS)
    set({
      boxes: {
        ...boxes,
        [order.id]:
          shelf >= 0 ? { at: 'shelf', slot: shelf } : { at: 'door', slot: freeSlot(boxes, 'door') },
      },
    })
    if (!s.order) {
      const job = freshSession(order, s.day)
      set({ offers, order, ...job, ctx: null, result: null, pressed: {}, future: [] })
      get().fillActive()
    } else {
      set({ offers, jobs: [...s.jobs, { order, session: freshSession(order, s.day) }] })
    }
    s.toast(
      `Đã nhận đơn của ${order.customer}, hạn ngày ${order.dueDay}. ${shelf >= 0 ? 'Khách không gửi đồ: thùng trống để sẵn ở kệ cất đơn' : 'Thùng đơn tới kệ ngoài cửa'}, mang về bàn build`,
      'good',
    )
  },
  seeOffer: (id) => {
    if (!get().offers.some((o) => o.id === id && !o.seen)) return
    set((s) => ({ offers: s.offers.map((o) => (o.id === id ? { ...o, seen: true } : o)) }))
  },
  // từ chối quá DECLINE_FREE đơn / ngày: khách bực, để lại đánh giá xấu, trừ uy tín
  declineOrder: (id) => {
    const s = get()
    const order = s.offers.find((o) => o.id === id)
    if (!order) return
    const rejected = [...s.rejected, order]
    const angry = rejected.length > DECLINE_FREE
    set({
      offers: s.offers.filter((o) => o.id !== id),
      rejected,
      ...(angry ? { rep: s.rep + DECLINE_REP } : {}),
    })
    if (angry) s.addReviews([declineReview(order, s.day)])
  },
  switchJob: (id, stay) => {
    const s = get()
    if (s.stabAnim || s.lubeAnim || s.order?.id === id) return
    if (s.order && s.benchBox === s.order.id)
      return s.toast(
        `Thùng đơn ${s.order.customer} đang trên bàn build: ngồi vào bàn cầm thùng lên cất trước`,
        'bad',
      )
    if (s.result)
      return s.toast('Ra lịch trên tường bấm "Kết thúc ngày" trước rồi làm đơn tiếp nhé', 'bad')
    if (s.jobs.find((j) => j.order.id === id)?.order.cancel)
      return s.toast('Khách đã huỷ kèo đơn này rồi', 'bad')
    const jobs = stashActive(s)
    const job = jobs.find((j) => j.order.id === id)
    if (!job) return
    const { session, order } = job
    set({
      jobs: jobs.filter((j) => j.order.id !== id),
      order,
      ...session,
      future: [],
      result: null,
      pressed: {},
      ctx:
        session.build && session.mount
          ? buildContext(order, session.inventory, session.mount)
          : null,
      ...(stay ? {} : { screen: 'pc' as const }),
    })
    s.toast(`Chuyển sang đơn của ${order.customer}`)
    get().fillActive()
  },
  shipOrder: (id) => {
    const s = get()
    const p = s.packed.find((x) => x.order.id === id && !x.shipped)
    if (!p) return
    // khách nhận hàng: uy tín + đánh giá tính luôn, thù lao chờ shop vào Mezzenger bấm "Thu tiền" (`collectPay`);
    // switch / stab thừa của đơn vào kho chung, bỏ dữ liệu đơn trong thùng (không mở lại được nữa)
    set({
      packed: s.packed.map((x) =>
        x === p ? { ...x, shipped: true, paid: false, session: undefined } : x,
      ),
      spare: packedLeftover(s.spare, p),
      rep: s.rep + shipRep(p.result),
      done: s.done + 1,
      payBanner: { id, customer: p.order.customer, amount: payout(p.result) },
    })
    s.addReviews([shipReview(p.order, p.result, s.day)])
  },
  collectPay: (id) => {
    const s = get()
    const p = s.packed.find((x) => x.order.id === id && x.shipped && x.paid === false)
    if (!p) return
    const gain = payout(p.result)
    set({
      packed: s.packed.map((x) => (x === p ? { ...x, paid: true } : x)),
      money: s.money + gain,
      ...(s.payBanner?.id === id ? { payBanner: null } : {}),
    })
    s.toast(
      `💰 Đã thu thù lao đơn ${p.order.customer}: ${'★'.repeat(p.result.stars)} · ${fmtGain(gain)}`,
      'good',
    )
  },
  payBanner: null,
  // sang ngày mới: gửi nốt đơn đã đóng gói, đợt đơn mới, đơn chờ quá hạn lâu thì khách huỷ
  nextDay: () => {
    // phím của khách đang đăng bán mà chưa bán: trả về chờ gửi (gửi luôn bên dưới), vụ chuộc quá hạn thì mất
    get().closeSellDay(get().day + 1)
    const s = get()
    // gửi các đơn đã đóng gói chưa gửi: khách hoàn tiền linh kiện + trả công, chấm sao → uy tín
    let money = s.money
    let repGain = 0
    // gửi rồi mà chưa vào Mezzenger thu thù lao: qua ngày tự thu
    for (const p of s.packed.filter((x) => x.shipped && x.paid === false)) money += payout(p.result)
    const unsent = s.packed.filter((p) => !p.shipped)
    for (const p of unsent) {
      money += payout(p.result)
      repGain += shipRep(p.result)
      s.toast(
        `📦 Đã gửi đơn ${p.order.customer}: ${'★'.repeat(p.result.stars)} · ${fmtGain(payout(p.result))}`,
        'good',
      )
    }
    const day = s.day + 1
    // khách huỷ kèo vì bị bán đồ (đã trừ uy tín lúc phát hiện): hết ngày thì đơn mất, đồ shop mua cất kho chung
    const sold = s.jobs.filter((j) => j.order.cancel)
    const cancelled = s.jobs.filter(
      (j) => !j.order.cancel && day - (j.order.dueDay ?? day) > CANCEL_AFTER,
    )
    const rep = s.rep + repGain - cancelled.length * CANCEL_REP
    // đơn đã nhận mà cả ngày không đụng tới (không mua đồ, không build): khách report nhận không làm,
    // shop đền NO_WORK_FINE tiền công của đơn
    const idleJobs = [...(s.order && !s.result ? [s.order] : []), ...s.jobs.map((j) => j.order)]
      .filter((o) => !s.worked.includes(o.id))
      .filter((o) => !o.cancel && !cancelled.some((j) => j.order.id === o.id))
    const fines = idleJobs.map((o) => ({ o, fine: Math.round((o.labor * NO_WORK_FINE) / 10) * 10 }))
    money -= fines.reduce((a, f) => a + f.fine, 0)
    set({
      lastSolderPurchase: null,
      offers: randomOffers(rep),
      // chợ Hội Phím Cơ qua ngày mới: bỏ bài cũ, đăng đợt hàng mới cho từng đơn đang làm / đang chờ
      jobs: s.jobs
        .filter((j) => !cancelled.includes(j) && !sold.includes(j))
        .map((j) => ({ ...j, session: { ...j.session, posts: groupPosts(j.order, day) } })),
      // đơn đang làm dở (chưa đóng gói) vẫn giữ để làm tiếp ngày mai
      order: s.result ? null : s.order,
      posts: s.order && !s.result ? groupPosts(s.order, day) : [],
      result: null,
      packed: [],
      payBanner: null,
      money,
      // khách huỷ: switch / stab đã mua cho đơn đó cất vào đồ dư; đơn đóng gói gửi nốt: đồ thừa vào kho chung
      spare: unsent.reduce(
        packedLeftover,
        [...cancelled, ...sold].reduce(
          (sp, j) => stashAll(sp, j.session.inventory, j.session.provided),
          s.spare,
        ),
      ),
      done: s.done + unsent.length,
      ...(s.result ? { build: null, ctx: null } : {}),
      day,
      rep,
      rejected: [],
      acceptedToday: 0,
      dayStart: { money, rep },
      worked: [],
      // kết thúc ngày ở lịch treo tường: ở nguyên trong phòng
    })
    for (const { o, fine } of fines)
      s.notify(
        '🚩 Khách report nhận đơn không làm',
        `${o.customer}: shop nhận đơn mà cả ngày không làm gì. Đền khách ${fine}k (${Math.round(NO_WORK_FINE * 100)}% tiền công)`,
      )
    for (const j of cancelled) {
      s.toast(`😡 ${j.order.customer} huỷ đơn vì trễ hạn quá lâu (−${CANCEL_REP} uy tín)`, 'bad')
      s.logNotify(
        '😡 Khách huỷ đơn',
        `${j.order.customer} huỷ vì trễ hạn quá lâu (−${CANCEL_REP} uy tín)`,
      )
    }
    if (get().order || get().jobs.length) s.toast('🛒 Hội Phím Cơ có đợt hàng pass mới hôm nay')
    if (isSaleDay(day)) s.toast('🔥 Hôm nay Shopii sale 3 mục linh kiện, giảm 5–30%!', 'good')
    // kiện Shopii tới cửa hôm nay (không tự nhận: ra cửa bấm thùng hàng); ghi gộp theo thùng trên kệ ("×2")
    const arrived = parcelStacks(
      get().parcels.filter((p) => p.arrive === day),
      day,
    )
    if (arrived.length)
      s.notify('📦 Có hàng tới cửa', `${stackLabels(arrived)}. Ra cửa phòng bấm thùng hàng để nhận`)
    s.addReviews([
      ...unsent.map((p) => shipReview(p.order, p.result, s.day)),
      ...cancelled.map((j) => cancelReview(j.order, s.day, -CANCEL_REP)),
    ])
  },

  // ---------- mua sắm ----------
  buy: (cat, item, price, scamRate = 0) => {
    const s = get()
    const fail = (msg: string): BuyResult => (s.toast(msg, 'bad'), 'fail')
    if (s.money < price) return fail('Không đủ tiền!')
    set({ money: s.money - price })
    if (Math.random() < scamRate) {
      s.toast(`😱 Seller bùng hàng! Mất trắng ${price}k`, 'bad')
      return 'scam'
    }
    const err = partBlock(get(), cat)
    if (!err) receivePart(get, set, cat, item, price)
    else {
      // không vào đơn đang làm được (khách gửi rồi, đã build, chưa nhận đơn): cất kho chung
      set({
        spare: addPart(get().spare, cat, { ...item, paid: price, paidN: paidUnits(cat, item) }),
      })
      s.toast(`📦 Đã nhận: ${itemName(cat, item)} → cất vào kho chung`, 'good')
    }
    return 'ok'
  },
  takeStock: (key) => {
    const s = get()
    if (!s.order || s.result) return s.toast('Nhận đơn trước rồi hãy lấy đồ trong kho nhé', 'bad')
    const [kind, id] = key.split(':') as ['switch' | 'stab' | 'item', string]
    let spare = s.spare
    let cat: PartCategory
    let item: PartItem
    if (kind === 'switch') {
      if (!spare.switches[id]) return
      cat = 'switch'
      const r = takeSwitches(spare, id)
      item = r.item
      spare = r.spare
    } else if (kind === 'stab') {
      if (!spare.stabs[id]) return
      cat = 'stab'
      item = { type: id, ...spare.stabs[id] }
      spare = { ...spare, stabs: without(spare.stabs, id) }
    } else {
      const x = spare.items[Number(id)]
      if (!x) return
      cat = x.cat
      item = x.item
      spare = { ...spare, items: spare.items.filter((_, i) => i !== Number(id)) }
    }
    if (s.provided[cat]) return s.toast('Khách đã gửi món này trong kit rồi', 'bad')
    if (s.build && KIT_PARTS.includes(cat as (typeof KIT_PARTS)[number]))
      return s.toast('Đã bắt đầu build, không thay được món này nữa', 'bad')
    const cur = s.inventory[cat]
    const same =
      !(item as { flaw?: string }).flaw &&
      !(cur as { flaw?: string } | null)?.flaw &&
      (cat === 'switch' || cat === 'stab') &&
      (cur as { type?: string } | null)?.type === (item as { type: string }).type
    if (cat === 'switch' && cur && !same && s.build && Object.keys(s.build.switches).length)
      return s.toast('Board đã cắm switch loại khác, không trộn được', 'bad')
    if (same && cat === 'switch')
      item = {
        ...(cur as SwitchItem),
        count: (item as SwitchItem).count + (cur as SwitchItem).count,
      }
    else if (same) {
      const x = stabStock(cur as StabItem)
      const y = stabStock(item as StabItem)
      item = { ...(cur as StabItem), ...addStab(x, y) }
    } else spare = addPart(spare, cat, cur)
    set({
      spare,
      inventory: { ...s.inventory, [cat]: item },
      ...(cat === 'case' && !s.order.mount
        ? { mount: CASES[(item as CaseItem).id].mounts[0] }
        : {}),
    })
    s.toast(`📦 Lấy từ kho: ${itemName(cat, item)}`, 'good')
  },
  releasePart: (jobId, cat) => {
    const s = get()
    const job = s.jobs.find((j) => j.order.id === jobId)
    if (!job || job.session.provided[cat] || !job.session.inventory[cat]) return
    if (job.session.build) return s.toast('Đơn đó đã bắt đầu build, không lấy đồ ra được', 'bad')
    set({
      spare: addPart(s.spare, cat, job.session.inventory[cat]),
      jobs: s.jobs.map((j) =>
        j === job
          ? { ...j, session: { ...j.session, inventory: { ...j.session.inventory, [cat]: null } } }
          : j,
      ),
    })
    s.toast(`Đã cất ${CATS[cat]} của đơn ${job.order.customer} về kho chung`)
    get().fillActive()
  },
  fillActive: () => {
    const s = get()
    if (!s.order || s.result) return
    // đã bắt đầu build thì chỉ còn gộp switch (case / PCB / plate / stab không đổi được nữa)
    const locked: Partial<Record<PartCategory, true>> = s.build
      ? { ...s.provided, case: true, pcb: true, plate: true, stab: true }
      : s.provided
    const r = fillFromStock(s.spare, s.inventory, s.order, locked)
    if (!r.taken.length) return
    set({
      spare: r.spare,
      inventory: r.inventory,
      ...(!s.mount && r.inventory.case && !s.order.mount
        ? { mount: CASES[r.inventory.case.id].mounts[0] }
        : {}),
    })
    s.toast(`📦 Lấy từ kho chung: ${r.taken.join(', ')}`, 'good')
  },
  isMarketBanned: () => get().day < get().marketBanUntil,
  inboxPost: (id, action, amount) => {
    const s = get()
    const post = s.posts.find((p) => p.id === id)
    if (!post || s.isMarketBanned()) return
    const next = negotiate(post, action, amount)
    set({ posts: s.posts.map((p) => (p === post ? next : p)) })
    // đi ăn xin bị ban: khoá chợ BAN_DAYS ngày + thông báo góc phải trên
    if (next.deal?.ban && !post.deal?.ban) s.banMarket(`Đi ăn xin người bán ${post.seller}`)
  },
  // chốt đơn pass: trả giá đã thương lượng + ship; seller bùng thì mất trắng, hàng lỗi thì ghi flaw / thiếu switch
  buyPost: (post) => {
    const s = get()
    if (s.isMarketBanned()) return (s.toast('Bạn đang bị ban khỏi chợ', 'bad'), 'fail')
    if (post.deal?.blocked) return (s.toast('Bạn đã bị người bán chặn', 'bad'), 'fail')
    const cat = post.product.cat
    // giá deal không dưới giá sàn (save cũ có thể đã bị bớt về 0đ)
    // được tặng free (đi ăn xin) thì 0đ, người tặng không bùng
    const cost = post.deal?.gift
      ? 0
      : Math.max(dealFloor(post), post.deal?.price ?? post.price) + (post.deal?.ship ?? 0)
    // bản lưu cũ (chưa có sự thật ẩn): 20% bùng như trước
    const scam = post.deal?.gift ? 0 : post.scammer === undefined ? 0.2 : post.scammer ? 1 : 0
    let item = post.opt.item as PartItem
    const flaw = post.cond && FLAW_TEXT[post.cond]
    if (flaw) item = { ...item, flaw } as PartItem
    if (post.cond === 'dead' && cat === 'switch') {
      const sw = item as SwitchItem
      item = { ...sw, count: Math.max(1, Math.round(sw.count * (0.8 + Math.random() * 0.1))) }
    }
    const fail = (msg: string): BuyResult => (s.toast(msg, 'bad'), 'fail')
    const opt = post.opt.item
    const toolErr =
      (cat === 'tool' || cat === 'cert') &&
      toolBlock(s, (opt as ToolItem).kind, (opt as ToolItem).level)
    if (toolErr) return fail(toolErr)
    if (s.money < cost) return fail('Không đủ tiền!')
    set({ money: s.money - cost })
    const sold = () =>
      set((s) => ({ posts: s.posts.map((p) => (p.id === post.id ? { ...p, sold: true } : p)) }))
    sold()
    if (Math.random() < scam) {
      s.toast(`😱 Seller bùng hàng! Mất trắng ${cost}k`, 'bad')
      s.logNotify('😱 Seller bùng hàng', `Mất trắng ${cost}k`)
      return 'scam'
    }
    // người bán gửi hàng: kiện (không tag Shopii) tới kệ cửa trong ngày, ra nhận mới vào kho; lỗi chỉ thấy lúc mở kiện
    let pi: ParcelItem
    if (cat === 'supply' || cat === 'spell')
      pi = { kind: 'supply', id: (opt as SupplyItem).id, n: (opt as SupplyItem).n, price: cost }
    else if (cat === 'tool' || cat === 'cert')
      pi = {
        kind: 'tool',
        tool: (opt as ToolItem).kind,
        level: (opt as ToolItem).level,
        price: cost,
      }
    else {
      const pc = cat as PartCategory
      const dead =
        post.cond === 'dead' && cat === 'switch'
          ? (opt as SwitchItem).count - (item as SwitchItem).count
          : 0
      const note = dead
        ? `😵 Mở hàng mới thấy chết ${dead} con switch`
        : flaw && !unusable(pc, item)
          ? `😬 Mở hàng mới thấy lỗi: ${flaw}`
          : undefined
      const job = !partBlock(s, pc) && !(flaw && unusable(pc, item)) ? s.order!.id : undefined
      pi = {
        kind: 'part',
        cat: pc,
        item,
        price: cost,
        ...(job ? { job } : {}),
        ...(note ? { note } : {}),
      }
    }
    const label = parcelItemName(pi)
    set({
      parcels: [
        ...get().parcels,
        {
          id: parcelId(),
          ordered: s.day,
          arrive: s.day,
          speed: 'express',
          label,
          items: [pi],
          from: 'market',
          seller: post.seller,
        },
      ],
    })
    s.toast(`🚚 ${post.seller} đã gửi ${label}, hàng tới kệ cửa trong ngày`, 'good')
    return 'ok'
  },
  buySupply: (id, n, price, scamRate = 0) => {
    const s = get()
    if (s.money < price) return (s.toast('Không đủ tiền!', 'bad'), 'fail')
    set({ money: s.money - price })
    if (Math.random() < scamRate)
      return (s.toast(`😱 Seller bùng hàng! Mất trắng ${price}k`, 'bad'), 'scam')
    set({ supplies: { ...get().supplies, [id]: (s.supplies[id] ?? 0) + n } })
    s.toast(`🧴 Đã nhận: ${SUPPLIES[id].name} (+${n} ${SUPPLIES[id].unit})`, 'good')
    return 'ok'
  },
  buyTool: (kind, level, price, scamRate = 0) => {
    const s = get()
    const tool = TOOLS[kind][level]
    const cost = price ?? tool.price
    if (kind === 'solder' && (s.solderOwned[level] !== undefined || s.tools.solder === level)) {
      s.equipSolder(level)
      return 'ok'
    }
    if (kind !== 'solder' && s.tools[kind] >= level)
      return (s.toast('Bạn đã có dụng cụ này hoặc bản tốt hơn', 'bad'), 'fail')
    if (s.money < cost) return (s.toast('Không đủ tiền!', 'bad'), 'fail')
    set({ money: s.money - cost })
    if (Math.random() < scamRate)
      return (s.toast(`😱 Seller bùng hàng! Mất trắng ${cost}k`, 'bad'), 'scam')
    if (kind === 'solder') {
      const previousOwned = {
        ...s.solderOwned,
        ...(s.tools.solder > 0 ? { [s.tools.solder]: s.wear.solder ?? 0 } : {}),
      }
      set({
        solderOwned: { ...previousOwned, [level]: 0 },
        lastSolderPurchase: {
          level,
          cost,
          previousLevel: s.tools.solder,
          previousWear: s.wear.solder ?? 0,
          previousOwned,
        },
      })
    }
    set({ tools: { ...get().tools, [kind]: level }, wear: { ...get().wear, [kind]: 0 } })
    s.toast(`🔧 Đã mua ${tool.name}`, 'good')
    return 'ok'
  },
  cart: [],
  addCart: (line) => {
    const s = get()
    const it = line.unit
    if (it.kind === 'tool') {
      const err =
        toolBlock(s, it.tool, it.level) ??
        (s.cart.some((l) => l.unit.kind === 'tool' && l.unit.tool === it.tool)
          ? 'Giỏ hàng đã có dụng cụ này rồi'
          : null)
      if (err) return s.toast(err, 'bad')
    }
    if (line.sale && s.cart.some((l) => l.product === line.product && l.sale))
      return s.toast('Món này đã có giá sale trong giỏ, mua thêm là giá thường', 'bad')
    // cùng sản phẩm + cùng option: cộng số lượng vào dòng cũ
    const old = s.cart.find((l) => l.key === line.key)
    set({
      cart: old
        ? s.cart.map((l) => (l === old ? { ...l, qty: Math.min(cartMax(l), l.qty + line.qty) } : l))
        : [...s.cart, line],
    })
    s.toast(`🛒 Đã thêm ${line.label} vào giỏ hàng`, 'good')
  },
  swapCart: (key, line) => {
    const s = get()
    const old = s.cart.find((l) => l.key === key)
    if (!old || key === line.key) return
    // đổi sang option đã có dòng riêng: gộp số lượng vào dòng đó
    const dup = s.cart.find((l) => l.key === line.key)
    set({
      cart: dup
        ? s.cart
            .filter((l) => l !== old)
            .map((l) => (l === dup ? { ...l, qty: Math.min(cartMax(l), l.qty + old.qty) } : l))
        : s.cart.map((l) => (l === old ? { ...line, qty: Math.min(cartMax(line), old.qty) } : l)),
    })
  },
  setCartQty: (key, qty) =>
    set({
      cart: get().cart.map((l) =>
        l.key === key ? { ...l, qty: Math.max(1, Math.min(cartMax(l), Math.floor(qty) || 1)) } : l,
      ),
    }),
  removeCart: (key) => set({ cart: get().cart.filter((l) => l.key !== key) }),
  clearCart: () => set({ cart: [] }),
  orderCart: (speed) => {
    const s = get()
    if (!s.cart.length) return 'fail'
    const res = placeOrder(get, set, s.cart.flatMap(cartItems), speed, s.cart.length)
    if (res !== 'ok') return res
    // món sale: mỗi món chỉ mua 1 lần trong ngày sale
    const sale = s.cart.filter((l) => l.sale).map((l) => l.product)
    const cur = s.saleBought?.day === s.day ? s.saleBought.ids : []
    set({
      cart: [],
      ...(sale.length ? { saleBought: { day: s.day, ids: [...cur, ...sale] } } : {}),
    })
    return res
  },
  pickupParcel: (id) => {
    const s = get()
    const p = s.parcels.find((x) => x.id === id)
    if (!p) return
    if (p.arrive > s.day) return s.toast(`Kiện ${p.label} chưa tới, hẹn ngày ${p.arrive}`, 'bad')
    set({ parcels: s.parcels.filter((x) => x !== p) })
    for (const it of p.items) receiveParcelItem(get, set, it, it.job ?? p.job)
  },
  cancelParcel: (id) => {
    const s = get()
    const p = s.parcels.find((x) => x.id === id)
    if (!p) return
    if (p.from === 'market') return s.toast('Người bán gửi hàng rồi, không huỷ được', 'bad')
    if (p.arrive <= s.day) return s.toast('Hàng đã tới cửa rồi, không huỷ được nữa', 'bad')
    const refund = p.items.reduce((a, it) => a + it.price, 0) + (p.fee ?? 0)
    set({ parcels: s.parcels.filter((x) => x !== p), money: s.money + refund })
    s.toast(`Đã huỷ đặt ${p.label}, hoàn ${refund}k`, 'good')
  },
  // Trừ vật tư, trả về false nếu không đủ
  useSupply: (id, n) => {
    const s = get()
    const have = s.supplies[id] ?? 0
    if (have < n) {
      s.toast(
        `Không đủ ${SUPPLIES[id].name}: cần ${n}, còn ${have}. Mua ở Shopii → Lube & vật tư`,
        'bad',
      )
      return false
    }
    set({
      supplies: { ...s.supplies, [id]: have - n },
      supplyUsed: { ...s.supplyUsed, [id]: (s.supplyUsed[id] ?? 0) + n },
    })
    s.save()
    return true
  },
  setLubePick: (kind, id) => set((s) => ({ lubePick: { ...s.lubePick, [kind]: id } })),
  setSolderPick: (solderPick) => set({ solderPick }),
  setFeetPick: (feetPick) => set({ feetPick }),
  setOringPick: (oringPick) => set({ oringPick }),
  setMount: (mount) => {
    const s = get()
    if (s.build) return
    if (isPlateless(s.inventory.plate) && !PLATELESS_MOUNTS.includes(mount))
      return s.toast('Plateless chỉ lắp kiểu Tray mount (mount khác đều cần plate)', 'bad')
    set({ mount })
  },
  setPlateless: (on) => {
    const s = get()
    if (!s.order || s.result) return
    if (s.build) return s.toast('Đã bắt đầu build, không đổi plate được nữa', 'bad')
    if (on === isPlateless(s.inventory.plate)) return
    if (!on) {
      set({ inventory: { ...s.inventory, plate: null } })
      return get().fillActive()
    }
    if (s.provided.plate) return s.toast('Khách đã gửi plate, phải dùng plate đó', 'bad')
    if (s.order.plateMaterial)
      return s.toast('Khách đòi đúng chất liệu plate, không bỏ plate được', 'bad')
    if (s.order.foam)
      return s.toast('Khách muốn lót foam giữa PCB và plate, không bỏ plate được', 'bad')
    const mounts = s.inventory.case ? CASES[s.inventory.case.id].mounts : PLATELESS_MOUNTS
    const mount = s.order.mount ?? mounts.find((m) => PLATELESS_MOUNTS.includes(m))
    if (!mount || !PLATELESS_MOUNTS.includes(mount))
      return s.toast('Case / mount của đơn này không làm plateless được (cần Tray mount)', 'bad')
    set({
      spare: addPart(s.spare, 'plate', s.inventory.plate),
      inventory: { ...s.inventory, plate: { layout: s.order.layout, material: PLATELESS } },
      mount,
    })
    s.toast('Đã chọn plateless: bỏ bước plate, nhớ dùng PCB hàn nhé', 'good')
  },

  buildOrder: (id) => {
    let s = get()
    if (s.offers.some((o) => o.id === id)) {
      s.acceptOrder(id)
      s = get()
    }
    if (s.order?.id !== id) {
      s.switchJob(id)
      s = get()
    }
    if (!s.order || s.order.id !== id) return null
    set({ screen: 'bench' })
    if (s.build) return []
    const missing = checkInventory(s.inventory, s.order).filter((c) => !c.ok)
    if (missing.length) return missing
    if (!s.mount)
      s.setMount(s.order.mount ?? firstMount(CASES[s.inventory.case!.id].mounts, s.inventory))
    get().startBuild()
    return []
  },
  startBuild: () => {
    let s = get()
    // mount đang chọn case không làm được (đổi case / dữ liệu case đổi): về mount hợp lệ đầu tiên
    if (
      s.order &&
      s.inventory.case &&
      s.mount &&
      !CASES[s.inventory.case.id].mounts.includes(s.mount)
    ) {
      set({ mount: firstMount(CASES[s.inventory.case.id].mounts, s.inventory, s.order.mount) })
      s = get()
    }
    if (s.result) return s.toast('Đơn này đã giao rồi', 'bad')
    // phải mang thùng đơn đặt lên bàn build trước (đơn build thử dev thì thôi)
    if (s.order && !onBench(s))
      return s.toast('Mang thùng đơn (kệ ngoài cửa / kệ cất đơn) đặt lên bàn build trước đã', 'bad')
    if (s.build) return set({ screen: 'bench' })
    if (!s.order || !s.mount || !checkInventory(s.inventory, s.order).every((c) => c.ok))
      return s.toast('Chưa đủ linh kiện!', 'bad')
    if (isPlateless(s.inventory.plate) && !PLATELESS_MOUNTS.includes(s.mount))
      return s.toast('Plateless chỉ lắp kiểu Tray mount', 'bad')
    set({
      build: newBuild(),
      ctx: buildContext(s.order, s.inventory, s.mount),
      screen: 'bench',
      windows: [],
      viewFlip: false,
      history: [],
      future: [],
      supplyUsed: {},
    })
  },
})
