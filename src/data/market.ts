// Chợ pass đồ "Hội Phím Cơ VN": bài đăng viết bằng "thuật ngữ chợ phím" che giấu tình trạng thật của hàng.
// Người chơi inbox người bán (xin hình, check var, xin bớt, lowball...) để lộ ra sự thật / được bớt giá / bị block.
import type { GroupPost, Product, ProductOption } from '@/types'

/** tình trạng thật của món hàng (người chơi không thấy trực tiếp) */
export type Cond =
  | 'new' // BNIB / sealed
  | 'clean' // đã dùng nhưng sạch, không lỗi
  | 'flaw' // trầy / cấn
  | 'shiny' // keycap bóng
  | 'missing' // keycap thiếu nút
  | 'tick' // stab tick, phải mod lại
  | 'tuned' // stab / switch đã được thợ chỉnh, ngon thật
  | 'desolder' // PCB chân rã hàn: không cắm hotswap được
  | 'dead' // switch chết vài con

/** lỗi thật khi nhận hàng: ghi vào linh kiện (`flaw`), bị trừ điểm lúc giao */
export const FLAW_TEXT: Partial<Record<Cond, string>> = {
  flaw: 'trầy / cấn',
  shiny: 'keycap bóng',
  missing: 'keycap thiếu nút',
  tick: 'stab tick',
  desolder: 'PCB chân rã hàn',
}

/** kiểu giá: price no offer (trả giá là ăn block) / lowball thoải mái / bình thường */
export type PriceTag = 'firm' | 'lowball' | 'normal'

/** hành động khi inbox người bán */
export type InboxAction = 'photo' | 'var' | 'loc' | 'chot' | 'lowball' | 'mute'

export interface ChatLine {
  from: 'me' | 'seller' | 'system'
  text: string
}

/** phí ship khi không freeship (k) */
const SHIP_FEE = 30

const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)]
const chance = (p: number) => Math.random() < p
const round50 = (n: number) => Math.max(0, Math.round(n / 50) * 50)

/**
 * Giá sàn người bán chịu bớt tới: ~60% giá đăng (tối thiểu 50k), món rẻ hơn 50k thì không bớt.
 * Trước đây bớt số tiền cố định (lộc / chốt / câm điếc) nên món rẻ bị trả về 0đ
 */
export const dealFloor = (post: { price: number }) =>
  Math.min(post.price, Math.max(50, round50(post.price * 0.6)))

/** tình trạng có thể gặp theo loại hàng [tình trạng, tỉ lệ] */
const CONDS: Record<string, [Cond, number][]> = {
  case: [
    ['new', 0.25],
    ['clean', 0.3],
    ['flaw', 0.45],
  ],
  plate: [
    ['new', 0.3],
    ['clean', 0.35],
    ['flaw', 0.35],
  ],
  keycap: [
    ['new', 0.2],
    ['clean', 0.25],
    ['shiny', 0.35],
    ['missing', 0.2],
  ],
  switch: [
    ['new', 0.3],
    ['tuned', 0.3],
    ['dead', 0.4],
  ],
  stab: [
    ['new', 0.25],
    ['tuned', 0.35],
    ['tick', 0.4],
  ],
  pcb: [
    ['new', 0.3],
    ['clean', 0.35],
    ['desolder', 0.35],
  ],
  other: [
    ['new', 0.5],
    ['clean', 0.5],
  ],
}
function rollCond(cat: string): Cond {
  const list = CONDS[cat] ?? CONDS.other
  let r = Math.random()
  for (const [c, p] of list) if ((r -= p) <= 0) return c
  return list[0][0]
}

/** câu mô tả trong bài đăng: người bán liêm thì nói thật kiểu chợ, không liêm thì nói tránh */
function condPhrase(cond: Cond, honest: boolean): string {
  switch (cond) {
    case 'new':
      return pick(honest ? ['BNIB', 'Sealed, chưa khui'] : ['Khui seal check nút', 'BNIB'])
    case 'clean':
      return pick(['Em soi mãi chưa thấy flaw', 'Nguyên nhám, ngoại quan đẹp'])
    case 'flaw':
      return honest
        ? pick(['Xém flawless', 'Ngoại quan tổng thể đẹp', 'Mặc định flaw khó tránh'])
        : pick(['Em soi mãi chưa thấy flaw', 'Bác xem hình đi em có up hình rồi'])
    case 'shiny':
      return pick(
        honest
          ? ['Chớm bóng', 'Mất nhám nhẹ một vài nút', 'Mặc định bóng']
          : ['Độ bóng như hình chụp', 'Nguyên nhám'],
      )
    case 'missing':
      return pick(['Số nút như hình', 'Em nhận hàng chủ cũ sao là bán vậy luôn'])
    case 'tick':
      return honest ? 'Khó tính thì về mod lại' : 'Sử dụng ổn'
    case 'tuned':
      return pick(['Full tuned, phun li tơ nịt', 'Đã được thợ cân chỉnh bao ngon', 'LFSS sẵn'])
    case 'desolder':
      return honest ? 'Chân rã hàn' : 'Sử dụng ổn'
    case 'dead':
      return honest ? 'Fullmod, phun mót, hên xui' : 'Sử dụng ổn'
  }
}

/** người bán trả lời khi xin hình thật: liêm thì khai thật, không liêm thì né */
function photoReply(post: GroupPost): { text: string; reveal: boolean } {
  const c = post.cond ?? 'clean'
  if (c === 'new' || c === 'clean' || c === 'tuned')
    return { text: 'Hình thật đây bác, hàng đẹp không tì vết 👌', reveal: true }
  if (!post.honest) return { text: 'Bác xem hình đi em có up hình rồi mà 😅', reveal: false }
  const truth: Partial<Record<Cond, string>> = {
    flaw: 'Có vết cấn nhỏ ở góc nha bác, nhìn kỹ mới thấy',
    shiny: 'Mấy nút WASD với space bóng rồi bác ạ',
    missing: 'Thiếu 2–3 nút mod nha bác',
    tick: 'Stab hơi tick, bác về mod lại xíu là ngon',
    desolder: 'Mạch đã rã hàn, socket hotswap hỏng vài chỗ',
    dead: 'Có vài con chết, bác về thay giúp em',
  }
  return { text: truth[c] ?? 'Hàng ổn bác', reveal: true }
}

/** Tạo 1 bài đăng: sự thật ẩn (tình trạng, độ liêm, có bùng không) + caption thuật ngữ chợ */
export function makePost(
  id: string,
  seller: string,
  product: Product,
  opt: ProductOption,
): GroupPost {
  const cat = product.cat
  const cond = rollCond(cat)
  const honest = chance(0.6)
  // người không liêm dễ là thành phần bùng hơn
  const scammer = chance(honest ? 0.08 : 0.3)
  const tag: PriceTag = chance(0.25) ? 'firm' : chance(0.35) ? 'lowball' : 'normal'
  const fs = chance(0.35)
  // người bán ghi "nhanh gọn cho người câm điếc": hỏi han linh tinh dễ ăn block
  const mute = chance(0.3)
  // hàng lỗi / bóng / thiếu rẻ hơn hàng new
  const base = cond === 'new' ? 0.78 : cond === 'tuned' || cond === 'clean' ? 0.68 : 0.58
  const price = round50(opt.price * (base + Math.random() * 0.12)) || Math.round(opt.price * 0.7)
  const tags = [
    tag === 'firm' ? 'Price no offer' : tag === 'lowball' ? 'Lowball thoải mái' : null,
    fs ? 'Fs' : null,
    mute ? 'Nhanh gọn cho người câm điếc' : null,
  ].filter(Boolean)
  return {
    id,
    seller,
    caption: [condPhrase(cond, honest), ...tags].join(' · '),
    product,
    opt,
    price,
    likes: Math.floor(Math.random() * 80),
    sold: false,
    cond,
    honest,
    scammer,
    tag,
    fs,
    mute,
    deal: { price, ship: fs ? 0 : SHIP_FEE, log: [], used: [] },
  }
}

/**
 * Inbox 1 hành động: trả về bài đăng mới (giá thương lượng, log chat, bị block...).
 * Hàm thuần: tỉ lệ ngẫu nhiên nằm ở đây, store chỉ lưu kết quả
 */
export function negotiate(post: GroupPost, action: InboxAction): GroupPost {
  const deal: NonNullable<GroupPost['deal']> = post.deal ?? {
    price: post.price,
    ship: post.fs ? 0 : SHIP_FEE,
    log: [],
    used: [],
  }
  if (deal.blocked || deal.used.includes(action)) return post
  const log: ChatLine[] = [...deal.log]
  const say = (from: ChatLine['from'], text: string) => log.push({ from, text })
  let { price, ship, revealed, varChecked } = deal
  const floor = dealFloor(post)
  // giá sau khi bớt, không xuống dưới giá sàn
  const cut = (p: number) => Math.max(floor, round50(p))
  const noRoom = () => say('seller', 'Giá này sát đáy rồi bác, em hết bớt được ạ')
  // khai báo riêng: deal.blocked đã bị thu hẹp về false ở dòng kiểm tra trên
  let blocked: boolean | undefined = false
  const tag = post.tag ?? 'normal'
  switch (action) {
    case 'photo': {
      say('me', 'Bác cho em xin vài hình thật check flaw với ạ')
      const r = photoReply(post)
      say('seller', r.text)
      revealed = revealed || r.reveal
      break
    }
    case 'var': {
      say('me', 'Cho em xin link check var uy tín nha bác')
      // tự lục group: người bùng thì 70% có bài tố
      if (post.scammer && chance(0.7))
        say('system', '🚨 Lục group thấy 2 bài tố seller này bùng hàng!')
      else say('system', '✅ Seller có vài bài review giao dịch uy tín trong group')
      varChecked = true
      break
    }
    case 'loc': {
      say('me', 'Lộc lá cho em đi bác 🙏')
      if (tag === 'firm' && chance(0.4)) {
        say('seller', 'Price no offer bác ơi đọc kỹ giùm em')
        blocked = true
      } else if (tag === 'firm') say('seller', 'Giá chốt rồi bác, không bớt được ạ')
      else if (ship) {
        ship = 0
        say('seller', 'Ok em freeship cho bác nhé')
      } else if (price <= floor) noRoom()
      else {
        const before = price
        price = cut(price - 50)
        say('seller', `Ok bớt bác ${before - price}k lấy lộc`)
      }
      break
    }
    case 'chot': {
      say('me', 'Nhanh gọn em chốt luôn nè bác')
      if (tag === 'firm') say('seller', 'Giá đó là chốt rồi bác ơi')
      else if (price <= floor) noRoom()
      else if (chance(0.65)) {
        const before = price
        price = cut(price - (chance(0.5) ? 100 : 200))
        say('seller', `Bác nhanh gọn thì em bớt ${before - price}k`)
      } else say('seller', 'Giá đó em lỗ rồi bác 😭')
      break
    }
    case 'lowball': {
      const offer = round50(price * 0.7)
      say('me', `${offer.toLocaleString('vi-VN')}k được không bác?`)
      if (price <= floor) noRoom()
      else if (chance(LOWBALL_BLOCK[tag])) {
        say(
          'seller',
          tag === 'firm' ? 'Price no offer mà bác 🙄' : 'Lowball kiểu này thôi em block nhé',
        )
        blocked = true
      } else if (tag === 'lowball' ? chance(0.55) : chance(0.3)) {
        price = cut(offer)
        say(
          'seller',
          price === offer
            ? 'Thôi cũng được, em cần tiền'
            : `Thấp nhất ${price.toLocaleString('vi-VN')}k thôi bác`,
        )
      } else if (tag === 'lowball' || chance(0.6)) {
        price = cut(price * 0.9)
        say('seller', `Lố quá bác, ${price.toLocaleString('vi-VN')}k em bán`)
      } else say('seller', 'Giá đó bác ra chợ mà mua 😤')
      break
    }
    case 'mute': {
      // "nhanh gọn cho người câm điếc": không hỏi gì, xin stk luôn → bớt hữu duyên
      say('me', 'Cho em xin stk ạ')
      const before = price
      price = cut(price - Math.min(round50(price * 0.3), round50(200 + Math.random() * 800)))
      say(
        'seller',
        before > price
          ? `Bác nhanh gọn ghê, em bớt hữu duyên ${before - price}k nhé. STK đây ạ`
          : 'Bác nhanh gọn ghê, STK đây ạ',
      )
      break
    }
  }
  // bài "nhanh gọn cho người câm điếc": hỏi han linh tinh thì người bán có thể block luôn
  if (!blocked && post.mute && action !== 'mute' && chance(MUTE_BLOCK)) {
    say('seller', 'Đã ghi nhanh gọn cho người câm điếc mà bác hỏi lắm thế 🙄')
    blocked = true
  }
  if (blocked) say('system', '⛔ Bạn đã bị người bán chặn')
  return {
    ...post,
    deal: { price, ship, log, used: [...deal.used, action], blocked, revealed, varChecked },
  }
}

/** tỉ lệ người bán block khi lowball: price no offer chắc chắn, bình thường 25%, lowball thoải mái vẫn 5% */
const LOWBALL_BLOCK: Record<PriceTag, number> = { firm: 1, normal: 0.25, lowball: 0.05 }
/** bài ghi "nhanh gọn cho người câm điếc": mỗi câu hỏi han (không phải xin stk luôn) có tỉ lệ ăn block */
const MUTE_BLOCK = 0.3

/** câu chào inbox đầu tiên của người bán */
export const greet = (post: GroupPost) =>
  post.mute
    ? 'Hàng còn bác, nhanh gọn cho người câm điếc nha 🤐'
    : post.tag === 'firm'
      ? 'Chào bác, giá như bài đăng nha, price no offer ạ'
      : 'Chào bác, hàng còn nha, bác hỏi gì cứ ib'
