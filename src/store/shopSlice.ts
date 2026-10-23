import type { StateCreator } from 'zustand'
import { groupPosts, randomOrder } from '@/data/orders'
import { buildContext } from '@/data/steps'
import { CASES, TOOLS, checkInventory, itemName } from '@/data/parts'
import { SUPPLIES } from '@/data/supplies'
import type {
  CaseItem,
  DeliveryResult,
  GroupPost,
  Inventory,
  Order,
  PartCategory,
  PartItem,
  SupplyItem,
  SwitchItem,
  ToolItem,
  ToolKind,
} from '@/types'
import type { GameState } from '.'
import { newBuild } from './buildSlice'

export type BuyResult = 'ok' | 'scam' | 'fail'
export interface LubePick {
  switch: string
  housing: string
  wire: string
  spring: string
}

// Đơn hàng, kho đồ, mua sắm (Shopii, Hội Phím Cơ, Tiệm Đồ Nghề)
export interface ShopSlice {
  offer: Order | null
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
  acceptOrder: () => void
  declineOrder: () => void
  nextDay: () => void
  buy: (cat: PartCategory, item: PartItem, price: number, scamRate?: number) => BuyResult
  buyPost: (post: GroupPost) => BuyResult
  buySupply: (id: string, n: number, price: number, scamRate?: number) => BuyResult
  buyTool: (kind: ToolKind, level: number, price?: number, scamRate?: number) => BuyResult
  useSupply: (id: string, n: number) => boolean
  setLubePick: (kind: keyof LubePick, id: string) => void
  setMount: (mount: string) => void
  startBuild: () => void
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

export const createShopSlice: StateCreator<GameState, [], [], ShopSlice> = (set, get) => ({
  offer: randomOrder(),
  order: null,
  inventory: emptyInventory(),
  provided: {},
  spent: 0,
  posts: [],
  mount: null,
  result: null,
  lubePick: { switch: 'g0', housing: 'g2', wire: 'bdz', spring: 'gpl105' },

  // ---------- đơn hàng ----------
  acceptOrder: () => {
    const offer = get().offer
    if (!offer) return
    const inventory = emptyInventory()
    const provided: ShopSlice['provided'] = {}
    if (offer.kit) {
      for (const cat of KIT_PARTS) {
        const part = offer.kit[cat]
        if (part) {
          ;(inventory[cat] as PartItem) = part
          provided[cat] = true
        }
      }
    }
    set({
      order: offer,
      offer: null,
      inventory,
      provided,
      spent: 0,
      posts: groupPosts(offer),
      build: null,
      ctx: null,
      mount: offer.mount ?? (offer.kit ? CASES[offer.kit.case.id].mounts[0] : null),
      result: null,
      pressed: {},
    })
    get().toast('Đã nhận đơn! Mở Shopii hoặc Hội Phím Cơ để mua linh kiện', 'good')
  },
  declineOrder: () => set({ offer: randomOrder() }),
  nextDay: () =>
    set((s) => ({
      offer: randomOrder(),
      order: null,
      result: null,
      build: null,
      ctx: null,
      day: s.day + 1,
      screen: 'pc',
    })),

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
    if (cat === 'switch' && s.inventory.switch?.type === sw.type)
      value = { ...sw, count: s.inventory.switch.count + sw.count }
    set({
      inventory: { ...s.inventory, [cat]: value },
      spent: s.spent + price,
      ...(cat === 'case' ? { mount: CASES[(item as CaseItem).id].mounts[0] } : {}),
    })
    s.toast(`📦 Đã nhận: ${itemName(cat, item)}`, 'good')
    return 'ok'
  },
  buyPost: (post) => {
    const s = get()
    const cat = post.product.cat
    const res =
      cat === 'supply'
        ? s.buySupply(
            (post.opt.item as SupplyItem).id,
            (post.opt.item as SupplyItem).n,
            post.price,
            0.2,
          )
        : cat === 'tool'
          ? s.buyTool(
              (post.opt.item as ToolItem).kind,
              (post.opt.item as ToolItem).level,
              post.price,
              0.2,
            )
          : s.buy(cat, post.opt.item as PartItem, post.price, 0.2)
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
    if (s.tools[kind] >= level)
      return (s.toast('Bạn đã có dụng cụ này hoặc bản tốt hơn', 'bad'), 'fail')
    if (s.money < cost) return (s.toast('Không đủ tiền!', 'bad'), 'fail')
    set({ money: s.money - cost })
    if (Math.random() < scamRate)
      return (s.toast(`😱 Seller bùng hàng! Mất trắng ${cost}k`, 'bad'), 'scam')
    set({ tools: { ...get().tools, [kind]: level } })
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
  setMount: (mount) => {
    if (!get().build) set({ mount })
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
      supplyUsed: {},
    })
  },
})
