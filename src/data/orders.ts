import type { GroupPost, Kit, LayoutId, LubePref, Order, SoundWish } from '@/types'
import { LAYOUTS, getLayout, randomVariant, variantText } from './layouts'
import {
  CASES,
  PLATES,
  STABS,
  PCB_TYPES,
  MOUNTS,
  KEYCAP_KITS,
  KEYCAP_COLORS,
  CASE_COLORS,
  SOUND_WISH,
  SIZE_MULT,
  buildCatalog,
  keycapKitFor,
} from './parts'

const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]
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
const AVATARS = ['🧑‍💻', '👩‍🎨', '🧑‍🎓', '👨‍🔧', '👩‍💼', '🧔', '👱', '👩‍🚀']
const PACKAGING = ['túi zip', 'hộp giấy', 'thùng carton']

function estimateCost(layout: LayoutId, kit: Kit | null) {
  const { keys } = getLayout(layout, {})
  const needStab = keys.some((k) => k.stab)
  let cost = Math.ceil(keys.length / 10) * 65 + KEYCAP_KITS[keycapKitFor(layout)].price
  if (needStab && !kit?.stab) cost += 150
  if (!kit) {
    const ff = LAYOUTS[layout].ff
    const cheapestCase = Math.min(
      ...Object.values(CASES)
        .filter((c) => c.ff === ff)
        .map((c) => c.price),
    )
    cost += cheapestCase * 1.6 + (PCB_TYPES.hotswap.price + PLATES.fr4.price) * SIZE_MULT[layout]
  }
  return cost
}

export function randomOrder(): Order {
  const layout = pick(Object.keys(LAYOUTS) as LayoutId[])
  const variant = randomVariant(layout)
  const { keys } = getLayout(layout, variant)
  const wish = pick(Object.keys(SOUND_WISH) as SoundWish[])
  const keycapColor = pick(Object.keys(KEYCAP_COLORS))
  const type: Order['type'] = Math.random() < 0.5 ? 'kit' : 'full'
  const ff = LAYOUTS[layout].ff
  let kit: Kit | null = null
  let caseColor: string | null = null
  let mount: string | null = null
  if (type === 'kit') {
    const caseId = pick(Object.keys(CASES).filter((id) => CASES[id].ff === ff))
    const c = CASES[caseId]
    mount = pick(c.mounts)
    kit = {
      packaging: pick(PACKAGING),
      case: { id: caseId, color: pick(c.colors) },
      pcb: { layout, type: pick(Object.keys(PCB_TYPES)) },
      plate: { layout, material: pick(Object.keys(PLATES)) },
      stab: Math.random() < 0.5 ? { type: pick(Object.keys(STABS)) } : null,
    }
  } else if (Math.random() < 0.6) {
    // chỉ chọn màu mà có case cùng form factor bán
    caseColor = pick([
      ...new Set(
        Object.values(CASES)
          .filter((c) => c.ff === ff)
          .flatMap((c) => c.colors),
      ),
    ])
  }
  // khách thích tiếng gốc (hay gặp với switch Cherry) thì dặn không lube
  const r = Math.random()
  const lubePref: LubePref = r < 0.4 ? 'want' : r < 0.6 ? 'none' : 'any'
  const budget = round100(estimateCost(layout, kit) * (1.25 + Math.random() * 0.4))
  const solder = kit?.pcb.type === 'solder' ? keys.length * 3 : 0
  const extra =
    (kit && CASES[kit.case.id].pieces === 2 ? 100 : 0) +
    (lubePref === 'want' ? keys.length * 4 : 0) +
    (keys.some((k) => k.stab) ? 80 : 0)
  const labor = Math.round((250 + keys.length * 6 + solder + extra) / 50) * 50
  const customer = pick(CUSTOMERS)

  const L = LAYOUTS[layout].name
  const lines = [`Chào shop! Build giúp mình 1 con ${L} nhé.`]
  const vt = variantText(variant)
  if (vt.length) lines.push(`Layout mình chơi: ${vt.join(', ')}.`)
  lines.push(`${SOUND_WISH[wish].msg}.`)
  lines.push(`Keycap màu ${KEYCAP_COLORS[keycapColor].name.toLowerCase()} nha.`)
  if (kit) {
    lines.push(
      `Mình gửi kit qua (${kit.packaging}): case ${CASES[kit.case.id].name}, PCB ${PCB_TYPES[kit.pcb.type].name.toLowerCase()}, plate ${PLATES[kit.plate.material].name}` +
        (kit.stab ? `, stab ${STABS[kit.stab.type].name}` : '') +
        '.',
    )
    lines.push(`Build ${MOUNTS[mount!].name} giúp mình nhé.`)
  } else {
    lines.push('Shop lo từ A tới Z luôn nha.')
    if (caseColor) lines.push(`Case màu ${CASE_COLORS[caseColor].name.toLowerCase()} nếu được.`)
  }
  if (lubePref === 'want')
    lines.push('Nhớ lube switch giúp mình nha, lube đúng loại mỡ nhé (switch lube sẵn thì thôi).')
  if (lubePref === 'none') lines.push('Mình thích tiếng sạn gốc của switch, đừng lube switch nhé!')
  if (keys.some((k) => k.stab)) lines.push('Stab phải êm, không được lạch cạch đâu đó!')
  lines.push(
    `Budget linh kiện tầm ${budget.toLocaleString('vi-VN')}k, tiền công ${labor.toLocaleString('vi-VN')}k.`,
  )

  return {
    customer,
    avatar: pick(AVATARS),
    layout,
    variant,
    wish,
    keycapColor,
    type,
    kit,
    caseColor,
    mount,
    lubePref,
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
const CAPTIONS = [
  'Pass lại do lên đời',
  'Dư 1 bộ, pass rẻ cho ae',
  'Hàng new seal, ib chốt',
  'Còn mới 95%, fullbox',
  'Cần tiền pass gấp',
  'Mua về không hợp tay, pass',
]

// Bài đăng trong "Hội Phím Cơ": hàng giá rẻ nhưng có tỉ lệ bị bùng
export function groupPosts(order: Order): GroupPost[] {
  const catalog = buildCatalog().filter(
    (p) => !p.layouts || p.layouts.includes(order.layout) || Math.random() < 0.15,
  )
  const posts: GroupPost[] = []
  for (let i = 0; i < 9; i++) {
    const p = pick(catalog)
    const opt = pick(p.options)
    posts.push({
      id: `post-${i}`,
      seller: pick(SELLERS),
      caption: pick(CAPTIONS),
      product: p,
      opt,
      price: Math.round(opt.price * (0.6 + Math.random() * 0.2)),
      likes: Math.floor(Math.random() * 80),
      sold: false,
    })
  }
  return posts
}
