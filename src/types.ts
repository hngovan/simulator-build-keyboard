// Kiểu dữ liệu dùng chung cho toàn game

export type LayoutId =
  '40' | '60' | 'hhkb' | 'truehhkb' | '65' | '75' | 'frl' | 'tkl' | 'full' | 'planck' | 'alice'
export type FormFactor = '40' | '60' | '65' | '75' | 'frl' | 'tkl' | 'full' | 'planck' | 'alice'
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
  /** góc xoay quanh trục đứng (rad, dương = ngược chiều kim đồng hồ nhìn từ trên), layout Alice */
  rot: number
  /** phím ≥ 2u cần stab */
  stab: boolean
  /** hàng tính cho keycap điêu khắc: 0 = hàng số / F … 3 = hàng Shift, 4 = hàng dưới cùng (đếm từ dưới lên) */
  row: number
}

export interface LayoutGeometry {
  keys: Key[]
  width: number
  depth: number
  /** tâm khung phím trong hệ gốc của layout (u); layout toạ độ thật (Alice) ≠ 0 → case CAD dời ngược lại */
  origin: [number, number]
  /** đường viền PCB thật [x, z] (u, quanh gốc), không có = hình chữ nhật / bao lồi theo phím */
  outline?: [number, number][]
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

/** Đầu tua vít (tua vít thay đầu được) */
export type ScrewBit = 'phillips' | 'hex' | 'torx' | 'flat'

export type SwitchKind = 'Linear' | 'Tactile' | 'Clicky' | 'Silent' | 'SilentTactile'
export type PartCategory = 'case' | 'pcb' | 'plate' | 'stab' | 'switch' | 'keycap'
export type ShopCategory = PartCategory | 'supply' | 'tool' | 'cert' | 'spell'
export type ToolKind =
  | 'switch'
  | 'keycap'
  | 'screw'
  | 'solder'
  | 'desolder'
  | 'spoolHolder'
  | 'screwTray'
  | 'tipCleaner'
  | 'cert'
  | 'clipper'
  | 'brush'
  | 'opener'
export type ToolLevels = Record<ToolKind, number>

// ---------- món đồ trong kho ----------
/** giá shop đã trả cho món (mua ở Shopii / chợ); không có = khách gửi / lấy kho chung */
export interface Paid {
  paid?: number
  /** switch / stab: số con đã trả tiền (mua dư thì chỉ tính phần layout cần) */
  paidN?: number
}
export interface CaseItem extends Paid {
  id: string
  color: string
  /** hàng pass ở Hội Phím Cơ có lỗi thật (trầy, bóng, stab tick...): bị trừ điểm khi giao */
  flaw?: string
}
export interface PcbItem extends Paid {
  layout: LayoutId
  type: string
  /** hàng pass ở Hội Phím Cơ có lỗi thật (trầy, bóng, stab tick...): bị trừ điểm khi giao */
  flaw?: string
}
export interface PlateItem extends Paid {
  layout: LayoutId
  material: string
  /** hàng pass ở Hội Phím Cơ có lỗi thật (trầy, bóng, stab tick...): bị trừ điểm khi giao */
  flaw?: string
}
export interface StabItem extends Paid {
  type: string
  /** số stab ngắn (2u–2.75u) đang có; bản lưu cũ không có = 1 bộ tiêu chuẩn */
  short?: number
  /** số stab phím dài dây 6.25u (spacebar 6u / 6.25u) */
  long?: number
  /** số stab dây 7u (spacebar 7u, WKL); bản lưu cũ không có = bằng long (bộ cũ kèm cả 2 dây) */
  long7?: number
  /** hàng pass ở Hội Phím Cơ có lỗi thật (trầy, bóng, stab tick...): bị trừ điểm khi giao */
  flaw?: string
}
export interface SwitchItem extends Paid {
  type: string
  count: number
  /** hàng pass lỗi: không lắp cho khách được, chỉ đăng bán lại */
  flaw?: string
}
/** chất liệu keycap: PBT / ABS / mix PBT + ABS */
export type KeycapMaterial = 'pbt' | 'abs' | 'mix'
export interface KeycapItem extends Paid {
  kit: string
  color: string
  /** bản lưu cũ không có = PBT */
  material?: KeycapMaterial
  /** hàng pass ở Hội Phím Cơ có lỗi thật (trầy, bóng, stab tick...): bị trừ điểm khi giao */
  flaw?: string
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
/** Đồ dư sau khi giao đơn (switch thừa, stab thừa), giữ lại dùng cho đơn sau */
export interface Spare {
  /** loại switch → số con */
  switches: Record<string, number>
  /** tiền đã trả cho switch đang nằm kho chung (mua dư cho đơn đang làm): lấy ra đơn thì tính lại vào "Đã chi" */
  switchPaid?: Record<string, { paid: number; n: number }>
  /** loại stab → số stab ngắn / dài */
  stabs: Record<string, import('./data/parts').StabCount>
  /** case / PCB / plate / keycap (và stab lỗi): từng món riêng */
  items: { cat: PartCategory; item: PartItem }[]
}

// ---------- kiện hàng Shopii (đặt rồi chờ giao tới cửa) ----------
/** 1 món trong kiện; `price` = tiền đã trả (đã tính phí giao) */
export type ParcelItem =
  | { kind: 'part'; cat: PartCategory; item: PartItem; price: number }
  | { kind: 'supply'; id: string; n: number; price: number }
  | { kind: 'tool'; tool: ToolKind; level: number; price: number }
export interface Parcel {
  id: string
  /** ngày đặt */
  ordered: number
  /** ngày tới cửa (≤ hôm nay = đang chờ ở cửa) */
  arrive: number
  speed: import('./data/shipping').ShipSpeed
  /** tên ngắn in trên nhãn thùng */
  label: string
  items: ParcelItem[]
  /** id đơn đang làm lúc đặt (linh kiện) */
  job?: string
}

// ---------- shop ----------
export interface ProductOption {
  label: string
  swatch: string
  price: number
  /** giá gốc trước khi sale (Shopii ngày sale, `data/sale.ts`) */
  was?: number
  item: PartItem | SupplyItem | ToolItem
  hint?: string
  /** nhóm option cấp 1 (vd chất liệu case); thẻ sản phẩm chọn nhóm trước rồi mới chọn option (màu) */
  group?: string
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
  /** nhãn nhỏ góc dưới trái ảnh sản phẩm (vd loại switch Linear / Tactile) */
  badge?: string
  /** % giảm giá hôm nay (ngày sale Shopii) */
  sale?: number
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
  /** sự thật ẩn (bản lưu cũ không có): tình trạng thật, người bán liêm không, có bùng không */
  cond?: import('./data/market').Cond
  honest?: boolean
  scammer?: boolean
  /** kiểu giá: price no offer / lowball thoải mái / bình thường; fs = freeship */
  tag?: import('./data/market').PriceTag
  fs?: boolean
  /** người bán ghi "nhanh gọn cho người câm điếc": hỏi han nhiều dễ bị block */
  mute?: boolean
  /** inbox với người bán: giá đang thương lượng, phí ship, log chat, hành động đã dùng */
  deal?: {
    price: number
    ship: number
    log: import('./data/market').ChatLine[]
    used: import('./data/market').InboxAction[]
    blocked?: boolean
    revealed?: boolean
    varChecked?: boolean
    /** người bán cho free (đi ăn xin thành công): giá 0, không chặn sàn */
    gift?: boolean
    /** đi ăn xin bị admin ban khỏi chợ */
    ban?: boolean
  }
}

// ---------- đơn hàng ----------
export type SoundWish = 'silent' | 'thock' | 'clack' | 'noisy'
/** khách muốn lube switch / không được lube (giữ tiếng gốc) / sao cũng được */
export type LubePref = 'want' | 'none' | 'any'
/** Đồ khách gửi kèm đơn: món nào không có thì shop tự mua (khách gửi ít nhất 1 món) */
export interface Kit {
  packaging: string
  case?: CaseItem
  pcb?: PcbItem
  plate?: PlateItem
  stab: StabItem | null
}
export interface Order {
  /** mã đơn (nhiều đơn cùng lúc) */
  id: string
  /** số ngày khách cho để làm, tính từ lúc nhận */
  days: number
  /** ngày phải giao (đặt khi nhận đơn) */
  dueDay?: number
  /** đơn build thử (chỉ khi dev): bỏ qua bước nào cũng được, giao thì dọn bàn, không chấm điểm */
  dev?: true
  /** khách huỷ kèo giữa chừng: 'sold' = phát hiện shop đem đồ khách gửi đi bán ở chợ (đơn còn hiện tới hết ngày) */
  cancel?: 'sold'
  /** đơn kit theo thiết kế bàn phím mở (Bakeneko 60, Planck...) */
  featured?: string
  customer: string
  avatar: string
  layout: LayoutId
  variant: Variant
  wish: SoundWish
  keycapColor: string
  /** chất liệu keycap khách đòi (không có = shop tự chọn) */
  keycapMaterial?: KeycapMaterial
  /** bộ keycap khách muốn (quyết định profile cho cả bàn phím); bản lưu cũ không có */
  keycapKit?: string
  type: 'kit' | 'full'
  kit: Kit | null
  caseColor: string | null
  mount: string | null
  lubePref: LubePref
  /** loại switch khách đòi; không có = shop tự chọn (bản lưu cũ) */
  switchKind?: SwitchKind
  /** khách đòi đúng 1 con switch (id trong SWITCHES, vd cherryBlack); không có = loại nào trong `switchKind` cũng được */
  switchType?: string
  /** đơn mua từ A → Z: khách đòi đúng loại PCB (hàn / hotswap); không có = shop tự chọn */
  pcbType?: 'hotswap' | 'solder'
  /** khách đòi đúng 1 case (id trong CASES) / 1 loại stab (STABS) / 1 chất liệu plate (PLATES); chỉ với món khách không gửi */
  caseId?: string
  stabType?: string
  plateMaterial?: string
  /** khách đòi O-ring mount với đúng độ cứng dây O-ring (id vật tư ORING_IDS) */
  oring?: string
  /** khách muốn lót foam Poron PCB: bước `foam` thành bắt buộc (không có = tuỳ shop, bỏ qua được) */
  foam?: true
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
  /** lót foam Poron giữa PCB và plate (tuỳ chọn) */
  | 'foam'
  | 'plate'
  | 'switchLube'
  | 'switch'
  | 'solder'
  | 'gasket'
  | 'ring'
  /** dán 4 feet cao su vào hốc CNC dưới đáy case (trước khi lắp board vào case) */
  | 'feet'
  /** top mount: úp case trên lên plate rồi vặn vít plate vào case trên */
  | 'topCase'
  | 'topScrew'
  | 'caseIn'
  | 'trayScrew'
  | 'caseClose'
  | 'caseScrew'
  | 'keycap'
  | 'test'
export type ScrewStep = 'caseOpen' | 'stabScrew' | 'topScrew' | 'trayScrew' | 'caseScrew'

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

export interface SolderJoint {
  wire: string
  /** giữ mỏ hàn quá lâu: chân hàn cháy xém, mối hàn xấu */
  burnt: boolean
}

export interface BuildState {
  stepIdx: number
  unboxed: boolean
  screws: Record<string, number>
  stabs: Record<string, true>
  plate: boolean
  /** đã lót foam PCB (bước tuỳ chọn `foam`); bản lưu cũ không có */
  foam?: boolean
  switches: Record<string, true>
  /** mối hàn từng phím: loại thiếc + đạt / cháy xém (bản lưu cũ: true = đạt, thiếc thường) */
  solder: Record<string, SolderJoint | true>
  /** Number of too-early attempts on each pin; the fourth burns the joint. */
  solderFailures?: Record<string, number>
  /** mũi hàn đen do vừa hàn cháy: phải lau vào bùi nhùi mới hàn tiếp được */
  tipDirty?: boolean
  gaskets: Record<number, true>
  /** đã cuốn vòng O-ring: id dây (ORING_IDS, độ cứng); `true` = bản lưu cũ (coi như dây 50A) */
  ring: boolean | string
  /** feet đã dán: số hốc → loại feet (id vật tư); bản lưu cũ không có */
  feet?: Record<number, string>
  inCase: boolean
  closed: boolean
  /** vít bị tuôn ren (vặn sai đầu vít / quá lực); hoàn tác không gỡ được */
  stripped?: Record<string, true>
  /** skill check trúng vùng vàng (hoàn hảo): id vít vặn vào / id phím hàn → cộng điểm khi giao */
  perfect?: Record<string, true>
  /** số lần trượt ren chưa tới mức tuôn (`STRIP_TRIES`) theo id vít; hoàn tác không gỡ được */
  slips?: Record<string, number>
  /** case nứt (tuôn ren vít bắt vào case PC / mica / acrylic); hoàn tác không gỡ được */
  cracked?: boolean
  keycaps: Record<string, true>
  tested: Record<string, true>
  /** phím bấm thử ở bước test mà không ăn (PCB hàn: chưa hàn / hàn cháy); bản lưu cũ không có */
  testFaults?: Record<string, true>
  stabMods: StabMods
  stabModDone: boolean
  /** số switch đã tách vỏ bằng đồ mở (bản lưu cũ không có: coi như = lubed) */
  opened?: number
  lubed: number
  /** thứ tự (trong lưới switch đã mở) các con đã lube, bấm con nào lube con đó (bản lưu cũ: coi như `lubed` con đầu) */
  lubedIds?: number[]
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
  /** vít stab: id phím của stab (tuôn ren = stab đó hỏng, thay stab mới) */
  key?: string
}

export interface BuildContext {
  layout: LayoutId
  variant: Variant
  keys: Key[]
  width: number
  depth: number
  origin: [number, number]
  outline?: [number, number][]
  caseDef: CaseDef
  stabKeys: Key[]
  /** kiểu lắp stab: clip / screw / plate */
  stabType: 'clip' | 'screw' | 'plate' | undefined
  /** id mẫu stab (STABS) */
  stabModel: string | undefined
  mount: string
  steps: StepId[]
  screws: Record<ScrewStep, ScrewPoint[]>
  /** điểm dán gasket: tâm, dài dọc mép `w` (u, không có = 1 dải 20mm), góc `rot` (rad, quanh trục y) */
  gaskets: (Point & { w?: number; rot?: number })[]
  /** hốc feet dưới đáy case (u, toạ độ cảnh): tâm x, z + bán kính r */
  feet: FootPocket[]
  screwSide: 'top' | 'bottom'
  pcbType: string
  /** không plate: bỏ bước foam + plate, switch hàn thẳng vào PCB */
  plateless: boolean
}
export interface FootPocket {
  x: number
  z: number
  r: number
  /** độ sâu hốc tính từ mặt đáy (u) */
  depth: number
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
  /** kim loại phần tạ / badge của case CAD (tô khác màu case cho dễ nhận ra), mặc định đồng thau */
  weight?: 'brass' | 'steel' | 'copper' | 'gold'
  /** đáy khác chất liệu / màu với nắp (vd nắp PC, đáy nhôm); case CAD cần node "bottom" */
  bottom?: { material: string; color: string }
  /** chỉ hợp các layout này (case cắt sẵn cho HHKB...); không có = mọi layout cùng cỡ */
  layouts?: LayoutId[]
  /** nắp case CAD riêng cho layout HHKB / hàng dưới WKL (vd Exodus60) */
  modelFor?: { hhkb?: string; wkl?: string }
  /**
   * case CAD có mặt plate nghiêng (góc gõ làm sẵn, như Alice): board thả vào case thì nâng lên rise (u)
   * và nghiêng tilt (rad, dương = mép sau cao)
   */
  /** dz: dời board ra trước (+) / sau (−) theo u khi case CAD không đối xứng trước / sau (căn theo khung bao bị lệch) */
  seat?: { rise: number; tilt: number; dz?: number; dx?: number }
  /** model case CAD thật (public/models/cases/<model>.glb, `bun run convert:cases`), thay case dựng bằng code */
  model?: string
  /** case CAD 2 mảnh: tâm lỗ vít ghép ở đáy [x, z] (mm, hệ model) thay vị trí vít tính theo cỡ case */
  screws?: [number, number][]
  /**
   * plate CAD có tai gasket: dải gasket dọc hết tai [x, z, dài, góc] (mm, hệ plate = tâm board; góc rad của trục dài so với trục x,
   * tai xiên như đoạn chữ V của Alice) thay các dải 20mm chia đều mép trước / sau
   */
  gaskets?: [number, number, number, number][]
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
  /** số ngày giao trễ hạn (trừ uy tín) */
  late?: number
  /** nút khách báo lỗi (nhãn phím): chưa hàn / hàn cháy, hoặc lỗi ẩn do không test hết trước khi giao */
  defects?: string[]
  /** hỏng do vặn vít khách phát hiện: case nứt / case tuôn ren (lỏng, gõ lọc xọc) / stab tuôn ren (lỏng) */
  damage?: 'crack' | 'strip' | 'stab'
  /** tiền đền khách vì hỏng (trừ khi gửi đơn) */
  refund?: number
  /** uy tín bị trừ thêm vì case hỏng (ngoài phần theo sao) */
  repLoss?: number
}

export interface Toast {
  id: number
  text: string
  kind: 'info' | 'good' | 'bad'
}

/** 1 thông báo lưu ở chuông góc phải (khách phát hiện bán đồ, đánh giá, fast bid...), xoá được */
export interface NotifyItem {
  id: string
  day: number
  title: string
  text: string
  /** đánh giá khách: bấm mở app Đánh giá */
  review?: boolean
}

/** 1 đánh giá khách để lại cho shop (app "Đánh giá" + thông báo góc phải trên) */
export interface Review {
  id: string
  day: number
  customer: string
  avatar: string
  /** 1–5 sao */
  stars: number
  text: string
  /** ship: nhận hàng · decline: bị từ chối đơn · cancel: huỷ vì trễ hạn quá lâu */
  kind: 'ship' | 'decline' | 'cancel'
  /** uy tín cộng / trừ theo đánh giá này */
  rep: number
}
