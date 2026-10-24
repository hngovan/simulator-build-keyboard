// Vật tư tiêu hao: mua 1 lần dùng cho nhiều đơn. packs: [số lượt dùng, giá k]

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
   * slow = giây chảy chậm thêm, burnChance = tỉ lệ ẩn cháy chân dù nhả đúng vùng xanh (không hiện cho người chơi)
   */
  solder?: { speed: number; shine: number; slow?: number; burnChance?: number }
}

export const SUPPLIES: Record<string, SupplyDef> = {
  // mỗi cuộn thiếc dùng được 1000 mối hàn (mỗi phím 2 mối)
  solderCheap: {
    name: 'Thiếc đểu',
    unit: 'mối hàn',
    color: '#55595e',
    packs: [[1000, 20]],
    desc: 'Rẻ đi đôi với chất lượng: chảy chậm, mối hàn xỉn, có tỉ lệ nhỏ cháy chân dù nhả đúng vùng xanh',
    solder: { speed: 1.5, shine: 0.2, slow: 0.5, burnChance: 0.15 },
  },
  solder6337: {
    name: 'Thiếc Sakura 63/37',
    unit: 'mối hàn',
    color: '#62666b',
    packs: [[1000, 90]],
    desc: 'Thiếc xịn lõi nhựa thông: chảy đều, ăn chân tốt, mối hàn sáng',
    solder: { speed: 0.85, shine: 0.85 },
  },
  solderPro: {
    name: 'Thiếc Asahi 0.6mm',
    unit: 'mối hàn',
    color: '#70757a',
    packs: [[1000, 160]],
    desc: 'Thiếc xịn nhất: chảy cực nhanh, mối hàn bóng đẹp như hàn máy',
    solder: { speed: 0.6, shine: 1 },
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
    fit: { linear: 1, tactile: 0.55, clicky: 0.4, housing: 0.75, wire: 0.3, spring: 0.6 },
    warn: {
      tactile: 'Lỡ tay quét dày là mất khấc, bết như phím màng',
      clicky: 'Clicky lube vào bị bẹt tiếng click',
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
    fit: { linear: 0.9, tactile: 0.85, clicky: 0.5, housing: 0.6, wire: 0.2, spring: 0.7 },
    warn: { clicky: 'Clicky lube vào bị bẹt tiếng click' },
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
    fit: { linear: 0.95, tactile: 0.35, clicky: 0.3, housing: 1, wire: 0.6, spring: 0.3 },
    warn: {
      tactile: 'Mỡ đặc làm khấc tactile không còn rõ',
      clicky: 'Mỡ đặc làm clicky bẹt tiếng',
    },
  },
  t3203: {
    viscosity: 0.3,
    opacity: 0.45,
    name: 'Tribosys 3203',
    unit: 'switch',
    color: '#e3dcf5',
    packs: [[120, 130]],
    desc: 'Mỡ loãng, an toàn nhất cho tactile: giảm ma sát mà vẫn giữ khấc',
    fit: { linear: 0.8, tactile: 1, clicky: 0.6, housing: 0.6, wire: 0.3, spring: 0.5 },
  },
  t3204: {
    viscosity: 0.4,
    opacity: 0.5,
    name: 'Tribosys 3204',
    unit: 'switch',
    color: '#d9cdf2',
    packs: [[120, 130]],
    desc: 'Đặc hơn 3203 một chút, rất hợp tactile, linear dùng cũng ổn',
    fit: { linear: 0.85, tactile: 1, clicky: 0.6, housing: 0.65, wire: 0.3, spring: 0.5 },
  },
  gpl105: {
    viscosity: 0.05,
    opacity: 0.2,
    name: 'Krytox GPL 105 (dầu)',
    unit: 'switch',
    color: '#f0f6ff',
    packs: [[200, 110]],
    desc: 'Dầu loãng: dùng riêng cho lò xo (hết tiếng ping) hoặc pha với 205g0',
    fit: { spring: 1, linear: 0.5, tactile: 0.5, clicky: 0.5 },
    warn: {
      linear: 'Dầu quá loãng, chỉ nên dùng cho lò xo',
      tactile: 'Dầu quá loãng, chỉ nên dùng cho lò xo',
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
    fit: { wire: 1, housing: 0.5, linear: 0.15, tactile: 0.15, clicky: 0.15 },
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
    fit: { wire: 0.9, housing: 0.4, linear: 0.15, tactile: 0.15, clicky: 0.15 },
    warn: {
      linear: 'Permatex cho switch là bị trì',
      tactile: 'Permatex cho switch là bị trì',
      housing: 'Permatex không hợp housing stab',
    },
  },
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
const SOLDER_WINDOW = {
  pen: { melt: [2, 2.5], burn: 3 },
  station: { melt: [1, 2], burn: 3 },
} as const

/** Khoảng thiếc chảy + mốc cháy theo dụng cụ; thiếc chảy chậm (thiếc đểu) cộng thêm vào cả 2 mốc */
export function solderWindow(station: boolean, wire: string) {
  const w = station ? SOLDER_WINDOW.station : SOLDER_WINDOW.pen
  const slow = SUPPLIES[wire]?.solder?.slow ?? 0
  return { melt: [w.melt[0] + slow, w.melt[1] + slow] as const, burn: w.burn + slow }
}

/**
 * Thời gian hàn 1 phím (giây): ready = lúc thiếc chảy, nằm trong khoảng chảy theo seed 0..1 (cố định theo phím);
 * nhả trong [ready, burn) là đạt; giữ tới burn là cháy xém chân
 */
export function solderTiming(station: boolean, wire: string, seed = 0.5) {
  const { melt, burn } = solderWindow(station, wire)
  return { ready: melt[0] + (melt[1] - melt[0]) * seed, burn }
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
