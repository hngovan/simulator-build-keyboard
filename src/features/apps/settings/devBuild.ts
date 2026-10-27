import { useGame } from '@/store'
import { freshSession, stashActive } from '@/store/shopSlice'
import { LAYOUTS, getLayout } from '@/data/layouts'
import { buildContext, remapStepIdx } from '@/data/steps'
import {
  CASES,
  KEYCAP_COLORS,
  KEYCAP_KITS,
  SOUND_WISH,
  SWITCHES,
  TOOLS,
  caseFits,
  stabNeed,
} from '@/data/parts'
import { SUPPLIES } from '@/data/supplies'
import { avatarSrc } from '@/data/avatars'
import type { LayoutId, Order, SoundWish, ToolKind } from '@/types'

// Chỉ dùng khi dev: dựng sẵn 1 đơn đủ đồ cho case / màu bất kỳ để thử quy trình build

export interface DevBuildOpts {
  caseId: string
  color: string
  layout: LayoutId
  mount: string
  pcb: string
  plate: string
  stab: string
}

/** layout lắp vừa case (case CAD / cắt sẵn chỉ hợp vài layout) */
export const devLayouts = (caseId: string) =>
  (Object.keys(LAYOUTS) as LayoutId[]).filter((l) => caseFits(CASES[caseId], l))

/** dụng cụ chưa có thì cấp bậc 1, vật tư (trừ sách phép) bơm lên 999: build thử không bị chặn vì thiếu đồ */
function topUp() {
  const s = useGame.getState()
  const tools = { ...s.tools }
  for (const kind of Object.keys(TOOLS) as ToolKind[])
    if (kind !== 'cert' && !tools[kind] && TOOLS[kind][0]?.none && TOOLS[kind].length > 1)
      tools[kind] = 1
  const supplies = { ...s.supplies }
  for (const id of Object.keys(SUPPLIES))
    if (!SUPPLIES[id].spell) supplies[id] = Math.max(supplies[id] ?? 0, 999)
  useGame.setState({ tools, supplies })
}

/** Cất đơn đang làm (đơn build thử cũ thì bỏ) rồi vào bàn build với đơn thử đủ linh kiện */
export function startDevBuild(o: DevBuildOpts) {
  const s = useGame.getState()
  if (s.stabAnim || s.lubeAnim) return
  const jobs = s.order?.dev ? s.jobs : stashActive(s)
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
    id: `dev${Date.now().toString(36)}`,
    dev: true,
    days: 99,
    dueDay: s.day + 99,
    customer: 'Build thử (dev)',
    avatar: avatarSrc(0),
    layout: o.layout,
    variant,
    wish: Object.keys(SOUND_WISH)[0] as SoundWish,
    keycapColor,
    keycapKit,
    type: 'kit',
    kit: {
      packaging: 'Dev',
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
    lines: ['Đơn build thử khi dev'],
  }
  topUp()
  const session = freshSession(order, s.day)
  const inventory = {
    ...session.inventory,
    switch: { type: switchType, count: keys.length },
    keycap: { kit: keycapKit, color: keycapColor },
  }
  useGame.setState({
    jobs,
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
    benchPicker: false,
  })
  useGame.getState().startBuild()
}

/** đơn build thử: đổi màu case ngay trên bàn (không đổi bước) */
export function setDevCaseColor(color: string) {
  const s = useGame.getState()
  if (!s.order?.dev || !s.inventory.case) return
  const item = { ...s.inventory.case, color }
  useGame.setState({
    inventory: { ...s.inventory, case: item },
    order: { ...s.order, kit: s.order.kit && { ...s.order.kit, case: item } },
  })
}

/**
 * Đơn build thử: đổi case (chất liệu / dòng khác) hoặc mount giữa chừng. Giữ nguyên tiến độ build, tìm lại bước theo tên;
 * case mới thêm bước (vd dán gasket) trước chỗ đang làm thì lùi về bước đó (`remapStepIdx`); undo / redo xoá vì ảnh chụp cũ lệch bước
 */
export function setDevCase(caseId: string, mount?: string) {
  const s = useGame.getState()
  if (!s.order?.dev || !s.inventory.case || !s.ctx || s.stabAnim || s.lubeAnim) return
  const def = CASES[caseId]
  const nextMount =
    mount && def.mounts.includes(mount)
      ? mount
      : def.mounts.includes(s.mount ?? '')
        ? s.mount!
        : def.mounts[0]
  const color = def.colors.includes(s.inventory.case.color) ? s.inventory.case.color : def.colors[0]
  const item = { id: caseId, color }
  const order: Order = {
    ...s.order,
    mount: nextMount,
    kit: s.order.kit && { ...s.order.kit, case: item },
  }
  const inventory = { ...s.inventory, case: item }
  const ctx = buildContext(order, inventory, nextMount)
  const build = s.build && {
    ...s.build,
    stepIdx: remapStepIdx(s.ctx.steps, ctx.steps, s.build.stepIdx),
  }
  useGame.setState({ order, inventory, mount: nextMount, ctx, build, history: [], future: [] })
}
