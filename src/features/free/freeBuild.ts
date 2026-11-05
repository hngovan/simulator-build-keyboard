import { useGame } from '@/store'
import { freshSession } from '@/store/shopSlice'
import { LAYOUTS, getLayout } from '@/data/layouts'
import {
  CASES,
  KEYCAP_COLORS,
  KEYCAP_KITS,
  SOUND_WISH,
  SWITCHES,
  caseFits,
  stabNeed,
  stabStock,
  type StabCount,
} from '@/data/parts'
import { avatarSrc } from '@/data/avatars'
import type { LayoutId, Order, SoundWish } from '@/types'

// Free build: chọn case (+ màu, layout, mount, PCB, plate, stab) ở bảng `FreeBuildDialog` rồi vào bàn build luôn với đủ linh kiện,
// không mua gì. Dụng cụ / vật tư đã bơm đủ lúc vào chế độ (`startFree`)

export interface FreeBuildOpts {
  caseId: string
  color: string
  layout: LayoutId
  mount: string
  pcb: string
  plate: string
  stab: string
}

/** layout lắp vừa case (case CAD / cắt sẵn chỉ hợp vài layout) */
export const freeLayouts = (caseId: string) =>
  (Object.keys(LAYOUTS) as LayoutId[]).filter((l) => caseFits(CASES[caseId], l))

const double = (c: StabCount): StabCount => ({
  short: c.short * 2,
  long: c.long * 2,
  long7: c.long7 * 2,
})

/** switch dư mỗi đơn (thay / lube chết) */
const SPARE_SWITCHES = 20

/** Dựng đơn Free build đủ linh kiện theo lựa chọn, đặt thùng lên bàn rồi vào build */
export function startFreeBuild(o: FreeBuildOpts) {
  const s = useGame.getState()
  if (!s.free || s.stabAnim || s.lubeAnim) return
  const variant = Object.fromEntries(
    Object.entries(LAYOUTS[o.layout].variants).map(([k, opts]) => [k, opts[0]]),
  )
  const { keys } = getLayout(o.layout, variant)
  const switchType = Object.keys(SWITCHES)[0]
  const keycapKit = Object.keys(KEYCAP_KITS).find(
    (id) => !KEYCAP_KITS[id].hidden && KEYCAP_KITS[id].layouts.includes(o.layout),
  )!
  const keycapColor = Object.keys(KEYCAP_COLORS)[0]
  const order: Order = {
    id: `free${Date.now().toString(36)}`,
    free: true,
    days: 999,
    dueDay: s.day + 999,
    customer: 'Free build',
    avatar: avatarSrc(0),
    layout: o.layout,
    variant,
    wish: Object.keys(SOUND_WISH)[0] as SoundWish,
    keycapColor,
    keycapKit,
    type: 'kit',
    kit: {
      packaging: 'Free build',
      case: { id: o.caseId, color: o.color },
      pcb: { layout: o.layout, type: o.pcb },
      plate: { layout: o.layout, material: o.plate },
      stab: keys.some((k) => k.stab) ? { type: o.stab, ...stabNeed(keys) } : null,
    },
    caseColor: null,
    mount: o.mount,
    lubePref: 'any',
    switchKind: SWITCHES[switchType].kind,
    budget: 0,
    labor: 0,
    lines: ['Free build: tự chọn case, đủ linh kiện, không chấm điểm'],
  }
  const session = freshSession(order, s.day, 5)
  const inventory = {
    ...session.inventory,
    switch: { type: switchType, count: keys.length + SPARE_SWITCHES },
    // stab gấp đôi số cần: tuôn ren thì có stab dư để thay (`replaceStab`)
    stab: session.inventory.stab && {
      ...session.inventory.stab,
      ...double(stabStock(session.inventory.stab)),
    },
    keycap: { kit: keycapKit, color: keycapColor },
  }
  useGame.setState({
    jobs: [],
    order,
    ...session,
    inventory,
    mount: o.mount,
    posts: [],
    result: null,
    pressed: {},
    ctx: null,
    build: null,
    future: [],
    // thùng đơn nằm sẵn trên bàn build, ngồi vào bàn luôn
    benchBox: order.id,
    held: null,
    worked: [...s.worked, order.id],
    freePick: false,
    screen: 'bench',
    walk: false,
    windows: [],
  })
  useGame.getState().startBuild()
}

/** đổi màu case ngay trên bàn (không đổi bước) */
export function setFreeCaseColor(color: string) {
  const s = useGame.getState()
  if (!s.order?.free || !s.inventory.case) return
  const item = { ...s.inventory.case, color }
  useGame.setState({
    inventory: { ...s.inventory, case: item },
    order: { ...s.order, kit: s.order.kit && { ...s.order.kit, case: item } },
  })
}
