// Shop tự đăng bán ở Hội Phím Cơ: đồ trong kho chung hoặc phím của khách (đơn đã đóng gói chưa gửi).
// Bot vào bình luận hỏi han, trả giá; phím của khách bán đi thì 5% khách quên, còn lại bị lộ (−1 uy tín),
// phím nằm ở người mua, inbox chuộc lại được (có người không cho chuộc).
import {
  CASES,
  KEYCAP_KITS,
  KEYCAP_MATERIALS,
  PCB_TYPES,
  PLATES,
  SIZE_MULT,
  STABS,
  SWITCHES,
  itemName,
  keycapMaterialOf,
  stabStock,
  stabText,
} from './parts'
import { LAYOUTS } from './layouts'
import type { PackedOrder } from '@/store/persistence'
import type {
  CaseItem,
  KeycapItem,
  PartCategory,
  PartItem,
  PcbItem,
  PlateItem,
  StabItem,
  SwitchItem,
} from '@/types'

/** khách không phát hiện phím bị bán (quên luôn) */
export const STEAL_OK = 0.05
/** người mua không cho chuộc lại */
export const BUYBACK_REFUSE = 0.3
/** chuộc lại đắt hơn giá đã bán */
export const BUYBACK_MARKUP = 1.3
/** chuộc được phím trả khách thì cộng uy tín (bù −1 lúc bị lộ, thêm +1 vì biết sửa sai) */
export const BUYBACK_REP = 2
/** người mua giữ phím bao nhiêu ngày, quá thì bán đi mất */
export const BUYBACK_DAYS = 3
/** số dòng bình luận tối đa mỗi bài */
const MAX_LOG = 10

/** nguồn của bài đăng (lưu nguyên món để gỡ bài thì trả lại chỗ cũ) */
export type ListingSource =
  | { kind: 'item'; cat: PartCategory; item: PartItem }
  | { kind: 'switch'; type: string; count: number }
  | { kind: 'stab'; type: string; item: StabItem }
  | { kind: 'customer'; packed: PackedOrder }

export interface ListingLine {
  name: string
  text: string
  /** bot trả giá (k): bấm để bán cho người này */
  offer?: number
}

export interface Listing {
  id: string
  title: string
  price: number
  day: number
  src: ListingSource
  log: ListingLine[]
}

/** vụ bán phím của khách bị lộ: phím đang ở người mua, chuộc lại để gửi khách */
export interface Stolen {
  id: string
  packed: PackedOrder
  buyer: string
  /** giá chuộc (k) */
  price: number
  day: number
  status: 'open' | 'returned' | 'lost'
  /** câu người mua trả lời khi inbox chuộc */
  reply?: string
}

const r10 = (n: number) => Math.max(10, Math.round(n / 10) * 10)
const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

/** giá mua mới ước tính của 1 món (k) */
function newPrice(cat: PartCategory, item: PartItem): number {
  switch (cat) {
    case 'case':
      return CASES[(item as CaseItem).id].price
    case 'pcb': {
      const it = item as PcbItem
      return PCB_TYPES[it.type].price * SIZE_MULT[it.layout]
    }
    case 'plate': {
      const it = item as PlateItem
      return PLATES[it.material].price * SIZE_MULT[it.layout]
    }
    case 'keycap': {
      const it = item as KeycapItem
      return KEYCAP_KITS[it.kit].price * KEYCAP_MATERIALS[keycapMaterialOf(it)].mult
    }
    case 'switch': {
      const it = item as SwitchItem
      return (SWITCHES[it.type].price10 * it.count) / 10
    }
    case 'stab': {
      const c = stabStock(item as StabItem)
      const p = STABS[(item as StabItem).type].price
      return p * 0.16 * c.short + p * 0.3 * (c.long + c.long7)
    }
  }
}

/** giá chợ (k): đồ cũ ~70% giá mới, hàng lỗi rẻ hơn; phím của khách đã build xong ~ budget linh kiện */
export function sourceValue(src: ListingSource): number {
  if (src.kind === 'customer') return r10(src.packed.order.budget * 0.95)
  const [cat, item]: [PartCategory, PartItem] =
    src.kind === 'item'
      ? [src.cat, src.item]
      : src.kind === 'switch'
        ? ['switch', { type: src.type, count: src.count }]
        : ['stab', src.item]
  const flaw = (item as { flaw?: string }).flaw
  return r10(newPrice(cat, item) * (flaw ? 0.45 : 0.7))
}

export function sourceTitle(src: ListingSource): string {
  switch (src.kind) {
    case 'item':
      return itemName(src.cat, src.item)
    case 'switch':
      return itemName('switch', { type: src.type, count: src.count })
    case 'stab':
      return `Stab ${STABS[src.type].name} (${stabText(stabStock(src.item))})`
    case 'customer': {
      const o = src.packed.order
      return `Phím ${LAYOUTS[o.layout].name} build sẵn (của ${o.customer})`
    }
  }
}

const BUYERS = [
  'Long Keeb',
  'Vy Thích Phím',
  'Đạt Clack',
  'Hà Mod Stab',
  'Phúc Endgame',
  'Linh Keycap',
  'Toàn Săn Deal',
  'Khoa Newbie',
  'Ngọc Thock',
  'Duy Gom Hàng',
]
const QUESTIONS = [
  'Còn không bác?',
  'Hàng zin không bác, có flaw gì không?',
  'Fs không shop?',
  'Có hình thật không bác ơi',
  'Ib em giá chốt nhé',
  'Chấm hóng',
  'Bảo hành gì không bác?',
  'Up phát cho bài lên top',
]
const EXPENSIVE = ['Giá chát quá bác ơi', 'Ngáo giá à bác 😅', 'Shopii còn rẻ hơn kìa']

/** 1 lượt bot ghé bài: hỏi han hoặc trả giá (giá đăng cao quá thì toàn chê / trả thấp); null = không ai ghé */
export function botTurn(l: Listing): ListingLine | null {
  if (l.log.length >= MAX_LOG) return null
  const value = sourceValue(l.src)
  const ratio = l.price / value
  const name = pick(BUYERS)
  if (ratio > 1.4 && Math.random() < 0.5) return { name, text: pick(EXPENSIVE) }
  if (Math.random() < 0.45) return { name, text: pick(QUESTIONS) }
  // trả giá: quanh giá chợ, không quá giá đăng; đăng rẻ thì có người chốt luôn đúng giá
  const offer = r10(Math.min(l.price, value * (0.6 + Math.random() * 0.45)))
  return offer >= l.price
    ? { name, text: `Chốt ${offer}k nhé bác, em lấy luôn`, offer }
    : { name, text: `${offer}k được không bác?`, offer }
}

/** người mua phím của khách khi shop inbox xin chuộc lại */
export function buybackReply(ok: boolean) {
  return ok
    ? pick(['Ok bác, chuyển khoản đi em gửi lại', 'Thôi trả lại cho bác, lần sau đừng thế nữa'])
    : pick(['Không giữ, mất rồi đừng tìm', 'Bán lại cho người khác rồi, đừng tìm nữa'])
}
