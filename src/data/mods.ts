import { STABS, SWITCHES } from './parts'
import { SUPPLIES, lubeUseFit } from './supplies'
import type { LubePref, StabMods } from '@/types'

export type StabModKind = keyof StabMods

export interface StabModRule {
  kind: StabModKind
  label: string
  /** bắt buộc để stab êm */
  needed: boolean
  /** có làm được không */
  allowed: boolean
  /** giải thích khi không cần / không nên */
  reason?: string
}

/**
 * Mod nào cần cho từng mẫu stab:
 * - Cherry: clip chân + dán Urgo + lube housing/slider + lube dây
 * - Stab đời mới (Staebies, TX, Knight): chân đã clip sẵn, khít → chỉ lube housing/slider + dây
 */
export function stabModRules(modelId: string): StabModRule[] {
  const m = STABS[modelId]
  return [
    {
      kind: 'clip',
      label: 'Clip chân stem',
      needed: m.feet,
      allowed: m.feet,
      reason: m.feet ? undefined : 'Chân stem đã clip sẵn',
    },
    // Holee mod: cắt 2 đầu dính của băng Urgo, dán vào cạnh trên lỗ cắm dây trên slider (dây tì vào băng, hết lạch cạch)
    {
      kind: 'bandaid',
      label: 'Holee mod (Urgo)',
      needed: m.feet,
      allowed: true,
      reason: m.tight ? 'Stab khít: dán băng vào sẽ bị nhũn' : undefined,
    },
    {
      kind: 'housing',
      label: 'Lube housing + slider',
      needed: !m.prelubed,
      allowed: true,
      reason: m.prelubed ? 'Đã lube sẵn từ nhà máy' : undefined,
    },
    { kind: 'assembled', label: 'Lắp slider vào housing', needed: true, allowed: true },
    { kind: 'wire', label: 'Lube dây stab', needed: true, allowed: true },
    { kind: 'wired', label: 'Tra dây vào slider + ngàm', needed: true, allowed: true },
  ]
}

// Trọng số chấm độ êm (lắp ráp không tính điểm, chỉ là thao tác bắt buộc)
const WEIGHT: Partial<Record<StabModKind, number>> = {
  clip: 0.2,
  bandaid: 0.2,
  housing: 0.25,
  wire: 0.35,
}

export interface QualityEval {
  /** 0..1 */
  q: number
  notes: string[]
}

/** Độ êm của stab sau khi mod. brushQ: chất lượng cọ lube (0..1) */
export function stabQuality(modelId: string, mods: StabMods, brushQ: number): QualityEval {
  const notes: string[] = []
  let total = 0
  let got = 0
  for (const r of stabModRules(modelId).filter((r) => r.needed && WEIGHT[r.kind])) {
    const w = WEIGHT[r.kind]!
    total += w
    let v = 0
    if (r.kind === 'clip' || r.kind === 'bandaid') v = mods[r.kind] ? 1 : 0
    else if (r.kind === 'housing' || r.kind === 'wire') {
      const lube = mods[r.kind]
      if (lube) {
        const [fit, note] = lubeUseFit(lube, r.kind)
        v = fit * brushQ
        if (fit < 0.7) notes.push(`${r.label}: ${note}`)
      }
    }
    if (!v)
      notes.push(
        r.kind === 'wire' && mods.wired
          ? 'Tra dây trước khi lube nên dây khô'
          : `Chưa ${r.label.toLowerCase()}`,
      )
    got += w * v
  }
  let q = total ? got / total : 1
  if (mods.bandaid && STABS[modelId].tight) {
    q *= 0.75
    notes.push('Holee mod vào stab khít nên bị nhũn')
  }
  return { q, notes }
}

interface SwitchLubeInput {
  switchType: string
  lubeType: string | null
  lubed: number
  nKeys: number
  springLube: string | null
  pref: LubePref
  brushQ: number
}

/** Chấm phần lube switch theo yêu cầu khách. Trả về 0..1 + mô tả */
export function switchLubeEval({
  switchType,
  lubeType,
  lubed,
  nKeys,
  springLube,
  pref,
  brushQ,
}: SwitchLubeInput): QualityEval {
  const sw = SWITCHES[switchType]
  const frac = lubed / nKeys
  const notes: string[] = []
  let quality = 1
  if (lubeType && lubed) {
    const [fit, note] = lubeUseFit(lubeType, sw.feel)
    quality = fit * brushQ
    if (fit < 0.8) notes.push(note)
    if (sw.prelubed) {
      quality *= 0.75
      notes.push('Switch đã lube sẵn, lube thêm dễ over-lube')
    }
  }
  const spring = springLube ? lubeUseFit(springLube, 'spring')[0] : 0

  if (pref === 'none') {
    if (lubed) notes.push('Khách muốn giữ tiếng gốc nhưng switch đã bị lube')
    return { q: 1 - frac, notes }
  }
  if (pref === 'want') {
    if (!lubed && sw.prelubed) return { q: 0.95, notes: ['Switch đã lube sẵn từ nhà máy'] }
    if (!spring) notes.push('Chưa lube lò xo (tiếng ping)')
    return { q: frac * quality * 0.9 + 0.1 * spring, notes }
  }
  return { q: lubed ? 1 - frac * (1 - quality) : 1, notes }
}

/** Hoạt cảnh mod stab đang chạy trên bàn mod */
export interface StabAnim {
  kind: StabModKind
  /** lube đang bôi (nếu là bước lube) */
  lube?: string
  /** performance.now() lúc bắt đầu */
  at: number
  /** thời lượng (giây) */
  dur: number
}

/** Thời lượng hoạt cảnh: mỡ càng đặc cọ quét càng chậm */
export function stabAnimDuration(kind: StabModKind, lube?: string) {
  const visc = lube ? (SUPPLIES[lube].viscosity ?? 0.5) : 0
  switch (kind) {
    case 'clip':
      return 1.8
    case 'bandaid':
      return 3.4
    case 'housing':
      return 3 + visc * 1.8 // 8 nét: 2 housing + 2 slider
    case 'wire':
      return 1.6 + visc * 1.4
    case 'assembled':
      return 1.5
    case 'wired':
      return 1.8
  }
  return 1
}
