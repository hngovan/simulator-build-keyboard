import type { StateCreator } from 'zustand'
import {
  BUYBACK_DAYS,
  BUYBACK_MARKUP,
  BUYBACK_REFUSE,
  BUYBACK_REP,
  STEAL_OK,
  botTurn,
  buybackReply,
  sourceTitle,
  type Listing,
  type ListingSource,
  type Stolen,
} from '@/data/selling'
import { addPart, without } from './spare'
import type { GameState } from '.'

// Shop tự đăng bán ở Hội Phím Cơ (đồ kho chung / phím của khách) + chuộc lại phím khách bị lộ.
// listings / stolen lưu trong Profile (xem persistence.ts)
export interface SellSlice {
  /** đăng bán: lấy món khỏi kho chung / đơn đã đóng gói. `index` = vị trí trong spare.items (món kind 'item') */
  postListing: (src: ListingSource, price: number, index?: number) => void
  /** gỡ bài: trả món về chỗ cũ */
  unlist: (id: string) => void
  /** 1 bot ghé 1 bài ngẫu nhiên (hỏi han / trả giá), gọi định kỳ khi đang xem tab bài của mình */
  botVisit: () => void
  /** bán cho người trả giá ở dòng bình luận `line` */
  sellListing: (id: string, line: number) => void
  /** inbox người mua xin chuộc lại phím của khách */
  buyBack: (id: string) => void
  /** hết ngày: phím của khách chưa bán trả về đơn chờ gửi, vụ chuộc quá hạn thì mất */
  closeSellDay: (day: number) => void
}

let seq = 0
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`

/** trả món của bài đăng về kho chung / danh sách chờ gửi */
function restore(s: GameState, src: ListingSource): Partial<GameState> {
  switch (src.kind) {
    case 'item':
      return { spare: addPart(s.spare, src.cat, src.item) }
    case 'switch':
      return { spare: addPart(s.spare, 'switch', { type: src.type, count: src.count }) }
    case 'stab':
      return { spare: addPart(s.spare, 'stab', src.item) }
    case 'customer':
      return { packed: [...s.packed, { ...src.packed, shipped: false }] }
  }
}

export const createSellSlice: StateCreator<GameState, [], [], SellSlice> = (set, get) => ({
  postListing: (src, price, index) => {
    const s = get()
    if (s.isMarketBanned()) return s.toast('Bạn đang bị ban khỏi chợ', 'bad')
    if (price <= 0) return s.toast('Nhập giá bán trước đã', 'bad')
    let patch: Partial<GameState>
    switch (src.kind) {
      case 'item':
        if (index === undefined || s.spare.items[index]?.item !== src.item) return
        patch = { spare: { ...s.spare, items: s.spare.items.filter((_, i) => i !== index) } }
        break
      case 'switch':
        patch = { spare: { ...s.spare, switches: without(s.spare.switches, src.type) } }
        break
      case 'stab':
        patch = { spare: { ...s.spare, stabs: without(s.spare.stabs, src.type) } }
        break
      case 'customer':
        patch = {
          packed: s.packed.filter((p) => p.order.id !== src.packed.order.id || p.shipped),
        }
    }
    const listing: Listing = {
      id: newId('ls'),
      title: sourceTitle(src),
      price,
      day: s.day,
      src,
      log: [],
    }
    set({ ...patch, listings: [listing, ...s.listings] })
    s.toast(`📣 Đã đăng bán: ${listing.title} · ${price}k`, 'good')
  },
  unlist: (id) => {
    const s = get()
    const l = s.listings.find((x) => x.id === id)
    if (!l) return
    set({ ...restore(s, l.src), listings: s.listings.filter((x) => x !== l) })
    s.toast(`Đã gỡ bài, ${l.title} về lại chỗ cũ`, 'info')
  },
  botVisit: () => {
    const s = get()
    if (!s.listings.length) return
    const l = s.listings[Math.floor(Math.random() * s.listings.length)]
    const line = botTurn(l)
    if (!line) return
    set({ listings: s.listings.map((x) => (x === l ? { ...x, log: [...x.log, line] } : x)) })
  },
  sellListing: (id, lineIdx) => {
    const s = get()
    const l = s.listings.find((x) => x.id === id)
    const line = l?.log[lineIdx]
    if (!l || !line?.offer) return
    const money = s.money + line.offer
    const listings = s.listings.filter((x) => x !== l)
    if (l.src.kind !== 'customer') {
      set({ money, listings })
      return s.toast(`💸 Đã bán ${l.title} cho ${line.name}: +${line.offer}k`, 'good')
    }
    // phím của khách: hiếm khi khách quên, còn lại bị lộ
    const packed = l.src.packed
    if (Math.random() < STEAL_OK) {
      set({ money, listings })
      return s.notify(
        '😏 Thoát nạn',
        `Bán phím của ${packed.order.customer} được ${line.offer}k mà khách quên luôn, không ai phát hiện`,
      )
    }
    const stolen: Stolen = {
      id: newId('st'),
      packed,
      buyer: line.name,
      price: Math.round((line.offer * BUYBACK_MARKUP) / 10) * 10,
      day: s.day,
      status: 'open',
    }
    set({ money, listings, rep: s.rep - 1, stolen: [stolen, ...s.stolen] })
    s.notify(
      '🚨 Bị lộ bán phím của khách',
      `${packed.order.customer} phát hiện phím của mình bị bán cho ${line.name}: −1 uy tín. Vào Hội Phím Cơ → Bài của tôi để chuộc lại`,
    )
  },
  buyBack: (id) => {
    const s = get()
    const st = s.stolen.find((x) => x.id === id && x.status === 'open')
    if (!st) return
    if (s.money < st.price) return s.toast('Không đủ tiền chuộc lại!', 'bad')
    const ok = Math.random() >= BUYBACK_REFUSE
    const reply = buybackReply(ok)
    const done = (patch: Partial<Stolen>) =>
      s.stolen.map((x) => (x === st ? { ...x, ...patch, reply } : x))
    if (!ok) {
      set({ stolen: done({ status: 'lost' }) })
      return s.toast(`${st.buyer}: "${reply}"`, 'bad')
    }
    set({
      money: s.money - st.price,
      rep: s.rep + BUYBACK_REP,
      stolen: done({ status: 'returned' }),
      packed: [...s.packed, { ...st.packed, shipped: false }],
    })
    s.toast(
      `🙏 Chuộc lại phím của ${st.packed.order.customer} (−${st.price}k, +${BUYBACK_REP} uy tín), gửi khách ở Mezzenger`,
      'good',
    )
  },
  closeSellDay: (day) => {
    const s = get()
    const back = s.listings.filter((l) => l.src.kind === 'customer')
    let patch: Partial<GameState> = {}
    for (const l of back) patch = { ...patch, ...restore({ ...s, ...patch } as GameState, l.src) }
    set({
      ...patch,
      listings: s.listings.filter((l) => !back.includes(l)),
      // người mua giữ phím quá hạn thì bán đi mất, không chuộc được nữa
      stolen: s.stolen.map((x) =>
        x.status === 'open' && day - x.day > BUYBACK_DAYS
          ? { ...x, status: 'lost', reply: 'Bán cho người khác rồi, đừng tìm nữa' }
          : x,
      ),
    })
    if (back.length)
      s.toast(
        `Hết ngày chưa bán được ${back.length} phím của khách, đã trả về để gửi khách`,
        'info',
      )
  },
})
