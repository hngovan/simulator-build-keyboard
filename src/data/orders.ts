import type {
  SwitchKind,
  GroupPost,
  KeycapMaterial,
  Kit,
  LayoutId,
  LubePref,
  Order,
  SoundWish,
} from '@/types'
import { LAYOUTS, getLayout, randomVariant, variantText } from './layouts'
import { repTier } from './reputation'
import { ORING_IDS, SUPPLIES } from './supplies'
import { makePost } from './market'
import { avatarSrc } from './avatars'
import {
  CASES,
  PLATES,
  plateIds,
  STABS,
  PCB_TYPES,
  pcbLabel,
  MOUNTS,
  KEYCAP_KITS,
  KEYCAP_COLORS,
  CASE_COLORS,
  SOUND_WISH,
  SIZE_MULT,
  buildCatalog,
  stabNeed,
  caseFits,
  SWITCHES,
  SWITCH_KINDS,
  KEYCAP_MATERIALS,
} from './parts'

const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

/** loại switch hợp với tiếng khách muốn */
const WISH_SWITCH: Record<SoundWish, SwitchKind[]> = {
  silent: ['Silent', 'SilentTactile', 'Linear', 'Tactile'],
  thock: ['Linear', 'Tactile'],
  clack: ['Linear', 'Tactile'],
  noisy: ['Clicky', 'Linear', 'Tactile'],
}
const round100 = (v: number) => Math.ceil(v / 100) * 100

const CUSTOMERS = [
  'Anh Tuấn',
  'Chị Linh',
  'Bạn Minh',
  'Anh Khoa',
  'Chị Hà',
  'Bạn Phúc',
  'Anh Dũng',
  'Bạn Vy',
  'Chị Ngọc',
  'Bạn Long',
]
const avatarFor = (customer: string) => avatarSrc(CUSTOMERS.indexOf(customer))
const PACKAGING = ['túi zip', 'hộp giấy', 'thùng carton']

export function estimateCost(
  layout: LayoutId,
  kit: Kit | null,
  keycapKit = 'full',
  switchType?: string,
  /** món khách đòi đích danh: tính theo giá món đó (case / stab / plate đắt không bị hụt budget) */
  want: Pick<Order, 'caseId' | 'stabType' | 'plateMaterial'> = {},
) {
  const { keys } = getLayout(layout, {})
  const needStab = keys.some((k) => k.stab)
  // khách đòi đúng con switch thì tính theo giá con đó (con đắt như Panda không bị hụt budget)
  const sw10 = switchType ? Math.max(65, SWITCHES[switchType].price10) : 65
  let cost = Math.ceil(keys.length / 10) * sw10 + KEYCAP_KITS[keycapKit].price
  if (needStab && !kit?.stab)
    cost += want.stabType ? Math.max(150, STABS[want.stabType].price) : 150
  // món khách không gửi thì shop phải mua
  if (!kit?.case) {
    const cheapestCase = Math.min(
      ...Object.values(CASES)
        .filter((c) => caseFits(c, layout))
        .map((c) => c.price),
    )
    cost += want.caseId
      ? Math.max(cheapestCase * 1.6, CASES[want.caseId].price)
      : cheapestCase * 1.6
  }
  if (!kit?.pcb) cost += PCB_TYPES.hotswap.price * SIZE_MULT[layout]
  if (!kit?.plate)
    cost +=
      Math.max(PLATES.fr4.price, PLATES[want.plateMaterial ?? 'fr4'].price) * SIZE_MULT[layout]
  return cost
}

/** Đơn kit theo thiết kế bàn phím mở: khách gửi đúng bộ case CAD thật */
const FEATURED: { id: string; layout: LayoutId; caseId: string; note: string }[] = [
  {
    id: 'bakeneko60',
    layout: '60',
    caseId: 'bakeneko60',
    note: 'Mình mới gom đủ bộ Bakeneko 60 (thiết kế mở của kkatano), O-ring mount, nhờ shop ráp giúp.',
  },
  {
    id: 'planck',
    layout: 'planck',
    caseId: 'planckAlu',
    note: 'Mình muốn thử phím ortholinear: kit Planck 12 × 4, hàng dưới MIT có space 2u ở giữa.',
  },
]

/** Hạn làm theo cỡ bàn phím (ngày) */
const DAYS: Record<LayoutId, [number, number]> = {
  '40': [2, 3],
  planck: [2, 3],
  '60': [2, 4],
  hhkb: [2, 4],
  truehhkb: [2, 4],
  '65': [2, 4],
  '75': [3, 4],
  frl: [3, 5],
  alice: [3, 5],
  tkl: [3, 5],
  tklf13: [3, 5],
  full: [4, 6],
}
let orderSeq = 0

/** Đợt đơn mới trong ngày: 1–5 đơn để người chơi chọn */
/** layout luôn có ít nhất 1 đơn mỗi ngày (phổ biến nhất) */
const DAILY_LAYOUTS: LayoutId[] = ['tkl', '60']

/** Đợt đơn mỗi ngày: 5–7 đơn, luôn có ít nhất 1 TKL + 1 60%, còn lại ngẫu nhiên; xáo thứ tự */
/** PCB khách gửi: loại tiêu chuẩn ngẫu nhiên */
function kitPcb(layout: LayoutId) {
  return { layout, type: pick(Object.keys(PCB_TYPES)) }
}

/** Đợt đơn mới trong ngày: số đơn + hệ số tiền công theo bậc uy tín (`repTier`) */
export function randomOffers(rep = 0): Order[] {
  const { offers, pay } = repTier(rep).tier
  const n = Math.max(
    DAILY_LAYOUTS.length,
    offers[0] + Math.floor(Math.random() * (offers[1] - offers[0] + 1)),
  )
  const list = [
    ...DAILY_LAYOUTS.map((l) => randomOrder(l, pay)),
    ...Array.from({ length: n - DAILY_LAYOUTS.length }, () => randomOrder(undefined, pay)),
  ]
  return list.sort(() => Math.random() - 0.5)
}

/** layout: ép layout của đơn (đơn thiết kế mở chỉ chọn khi cùng layout); pay: hệ số tiền công theo uy tín */
function randomOrder(layout_?: LayoutId, pay = 1): Order {
  const designs = FEATURED.filter((f) => !layout_ || f.layout === layout_)
  const featured = designs.length && Math.random() < 0.3 ? pick(designs) : null
  const layout = layout_ ?? featured?.layout ?? pick(Object.keys(LAYOUTS) as LayoutId[])
  const variant = randomVariant(layout)
  const { keys } = getLayout(layout, variant)
  const wish = pick(Object.keys(SOUND_WISH) as SoundWish[])
  const keycapColor = pick(Object.keys(KEYCAP_COLORS))
  // 1 bộ keycap (1 profile) cho cả bàn phím, chọn trong các bộ đủ phím cho layout
  const keycapKit = pick(
    Object.keys(KEYCAP_KITS).filter(
      (id) => !KEYCAP_KITS[id].hidden && KEYCAP_KITS[id].layouts.includes(layout),
    ),
  )
  // chất liệu keycap: đa số khách đòi rõ, 20% để shop tự chọn
  const keycapMaterial =
    Math.random() < 0.8 ? pick(Object.keys(KEYCAP_MATERIALS) as KeycapMaterial[]) : undefined
  const type: Order['type'] = featured || Math.random() < 0.5 ? 'kit' : 'full'
  let kit: Kit | null = null
  let caseColor: string | null = null
  let mount: string | null = null
  if (type === 'kit') {
    // khách gửi ngẫu nhiên 1 vài món (chỉ case, chỉ mạch, case + plate...), ít nhất 1 món;
    // đơn thiết kế mở thì luôn gửi đủ case + PCB + plate của bộ đó
    const needStab = keys.some((k) => k.stab)
    let send = featured
      ? { case: true, pcb: true, plate: true, stab: needStab && Math.random() < 0.5 }
      : {
          case: Math.random() < 0.6,
          pcb: Math.random() < 0.5,
          plate: Math.random() < 0.5,
          stab: needStab && Math.random() < 0.4,
        }
    if (!send.case && !send.pcb && !send.plate && !send.stab)
      send = { ...send, [pick(['case', 'pcb', 'plate'] as const)]: true }
    const caseId =
      featured?.caseId ?? pick(Object.keys(CASES).filter((id) => caseFits(CASES[id], layout)))
    const c = CASES[caseId]
    // khách gửi case thì dặn luôn kiểu mount
    if (send.case) mount = pick(c.mounts)
    kit = {
      packaging: pick(PACKAGING),
      ...(send.case ? { case: { id: caseId, color: pick(c.colors) } } : {}),
      ...(send.pcb ? { pcb: kitPcb(layout) } : {}),
      ...(send.plate ? { plate: { layout, material: pick(plateIds()) } } : {}),
      // khách gửi stab thì gửi đủ số cho layout (full size có cả stab lẻ)
      stab: send.stab ? { type: pick(Object.keys(STABS)), ...stabNeed(keys) } : null,
    }
  }
  if (!kit?.case && Math.random() < 0.6) {
    // chỉ chọn màu mà có case vừa layout bán
    caseColor = pick([
      ...new Set(
        Object.values(CASES)
          .filter((c) => caseFits(c, layout))
          .flatMap((c) => c.colors),
      ),
    ])
  }
  // khách thích tiếng gốc (hay gặp với switch Cherry) thì dặn không lube
  const r = Math.random()
  const lubePref: LubePref = r < 0.4 ? 'want' : r < 0.6 ? 'none' : 'any'
  // loại switch phải hợp tiếng khách muốn (WISH_SWITCH): clack / thock chỉ linear / tactile, êm thì hay silent,
  // ồn thì hay clicky; không bao giờ đòi tiếng clack mà lại chọn switch silent
  const switchKind: SwitchKind =
    wish === 'silent' && Math.random() < 0.7
      ? pick(['Silent', 'SilentTactile'] as SwitchKind[])
      : wish === 'noisy' && Math.random() < 0.6
        ? 'Clicky'
        : pick(WISH_SWITCH[wish])
  // ~35% khách đòi đúng 1 con switch cụ thể (vd Cherry MX Đen), còn lại đúng loại là được
  const switchType =
    Math.random() < 0.35
      ? pick(Object.keys(SWITCHES).filter((id) => SWITCHES[id].kind === switchKind))
      : undefined
  // đơn mua đủ: khách có thể đòi đúng loại PCB (kit thì PCB khách gửi sẵn)
  const pr = Math.random()
  const pcbType: Order['pcbType'] = kit?.pcb
    ? undefined
    : pr < 0.35
      ? 'hotswap'
      : pr < 0.65
        ? 'solder'
        : undefined
  // món khách không gửi: ~30% mỗi món khách đòi đích danh (vd case Bakeneko, stab Durock, plate đồng)
  const caseId =
    !kit?.case && Math.random() < 0.3
      ? pick(
          Object.keys(CASES).filter(
            (id) =>
              caseFits(CASES[id], layout) && (!caseColor || CASES[id].colors.includes(caseColor)),
          ),
        )
      : undefined
  const stabType =
    keys.some((k) => k.stab) && !kit?.stab && Math.random() < 0.3
      ? pick(Object.keys(STABS))
      : undefined
  const plateMaterial = !kit?.plate && Math.random() < 0.3 ? pick(plateIds()) : undefined
  const want = { caseId, stabType, plateMaterial }
  // ~25% khách muốn lót foam Poron PCB (tiền 1 tấm foam tính vào budget)
  const foam = Math.random() < 0.25
  // dây O-ring: đơn kit gửi case O-ring / OG mount → 60% khách dặn độ cứng dây; đơn mua đủ (không đòi đích danh case)
  // ~12% đòi luôn O-ring mount + đúng độ cứng dây (shop chọn case có O-ring mount)
  if (!kit && !caseId && Math.random() < 0.12) mount = 'oring'
  const oring =
    (mount === 'oring' || mount === 'og') && (!kit || Math.random() < 0.6)
      ? pick(ORING_IDS)
      : undefined
  const budget = round100(
    (estimateCost(layout, kit, keycapKit, switchType, want) + (foam ? 60 : 0) + (oring ? 30 : 0)) *
      (1.25 + Math.random() * 0.4),
  )
  const solder = (kit?.pcb?.type ?? pcbType) === 'solder' ? keys.length * 3 : 0
  const extra =
    (kit?.case && CASES[kit.case.id].pieces === 2 ? 100 : 0) +
    (lubePref === 'want' ? keys.length * 4 : 0) +
    (keys.some((k) => k.stab) ? 80 : 0)
  const labor = Math.round(((250 + keys.length * 6 + solder + extra) * pay) / 50) * 50
  const customer = pick(CUSTOMERS)

  const L = LAYOUTS[layout].name
  const lines = [`Chào shop! Build giúp mình 1 con ${L} nhé.`]
  if (featured) lines.push(featured.note)
  const vt = variantText(variant)
  if (vt.length) lines.push(`Layout mình chơi: ${vt.join(', ')}.`)
  lines.push(`${SOUND_WISH[wish].msg}.`)
  lines.push(
    switchType
      ? `Switch phải đúng con ${SWITCHES[switchType].name} (${SWITCH_KINDS[switchKind]}) nhé, con khác mình không nhận đâu.`
      : `Switch loại ${SWITCH_KINDS[switchKind]} là được, hãng nào cũng ok.`,
  )
  lines.push(
    `Keycap profile ${KEYCAP_KITS[keycapKit].profile.toUpperCase()}${keycapMaterial ? ` chất liệu ${KEYCAP_MATERIALS[keycapMaterial].name}` : ''} màu ${KEYCAP_COLORS[keycapColor].name.toLowerCase()} nha, đồng bộ 1 profile cả bàn.`,
  )
  if (kit) {
    lines.push(
      `Mình gửi kèm (${kit.packaging}): ${[
        kit.case && `case ${CASES[kit.case.id].name}`,
        kit.pcb && `PCB ${pcbLabel(kit.pcb)}`,
        kit.plate && `plate ${PLATES[kit.plate.material].name}`,
        kit.stab && `stab ${STABS[kit.stab.type].name}`,
      ]
        .filter(Boolean)
        .join(', ')}. Còn lại shop lo giúp mình nhé.`,
    )
    // chỉ dặn mount khi khách gửi case
    if (mount) lines.push(`Build ${MOUNTS[mount].name} giúp mình nhé.`)
  } else lines.push('Shop lo từ A tới Z luôn nha.')
  // món khách không gửi: dặn loại mạch / màu case nếu có
  if (pcbType === 'solder')
    lines.push('Mạch phải là loại HÀN (solder) nhé, mình thích switch hàn chết cho chắc.')
  if (pcbType === 'hotswap')
    lines.push('Mạch hotswap giúp mình nha, để sau mình tự thay switch được.')
  if (caseId)
    lines.push(
      `Case phải là ${CASES[caseId].name}${caseColor ? ` màu ${CASE_COLORS[caseColor].name.toLowerCase()}` : ''} nha, mình mê con này lâu rồi.`,
    )
  else if (caseColor) lines.push(`Case màu ${CASE_COLORS[caseColor].name.toLowerCase()} nếu được.`)
  if (plateMaterial)
    lines.push(`Plate ${PLATES[plateMaterial].name} giúp mình, đúng chất liệu đó nhé.`)
  if (stabType) lines.push(`Stab dùng đúng ${STABS[stabType].name} cho mình nha.`)
  if (lubePref === 'want')
    lines.push('Nhớ lube switch giúp mình nha, lube đúng loại mỡ nhé (switch lube sẵn thì thôi).')
  if (lubePref === 'none') lines.push('Mình thích tiếng sạn gốc của switch, đừng lube switch nhé!')
  if (keys.some((k) => k.stab)) lines.push('Stab phải êm, không được lạch cạch đâu đó!')
  if (foam) lines.push('Lót giúp mình tấm foam Poron giữa PCB và plate nhé, cho gõ thock hơn.')
  if (oring)
    lines.push(
      `${kit ? '' : 'Build O-ring mount giúp mình, '}dây O-ring phải là loại ${SUPPLIES[oring].name.replace('Dây O-ring ', '')} nha${SUPPLIES[oring].oring!.shore < 50 ? ', mình thích gõ nhún mềm' : SUPPLIES[oring].oring!.shore > 50 ? ', mình thích gõ chắc tay' : ''}.`,
    )
  lines.push(
    `Budget linh kiện tầm ${budget.toLocaleString('vi-VN')}k, tiền công ${labor.toLocaleString('vi-VN')}k.`,
  )

  const [d0, d1] = DAYS[layout]
  const days = d0 + Math.floor(Math.random() * (d1 - d0 + 1))
  lines.push(`Shop làm trong ${days} ngày giúp mình nhé, trễ là mình buồn đó.`)
  return {
    id: `o${Date.now().toString(36)}${(orderSeq++).toString(36)}`,
    days,
    ...(featured ? { featured: featured.id } : {}),
    customer,
    avatar: avatarFor(customer),
    layout,
    variant,
    wish,
    keycapColor,
    keycapKit,
    keycapMaterial,
    type,
    kit,
    caseColor,
    mount,
    lubePref,
    switchKind,
    ...(switchType ? { switchType } : {}),
    ...(pcbType ? { pcbType } : {}),
    ...(caseId ? { caseId } : {}),
    ...(stabType ? { stabType } : {}),
    ...(plateMaterial ? { plateMaterial } : {}),
    ...(foam ? { foam: true as const } : {}),
    ...(oring ? { oring } : {}),
    budget,
    labor,
    lines,
  }
}

const SELLERS = [
  'Hùng Keeb',
  'Trang Mod Phím',
  'Bảo Clacky',
  'Nam Thock',
  'Quân Pass Đồ',
  'Mai Keycap',
  'Sơn Lube Thuê',
  'Tú Hàn Mạch',
]

// Bài đăng trong "Hội Phím Cơ": hàng giá rẻ, caption thuật ngữ chợ che tình trạng thật, có thể gặp seller bùng.
// Mỗi ngày đăng đợt mới (`nextDay`), id theo ngày để inbox / bài đã mua của hôm trước không lẫn sang
/**
 * Tin chat ngắn của khách ở Mezzenger (1–2 ý chính: chào + layout, âm thanh + hạn); chi tiết yêu cầu hiện ở bảng `OrderSpec`
 * ngay dưới. `order.lines` (bản dài) vẫn giữ: lấy lời chào / câu case featured ở đây
 */
export function chatIntro(order: Order): string[] {
  const out = [order.lines[0]]
  // đơn case "hot" (featured): câu giới thiệu case ngay sau lời chào
  if (order.featured && order.lines[1]) out.push(order.lines[1])
  out.push(
    `${SOUND_WISH[order.wish].msg}. Làm trong ${order.days} ngày giúp mình nha, yêu cầu chi tiết mình ghi dưới đây 👇`,
  )
  return out
}

export function groupPosts(order: Order, day = 1): GroupPost[] {
  const catalog = buildCatalog().filter(
    (p) => !p.layouts || p.layouts.includes(order.layout) || Math.random() < 0.15,
  )
  const posts: GroupPost[] = []
  for (let i = 0; i < 9; i++) {
    const p = pick(catalog)
    // stab chỉ pass nguyên bộ (không đăng bán lẻ 1 con)
    const opts = p.cat === 'stab' ? p.options.filter((o) => o.label.includes('Bộ')) : p.options
    posts.push(makePost(`post-d${day}-${i}`, pick(SELLERS), p, pick(opts)))
  }
  return posts
}
