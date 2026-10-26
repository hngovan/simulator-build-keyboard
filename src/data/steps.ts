import type {
  BuildContext,
  BuildState,
  FootPocket,
  Inventory,
  Key,
  Order,
  Point,
  ScrewBit,
  ScrewPoint,
  ScrewStep,
  StepId,
} from '@/types'
import { blockerGaps, getLayout } from './layouts'
import { CASES, STABS, caseModelOf, isPlateless } from './parts'
import CASE_FEET from './caseFeet.json'
import { stabModRules } from './mods'
import stabModel from './stabModel.json'

export const STEP_INFO: Record<StepId, { title: string; hint: string }> = {
  unbox: { title: 'Mở hộp hàng', hint: 'Click vào thùng hàng để mở' },
  caseOpen: {
    title: 'Tháo vít mở case',
    hint: 'Case ghép (2 mảnh / mica nhiều lớp): click từng con vít để tháo, nhấc phần trên ra',
  },
  stabMod: {
    title: 'Mod stab (tuỳ chọn)',
    hint: 'Theo mũi tên vàng: cắt chân stem → Holee mod (băng Urgo) → phết mỡ housing + slider → lắp slider → phết mỡ wire → lắp wire vào ngàm',
  },
  stab: { title: 'Lắp stab', hint: 'Click vào vị trí các phím dài (≥ 2u) để lắp stab' },
  switchLube: {
    title: 'Lube switch (tuỳ chọn)',
    hint: 'Click switch trên đồ mở để tách housing, stem và lò xo, rồi click switch đã mở để lube 1 mẻ',
  },
  stabScrew: { title: 'Vặn vít stab', hint: 'Stab screw-in: vặn chặt 2 vít cho mỗi stab' },
  foam: {
    title: 'Lót foam PCB (tuỳ chọn)',
    hint: 'Click vào PCB để lót tấm foam Poron (mua ở Shopii → Lube & vật tư): giảm rung, tiếng thock hơn. Không lót thì bấm bước tiếp',
  },
  plate: { title: 'Đặt plate lên PCB', hint: 'Click vào board để đặt plate xuống' },
  switch: {
    title: 'Lắp switch',
    hint: 'Click vào lỗ switch để cắm switch (số con mỗi lần theo bậc thợ + phép lắp switch)',
  },
  solder: {
    title: 'Hàn switch',
    hint: 'Board đã lật. Giữ chuột lên từng chân, nhả trong vùng xanh; giữ quá lâu hoặc hụt quá 3 lần sẽ làm cháy chân và đen mũi hàn.',
  },
  gasket: { title: 'Dán gasket', hint: 'Click các vị trí quanh plate để dán miếng đệm silicon' },
  ring: {
    title: 'Lắp vòng silicon',
    hint: 'Switch đã giữ chặt plate: click vào board để cuốn vòng O-ring vào khe giữa PCB và plate',
  },
  topCase: {
    title: 'Úp case trên',
    hint: 'Top mount: click case trên để úp xuống plate (plate bắt vít vào case trên)',
  },
  topScrew: {
    title: 'Bắt vít plate vào case trên',
    hint: 'Board đã lật: vặn các vít từ dưới lên, giữ plate vào case trên',
  },
  feet: {
    title: 'Dán feet cao su',
    hint: 'Case đã lật úp: click từng hốc tròn dưới đáy để dán feet (mỗi hốc 1 cái, chọn feet đen / trắng ở bảng bên)',
  },
  caseIn: { title: 'Thả board vào case', hint: 'Click vào case để đặt board xuống' },
  trayScrew: { title: 'Bắt vít tray mount', hint: 'Vặn các vít giữ PCB vào standoff đáy case' },
  caseClose: { title: 'Đậy case trên', hint: 'Click vào case trên để đậy lại' },
  caseScrew: { title: 'Vặn vít đóng case', hint: 'Vặn các vít để khoá các mảnh / lớp case lại' },
  keycap: {
    title: 'Lắp keycap',
    hint: 'Click vào switch để cắm keycap (số cái mỗi lần theo bậc thợ + phép lắp keycap)',
  },
  test: {
    title: 'Test phím',
    hint: 'Gõ bàn phím thật hoặc click phím 3D. Phím đã test có chấm xanh; phím không có trên bàn phím của bạn (Fn, macro...) thì click',
  },
}

export const SCREW_STEPS: Record<ScrewStep, 'remove' | 'tighten'> = {
  caseOpen: 'remove',
  stabScrew: 'tighten',
  topScrew: 'tighten',
  trayScrew: 'tighten',
  caseScrew: 'tighten',
}
/** Đầu vít cần cho từng bước vặn vít */
export const SCREW_BITS: Record<ScrewStep, ScrewBit> = {
  caseOpen: 'hex',
  stabScrew: 'phillips',
  topScrew: 'phillips',
  trayScrew: 'torx',
  caseScrew: 'hex',
}
export const BIT_LABELS: Record<ScrewBit, string> = {
  phillips: 'Chữ thập',
  hex: 'Lục giác',
  torx: 'Torx',
  flat: 'Dẹt',
}
export const OPTIONAL_STEPS: StepId[] = ['stabMod', 'foam', 'switchLube', 'test']
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
  const plateless = isPlateless(inv.plate)
  const ck = JSON.stringify([
    order.layout,
    order.variant,
    inv.case,
    inv.pcb,
    inv.stab,
    mount,
    plateless,
  ])
  const hit = cache.get(ck)
  if (hit) return hit
  const { keys, width, depth, origin, outline } = getLayout(order.layout, order.variant)
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
  // plateless: không foam / plate, switch cắm thẳng PCB (stab plate-mount đã bị chặn ở checkInventory)
  if (!plateless) steps.push('foam', 'plate')
  if (stabKeys.length && stabType === 'plate' && !plateless) steps.push('stabMod', 'stab')
  steps.push('switchLube', 'switch')
  if (inv.pcb!.type === 'solder') steps.push('solder')
  if (['gasket', 'og'].includes(mount)) steps.push('gasket')
  // O-ring / OG: switch (+ hàn) giữ chặt plate vào PCB rồi mới cuốn vòng silicon quanh viền
  if (mount === 'oring' || mount === 'og') steps.push('ring')
  // top mount (case 2 mảnh): plate bắt vít vào case trên trước, rồi cả cụm thả vào case dưới (khỏi bước đậy case)
  const topMount = mount === 'top' && caseDef.pieces === 2
  // dán feet vào đáy case trước khi lắp board vào case
  steps.push('feet')
  if (topMount) steps.push('topCase', 'topScrew')
  steps.push('caseIn')
  if (mount === 'tray') steps.push('trayScrew')
  if (caseDef.pieces === 2) steps.push(...(topMount ? [] : (['caseClose'] as const)), 'caseScrew')
  steps.push('keycap', 'test')

  const screwSide = caseDef.screwSide ?? 'bottom'
  const caseScrews = caseScrewPoints(width, depth, screwSide)

  // Vít tray: nằm ở khe giữa các hàng phím
  const rowYs = [...new Set(keys.map((k) => k.y))].sort((a, b) => a - b)
  const gapZ = (i: number) => rowYs[Math.min(rowYs.length - 1, Math.max(1, i))] - depth / 2
  const mid = Math.floor(rowYs.length / 2)
  const trayRaw = [
    { x: -width * 0.36, z: gapZ(1) },
    { x: width * 0.36, z: gapZ(1) },
    { x: 0.5, z: gapZ(mid) },
    { x: -width * 0.3, z: gapZ(rowYs.length - 1) },
    { x: width * 0.3, z: gapZ(rowYs.length - 1) },
  ]
  // vít tray không được nằm dưới khối chặn liền case (khe 75% / 65%, quanh cụm mũi tên): dời dần vào giữa tới chỗ trống
  const blocks = blockerGaps(keys, width, depth, CASE_MARGIN + 0.05)
  const blocked = (x: number, z: number) =>
    blocks.some((b) => Math.abs(x - b.x) < b.w / 2 + 0.15 && Math.abs(z - b.z) < b.d / 2 + 0.15)
  const trayScrews = trayRaw.map((p) => {
    // dời ngang dần vào giữa; dải chắn chạy hết bề ngang (giữa hàng F và hàng số) thì dời sang khe hàng kế tiếp
    for (let dz = 0; dz <= 3; dz++) {
      const z = p.z + dz * (p.z < 0 ? 1 : -1) * 0.5
      let x = p.x
      for (let i = 0; i < 40 && blocked(x, z); i++) x -= Math.sign(x || 1) * 0.25
      if (!blocked(x, z)) return { ...p, x, z }
    }
    return p
  })

  // vít screw-in bắt vào lỗ nhỏ của stab
  const stabScrews = stabKeys.flatMap((k) =>
    stabHoles(k)
      .filter((h) => !h.big)
      .map(({ x, z }) => ({ x, z })),
  )

  const name = (prefix: string, list: Point[]): ScrewPoint[] =>
    list.map((p, i) => ({ ...p, id: `${prefix}-${i}` }))
  const screws: Record<ScrewStep, ScrewPoint[]> = {
    caseOpen: name('open', caseScrews),
    caseScrew: name('close', caseScrews),
    // top mount: vít xuyên tai plate bắt vào mép dưới vách case trên, vặn từ dưới lên
    topScrew: name(
      'top',
      caseScrews.map((p) => ({
        x: p.x,
        z: Math.sign(p.z) * (depth / 2 + CASE_MARGIN + CASE_WALL / 2),
      })),
    ),
    trayScrew: name('tray', trayScrews),
    stabScrew: name('stab', stabScrews),
  }

  const gz = depth / 2 + 0.05
  const gaskets = [-0.375, -0.125, 0.125, 0.375].flatMap((f) => [
    { x: f * width, z: -gz },
    { x: f * width, z: gz },
  ])

  const feet = feetPockets(caseModelOf(caseDef, order.layout, order.variant), width, depth, origin)

  const ctx: BuildContext = {
    layout: order.layout,
    variant: order.variant,
    keys,
    origin,
    outline,
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
    feet,
    screwSide,
    pcbType: inv.pcb!.type,
    plateless,
  }
  cache.set(ck, ctx)
  return ctx
}

/**
 * Vít ghép case 2 mảnh: mica xếp lớp bắt xuyên qua viền (lỗ xuyên mọi lớp, bắt từ trên hoặc từ đáy đều được),
 * case nhôm / PC / acrylic 2 mảnh bắt từ đáy lên case trên (lỗ ở đáy)
 */
export function caseScrewPoints(
  width: number,
  depth: number,
  screwSide: 'top' | 'bottom',
): Point[] {
  const outerZ = screwSide === 'top' ? depth / 2 + CASE_MARGIN + CASE_WALL / 2 : depth / 2 - 0.4
  const n = width > 16 ? 5 : 3
  const out: Point[] = []
  for (let i = 0; i < n; i++) {
    // bắt từ đáy: 2 vít đầu hàng lùi vào thêm cho khỏi chạm hốc feet ở 4 góc
    const x = (i / (n - 1) - 0.5) * (width - (screwSide === 'top' ? 1 : 1.8))
    out.push({ x, z: -outerZ }, { x, z: outerZ })
  }
  return out
}

/** lỗ bắt vít case ở đáy / xuyên lớp mica (u, ~M2.5 + đầu vít) */
export const SCREW_HOLE_R = 0.1

/**
 * Lỗ vít case 2 mảnh để khoét vào vỏ: bắt từ đáy → hốc đầu vít ở mặt đáy (sâu như hốc feet);
 * mica bắt từ trên → lỗ xuyên viền mọi lớp (dùng chung danh sách, sâu không dùng)
 */
export function caseScrewHoles(
  caseDef: { pieces: 1 | 2; screwSide?: 'top' | 'bottom' },
  width: number,
  depth: number,
): FootPocket[] {
  if (caseDef.pieces !== 2) return []
  return caseScrewPoints(width, depth, caseDef.screwSide ?? 'bottom').map((p) => ({
    ...p,
    r: SCREW_HOLE_R,
    depth: FOOT_DEPTH,
  }))
}

/** 1u = 19.05mm */
const MM = 1 / 19.05
/**
 * Hốc feet dưới đáy case (u, toạ độ cảnh): case CAD lấy hốc dò sẵn trong model (`caseFeet.json`, mm);
 * case dựng bằng code: 4 hốc tròn CNC gần 4 góc, nằm trong sàn đáy (không ăn vào thành)
 */
export function feetPockets(
  model: string | undefined,
  width: number,
  depth: number,
  origin: [number, number],
): FootPocket[] {
  const pockets = model ? (CASE_FEET as Record<string, number[][]>)[model] : undefined
  if (pockets)
    return pockets.map(([x, z, r, d]) => ({
      x: x * MM - origin[0],
      z: z * MM - origin[1],
      r: r * MM,
      depth: d * MM,
    }))
  const W = width + 2 * (CASE_MARGIN + CASE_WALL)
  const D = depth + 2 * (CASE_MARGIN + CASE_WALL)
  return [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].map(([sx, sz]) => ({
    x: sx * (W / 2 - 0.9),
    z: sz * (D / 2 - 0.75),
    r: FOOT_R,
    depth: FOOT_DEPTH,
  }))
}
/** bán kính hốc feet case dựng bằng code (u, ~4mm) */
export const FOOT_R = 0.21
/** độ sâu hốc feet CNC (u, ~0,8mm): nông để feet bán cầu lồi hẳn ra dưới đáy */
export const FOOT_DEPTH = 0.042

// Khoảng cách từ tâm phím tới 2 chân stab
export const stabSpan = (k: Key) => {
  const len = Math.max(k.w, k.h)
  return len >= 6 ? (len - 1) / 2 : 0.62
}

/** lỗ stab Cherry trên PCB (u, mỗi bên 2 lỗ): lỗ nhỏ 3.05mm ở -6.985mm, lỗ lớn 3.97mm ở +8.255mm */
const STAB_HOLE = { small: { dz: -6.985, r: 1.6 }, big: { dz: 8.255, r: 2 } }

/** 2 lỗ chân housing mỗi bên stab, đúng chỗ chốt của model CAD (phím dọc xoay 90°, phím xoay Alice theo `rot`) */
export function stabHoles(k: Key) {
  const s = stabSpan(k)
  const vertical = k.h >= 2
  return [-s, s].flatMap((side) =>
    (['small', 'big'] as const).map((kind) => {
      const dz = STAB_HOLE[kind].dz / 19.05
      // housing xoay π/2 quanh y: (x, z) → (z, -x)
      const [dx, dzz] = vertical ? [dz, -side] : [side, dz]
      return {
        x: k.cx + dx * Math.cos(k.rot) + dzz * Math.sin(k.rot),
        z: k.cz - dx * Math.sin(k.rot) + dzz * Math.cos(k.rot),
        r: STAB_HOLE[kind].r / 19.05,
        big: kind === 'big',
      }
    }),
  )
}

/** Nhóm stab theo loại dây: phím 2u–2.75u dùng chung dây 2.25u, mỗi cỡ phím dài (6u / 6.25u / 7u) 1 nhóm */
export interface StabSet {
  long: boolean
  /** vd "2u · 2.25u · 2.75u" hoặc "6.25u" */
  label: string
  count: number
  /** khoảng cách tâm stab → tâm slider (mm) của dây */
  spanMm: number
}

const keyLen = (k: Key) => Math.max(k.w, k.h)

export function stabSets(stabKeys: Key[]): StabSet[] {
  const sets: StabSet[] = []
  const short = stabKeys.filter((k) => keyLen(k) < 6)
  if (short.length) {
    const sizes = [...new Set(short.map(keyLen))].sort((a, b) => a - b)
    sets.push({
      long: false,
      label: sizes.map((s) => `${s}u`).join(' · '),
      count: short.length,
      spanMm: stabModel.spans['2.25u'],
    })
  }
  const longs = [...new Set(stabKeys.map(keyLen).filter((l) => l >= 6))].sort((a, b) => a - b)
  for (const len of longs) {
    const keys = stabKeys.filter((k) => keyLen(k) === len)
    sets.push({
      long: true,
      label: `${len}u`,
      count: keys.length,
      spanMm: stabSpan(keys[0]) * 19.05,
    })
  }
  return sets
}

/**
 * Từng stab thật trên PCB (bàn mod bày đúng số stab theo layout): phím ngắn trước (theo cỡ), phím dài sau.
 * Mỗi phần tử count = 1, label = cỡ phím
 */
export function stabUnits(stabKeys: Key[]): StabSet[] {
  return [...stabKeys]
    .sort((a, b) => keyLen(a) - keyLen(b))
    .map((k) => {
      const long = keyLen(k) >= 6
      return {
        long,
        label: `${keyLen(k)}u`,
        count: 1,
        spanMm: long ? stabSpan(k) * 19.05 : stabModel.spans['2.25u'],
      }
    })
}

/** Tiến độ cả build 0..1: bước đã qua tính đủ, các bước còn lại theo stepProgress */
export function buildPercent(b: BuildState, ctx: BuildContext, clicks: number) {
  if (!ctx.steps.length) return 0
  const sum = ctx.steps.reduce((acc, st, i) => {
    if (i < b.stepIdx) return acc + 1
    const [d, t] = stepProgress(st, b, ctx, clicks)
    return acc + (t > 0 ? Math.min(1, d / t) : 0)
  }, 0)
  return sum / ctx.steps.length
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
    case 'topScrew':
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
    case 'foam':
      return [b.foam ? 1 : 0, 1]
    case 'switch':
      return [count(b.switches), ctx.keys.length]
    case 'solder':
      return [
        Object.values(b.solder).filter((joint) => joint === true || !joint.burnt).length,
        ctx.keys.length,
      ]
    case 'gasket':
      return [count(b.gaskets), ctx.gaskets.length]
    case 'ring':
      return [b.ring ? 1 : 0, 1]
    case 'feet':
      return [count(b.feet ?? {}), ctx.feet.length]
    case 'caseIn':
      return [b.inCase ? 1 : 0, 1]
    case 'caseClose':
    case 'topCase':
      return [b.closed ? 1 : 0, 1]
    case 'keycap':
      return [count(b.keycaps), ctx.keys.length]
    case 'test':
      return [count(b.tested), ctx.keys.length]
  }
  return [0, 1]
}

// Các bước không cho lật bàn phím (đang ở bàn mod / chưa có bàn phím hoàn chỉnh)
export const NO_FLIP_STEPS: StepId[] = [
  'unbox',
  'stabMod',
  'switchLube',
  'caseIn',
  'caseClose',
  'topCase',
]

// Các bước tự lật bàn phím để thao tác ở mặt đáy
export function autoFlip(step: StepId, ctx: BuildContext) {
  if (step === 'solder' || step === 'stabScrew' || step === 'topScrew' || step === 'feet')
    return true
  return (step === 'caseOpen' || step === 'caseScrew') && ctx.screwSide === 'bottom'
}
