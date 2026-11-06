import { useGame } from '@/store'
import { freshSession, stashActive } from '@/store/shopSlice'
import { LAYOUTS, getLayout } from '@/data/layouts'
import {
  CASES,
  KEYCAP_KITS,
  SOUND_WISH,
  SWITCHES,
  caseFits,
  mountStabIssue,
  stabNeed,
  stabStock,
  TOOLS,
  type StabCount,
} from '@/data/parts'
import { SUPPLIES } from '@/data/supplies'
import { topUpSpells } from '@/features/apps/settings/devMoney'
import { avatarSrc } from '@/data/avatars'
import type { LayoutId, Order, SoundWish, ToolKind, Variant } from '@/types'

// Free build: chọn case (+ màu, layout, mount, PCB, plate, stab, switch, keycap; feet / thiếc / O-ring = vật tư đang chọn) ở bảng `FreeBuildDialog` rồi vào bàn build luôn với đủ linh kiện,
// không mua gì. Dụng cụ / vật tư đã bơm đủ lúc vào chế độ (`startFree`).
// Dev (Cài đặt → Dev → "Build thử"): cùng bảng + đơn `order.free` nhưng ngay trong ván sự nghiệp, có lưu save (`devBuild`)

export interface FreeBuildOpts {
  caseId: string
  color: string
  layout: LayoutId
  /** kiểu layout (space / backspace / hàng dưới / shift phải); thiếu thì lấy kiểu đầu */
  variant?: Variant
  mount: string
  pcb: string
  plate: string
  stab: string
  switchType: string
  keycapKit: string
  keycapColor: string
}

/** layout lắp vừa case (case CAD / cắt sẵn chỉ hợp vài layout) */
export const freeLayouts = (caseId: string) =>
  (Object.keys(LAYOUTS) as LayoutId[]).filter((l) => caseFits(CASES[caseId], l))

/** bộ keycap lắp được layout (bỏ bộ ẩn) */
export const freeKits = (layout: LayoutId) =>
  Object.keys(KEYCAP_KITS).filter(
    (id) => !KEYCAP_KITS[id].hidden && KEYCAP_KITS[id].layouts.includes(layout),
  )

const double = (c: StabCount): StabCount => ({
  short: c.short * 2,
  long: c.long * 2,
  long7: c.long7 * 2,
})

/** switch dư mỗi đơn (thay / lube chết) */
const SPARE_SWITCHES = 20

/**
 * Build thử trong ván sự nghiệp (dev): mọi dụng cụ (trừ chứng chỉ) lên bậc cao nhất (bút / trạm hàn có cả 2), vật tư ≥ 999
 * (ghi vào save), sách phép theo công tắc dev; dụng cụ không hao mòn khi build đơn `order.free` (`wearTool`)
 */
function devTopUp() {
  const s = useGame.getState()
  const tools = { ...s.tools }
  for (const kind of Object.keys(TOOLS) as ToolKind[])
    if (kind !== 'cert' && TOOLS[kind].length > 1) tools[kind] = TOOLS[kind].length - 1
  const solderOwned = { ...s.solderOwned }
  TOOLS.solder.forEach(
    (t, lv) =>
      !t.none && lv !== tools.solder && solderOwned[lv] === undefined && (solderOwned[lv] = 0),
  )
  const supplies = { ...s.supplies }
  for (const id of Object.keys(SUPPLIES))
    if (!SUPPLIES[id].spell) supplies[id] = Math.max(supplies[id] ?? 0, 999)
  useGame.setState({ tools, solderOwned, supplies })
  topUpSpells()
}

/**
 * Dựng đơn Free build đủ linh kiện theo lựa chọn, đặt thùng lên bàn rồi vào build. Trong ván sự nghiệp (build thử dev): đơn đang
 * làm cất vào `jobs` (thùng phải không nằm trên bàn), đơn build thử cũ thì bỏ, có lưu save
 */
export function startFreeBuild(o: FreeBuildOpts) {
  const s = useGame.getState()
  if (s.stabAnim || s.lubeAnim) return
  const issue = mountStabIssue(o.mount, o.stab)
  if (issue) return s.toast(issue, 'bad')
  // đơn build thử cũ chưa đóng gói đang trên bàn: thay luôn
  const oldDev = !s.free && s.order?.free && !s.result ? s.order : null
  // thùng đã đóng gói còn trên bàn / trên tay: đặt lên kệ giao hàng trước
  if ((s.benchBox && s.benchBox !== oldDev?.id) || s.held)
    return s.toast(
      s.free || s.packed.some((p) => p.order.id === s.benchBox || p.order.id === s.held)
        ? 'Đặt thùng đã đóng gói lên kệ giao hàng trước đã'
        : 'Bàn build đang có thùng đơn: cầm thùng lên cất lại kệ cuối hành lang trước đã',
      'bad',
    )
  if (!s.free) devTopUp()
  const variant = Object.fromEntries(
    Object.entries(LAYOUTS[o.layout].variants).map(([k, opts]) => {
      const want = o.variant?.[k as keyof Variant]
      return [k, want && opts.includes(want) ? want : opts[0]]
    }),
  )
  const { keys } = getLayout(o.layout, variant)
  const { switchType, keycapColor } = o
  const keycapKit = KEYCAP_KITS[o.keycapKit]?.layouts.includes(o.layout)
    ? o.keycapKit
    : freeKits(o.layout)[0]
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
  const boxes = { ...s.boxes }
  if (oldDev) delete boxes[oldDev.id]
  useGame.setState({
    // Free build: không có đơn khác; ván sự nghiệp: cất đơn đang làm (đơn build thử cũ thì bỏ)
    jobs: s.free ? [] : oldDev ? s.jobs : stashActive(s),
    boxes,
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
