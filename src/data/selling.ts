// Shop tự đăng bán ở Hội Phím Cơ: đồ trong kho chung, linh kiện của đơn đã nhận (chưa build) hoặc phím của khách
// (đơn đã đóng gói chưa gửi). Bài giá cố định: bot vào bình luận hỏi han, up bài, trả giá; đăng cao hơn giá gốc
// tới RICH_MAX lần thì đêm có thể gặp đại gia chốt đúng giá. Fast bid: chạy BID_MS, ai trả cao nhất thì mua.
// Phím của khách bán đi thì 5% khách quên, còn lại bị lộ (−1 uy tín), inbox chuộc lại được (có người không cho chuộc).
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
  BuildState,
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
/** chuộc lại đắt hơn giá đã bán: ×1.1 ~ ×1.3 tuỳ người mua */
export const BUYBACK_MARKUP: [number, number] = [1.1, 1.3]
/** chuộc được phím trả khách thì +1 uy tín (gỡ lại đúng phần bị trừ lúc lộ) */
export const BUYBACK_REP = 1
/** người mua giữ phím bao nhiêu ngày, quá thì bán đi mất */
export const BUYBACK_DAYS = 3
/** số dòng bình luận tối đa mỗi bài */
const MAX_LOG = 12
/** đăng tới mức này × giá gốc vẫn có đại gia chốt (mỗi đêm tối đa 1 đại gia) */
export const RICH_MAX = 1.4
/** tỉ lệ gặp đại gia chốt mỗi đêm cho 1 bài giá trên giá chợ (tới RICH_MAX × giá gốc), mỗi bậc thợ cộng RICH_CERT */
export const RICH_BASE = 0.15
export const RICH_CERT = 0.05
/** đăng quá mức này × giá gốc thì bot hay chê */
export const PRICEY = 1.2
/** bán hàng lỗi bị phát hiện mô tả sai sự thật → admin ban chợ */
export const FLAW_CAUGHT = 0.1
/** gỡ bài quá số lần này trong 1 ngày thì admin ban chợ (spam đăng / gỡ) */
export const UNLIST_FREE = 3
/** bài bid chạy bao lâu (ms) */
export const BID_MS = 60_000
/** bước giá bid chọn được (k) */
export const BID_STEPS = [10, 50, 100]

/** tag gắn vào bài đăng (badge trên bài, ảnh hưởng người mua) */
export type ListingTag = 'fs' | 'firm' | 'lowball' | 'test'
export const LISTING_TAGS: Record<
  ListingTag,
  { label: string; tone: 'green' | 'red' | 'yellow' | 'blue'; hint: string }
> = {
  fs: { label: 'Free ship', tone: 'green', hint: 'Bao ship: người mua thích hơn, trả nhỉnh hơn' },
  firm: { label: 'Price no offer', tone: 'red', hint: 'Không trả giá: chỉ ai chốt đúng giá' },
  lowball: {
    label: 'Lowball thoải mái',
    tone: 'yellow',
    hint: 'Nhiều người trả giá nhưng trả thấp',
  },
  test: { label: 'Bao test', tone: 'blue', hint: 'Cho test thoải mái: người mua yên tâm hơn' },
}

/** nguồn của bài đăng (lưu nguyên món để gỡ bài thì trả lại chỗ cũ) */
export type ListingSource =
  | { kind: 'item'; cat: PartCategory; item: PartItem }
  | { kind: 'switch'; type: string; count: number }
  | { kind: 'stab'; type: string; item: StabItem }
  | { kind: 'customer'; packed: PackedOrder }
  /** linh kiện trong kho của 1 đơn đã nhận (chưa build), kể cả món khách gửi */
  | {
      kind: 'job'
      orderId: string
      customer: string
      cat: PartCategory
      item: PartItem
      provided?: boolean
    }

export interface ListingLine {
  name: string
  text: string
  /** bot trả giá (k): bấm để bán cho người này */
  offer?: number
}

export interface Bid {
  start: number
  step: number
  /** Date.now() lúc hết giờ */
  endsAt: number
  /** giá cao nhất người mua chịu trả (ẩn, định sẵn lúc đăng); < start = không ai bid */
  cap: number
  top?: { name: string; amount: number }
}

export interface Listing {
  id: string
  title: string
  /** bài bid: giá khởi điểm */
  price: number
  day: number
  src: ListingSource
  log: ListingLine[]
  /** tag bài (bản lưu cũ không có) */
  tags?: ListingTag[]
  /** bài bid (không có = giá cố định) */
  bid?: Bid
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

/**
 * Món trong kho của 1 đơn đã nhận còn đem bán được không: chưa vào bàn build thì món nào cũng bán được (kể cả đồ khách gửi);
 * đã vào bàn build thì case / PCB / plate / stab đã nằm trên bàn (đã assem), chỉ còn switch lẻ chưa cắm và keycap chưa gắn phím nào
 */
export function jobPartFree(cat: PartCategory, item: PartItem, build: BuildState | null) {
  if (!build) return true
  if (cat === 'switch') return (item as SwitchItem).count > 0
  if (cat === 'keycap') return !Object.keys(build.keycaps).length
  return false
}

/** loại + món của nguồn đăng bán (phím của khách: null) */
export function sourcePart(src: ListingSource): [PartCategory, PartItem] | null {
  switch (src.kind) {
    case 'item':
    case 'job':
      return [src.cat, src.item]
    case 'switch':
      return ['switch', { type: src.type, count: src.count }]
    case 'stab':
      return ['stab', src.item]
    case 'customer':
      return null
  }
}

/** lỗi của món đem bán (hàng pass lỗi) */
export const sourceFlaw = (src: ListingSource) =>
  (sourcePart(src)?.[1] as { flaw?: string } | undefined)?.flaw

/** giá gốc (k): giá mua mới, hàng lỗi chỉ còn 1 nửa; phím của khách đã build xong = budget linh kiện */
export function sourceBase(src: ListingSource): number {
  const part = sourcePart(src)
  if (!part) return r10((src as { packed: PackedOrder }).packed.order.budget)
  return r10(newPrice(...part) * (sourceFlaw(src) ? 0.5 : 1))
}

/** giá chợ (k): đồ cũ ~70% giá gốc, phím của khách ~95% */
export const sourceValue = (src: ListingSource) =>
  r10(sourceBase(src) * (src.kind === 'customer' ? 0.95 : 0.7))

export function sourceTitle(src: ListingSource): string {
  switch (src.kind) {
    case 'item':
    case 'job':
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
  'Bảo hành gì không bác?',
]
const EXPENSIVE = [
  'Giá chát quá bác ơi',
  'Ngáo giá à bác 😅',
  'Shopii còn rẻ hơn kìa',
  'Giá này em mua mới cho lành',
]
/** up bài giúp, không mua */
const UPS = [
  'Up cho chủ thớt',
  'wtx',
  'Up phát cho bài lên top',
  'Hóng',
  'Đẹp quá, up cho bác',
  'Chấm',
]
/** khen shop có chứng chỉ thợ */
const PRAISE = [
  'Thợ xịn, nên mua nhé anh em',
  'Shop có chứng chỉ thợ, yên tâm đồ đẹp',
  'Từng nhờ shop build rồi, uy tín',
  'Đồ thợ dùng thì khỏi lo',
]
const BID_LINES = ['Bid', 'Bid nhé', 'Theo', 'Em bid', 'Lên']

/**
 * 1 lượt bot ghé bài giá cố định: hỏi han, up bài, khen thợ, chê giá hoặc trả giá; null = không ai ghé.
 * cert = bậc chứng chỉ thợ (0..2): mỗi bậc người mua tin hơn (trả nhỉnh hơn, ít chê, có người khen)
 */
export function botTurn(l: Listing, cert = 0): ListingLine | null {
  if (l.log.length >= MAX_LOG) return null
  const value = sourceValue(l.src)
  const tags = l.tags ?? []
  const ratio = l.price / sourceBase(l.src)
  const name = pick(BUYERS)
  const trust = RICH_CERT * cert
  if (ratio > PRICEY && Math.random() < (ratio > RICH_MAX ? 0.6 : 0.35) - trust)
    return { name, text: pick(EXPENSIVE) }
  if (cert && Math.random() < 0.1 + trust) return { name, text: pick(PRAISE) }
  if (Math.random() < 0.2) return { name, text: pick(UPS) }
  if (Math.random() < (tags.includes('firm') ? 0.55 : 0.3))
    return {
      name,
      text: pick(tags.includes('fs') ? QUESTIONS.filter((q) => !q.includes('Fs')) : QUESTIONS),
    }
  // trả giá quanh giá chợ, không quá giá đăng; free ship / bao test / bậc thợ trả nhỉnh hơn, lowball thoải mái trả thấp
  const lift = (tags.includes('fs') ? 0.03 : 0) + (tags.includes('test') ? 0.03 : 0) + trust
  const low = tags.includes('lowball') ? 0.45 : 0.6
  const offer = r10(Math.min(l.price, value * (low + lift + Math.random() * 0.45)))
  // price no offer: chỉ ai chốt đúng giá mới trả giá, còn lại up bài
  if (tags.includes('firm') && offer < l.price) return { name, text: pick(UPS) }
  return offer >= l.price
    ? { name, text: `Chốt ${offer}k nhé bác, em lấy luôn`, offer }
    : { name, text: `${offer}k được không bác?`, offer }
}

/** tỉ lệ đại gia chốt đúng giá trong đêm (0 nếu giá ≤ giá chợ hoặc quá RICH_MAX × giá gốc, hay là bài bid) */
export function richChance(l: Listing, cert = 0) {
  if (l.bid) return 0
  if (l.price <= sourceValue(l.src) || l.price > sourceBase(l.src) * RICH_MAX) return 0
  return RICH_BASE + RICH_CERT * cert + ((l.tags ?? []).includes('fs') ? 0.05 : 0)
}

/** giá sàn fast bid (k): người mua chắc chắn chịu trả tới mức này (= mức thấp nhất của giá trần ẩn) */
export const BID_FLOOR = 0.45
export const bidFloor = (src: ListingSource) => r10(sourceValue(src) * BID_FLOOR)

/**
 * Giá trần ẩn của fast bid: quanh giá chợ (45% → 125%), bậc thợ / tag đẩy lên; làm tròn theo bước.
 * Không bao giờ dưới giá sàn (làm tròn lên theo bước): khởi điểm ≤ giá sàn thì chắc chắn có người bid
 */
export function bidCap(src: ListingSource, step: number, cert = 0, tags: ListingTag[] = []) {
  const k =
    BID_FLOOR +
    Math.random() * 0.8 +
    RICH_CERT * cert +
    (tags.includes('fs') ? 0.03 : 0) +
    (tags.includes('test') ? 0.03 : 0)
  const floor = Math.ceil(bidFloor(src) / step) * step
  return Math.max(floor, Math.floor((sourceValue(src) * k) / step) * step)
}

/** khởi điểm cao quá giá trần: không ai bid, chỉ chê */
const BID_HIGH = [
  'Khởi điểm cao quá bác ơi',
  'Giá khởi điểm chát thế, hạ đi em vào bid',
  'Khởi điểm này mua mới luôn cho lành',
]
/** đã bid tới trần: người mua dừng */
const BID_STOP = ['Theo không nổi rồi', 'Đắt rồi, em dừng', 'Hóng xem ai chốt', 'Nhường bác kia 😅']

/**
 * 1 lượt bot ghé fast bid: trả thêm vài bước (không quá giá trần ẩn) hoặc bình luận (hỏi han / up bài; khởi điểm
 * cao quá thì chê, chạm trần thì "theo không nổi"). top = người giữ giá mới (không có = chỉ bình luận); null = không ai ghé
 */
export function bidTurn(
  l: Listing,
  now = Date.now(),
): { line: ListingLine; top?: Bid['top'] } | null {
  const b = l.bid
  if (!b || now >= b.endsAt || l.log.length >= 30) return null
  // còn xa giá trần thì người mua nhảy giá mạnh (tới ~30% khoảng còn lại), gần trần thì nhích từng bước
  const gap = Math.floor((b.cap - (b.top?.amount ?? b.start)) / b.step)
  const jump = Math.max(1, Math.round(Math.random() * gap * 0.3))
  const next = b.top ? b.top.amount + b.step * jump : b.start
  const name = pick(BUYERS.filter((n) => n !== b.top?.name))
  if (next > b.cap) {
    if (Math.random() < 0.5) return null
    return { line: { name, text: pick(b.top ? BID_STOP : BID_HIGH) } }
  }
  // thỉnh thoảng chỉ vào hỏi / up bài
  if (Math.random() < 0.2) return { line: { name, text: pick([...QUESTIONS, ...UPS]) } }
  // không tự bid đè chính mình
  return { line: { name, text: `${pick(BID_LINES)} ${next}k` }, top: { name, amount: next } }
}

/** giá chuộc lại phím của khách: ×1.1 ~ ×1.3 giá đã bán */
export const buybackPrice = (sold: number) =>
  r10(sold * (BUYBACK_MARKUP[0] + Math.random() * (BUYBACK_MARKUP[1] - BUYBACK_MARKUP[0])))

/** tên người mua ngẫu nhiên (đại gia chốt đêm) */
export const randomBuyer = () => pick(BUYERS)

/** người mua phím của khách khi shop inbox xin chuộc lại */
export function buybackReply(ok: boolean) {
  return ok
    ? pick(['Ok bác, chuyển khoản đi em gửi lại', 'Thôi trả lại cho bác, lần sau đừng thế nữa'])
    : pick(['Không giữ, mất rồi đừng tìm', 'Bán lại cho người khác rồi, đừng tìm nữa'])
}
