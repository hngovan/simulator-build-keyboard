import { randomHex } from '@/lib/color'
import type {
  SwitchKind,
  GroupPost,
  KeycapMaterial,
  Kit,
  LayoutId,
  LubePref,
  Order,
  SoundWish,
  Variant,
} from '@/types'
import { LAYOUTS, getLayout, randomVariant, variantText } from './layouts'
import { repTier } from './reputation'
import { ORING_IDS, SUPPLIES } from './supplies'
import { makePost } from './market'
import {
  caseLv,
  keycapKitsAt,
  layoutLv,
  offerRange,
  lockProduct,
  mountLv,
  pcbLv,
  plateLv,
  stabLv,
  switchLv,
} from './unlocks'
import {
  CASES,
  PLATES,
  plateIds,
  STABS,
  mountStabIssue,
  PCB_TYPES,
  pcbLabel,
  MOUNTS,
  KEYCAP_KITS,
  KEYCAP_COLORS,
  keycapColorsFor,
  CASE_COLORS,
  freeColorCase,
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
/** lọc theo cấp xưởng, lọc hết thì giữ nguyên (không để đơn rỗng) */
const atLv = <T>(arr: readonly T[], ok: (x: T) => boolean): T[] => {
  const f = arr.filter(ok)
  return f.length ? f : [...arr]
}

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
const PACKAGING = ['túi zip', 'hộp giấy', 'thùng carton']

export function estimateCost(
  layout: LayoutId,
  kit: Kit | null,
  keycapKit = 'full',
  switchType?: string,
  /** món khách đòi đích danh: tính theo giá món đó (case / stab / plate đắt không bị hụt budget) */
  want: Pick<Order, 'caseId' | 'stabType' | 'plateMaterial'> & { variant?: Variant } = {},
) {
  const { keys } = getLayout(layout, want.variant ?? {})
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
        .filter((c) => caseFits(c, layout, want.variant))
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

/** PCB khách gửi: loại tiêu chuẩn ngẫu nhiên */
function kitPcb(layout: LayoutId, lv: number) {
  return { layout, type: pick(atLv(Object.keys(PCB_TYPES), (t) => pcbLv(t) <= lv)) }
}

/**
 * Đợt đơn mới trong ngày: số đơn theo cấp xưởng (`offerRange`: thợ tập sự 1–2 đơn, càng lên cấp càng nhiều, uy tín âm bớt),
 * hệ số tiền công theo bậc uy tín (`repTier`); lv = cấp xưởng (chỉ đòi món đã mở). Đơn đầu luôn là layout phổ biến (TKL / 60%)
 */
export function randomOffers(rep = 0, lv = 1): Order[] {
  const { pay } = repTier(rep).tier
  const [a, b] = offerRange(lv, rep)
  const n = a + Math.floor(Math.random() * (b - a + 1))
  // ít đơn hơn số layout phổ biến thì bốc ngẫu nhiên trong đó
  const daily = [...DAILY_LAYOUTS].sort(() => Math.random() - 0.5).slice(0, n)
  const list = [
    ...daily.map((l) => randomOrder(l, pay, lv)),
    ...Array.from({ length: n - daily.length }, () => randomOrder(undefined, pay, lv)),
  ]
  return list.sort(() => Math.random() - 0.5)
}

/** layout: ép layout của đơn (đơn thiết kế mở chỉ chọn khi cùng layout); pay: hệ số tiền công theo uy tín */
function randomOrder(layout_?: LayoutId, pay = 1, lv = 1): Order {
  const designs = FEATURED.filter(
    (f) => (!layout_ || f.layout === layout_) && caseLv(f.caseId) <= lv && layoutLv(f.layout) <= lv,
  )
  const featured = designs.length && Math.random() < 0.3 ? pick(designs) : null
  const caseOk = (id: string) => caseLv(id) <= lv
  const layout =
    layout_ ??
    featured?.layout ??
    pick(atLv(Object.keys(LAYOUTS) as LayoutId[], (l) => layoutLv(l) <= lv))
  let variant = randomVariant(layout)
  // case "hot" không làm được variant vừa bốc (HHKB 10u mà case 1 mảnh) → variant mặc định
  if (featured?.caseId && !caseFits(CASES[featured.caseId], layout, variant))
    variant = defaultVariant(layout)
  const { keys } = getLayout(layout, variant)
  const wish = pick(Object.keys(SOUND_WISH) as SoundWish[])
  // 1 bộ keycap (1 profile) cho cả bàn phím, chọn trong các bộ đủ phím cho layout
  const keycapKit = pick(
    atLv(
      Object.keys(KEYCAP_KITS).filter(
        (id) => !KEYCAP_KITS[id].hidden && KEYCAP_KITS[id].layouts.includes(layout),
      ),
      (id) => keycapKitsAt(lv).includes(id),
    ),
  )
  // chất liệu keycap: đa số khách đòi rõ, 20% để shop tự chọn
  const keycapMaterial =
    Math.random() < 0.8 ? pick(Object.keys(KEYCAP_MATERIALS) as KeycapMaterial[]) : undefined
  // màu theo chất liệu: đòi PC thì màu nhuộm trong, còn lại màu đặc
  const keycapColor = pick(keycapColorsFor(keycapMaterial))
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
      featured?.caseId ??
      pick(
        atLv(
          Object.keys(CASES).filter((id) => caseFits(CASES[id], layout, variant)),
          caseOk,
        ),
      )
    const c = CASES[caseId]
    // khách gửi case thì dặn luôn kiểu mount (mount đã mở ở cấp xưởng)
    if (send.case) mount = pick(atLv(c.mounts, (m) => mountLv(m) <= lv))
    kit = {
      packaging: pick(PACKAGING),
      ...(send.case
        ? { case: { id: caseId, color: freeColorCase(c) ? randomHex() : pick(c.colors) } }
        : {}),
      ...(send.pcb ? { pcb: kitPcb(layout, lv) } : {}),
      ...(send.plate
        ? { plate: { layout, material: pick(atLv(plateIds(), (m) => plateLv(m) <= lv)) } }
        : {}),
      // khách gửi stab thì gửi đủ số cho layout (full size có cả stab lẻ)
      stab: send.stab
        ? {
            // case O-ring mount: khách không gửi stab screw-in (cấn vòng O-ring)
            type: pick(
              atLv(Object.keys(STABS), (t) => stabLv(t) <= lv && !mountStabIssue(mount, t)),
            ),
            ...stabNeed(keys),
          }
        : null,
    }
  }
  if (!kit?.case && Math.random() < 0.6) {
    // chỉ chọn màu mà có case vừa layout bán
    caseColor = pick([
      ...new Set(
        atLv(
          Object.keys(CASES).filter((id) => caseFits(CASES[id], layout, variant)),
          caseOk,
        ).flatMap((id) => CASES[id].colors),
      ),
    ])
  }
  // khách thích tiếng gốc (hay gặp với switch Cherry) thì dặn không lube
  const r = Math.random()
  // cấp 1 chưa mở lube switch: khách không đòi lube
  const lubePref: LubePref = r < 0.4 && lv >= 2 ? 'want' : r < 0.6 ? 'none' : 'any'
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
      ? pick(
          atLv(
            Object.keys(SWITCHES).filter((id) => SWITCHES[id].kind === switchKind),
            (id) => switchLv(id) <= lv,
          ),
        )
      : undefined
  // đơn mua đủ: khách có thể đòi đúng loại PCB (kit thì PCB khách gửi sẵn)
  const pr = Math.random()
  const pcbType: Order['pcbType'] = kit?.pcb
    ? undefined
    : pr < 0.35
      ? 'hotswap'
      : pr < 0.65 && pcbLv('solder') <= lv
        ? 'solder'
        : undefined
  // món khách không gửi: ~30% mỗi món khách đòi đích danh (vd case Bakeneko, stab Durock, plate đồng)
  const caseId =
    !kit?.case && Math.random() < 0.3
      ? pick(
          atLv(
            Object.keys(CASES).filter(
              (id) =>
                caseFits(CASES[id], layout, variant) &&
                (!caseColor || CASES[id].colors.includes(caseColor)),
            ),
            caseOk,
          ),
        )
      : undefined
  const stabType =
    keys.some((k) => k.stab) && !kit?.stab && Math.random() < 0.3
      ? pick(atLv(Object.keys(STABS), (t) => stabLv(t) <= lv && !mountStabIssue(mount, t)))
      : undefined
  const plateMaterial =
    !kit?.plate && Math.random() < 0.3 ? pick(atLv(plateIds(), (m) => plateLv(m) <= lv)) : undefined
  const want = { caseId, stabType, plateMaterial, variant }
  // ~25% khách muốn lót foam Poron PCB (tiền 1 tấm foam tính vào budget)
  const foam = lv >= 2 && Math.random() < 0.25
  // dây O-ring: đơn kit gửi case O-ring mount → 60% khách dặn độ cứng dây; đơn mua đủ (không đòi đích danh case)
  // ~12% đòi luôn O-ring mount + đúng độ cứng dây (shop chọn case có O-ring mount)
  // (khách đòi stab screw-in thì không đòi O-ring mount: vít stab cấn vòng)
  if (!kit && !caseId && !mountStabIssue('oring', stabType) && Math.random() < 0.12) mount = 'oring'
  const oring = mount === 'oring' && (!kit || Math.random() < 0.6) ? pick(ORING_IDS) : undefined
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
    lines.push(
      switchKind === 'Clicky'
        ? 'Lube lò xo giúp mình cho hết tiếng ping nha, đừng lube thân switch kẻo mất tiếng click.'
        : switchKind === 'Tactile' || switchKind === 'SilentTactile'
          ? 'Lube giúp mình cho hết tiếng ping nha, lò xo là chính, thân switch chỉ quét mỏng thôi kẻo mất khấc.'
          : 'Nhớ lube switch giúp mình nha, lube đúng loại mỡ nhé (switch lube sẵn thì thôi).',
    )
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

/**
 * Đơn hướng dẫn đầu game (ngày 1 chỉ có đơn này): 60% layout chuẩn, mua A→Z (khách không gửi món nào), PCB hotswap
 * (chưa phải hàn), switch Linear hãng nào cũng được, keycap Cherry PBT trắng, không lube / foam / đòi đích danh; hạn dài,
 * ngân sách dư. Tour Keeb-chan (`Tour.tsx`) dắt mua đủ từng món cho đơn này
 */
export function tutorialOrder(): Order {
  const layout: LayoutId = '60'
  const keycapKit = 'full'
  const { keys } = getLayout(layout, {})
  const budget = round100(estimateCost(layout, null, keycapKit) * 1.5)
  const labor = Math.round((250 + keys.length * 6 + 80) / 50) * 50
  // khách đơn hướng dẫn (tên người dùng chọn); thẻ tin nhắn trên màn hình 3D + phụ đề `PC_LINE` đoạn mở đầu ghi cùng tên
  const customer = 'Anh QuýB'
  const days = 4
  return {
    id: `o${Date.now().toString(36)}tut`,
    tutorial: true,
    days,
    customer,
    layout,
    variant: {},
    wish: 'thock',
    keycapColor: 'white',
    keycapKit,
    keycapMaterial: 'pbt',
    type: 'full',
    kit: null,
    caseColor: null,
    mount: null,
    lubePref: 'any',
    switchKind: 'Linear',
    pcbType: 'hotswap',
    budget,
    labor,
    lines: [
      // 3 câu đầu = cốt truyện (khách cũ hồi người chơi làm thợ ở shop QMK), `chatIntro` gửi cả 3
      'Lâu quá không gặp! Mình QuýB đây, khách cũ hồi bạn còn làm thợ bên QMK nè. Dạo này bạn sao rồi?',
      'Chuyện của shop mình có nghe, nhưng mình biết tay nghề của bạn mà, mấy chuyện đó mình không quan tâm đâu.',
      'Tiện mình đang muốn có một con 60%, bạn build giúp mình nhé? Lo từ A tới Z luôn nha.',
      `${SOUND_WISH.thock.msg}.`,
      `Switch loại ${SWITCH_KINDS.Linear} là được, hãng nào cũng ok.`,
      `Keycap profile CHERRY chất liệu ${KEYCAP_MATERIALS.pbt.name} màu trắng nha.`,
      'Mạch hotswap giúp mình nha, để sau mình tự thay switch được.',
      'Stab phải êm, không được lạch cạch đâu đó!',
      `Budget linh kiện tầm ${budget.toLocaleString('vi-VN')}k, tiền công ${labor.toLocaleString('vi-VN')}k.`,
      `Shop làm trong ${days} ngày giúp mình nhé, không gấp đâu.`,
    ],
  }
}

/** variant đầu tiên của mỗi lựa chọn layout */
export const defaultVariant = (layout: LayoutId): Variant =>
  Object.fromEntries(Object.entries(LAYOUTS[layout].variants).map(([k, opts]) => [k, opts?.[0]]))

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
  // đơn hướng dẫn: khách cũ hỏi thăm rồi mới nhờ build (3 câu cốt truyện)
  const out = order.tutorial ? order.lines.slice(0, 3) : [order.lines[0]]
  // đơn case "hot" (featured): câu giới thiệu case ngay sau lời chào
  if (order.featured && order.lines[1]) out.push(order.lines[1])
  out.push(
    `${SOUND_WISH[order.wish].msg}. Làm trong ${order.days} ngày giúp mình nha, yêu cầu chi tiết mình ghi dưới đây 👇`,
  )
  return out
}

export function groupPosts(order: Order, day = 1, lv = 1): GroupPost[] {
  // chỉ pass món đã mở ở cấp xưởng
  const catalog = buildCatalog()
    .map((p) => lockProduct(p, lv))
    .filter((p) => !p.locked)
    .filter((p) => !p.layouts || p.layouts.includes(order.layout) || Math.random() < 0.15)
  const posts: GroupPost[] = []
  for (let i = 0; i < 9; i++) {
    const p = pick(catalog)
    // stab chỉ pass nguyên bộ (không đăng bán lẻ 1 con)
    const opts = p.cat === 'stab' ? p.options.filter((o) => o.label.includes('Bộ')) : p.options
    posts.push(makePost(`post-d${day}-${i}`, pick(SELLERS), p, pick(opts)))
  }
  return posts
}
