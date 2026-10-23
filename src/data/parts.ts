import { LAYOUTS, getLayout } from './layouts'
import { SUPPLIES } from './supplies'
import type {
  BuildState,
  CaseDef,
  CaseItem,
  Inventory,
  KeycapItem,
  LayoutId,
  Order,
  PartCategory,
  PcbItem,
  PlateItem,
  Product,
  ShopCategory,
  SoundProfile,
  SoundWish,
  StabItem,
  SupplyItem,
  SwitchItem,
  SwitchKind,
  ToolItem,
  ToolKind,
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
  hmxWhite: {
    name: 'HMX Linear Trắng',
    brand: 'HMX',
    kind: 'Linear',
    feel: 'linear',
    prelubed: true,
    color: '#f0f0f0',
    loud: 0.6,
    pitch: 0.8,
    price10: 60,
    desc: 'Tiếng "clack" giòn, cao. Đã lube sẵn',
  },
  wingtreeSmoke: {
    name: 'Wingtree Linear Khói',
    brand: 'Wingtree',
    kind: 'Linear',
    feel: 'linear',
    prelubed: true,
    color: '#3a3a44',
    loud: 0.55,
    pitch: 0.2,
    price10: 85,
    desc: 'Housing dày, "thock" trầm. Đã lube sẵn',
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
  silentTactile: {
    name: 'Silent Tactile Tím',
    brand: 'Khác',
    kind: 'Silent',
    feel: 'tactile',
    prelubed: false,
    color: '#9c6ade',
    loud: 0.12,
    pitch: 0.35,
    price10: 95,
    desc: 'Khấc nhẹ, không tiếng, chưa lube',
  },
}

export const PLATES: Record<string, PlateDef> = {
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
    desc: 'Vòng silicon ôm quanh board + gasket mid đệm dưới, không vít',
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
  smoke: { name: 'Khói', hex: '#4a4f5a' },
  frost: { name: 'Mờ sữa', hex: '#eef2f5' },
  walnut: { name: 'Gỗ óc chó', hex: '#5b3a24' },
  oak: { name: 'Gỗ sồi', hex: '#b88a55' },
}

// Chất liệu case: ảnh hưởng hình ảnh (Bench) và âm thanh
export const CASE_MATERIALS: Record<string, SoundMod> = {
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
    colors: ['black', 'silver', 'pink'],
    desc: 'Nhôm CNC anod 1 mảnh',
  },
  plastic60: {
    name: 'Case 60% nhựa',
    ff: '60',
    pieces: 1,
    material: 'abs',
    mounts: ['tray'],
    price: 300,
    colors: ['black', 'white'],
    desc: 'Nhựa ABS, giá rẻ',
  },
  wood60: {
    name: 'Case 60% gỗ',
    ff: '60',
    pieces: 1,
    material: 'wood',
    mounts: ['tray'],
    price: 900,
    colors: ['walnut', 'oak'],
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
    colors: ['silver', 'navy', 'black'],
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
    colors: ['frost', 'smoke'],
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
    colors: ['clear', 'smoke'],
    desc: 'Các lớp mica stack, bắt vít từ trên xuống',
  },
  plastic40: {
    name: 'Case 40% nhựa',
    ff: '40',
    pieces: 1,
    material: 'abs',
    mounts: ['tray'],
    price: 280,
    colors: ['white', 'pink'],
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
    colors: ['silver', 'black', 'navy'],
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
    colors: ['clear', 'smoke'],
    desc: 'Mica stack, bắt vít từ trên xuống',
  },
  tklTray: {
    name: 'Case TKL nhựa',
    ff: 'tkl',
    pieces: 1,
    material: 'abs',
    mounts: ['tray'],
    price: 550,
    colors: ['black', 'white'],
    desc: 'Phổ thông',
  },
  tklGasket: {
    name: 'Case TKL nhôm 2 mảnh',
    ff: 'tkl',
    pieces: 2,
    screwSide: 'bottom',
    material: 'anod',
    mounts: ['gasket', 'top'],
    price: 2700,
    colors: ['silver', 'navy'],
    desc: 'Nhôm anod, vít ở đáy',
  },
  tklAcrylic: {
    name: 'Case TKL acrylic 2 mảnh',
    ff: 'tkl',
    pieces: 2,
    screwSide: 'bottom',
    material: 'acrylic',
    mounts: ['gasket', 'top'],
    price: 1500,
    colors: ['clear'],
    desc: 'Acrylic trong suốt, nhìn thấy mạch',
  },
  fullTray: {
    name: 'Case Full nhựa',
    ff: 'full',
    pieces: 1,
    material: 'abs',
    mounts: ['tray'],
    price: 650,
    colors: ['black', 'white'],
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
    colors: ['silver', 'black'],
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
    colors: ['clear', 'smoke'],
    desc: 'Mica stack, bắt vít từ trên xuống',
  },
}

export const PCB_TYPES: Record<string, Named> = {
  hotswap: { name: 'Hotswap', price: 450, desc: 'Cắm switch vào socket, không cần hàn' },
  solder: { name: 'Hàn (solder)', price: 280, desc: 'Phải hàn từng switch' },
}

// Thông số Staebies / TX theo các review (Staebies screw-in, TX clip-in, cả hai khít, chân stem đã clip sẵn).
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
    stem: '#f2f2f2',
    desc: 'Stab cổ điển: phải clip chân, dán Urgo, lube housing + dây mới êm',
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
    stem: '#f2f2f2',
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
    stem: '#f2f2f2',
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
    desc: 'Screw-in, chân đã clip sẵn, khít: chỉ cần lube housing/slider + dây',
  },
  txAP: {
    name: 'TX AP',
    brand: 'TX',
    mount: 'clip',
    price: 450,
    feet: false,
    tight: true,
    prelubed: false,
    housing: '#3a3a3a',
    stem: '#d9cfb8',
    desc: 'Clip-in nhưng rất chắc, khít: lube nhẹ housing + dây là đủ',
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
    desc: 'Screw-in, cần lube housing + dây (thông số tạm tính)',
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
    desc: 'Screw-in, đã lube sẵn housing, chỉ cần lube dây (thông số tạm tính)',
  },
}

export const KEYCAP_COLORS: Record<string, KeycapColor> = {
  white: { name: 'Trắng', hex: '#f2efe8', legend: '#333' },
  black: { name: 'Đen', hex: '#2a2a2e', legend: '#ddd' },
  pink: { name: 'Hồng', hex: '#f4b6c8', legend: '#5a2a3a' },
  navy: { name: 'Xanh navy', hex: '#2c3e6b', legend: '#f2d16b' },
  mint: { name: 'Bạc hà', hex: '#a8e0cf', legend: '#24584a' },
}

export const KEYCAP_KITS: Record<string, { name: string; price: number; layouts: LayoutId[] }> = {
  base: { name: 'Kit Base (40/60/HHKB)', price: 400, layouts: ['40', '60', 'hhkb', 'truehhkb'] },
  full: { name: 'Kit Full (mọi layout)', price: 650, layouts: Object.keys(LAYOUTS) as LayoutId[] },
}

export const SIZE_MULT: Record<LayoutId, number> = {
  '40': 0.8,
  '60': 1,
  hhkb: 1,
  truehhkb: 1,
  tkl: 1.4,
  full: 1.7,
}

export const TOOLS: Record<ToolKind, ToolDef[]> = {
  switch: [
    { name: 'Tay không', n: 1, price: 0, desc: 'Lắp từng switch một' },
    { name: 'Jig lắp switch x5', n: 5, price: 300, desc: 'Lắp 5 switch liền nhau 1 lần' },
    { name: 'Bàn ép switch cả hàng', n: 99, price: 900, desc: 'Ép cả hàng 1 lần' },
  ],
  keycap: [
    { name: 'Tay không', n: 1, price: 0, desc: 'Lắp từng keycap' },
    { name: 'Khay keycap x5', n: 5, price: 200, desc: 'Lắp 5 keycap 1 lần' },
    { name: 'Bàn ép keycap cả hàng', n: 99, price: 700, desc: 'Ép cả hàng 1 lần' },
  ],
  screw: [
    { name: 'Tua vít thường', clicks: 3, price: 0, desc: '3 lần click mỗi con vít' },
    { name: 'Tua vít điện', clicks: 1, price: 350, desc: '1 click là xong' },
  ],
  solder: [
    {
      name: 'Mỏ hàn 60W',
      hold: 0.9,
      price: 0,
      desc: 'Chỉ dùng cho PCB hàn. Giữ 0.9 giây mỗi chân',
    },
    {
      name: 'Trạm hàn nhiệt',
      hold: 0.3,
      price: 600,
      desc: 'Chỉ dùng cho PCB hàn. Giữ 0.3 giây mỗi chân',
    },
  ],
  clipper: [
    { name: 'Chưa có kìm cắt', none: true, price: 0 },
    { name: 'Kìm cắt chân stab', price: 120, desc: 'Clip chân stem stab cho bớt lạch cạch' },
  ],
  brush: [
    { name: 'Chưa có cọ lube', none: true, quality: 0, price: 0 },
    { name: 'Cọ lube size 0', quality: 0.85, price: 40, desc: 'Cọ cơ bản, dễ quét dày tay' },
    {
      name: 'Bộ cọ 3 size (00, 0, dẹt)',
      quality: 1,
      price: 150,
      desc: 'Quét mỏng đều: lube chuẩn, tránh over-lube',
    },
  ],
  opener: [
    { name: 'Chưa có đồ mở switch', none: true, n: 0, price: 0 },
    { name: 'Đồ mở switch + cọ', n: 10, price: 150, desc: 'Mở & lube 10 switch mỗi mẻ' },
    { name: 'Bàn mở switch 25 ô', n: 25, price: 450, desc: 'Mở & lube 25 switch mỗi mẻ' },
  ],
}
export const TOOL_KINDS: Record<ToolKind, string> = {
  switch: 'Lắp switch',
  keycap: 'Lắp keycap',
  screw: 'Tua vít',
  solder: 'Hàn (PCB solder)',
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
    name: 'Ồn ào, lách cách',
    target: [0.95, 0.85],
    msg: 'Gõ phải kêu lách cách thật to cho đã tai',
  },
}

const clamp = (v: number) => Math.max(0, Math.min(1, v))

// lubeFrac: tỉ lệ switch đã lube (0..1)
export function soundProfile(
  switchType: string,
  plate: string,
  mount: string | null,
  {
    caseId,
    lubeFrac = 0,
    lubeType,
  }: { caseId?: string; lubeFrac?: number; lubeType?: string | null } = {},
): SoundProfile {
  const sw = SWITCHES[switchType]
  const zero = { dl: 0, dp: 0 }
  const p = PLATES[plate] ?? zero
  const m = (mount && MOUNTS[mount]) || zero
  const c = (caseId && CASE_MATERIALS[CASES[caseId].material]) || zero
  let loud = sw.loud + p.dl + m.dl + c.dl
  let pitch = sw.pitch + p.dp + m.dp + c.dp
  // mỡ càng đặc (độ hợp switch thấp, vd BDZ / Permatex) thì tiếng càng nhũn, bị trì
  const thick =
    lubeType &&
    SUPPLIES[lubeType].fit?.linear !== undefined &&
    SUPPLIES[lubeType].fit!.linear! < 0.5
      ? 2
      : 1
  if (sw.feel === 'clicky') loud -= 0.2 * lubeFrac
  else ((loud -= 0.06 * lubeFrac * thick), (pitch -= 0.06 * lubeFrac * thick))
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
    if (d < bestD) ((bestD = d), (best = id))
  }
  return SOUND_WISH[best].name
}

export const keycapKitFor = (layout: LayoutId) =>
  KEYCAP_KITS.base.layouts.includes(layout) ? 'base' : 'full'

// Danh mục sản phẩm cho các shop. Mỗi sản phẩm có nhiều option (màu / chất liệu / loại / số lượng)
export function buildCatalog(): Product[] {
  const products: Product[] = []
  for (const [id, c] of Object.entries(CASES)) {
    products.push({
      id: `case-${id}`,
      cat: 'case',
      name: c.name,
      desc: `${CASE_MATERIALS[c.material].name} · ${c.pieces === 2 ? '2 mảnh' : '1 mảnh'}. ${c.desc}. Mount: ${c.mounts.map((m) => MOUNTS[m].name).join(', ')}`,
      layouts: (Object.keys(LAYOUTS) as LayoutId[]).filter((l) => LAYOUTS[l].ff === c.ff),
      options: c.colors.map((col) => ({
        label: CASE_COLORS[col].name,
        swatch: CASE_COLORS[col].hex,
        price: c.price,
        item: { id, color: col },
      })),
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
      options: Object.entries(PLATES).map(([m, p]) => ({
        label: p.name,
        swatch: p.color,
        price: Math.round(p.price * SIZE_MULT[lay]),
        item: { layout: lay, material: m },
        hint: p.desc,
      })),
    })
  }
  products.push({
    id: 'stab-cherry',
    cat: 'stab',
    name: 'Stab Cherry (bộ đủ layout)',
    desc: 'Stab cổ điển, giá rẻ nhưng phải mod nhiều',
    options: ['cherryClip', 'cherryScrew', 'cherryPlate'].map((t) => ({
      label: STABS[t].name,
      swatch: STABS[t].housing,
      price: STABS[t].price,
      item: { type: t },
      hint: STABS[t].desc,
    })),
  })
  for (const [t, st] of Object.entries(STABS).filter(([, st]) => st.brand !== 'Cherry')) {
    products.push({
      id: `stab-${t}`,
      cat: 'stab',
      name: `Stab ${st.name}`,
      desc: st.desc,
      options: [
        {
          label: `${st.mount === 'screw' ? 'Screw-in' : st.mount === 'clip' ? 'Clip-in' : 'Plate-mount'}`,
          swatch: st.housing,
          price: st.price,
          item: { type: t },
        },
      ],
    })
  }
  for (const [t, s] of Object.entries(SWITCHES)) {
    products.push({
      id: `sw-${t}`,
      cat: 'switch',
      name: `Switch ${s.name}`,
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
    products.push({
      id: `sup-${id}`,
      cat: 'supply',
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
  for (const [kind, levels] of Object.entries(TOOLS) as [ToolKind, ToolDef[]][]) {
    levels.forEach((t, level) => {
      if (t.none || !t.price) return
      products.push({
        id: `tool-${kind}-${level}`,
        cat: 'tool',
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
    products.push({
      id: `kc-${k}`,
      cat: 'keycap',
      name: `Keycap PBT ${kit.name}`,
      desc: 'Profile Cherry, in dye-sub',
      layouts: kit.layouts,
      options: Object.entries(KEYCAP_COLORS).map(([c, col]) => ({
        label: col.name,
        swatch: col.hex,
        price: kit.price,
        item: { kit: k, color: c },
      })),
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
}

export function itemName(cat: ShopCategory, item: unknown): string {
  if (!item) return '—'
  switch (cat) {
    case 'case': {
      const it = item as CaseItem
      return `${CASES[it.id].name} (${CASE_COLORS[it.color].name})`
    }
    case 'supply': {
      const it = item as SupplyItem
      return `${SUPPLIES[it.id].name} (${it.n} ${SUPPLIES[it.id].unit})`
    }
    case 'pcb': {
      const it = item as PcbItem
      return `PCB ${LAYOUTS[it.layout].name} ${PCB_TYPES[it.type].name}`
    }
    case 'plate': {
      const it = item as PlateItem
      return `Plate ${LAYOUTS[it.layout].name} ${PLATES[it.material].name}`
    }
    case 'stab':
      return `Stab ${STABS[(item as StabItem).type].name}`
    case 'tool': {
      const it = item as ToolItem
      return TOOLS[it.kind][it.level].name
    }
    case 'switch': {
      const it = item as SwitchItem
      return `${SWITCHES[it.type].name} × ${it.count}`
    }
    case 'keycap': {
      const it = item as KeycapItem
      return `Keycap ${KEYCAP_KITS[it.kit].name} ${KEYCAP_COLORS[it.color].name}`
    }
  }
}

export interface InventoryCheck {
  cat: PartCategory
  ok: boolean
  msg: string
}

// Kiểm tra kho đồ có đủ và tương thích để build đơn hiện tại không
export function checkInventory(
  inv: Inventory,
  order: Order,
  installedSwitches = 0,
): InventoryCheck[] {
  const lay = LAYOUTS[order.layout]
  const { keys } = getLayout(order.layout, order.variant)
  const needStab = keys.some((k) => k.stab)
  const c = inv.case && CASES[inv.case.id]
  const need = keys.length - installedSwitches
  return [
    {
      cat: 'case',
      ok: !!c && c.ff === lay.ff,
      msg: !c ? 'Chưa có case' : c.ff !== lay.ff ? `Case không vừa layout ${lay.name}` : 'OK',
    },
    {
      cat: 'pcb',
      ok: inv.pcb?.layout === order.layout,
      msg: !inv.pcb
        ? 'Chưa có PCB'
        : inv.pcb.layout !== order.layout
          ? `Cần PCB ${lay.name}`
          : 'OK',
    },
    {
      cat: 'plate',
      ok: inv.plate?.layout === order.layout,
      msg: !inv.plate
        ? 'Chưa có plate'
        : inv.plate.layout !== order.layout
          ? `Cần plate ${lay.name}`
          : 'OK',
    },
    {
      cat: 'stab',
      ok: !needStab || !!inv.stab,
      msg: !needStab ? 'Layout không cần stab' : inv.stab ? 'OK' : 'Chưa có stab',
    },
    {
      cat: 'switch',
      ok: (inv.switch?.count ?? 0) >= need,
      msg: `Cần ${need} con, đang có ${inv.switch?.count ?? 0}`,
    },
    {
      cat: 'keycap',
      ok: !!inv.keycap && KEYCAP_KITS[inv.keycap.kit].layouts.includes(order.layout),
      msg: !inv.keycap
        ? 'Chưa có keycap'
        : KEYCAP_KITS[inv.keycap.kit].layouts.includes(order.layout)
          ? 'OK'
          : 'Kit keycap không đủ phím cho layout',
    },
  ]
}
