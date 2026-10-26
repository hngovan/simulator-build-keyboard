import type { StateCreator } from 'zustand'
import {
  BID_MS,
  BUYBACK_DAYS,
  BUYBACK_REFUSE,
  BUYBACK_REP,
  FLAW_CAUGHT,
  STEAL_OK,
  UNLIST_FREE,
  bidCap,
  bidTurn,
  botTurn,
  buybackPrice,
  buybackReply,
  randomBuyer,
  richChance,
  sourceFlaw,
  sourceTitle,
  type Listing,
  type ListingSource,
  type ListingTag,
  type Stolen,
} from '@/data/selling'
import { BAN_DAYS } from '@/data/market'
import { addPart, without } from './spare'
import type { GameState } from '.'

// Shop tự đăng bán ở Hội Phím Cơ (đồ kho chung / linh kiện đơn đã nhận / phím của khách) + chuộc lại phím khách bị lộ.
// listings / stolen / unlists lưu trong Profile (xem persistence.ts)
export interface SellSlice {
  /**
   * đăng bán: lấy món khỏi kho chung / đơn đã nhận / đơn đã đóng gói. `index` = vị trí trong spare.items (món kind 'item').
   * `bidStep` có thì là bài bid (price = giá khởi điểm, chạy BID_MS)
   */
  postListing: (
    src: ListingSource,
    price: number,
    index?: number,
    opts?: { tags?: ListingTag[]; bidStep?: number },
  ) => void
  /** gỡ bài: trả món về chỗ cũ; gỡ quá UNLIST_FREE lần / ngày thì admin ban chợ */
  unlist: (id: string) => void
  /** 1 bot ghé 1 bài ngẫu nhiên (hỏi han / up / trả giá / bid), gọi định kỳ khi đang xem tab bài của mình */
  botVisit: () => void
  /** bài bid hết giờ: bán cho người trả cao nhất (không ai bid thì trả món về) */
  settleBids: () => void
  /** bán cho người trả giá ở dòng bình luận `line` */
  sellListing: (id: string, line: number) => void
  /** inbox người mua xin chuộc lại phím của khách */
  buyBack: (id: string) => void
  /** hết ngày: đại gia chốt đêm, phím của khách chưa bán trả về đơn chờ gửi, vụ chuộc quá hạn thì mất */
  closeSellDay: (day: number) => void
  /** admin ban khỏi chợ BAN_DAYS ngày (lý do hiện ở chợ + thông báo góc phải) */
  banMarket: (why: string) => void
}

let seq = 0
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`

/** trả món của bài đăng về chỗ cũ (đơn đã nhận còn trống ô thì trả vào đơn, không thì kho chung) */
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
    case 'job': {
      const back = { [src.cat]: src.item }
      const prov = src.provided ? { [src.cat]: true as const } : {}
      if (s.order?.id === src.orderId && !s.result && !s.build && !s.inventory[src.cat])
        return {
          inventory: { ...s.inventory, ...back },
          provided: { ...s.provided, ...prov },
        }
      const job = s.jobs.find((j) => j.order.id === src.orderId)
      if (job && !job.session.build && !job.session.inventory[src.cat])
        return {
          jobs: s.jobs.map((j) =>
            j === job
              ? {
                  ...j,
                  session: {
                    ...j.session,
                    inventory: { ...j.session.inventory, ...back },
                    provided: { ...j.session.provided, ...prov },
                  },
                }
              : j,
          ),
        }
      return { spare: addPart(s.spare, src.cat, src.item) }
    }
  }
}

const certOf = (s: GameState) => s.tools.cert ?? 0

export const createSellSlice: StateCreator<GameState, [], [], SellSlice> = (set, get) => {
  /** chốt bán 1 bài: cộng tiền; hàng lỗi có thể bị tố mô tả sai; phím của khách thì hiếm khi thoát */
  const completeSale = (l: Listing, buyer: string, amount: number, how = '') => {
    const s = get()
    const money = s.money + amount
    const listings = s.listings.filter((x) => x.id !== l.id)
    if (l.src.kind !== 'customer') {
      set({ money, listings })
      s.toast(`💸 ${how}Đã bán ${l.title} cho ${buyer}: +${amount}k`, 'good')
      // hàng lỗi bán đi: người mua nhận hàng thấy lỗi, tố mô tả sai sự thật
      if (sourceFlaw(l.src) && Math.random() < FLAW_CAUGHT)
        get().banMarket(
          `${buyer} tố bài bán ${l.title} mô tả sai sự thật (giấu lỗi ${sourceFlaw(l.src)})`,
        )
      return
    }
    const packed = l.src.packed
    if (Math.random() < STEAL_OK) {
      set({ money, listings })
      return s.notify(
        '😏 Thoát nạn',
        `Bán phím của ${packed.order.customer} được ${amount}k mà khách quên luôn, không ai phát hiện`,
      )
    }
    const stolen: Stolen = {
      id: newId('st'),
      packed,
      buyer,
      price: buybackPrice(amount),
      day: s.day,
      status: 'open',
    }
    set({ money, listings, rep: s.rep - 1, stolen: [stolen, ...s.stolen] })
    s.notify(
      '🚨 Bị lộ bán phím của khách',
      `${packed.order.customer} phát hiện phím của mình bị bán cho ${buyer}: −1 uy tín. Vào Hội Phím Cơ → Bài của tôi để chuộc lại`,
    )
  }

  return {
    postListing: (src, price, index, opts = {}) => {
      const s = get()
      if (s.isMarketBanned()) return s.toast('Bạn đang bị ban khỏi chợ', 'bad')
      const bid = opts.bidStep !== undefined
      if (bid ? price < 0 : price <= 0) return s.toast('Nhập giá bán trước đã', 'bad')
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
          break
        case 'job': {
          // đã bắt đầu build thì linh kiện nằm trên bàn rồi, không bán được
          const drop = <
            T extends { inventory: GameState['inventory']; provided: GameState['provided'] },
          >(
            x: T,
          ): T => {
            const provided = { ...x.provided }
            delete provided[src.cat]
            return { ...x, inventory: { ...x.inventory, [src.cat]: null }, provided }
          }
          if (s.order?.id === src.orderId) {
            if (s.build || s.result || s.inventory[src.cat] !== src.item) return
            const { inventory, provided } = drop(s)
            patch = { inventory, provided }
          } else {
            const job = s.jobs.find((j) => j.order.id === src.orderId)
            if (!job || job.session.build || job.session.inventory[src.cat] !== src.item) return
            patch = {
              jobs: s.jobs.map((j) => (j === job ? { ...j, session: drop(j.session) } : j)),
            }
          }
        }
      }
      const tags = opts.tags ?? []
      const listing: Listing = {
        id: newId('ls'),
        title: sourceTitle(src),
        price,
        day: s.day,
        src,
        log: [],
        tags,
        ...(bid
          ? {
              bid: {
                start: price,
                step: opts.bidStep!,
                endsAt: Date.now() + BID_MS,
                cap: bidCap(src, opts.bidStep!, certOf(s), tags),
              },
            }
          : {}),
      }
      set({ ...patch, listings: [listing, ...s.listings] })
      s.toast(
        bid
          ? `🔨 Đã mở bid: ${listing.title} · khởi điểm ${price}k, bước ${opts.bidStep}k`
          : `📣 Đã đăng bán: ${listing.title} · ${price}k`,
        'good',
      )
    },
    unlist: (id) => {
      const s = get()
      const l = s.listings.find((x) => x.id === id)
      if (!l) return
      if (l.bid?.top) return s.toast('Bài bid đã có người trả giá, không gỡ được', 'bad')
      const n = (s.unlists.day === s.day ? s.unlists.n : 0) + 1
      set({
        ...restore(s, l.src),
        listings: s.listings.filter((x) => x !== l),
        unlists: { day: s.day, n },
      })
      if (n > UNLIST_FREE)
        return get().banMarket(`Gỡ bài ${n} lần trong 1 ngày (spam đăng / gỡ bài)`)
      s.toast(
        `Đã gỡ bài, ${l.title} về lại chỗ cũ${n === UNLIST_FREE ? ` · gỡ thêm nữa hôm nay là bị admin ban!` : ''}`,
        n === UNLIST_FREE ? 'bad' : 'info',
      )
    },
    botVisit: () => {
      const s = get()
      const open = s.listings.filter((l) => !l.bid || Date.now() < l.bid.endsAt)
      if (!open.length) return
      const l = open[Math.floor(Math.random() * open.length)]
      if (l.bid) {
        const t = bidTurn(l)
        if (!t) return
        set({
          listings: s.listings.map((x) =>
            x === l
              ? { ...x, log: [...x.log, t.line].slice(-24), bid: { ...l.bid!, top: t.top } }
              : x,
          ),
        })
        return
      }
      const line = botTurn(l, certOf(s))
      if (!line) return
      set({ listings: s.listings.map((x) => (x === l ? { ...x, log: [...x.log, line] } : x)) })
    },
    settleBids: () => {
      const now = Date.now()
      for (const l of get().listings) {
        const b = l.bid
        if (!b || now < b.endsAt) continue
        // không mở tab lúc bid chạy: người mua vẫn bid ngầm tới trần
        let top = b.top
        if (!top && b.cap >= b.start) {
          const steps = Math.floor((b.cap - b.start) / b.step)
          top = {
            name: randomBuyer(),
            amount: b.start + b.step * Math.floor(Math.random() * (steps + 1)),
          }
        }
        if (top) completeSale(l, top.name, top.amount, '🔨 Hết giờ bid! ')
        else {
          const s = get()
          set({ ...restore(s, l.src), listings: s.listings.filter((x) => x.id !== l.id) })
          s.toast(`🔨 Bài bid ${l.title} không ai trả, món về lại chỗ cũ`, 'info')
        }
      }
    },
    sellListing: (id, lineIdx) => {
      const s = get()
      const l = s.listings.find((x) => x.id === id)
      const line = l?.log[lineIdx]
      if (!l || l.bid || !line?.offer) return
      completeSale(l, line.name, line.offer)
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
      get().settleBids()
      // đêm: tối đa 1 đại gia lướt chợ, gặp bài giá trên giá chợ (≤ RICH_MAX × giá gốc) thì chốt luôn đúng giá
      const cert = certOf(get())
      const rich = get().listings.find((l) => Math.random() < richChance(l, cert))
      if (rich)
        completeSale(rich, `Đại gia ${randomBuyer()}`, rich.price, '🌙 Đại gia chốt trong đêm! ')
      const s = get()
      const back = s.listings.filter((l) => l.src.kind === 'customer' && !l.bid)
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
    banMarket: (why) => {
      const s = get()
      set({ marketBanUntil: s.day + BAN_DAYS, marketBanWhy: why })
      s.notify(
        '🚫 Bị admin ban khỏi chợ',
        `${why}. Bạn bị ban khỏi Hội Phím Cơ ${BAN_DAYS} ngày (tới ngày ${s.day + BAN_DAYS})`,
      )
    },
  }
}
