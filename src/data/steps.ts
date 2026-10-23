import type {
  BuildContext,
  BuildState,
  Inventory,
  Key,
  Order,
  Point,
  ScrewPoint,
  ScrewStep,
  StepId,
} from '@/types'
import { getLayout } from './layouts'
import { CASES, STABS } from './parts'
import { stabModRules } from './mods'

export const STEP_INFO: Record<StepId, { title: string; hint: string }> = {
  unbox: { title: 'Mở hộp hàng', hint: 'Click vào thùng hàng để mở' },
  caseOpen: {
    title: 'Tháo vít mở case',
    hint: 'Case 2 mảnh: click từng con vít để tháo, nhấc case trên ra',
  },
  stabMod: {
    title: 'Mod stab (tuỳ chọn)',
    hint: 'Theo mũi tên vàng: cắt chân stem → Holee mod (băng Urgo) → phết mỡ housing + slider → lắp slider → phết mỡ dây → tra dây vào ngàm',
  },
  stab: { title: 'Lắp stab', hint: 'Click vào vị trí các phím dài (≥ 2u) để lắp stab' },
  switchLube: { title: 'Lube switch (tuỳ chọn)', hint: 'Click vào switch đã mở để lube 1 mẻ' },
  stabScrew: { title: 'Vặn vít stab', hint: 'Stab screw-in: vặn chặt 2 vít cho mỗi stab' },
  plate: { title: 'Đặt plate lên PCB', hint: 'Click vào board để đặt plate xuống' },
  switch: { title: 'Lắp switch', hint: 'Click vào lỗ trên plate để cắm switch' },
  solder: { title: 'Hàn switch', hint: 'Board đã lật. Giữ chuột lên chân switch tới khi chì chảy' },
  gasket: { title: 'Dán gasket', hint: 'Click các vị trí quanh plate để dán miếng đệm silicon' },
  ring: { title: 'Lắp vòng silicon', hint: 'Click vào board để bọc vòng silicon quanh' },
  caseIn: { title: 'Thả board vào case', hint: 'Click vào case để đặt board xuống' },
  trayScrew: { title: 'Bắt vít tray mount', hint: 'Vặn các vít giữ PCB vào standoff đáy case' },
  caseClose: { title: 'Đậy case trên', hint: 'Click vào case trên để đậy lại' },
  caseScrew: { title: 'Vặn vít đóng case', hint: 'Vặn các vít để khoá 2 mảnh case' },
  keycap: { title: 'Lắp keycap', hint: 'Click vào switch để cắm keycap' },
  test: {
    title: 'Test phím',
    hint: 'Gõ bàn phím thật hoặc click phím 3D. Phím đã test có chấm xanh',
  },
}

export const SCREW_STEPS: Record<ScrewStep, 'remove' | 'tighten'> = {
  caseOpen: 'remove',
  stabScrew: 'tighten',
  trayScrew: 'tighten',
  caseScrew: 'tighten',
}
export const OPTIONAL_STEPS: StepId[] = ['stabMod', 'switchLube', 'test']
export const CASE_WALL = 0.45
export const CASE_MARGIN = 0.15

// Cao độ các lớp (đơn vị u = 19.05mm). Mặt trên plate = 0
// Switch MX: plate tới PCB 5mm, plate dày 1.5mm, PCB dày 1.6mm
export const Y = {
  plateBot: -0.08,
  pcbTop: -0.26,
  pcbBot: -0.344,
  floorTop: -0.6,
  floorBot: -0.9,
  split: -0.3, // chỗ ghép case trên / case dưới
  caseTop: 0.36,
  table: -0.95,
}

const cache = new Map<string, BuildContext>()

// Kế hoạch build: danh sách bước + vị trí vít/gasket, phụ thuộc kit, mount, layout
export function buildContext(order: Order, inv: Inventory, mount: string): BuildContext {
  const ck = JSON.stringify([order.layout, order.variant, inv.case, inv.pcb, inv.stab, mount])
  const hit = cache.get(ck)
  if (hit) return hit
  const { keys, width, depth } = getLayout(order.layout, order.variant)
  const caseDef = CASES[inv.case!.id]
  const stabKeys = keys.filter((k) => k.stab)
  const stabModel = inv.stab?.type
  const stabType = stabModel ? STABS[stabModel].mount : undefined

  const steps: StepId[] = ['unbox']
  if (caseDef.pieces === 2) steps.push('caseOpen')
  if (stabKeys.length && stabType !== 'plate') {
    steps.push('stabMod', 'stab')
    if (stabType === 'screw') steps.push('stabScrew')
  }
  steps.push('plate')
  if (stabKeys.length && stabType === 'plate') steps.push('stabMod', 'stab')
  steps.push('switchLube', 'switch')
  if (inv.pcb!.type === 'solder') steps.push('solder')
  if (['gasket', 'oring', 'og'].includes(mount)) steps.push('gasket')
  if (['oring', 'og'].includes(mount)) steps.push('ring')
  steps.push('caseIn')
  if (mount === 'tray') steps.push('trayScrew')
  if (caseDef.pieces === 2) steps.push('caseClose', 'caseScrew')
  steps.push('keycap', 'test')

  // Vít case: mica xếp lớp bắt từ trên xuyên qua viền, case nhôm/PC 2 mảnh bắt từ đáy
  const screwSide = caseDef.screwSide ?? 'bottom'
  const outerZ = screwSide === 'top' ? depth / 2 + CASE_MARGIN + CASE_WALL / 2 : depth / 2 - 0.4
  const nCase = width > 16 ? 5 : 3
  const caseScrews: Point[] = []
  for (let i = 0; i < nCase; i++) {
    const x = (i / (nCase - 1) - 0.5) * (width - 1)
    caseScrews.push({ x, z: -outerZ }, { x, z: outerZ })
  }

  // Vít tray: nằm ở khe giữa các hàng phím
  const rowYs = [...new Set(keys.map((k) => k.y))].sort((a, b) => a - b)
  const gapZ = (i: number) => rowYs[Math.min(rowYs.length - 1, Math.max(1, i))] - depth / 2
  const mid = Math.floor(rowYs.length / 2)
  const trayScrews = [
    { x: -width * 0.36, z: gapZ(1) },
    { x: width * 0.36, z: gapZ(1) },
    { x: 0.5, z: gapZ(mid) },
    { x: -width * 0.3, z: gapZ(rowYs.length - 1) },
    { x: width * 0.3, z: gapZ(rowYs.length - 1) },
  ]

  const stabScrews = stabKeys.flatMap((k) => {
    const s = stabSpan(k)
    return k.h >= 2
      ? [
          { x: k.cx + 0.3, z: k.cz - s },
          { x: k.cx + 0.3, z: k.cz + s },
        ]
      : [
          { x: k.cx - s, z: k.cz - 0.32 },
          { x: k.cx + s, z: k.cz - 0.32 },
        ]
  })

  const name = (prefix: string, list: Point[]): ScrewPoint[] =>
    list.map((p, i) => ({ ...p, id: `${prefix}-${i}` }))
  const screws: Record<ScrewStep, ScrewPoint[]> = {
    caseOpen: name('open', caseScrews),
    caseScrew: name(
      'close',
      mount === 'top'
        ? [...caseScrews, ...caseScrews.map((p) => ({ x: p.x * 0.5 + 0.25, z: p.z }))]
        : caseScrews,
    ),
    trayScrew: name('tray', trayScrews),
    stabScrew: name('stab', stabScrews),
  }

  const gz = depth / 2 + 0.05
  const gaskets = [-0.375, -0.125, 0.125, 0.375].flatMap((f) => [
    { x: f * width, z: -gz },
    { x: f * width, z: gz },
  ])

  const ctx: BuildContext = {
    keys,
    width,
    depth,
    caseDef,
    stabKeys,
    stabType,
    stabModel,
    mount,
    steps,
    screws,
    gaskets,
    screwSide,
    pcbType: inv.pcb!.type,
  }
  cache.set(ck, ctx)
  return ctx
}

// Khoảng cách từ tâm phím tới 2 chân stab
export const stabSpan = (k: Key) => {
  const len = Math.max(k.w, k.h)
  return len >= 6 ? (len - 1) / 2 : 0.62
}

export function stepProgress(
  step: StepId,
  b: BuildState,
  ctx: BuildContext,
  clicks: number,
): [number, number] {
  const count = (obj: object) => Object.keys(obj).length
  switch (step) {
    case 'unbox':
      return [b.unboxed ? 1 : 0, 1]
    case 'caseOpen':
    case 'stabScrew':
    case 'trayScrew':
    case 'caseScrew': {
      const list = ctx.screws[step]
      return [list.filter((s) => (b.screws[s.id] ?? 0) >= clicks).length, list.length]
    }
    case 'stabMod': {
      // xong khi đã làm đủ các mod cần cho mẫu stab này (hoặc người chơi bấm Xong)
      const all = stabModRules(ctx.stabModel!).every((r) => !r.needed || !!b.stabMods[r.kind])
      return [b.stabModDone || all ? 1 : 0, 1]
    }
    case 'switchLube':
      return [b.lubeDone || b.lubed >= ctx.keys.length ? 1 : 0, 1]
    case 'stab':
      return [count(b.stabs), ctx.stabKeys.length]
    case 'plate':
      return [b.plate ? 1 : 0, 1]
    case 'switch':
      return [count(b.switches), ctx.keys.length]
    case 'solder':
      return [count(b.solder), ctx.keys.length]
    case 'gasket':
      return [count(b.gaskets), ctx.gaskets.length]
    case 'ring':
      return [b.ring ? 1 : 0, 1]
    case 'caseIn':
      return [b.inCase ? 1 : 0, 1]
    case 'caseClose':
      return [b.closed ? 1 : 0, 1]
    case 'keycap':
      return [count(b.keycaps), ctx.keys.length]
    case 'test':
      return [count(b.tested), ctx.keys.length]
  }
  return [0, 1]
}

// Các bước không cho lật bàn phím (đang ở bàn mod / chưa có bàn phím hoàn chỉnh)
export const NO_FLIP_STEPS: StepId[] = ['unbox', 'stabMod', 'switchLube', 'caseIn', 'caseClose']

// Các bước tự lật bàn phím để thao tác ở mặt đáy
export function autoFlip(step: StepId, ctx: BuildContext) {
  if (step === 'solder' || step === 'stabScrew') return true
  return (step === 'caseOpen' || step === 'caseScrew') && ctx.screwSide === 'bottom'
}
