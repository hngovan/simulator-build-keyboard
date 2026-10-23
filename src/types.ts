// Kiểu dữ liệu dùng chung cho toàn game

export type LayoutId = '40' | '60' | 'hhkb' | 'truehhkb' | 'tkl' | 'full'
export type FormFactor = '40' | '60' | 'tkl' | 'full'
export type VariantKey = 'backspace' | 'bottom' | 'rshift' | 'space'
export type Variant = Partial<Record<VariantKey, string>>

export interface Key {
  id: string
  label: string
  w: number
  h: number
  code: string | null
  x: number
  y: number
  /** toạ độ tâm phím quanh gốc 0 (đơn vị u) */
  cx: number
  cz: number
  /** phím ≥ 2u cần stab */
  stab: boolean
}

export interface LayoutGeometry {
  keys: Key[]
  width: number
  depth: number
}

export interface SoundProfile {
  loud: number
  pitch: number
  kind: SwitchKind
}

/** Tuỳ chọn âm thanh của người chơi, lưu cùng tiến trình. */
export interface AudioSettings {
  muted: boolean
  musicVolume: number
  effectsVolume: number
}

export type SwitchKind = 'Linear' | 'Tactile' | 'Clicky' | 'Silent'
export type PartCategory = 'case' | 'pcb' | 'plate' | 'stab' | 'switch' | 'keycap'
export type ShopCategory = PartCategory | 'supply' | 'tool'
export type ToolKind = 'switch' | 'keycap' | 'screw' | 'solder' | 'clipper' | 'brush' | 'opener'
export type ToolLevels = Record<ToolKind, number>

// ---------- món đồ trong kho ----------
export interface CaseItem {
  id: string
  color: string
}
export interface PcbItem {
  layout: LayoutId
  type: string
}
export interface PlateItem {
  layout: LayoutId
  material: string
}
export interface StabItem {
  type: string
}
export interface SwitchItem {
  type: string
  count: number
}
export interface KeycapItem {
  kit: string
  color: string
}
export interface SupplyItem {
  id: string
  n: number
}
export interface ToolItem {
  kind: ToolKind
  level: number
}

export interface Inventory {
  case: CaseItem | null
  pcb: PcbItem | null
  plate: PlateItem | null
  stab: StabItem | null
  switch: SwitchItem | null
  keycap: KeycapItem | null
}
export type PartItem = NonNullable<Inventory[PartCategory]>

// ---------- shop ----------
export interface ProductOption {
  label: string
  swatch: string
  price: number
  item: PartItem | SupplyItem | ToolItem
  hint?: string
}
export interface Product {
  id: string
  cat: ShopCategory
  name: string
  desc: string
  layouts?: LayoutId[]
  sound?: { loud: number; pitch: number }
  supply?: string
  tool?: ToolItem
  options: ProductOption[]
}
export interface GroupPost {
  id: string
  seller: string
  caption: string
  product: Product
  opt: ProductOption
  price: number
  likes: number
  sold: boolean
}

// ---------- đơn hàng ----------
export type SoundWish = 'silent' | 'thock' | 'clack' | 'noisy'
/** khách muốn lube switch / không được lube (giữ tiếng gốc) / sao cũng được */
export type LubePref = 'want' | 'none' | 'any'
export interface Kit {
  packaging: string
  case: CaseItem
  pcb: PcbItem
  plate: PlateItem
  stab: StabItem | null
}
export interface Order {
  customer: string
  avatar: string
  layout: LayoutId
  variant: Variant
  wish: SoundWish
  keycapColor: string
  type: 'kit' | 'full'
  kit: Kit | null
  caseColor: string | null
  mount: string | null
  lubePref: LubePref
  budget: number
  labor: number
  lines: string[]
}

// ---------- build ----------
export type StepId =
  | 'unbox'
  | 'caseOpen'
  | 'stabMod'
  | 'stab'
  | 'stabScrew'
  | 'plate'
  | 'switchLube'
  | 'switch'
  | 'solder'
  | 'gasket'
  | 'ring'
  | 'caseIn'
  | 'trayScrew'
  | 'caseClose'
  | 'caseScrew'
  | 'keycap'
  | 'test'
export type ScrewStep = 'caseOpen' | 'stabScrew' | 'trayScrew' | 'caseScrew'

export interface StabMods {
  clip: boolean
  bandaid: boolean
  /** id lube đã dùng cho housing + slider */
  housing: string | null
  /** id lube đã dùng cho dây stab */
  wire: string | null
  /** đã lắp slider vào housing */
  assembled: boolean
  /** đã tra dây vào slider + ngàm housing */
  wired: boolean
}

export interface BuildState {
  stepIdx: number
  unboxed: boolean
  screws: Record<string, number>
  stabs: Record<string, true>
  plate: boolean
  switches: Record<string, true>
  solder: Record<string, true>
  gaskets: Record<number, true>
  ring: boolean
  inCase: boolean
  closed: boolean
  keycaps: Record<string, true>
  tested: Record<string, true>
  stabMods: StabMods
  stabModDone: boolean
  lubed: number
  lubeType: string | null
  /** lube dùng cho lò xo (vd GPL 105) */
  springLube: string | null
  lubeDone: boolean
}

export interface Point {
  id?: string
  x: number
  z: number
}
export interface ScrewPoint extends Point {
  id: string
}

export interface BuildContext {
  keys: Key[]
  width: number
  depth: number
  caseDef: CaseDef
  stabKeys: Key[]
  /** kiểu lắp stab: clip / screw / plate */
  stabType: 'clip' | 'screw' | 'plate' | undefined
  /** id mẫu stab (STABS) */
  stabModel: string | undefined
  mount: string
  steps: StepId[]
  screws: Record<ScrewStep, ScrewPoint[]>
  gaskets: Point[]
  screwSide: 'top' | 'bottom'
  pcbType: string
}

// ---------- định nghĩa linh kiện ----------
export interface CaseDef {
  name: string
  ff: FormFactor
  pieces: 1 | 2
  screwSide?: 'top' | 'bottom'
  material: string
  mounts: string[]
  price: number
  colors: string[]
  desc: string
}

export interface ScoreCheck {
  label: string
  pts: number
  got: number
}
export interface DeliveryResult {
  checks: ScoreCheck[]
  score: number
  stars: number
  reimburse: number
  labor: number
}

export interface Toast {
  id: number
  text: string
  kind: 'info' | 'good' | 'bad'
}
