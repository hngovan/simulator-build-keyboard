import type {
  CaseItem,
  KeycapItem,
  LayoutId,
  PcbItem,
  PlateItem,
  Product,
  ProductOption,
  StabItem,
  SupplyItem,
  SwitchItem,
  ToolItem,
  ToolKind,
} from '@/types'
import { LAYOUTS } from './layouts'
import { CASES, KEYCAP_KITS, STABS, caseFits, isPlasticCase } from './parts'
import { SUPPLIES } from './supplies'

// Cấp xưởng: giao đủ đơn + đủ uy tín thì lên cấp, mở thêm linh kiện ở Shopii / Hội Phím Cơ và loại đơn khách đặt.
// Cấp chỉ tăng (`Profile.shopLv` giữ cấp cao nhất đã đạt), uy tín tụt không mất đồ đã mở

export interface ShopLevel {
  lv: number
  name: string
  /** số đơn đã giao tối thiểu */
  done: number
  /** uy tín tối thiểu */
  rep: number
  /** số đơn mới mỗi ngày [ít nhất, nhiều nhất] (uy tín âm bớt, `offerRange`) */
  offers: [number, number]
  /** món mở thêm ở cấp này (hiện ở thông báo lên cấp + bảng cấp) */
  perks: string[]
}

export const SHOP_LEVELS: ShopLevel[] = [
  {
    lv: 1,
    name: 'Thợ tập sự',
    offers: [1, 2],
    done: 0,
    rep: -Infinity,
    perks: [
      'Layout 40% / 60% / TKL / Full size',
      'Case nhựa cơ bản',
      'PCB hotswap, plate FR4 / nhôm, stab clip-in',
      'Switch phổ thông, keycap, đồ mod stab (kìm cắt, cọ, Urgo, Krytox 205g2 / XHT-BDZ), feet, dây O-ring',
    ],
  },
  {
    lv: 2,
    name: 'Thợ phụ',
    offers: [2, 3],
    done: 2,
    rep: -Infinity,
    perks: [
      'PCB hàn + đồ hàn (mỏ hàn, thiếc, bùi nhùi, bút hút thiếc)',
      'Lube switch (đồ mở switch, mỡ / dầu lube)',
      'Case nhôm 1 mảnh / gỗ / mica, sandwich mount',
      'Plate đồng / PC / POM, stab plate-mount, foam Poron',
    ],
  },
  {
    lv: 3,
    name: 'Thợ chính',
    offers: [3, 5],
    done: 5,
    rep: 5,
    perks: [
      'Case 2 mảnh: gasket mount / top mount, dải gasket Poron',
      'Layout HHKB / 65% / 75%',
      'Stab screw-in, plate thép / PP / PEI, keycap SA / MT3 / ASA',
      'Chứng chỉ thợ',
    ],
  },
  {
    lv: 4,
    name: 'Thợ có tiếng',
    offers: [4, 6],
    done: 10,
    rep: 10,
    perks: [
      'Case CAD: Bakeneko, Exodus, Repent75, Catto, Planck, 4HEAD...',
      'Layout FRL / True HHKB / Planck',
      'Switch cao cấp (HMX, Wingtree, Panda...)',
    ],
  },
  {
    lv: 5,
    name: 'Thợ có tâm',
    offers: [5, 7],
    done: 20,
    rep: 30,
    perks: ['Alice (Blossom), TKL F13 (Duality Horns)', 'Sách phép'],
  },
]
export const MAX_LV = SHOP_LEVELS.length

/** cấp đạt được theo số đơn đã giao + uy tín */
export function levelFor(done: number, rep: number) {
  let lv = 1
  for (const l of SHOP_LEVELS) if (done >= l.done && rep >= l.rep) lv = l.lv
  return lv
}
export const levelDef = (lv: number) => SHOP_LEVELS[Math.min(MAX_LV, Math.max(1, lv)) - 1]

/** bớt số đơn mỗi ngày theo uy tín âm: tai tiếng (−5..−1) −1, bị tẩy chay (< −5) −2 */
export const repOfferPenalty = (rep: number) => (rep < -5 ? 2 : rep < 0 ? 1 : 0)
/** số đơn mới mỗi ngày theo cấp xưởng (thợ tập sự 1–2, càng lên cấp càng nhiều), uy tín âm thì bớt; tối thiểu 1 */
export function offerRange(lv: number, rep: number): [number, number] {
  const [a, b] = levelDef(lv).offers
  const k = repOfferPenalty(rep)
  return [Math.max(1, a - k), Math.max(1, b - k)]
}

/** điều kiện lên cấp `lv` (1 dòng ngắn cho tooltip ổ khoá) */
export function levelReq(lv: number) {
  const l = levelDef(lv)
  return `Cấp ${l.lv} · ${l.name}: giao ${l.done} đơn${Number.isFinite(l.rep) ? ` + uy tín ≥ ${l.rep}` : ''}`
}

// ---------- cấp mở của từng loại món ----------

export const LAYOUT_LV: Record<LayoutId, number> = {
  '40': 1,
  '60': 1,
  tkl: 1,
  full: 1,
  hhkb: 3,
  '65': 3,
  '75': 3,
  frl: 4,
  truehhkb: 4,
  planck: 4,
  alice: 5,
  tklf13: 5,
}
export const MOUNT_LV: Record<string, number> = {
  tray: 1,
  oring: 1,
  bottom: 2,
  sandwich: 2,
  gasket: 3,
  top: 3,
}
export const PCB_LV: Record<string, number> = { hotswap: 1, solder: 2 }
export const PLATE_LV: Record<string, number> = {
  fr4: 1,
  alu: 1,
  brass: 2,
  pc: 2,
  pom: 2,
  ss: 3,
  pp: 3,
  pei: 3,
  none: 3,
}
const STAB_MOUNT_LV: Record<string, number> = { clip: 1, plate: 2, screw: 3 }
const KEYCAP_LV: Record<string, number> = { sa: 3, mt3: 3, asa: 3 }
/** switch cao cấp (còn lại phổ thông, cấp 1: đủ mọi loại Linear / Tactile / Clicky / Silent) */
const PREMIUM_SWITCHES = new Set([
  'gateronBlackInk',
  'nkCream',
  'zealTealios',
  'holyPanda',
  'rubenBumblebee',
  'hmxWhite',
  'hmxSnowfall',
  'hmxV2u',
  'hmxWaverider',
  'hmxSuColor',
  'hmxXinhai',
  'hmxKd200',
  'wingtreeSmoke',
  'wingtreeTorrero',
  'gateronTypeR',
  'wingtreeTactile',
  'keygeekTactile',
  'pandaTactile',
  'hmxVolume0T',
])
/** vật tư theo cấp: thiếc / lube switch / foam cấp 2, gasket cấp 3, sách phép cấp 5; còn lại cấp 1 (205g2 cấp 1: mỡ housing stab, mod stab có từ đầu) */
const SUPPLY_LV: Record<string, number> = {
  solderCheap: 2,
  solder6337: 2,
  solderPro: 2,
  g0: 2,
  g00: 2,
  t3203: 2,
  t3204: 2,
  gpl105: 2,
  foamPoron: 2,
  foamCase: 2,
  gasketPoron: 3,
}
const TOOL_LV: Partial<Record<ToolKind, number>> = {
  solder: 2,
  tipCleaner: 2,
  desolder: 2,
  spoolHolder: 2,
  opener: 2,
  cert: 3,
}

export const layoutLv = (l: LayoutId) => LAYOUT_LV[l] ?? 1
export const mountLv = (m: string) => MOUNT_LV[m] ?? 1
export const pcbLv = (t: string) => PCB_LV[t] ?? 1
export const plateLv = (m: string) => PLATE_LV[m] ?? 1
export const stabLv = (t: string) => STAB_MOUNT_LV[STABS[t]?.mount] ?? 1
export const switchLv = (t: string) => (PREMIUM_SWITCHES.has(t) ? 4 : 1)
export const keycapLv = (k: string) => KEYCAP_LV[k] ?? 1
export const supplyLv = (id: string) =>
  SUPPLIES[id]?.spell ? 5 : SUPPLIES[id]?.battery ? 2 : (SUPPLY_LV[id] ?? 1)
export const toolLv = (kind: ToolKind) => TOOL_LV[kind] ?? 1

/** case: nhựa 1 mảnh cấp 1, nhôm / gỗ 1 mảnh / mica cấp 2, 2 mảnh cấp 3, CAD cấp 4; không thấp hơn layout dễ nhất case vừa */
export function caseLv(id: string) {
  const c = CASES[id]
  if (!c) return 1
  const base = c.model
    ? 4
    : c.material === 'mica'
      ? 2
      : c.pieces === 2
        ? 3
        : isPlasticCase(c)
          ? 1
          : 2
  const lays = (Object.keys(LAYOUTS) as LayoutId[]).filter((l) => caseFits(c, l)).map(layoutLv)
  return Math.max(base, lays.length ? Math.min(...lays) : 1)
}

/** cấp mở 1 option sản phẩm Shopii */
export function optionLv(p: Product, o: ProductOption): number {
  switch (p.cat) {
    case 'case':
      return caseLv((o.item as CaseItem).id)
    case 'pcb': {
      const it = o.item as PcbItem
      return Math.max(pcbLv(it.type), layoutLv(it.layout))
    }
    case 'plate': {
      const it = o.item as PlateItem
      return Math.max(plateLv(it.material), layoutLv(it.layout))
    }
    case 'stab':
      return stabLv((o.item as StabItem).type)
    case 'switch':
      return switchLv((o.item as SwitchItem).type)
    case 'keycap':
      return keycapLv((o.item as KeycapItem).kit)
    case 'supply':
    case 'spell':
      return supplyLv((o.item as SupplyItem).id)
    case 'tool':
    case 'cert':
      return toolLv((o.item as ToolItem).kind)
    default:
      return 1
  }
}

/** cấp mở cả sản phẩm = option dễ nhất */
export const productLv = (p: Product) => Math.min(...p.options.map((o) => optionLv(p, o)))

/**
 * Sản phẩm theo cấp xưởng: bỏ option chưa mở; chưa option nào mở thì giữ nguyên + `locked` = cấp cần
 * (Shopii vẽ thẻ mờ có ổ khoá, không cho thêm giỏ)
 */
export function lockProduct(p: Product, lv: number): Product {
  const open = p.options.filter((o) => optionLv(p, o) <= lv)
  if (open.length === p.options.length) return p
  if (open.length) return { ...p, options: open }
  return { ...p, locked: productLv(p) }
}

/** keycap kit đơn được đòi ở cấp này */
export const keycapKitsAt = (lv: number) =>
  Object.keys(KEYCAP_KITS).filter((k) => !KEYCAP_KITS[k].hidden && keycapLv(k) <= lv)
