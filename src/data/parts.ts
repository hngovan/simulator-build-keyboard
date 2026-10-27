import { LAYOUTS, getLayout } from './layouts'
import { SUPPLIES, type SupplyDef } from './supplies'
import type {
  KeycapMaterial,
  SwitchKind,
  BuildState,
  CaseDef,
  CaseItem,
  Inventory,
  Paid,
  KeycapItem,
  LayoutId,
  Order,
  PartCategory,
  PartItem,
  PcbItem,
  PlateItem,
  Product,
  ShopCategory,
  SoundProfile,
  SoundWish,
  StabItem,
  SupplyItem,
  SwitchItem,
  ToolItem,
  ToolKind,
  ToolLevels,
} from '@/types'

export interface SwitchDef {
  name: string
  brand: string
  /** nhóm âm thanh hiển thị */
  kind: SwitchKind
  /** cảm giác gõ, quyết định lube nào hợp */
  feel: 'linear' | 'tactile' | 'clicky'
  /** nhà sản xuất đã lube sẵn */
  prelubed: boolean
  color: string
  loud: number
  pitch: number
  price10: number
  desc: string
}
interface SoundMod {
  name: string
  dl: number
  dp: number
  desc?: string
}
interface PlateDef extends SoundMod {
  price: number
  color: string
  metal?: boolean
  clear?: boolean
  desc: string
}
interface Named {
  name: string
  price: number
  desc: string
}

export interface StabModel {
  name: string
  brand: string
  mount: 'clip' | 'screw' | 'plate'
  price: number
  desc: string
  /** stem còn chân → cần clip */
  feet: boolean
  /** dung sai khít → dán băng Urgo vào sẽ nhũn */
  tight: boolean
  /** nhà máy đã lube housing */
  prelubed: boolean
  housing: string
  stem: string
  /** housing bo tròn (hình dáng khác Cherry) */
  rounded?: boolean
}
interface ColorDef {
  name: string
  hex: string
}
interface KeycapColor extends ColorDef {
  legend: string
}
export interface ToolDef {
  name: string
  price: number
  desc?: string
  none?: boolean
  n?: number
  clicks?: number
  hold?: number
  quality?: number
  /** độ bền: dùng được bao nhiêu lần thì hỏng (phải mua lại) */
  life?: number
}

// Giá: nghìn đồng (k)
// Âm thanh mô tả bằng 2 trục: loud (0 êm → 1 ồn) và pitch (0 trầm → 1 cao/giòn)

export const SWITCHES: Record<string, SwitchDef> = {
  cherryBlack: {
    name: 'Cherry Đen',
    brand: 'Cherry',
    kind: 'Linear',
    feel: 'linear',
    prelubed: false,
    color: '#26262b',
    loud: 0.55,
    pitch: 0.35,
    price10: 70,
    desc: 'Linear nặng, chưa lube, có tiếng sạn đặc trưng',
  },
  cherryBrown: {
    name: 'Cherry Nâu',
    brand: 'Cherry',
    kind: 'Tactile',
    feel: 'tactile',
    prelubed: false,
    color: '#8a5a3c',
    loud: 0.45,
    pitch: 0.5,
    price10: 70,
    desc: 'Tactile nhẹ, chưa lube',
  },
  cherryOrange: {
    name: 'Cherry Cam',
    brand: 'Cherry',
    kind: 'Linear',
    feel: 'linear',
    prelubed: false,
    color: '#f07a1e',
    loud: 0.5,
    pitch: 0.45,
    price10: 70,
    desc: 'Linear mượt: stem cam, housing full đen, chưa lube',
  },
  cherryPurple: {
    name: 'Cherry Tím',
    brand: 'Cherry',
    kind: 'Tactile',
    feel: 'tactile',
    prelubed: false,
    color: '#8e44c9',
    loud: 0.5,
    pitch: 0.45,
    price10: 75,
    desc: 'Tactile khấc rõ hơn Cherry Nâu: stem tím, housing full đen, chưa lube',
  },
  cherryBlue: {
    name: 'Cherry Xanh',
    brand: 'Cherry',
    kind: 'Clicky',
    feel: 'clicky',
    prelubed: false,
    color: '#3a7be8',
    loud: 0.95,
    pitch: 0.85,
    price10: 70,
    desc: 'Clicky kêu lách cách to',
  },
  // Kailh Box: stem có hộp bao quanh (chống bụi / nước), lắc ít, tiếng gọn hơn MX thường
  kailhBoxRed: {
    name: 'Kailh Box Đỏ',
    brand: 'Kailh',
    kind: 'Linear',
    feel: 'linear',
    prelubed: false,
    color: '#d23a3a',
    loud: 0.5,
    pitch: 0.5,
    price10: 60,
    desc: 'Linear nhẹ, stem hộp ít lắc, tiếng gọn',
  },
  kailhBoxBrown: {
    name: 'Kailh Box Nâu',
    brand: 'Kailh',
    kind: 'Tactile',
    feel: 'tactile',
    prelubed: false,
    color: '#8a5a3c',
    loud: 0.5,
    pitch: 0.55,
    price10: 60,
    desc: 'Tactile nhẹ, stem hộp ít lắc',
  },
  kailhBoxWhite: {
    name: 'Kailh Box Trắng',
    brand: 'Kailh',
    kind: 'Clicky',
    feel: 'clicky',
    prelubed: false,
    color: '#eeeeee',
    loud: 0.9,
    pitch: 0.95,
    price10: 65,
    desc: 'Clicky thanh click (click bar): tiếng tách giòn, sắc hơn Cherry Xanh',
  },
  kailhBoxJade: {
    name: 'Kailh Box Jade',
    brand: 'Kailh',
    kind: 'Clicky',
    feel: 'clicky',
    prelubed: false,
    color: '#2fa36b',
    loud: 1,
    pitch: 0.8,
    price10: 75,
    desc: 'Clicky thanh click dày: tiếng to, chắc, lực nặng hơn Box Trắng',
  },
  gateronYellow: {
    name: 'Gateron Vàng',
    brand: 'Gateron',
    kind: 'Linear',
    feel: 'linear',
    prelubed: true,
    color: '#e8c33a',
    loud: 0.5,
    pitch: 0.45,
    price10: 45,
    desc: 'Linear phổ thông, đã lube sẵn từ nhà máy',
  },
  gateronMilky: {
    name: 'Gateron Milky Vàng',
    brand: 'Gateron',
    kind: 'Linear',
    feel: 'linear',
    prelubed: true,
    color: '#f2dc6b',
    loud: 0.5,
    pitch: 0.4,
    price10: 50,
    desc: 'Linear: housing full trắng sữa hơi trong, stem vàng nhạt, tiếng đục êm. Đã lube sẵn',
  },
  rubenBumblebee: {
    name: 'Ruben Bumblebee',
    brand: 'Ruben',
    kind: 'Linear',
    feel: 'linear',
    prelubed: true,
    color: '#e0a800',
    loud: 0.5,
    pitch: 0.35,
    price10: 75,
    desc: 'Linear: housing full xám tro, stem vàng đậm. Đã lube sẵn',
  },
  hmxWhite: {
    name: 'HMX Snow',
    brand: 'HMX',
    kind: 'Linear',
    feel: 'linear',
    prelubed: true,
    color: '#f0f0f0',
    loud: 0.6,
    pitch: 0.8,
    price10: 60,
    desc: 'Linear trắng tuyết, tiếng "clack" giòn, cao. Đã lube sẵn',
  },
  hmxSnowfall: {
    name: 'HMX Snowfall',
    brand: 'HMX',
    kind: 'Tactile',
    feel: 'tactile',
    prelubed: true,
    color: '#f3f1ec',
    loud: 0.55,
    pitch: 0.6,
    price10: 80,
    desc: 'Tactile: housing trên trong suốt đính kim tuyến, dưới + stem trắng đục. Đã lube sẵn',
  },
  hmxV2u: {
    name: 'HMX V2U',
    brand: 'HMX',
    kind: 'Linear',
    feel: 'linear',
    prelubed: true,
    color: '#7b3fc4',
    loud: 0.55,
    pitch: 0.5,
    price10: 70,
    desc: 'Linear full tím: housing + stem tím. Đã lube sẵn',
  },
  hmxWaverider: {
    name: 'HMX Waverider',
    brand: 'HMX',
    kind: 'Tactile',
    feel: 'tactile',
    prelubed: true,
    color: '#f4f4f4',
    loud: 0.55,
    pitch: 0.5,
    price10: 85,
    desc: 'Tactile: housing trên xanh trong đính kim tuyến, dưới xanh navy, stem trắng. Đã lube sẵn',
  },
  hmxSuColor: {
    name: 'HMX Su Color',
    brand: 'HMX',
    kind: 'Linear',
    feel: 'linear',
    prelubed: true,
    color: '#ffc8dc',
    loud: 0.5,
    pitch: 0.55,
    price10: 80,
    desc: 'Linear: housing full trong suốt hồng đính kim tuyến, stem hồng nhạt. Đã lube sẵn',
  },
  hmxXinhai: {
    name: 'HMX Xinhai',
    brand: 'HMX',
    kind: 'Linear',
    feel: 'linear',
    prelubed: true,
    color: '#1f2a5a',
    loud: 0.55,
    pitch: 0.45,
    price10: 70,
    desc: 'Linear: housing trên trắng, dưới + stem xanh navy. Đã lube sẵn',
  },
  hmxKd200: {
    name: 'HMX KD200',
    brand: 'HMX',
    kind: 'Linear',
    feel: 'linear',
    prelubed: true,
    color: '#1e1e22',
    loud: 0.55,
    pitch: 0.55,
    price10: 65,
    desc: 'Linear: housing trên vàng đậm, dưới đen, stem đen. Đã lube sẵn',
  },
  wingtreeSmoke: {
    name: 'Wingtree Camellia',
    brand: 'Wingtree',
    kind: 'Linear',
    feel: 'linear',
    prelubed: true,
    color: '#c8202f',
    loud: 0.55,
    pitch: 0.2,
    price10: 85,
    desc: 'Stem đỏ, housing full trắng đục dày, "thock" trầm. Đã lube sẵn',
  },
  wingtreeTorrero: {
    name: 'Wingtree Torrero',
    brand: 'Wingtree',
    kind: 'Tactile',
    feel: 'tactile',
    prelubed: true,
    color: '#d9a400',
    loud: 0.55,
    pitch: 0.25,
    price10: 90,
    desc: 'Tactile đầm: housing nâu coffee, stem vàng đậm. Đã lube sẵn',
  },
  gateronTypeR: {
    name: 'Gateron Type R',
    brand: 'Gateron',
    kind: 'Tactile',
    feel: 'tactile',
    prelubed: true,
    color: '#d42a2a',
    loud: 0.55,
    pitch: 0.4,
    price10: 80,
    desc: 'Tactile đỏ rực: stem đỏ, housing full đỏ đục. Đã lube sẵn',
  },
  wingtreeTactile: {
    name: 'Wingtree Tactile',
    brand: 'Wingtree',
    kind: 'Tactile',
    feel: 'tactile',
    prelubed: true,
    color: '#f6b77a',
    loud: 0.55,
    pitch: 0.3,
    price10: 85,
    desc: 'Stem cam nhạt, housing trắng đục dày, khấc đầm. Đã lube sẵn',
  },
  keygeekTactile: {
    name: 'Keygeek Tactile',
    brand: 'Keygeek',
    kind: 'Tactile',
    feel: 'tactile',
    prelubed: true,
    color: '#c9a0dc',
    loud: 0.6,
    pitch: 0.3,
    price10: 90,
    desc: 'Khấc rõ, tiếng đầm. Đã lube sẵn',
  },
  pandaTactile: {
    name: 'Tactile Panda',
    brand: 'Khác',
    kind: 'Tactile',
    feel: 'tactile',
    prelubed: false,
    color: '#e8a0b8',
    loud: 0.6,
    pitch: 0.3,
    price10: 120,
    desc: 'Khấc mạnh, chưa lube',
  },
  gateronSilent: {
    name: 'Gateron Silent Hồng',
    brand: 'Gateron',
    kind: 'Silent',
    feel: 'linear',
    prelubed: true,
    color: '#f48fb1',
    loud: 0.1,
    pitch: 0.3,
    price10: 90,
    desc: 'Silent linear, đã lube sẵn',
  },
  otemuSilent: {
    name: 'Otemu Silent V1',
    brand: 'Otemu',
    kind: 'Silent',
    feel: 'linear',
    prelubed: false,
    color: '#f2c230',
    loud: 0.15,
    pitch: 0.35,
    price10: 40,
    desc: 'Silent linear giá rẻ: stem vàng, housing full hồng, chưa lube',
  },
  otemuSilentV2: {
    name: 'Otemu Silent V2',
    brand: 'Otemu',
    kind: 'Silent',
    feel: 'linear',
    prelubed: false,
    color: '#d6ecae',
    loud: 0.13,
    pitch: 0.32,
    price10: 45,
    desc: 'Bản V2 êm hơn V1: stem xanh ngà lá chuối non, housing full xanh lá chuối, chưa lube',
  },
  gateronSilentTactile: {
    name: 'Gateron Silent Tactile',
    brand: 'Gateron',
    kind: 'SilentTactile',
    feel: 'tactile',
    prelubed: true,
    color: '#8a5a3c',
    loud: 0.12,
    pitch: 0.35,
    price10: 95,
    desc: 'Khấc nhẹ, không tiếng: stem nâu, housing trên trong suốt, dưới trắng đục. Đã lube sẵn',
  },
  hmxVolume0T: {
    name: 'HMX Volume 0 T',
    brand: 'HMX',
    kind: 'SilentTactile',
    feel: 'tactile',
    prelubed: true,
    color: '#f3e5c0',
    loud: 0.1,
    pitch: 0.3,
    price10: 90,
    desc: 'Silent tactile: housing trên nâu đậm, dưới coffee sữa, stem cream. Đã lube sẵn',
  },
  silentTactile: {
    name: 'Silent Tactile Tím',
    brand: 'Khác',
    kind: 'SilentTactile',
    feel: 'tactile',
    prelubed: false,
    color: '#9c6ade',
    loud: 0.12,
    pitch: 0.35,
    price10: 95,
    desc: 'Khấc nhẹ, không tiếng, chưa lube',
  },
}

/** "plate" plateless: không dùng plate, switch hàn thẳng vào PCB (bật ở app Chi tiết đơn, không bán ở Shopii) */
export const PLATELESS = 'none'
/** plateless chỉ lắp được kiểu tray (các mount khác đều kẹp / bắt vít vào plate) */
export const PLATELESS_MOUNTS = ['tray']
export const isPlateless = (p?: { material: string } | null) => p?.material === PLATELESS
/** chất liệu plate bán / khách đòi được (trừ plateless) */
export const plateIds = () => Object.keys(PLATES).filter((id) => id !== PLATELESS)

export const PLATES: Record<string, PlateDef> = {
  [PLATELESS]: {
    name: 'Plateless (không plate)',
    dl: -0.08,
    dp: -0.15,
    price: 0,
    color: '#1d1f24',
    desc: 'Không plate: switch hàn thẳng vào PCB, gõ mềm, flex nhiều',
  },
  alu: {
    name: 'Nhôm (Alu)',
    dl: 0.05,
    dp: 0.15,
    price: 250,
    color: '#c0c4cc',
    metal: true,
    desc: 'Cứng, tiếng sáng, clacky',
  },
  brass: {
    name: 'Đồng (Brass)',
    dl: 0.1,
    dp: 0.25,
    price: 450,
    color: '#c9a24a',
    metal: true,
    desc: 'Rất cứng, nặng, tiếng cao vang',
  },
  ss: {
    name: 'Thép (SS)',
    dl: 0.1,
    dp: 0.2,
    price: 300,
    color: '#9aa0a8',
    metal: true,
    desc: 'Cứng, tiếng giòn sắc',
  },
  fr4: { name: 'FR4', dl: 0, dp: 0, price: 150, color: '#2b2b2b', desc: 'Cân bằng, hơi flex' },
  pc: {
    name: 'PC (Polycarbonate)',
    dl: -0.05,
    dp: -0.15,
    price: 180,
    color: '#dfe9f0',
    clear: true,
    desc: 'Mềm, flex, tiếng trầm',
  },
  pom: {
    name: 'POM',
    dl: -0.08,
    dp: -0.18,
    price: 200,
    color: '#f2f2ee',
    desc: 'Mềm, tiếng đục trầm',
  },
  pp: {
    name: 'PP',
    dl: -0.1,
    dp: -0.22,
    price: 160,
    color: '#e8e2d0',
    desc: 'Rất mềm, flex nhiều, rất trầm',
  },
  pei: {
    name: 'PEI',
    dl: -0.05,
    dp: -0.12,
    price: 280,
    color: '#d9a441',
    clear: true,
    desc: 'Flex vừa, tiếng ấm',
  },
}

export const MOUNTS: Record<string, SoundMod & { desc: string }> = {
  tray: {
    name: 'Tray mount',
    dl: 0.05,
    dp: 0.05,
    desc: 'Bắt vít PCB thẳng xuống standoff ở đáy case',
  },
  oring: {
    name: 'O-ring mount',
    dl: -0.1,
    dp: -0.05,
    desc: 'Vòng O-ring cuốn quanh viền, kẹp giữa PCB và plate, không vít (case 1 mảnh)',
  },
  og: {
    name: 'OG mount (screwless)',
    dl: -0.05,
    dp: -0.03,
    desc: 'Vòng silicon + gasket mini, hoàn toàn không vít',
  },
  gasket: {
    name: 'Gasket mount',
    dl: -0.08,
    dp: -0.1,
    desc: 'Plate kẹp giữa 2 mảnh case bằng các miếng gasket',
  },
  top: { name: 'Top mount', dl: 0, dp: 0.05, desc: 'Plate bắt vít vào case trên, đóng 2 mảnh' },
  sandwich: {
    name: 'Sandwich mount',
    dl: 0.05,
    dp: 0.08,
    desc: 'Plate kẹp giữa các lớp mica, bắt vít xuyên từ trên xuống',
  },
}

export const CASE_COLORS: Record<string, ColorDef> = {
  black: { name: 'Đen', hex: '#26272c' },
  silver: { name: 'Bạc', hex: '#b9bdc4' },
  white: { name: 'Trắng', hex: '#ecebe6' },
  pink: { name: 'Hồng', hex: '#f1b3c4' },
  navy: { name: 'Xanh navy', hex: '#2c3e6b' },
  clear: { name: 'Trong suốt', hex: '#e6f2ff' },
  // id cũ "smoke" (Khói) giữ nguyên cho bản lưu cũ, giờ là màu xám
  smoke: { name: 'Xám', hex: '#80858f' },
  yellow: { name: 'Vàng', hex: '#e8c14a' },
  green: { name: 'Xanh lá', hex: '#4f9a66' },
  red: { name: 'Đỏ', hex: '#8f1d26' },
  purple: { name: 'Tím', hex: '#5e3a8c' },
  latte: { name: 'Coffee sữa', hex: '#b39274' },
  brown: { name: 'Nâu đậm', hex: '#4a2e1f' },
  frost: { name: 'Mờ sữa', hex: '#eef2f5' },
  walnut: { name: 'Gỗ óc chó', hex: '#5b3a24' },
  oak: { name: 'Gỗ sồi', hex: '#b88a55' },
  // gỗ không có ảnh vân riêng: mượn vân sồi / óc chó rồi nhân màu (materials.tsx woodTexFor)
  ash: { name: 'Gỗ tần bì', hex: '#f6ead6' },
  rosewood: { name: 'Gỗ hồng mộc', hex: '#c98572' },
}

/** nhãn cỡ case trên ảnh sản phẩm Shopii */
const FF_BADGE: Record<string, string> = {
  '40': '40%',
  '60': '60%',
  '65': '65%',
  '75': '75%',
  tkl: 'TKL',
  frl: 'FRL',
  full: 'Full',
  alice: 'Alice',
  planck: 'Planck',
}

/**
 * Dòng case: các case cùng dòng gộp thành 1 sản phẩm Shopii (1 tên), chất liệu chọn ở option.
 * Id từng case giữ riêng (bản lưu, đơn khách, model CAD); case không nằm trong dòng nào thì đứng riêng như cũ
 */
export const CASE_LINES: { name: string; variants: [id: string, label: string][] }[] = [
  {
    name: 'Case 60%',
    variants: [
      ['plastic60', 'Nhựa ABS'],
      ['wood60', 'Gỗ'],
      ['mica60', 'Mica xếp lớp'],
      ['pc60', 'PC 2 mảnh'],
      ['gasket60', 'Nhôm 2 mảnh'],
      ['gasket60Duo', 'Nắp PC · đáy nhôm'],
    ],
  },
  {
    name: 'Case 40%',
    variants: [
      ['plastic40', 'Nhựa ABS'],
      ['mica40', 'Mica xếp lớp'],
      ['alu40', 'Nhôm E-coat'],
    ],
  },
  {
    name: 'Case 75%',
    variants: [
      ['case75Plastic', 'Nhựa ABS'],
      ['case75Mica', 'Mica xếp lớp'],
      ['case75Alu', 'Nhôm gasket'],
    ],
  },
  {
    name: 'Case TKL',
    variants: [
      ['tklTray', 'Nhựa ABS'],
      ['tklAlu', 'Nhôm 1 mảnh'],
      ['tklAcrylic', 'Acrylic 2 mảnh'],
      ['tklGasket', 'Nhôm 2 mảnh'],
    ],
  },
  {
    name: 'Case FRL',
    variants: [
      ['frlMica', 'Mica xếp lớp'],
      ['frlAlu', 'Nhôm'],
    ],
  },
  {
    name: 'Case Full',
    variants: [
      ['fullTray', 'Nhựa ABS'],
      ['fullMica', 'Mica xếp lớp'],
      ['fullGasket', 'Nhôm E-coat'],
    ],
  },
  {
    name: '4HEAD',
    variants: [
      ['head4Acrylic', 'Acrylic'],
      ['head4Alu', 'Nhôm'],
    ],
  },
  {
    name: 'Repent75',
    variants: [
      ['repent75', 'Nhôm'],
      ['repent75Pc', 'Nắp PC · đáy nhôm'],
    ],
  },
  {
    name: 'Exodus80',
    variants: [
      ['exodus80Pc', 'PC'],
      ['exodus80', 'Nhôm'],
      ['exodus80Duo', 'Nắp nhôm · đáy PC'],
    ],
  },
]

// Chất liệu case: ảnh hưởng hình ảnh (Bench) và âm thanh
const CASE_MATERIALS: Record<string, SoundMod> = {
  abs: { name: 'Nhựa ABS', dl: 0.05, dp: 0 },
  anod: { name: 'Nhôm anod', dl: 0, dp: 0.04 },
  ecoat: { name: 'Nhôm E-coat (sần)', dl: 0, dp: 0.02 },
  pc: { name: 'PC mờ', dl: -0.03, dp: -0.05 },
  acrylic: { name: 'Acrylic trong', dl: 0.02, dp: 0.03 },
  mica: { name: 'Mica xếp lớp', dl: 0.05, dp: 0.03 },
  wood: { name: 'Gỗ', dl: -0.05, dp: -0.08 },
}

// screwSide: 'top' = vít xuyên từ trên (case mica xếp lớp), 'bottom' = vít ở đáy case
// Thông số Tofu60 Redux tham khảo trang sản phẩm Redux V2 của KBDfans (tray 5 standoff / O-ring / OG)
export const CASES: Record<string, CaseDef> = {
  tofu60redux: {
    name: 'Tofu60 Redux',
    ff: '60',
    pieces: 1,
    material: 'anod',
    mounts: ['tray', 'oring', 'og'],
    price: 1600,
    colors: [
      'black',
      'silver',
      'pink',
      'yellow',
      'green',
      'red',
      'purple',
      'latte',
      'brown',
      'navy',
    ],
    desc: 'Nhôm CNC anod 1 mảnh',
  },
  plastic60: {
    name: 'Case 60% nhựa',
    ff: '60',
    pieces: 1,
    material: 'abs',
    mounts: ['tray', 'oring', 'og'],
    price: 300,
    colors: ['black', 'white', 'yellow', 'green', 'red', 'purple', 'latte', 'brown', 'navy'],
    desc: 'Nhựa ABS, giá rẻ',
  },
  wood60: {
    name: 'Case 60% gỗ',
    ff: '60',
    pieces: 1,
    material: 'wood',
    mounts: ['tray', 'oring', 'og'],
    price: 900,
    colors: ['walnut', 'oak', 'ash', 'rosewood'],
    desc: 'Gỗ nguyên khối, tiếng ấm',
  },
  gasket60: {
    name: 'Case 60% nhôm 2 mảnh',
    ff: '60',
    pieces: 2,
    screwSide: 'bottom',
    material: 'anod',
    mounts: ['gasket', 'top'],
    price: 2100,
    colors: ['silver', 'navy', 'black', 'yellow', 'green', 'red', 'purple', 'latte', 'brown'],
    desc: 'Top + bottom anod, vít ở đáy',
  },
  pc60: {
    name: 'Case 60% PC 2 mảnh',
    ff: '60',
    pieces: 2,
    screwSide: 'bottom',
    material: 'pc',
    mounts: ['gasket', 'top'],
    price: 1200,
    colors: ['frost', 'smoke', 'yellow', 'green'],
    desc: 'Polycarbonate mờ, xuyên đèn, vít ở đáy',
  },
  mica60: {
    name: 'Case 60% mica xếp lớp',
    ff: '60',
    pieces: 2,
    screwSide: 'top',
    material: 'mica',
    mounts: ['sandwich'],
    price: 450,
    colors: ['clear', 'smoke', 'yellow', 'green'],
    desc: 'Các lớp mica stack, bắt vít từ trên xuống',
  },
  plastic40: {
    name: 'Case 40% nhựa',
    ff: '40',
    pieces: 1,
    material: 'abs',
    mounts: ['tray', 'oring', 'og'],
    price: 280,
    colors: ['white', 'pink', 'yellow', 'green', 'red', 'purple', 'latte', 'brown', 'navy'],
    desc: 'Nhỏ gọn',
  },
  alu40: {
    name: 'Case 40% nhôm E-coat',
    ff: '40',
    pieces: 2,
    screwSide: 'bottom',
    material: 'ecoat',
    mounts: ['gasket', 'top'],
    price: 1400,
    colors: ['silver', 'black', 'navy', 'yellow', 'green', 'red', 'purple', 'latte', 'brown'],
    desc: 'Nhôm phủ E-coat sần, vít ở đáy',
  },
  mica40: {
    name: 'Case 40% mica xếp lớp',
    ff: '40',
    pieces: 2,
    screwSide: 'top',
    material: 'mica',
    mounts: ['sandwich'],
    price: 350,
    colors: ['clear', 'smoke', 'yellow', 'green'],
    desc: 'Mica stack, bắt vít từ trên xuống',
  },
  tklTray: {
    name: 'Case TKL nhựa',
    ff: 'tkl',
    pieces: 1,
    material: 'abs',
    mounts: ['tray', 'oring', 'og'],
    price: 550,
    colors: ['black', 'white', 'yellow', 'green', 'red', 'purple', 'latte', 'brown', 'navy'],
    desc: 'Phổ thông',
  },
  tklAlu: {
    name: 'Case TKL nhôm 1 mảnh',
    ff: 'tkl',
    pieces: 1,
    material: 'anod',
    mounts: ['tray', 'oring', 'og'],
    price: 1800,
    colors: ['black', 'silver', 'navy', 'yellow', 'green', 'red', 'purple', 'latte', 'brown'],
    desc: 'Nhôm CNC 1 mảnh, chơi được tray / O-ring / OG mount',
  },
  tklGasket: {
    name: 'Case TKL nhôm 2 mảnh',
    ff: 'tkl',
    pieces: 2,
    screwSide: 'bottom',
    material: 'anod',
    mounts: ['gasket', 'top'],
    price: 2700,
    colors: ['silver', 'navy', 'yellow', 'green', 'red', 'purple', 'latte', 'brown'],
    desc: 'Nhôm anod, vít ở đáy',
  },
  gasket60Duo: {
    name: 'Case 60% nắp PC · đáy nhôm',
    ff: '60',
    pieces: 2,
    screwSide: 'bottom',
    material: 'pc',
    mounts: ['gasket', 'top'],
    price: 1700,
    colors: ['frost', 'clear'],
    desc: 'Nắp PC mờ, đáy nhôm anod bạc, vít ở đáy',
    bottom: { material: 'anod', color: 'silver' },
  },
  tklAcrylic: {
    name: 'Case TKL acrylic 2 mảnh',
    ff: 'tkl',
    pieces: 2,
    screwSide: 'bottom',
    material: 'acrylic',
    mounts: ['gasket', 'top'],
    price: 1500,
    colors: ['clear', 'yellow', 'green'],
    desc: 'Acrylic trong suốt, nhìn thấy mạch',
  },
  fullTray: {
    name: 'Case Full nhựa',
    ff: 'full',
    pieces: 1,
    material: 'abs',
    mounts: ['tray', 'oring', 'og'],
    price: 650,
    colors: ['black', 'white', 'yellow', 'green', 'red', 'purple', 'latte', 'brown', 'navy'],
    desc: 'Phổ thông',
  },
  fullGasket: {
    name: 'Case Full nhôm E-coat',
    ff: 'full',
    pieces: 2,
    screwSide: 'bottom',
    material: 'ecoat',
    mounts: ['gasket', 'top'],
    price: 3100,
    colors: ['silver', 'black', 'yellow', 'green', 'red', 'purple', 'latte', 'brown', 'navy'],
    desc: 'Nhôm E-coat sần, vít ở đáy',
  },
  fullMica: {
    name: 'Case Full mica xếp lớp',
    ff: 'full',
    pieces: 2,
    screwSide: 'top',
    material: 'mica',
    mounts: ['sandwich'],
    price: 600,
    colors: ['clear', 'smoke', 'yellow', 'green'],
    desc: 'Mica stack, bắt vít từ trên xuống',
  },
  // ---------- case CAD từ bộ sưu tập người dùng (D:\IN 3D → assets/user-cases, `bun run convert:user-cases`) ----------
  // ⚠️ chưa rõ giấy phép: chỉ dùng cá nhân. seat lấy từ kết quả script chuyển đổi
  exodus60: {
    name: 'Exodus60',
    ff: '60',
    pieces: 1,
    material: 'anod',
    mounts: ['gasket', 'tray'],
    price: 2300,
    colors: [
      'black',
      'silver',
      'navy',
      'pink',
      'yellow',
      'green',
      'red',
      'purple',
      'latte',
      'brown',
    ],
    desc: 'Nhôm CNC có tạ đáy; nắp riêng cho WK / WKL / HHKB (tự đổi theo layout)',
    model: 'exodus60',
    modelFor: { hhkb: 'exodus60-hhkb', wkl: 'exodus60-wkl' },
    // case nêm: board nghiêng theo mép trước / sau (đo bằng script, plate thấp hơn giữa mép 0.25u; dz bù mặt keycap ngả về sau khi nghiêng)
    seat: { rise: 0.28, tilt: 0.165, dz: 0.1 },
  },
  eclipse60: {
    name: 'Eclipse 60',
    ff: '60',
    pieces: 1,
    material: 'anod',
    mounts: ['gasket', 'tray'],
    price: 2100,
    colors: [
      'silver',
      'black',
      'pink',
      'yellow',
      'green',
      'red',
      'purple',
      'latte',
      'brown',
      'navy',
    ],
    desc: 'Case 60% dáng "trứng" bo tròn, có tạ đáy',
    model: 'eclipse60',
    // case nêm: board nghiêng theo mép trước / sau (đo bằng script, plate thấp hơn giữa mép 0.25u; dz bù mặt keycap ngả về sau khi nghiêng)
    seat: { rise: -0.11, tilt: 0.186, dz: 0.11 },
  },
  head4Alu: {
    name: '4HEAD nhôm',
    ff: '60',
    pieces: 1,
    material: 'anod',
    mounts: ['tray'],
    price: 2000,
    colors: ['silver', 'black', 'navy', 'yellow', 'green', 'red', 'purple', 'latte', 'brown'],
    desc: 'Nắp nhôm, đáy acrylic, tạ đồng; góc gõ 6.2° làm sẵn',
    model: 'head4-alu',
    bottom: { material: 'acrylic', color: 'clear' },
    weight: 'brass',
    // lòng khoét lệch trước (vành sau dày): đo GLB mép trước lòng 65mm − 2.5u → dz 0.91u
    seat: { rise: 0.219, tilt: 0.109, dz: 0.91 },
  },
  head4Acrylic: {
    name: '4HEAD acrylic',
    ff: '60',
    pieces: 1,
    material: 'acrylic',
    mounts: ['tray'],
    price: 1100,
    colors: ['clear', 'smoke', 'frost', 'yellow', 'green'],
    desc: 'Nắp + đáy acrylic, tạ đồng; góc gõ 6.2° làm sẵn',
    model: 'head4-acrylic',
    weight: 'brass',
    // lòng khoét lệch trước (vành sau dày): đo GLB mép trước lòng 64mm − 2.5u → dz 0.86u
    seat: { rise: 0.221, tilt: 0.108, dz: 0.86 },
  },
  cattoHHKB: {
    name: 'Catto HHKB',
    ff: '60',
    layouts: ['hhkb', 'truehhkb'],
    pieces: 1,
    material: 'anod',
    mounts: ['tray', 'oring'],
    price: 1900,
    colors: [
      'white',
      'black',
      'pink',
      'yellow',
      'green',
      'red',
      'purple',
      'latte',
      'brown',
      'navy',
    ],
    desc: 'Case HHKB có khối chặn liền case, tạ đáy',
    model: 'catto-hhkb',
    // case nêm: board nghiêng theo mép trước / sau (đo bằng script, plate thấp hơn giữa mép 0.25u; dz bù mặt keycap ngả về sau khi nghiêng)
    seat: { rise: -0.14, tilt: 0.167, dz: 0.1 },
  },
  vintage60HHKB: {
    name: 'Vintage60 HHKB',
    ff: '60',
    layouts: ['hhkb', 'truehhkb'],
    pieces: 1,
    material: 'abs',
    mounts: ['tray'],
    price: 700,
    colors: ['white', 'black', 'yellow', 'green', 'red', 'purple', 'latte', 'brown', 'navy'],
    desc: 'Case HHKB dáng cổ điển (bản in 3D)',
    model: 'vintage60-hhkb',
    // case nêm: board nghiêng theo mép trước / sau (đo bằng script, plate thấp hơn giữa mép 0.25u; dz bù mặt keycap ngả về sau khi nghiêng)
    seat: { rise: 0.18, tilt: 0.127, dz: 0.08 },
  },
  ta65: {
    name: '65TA',
    ff: '65',
    pieces: 1,
    material: 'anod',
    mounts: ['tray', 'gasket'],
    price: 1800,
    colors: ['black', 'silver', 'navy', 'yellow', 'green', 'red', 'purple', 'latte', 'brown'],
    desc: 'Case 65% có tạ đáy, góc gõ 6.9° làm sẵn',
    model: 'ta65',
    seat: { rise: 0.006, tilt: 0.12 },
  },
  case65Plastic: {
    name: 'Case 65% nhựa',
    ff: '65',
    pieces: 1,
    material: 'abs',
    mounts: ['tray', 'oring', 'og'],
    price: 400,
    colors: ['black', 'white', 'yellow', 'green', 'red', 'purple', 'latte', 'brown', 'navy'],
    desc: 'Nhựa ABS, giá rẻ',
  },
  repent75: {
    name: 'Repent75',
    ff: '75',
    pieces: 1,
    material: 'anod',
    mounts: ['gasket'],
    price: 2200,
    colors: [
      'black',
      'silver',
      'pink',
      'yellow',
      'green',
      'red',
      'purple',
      'latte',
      'brown',
      'navy',
    ],
    desc: 'Case 75% nắp liền, tạ đáy',
    model: 'repent75',
    // có thêm đáy: góc gõ 7° làm sẵn
    seat: { rise: 0.03, tilt: 0.121 },
    weight: 'gold',
  },
  repent75Pc: {
    name: 'Repent75 nắp PC · đáy nhôm',
    ff: '75',
    pieces: 1,
    material: 'pc',
    mounts: ['gasket'],
    price: 2000,
    colors: ['frost', 'clear', 'smoke'],
    desc: 'Nắp PC mờ xuyên đèn, đáy nhôm bạc, tạ vàng; góc gõ 7°',
    model: 'repent75',
    seat: { rise: 0.03, tilt: 0.121 },
    weight: 'gold',
    bottom: { material: 'anod', color: 'silver' },
  },
  exodus80Duo: {
    name: 'Exodus80 nắp nhôm · đáy PC',
    ff: 'tkl',
    pieces: 1,
    material: 'anod',
    mounts: ['gasket', 'tray'],
    price: 2500,
    colors: ['black', 'navy', 'green', 'red', 'purple', 'latte', 'brown'],
    desc: 'Nắp nhôm anod, đáy PC mờ, tạ đồng',
    model: 'exodus80',
    // case nêm (mép sau 1.11u, mép trước −0.06u, dốc ~10°): board nghiêng theo, nằm dưới mép case
    seat: { rise: 0.2, tilt: 0.15, dz: 0.07 },
    weight: 'copper',
    bottom: { material: 'pc', color: 'frost' },
  },
  exodus80: {
    name: 'Exodus80',
    ff: 'tkl',
    pieces: 1,
    material: 'anod',
    mounts: ['gasket', 'tray'],
    price: 2800,
    colors: ['black', 'silver', 'navy', 'yellow', 'green', 'red', 'purple', 'latte', 'brown'],
    desc: 'TKL nhôm, tạ trong + tạ ngoài',
    model: 'exodus80',
    seat: { rise: 0.2, tilt: 0.15, dz: 0.07 },
    weight: 'copper',
  },
  exodus80Pc: {
    name: 'Exodus80 PC',
    ff: 'tkl',
    pieces: 1,
    material: 'pc',
    mounts: ['gasket', 'tray'],
    price: 2400,
    colors: ['frost', 'clear', 'smoke'],
    desc: 'TKL nắp PC mờ xuyên đèn, tạ đồng',
    model: 'exodus80',
    // cùng model + chỗ đặt board với Exodus80 nhôm
    seat: { rise: 0.2, tilt: 0.15, dz: 0.07 },
    weight: 'copper',
  },
  rfBruh: {
    name: 'RF Bruh',
    ff: 'tkl',
    pieces: 1,
    material: 'anod',
    mounts: ['tray', 'gasket'],
    price: 2000,
    colors: [
      'white',
      'black',
      'silver',
      'yellow',
      'green',
      'red',
      'purple',
      'latte',
      'brown',
      'navy',
    ],
    desc: 'Case TKL dáng Realforce R1 / R2, thành dày',
    model: 'rf-bruh',
    // case gờ trước dày hơn gờ sau: căn theo khung bao thì phím lệch về sau ~0.6u so với lỗ case
    // case nêm: board nghiêng theo mép trước / sau (đo bằng script, plate thấp hơn giữa mép 0.25u; dz bù mặt keycap ngả về sau khi nghiêng)
    seat: { rise: 0.34, tilt: 0.114, dz: 0.76, dx: -0.08 },
  },
  cattoRF: {
    name: 'Catto RF',
    ff: 'tkl',
    pieces: 1,
    material: 'anod',
    mounts: ['tray'],
    price: 1900,
    colors: [
      'black',
      'white',
      'pink',
      'yellow',
      'green',
      'red',
      'purple',
      'latte',
      'brown',
      'navy',
    ],
    desc: 'Case TKL kiểu Realforce bản Catto v4',
    model: 'catto-rf',
    seat: { rise: 0.686, tilt: 0 },
  },
  dualityHorns: {
    name: 'Duality Horns',
    ff: 'tkl',
    pieces: 1,
    material: 'anod',
    mounts: ['gasket', 'tray'],
    price: 3000,
    colors: ['black', 'silver', 'navy', 'yellow', 'green', 'red', 'purple', 'latte', 'brown'],
    desc: 'TKL nhôm, tạ đáy + badge + accent, góc gõ 4.5°',
    model: 'duality-horns',
    seat: { rise: 0.19, tilt: 0.079 },
    weight: 'gold',
  },
  // ---------- 75% ----------
  case75Alu: {
    name: 'Case 75% nhôm gasket',
    ff: '75',
    pieces: 1,
    material: 'anod',
    mounts: ['gasket', 'tray', 'oring', 'og'],
    price: 1500,
    colors: ['black', 'silver', 'navy', 'yellow', 'green', 'red', 'purple', 'latte', 'brown'],
    desc: 'Nhôm CNC 1 mảnh kiểu Q1, gasket mount êm',
  },
  case75Plastic: {
    name: 'Case 75% nhựa',
    ff: '75',
    pieces: 1,
    material: 'abs',
    mounts: ['tray', 'oring', 'og'],
    price: 450,
    colors: ['black', 'white', 'yellow', 'green', 'red', 'purple', 'latte', 'brown', 'navy'],
    desc: 'Nhựa ABS, giá rẻ',
  },
  case75Mica: {
    name: 'Case 75% mica xếp lớp',
    ff: '75',
    pieces: 2,
    screwSide: 'top',
    material: 'mica',
    mounts: ['sandwich'],
    price: 550,
    colors: ['clear', 'smoke', 'yellow', 'green'],
    desc: 'Mica stack, bắt vít từ trên xuống',
  },
  // ---------- FRL (TKL không hàng F) ----------
  frlAlu: {
    name: 'Case FRL nhôm',
    ff: 'frl',
    pieces: 1,
    material: 'anod',
    mounts: ['gasket', 'tray', 'oring', 'og'],
    price: 1700,
    colors: [
      'black',
      'silver',
      'pink',
      'yellow',
      'green',
      'red',
      'purple',
      'latte',
      'brown',
      'navy',
    ],
    desc: 'TKL bỏ hàng F, gọn hơn TKL thường, nhôm 1 mảnh',
  },
  frlMica: {
    name: 'Case FRL mica xếp lớp',
    ff: 'frl',
    pieces: 2,
    screwSide: 'top',
    material: 'mica',
    mounts: ['sandwich'],
    price: 650,
    colors: ['clear', 'frost', 'yellow', 'green'],
    desc: 'Mica stack, bắt vít từ trên xuống',
  },
  // ---------- Alice ----------
  aliceMica: {
    name: 'Case Alice mica xếp lớp',
    ff: 'alice',
    pieces: 2,
    screwSide: 'top',
    material: 'mica',
    mounts: ['sandwich'],
    price: 800,
    colors: ['clear', 'smoke', 'yellow', 'green'],
    desc: 'Mica stack cho layout Alice, bắt vít từ trên xuống',
  },
  // Case từ thiết kế mở (MIT), dùng model CAD thật
  bakeneko60: {
    name: 'Bakeneko 60',
    ff: '60',
    pieces: 1,
    material: 'anod',
    mounts: ['oring'],
    price: 1900,
    colors: ['black', 'silver', 'navy', 'yellow', 'green', 'red', 'purple', 'latte', 'brown'],
    desc: 'Thiết kế mở của kkatano: nhôm 1 mảnh, O-ring mount gõ êm, nảy',
    model: 'bakeneko60',
  },
  aliceAlu: {
    name: 'Blossom',
    ff: 'alice',
    pieces: 1,
    material: 'anod',
    mounts: ['tray'],
    price: 2400,
    colors: [
      'black',
      'silver',
      'pink',
      'yellow',
      'green',
      'red',
      'purple',
      'latte',
      'brown',
      'navy',
    ],
    desc: 'Case Alice gasket mount kiểu Arisu, 2 nửa xoay ±12° + cụm mũi tên (doughnut923/Blossom, MIT)',
    model: 'alice-blossom',
    // ghép 2 mảnh in 3D (scripts/convert-user-cases.mjs): đáy hình nêm, nắp + plate nghiêng ~4.9° theo đáy
    seat: { rise: -0.048, tilt: 0.085 },
  },
  planckAlu: {
    name: 'Planck nhôm',
    ff: 'planck',
    pieces: 1,
    material: 'anod',
    mounts: ['tray'],
    price: 1100,
    colors: [
      'black',
      'silver',
      'pink',
      'yellow',
      'green',
      'red',
      'purple',
      'latte',
      'brown',
      'navy',
    ],
    desc: 'Case khay thấp cho Planck ortholinear 12 × 4 (OLKB, bản vẽ MIT)',
    model: 'planck',
    // khay thấp (thành tới −0.3u): hạ board để plate nằm ngang mép case, PCB không lòi lên trên thành
    seat: { rise: -0.22, tilt: 0 },
  },
}

export const PCB_TYPES: Record<string, Named> = {
  hotswap: { name: 'Hotswap', price: 450, desc: 'Dùng để cố định switch với PCB' },
  solder: { name: 'Hàn (solder)', price: 280, desc: 'Phải hàn từng switch' },
}

/** loại switch khách có thể đòi (SwitchDef.kind); Silent = silent linear */
export const SWITCH_KINDS: Record<SwitchKind, string> = {
  Linear: 'Linear',
  Tactile: 'Tactile',
  Clicky: 'Clicky',
  Silent: 'Silent',
  SilentTactile: 'Silent Tactile',
}
export const switchKindOf = (type: string): SwitchKind => SWITCHES[type].kind
/**
 * Switch có hợp loại khách đòi không: đúng loại, hoặc Silent Tactile cũng tính là Tactile / Silent
 * (khách đòi Tactile hay Silent mà shop lắp silent tactile vẫn đúng)
 */
export const switchFits = (type: string, want?: SwitchKind) => {
  if (!want) return true
  const kind = switchKindOf(type)
  return kind === want || (kind === 'SilentTactile' && (want === 'Tactile' || want === 'Silent'))
}
/** Switch có đúng yêu cầu đơn không: khách đòi đúng con (`switchType`) thì phải đúng con đó, không thì theo loại */
export const switchOk = (type: string, order: Pick<Order, 'switchType' | 'switchKind'>) =>
  order.switchType ? type === order.switchType : switchFits(type, order.switchKind)
/** Tên switch khách đòi: đúng con (vd "Cherry MX Đen") hoặc loại ("Silent"); null = shop tự chọn */
export const switchWant = (order: Pick<Order, 'switchType' | 'switchKind'>) =>
  order.switchType
    ? (SWITCHES[order.switchType]?.name ?? order.switchType)
    : order.switchKind
      ? SWITCH_KINDS[order.switchKind]
      : null
/** kiểu gắn stab (nhãn ảnh + bộ lọc Shopii) */
export const STAB_MOUNTS: Record<StabModel['mount'], string> = {
  clip: 'Clip-in',
  screw: 'Screw-in',
  plate: 'Plate-mount',
}

/** Tên PCB (loại tiêu chuẩn của shop) */
export const pcbLabel = (p: { type: string }) => PCB_TYPES[p.type].name

// Thông số Staebies / TX theo các review (Staebies screw-in, TX AP screw-in, cả hai khít, chân stem đã clip sẵn).
// Knight v1/v2/v3: CHƯA có thông số đáng tin — đang tạm tính, chỉnh lại theo hàng thật
export const STABS: Record<string, StabModel> = {
  cherryClip: {
    name: 'Cherry clip-in',
    brand: 'Cherry',
    mount: 'clip',
    price: 120,
    feet: true,
    tight: false,
    prelubed: false,
    housing: '#1c1c1c',
    // stab Cherry: slider đen như housing
    stem: '#2b2b2e',
    desc: 'Stab cổ điển: phải clip chân, dán Urgo, lube housing/slider + wire mới êm',
  },
  cherryScrew: {
    name: 'Cherry screw-in',
    brand: 'Cherry',
    mount: 'screw',
    price: 180,
    feet: true,
    tight: false,
    prelubed: false,
    housing: '#1c1c1c',
    stem: '#2b2b2e',
    desc: 'Như Cherry clip-in nhưng bắt vít, chắc hơn',
  },
  cherryPlate: {
    name: 'Cherry plate-mount',
    brand: 'Cherry',
    mount: 'plate',
    price: 100,
    feet: true,
    tight: false,
    prelubed: false,
    housing: '#1c1c1c',
    stem: '#2b2b2e',
    desc: 'Kẹp vào plate, không dán băng được',
  },
  staebies: {
    name: 'Staebies v2.1',
    brand: 'aeboards',
    mount: 'screw',
    price: 420,
    feet: false,
    tight: true,
    prelubed: false,
    housing: '#2a2a2e',
    stem: '#e8e4da',
    rounded: true,
    desc: 'Screw-in, chân đã clip sẵn, khít: chỉ cần lube housing/slider + wire',
  },
  txAP: {
    name: 'TX AP',
    brand: 'TX',
    mount: 'screw',
    price: 450,
    feet: false,
    tight: true,
    prelubed: false,
    housing: '#3a3a3a',
    stem: '#d9cfb8',
    desc: 'Screw-in, rất chắc, khít: lube nhẹ housing/slider + wire là đủ',
  },
  knightV1: {
    name: 'Knight v1',
    brand: 'Knight',
    mount: 'screw',
    price: 250,
    feet: false,
    tight: false,
    prelubed: false,
    housing: '#202a3a',
    stem: '#f2f2f2',
    desc: 'Screw-in, cần lube housing/slider + wire (thông số tạm tính)',
  },
  knightV2: {
    name: 'Knight v2',
    brand: 'Knight',
    mount: 'screw',
    price: 300,
    feet: false,
    tight: true,
    prelubed: false,
    housing: '#2a2f3a',
    stem: '#ece6d6',
    rounded: true,
    desc: 'Screw-in, khít hơn v1 (thông số tạm tính)',
  },
  knightV3: {
    name: 'Knight v3',
    brand: 'Knight',
    mount: 'screw',
    price: 360,
    feet: false,
    tight: true,
    prelubed: true,
    housing: '#1f2530',
    stem: '#e2d6bd',
    rounded: true,
    desc: 'Screw-in, đã lube sẵn housing, chỉ cần lube wire (thông số tạm tính)',
  },
}

export const KEYCAP_COLORS: Record<string, KeycapColor> = {
  white: { name: 'Trắng', hex: '#f2efe8', legend: '#333' },
  black: { name: 'Đen', hex: '#2a2a2e', legend: '#ddd' },
  pink: { name: 'Hồng', hex: '#f4b6c8', legend: '#5a2a3a' },
  navy: { name: 'Xanh navy', hex: '#2c3e6b', legend: '#f2d16b' },
  mint: { name: 'Bạc hà', hex: '#a8e0cf', legend: '#24584a' },
  // xanh lá đậm chữ trắng, 1 màu cả bộ (kiểu GMK xanh rêu)
  green: { name: 'Xanh lá', hex: '#1d3522', legend: '#f2efe8' },
}

export type KeycapProfile = 'cherry' | 'oem' | 'sa' | 'dsa' | 'xda' | 'mt3' | 'asa' | 'opk'

/** Tên bộ keycap không kèm cỡ: "Cherry Base (40/60/HHKB/Planck)" → "Cherry" */
export const keycapKitShort = (name: string) => name.replace(/\s*\b(Full|Base)\b.*$/i, '')

/** chất liệu keycap: hệ số giá (PBT rẻ nhất → mix → ABS đắt nhất), thứ tự = thứ tự option ở Shopii */
export const KEYCAP_MATERIALS: Record<
  KeycapMaterial,
  { name: string; mult: number; desc: string }
> = {
  pbt: { name: 'PBT', mult: 0.8, desc: 'nhựa PBT nhám, in dye-sub, giá mềm nhất' },
  mix: { name: 'Mix PBT + ABS', mult: 0.9, desc: 'alpha PBT, mod ABS' },
  abs: { name: 'ABS', mult: 1, desc: 'nhựa ABS doubleshot, mịn, chữ sắc nét nhất' },
}
/** chất liệu của 1 bộ keycap (bản lưu cũ = PBT) */
export const keycapMaterialOf = (item: { material?: KeycapMaterial }) => item.material ?? 'pbt'

export const KEYCAP_KITS: Record<
  string,
  {
    name: string
    profile: KeycapProfile
    price: number
    layouts: LayoutId[]
    /** bộ cũ đã bỏ khỏi Shopii / đơn mới (giữ để bản lưu cũ còn đọc được) */
    hidden?: boolean
  }
> = {
  // bộ Cherry Base cũ (chỉ 40/60/HHKB/Planck) trùng với Cherry Full → bỏ, chỉ còn 1 bộ Cherry
  base: {
    name: 'Cherry Base (40/60/HHKB/Planck)',
    profile: 'cherry',
    price: 400,
    layouts: ['40', '60', 'hhkb', 'truehhkb', 'planck'],
    hidden: true,
  },
  full: {
    name: 'Cherry Full (mọi layout)',
    profile: 'cherry',
    price: 650,
    layouts: Object.keys(LAYOUTS) as LayoutId[],
  },
  oem: {
    name: 'OEM Full',
    profile: 'oem',
    price: 660,
    layouts: Object.keys(LAYOUTS) as LayoutId[],
  },
  sa: { name: 'SA Full', profile: 'sa', price: 800, layouts: Object.keys(LAYOUTS) as LayoutId[] },
  dsa: {
    name: 'DSA Full',
    profile: 'dsa',
    price: 680,
    layouts: Object.keys(LAYOUTS) as LayoutId[],
  },
  xda: {
    name: 'XDA Full',
    profile: 'xda',
    price: 700,
    layouts: Object.keys(LAYOUTS) as LayoutId[],
  },
  mt3: {
    name: 'MT3 Full',
    profile: 'mt3',
    price: 820,
    layouts: Object.keys(LAYOUTS) as LayoutId[],
  },
  asa: {
    name: 'ASA Full',
    profile: 'asa',
    price: 740,
    layouts: Object.keys(LAYOUTS) as LayoutId[],
  },
  opk: {
    name: 'OPK Full',
    profile: 'opk',
    price: 780,
    layouts: Object.keys(LAYOUTS) as LayoutId[],
  },
}

export const SIZE_MULT: Record<LayoutId, number> = {
  '40': 0.8,
  '60': 1,
  hhkb: 1,
  truehhkb: 1,
  tkl: 1.4,
  full: 1.7,
  planck: 0.75,
  '65': 1.15,
  '75': 1.25,
  frl: 1.3,
  alice: 1.2,
}

/** màu khay (nhôm anod), mua xong bấm vào khay trên bàn để đổi (`nextTrayColor`) */
export const TRAY_COLORS: Record<string, { name: string; hex: string }> = {
  silver: { name: 'Bạc', hex: '#c9ccd1' },
  black: { name: 'Đen', hex: '#2c2d31' },
  brown: { name: 'Nâu', hex: '#6e4b34' },
  red: { name: 'Đỏ', hex: '#a3262a' },
  blue: { name: 'Xanh dương', hex: '#2f4f8f' },
  gold: { name: 'Vàng đồng', hex: '#c6a04c' },
  purple: { name: 'Tím', hex: '#5d3f86' },
}

export const TOOLS: Record<ToolKind, ToolDef[]> = {
  // chỉ cho gọn bàn: ốc tháo ra nằm trong khay thay vì vương vãi trên bàn (không tăng chỉ số gì)
  screwTray: [
    { name: 'Chưa có khay đựng ốc', none: true, price: 0 },
    {
      name: 'Khay đựng ốc nhôm CNC',
      price: 500,
      desc: 'Khay nhôm hình giọt nước: ốc tháo ra bỏ vào lòng khay cho gọn, không lăn lung tung trên bàn. Nhiều màu (bấm khay trên bàn để đổi), chỉ để đẹp, không tăng chỉ số gì.',
    },
  ],
  spoolHolder: [
    { name: 'Chưa có giá đỡ cuộn thiếc', none: true, price: 0 },
    {
      name: 'Giá đỡ cuộn thiếc',
      price: 180,
      desc: 'Cấp thiếc gọn hơn, giảm 1 giây nung mỗi phím (tối thiểu 0,2 giây).',
    },
  ],
  desolder: [
    { name: 'Chưa có bút hút thiếc', none: true, price: 0 },
    {
      name: 'Bút rã hàn hút thiếc',
      price: 150,
      life: 1000,
      desc: 'Hút bỏ mối hàn cháy trước khi hàn lại. Dùng được 1.000 lần hút hoàn tất.',
    },
  ],
  // lắp switch / keycap bằng tay; số phím mỗi lần theo bậc thợ (chứng chỉ thợ, `cert`)
  switch: [{ name: 'Tay không', n: 1, price: 0, desc: 'Lắp switch, số phím mỗi lần theo bậc thợ' }],
  keycap: [{ name: 'Tay không', n: 1, price: 0, desc: 'Lắp keycap, số phím mỗi lần theo bậc thợ' }],
  // chứng chỉ thợ: n = số switch lắp / keycap lắp / switch mở / switch lube mỗi lần (cộng thêm phép lube)
  cert: [
    { name: 'Thợ lõ', n: 1, price: 0, desc: 'Mới vào nghề: lắp / mở từng switch, từng keycap một' },
    {
      name: 'Chứng chỉ thợ middle',
      n: 5,
      price: 5000,
      desc: 'Lắp 5 switch, 5 keycap mỗi lần, mở / lube 5 switch mỗi lần',
    },
    {
      name: 'Chứng chỉ thợ senior',
      n: 10,
      price: 10000,
      desc: 'Lắp 10 switch, 10 keycap mỗi lần, mở / lube 10 switch mỗi lần',
    },
  ],
  screw: [
    { name: 'Tua vít thường', clicks: 3, price: 0, desc: '3 lần click mỗi con vít' },
    { name: 'Tua vít điện', clicks: 1, price: 350, desc: '1 click là xong' },
  ],
  // hold = giây giữ mỏ hàn tới khi thiếc chảy đủ (nhân hệ số loại thiếc, cộng thời gian lấy thiếc)
  solder: [
    { name: 'Chưa có mỏ hàn', none: true, hold: 0, price: 0 },
    {
      name: 'Bút hàn 60W',
      hold: 1.4,
      price: 90,
      life: 300,
      desc: 'Bắt buộc cho PCB hàn. Nóng chậm: giữ ~1.4 giây mỗi phím. Bền 300 lần hàn',
    },
    {
      name: 'Trạm hàn nhiệt',
      hold: 4,
      price: 600,
      life: 1000,
      desc: 'Giữ nhiệt ổn định: thời gian nung cơ bản 4 giây mỗi phím, thay đổi theo loại thiếc và giá đỡ. Bền 1000 lần hàn',
    },
  ],
  // bùi nhùi đồng lau mũi hàn: hàn cháy làm mũi đen, phải lau mới hàn tiếp được
  tipCleaner: [
    { name: 'Chưa có bùi nhùi', none: true, price: 0 },
    {
      name: 'Bùi nhùi đồng lau mũi hàn',
      price: 35,
      life: 1000,
      desc: 'Mũi hàn đen (hàn cháy) thì dí vào lau sạch mới hàn tiếp được. Dùng 1000 lần',
    },
  ],
  clipper: [
    { name: 'Chưa có kìm cắt', none: true, price: 0 },
    { name: 'Kìm cắt chân stab', price: 120, desc: 'Clip chân stem stab cho bớt lạch cạch' },
  ],
  brush: [
    { name: 'Chưa có cọ lube', none: true, quality: 0, price: 0 },
    {
      name: 'Cọ lube',
      quality: 1,
      price: 60,
      life: 1000,
      desc: 'Lube switch + stab. Dùng 1000 lần',
    },
  ],
  opener: [
    { name: 'Chưa có đồ mở switch', none: true, n: 0, price: 0 },
    {
      name: 'Đồ mở switch',
      n: 99,
      price: 150,
      desc: 'Mở switch ra để lube; số switch mỗi mẻ theo bậc thợ',
    },
  ],
}
export const TOOL_KINDS: Record<ToolKind, string> = {
  desolder: 'Rã hàn / hút thiếc',
  spoolHolder: 'Giá đỡ cuộn thiếc',
  screwTray: 'Khay đựng ốc',
  switch: 'Lắp switch',
  cert: 'Chứng chỉ thợ',
  keycap: 'Lắp keycap',
  screw: 'Tua vít',
  solder: 'Hàn (PCB solder)',
  tipCleaner: 'Lau mũi hàn',
  clipper: 'Mod stab',
  brush: 'Cọ lube',
  opener: 'Mở switch',
}

export const SOUND_WISH: Record<
  SoundWish,
  { name: string; target: [number, number]; msg: string }
> = {
  silent: {
    name: 'Êm, yên tĩnh',
    target: [0.1, 0.3],
    msg: 'Mình làm văn phòng nên cần gõ thật êm, không làm phiền ai',
  },
  thock: {
    name: 'Thocky trầm',
    target: [0.5, 0.12],
    msg: 'Mình mê tiếng "thock" trầm ấm, đầm tay',
  },
  clack: {
    name: 'Clacky giòn',
    target: [0.62, 0.82],
    msg: 'Mình thích tiếng "clack" giòn, cao, sáng',
  },
  noisy: {
    name: 'Ồn ào, clack to rõ',
    target: [0.95, 0.85],
    msg: 'Gõ phải kêu clack thật to, rõ từng phím cho đã tai',
  },
}

const clamp = (v: number) => Math.max(0, Math.min(1, v))

// lubeFrac: tỉ lệ switch đã lube (0..1)
function soundProfile(
  switchType: string,
  plate: string,
  mount: string | null,
  {
    caseId,
    lubeFrac = 0,
    lubeType,
    foam = false,
    ring,
  }: {
    caseId?: string
    lubeFrac?: number
    lubeType?: string | null
    foam?: boolean
    /** dây O-ring đã cuốn (O-ring / OG mount) */
    ring?: string
  } = {},
): SoundProfile {
  const sw = SWITCHES[switchType]
  const zero = { dl: 0, dp: 0 }
  const p = PLATES[plate] ?? zero
  const m = (mount && MOUNTS[mount]) || zero
  const c = (caseId && CASE_MATERIALS[CASES[caseId].material]) || zero
  let loud = sw.loud + p.dl + m.dl + c.dl
  let pitch = sw.pitch + p.dp + m.dp + c.dp
  // foam Poron giữa PCB và plate: bớt rung vang, tiếng trầm thock hơn
  if (foam) {
    loud -= 0.05
    pitch -= 0.08
  }
  // dây O-ring: mềm (30A) board nhún sâu → êm + trầm hơn; cứng (70A) ít nhún → chắc, cao hơn chút (50A làm chuẩn)
  const shore = ring ? SUPPLIES[ring]?.oring?.shore : undefined
  if (shore) {
    loud += (shore - 50) * 0.0025
    pitch += (shore - 50) * 0.003
  }
  // mỡ càng đặc (độ hợp switch thấp, vd BDZ / Permatex) thì tiếng càng nhũn, bị trì
  const thick =
    lubeType &&
    SUPPLIES[lubeType].fit?.linear !== undefined &&
    SUPPLIES[lubeType].fit!.linear! < 0.5
      ? 2
      : 1
  if (sw.feel === 'clicky') loud -= 0.2 * lubeFrac
  else {
    loud -= 0.06 * lubeFrac * thick
    pitch -= 0.06 * lubeFrac * thick
  }
  return { loud: clamp(loud), pitch: clamp(pitch), kind: sw.kind }
}

// Âm thanh của bàn phím đang build (kể cả case và lube)
export function buildSound(
  inv: Inventory,
  mount: string | null,
  build: BuildState | null,
  nKeys?: number,
) {
  return soundProfile(inv.switch!.type, inv.plate!.material, mount, {
    caseId: inv.case?.id,
    lubeFrac: build && nKeys ? build.lubed / nKeys : 0,
    lubeType: build?.lubeType,
    foam: !!build?.foam,
    ring: typeof build?.ring === 'string' ? build.ring : undefined,
  })
}

export function soundMatch(profile: SoundProfile, wish: SoundWish) {
  const [l, p] = SOUND_WISH[wish].target
  return clamp(1 - Math.hypot(profile.loud - l, profile.pitch - p) / 0.5)
}

export function soundLabel(profile: SoundProfile) {
  let best: SoundWish = 'thock'
  let bestD = Infinity
  for (const [id, w] of Object.entries(SOUND_WISH) as [
    SoundWish,
    (typeof SOUND_WISH)[SoundWish],
  ][]) {
    const d = Math.hypot(profile.loud - w.target[0], profile.pitch - w.target[1])
    if (d < bestD) {
      bestD = d
      best = id
    }
  }
  return SOUND_WISH[best].name
}

// Danh mục sản phẩm cho các shop. Mỗi sản phẩm có nhiều option (màu / chất liệu / loại / số lượng)
export function buildCatalog(): Product[] {
  const products: Product[] = []
  // case: mỗi dòng (CASE_LINES) là 1 sản phẩm, option = chất liệu (group) × màu; case lẻ thì 1 chất liệu
  const caseDesc = (c: CaseDef) =>
    `${CASE_MATERIALS[c.material].name} · ${c.pieces === 2 ? '2 mảnh' : '1 mảnh'}. ${c.desc}. Mount: ${c.mounts.map((m) => MOUNTS[m].name).join(', ')}`
  const lined = new Set(CASE_LINES.flatMap((l) => l.variants.map(([id]) => id)))
  const caseGroups: { key: string; name: string; variants: [string, string | undefined][] }[] = [
    ...CASE_LINES.map((l) => ({ key: l.variants[0][0], name: l.name, variants: l.variants })),
    ...Object.keys(CASES)
      .filter((id) => !lined.has(id))
      .map((id) => ({
        key: id,
        name: CASES[id].name,
        variants: [[id, undefined]] as [string, string | undefined][],
      })),
  ]
  for (const g of caseGroups) {
    const defs = g.variants.map(([id]) => CASES[id])
    products.push({
      id: `case-${g.key}`,
      cat: 'case',
      name: g.name,
      // cỡ case (60% / TKL...) hiện thành nhãn góc ảnh, tên case không cần ghi cỡ
      badge: FF_BADGE[defs[0].ff] ?? defs[0].ff,
      desc: caseDesc(defs[0]),
      layouts: (Object.keys(LAYOUTS) as LayoutId[]).filter((l) => defs.some((c) => caseFits(c, l))),
      options: g.variants.flatMap(([id, label]) =>
        CASES[id].colors.map((col) => ({
          label: CASE_COLORS[col].name,
          swatch: CASE_COLORS[col].hex,
          price: CASES[id].price,
          item: { id, color: col },
          ...(label ? { group: label, hint: caseDesc(CASES[id]) } : {}),
        })),
      ),
    })
  }
  for (const [lay, L] of Object.entries(LAYOUTS) as [LayoutId, (typeof LAYOUTS)[LayoutId]][]) {
    products.push({
      id: `pcb-${lay}`,
      cat: 'pcb',
      name: `PCB ${L.name}`,
      desc: 'Hỗ trợ mọi biến thể layout',
      layouts: [lay],
      options: Object.entries(PCB_TYPES).map(([t, p]) => ({
        label: p.name,
        swatch: '#1d6b3a',
        price: Math.round(p.price * SIZE_MULT[lay]),
        item: { layout: lay, type: t },
        hint: p.desc,
      })),
    })
    products.push({
      id: `plate-${lay}`,
      cat: 'plate',
      name: `Plate ${L.name}`,
      desc: 'Chất liệu plate ảnh hưởng rất nhiều tới âm thanh',
      layouts: [lay],
      options: plateIds()
        .map((m) => [m, PLATES[m]] as const)
        .map(([m, p]) => ({
          label: p.name,
          swatch: p.color,
          price: Math.round(p.price * SIZE_MULT[lay]),
          item: { layout: lay, material: m },
          hint: p.desc,
        })),
    })
  }
  // mỗi loại stab: bộ TKL + bán lẻ 1 con stab 2u / 6.25u / 7u
  const stabOptions = (t: string) => {
    const st = STABS[t]
    const label = (x: string) => x
    return [
      {
        label: label('Bộ TKL'),
        swatch: st.housing,
        price: st.price,
        item: { type: t, ...STAB_KIT },
        hint: `${st.desc}. ${KIT_DESC}`,
      },
      {
        label: label('Lẻ 2u'),
        swatch: st.housing,
        price: stabSinglePrice(t),
        item: { type: t, short: 1, long: 0, long7: 0 },
        hint: `1 stab ngắn 2u–2.75u. Khác loại với stab đang có thì sẽ thay bộ cũ`,
      },
      {
        label: label('Lẻ 6.25u'),
        swatch: st.housing,
        price: stabLongPrice(t),
        item: { type: t, short: 0, long: 1, long7: 0 },
        hint: `1 stab spacebar dây 6.25u (cả 6u). Khác loại với stab đang có thì sẽ thay bộ cũ`,
      },
      {
        label: label('Lẻ 7u'),
        swatch: st.housing,
        price: stabLongPrice(t),
        item: { type: t, short: 0, long: 0, long7: 1 },
        hint: `1 stab spacebar dây 7u (WKL / 7u). Khác loại với stab đang có thì sẽ thay bộ cũ`,
      },
    ]
  }
  // mỗi loại stab 1 sản phẩm, kiểu gắn (Clip-in / Screw-in / Plate-mount) là nhãn góc ảnh + bộ lọc Shopii
  for (const [t, st] of Object.entries(STABS)) {
    products.push({
      id: `stab-${t}`,
      cat: 'stab',
      name: `Stab ${st.name}`,
      badge: STAB_MOUNTS[st.mount],
      desc: `${st.desc}. ${KIT_DESC}. Có bán lẻ stab 2u / 6.25u / 7u`,
      options: stabOptions(t),
    })
  }
  for (const [t, s] of Object.entries(SWITCHES)) {
    products.push({
      id: `sw-${t}`,
      cat: 'switch',
      name: s.name,
      // loại switch (Linear / Tactile / Clicky / Silent) hiện thành nhãn góc ảnh cho dễ tìm theo yêu cầu khách
      badge: SWITCH_KINDS[s.kind],
      desc: `${s.desc}${s.prelubed ? ' · Lube sẵn' : ''}`,
      sound: { loud: s.loud, pitch: s.pitch },
      options: [10, 70, 90, 110].map((n) => ({
        label: `${n} con`,
        swatch: s.color,
        price: Math.round(((s.price10 * n) / 10) * (n >= 70 ? 0.9 : 1)),
        item: { type: t, count: n },
      })),
    })
  }
  for (const [id, sp] of Object.entries(SUPPLIES)) {
    // feet / dây O-ring: các loại gộp chung 1 sản phẩm (đẩy sau vòng này)
    if (sp.feet || sp.oring) continue
    products.push({
      id: `sup-${id}`,
      // sách phép bán ở mục riêng
      cat: sp.spell ? 'spell' : 'supply',
      name: sp.name,
      desc: sp.desc,
      supply: id,
      options: sp.packs.map(([n, price]) => ({
        label: `${n} ${sp.unit}`,
        swatch: sp.color,
        price,
        item: { id, n },
      })),
    })
  }
  const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
  // vật tư chỉ khác màu / độ cứng gộp chung 1 sản phẩm, option = từng loại (mỗi loại là 1 vật tư riêng trong kho)
  const merged: { id: string; name: string; test: (sp: SupplyDef) => boolean; prefix: string }[] = [
    { id: 'sup-feet', name: 'Feet cao su', test: (sp) => !!sp.feet, prefix: 'Feet cao su ' },
    {
      id: 'sup-oring',
      name: 'Dây O-ring silicon',
      test: (sp) => !!sp.oring,
      prefix: 'Dây O-ring ',
    },
  ]
  for (const m of merged) {
    const list = Object.entries(SUPPLIES).filter(([, sp]) => m.test(sp))
    if (!list.length) continue
    products.push({
      id: m.id,
      cat: 'supply',
      name: m.name,
      desc: list[0][1].desc.replace(/ (Mềm|Độ cứng|Cứng) .*$/, ''),
      supply: list[0][0],
      options: list.flatMap(([id, sp]) =>
        sp.packs.map(([n, price]) => ({
          label: `${capitalize(sp.name.replace(m.prefix, ''))} · ${n} ${sp.unit}`,
          swatch: sp.color,
          price,
          item: { id, n },
          hint: sp.desc,
        })),
      ),
    })
  }
  for (const [kind, levels] of Object.entries(TOOLS) as [ToolKind, ToolDef[]][]) {
    levels.forEach((t, level) => {
      if (t.none || !t.price) return
      products.push({
        id: `tool-${kind}-${level}`,
        // chứng chỉ thợ bán ở mục riêng
        cat: kind === 'cert' ? 'cert' : 'tool',
        name: t.name,
        desc: t.desc ?? '',
        tool: { kind, level },
        options: [
          { label: TOOL_KINDS[kind], swatch: '#5b6273', price: t.price, item: { kind, level } },
        ],
      })
    })
  }
  for (const [k, kit] of Object.entries(KEYCAP_KITS)) {
    if (kit.hidden) continue
    products.push({
      id: `kc-${k}`,
      cat: 'keycap',
      // tên gọn: bỏ chữ "Keycap" và cỡ bộ (Full / Base hiện thành nhãn trên ảnh)
      name: `Keycap ${keycapKitShort(kit.name)}`,
      desc: `Profile ${kit.profile.toUpperCase()}, có 3 chất liệu: PBT / ABS / mix PBT + ABS`,
      layouts: kit.layouts,
      // chất liệu × màu
      options: (
        Object.entries(KEYCAP_MATERIALS) as [KeycapMaterial, (typeof KEYCAP_MATERIALS)['pbt']][]
      ).flatMap(([m, mat]) =>
        Object.entries(KEYCAP_COLORS).map(([c, col]) => ({
          label: `${mat.name} · ${col.name}`,
          swatch: col.hex,
          price: Math.round((kit.price * mat.mult) / 10) * 10,
          item: { kit: k, color: c, material: m },
          hint: `Profile ${kit.profile.toUpperCase()}, ${mat.desc}`,
        })),
      ),
    })
  }
  return products
}

export const CATS: Record<PartCategory, string> = {
  case: 'Case',
  pcb: 'PCB',
  plate: 'Plate',
  stab: 'Stab',
  switch: 'Switch',
  keycap: 'Keycap',
}
export const SHOP_CATS: Record<ShopCategory, string> = {
  ...CATS,
  supply: 'Lube & vật tư',
  tool: 'Dụng cụ',
  cert: 'Chứng chỉ thợ',
  spell: 'Sách phép',
}

export function itemName(cat: ShopCategory, item: unknown): string {
  if (!item) return '—'
  switch (cat) {
    case 'case': {
      const it = item as CaseItem
      return `${CASES[it.id].name} (${CASE_COLORS[it.color].name})`
    }
    case 'supply':
    case 'spell': {
      const it = item as SupplyItem
      return `${SUPPLIES[it.id].name} (${it.n} ${SUPPLIES[it.id].unit})`
    }
    case 'pcb': {
      const it = item as PcbItem
      return `PCB ${LAYOUTS[it.layout].name} ${PCB_TYPES[it.type].name}`
    }
    case 'plate': {
      const it = item as PlateItem
      return isPlateless(it)
        ? `${LAYOUTS[it.layout].name} plateless (không plate)`
        : `Plate ${LAYOUTS[it.layout].name} ${PLATES[it.material].name}`
    }
    case 'stab': {
      const it = item as StabItem
      return `Stab ${STABS[it.type].name} (${stabText(stabStock(it))})`
    }
    case 'tool':
    case 'cert': {
      const it = item as ToolItem
      return TOOLS[it.kind][it.level].name
    }
    case 'switch': {
      const it = item as SwitchItem
      return `${SWITCHES[it.type].name} × ${it.count}`
    }
    case 'keycap': {
      const it = item as KeycapItem
      return `Keycap ${keycapKitShort(KEYCAP_KITS[it.kit].name)} ${KEYCAP_MATERIALS[keycapMaterialOf(it)].name} ${KEYCAP_COLORS[it.color].name}`
    }
  }
}

export interface InventoryCheck {
  cat: PartCategory
  ok: boolean
  msg: string
}

// ---------- số lượng stab ----------
/** 1 bộ stab TKL: 4 stab 2u + 1 dây 6.25u + 1 dây 7u → đủ cho tới TKL (dùng 6.25u thì còn dư dây 7u và ngược lại) */
const STAB_KIT = { short: 4, long: 1, long7: 1 }
const KIT_DESC = 'Bộ TKL gồm 4 stab 2u + 1 stab dây 6.25u + 1 stab dây 7u, đủ cho tới TKL'
/** số stab theo cỡ: 2u (2u–2.75u), dây 6.25u (6u / 6.25u), dây 7u */
export interface StabCount {
  short: number
  long: number
  long7: number
}
export const stabTotal = (c: StabCount) => c.short + c.long + c.long7
export const addStab = (a: StabCount, b: StabCount): StabCount => ({
  short: a.short + b.short,
  long: a.long + b.long,
  long7: a.long7 + b.long7,
})
/** "4× 2u + 1× 6.25u + 1× 7u" (bỏ cỡ = 0) */
export const stabText = (c: StabCount) =>
  [c.short && `${c.short}× 2u`, c.long && `${c.long}× 6.25u`, c.long7 && `${c.long7}× 7u`]
    .filter(Boolean)
    .join(' + ') || '0'
const stabSinglePrice = (t: string) => Math.max(15, Math.round((STABS[t].price * 0.16) / 5) * 5)
/** stab phím dài lẻ (dây dài + 2 housing) ~ gấp đôi stab 2u */
const stabLongPrice = (t: string) => Math.max(30, Math.round((STABS[t].price * 0.3) / 5) * 5)

/** Số stab đang có (bản lưu cũ chưa đếm = 1 bộ tiêu chuẩn; chưa có long7 = bộ cũ kèm cả 2 dây → bằng long) */
export const stabStock = (item: Partial<StabCount> | null): StabCount => {
  if (!item) return { short: 0, long: 0, long7: 0 }
  const long = item.long ?? STAB_KIT.long
  return { short: item.short ?? STAB_KIT.short, long, long7: item.long7 ?? long }
}

/** Số stab layout cần: 2u = phím 2u–2.75u, 6.25u = phím 6u–6.75u, 7u = phím ≥ 7u */
export function stabNeed(keys: { w: number; h: number; stab: boolean }[]): StabCount {
  const lens = keys.filter((k) => k.stab).map((k) => Math.max(k.w, k.h))
  return {
    short: lens.filter((l) => l < 6).length,
    long: lens.filter((l) => l >= 6 && l < 7).length,
    long7: lens.filter((l) => l >= 7).length,
  }
}

function stabCheck(item: StabItem | null, need: StabCount, needStab: boolean): InventoryCheck {
  if (!needStab) return { cat: 'stab', ok: true, msg: 'Layout không cần stab' }
  if (!item) return { cat: 'stab', ok: false, msg: 'Chưa có stab' }
  const have = stabStock(item)
  const lack = [
    have.short < need.short && `${need.short - have.short} stab 2u`,
    have.long < need.long && `${need.long - have.long} stab 6.25u`,
    have.long7 < need.long7 && `${need.long7 - have.long7} stab 7u`,
  ].filter(Boolean)
  return lack.length
    ? { cat: 'stab', ok: false, msg: `Thiếu ${lack.join(' + ')} (mua lẻ ở Shopii)` }
    : { cat: 'stab', ok: true, msg: `OK (${stabText(need)})` }
}

/** Keycap: đủ phím cho layout và đúng profile khách đặt (cả bàn 1 profile) */
function keycapCheck(inv: Inventory, order: Order): InventoryCheck {
  if (!inv.keycap) return { cat: 'keycap', ok: false, msg: 'Chưa có keycap' }
  const kit = KEYCAP_KITS[inv.keycap.kit]
  if (!kit.layouts.includes(order.layout))
    return { cat: 'keycap', ok: false, msg: 'Kit keycap không đủ phím cho layout' }
  const want = order.keycapKit && KEYCAP_KITS[order.keycapKit].profile
  if (want && kit.profile !== want)
    return {
      cat: 'keycap',
      ok: false,
      msg: `Khách muốn profile ${want.toUpperCase()}, đang có ${kit.profile.toUpperCase()}`,
    }
  const mat = keycapMaterialOf(inv.keycap)
  if (order.keycapMaterial && mat !== order.keycapMaterial)
    return {
      cat: 'keycap',
      ok: false,
      msg: `Khách muốn keycap ${KEYCAP_MATERIALS[order.keycapMaterial].name}, đang có ${KEYCAP_MATERIALS[mat].name}`,
    }
  return { cat: 'keycap', ok: true, msg: 'OK' }
}

// Kiểm tra kho đồ có đủ và tương thích để build đơn hiện tại không
/** hàng pass lỗi các loại này không lắp cho khách được (chỉ đăng bán lại); case / PCB / plate lỗi vẫn dùng, bị trừ điểm */
export const FLAW_UNUSABLE: PartCategory[] = ['keycap', 'switch', 'stab']
/** món lỗi không dùng được cho khách */
export const unusable = (cat: PartCategory, item: PartItem | null) =>
  FLAW_UNUSABLE.includes(cat) && !!(item as { flaw?: string } | null)?.flaw

/**
 * Tiền linh kiện tính vào đơn: chỉ món đang nằm trong ô đối chiếu (món bị thay, dụng cụ, vật tư không tính);
 * switch / stab mua dư chỉ tính phần layout cần. Bản lưu cũ (món chưa ghi giá) thì dùng tổng đã chi `spent`
 */
export function partSpent(inv: Inventory, order: Order, spent = 0) {
  const items = Object.entries(inv) as [PartCategory, Paid | null][]
  if (spent && !items.some(([, it]) => it?.paid !== undefined)) return spent
  const { keys } = getLayout(order.layout, order.variant)
  let sum = 0
  for (const [cat, it] of items) {
    if (!it?.paid) continue
    const need = cat === 'switch' ? keys.length : cat === 'stab' ? stabTotal(stabNeed(keys)) : 0
    sum += need && it.paidN ? it.paid * Math.min(1, need / it.paidN) : it.paid
  }
  return Math.round(sum)
}

export function checkInventory(
  inv: Inventory,
  order: Order,
  installedSwitches = 0,
): InventoryCheck[] {
  return checkParts(inv, order, installedSwitches).map((c) =>
    unusable(c.cat, inv[c.cat])
      ? {
          cat: c.cat,
          ok: false,
          msg: `Hàng lỗi (${(inv[c.cat] as { flaw: string }).flaw}): không lắp cho khách được, đăng bán lại ở Hội Phím Cơ`,
        }
      : c,
  )
}

function checkParts(inv: Inventory, order: Order, installedSwitches: number): InventoryCheck[] {
  const lay = LAYOUTS[order.layout]
  const { keys } = getLayout(order.layout, order.variant)
  const needStab = keys.some((k) => k.stab)
  const c = inv.case && CASES[inv.case.id]
  const need = keys.length - installedSwitches
  return [
    {
      cat: 'case',
      // khách đòi đúng case nào thì phải đúng case đó
      // khách đòi kiểu mount (vd O-ring mount) thì case phải làm được mount đó
      ok:
        !!c &&
        caseFits(c, order.layout) &&
        (!order.caseId || inv.case!.id === order.caseId) &&
        (!order.mount || c.mounts.includes(order.mount)),
      msg: !c
        ? 'Chưa có case'
        : !caseFits(c, order.layout)
          ? `Case không vừa layout ${lay.name}`
          : order.caseId && inv.case!.id !== order.caseId
            ? `Khách cần case ${CASES[order.caseId]?.name ?? order.caseId}, đang có ${c.name}`
            : order.mount && !c.mounts.includes(order.mount)
              ? `Khách cần ${MOUNTS[order.mount].name}, case ${c.name} không làm được`
              : 'OK',
    },
    {
      cat: 'pcb',
      // khách đòi PCB hàn / hotswap thì phải mua đúng loại
      ok: inv.pcb?.layout === order.layout && (!order.pcbType || inv.pcb.type === order.pcbType),
      msg: !inv.pcb
        ? 'Chưa có PCB'
        : inv.pcb.layout !== order.layout
          ? `Cần PCB ${lay.name}`
          : order.pcbType && inv.pcb.type !== order.pcbType
            ? `Khách cần PCB ${PCB_TYPES[order.pcbType].name}`
            : 'OK',
    },
    {
      cat: 'plate',
      ok:
        inv.plate?.layout === order.layout &&
        (!order.plateMaterial || inv.plate.material === order.plateMaterial) &&
        !platelessIssue(inv),
      msg: !inv.plate
        ? 'Chưa có plate'
        : inv.plate.layout !== order.layout
          ? `Cần plate ${lay.name}`
          : platelessIssue(inv)
            ? platelessIssue(inv)!
            : order.plateMaterial && inv.plate.material !== order.plateMaterial
              ? `Khách cần plate ${PLATES[order.plateMaterial]?.name ?? order.plateMaterial}, đang có ${PLATES[inv.plate.material].name}`
              : 'OK',
    },
    // khách đòi đúng loại stab thì phải đúng loại đó
    order.stabType && needStab && inv.stab && inv.stab.type !== order.stabType
      ? {
          cat: 'stab',
          ok: false,
          msg: `Khách cần stab ${STABS[order.stabType]?.name ?? order.stabType}, đang có ${STABS[inv.stab.type].name}`,
        }
      : stabCheck(inv.stab, stabNeed(keys), needStab),
    {
      cat: 'switch',
      // khách đòi loại switch nào thì phải đúng loại đó
      ok: (inv.switch?.count ?? 0) >= need && (!inv.switch || switchOk(inv.switch.type, order)),
      msg:
        inv.switch && !switchOk(inv.switch.type, order)
          ? `Khách cần switch ${switchWant(order)}, đang có ${order.switchType ? SWITCHES[inv.switch.type].name : SWITCH_KINDS[switchKindOf(inv.switch.type)]}`
          : `Cần ${need} con, đang có ${inv.switch?.count ?? 0}`,
    },
    keycapCheck(inv, order),
  ]
}

/** Model CAD của case cho đúng layout: nắp HHKB / WKL riêng nếu case có (Exodus60) */
export function caseModelOf(def: CaseDef, layout: LayoutId, variant: { bottom?: string } = {}) {
  if (def.modelFor?.hhkb && (layout === 'hhkb' || layout === 'truehhkb')) return def.modelFor.hhkb
  if (def.modelFor?.wkl && variant.bottom === 'wkl') return def.modelFor.wkl
  return def.model
}

/**
 * Tiến độ 1 con vít tính theo số lần vặn của tua vít tay (vặn đủ = SCREW_FULL); tua vít điện 1 click = đủ luôn.
 * Đổi qua lại 2 loại tua vít giữa chừng không mất tiến độ
 */
export const SCREW_FULL = 3
/** tua vít đang dùng: loại người chơi chọn (không quá loại xịn nhất đã mua), chưa chọn thì dùng loại xịn nhất */
export const screwLevel = (tools: ToolLevels, pick: number | null | undefined) =>
  Math.min(pick ?? tools.screw, tools.screw)

/** Plateless thiếu điều kiện: không plate thì switch chỉ đứng vững khi hàn chết vào PCB, stab gài plate không có chỗ gài */
export function platelessIssue(inv: Pick<Inventory, 'plate' | 'pcb' | 'stab'>): string | null {
  if (!isPlateless(inv.plate)) return null
  if (inv.pcb && inv.pcb.type !== 'solder')
    return 'Plateless phải dùng PCB hàn (hotswap không plate thì switch lỏng lẻo)'
  if (inv.stab && STABS[inv.stab.type]?.mount === 'plate')
    return 'Plateless không gài được stab plate-mount, dùng stab clip / screw-in'
  return null
}

/** Case có hợp layout không (cùng cỡ, hoặc cỡ layout cho phép với case không có model CAD,
 * vd case 40% vừa Planck) + layout case cho phép */
export function caseFits(def: CaseDef, layout: LayoutId) {
  const lay = LAYOUTS[layout]
  const ff = def.ff === lay.ff || (!def.model && !!lay.fits?.includes(def.ff))
  return ff && (!def.layouts || def.layouts.includes(layout))
}
