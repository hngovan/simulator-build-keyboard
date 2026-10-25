import type { StateCreator } from 'zustand'
import { groupPosts, randomOffers } from '@/data/orders'
import { buildContext } from '@/data/steps'
import {
  CASES,
  CATS,
  TOOLS,
  checkInventory,
  itemName,
  stabStock,
  addStab,
  stabTotal,
  type InventoryCheck,
} from '@/data/parts'
import { SUPPLIES } from '@/data/supplies'
import type {
  CaseItem,
  DeliveryResult,
  GroupPost,
  Inventory,
  Order,
  PartCategory,
  PartItem,
  StabItem,
  SupplyItem,
  SwitchItem,
  ToolItem,
  ToolKind,
} from '@/types'
import type { GameState } from '.'
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
import { BAN_DAYS, FLAW_TEXT, dealFloor, negotiate, type InboxAction } from '@/data/market'
import type { Job, JobSession, PackedOrder } from './persistence'
import { addPart, fillFromStock, stashAll, without } from './spare'

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
  /** đơn đã từ chối hôm nay (hội thoại vẫn còn ở Mezzenger tới hết ngày) */
  rejected: Order[]
  /** chuyển sang làm 1 đơn đã nhận (đơn đang làm dở được cất lại nguyên trạng) */
  switchJob: (id: string) => void
  /** đơn đã đóng gói hôm nay, chờ kết thúc ngày mới gửi cho khách */
  packed: PackedOrder[]
  /** gửi 1 đơn đã đóng gói cho khách ngay: cộng tiền + uy tín */
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
  useSupply: (id: string, n: number) => boolean
  setLubePick: (kind: keyof LubePick, id: string) => void
  /** loại thiếc đang dùng ở bước hàn */
  solderPick: string
  setSolderPick: (id: string) => void
  setMount: (mount: string) => void
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
const CANCEL_AFTER = 3

/** Kho đồ ban đầu của 1 đơn: món khách gửi trong kit */
function freshSession(order: Order, day: number): JobSession {
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
/** Cất đơn đang làm (nếu có) thành 1 job */
const stashActive = (s: GameState): Job[] =>
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
  lubePick: { switch: 'g0', housing: 'g2', wire: 'bdz', spring: 'gpl105' },
  solderPick: 'solder6337',

  // ---------- đơn hàng ----------
  acceptOrder: (id) => {
    const s = get()
    const offer = s.offers.find((o) => o.id === id)
    if (!offer) return
    const order = { ...offer, dueDay: s.day + offer.days }
    const offers = s.offers.filter((o) => o.id !== id)
    // chứng chỉ thợ: thu nhập cơ bản cộng ngay vào ví mỗi lần nhận đơn
    const bonus = certBonus(s.tools.cert ?? 0)
    if (bonus) {
      set({ money: s.money + bonus })
      s.toast(`+${bonus}k thu nhập cơ bản (${TOOLS.cert[s.tools.cert].name})`, 'good')
    }
    // chưa làm đơn nào thì làm luôn đơn này, không thì xếp vào danh sách chờ
    // (vừa giao xong thì cũng xếp chờ: phải bấm kết thúc ngày để sang ngày mới)
    if (!s.order) {
      const job = freshSession(order, s.day)
      set({ offers, order, ...job, ctx: null, result: null, pressed: {}, future: [] })
      s.toast('Đã nhận đơn! Mở Shopii hoặc Hội Phím Cơ để mua linh kiện', 'good')
      get().fillActive()
    } else {
      set({ offers, jobs: [...s.jobs, { order, session: freshSession(order, s.day) }] })
      s.toast(`Đã nhận đơn của ${order.customer}, hạn ngày ${order.dueDay}`, 'good')
    }
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
  switchJob: (id) => {
    const s = get()
    if (s.stabAnim || s.lubeAnim || s.order?.id === id) return
    if (s.result) return s.toast('Bấm "Kết thúc ngày" trước rồi làm đơn tiếp nhé', 'bad')
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
      screen: 'pc',
    })
    s.toast(`Chuyển sang đơn của ${order.customer}`)
    get().fillActive()
  },
  shipOrder: (id) => {
    const s = get()
    const p = s.packed.find((x) => x.order.id === id && !x.shipped)
    if (!p) return
    const gain = p.result.reimburse + p.result.labor
    set({
      packed: s.packed.map((x) => (x === p ? { ...x, shipped: true } : x)),
      money: s.money + gain,
      rep: s.rep + shipRep(p.result),
      done: s.done + 1,
    })
    s.addReviews([shipReview(p.order, p.result, s.day)])
    s.toast(`📦 Đã gửi đơn ${p.order.customer}: ${'★'.repeat(p.result.stars)} · +${gain}k`, 'good')
  },
  // sang ngày mới: gửi nốt đơn đã đóng gói, đợt đơn mới, đơn chờ quá hạn lâu thì khách huỷ
  nextDay: () => {
    const s = get()
    // gửi các đơn đã đóng gói chưa gửi: khách hoàn tiền linh kiện + trả công, chấm sao → uy tín
    let money = s.money
    let repGain = 0
    const unsent = s.packed.filter((p) => !p.shipped)
    for (const p of unsent) {
      money += p.result.reimburse + p.result.labor
      repGain += shipRep(p.result)
      s.toast(
        `📦 Đã gửi đơn ${p.order.customer}: ${'★'.repeat(p.result.stars)} · +${p.result.reimburse + p.result.labor}k`,
        'good',
      )
    }
    const day = s.day + 1
    const cancelled = s.jobs.filter((j) => day - (j.order.dueDay ?? day) > CANCEL_AFTER)
    const rep = s.rep + repGain - cancelled.length * 3
    set({
      lastSolderPurchase: null,
      equipSolder: (level) => {
        const s = get()
        const owned = {
          ...s.solderOwned,
          ...(s.tools.solder > 0 ? { [s.tools.solder]: s.wear.solder ?? 0 } : {}),
        }
        if (owned[level] === undefined || !TOOLS.solder[level] || TOOLS.solder[level].none)
          return false
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
        s.toast(
          `Đã hoàn tác mua ${TOOLS.solder[purchase.level].name}, hoàn ${purchase.cost}k`,
          'good',
        )
      },
      offers: randomOffers(rep),
      // chợ Hội Phím Cơ qua ngày mới: bỏ bài cũ, đăng đợt hàng mới cho từng đơn đang làm / đang chờ
      jobs: s.jobs
        .filter((j) => !cancelled.includes(j))
        .map((j) => ({ ...j, session: { ...j.session, posts: groupPosts(j.order, day) } })),
      // đơn đang làm dở (chưa đóng gói) vẫn giữ để làm tiếp ngày mai
      order: s.result ? null : s.order,
      posts: s.order && !s.result ? groupPosts(s.order, day) : [],
      result: null,
      packed: [],
      money,
      // khách huỷ: switch / stab đã mua cho đơn đó cất vào đồ dư
      spare: cancelled.reduce(
        (sp, j) => stashAll(sp, j.session.inventory, j.session.provided),
        s.spare,
      ),
      done: s.done + unsent.length,
      ...(s.result ? { build: null, ctx: null } : {}),
      day,
      rep,
      rejected: [],
      screen: 'pc',
    })
    for (const j of cancelled)
      s.toast(`😡 ${j.order.customer} huỷ đơn vì trễ hạn quá lâu (−3 uy tín)`, 'bad')
    if (get().order || get().jobs.length) s.toast('🛒 Hội Phím Cơ có đợt hàng pass mới hôm nay')
    s.addReviews([
      ...unsent.map((p) => shipReview(p.order, p.result, s.day)),
      ...cancelled.map((j) => cancelReview(j.order, s.day, -3)),
    ])
  },

  // ---------- mua sắm ----------
  buy: (cat, item, price, scamRate = 0) => {
    const s = get()
    const fail = (msg: string): BuyResult => (s.toast(msg, 'bad'), 'fail')
    if (!s.order || s.result) return fail('Nhận đơn trước rồi hãy mua đồ nhé')
    if (s.provided[cat]) return fail('Khách đã gửi món này trong kit rồi')
    if (s.build && KIT_PARTS.includes(cat as (typeof KIT_PARTS)[number]))
      return fail('Đã bắt đầu build, không thay được món này nữa')
    const sw = item as SwitchItem
    if (
      cat === 'switch' &&
      s.inventory.switch &&
      s.inventory.switch.type !== sw.type &&
      s.build &&
      Object.keys(s.build.switches).length
    )
      return fail('Board đã cắm switch loại khác, không trộn được')
    if (s.money < price) return fail('Không đủ tiền!')
    set({ money: s.money - price })
    if (Math.random() < scamRate) {
      s.toast(`😱 Seller bùng hàng! Mất trắng ${price}k`, 'bad')
      return 'scam'
    }
    let value: PartItem = item
    let spare = s.spare
    if (cat === 'switch' && s.inventory.switch?.type === sw.type)
      value = { ...sw, count: s.inventory.switch.count + sw.count }
    // stab cùng loại thì cộng dồn (bộ + lẻ), khác loại thì thay bộ cũ
    const st = item as StabItem
    if (cat === 'stab' && s.inventory.stab?.type === st.type) {
      const have = stabStock(s.inventory.stab)
      const add = stabStock(st)
      value = { type: st.type, ...addStab(have, add) }
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
      fromSpare = spare.switches[sw.type]
      value = { ...(value as SwitchItem), count: (value as SwitchItem).count + fromSpare }
      spare = { ...spare, switches: without(spare.switches, sw.type) }
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
      ...(cat === 'case' ? { mount: CASES[(item as CaseItem).id].mounts[0] } : {}),
    })
    s.toast(
      `📦 Đã nhận: ${itemName(cat, item)}${fromSpare ? ` (+${fromSpare} trong kho chung)` : ''}`,
      'good',
    )
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
      item = { type: id, count: spare.switches[id] }
      spare = { ...spare, switches: without(spare.switches, id) }
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
      (cat === 'switch' || (cat === 'stab' && !(item as StabItem).flaw)) &&
      (cur as { type?: string } | null)?.type === (item as { type: string }).type
    if (cat === 'switch' && cur && !same && s.build && Object.keys(s.build.switches).length)
      return s.toast('Board đã cắm switch loại khác, không trộn được', 'bad')
    if (same && cat === 'switch')
      item = {
        ...(item as SwitchItem),
        count: (item as SwitchItem).count + (cur as SwitchItem).count,
      }
    else if (same) {
      const x = stabStock(cur as StabItem)
      const y = stabStock(item as StabItem)
      item = { type: (item as StabItem).type, ...addStab(x, y) }
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
    if (next.deal?.ban && !post.deal?.ban) {
      set({ marketBanUntil: s.day + BAN_DAYS })
      s.notify(
        '🚫 Bị ban khỏi chợ',
        `Bạn đã bị ban khỏi Hội Phím Cơ ${BAN_DAYS} ngày (tới ngày ${s.day + BAN_DAYS}) vì đi ăn xin người bán ${post.seller}`,
      )
    }
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
    const res =
      cat === 'supply' || cat === 'spell'
        ? s.buySupply((post.opt.item as SupplyItem).id, (post.opt.item as SupplyItem).n, cost, scam)
        : cat === 'tool' || cat === 'cert'
          ? s.buyTool(
              (post.opt.item as ToolItem).kind,
              (post.opt.item as ToolItem).level,
              cost,
              scam,
            )
          : s.buy(cat, item, cost, scam)
    if (res === 'ok' && post.cond === 'dead' && cat === 'switch')
      s.toast(
        `😵 Nhận hàng mới thấy chết ${(post.opt.item as SwitchItem).count - (item as SwitchItem).count} con switch`,
        'bad',
      )
    else if (res === 'ok' && flaw) s.toast(`😬 Nhận hàng mới thấy lỗi: ${flaw}`, 'bad')
    if (res !== 'fail')
      set((s) => ({ posts: s.posts.map((p) => (p.id === post.id ? { ...p, sold: true } : p)) }))
    return res
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
  setMount: (mount) => {
    if (!get().build) set({ mount })
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
    // thiếu đồ thì giữ bảng chọn đơn mở để hiện danh sách còn thiếu
    set({ screen: 'bench' })
    if (s.build) return (set({ benchPicker: false }), [])
    const missing = checkInventory(s.inventory, s.order).filter((c) => !c.ok)
    if (missing.length) return missing
    if (!s.mount) s.setMount(s.order.mount ?? CASES[s.inventory.case!.id].mounts[0])
    set({ benchPicker: false })
    get().startBuild()
    return []
  },
  startBuild: () => {
    const s = get()
    if (s.result) return s.toast('Đơn này đã giao rồi', 'bad')
    if (s.build) return set({ screen: 'bench' })
    if (!s.order || !s.mount || !checkInventory(s.inventory, s.order).every((c) => c.ok))
      return s.toast('Chưa đủ linh kiện!', 'bad')
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
