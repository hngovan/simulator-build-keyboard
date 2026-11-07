// Vật tư tiêu hao: mua 1 lần dùng cho nhiều đơn. packs: [số lượt dùng, giá k]
import type { SkillSpec } from './skillCheck'

/** nhãn dán cuộn thiếc (`solderSpool.ts`) */
export type SpoolLabel = 'sakura' | 'asahi' | 'noname'

/** Mục đích dùng lube */
export type LubeUse = 'linear' | 'tactile' | 'clicky' | 'housing' | 'wire' | 'spring'

export interface SupplyDef {
  name: string
  unit: string
  color: string
  desc: string
  packs: [number, number][]
  /** độ đặc 0 (dầu loãng) → 1 (mỡ rất đặc): quyết định độ dày lớp mỡ + tốc độ quét cọ */
  viscosity?: number
  /** độ đục khi bôi: Permatex / dầu gần như trong suốt, BDZ trắng đục */
  opacity?: number
  /** độ hợp (0..1) khi dùng cho từng mục đích; không có = không dùng được */
  fit?: Partial<Record<LubeUse, number>>
  /** ghi chú khi dùng sai mục đích */
  warn?: Partial<Record<LubeUse, string>>
  /**
   * cuộn thiếc hàn: speed = xếp hạng (nhỏ = xịn), shine = độ bóng mối hàn 0..1,
   * slow = thiếc chảy chậm (skill check hàn hẹp vùng xanh, `solderSkill`), burnChance = tỉ lệ ẩn cháy chân dù nhả đúng vùng xanh (không hiện cho người chơi),
   * label = nhãn dán mặt cuộn
   */
  solder?: {
    speed: number
    shine: number
    slow?: number
    burnChance?: number
    label?: SpoolLabel
  }
  /** sách phép (mục Shopii "Sách phép"): số switch cộng thêm mỗi lần mở / mỗi mẻ lube, mỗi lần dùng trừ 1 */
  spell?: number
  /** feet cao su dán đáy case (bước `feet`): 1 vỉ 4 cái */
  feet?: true
  /** dây O-ring silicon cuốn quanh board (bước `ring`, O-ring mount): độ cứng Shore A (30 mềm → 70 cứng) */
  oring?: { shore: number }
  /** tấm foam Poron lót giữa PCB và plate (bước `foam`): bán tấm nguyên, lót thì cắt theo layout */
  pcbFoam?: true
  /** tấm foam lót đáy case (bước `caseFoam`): 1 tấm / bàn phím, lót thì khoét lỗ trụ tray + chỗ DTB */
  caseFoam?: true
  /** dải gasket Poron dán tai plate (bước `gasket`): mỗi điểm gasket dán 2 miếng, trên + dưới tai */
  gasketStrip?: true
}

/** foam Poron lót PCB – plate: 1 tấm / bàn phím */
export const FOAM_ID = 'foamPoron'
/** foam Poron lót đáy case: 1 tấm / bàn phím */
export const CASE_FOAM_ID = 'foamCase'
/** dải gasket Poron 20mm (gasket mount): mỗi điểm gasket dán đủ dải phủ hết tai, mặt trên + mặt dưới (`gasketStrips`) */
export const GASKET_ID = 'gasketPoron'

/** feet cao su dán đáy case: id vật tư theo màu (chọn ở bảng bước dán feet, Shopii gộp 1 sản phẩm) */
const FEET_COLORS: [id: string, name: string, color: string][] = [
  ['feetBlack', 'đen', '#1c1c1f'],
  ['feetWhite', 'trắng', '#f1f0ec'],
  ['feetGray', 'xám', '#6f7378'],
  ['feetClear', 'trong', '#d6dde0'],
  ['feetRed', 'đỏ', '#b3262c'],
  ['feetBlue', 'xanh dương', '#2d55a6'],
  ['feetGreen', 'xanh lá', '#3f8f5a'],
  ['feetPink', 'hồng', '#e79ab6'],
  ['feetYellow', 'vàng', '#e2b93b'],
  ['feetPurple', 'tím', '#6b4a9c'],
]
export const FEET_IDS = FEET_COLORS.map(([id]) => id)

/** dây O-ring silicon theo độ cứng: trắng 30A (mềm, nhún nhiều) → đen 50A → cam 70A (cứng, chắc tay) */
const ORING_DEFS: [id: string, shore: number, name: string, color: string, desc: string][] = [
  ['oring30', 30, 'trắng', '#f1f0ea', 'Mềm nhất: board nhún sâu, tiếng trầm êm, gõ mềm tay'],
  ['oring50', 50, 'đen', '#1f2024', 'Độ cứng vừa: cân bằng giữa nhún và chắc, dùng đa số build'],
  ['oring70', 70, 'cam', '#e8762a', 'Cứng nhất: board ít nhún, tiếng chắc, cao hơn chút'],
]
export const ORING_IDS = ORING_DEFS.map(([id]) => id)

function oringDefs(): Record<string, SupplyDef> {
  return Object.fromEntries(
    ORING_DEFS.map(([id, shore, name, color, desc]) => [
      id,
      {
        name: `Dây O-ring ${shore}A (${name})`,
        unit: 'vòng',
        color,
        packs: [
          [1, 30],
          [5, 120],
        ],
        desc: `Dây O-ring silicon cuốn quanh viền board (O-ring mount), 1 vòng / bàn phím. ${desc}`,
        oring: { shore },
      },
    ]),
  )
}

/** Vỉ 4 feet bán cầu mỗi màu, cùng giá */
function feetDefs(): Record<string, SupplyDef> {
  return Object.fromEntries(
    FEET_COLORS.map(([id, name, color]) => [
      id,
      {
        name: `Feet cao su ${name}`,
        unit: 'cái',
        color,
        packs: [[4, 25]],
        desc: 'Vỉ 4 feet bán cầu dán đáy case, chống trượt, nhiều màu cho hợp màu case. 1 lần mua = 4 cái',
        feet: true,
      },
    ]),
  )
}

/** gói sách phép: 100 / 200 / 500 lần (gói lớn rẻ hơn mỗi lần) */
const SPELL_PACKS: [number, number][] = [
  [100, 450],
  [200, 800],
  [500, 1800],
]

export const SUPPLIES: Record<string, SupplyDef> = {
  // mỗi cuộn thiếc dùng được 1000 mối hàn (mỗi phím 2 mối)
  solderCheap: {
    name: 'Thiếc đểu',
    unit: 'mối hàn',
    color: '#55595e',
    packs: [[1000, 20]],
    desc: 'Rẻ đi đôi với chất lượng: chảy chậm, mối hàn xỉn, có tỉ lệ nhỏ cháy chân dù nhả đúng vùng xanh',
    solder: { speed: 1.5, shine: 0.2, slow: 0.5, burnChance: 0.15, label: 'noname' },
  },
  solder6337: {
    name: 'Thiếc Sakura 63/37',
    unit: 'mối hàn',
    color: '#62666b',
    packs: [[1000, 90]],
    desc: 'Thiếc xịn lõi nhựa thông: chảy đều, ăn chân tốt, mối hàn sáng',
    solder: { speed: 0.85, shine: 0.85, label: 'sakura' },
  },
  solderPro: {
    name: 'Thiếc Asahi 0.6mm',
    unit: 'mối hàn',
    color: '#70757a',
    packs: [[1000, 160]],
    desc: 'Thiếc xịn nhất: chảy cực nhanh, mối hàn bóng đẹp như hàn máy',
    solder: { speed: 0.6, shine: 1, label: 'asahi' },
  },
  // feet cao su: chỉ khác màu → Shopii gộp 1 sản phẩm, chọn màu bằng option (`FEET_IDS`)
  ...feetDefs(),
  // dây O-ring: chỉ khác độ cứng → Shopii gộp 1 sản phẩm, chọn độ cứng bằng option (`ORING_IDS`)
  ...oringDefs(),
  foamPoron: {
    name: 'Foam Poron lót PCB (đen)',
    unit: 'tấm',
    color: '#2a2b30',
    packs: [
      [1, 60],
      [5, 250],
    ],
    desc: 'Tấm Poron đen nguyên tấm, dùng được mọi layout (lót lên PCB thì cắt lỗ switch + khe stab): giảm rung, tiếng thock trầm hơn',
    pcbFoam: true,
  },
  foamCase: {
    name: 'Foam Poron lót đáy case (đen)',
    unit: 'tấm',
    color: '#1f2024',
    packs: [
      [1, 50],
      [5, 210],
    ],
    desc: 'Tấm Poron đen lót đáy case (lót thì khoét lỗ trụ tray mount + chỗ daughterboard): bớt tiếng rỗng trong lòng case, đỡ vang góc case viền mỏng',
    caseFoam: true,
  },
  // tham khảo "Poron Gasket Foam Strips 20pcs" (20 × 4mm, dày 2 / 3mm, ~8–10 USD)
  gasketPoron: {
    name: 'Dải gasket Poron 20 × 4mm',
    unit: 'miếng',
    color: '#26272b',
    packs: [
      [20, 180],
      // Blossom 9 dải dài hết tai = 62 miếng
      [100, 750],
    ],
    desc: 'Gasket mount: dải Poron dày 2mm có keo, dán mặt trên + mặt dưới mỗi tai plate (2 miếng / điểm gasket), plate kẹp nhún giữa 2 mảnh case',
    gasketStrip: true,
  },
  urgo: {
    name: 'Băng keo cá nhân Urgo',
    unit: 'cái',
    color: '#e9c9a8',
    packs: [
      [10, 25],
      [50, 90],
    ],
    desc: 'Holee mod: 1 miếng cắt đôi dán được 2 stab, hết tiếng lạch cạch',
  },
  g0: {
    viscosity: 0.35,
    opacity: 0.5,
    name: 'Krytox 205g0',
    unit: 'switch',
    color: '#f4f4f0',
    packs: [
      [120, 120],
      [260, 220],
    ],
    desc: 'Mỡ loãng vừa, chuẩn cho switch linear. Tactile thì chỉ quét siêu mỏng',
    fit: { linear: 1, tactile: 0.5, clicky: 0.2, housing: 0.75, wire: 0.3, spring: 0.6 },
    warn: {
      tactile: 'Lỡ tay quét dày là mất khấc, bết như phím màng',
      clicky: 'Lube thân switch clicky là mất tiếng click, chỉ nên lube lò xo',
    },
  },
  g00: {
    viscosity: 0.22,
    opacity: 0.4,
    name: 'Krytox 205g00',
    unit: 'switch',
    color: '#f7f7f2',
    packs: [[120, 130]],
    desc: 'Loãng hơn 205g0: dùng được cho tactile nếu quét micro-layer',
    fit: { linear: 0.9, tactile: 0.75, clicky: 0.3, housing: 0.6, wire: 0.2, spring: 0.7 },
    warn: {
      tactile: 'Quét mỏng vẫn làm khấc nhẹ đi, tránh chân stem',
      clicky: 'Lube thân switch clicky là mất tiếng click, chỉ nên lube lò xo',
    },
  },
  g2: {
    viscosity: 0.7,
    opacity: 0.75,
    name: 'Krytox 205g2',
    unit: 'switch/stab',
    color: '#fafafa',
    packs: [
      [60, 120],
      [150, 250],
    ],
    desc: 'Mỡ đặc: lube housing + slider stab rất tốt, switch linear cho tiếng đầm',
    fit: { linear: 0.95, tactile: 0.25, clicky: 0.1, housing: 1, wire: 0.6, spring: 0.3 },
    warn: {
      tactile: 'Mỡ đặc làm khấc tactile không còn rõ',
      clicky: 'Mỡ đặc làm clicky mất hẳn tiếng click',
    },
  },
  t3203: {
    viscosity: 0.3,
    opacity: 0.45,
    name: 'Tribosys 3203',
    unit: 'switch',
    color: '#e3dcf5',
    packs: [[120, 130]],
    desc: 'Mỡ loãng, an toàn nhất cho tactile (quét mỏng rail, tránh chân stem): khấc chỉ nhẹ đi chút',
    fit: { linear: 0.8, tactile: 0.85, clicky: 0.3, housing: 0.6, wire: 0.3, spring: 0.5 },
    warn: {
      tactile: 'Khấc nhẹ đi một chút so với để khô',
      clicky: 'Lube thân switch clicky là mất tiếng click, chỉ nên lube lò xo',
    },
  },
  t3204: {
    viscosity: 0.4,
    opacity: 0.5,
    name: 'Tribosys 3204',
    unit: 'switch',
    color: '#d9cdf2',
    packs: [[120, 130]],
    desc: 'Đặc hơn 3203 một chút, hợp tactile (khấc nhẹ đi chút), linear dùng cũng ổn',
    fit: { linear: 0.85, tactile: 0.8, clicky: 0.25, housing: 0.65, wire: 0.3, spring: 0.5 },
    warn: {
      tactile: 'Khấc nhẹ đi một chút so với để khô',
      clicky: 'Lube thân switch clicky là mất tiếng click, chỉ nên lube lò xo',
    },
  },
  gpl105: {
    viscosity: 0.05,
    opacity: 0.2,
    name: 'Krytox GPL 105 (dầu)',
    unit: 'switch',
    color: '#f0f6ff',
    packs: [[200, 110]],
    desc: 'Dầu loãng: dùng riêng cho lò xo (hết tiếng ping) hoặc pha với 205g0',
    fit: { spring: 1, linear: 0.5, tactile: 0.5, clicky: 0.25 },
    warn: {
      linear: 'Dầu quá loãng, chỉ nên dùng cho lò xo',
      tactile: 'Dầu quá loãng, chỉ nên dùng cho lò xo',
      clicky: 'Lube thân switch clicky là mất tiếng click, chỉ nên lube lò xo',
    },
  },
  bdz: {
    viscosity: 1,
    opacity: 0.95,
    name: 'Krytox XHT-BDZ',
    unit: 'stab',
    color: '#f2e6c9',
    packs: [[60, 110]],
    desc: 'Mỡ rất đặc cho wire stab: ít chảy xuống PCB, dễ vệ sinh, chống rattle tốt nhất',
    fit: { wire: 1, housing: 0.5, linear: 0.15, tactile: 0.1, clicky: 0.05 },
    warn: {
      linear: 'Quá đặc, switch bị trì, nảy chậm',
      tactile: 'Quá đặc, switch bị trì, nảy chậm',
    },
  },
  permatex: {
    viscosity: 0.85,
    opacity: 0.3,
    name: 'Permatex',
    unit: 'stab',
    color: '#cfe0ee',
    packs: [[150, 90]],
    desc: 'Mỡ dielectric chỉ dùng cho wire stab, rẻ và dùng lâu',
    fit: { wire: 0.9, housing: 0.4, linear: 0.15, tactile: 0.1, clicky: 0.05 },
    warn: {
      linear: 'Permatex cho switch là bị trì',
      tactile: 'Permatex cho switch là bị trì',
      housing: 'Permatex không hợp housing stab',
    },
  },
  // sách phép bán riêng từng loại, mua nhiều cuộn thì số lần dùng cộng dồn (như vật tư)
  spellOpen: {
    name: 'Phép mở switch',
    unit: 'lần',
    color: '#e9dfb4',
    packs: SPELL_PACKS,
    desc: 'Mỗi lần mở 10 switch (10 đồ mở trên bàn); có chứng chỉ thợ thì cộng thêm 10',
    spell: 10,
  },
  spellLube: {
    name: 'Phép lube switch',
    unit: 'lần',
    color: '#e9dfb4',
    packs: SPELL_PACKS,
    desc: 'Mỗi mẻ lube 10 switch; có chứng chỉ thợ thì cộng thêm 10',
    spell: 10,
  },
  spellAssem: {
    name: 'Phép lắp switch',
    unit: 'lần',
    color: '#e9dfb4',
    packs: SPELL_PACKS,
    desc: 'Mỗi lần lắp 10 switch (cùng hàng phím); có chứng chỉ thợ thì cộng thêm 10',
    spell: 10,
  },
  spellKeycap: {
    name: 'Phép lắp keycap',
    unit: 'lần',
    color: '#e9dfb4',
    packs: SPELL_PACKS,
    desc: 'Mỗi lần lắp 10 keycap (cùng hàng phím); có chứng chỉ thợ thì cộng thêm 10',
    spell: 10,
  },
  spellSolder: {
    name: 'Phép hàn switch',
    unit: 'lần',
    color: '#e9dfb4',
    packs: SPELL_PACKS,
    desc: 'Mỗi lần hàn được 10 phím: phím đang hàn + 9 phím kế tiếp (vẫn tốn thiếc); hàn cháy thì cháy cả 10',
    spell: 10,
  },
  spellDesolder: {
    name: 'Phép rã hàn',
    unit: 'lần',
    color: '#e9dfb4',
    packs: SPELL_PACKS,
    desc: 'Mỗi lần hút thiếc cháy được 10 phím: phím đang rã + 9 phím cháy kế tiếp',
    spell: 10,
  },
  spellStab: {
    name: 'Phép mod stab',
    unit: 'lần',
    color: '#e9dfb4',
    packs: SPELL_PACKS,
    desc: 'Mỗi lần mod (cắt chân, dán băng, phết mỡ, lắp slider, lắp wire) làm luôn 5 stab: con đang làm + 4 con kế tiếp (vẫn tốn mỡ / băng mỗi con)',
    spell: 5,
  },
}

/** Sách phép mở / lube / lắp / hàn / rã hàn switch, lắp keycap, mod stab (bán riêng, lượt riêng) */
export const SPELL_OPEN = 'spellOpen'
export const SPELL_LUBE = 'spellLube'
export const SPELL_ASSEM = 'spellAssem'
export const SPELL_KEYCAP = 'spellKeycap'
export const SPELL_SOLDER = 'spellSolder'
export const SPELL_DESOLDER = 'spellDesolder'
export const SPELL_STAB = 'spellStab'
/** Số switch phép `id` cộng thêm mỗi lần dùng (0 = không có / hết lượt) */
export const spellBonus = (supplies: Record<string, number>, id: string) =>
  (supplies[id] ?? 0) > 0 ? SUPPLIES[id].spell! : 0
/**
 * Số con mỗi lần (mở / lube / lắp switch, lắp keycap): bậc thợ (lõ 1 / middle 5 / senior 10) cộng dồn phép
 * (vd lõ + phép 10 = 11, middle = 15, senior = 20). bonus = 0 (không có phép) thì giữ nguyên bậc thợ
 */
export const spellRun = (certN: number, bonus: number) => certN + bonus

/**
 * Số phím / stab mỗi lần của việc bậc thợ không tự tăng (hàn, hút thiếc, mod stab): không phép = 1,
 * có phép thì bậc thợ cộng dồn phép như `spellRun`
 */
export const spellBatch = (certN: number, bonus: number) => (bonus ? certN + bonus : 1)

/**
 * Lắp switch / keycap 1 lần: phím `id` + các phím chưa lắp liền sau trong cùng hàng (trái → phải), tối đa `n` phím.
 * Dùng chung cho `installRun` và viền sáng khi rê chuột vào ô phím
 */
export function installTargets<K extends { id: string; x: number; y: number }>(
  keys: K[],
  done: (id: string) => boolean,
  id: string,
  n: number,
) {
  const k0 = keys.find((k) => k.id === id)
  if (!k0 || done(id)) return []
  return keys
    .filter((k) => k.y === k0.y && k.x >= k0.x && !done(k.id))
    .sort((a, b) => a.x - b.x)
    .slice(0, n)
    .map((k) => k.id)
}

/**
 * Phép hàn: các phím chưa hàn kế tiếp phím `id` (thứ tự hàng → cột, hết thì vòng lại đầu) được hàn ké, tối đa `n` phím.
 * Dùng chung cho `solderKey` và viền sáng khi rê chuột vào ô hàn
 */
export function spellSolderKeys<K extends { id: string; x: number; y: number }>(
  keys: K[],
  done: (id: string) => boolean,
  id: string,
  n: number,
) {
  if (n <= 0) return []
  const sorted = [...keys].sort((a, b) => a.y - b.y || a.x - b.x)
  const from = sorted.findIndex((k) => k.id === id)
  return [...sorted.slice(from + 1), ...sorted.slice(0, from)]
    .filter((k) => !done(k.id))
    .slice(0, n)
}

/** Các vật tư dùng làm lube (có bảng độ hợp) */
export const LUBE_IDS = Object.keys(SUPPLIES).filter((id) => SUPPLIES[id].fit)
/** các loại thiếc hàn, xịn nhất trước */
export const SOLDER_IDS = Object.keys(SUPPLIES)
  .filter((id) => SUPPLIES[id].solder)
  .sort((a, b) => SUPPLIES[a].solder!.speed - SUPPLIES[b].solder!.speed)
/** mỗi phím 2 chân = 2 mối hàn */
export const JOINTS_PER_KEY = 2

/** Cửa sổ hàn (giây thật): bút hàn thiếc chảy sau 2–2,5s, 3s là cháy; trạm hàn 1–2s, 3s cháy */
/** skill check hàn: bút hàn 60W nóng chậm → thanh nhiệt chạy chậm hơn trạm hàn, vùng xanh hẹp hơn */
const SOLDER_SKILL = {
  pen: { width: 0.2, speed: 0.42 },
  station: { width: 0.26, speed: 0.5 },
} as const
/** bút hàn khó giữ nhiệt: tỉ lệ ẩn cháy chân dù nhả đúng vùng xanh (cộng với `burnChance` của thiếc), trạm hàn không có */
export const PEN_BURN = 0.1

/** Độ khó 1 lần hàn theo dụng cụ; thiếc chảy chậm (thiếc đểu, `slow`) thu hẹp vùng xanh */
export function solderSkill(station: boolean, wire: string): SkillSpec {
  const w = station ? SOLDER_SKILL.station : SOLDER_SKILL.pen
  const slow = SUPPLIES[wire]?.solder?.slow ?? 0
  return { width: w.width * (1 - slow * 0.5), speed: w.speed }
}

/** Độ hợp + ghi chú của 1 loại lube cho 1 mục đích */
export function lubeUseFit(lube: string, use: LubeUse): [number, string] {
  const s = SUPPLIES[lube]
  const fit = s.fit?.[use] ?? 0
  const note =
    s.warn?.[use] ??
    (fit >= 0.9
      ? 'Rất hợp'
      : fit >= 0.7
        ? 'Dùng được'
        : fit > 0
          ? 'Không hợp lắm'
          : 'Không dùng được')
  return [fit, note]
}
