import type {
  BuildContext,
  BuildState,
  CaseDef,
  DtbSpot,
  FootPocket,
  Inventory,
  Key,
  Order,
  Point,
  ScrewBit,
  ScrewPoint,
  ScrewStep,
  StepId,
  BatterySpot,
  LayoutId,
} from '@/types'
import { blockerGaps, getLayout } from './layouts'
import { CASES, STABS, TOOLS, caseModelOf, isPlasticCase, isPlateless } from './parts'
import { BATTERY_IDS, BATTERY_T, SUPPLIES } from './supplies'
import CASE_FEET from './caseFeet.json'
import CASE_USB from './caseUsb.json'
import { stabModRules } from './mods'
import stabModel from './stabModel.json'
import { plateUniversal } from './generated/plateUniversal'

export const STEP_INFO: Record<StepId, { title: string; hint: string }> = {
  unbox: { title: 'Mở hộp hàng', hint: 'Click vào thùng hàng để mở' },
  caseOpen: {
    title: 'Tháo vít mở case',
    hint: 'Case ghép (2 mảnh / mica nhiều lớp): click từng con vít để tháo (đúng đầu vít, sai là tuôn ren), nhấc phần trên ra',
  },
  stabMod: {
    title: 'Mod stab (tuỳ chọn)',
    hint: 'Theo mũi tên vàng: cắt chân stem → Holee mod (băng Urgo) → phết mỡ housing + slider → lắp slider → phết mỡ wire → lắp wire vào ngàm',
  },
  stab: { title: 'Lắp stab', hint: 'Click vào vị trí các phím dài (≥ 2u) để lắp stab' },
  switchLube: {
    title: 'Lube switch (tuỳ chọn)',
    hint: 'Click switch trên đồ mở để tách housing, stem và lò xo, click switch đã mở để lube 1 mẻ, lube lò xo, rồi click lưới switch: thả lò xo vào từng mẻ rồi đóng lại',
  },
  stabScrew: {
    title: 'Vặn vít stab',
    hint: 'Stab screw-in: giữ chuột lên vít cho thanh lực chạy, nhả trong vùng xanh (nhả ở đỏ là trượt ren)',
  },
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
    hint: 'Board đã lật. Giữ chuột lên từng chân cho thanh nhiệt chạy, nhả trong vùng xanh; nhả ở đỏ hoặc hụt quá 3 lần sẽ làm cháy chân và đen mũi hàn.',
  },
  gasket: {
    title: 'Dán gasket',
    hint: 'Click từng tai / mép plate để dán dải gasket Poron (mỗi chỗ 2 miếng: mặt trên + mặt dưới)',
  },
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
    hint: 'Đã lật: giữ chuột lên ốc M2 cho thanh lực chạy, nhả trong vùng xanh để bắt tai plate vào lỗ ren case trên',
  },
  bottomScrew: {
    title: 'Bắt vít plate vào case dưới',
    hint: 'Bottom mount: tai plate tì lên vấu case dưới, giữ chuột lên ốc M2 cho thanh lực chạy, nhả trong vùng xanh để bắt xuống lỗ ren (xong mới đậy case trên)',
  },
  feet: {
    title: 'Dán feet cao su',
    hint: 'Case đã lật úp: click từng hốc tròn dưới đáy để dán feet (mỗi hốc 1 cái, chọn feet đen / trắng ở bảng bên)',
  },
  caseFoam: {
    title: 'Lót foam đáy case (tuỳ chọn)',
    hint: 'Click vào lòng case để lót tấm foam Poron đen xuống đáy (khoét sẵn lỗ trụ tray mount, chỗ daughterboard): bớt tiếng rỗng, đỡ vang góc. Không cần thì bấm "Bỏ qua"',
  },
  coverOff: {
    title: 'Tháo tạ che DTB',
    hint: 'Tấm tạ đè lên chỗ lắp daughterboard: click từng ốc trên tạ để tháo, rồi click tấm tạ để nhấc ra',
  },
  dtb: {
    title: 'Lắp daughterboard',
    hint: 'Click hốc vách sau đặt daughterboard (cổng USB-C quay ra lỗ), nhấn giữ 2 lỗ vít canh lực siết 2 vít M2 trên khay vào lỗ ren sàn case, rồi click đầu dây cắm vào cổng JST trên DTB',
  },
  coverOn: {
    title: 'Lắp lại tạ',
    hint: 'Dây JST đã cắm vào PCB: click tấm tạ nằm trước case để lắp vào (dây nằm trong rãnh dưới tạ), rồi nhấn giữ từng lỗ ốc canh lực siết lại',
  },
  jst: {
    title: 'Cắm dây JST vào PCB',
    hint: 'Board dựng lên cho thấy mặt dưới: click đầu dây JST nằm trong case để cầm lên, rồi click jack JST trên PCB để cắm. Xong bấm sang bước kế để hạ board (case có tạ: click tấm tạ trước case để lắp lại luôn)',
  },
  battery: {
    title: 'Lắp pin (tuỳ chọn)',
    hint: 'Chọn dung lượng pin ở bảng bên phải, click hốc pin trên sàn case để đặt pin vào, rồi click đầu dây pin (đỏ / đen) cầm lên và click jack pin trên PCB để cắm. Không làm bàn phím không dây thì bấm "Bỏ qua"',
  },
  caseIn: { title: 'Thả board vào case', hint: 'Click vào case để đặt board xuống' },
  trayScrew: {
    title: 'Bắt vít tray mount',
    hint: 'Giữ chuột lên vít giữ PCB vào standoff đáy case, nhả trong vùng xanh',
  },
  caseClose: { title: 'Đậy case trên', hint: 'Click vào case trên để đậy lại' },
  caseScrew: {
    title: 'Vặn vít đóng case',
    hint: 'Giữ chuột lên vít khoá case, nhả trong vùng xanh (case PC / mica / acrylic quá tay dễ nứt)',
  },
  keycap: {
    title: 'Lắp keycap',
    hint: 'Click vào switch để cắm keycap (số cái mỗi lần theo bậc thợ + phép lắp keycap)',
  },
  test: {
    title: 'Test phím',
    hint: 'Gõ bàn phím thật hoặc click phím 3D. Phím đã test có chấm xanh; phím không có trên bàn phím của bạn (Fn, macro...) thì click',
  },
  pack: {
    title: 'Đóng gói',
    hint: 'Bấm thùng carton cạnh bàn phím để cho phím vào thùng. Đóng xong cầm thùng đặt lên kệ giao hàng trong phòng (tường phải) để gửi khách',
  },
}

/** thời gian 1 lần vặn (ms): tay vặn 1 vòng cổ tay, điện quay liền 1 hơi tới khi vít ăn hết ren */
export const SPIN_MS = { manual: 550, electric: 750 }

export const SCREW_STEPS: Record<ScrewStep, 'remove' | 'tighten'> = {
  caseOpen: 'remove',
  stabScrew: 'tighten',
  topScrew: 'tighten',
  bottomScrew: 'tighten',
  trayScrew: 'tighten',
  caseScrew: 'tighten',
}
/** Đầu vít cần cho từng bước vặn vít */
export const SCREW_BITS: Record<ScrewStep, ScrewBit> = {
  caseOpen: 'hex',
  stabScrew: 'phillips',
  // ốc top mount đầu trụ phẳng lục giác chìm (mặt tì phẳng lên tai plate, không dùng đầu côn)
  topScrew: 'hex',
  bottomScrew: 'hex',
  trayScrew: 'torx',
  caseScrew: 'hex',
}
/**
 * Đầu vít cần ở bước có vặn vít (gồm bước không thuộc `SCREW_STEPS`: vít M2 đầu trụ DTB + ốc nón tạ che DTB đều lục giác chìm);
 * undefined = bước không vặn vít. HUD hiện bảng chọn đầu vít, tua vít bày trên bàn theo đây
 */
const EXTRA_BITS: Partial<Record<StepId, ScrewBit>> = {
  dtb: 'hex',
  coverOff: 'hex',
  coverOn: 'hex',
}
export const stepBit = (step: StepId | null | undefined): ScrewBit | undefined =>
  step ? (SCREW_BITS[step as ScrewStep] ?? EXTRA_BITS[step]) : undefined

/** bước vặn vít ăn vào vỏ case (case nhựa giòn thì tuôn ren có thể nứt luôn case) */
export const CASE_SCREW_STEPS: ScrewStep[] = [
  'caseOpen',
  'topScrew',
  'bottomScrew',
  'trayScrew',
  'caseScrew',
]
/** chất liệu case giòn: PC, mica, acrylic */
const BRITTLE = ['pc', 'acrylic', 'mica']
/** số lần trượt ren (sai đầu vít / quá lực) trên 1 vít thì tuôn ren hẳn; các lần trước chỉ cảnh báo */
export const STRIP_TRIES = 3
/** tuôn ren vít bắt vào case giòn: tỉ lệ nứt luôn case */
export const CRACK_CHANCE = 0.35
/** loại lỗ ren theo id vít: case (open-i = close-i cùng 1 lỗ ngàm case), top / bottom mount (lỗ bắt tai plate), tray mount, stab;
 * còn lại (DTB, ốc tạ) = other */
export function holeKind(id: string): 'case' | 'top' | 'tray' | 'stab' | 'other' {
  const pre = id.split('-')[0]
  if (pre === 'open' || pre === 'close') return 'case'
  if (pre === 'bot') return 'top'
  if (pre === 'top' || pre === 'tray' || pre === 'stab') return pre
  return 'other'
}
/** tuôn ren từ chừng này lỗ trở lên trong cùng 1 loại (case / tray / top mount) thì hỏng hẳn: không lắp tiếp được, đền khách */
export const RUIN_HOLES = 2
const RUIN_NAME = { case: 'ren case', top: 'ren bắt plate', tray: 'ren tray mount' } as const
/** đã tuôn ren đủ `RUIN_HOLES` lỗ cùng loại chưa (null = chưa), kèm số lỗ hỏng + tên loại lỗ */
export function ruinedBy(stripped: Record<string, true> | undefined) {
  const holes = { case: new Set<string>(), top: new Set<string>(), tray: new Set<string>() }
  for (const id of Object.keys(stripped ?? {})) {
    const k = holeKind(id)
    if (k in holes) holes[k as keyof typeof holes].add(id.replace(/^(open|close)-/, 'case-'))
  }
  for (const kind of ['case', 'top', 'tray'] as const)
    if (holes[kind].size >= RUIN_HOLES)
      return { kind, holes: holes[kind].size, name: RUIN_NAME[kind] }
  return null
}
/** case hỏng (nứt / tuôn ren vít case bị phát hiện): đền khách phần giá case */
export const CASE_REFUND = 0.8
/** case hỏng: trừ thêm uy tín */
export const CASE_DAMAGE_REP = 2
/** tuôn ren (vít case / vít stab): khách không phát hiện ra; case nứt thì luôn thấy */
export const STRIP_UNNOTICED = 0.2
/** tuôn ren ít lỗ case (≤ 1/3 số lỗ cùng loại, vd 1–2/6): khách khó phát hiện hơn */
export const STRIP_FEW_UNNOTICED = 0.3
/** cỡ dây stab của 1 phím (khớp `stabNeed`) */
export const stabSize = (k: { w: number; h: number }) => {
  const l = Math.max(k.w, k.h)
  return l < 6 ? 'short' : l < 7 ? 'long' : 'long7'
}

export const brittleCase = (caseId?: string | null) => {
  const c = caseId ? CASES[caseId] : undefined
  return !!c && (BRITTLE.includes(c.material) || BRITTLE.includes(c.bottom?.material ?? ''))
}

/** skill check vặn vít vào theo tua vít (vùng xanh + tốc độ nạp) */
export const torqueSpec = (level: number) => TOOLS.screw[level]?.torque ?? TOOLS.screw[0].torque!

export const BIT_LABELS: Record<ScrewBit, string> = {
  phillips: 'Chữ thập',
  hex: 'Lục giác',
  torx: 'Torx',
  flat: 'Dẹt',
}
export const OPTIONAL_STEPS: StepId[] = [
  'stabMod',
  'foam',
  'caseFoam',
  'switchLube',
  'battery',
  'test',
]
/** bước build thật (tính tiến độ / chấm điểm / hỏi lại khi giao sớm): bỏ bước đóng gói cuối */
export const isBuildStep = (step: StepId) => step !== 'pack'
/**
 * Bước tuỳ chọn với đơn này: khách đòi lót foam (`order.foam`) thì bước `foam` bắt buộc; lắp plate không bỏ qua được khi bước sau cần plate (`steps` có `topCase`: không plate thì không có gì bắt vào case trên; có `gasket`: dải gasket
 * dán lên tai plate)
 */
export const isOptionalStep = (
  step: StepId,
  order?: { foam?: true; tutorial?: true } | null,
  steps?: StepId[],
) =>
  step === 'plate' && (steps?.includes('topCase') || steps?.includes('gasket'))
    ? false
    : // đơn hướng dẫn: test phím bắt buộc (dạy test hết phím trước khi giao, không cho bỏ qua)
      step === 'test' && order?.tutorial
      ? false
      : // tháo / lắp tạ che DTB: không bỏ qua được (tạ còn đè thì không lắp được DTB)
        step === 'coverOff' || step === 'coverOn'
        ? false
        : OPTIONAL_STEPS.includes(step) && !(step === 'foam' && order?.foam)
/** lắp lại tạ trước khi cắm dây JST vào PCB (case `jstUp`: dây luồn lên qua tạ) */
export const coverBeforeJst = (steps: StepId[]) => {
  const on = steps.indexOf('coverOn')
  return on >= 0 && on < steps.indexOf('jst')
}

/**
 * Tên bước theo đơn: foam khách yêu cầu thì ghi rõ thay cho "(tuỳ chọn)"; top mount (`steps` có `topCase`) thì `caseIn` là ghép
 * case trên (đã bắt vào plate) với case dưới
 */
export const stepTitle = (step: StepId, order?: { foam?: true } | null, steps?: StepId[]) =>
  step === 'foam' && order?.foam
    ? 'Lót foam PCB (khách yêu cầu)'
    : step === 'caseIn' && steps?.includes('topCase')
      ? 'Ghép case trên vào case dưới'
      : STEP_INFO[step].title

/** Hướng dẫn bước theo danh sách bước (top mount, tạ lắp trước khi cắm JST) */
export const stepHint = (step: StepId, steps: StepId[]) =>
  step === 'caseIn' && steps.includes('topCase')
    ? 'Case trên đã bắt vào plate: click case dưới để hạ cả cụm xuống, ghép 2 mảnh case lại'
    : step === 'coverOn' && coverBeforeJst(steps)
      ? 'DTB đã cắm dây: click tấm tạ nằm trước case để lắp vào (đầu dây JST luồn lên qua tạ), rồi nhấn giữ từng lỗ ốc canh lực siết lại'
      : step === 'jst' && coverBeforeJst(steps)
        ? 'Board dựng lên cho thấy mặt dưới: click đầu dây JST lòi lên qua tạ để cầm lên, rồi click jack JST trên PCB để cắm. Xong bấm sang bước kế để hạ board'
        : STEP_INFO[step].hint
export const CASE_WALL = 0.45
/** thành case nhựa ABS 1 mảnh dựng bằng code (u, ~1,9mm): vỏ nhựa đúc mỏng (đỡ cứng bằng khung xương cá bên trong); 1 mảnh
 * không có lỗ vít ghép / hốc tai plate trong thành; trụ O-ring lùi vào lòng case cho khỏi lòi ra ngoài (`ringPosts`) */
export const ABS_WALL = 0.1
/** thành case nhựa 2 mảnh (u, ~6,9mm): thành rỗng 2 lớp da (`ABS_SHELL`), vít ghép bắt vào trụ nhỏ trong rãnh giữa 2 lớp da
 * (không lấn vào lòng case); bottom mount tì lên vấu nhựa (PCB khoét rãnh né) */
export const ABS_WALL_2 = 0.36
/**
 * Case nhựa 2 mảnh kiểu đúc (Transition Lite PC...), u: case trên trùm case dưới — da ngoài `skin` phủ từ mặt trên xuống tận mặt đáy,
 * case dưới chỉ là khay đáy lọt trong da ngoài + da trong lên tới mép ghép `Y.split`. Giữa 2 lớp da là rãnh rỗng, mặt trên `deck`,
 * gân ngang `rib` cách nhau ~`ribGap` nối 2 lớp da; vít M2 từ đáy xuyên trụ nhỏ case dưới ăn lên trụ case trên (ren đồng cấy ở miệng
 * dưới), trụ bán kính `bossR` vừa khít rãnh. Khay hở `gap` với da ngoài
 */
export const ABS_SHELL = { skin: 0.08, deck: 0.1, rib: 0.03, ribGap: 0.8, bossR: 0.09, gap: 0.006 }
/**
 * mép trên case nhựa (u, trên mặt plate ~6,5mm ≈ đỉnh housing switch): nhìn ngang chỉ lộ chân keycap, không lộ switch (0,18 ≈ 3,4mm
 * lộ nửa trên housing); thấp hơn chút so với case khác (`Y.caseTop` ~6,9mm), đáy nâng `ABS_RAISE` cho dáng gọn
 */
export const ABS_CASE_TOP = 0.34
/** mép trên case dựng bằng code theo chất liệu */
export const caseTopOf = (c?: { material: string; model?: string; bottom?: unknown }) =>
  isPlasticCase(c) ? ABS_CASE_TOP : Y.caseTop
/** trụ nhựa kê DTB đúc liền sàn case nhựa (u, ~1mm): mặt dưới mạch cao hơn sàn, đầu trụ cấy ren đồng; sàn nâng thì trụ thấp theo
 * (miệng cổng USB-C trên DTB vừa sát mặt dưới PCB) */
export const ABS_DTB_POST = 0.05
/** case nhựa (ABS / PC) 2 mảnh dựng bằng code */
export const absTwo = (c: { material: string; model?: string; bottom?: unknown; pieces: 1 | 2 }) =>
  isPlasticCase(c) && c.pieces === 2
/**
 * Trụ nhựa đúc liền vách (case nhựa 2 mảnh, u): bán kính `r`, tâm lùi vào trong mặt trong vách `inset` (nửa ngoài chìm trong vách,
 * không lòi ra ngoài vỏ); trụ vít ghép case: nửa dưới (case dưới, sàn → mép ghép, lỗ xuyên) + nửa trên (case trên, mép ghép → dưới
 * plate, ren đồng cấy). Vấu bottom mount: trụ nhỏ `ABS_TOP.bossR` từ sàn lên mặt dưới tai plate (như trụ top mount lật ngược)
 */
export const ABS_BOSS = { r: 0.12, inset: 0.05 }
/**
 * Top / bottom mount case nhựa 2 mảnh (u): tai plate thò vào hốc vách case trên sâu `d` (qua da trong vào rãnh thành rỗng),
 * vít M2 tâm cách mặt trong vách `z` (đầu ốc Ø3,8 không cấn mép PCB); ren nằm trong trụ nhựa nhỏ (bán kính `bossR`) trong rãnh thành:
 * top mount trên mặt plate (cao `bossH`), bottom mount từ sàn lên mặt dưới tai; ren đồng cấy ở miệng trụ
 */
export const ABS_TOP = { d: 0.2, z: 0.1, bossR: 0.09, bossH: 0.13 }
/** vít ghép case nhựa M2 đầu bằng (mm): đầu Ø3,8, lỗ xuyên Ø2,2, lỗ ren đồng cấy Ø1,6; `scale` = cỡ model ốc so với ốc M3 Ø6 */
export const ABS_SCREW = { headR: 1.9, thru: 1.1 / 19.05, tap: 0.8 / 19.05, scale: 3.8 / 6 }
/** sàn case nhựa ABS dựng bằng code dày (u, ~1,9mm) */
export const ABS_FLOOR = 0.1
/**
 * case nhựa: mặt đáy nâng lên so với case khác (u, ~2,9mm) → case thấp hơn, gân xương cá thấp theo; sàn trong (`caseFloorTop`)
 * cao hơn sàn case nhôm ~1mm (trụ DTB thấp theo `ABS_DTB_POST`), pin Li-Po dẹt 3mm nằm thẳng trên sàn dưới jack pin
 */
export const ABS_RAISE = 0.15
/** mặt đáy ngoài case dựng bằng code (case nhựa cao hơn `Y.floorBot`) */
export const caseFloorBot = (c?: { material: string; model?: string; bottom?: unknown }) =>
  isPlasticCase(c) ? Y.floorBot + ABS_RAISE : Y.floorBot
/** mặt sàn trong lòng case (DTB, gân, trụ, foam đáy đứng trên đây): case nhựa = đáy nâng + sàn mỏng */
export const caseFloorTop = (c?: { material: string; model?: string; bottom?: unknown }) =>
  isPlasticCase(c) ? caseFloorBot(c) + ABS_FLOOR : Y.floorTop
/** bề dày thành case dựng bằng code theo chất liệu */
export const caseWall = (c?: { material: string; model?: string; pieces?: 1 | 2 }) =>
  isPlasticCase(c) ? (c?.pieces === 2 ? ABS_WALL_2 : ABS_WALL) : CASE_WALL
/**
 * khe từ mép board (PCB / plate) tới mặt trong vách case dựng bằng code (u): 0,03 ≈ 0,6mm như case thật loại khít.
 * Trước 0,15 (~2,9mm) rồi 0,06 (~1,1mm) + keycap lùi 0,5mm → nhìn từ trên vẫn thấy hở quanh bàn phím
 */
export const CASE_MARGIN = 0.03
/** khe từ mép board tới mép trong gờ đỡ trong lòng case (gờ không chạm PCB / plate) */
// khe board – vách chỉ 0,03 → chừa 0,01 cho gờ còn lộ ra đỡ vòng O-ring
export const LEDGE_GAP = 0.01
/**
 * Dải gasket Poron 20 × 4mm dày 2mm (u): dán 1 miếng mặt trên + 1 miếng mặt dưới tai / mép plate, `w` dọc mép, `d` vuông góc mép
 * (case dựng bằng code: từ trong mép plate ra sát mặt vách case)
 */
export const GASKET = { w: 20 / 19.05, d: 4 / 19.05, t: 2 / 19.05 }
/**
 * Tab gasket (case 2 mảnh dựng bằng code): plate có tai nhô ra mỗi điểm gasket, dài `tab` (≈ bề ngang dải 4mm + khe: tai dài hơn dải
 * thì phần tai trần lộ ở khe board – vách, nhìn từ trên thấy hở), chui qua khe board – vách vào hốc phay trong vách case trên sâu `d`
 * (= tai − khe `CASE_MARGIN`), rộng hơn dải `gap` mỗi bên; dải gasket chỉ trên phần tai trong hốc (`gaskets[].d`, không lộ ở khe),
 * case dưới có vấu đỡ dải dưới
 */
const GASKET_TAB = GASKET.d + 0.04
export const GASKET_NOTCH = { tab: GASKET_TAB, d: GASKET_TAB - CASE_MARGIN, gap: 0.03 }
export const gasketTabbed = (c: Pick<CaseDef, 'model' | 'material' | 'pieces' | 'bottom'>) =>
  !c.model && c.material !== 'mica' && c.pieces === 2

/** số dải 20mm cho 1 điểm gasket: mỗi mặt (trên + dưới) nối đủ dải phủ hết chiều dài tai */
export const gasketStrips = (g: { w?: number }) =>
  2 * Math.ceil((g.w ?? GASKET.w) / GASKET.w - 0.05)
/** top mount: tai plate (bề ngang), thò qua khe board – vách vào hốc khoét trong vách case trên */
export const TOP_TAB = 0.6
/** top mount: hốc khoét vào mặt trong vách case trên (u) — sâu vào vách `d`, rộng hơn tai `gap` mỗi bên; trần hốc ngang mặt plate */
export const TOP_NOTCH = { d: 0.22, gap: 0.02 }
/**
 * top mount: lỗ vít M2 (u) — tâm lỗ cách mép board `z` (giữa phần tai nằm trong hốc vách), lỗ xuyên tai plate bán kính `r`
 * (lỗ thoát 2,1mm), lỗ ren ở trần hốc bán kính `tap` (khoan mồi M2)
 */
export const TOP_HOLE = { z: CASE_MARGIN + TOP_NOTCH.d / 2, r: 1.05 / 19.05, tap: 0.8 / 19.05 }

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

/**
 * Khung vòng silicon O-ring mount (u): nằm trong khe PCB – plate, từ trong mép board 0.04 ra sát mặt vách case.
 * `bottom` = mặt dưới vòng
 */
export function ringFrame() {
  const t = CASE_MARGIN + 0.04
  const h = Y.plateBot - Y.pcbTop - 0.01
  const y = (Y.pcbTop + Y.plateBot) / 2
  // tâm dây cách mép board (mặt ngoài dây sát mặt vách)
  const off = CASE_MARGIN - t / 2
  return { t, h, y, off, bottom: y - h / 2 }
}

/**
 * Danh sách bước đổi (đổi case / mount giữa chừng, dữ liệu case đổi): tìm lại bước đang làm theo tên; danh sách mới có bước
 * chưa từng có (vd dán gasket) nằm trước chỗ đang làm thì lùi về bước đó, không thì bước đó bị coi như đã qua
 */
export function remapStepIdx(old: StepId[], next: StepId[], idx: number) {
  let at = next.indexOf(old[idx])
  if (at < 0) at = Math.min(idx, next.length - 1)
  // mở case (tháo vít case mới đổi sang) coi như đã làm: không lùi về tận đầu, chỉ lùi về bước lắp ráp mới (gasket, vòng...)
  // tháo / lắp tạ che DTB (thêm sau) cũng coi như đã làm
  const added = next.findIndex(
    // bước lắp pin (thêm sau, tuỳ chọn) cũng không lùi về
    (s) =>
      !old.includes(s) &&
      s !== 'caseOpen' &&
      s !== 'coverOff' &&
      s !== 'coverOn' &&
      s !== 'battery',
  )
  return added >= 0 && added < at ? added : Math.max(0, at)
}

const cache = new Map<string, BuildContext>()

/**
 * `buildContext` an toàn cho UI: thiếu mount / case / PCB (vd món khách gửi đã đem bán, đơn bị huỷ kèo) thì null
 * thay vì vỡ (buildContext đọc `inv.case.id`, `inv.pcb.type`)
 */
export function contextFor(order: Order, inv: Inventory, mount: string | null | undefined) {
  return mount && inv.case && inv.pcb ? buildContext(order, inv, mount) : null
}

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
  const lay = getLayout(order.layout, order.variant)
  const { keys, width, depth, origin } = lay
  const caseDef = CASES[inv.case!.id]
  const outline = lay.outline ?? cornerCutOutline(keys, width, depth, caseDef, order.layout)
  const stabKeys = keys.filter((k) => k.stab)
  const stabModel = inv.stab?.type
  const stabType = stabModel ? STABS[stabModel].mount : undefined

  const screwSide = caseDef.screwSide ?? 'bottom'
  // case nhựa 2 mảnh: vít ghép vào trụ nhựa trong lòng case (PCB khoét rãnh né trụ)
  const boss2 = absTwo(caseDef)
  // case CAD 2 mảnh: vít đúng lỗ trong model (mm, hệ model → u quanh tâm layout như feet)
  const caseScrews: (Point & Pick<ScrewPoint, 'y' | 'dir'>)[] = caseDef.angledScrews
    ? // vít bắt chéo: đầu vít trên vách ngoài nắp, nghiêng theo lỗ
      caseDef.angledScrews.map(([x, y, z, dx, dy, dz]) => ({
        x: x * MM_U - origin[0],
        z: z * MM_U - origin[1],
        y: Y.floorBot + y * MM_U,
        dir: [dx, dy, dz],
      }))
    : caseDef.screws
      ? caseDef.screws.map(([x, z]) => ({ x: x * MM_U - origin[0], z: z * MM_U - origin[1] }))
      : boss2
        ? absCaseScrews(width, depth)
        : caseScrewPoints(width, depth, screwSide, caseWall(caseDef))

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
  if (mount === 'gasket') steps.push('gasket')
  // O-ring: switch (+ hàn) giữ chặt plate vào PCB rồi mới cuốn vòng silicon quanh viền
  if (mount === 'oring') steps.push('ring')
  // top mount (case 2 mảnh): plate bắt vít vào case trên trước, rồi cả cụm thả vào case dưới (khỏi bước đậy case)
  const topMount = mount === 'top' && caseDef.pieces === 2
  // dán feet vào đáy case trước khi lắp board vào case
  steps.push('feet')
  // foam đáy case: chỉ case dựng bằng code (case CAD lòng case có tạ / rãnh dây / bệ riêng, tấm phẳng không khớp)
  if (!caseDef.model) steps.push('caseFoam')
  // bottom mount case 2 mảnh: vấu case dưới (vít M2 từ trên xuyên plate bắt xuống), lệch vít case như top mount
  const bottomPts =
    mount === 'bottom' && caseDef.pieces === 2
      ? topScrewPoints(
          width,
          depth,
          caseScrews,
          boss2 ? { keys, cuts: plateCutoutsFor(order.layout, keys, outline) } : undefined,
          // case nhựa 2 mảnh: y như top mount (tai plate vào hốc nông, tâm vít ngay mặt trong vách), vấu nằm dưới tai
          boss2,
        )
      : []
  // case nhựa 2 mảnh: vấu bottom mount là trụ mọc từ sàn → DTB / pin / foam đáy phải né
  const floorBosses = boss2 ? bottomPts : []
  // daughterboard: bắt vào case dưới khi case còn trống, cắm dây vào PCB ngay trước lúc thả board
  const spot = dtbSpot(
    caseModelOf(caseDef, order.layout, order.variant),
    width,
    depth,
    origin,
    caseDef.pieces === 2 ? [...caseScrews, ...floorBosses] : [],
    // trụ vít trong rãnh thành rỗng (lỗ cổng USB xuyên thành) / vấu bottom mount mọc từ sàn: né cả thân trụ
    boss2 ? (DTB_MM.w / 2) * MM_U + ABS_BOSS.r + 0.06 : undefined,
    caseFloorTop(caseDef),
    // case nhựa: DTB kê trên trụ nhựa đúc liền sàn
    isPlasticCase(caseDef) ? ABS_DTB_POST : 0,
  )
  // PCB có cổng USB-C hàn sẵn: không daughterboard (không bước `dtb` / `jst`)
  const dtb = !caseDef.pcbUsb && spot ? { ...spot, jack: jackSpot(spot, keys) } : null
  // hốc pin Li-Po: case dựng bằng code nhựa / nhôm ≤ 60%, né DTB + dây JST, trụ tray, cổng USB-C trên PCB
  const battery = batteryCase(caseDef)
    ? batterySpot(
        width,
        depth,
        keys,
        dtb,
        // trụ tray chỉ có ở tray mount; case nhựa 2 mảnh bottom mount: vấu mọc từ sàn
        mount === 'tray'
          ? trayPoints(keys, width, depth, mount, order.layout, outline)
          : floorBosses,
        caseFloorTop(caseDef),
        // PCB hàn sẵn cổng USB-C (bản "C", cổng bên trái): né thân cổng sát mép sau
        caseDef.pcbUsb ? pcbUsbSpot(width, depth) : undefined,
      )
    : null
  if (dtb?.cover && caseDef.jstUp) {
    // dây JST luồn lên qua tạ (Duality): case trên bắt vào plate trước → tháo tạ → lắp DTB → lắp lại tạ → cắm dây vào PCB
    // → ghép case trên với case dưới
    if (topMount) steps.push('topCase', 'topScrew')
    steps.push('coverOff', 'dtb', 'coverOn', 'jst')
  } else {
    // top mount: úp case trên + bắt vít plate trước (board để riêng), rồi mới lắp DTB vào case dưới → cắm dây vào PCB
    // tạ che chỗ DTB: tháo tạ → lắp DTB → cắm dây vào PCB → lắp lại tạ (dây nằm trong rãnh dưới tạ) → thả board vào case
    if (topMount) steps.push('topCase', 'topScrew')
    if (dtb?.cover) steps.push('coverOff')
    if (dtb) steps.push('dtb')
    if (dtb) steps.push('jst')
    // pin: board vẫn dựng như lúc cắm JST (case bản "C" không DTB thì dựng riêng cho bước pin)
    if (battery) steps.push('battery')
    if (dtb?.cover) steps.push('coverOn')
  }
  steps.push('caseIn')
  if (mount === 'tray') steps.push('trayScrew')
  // bottom mount (case 2 mảnh dựng bằng code): thả board vào, tai plate tì lên vấu case dưới → bắt vít từ trên xuống, rồi đậy case trên
  if (mount === 'bottom' && caseDef.pieces === 2) steps.push('bottomScrew')
  if (caseDef.pieces === 2) steps.push(...(topMount ? [] : (['caseClose'] as const)), 'caseScrew')
  steps.push('keycap', 'test', 'pack')

  const trayScrews = trayPoints(keys, width, depth, mount, order.layout, outline)

  // vít screw-in bắt vào lỗ nhỏ của stab
  const stabScrews = stabKeys.flatMap((k) =>
    stabHoles(k)
      .filter((h) => !h.big)
      .map(({ x, z }) => ({ x, z, key: k.id })),
  )

  const name = (prefix: string, list: (Point & { key?: string })[]): ScrewPoint[] =>
    list.map((p, i) => ({ ...p, id: `${prefix}-${i}` }))
  const screws: Record<ScrewStep, ScrewPoint[]> = {
    caseOpen: name('open', caseScrews),
    caseScrew: name('close', caseScrews),
    // top mount: vít M2 ngắn xuyên lỗ tai plate (lòi ra khe board – vách) bắt vào lỗ ren vấu case trên, vặn từ dưới lên
    topScrew: name(
      'top',
      caseDef.topScrews
        ? caseDef.topScrews.map(([x, z]) => ({ x: x * MM_U - origin[0], z: z * MM_U - origin[1] }))
        : topScrewPoints(width, depth, caseScrews, undefined, boss2),
    ),
    // bottom mount: vít M2 từ trên xuyên lỗ tai plate bắt xuống lỗ ren vấu case dưới (lệch vít case như top mount)
    bottomScrew: name('bot', bottomPts),
    trayScrew: name('tray', trayScrews),
    stabScrew: name('stab', stabScrews),
  }

  // tab gasket (case code 2 mảnh): dải chỉ nằm trên phần tai chui vào hốc vách (từ mặt vách tới đầu tai, = bề ngang dải 4mm); đoạn tai
  // ở khe board – vách để trần cùng màu plate (dải đen lộ ở khe thì nhìn từ trên như mép trước / sau hở, mép trái / phải không có gasket);
  // còn lại từ trong mép plate ra sát mặt vách case
  const tabbed = gasketTabbed(caseDef)
  const gd = tabbed ? GASKET_NOTCH.tab - CASE_MARGIN - 0.02 : undefined
  const gz = tabbed
    ? depth / 2 + CASE_MARGIN + 0.005 + gd! / 2
    : depth / 2 + CASE_MARGIN - GASKET.d / 2
  // plate CAD có tai gasket (Blossom): gasket nằm đúng trên tai
  const gaskets = caseDef.gaskets
    ? caseDef.gaskets.map(([x, z, len, angle]) => ({
        x: x * MM_U,
        z: z * MM_U,
        w: len * MM_U,
        // góc trục dài trên mặt xz (z tới trước) → quay quanh trục y của three là −góc
        rot: -angle,
      }))
    : [-0.375, -0.125, 0.125, 0.375].flatMap((f) => {
        // case nhựa 2 mảnh: hốc tai trong thành rỗng không lấn trụ vít ghép (trụ trong rãnh thành)
        let x = f * width
        if (boss2)
          for (const c of caseScrews) {
            const clear = GASKET.w / 2 + GASKET_NOTCH.gap + ABS_SHELL.bossR + 0.06
            if (Math.abs(x - c.x) < clear) x = c.x + Math.sign(x - c.x || f) * clear
          }
        return [
          { x, z: -gz, d: gd },
          { x, z: gz, d: gd },
        ]
      })

  const feet = feetPockets(
    caseModelOf(caseDef, order.layout, order.variant),
    width,
    depth,
    origin,
    caseWall(caseDef),
  )

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
    dtb,
    battery,
    screwSide,
    pcbType: inv.pcb!.type,
    plateless,
  }
  cache.set(ck, ctx)
  return ctx
}

/**
 * Case 1 mảnh chơi layout có khe 2 góc hàng dưới (HHKB / True HHKB, 40% kiểu HHKB): khối chặn 2 góc hàng dưới đúc liền case từ sàn lên (case trên không có để úp xuống) → PCB + plate
 * (+ foam) cắt 2 góc đó (chừa khe `CASE_MARGIN`) cho board thả từ trên xuống không vướng. Case 2 mảnh: khối chặn thuộc case trên,
 * PCB chữ nhật. Trả đa giác viền (toạ độ phím, z tới trước) hoặc undefined
 */
export function cornerCutOutline(
  keys: Key[],
  width: number,
  depth: number,
  caseDef: Pick<CaseDef, 'pieces' | 'plateModel'>,
  layout: LayoutId,
): [number, number][] | undefined {
  if (caseDef.pieces === 2 || caseDef.plateModel || layout === 'alice') return undefined
  const hw = width / 2
  const hd = depth / 2
  const c = CASE_MARGIN
  // khe chạm mép trước + mép trái / phải (góc hàng dưới)
  const gaps = blockerGaps(keys, width, depth, 0).filter((g) => g.z + g.d / 2 > hd - 0.01)
  const left = gaps.find((g) => g.x - g.w / 2 < -hw + 0.01)
  const right = gaps.find((g) => g.x + g.w / 2 > hw - 0.01)
  if (!left && !right) return undefined
  const pts: [number, number][] = [
    [-hw, -hd],
    [hw, -hd],
  ]
  if (right) {
    const x = right.x - right.w / 2 - c
    const z = right.z - right.d / 2 - c
    pts.push([hw, z], [x, z], [x, hd])
  } else pts.push([hw, hd])
  if (left) {
    const x = left.x + left.w / 2 + c
    const z = left.z - left.d / 2 - c
    pts.push([x, hd], [x, z], [-hw, z])
  } else pts.push([-hw, hd])
  return pts
}

/** Vít tray: nằm ở khe giữa các hàng phím (chỗ trụ đồng / trụ nhựa trên sàn case) */
function trayPoints(
  keys: Key[],
  width: number,
  depth: number,
  mount: string,
  layout: LayoutId,
  outline: BuildContext['outline'],
): Point[] {
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
  // lỗ plate cho vít tray lọt qua phải nằm trên phần plate liền, không chạm lỗ switch / stab
  const cutouts = mount === 'tray' ? plateCutoutsFor(layout, keys, outline) : []
  const bad = (x: number, z: number) =>
    blocked(x, z) || !clearOfCutouts(cutouts, x, z, TRAY_HOLE.plate)
  const placed = trayRaw.map((p) => {
    // dời ngang dần vào giữa; dải chắn chạy hết bề ngang (giữa hàng F và hàng số) thì dời sang khe hàng kế tiếp
    for (let dz = 0; dz <= 3; dz++) {
      const z = p.z + dz * (p.z < 0 ? 1 : -1) * 0.5
      let x = p.x
      for (let i = 0; i < 40 && bad(x, z); i++) x -= Math.sign(x || 1) * 0.25
      if (!bad(x, z)) return { ...p, x, z }
    }
    return null
  })
  // không tìm được chỗ plate liền thì bỏ vít đó (trụ đồng / lỗ khoét / vít luôn trùng nhau), bỏ hết thì giữ chỗ gốc
  const found = placed.filter((p) => p !== null)
  return found.length ? found : trayRaw
}

/**
 * Vít ghép case 2 mảnh: mica xếp lớp bắt xuyên qua viền (lỗ xuyên mọi lớp, bắt từ trên hoặc từ đáy đều được),
 * case nhôm / PC / acrylic 2 mảnh bắt từ đáy lên case trên (lỗ ở đáy)
 */
export function caseScrewPoints(
  width: number,
  depth: number,
  screwSide: 'top' | 'bottom',
  wall = CASE_WALL,
  boss = false,
): Point[] {
  // vít ăn vào giữa thành case (bắt từ đáy: xuyên thành case dưới, ăn lên thành case trên; mica: xuyên mọi lớp);
  // case nhựa 2 mảnh (`boss`): vít bắt vào trụ nhỏ trong rãnh thành rỗng (giữa thành), cỡ 40% chỉ 4 vít (2 mỗi bên)
  const outerZ = depth / 2 + CASE_MARGIN + wall / 2
  const n = boss && width < 13 ? 2 : width > 16 ? 5 : 3
  const out: Point[] = []
  for (let i = 0; i < n; i++) {
    // bắt từ đáy: 2 vít đầu hàng lùi vào thêm cho khỏi chạm hốc feet ở 4 góc
    const x = (i / (n - 1) - 0.5) * (width - (screwSide === 'top' ? 1 : 1.8))
    out.push({ x, z: -outerZ }, { x, z: outerZ })
  }
  return out
}

/** dời x khỏi lỗ chân stab gần mép board (trụ / vấu nhựa trong lòng case khoét rãnh PCB, không được cắt vào lỗ stab) */
function dodgeStabs(x: number, z: number, keys: Key[]) {
  const holes = keys.filter((k) => k.stab).flatMap(stabHoles)
  const near = (xx: number) =>
    holes.some(
      (h) =>
        Math.abs(h.x - xx) < ABS_BOSS.r + h.r + 0.08 && Math.abs(h.z - z) < ABS_BOSS.r + h.r + 0.08,
    )
  for (let i = 0; i < 20 && near(x); i++) x -= Math.sign(x || 1) * 0.2
  return x
}

/** đầu ốc M2 bottom mount nằm trên mặt plate: không chồm lên lỗ switch / stab (u) */
const BOSS_HEAD_CLEAR = ABS_SCREW.headR / 19.05 + 0.01

/** vấu bottom mount case nhựa 2 mảnh: dò x gần nhất (lệch dần 2 phía) lọt khe giữa 2 lỗ switch + né lỗ chân stab PCB */
function bossSpot(x0: number, z: number, keys: Key[], cuts: [number, number][][]) {
  const ok = (x: number) =>
    dodgeStabs(x, z, keys) === x && clearOfCutouts(cuts, x, z, BOSS_HEAD_CLEAR)
  for (let i = 0; i <= 200; i++) {
    const x = x0 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.01
    if (ok(x)) return x
  }
  return dodgeStabs(x0, z, keys)
}

/** vít ghép case nhựa 2 mảnh: trụ nhỏ trong rãnh thành rỗng trước / sau (40%: 4 vít), không lấn vào lòng case */
const absCaseScrews = (width: number, depth: number) =>
  caseScrewPoints(width, depth, 'bottom', ABS_WALL_2, true)

/**
 * Vít top mount (u): mỗi cạnh trước / sau 1 vít nhiều hơn vít case, rải đều, lệch khỏi vít case (hốc tai plate
 * khoét trong thành case trên không cắt vào lỗ ren vít case)
 */
function topScrewPoints(
  width: number,
  depth: number,
  caseScrews: Point[],
  /** case nhựa 2 mảnh bottom mount: né lỗ switch / stab plate + lỗ chân stab PCB */
  boss?: { keys: Key[]; cuts: [number, number][][] },
  /** case nhựa 2 mảnh (top / bottom mount): tâm vít trong hốc vách cách mặt trong vách `ABS_TOP.z` */
  absTop = false,
): Point[] {
  const n = (width > 16 ? 5 : 3) + 1
  // case nhựa 2 mảnh: hốc tai không lấn vào trụ vít ghép trong rãnh thành
  const clear = absTop
    ? TOP_TAB / 2 + TOP_NOTCH.gap + ABS_SHELL.bossR + 0.05
    : boss
      ? 2 * ABS_BOSS.r + 0.1
      : TOP_TAB / 2 + TOP_NOTCH.gap + CASE_BORE.tap + 0.1
  const z = absTop
    ? depth / 2 + CASE_MARGIN + ABS_TOP.z
    : boss
      ? depth / 2 + CASE_MARGIN - ABS_BOSS.inset
      : depth / 2 + TOP_HOLE.z
  const xs = Array.from({ length: n }, (_, i) => {
    let x = (i / (n - 1) - 0.5) * (width - 3.2)
    for (const c of caseScrews)
      if (Math.abs(x - c.x) < clear) x = c.x + Math.sign(x - c.x || 1) * clear
    return x
  })
  // case nhựa 2 mảnh: hàng phím trước / sau lệch khe nhau → mỗi bên dò x riêng
  return xs.flatMap((x) =>
    [-z, z].map((zz) => ({ x: boss ? bossSpot(x, zz, boss.keys, boss.cuts) : x, z: zz })),
  )
}

/**
 * Daughterboard ai03 Unified C3 (model `public/models/dtb/unified-c3.glb`, mm): mạch 18 × 16,5 × 1,6; 2 lỗ vít M2 phía trước
 * (±7, +6,25); đầu JST SH 4 pin rộng 6, cao 1,65–4,55 trên đáy mạch, miệng ở z +7,8; cổng USB-C cao 0,65–4,86, mặt ở mép sau
 */
export const DTB_MM = {
  w: 18,
  d: 16.5,
  t: 1.6,
  holes: [
    [-7, 6.25],
    [7, 6.25],
  ] as [number, number][],
  jst: { z: 7.8, y: 3.1 },
  usb: { y: 2.75 },
}
/**
 * Cổng USB-C hàn trên PCB (`CaseDef.pcbUsb`, mm): đầu cái mid-mount mặt dưới PCB, thân `w` × `h` × `d`, miệng nhô khỏi mép sau PCB
 * `out`; tâm cách mép trái (60% / 40%: sau phím Esc) / mép phải (TKL: sau cụm điều hướng) board `x` (u)
 */
export const PCB_USB = { w: 8.94, h: 3.26, d: 7.35, out: 0.6, x: 0.8 }
/** chỗ cổng USB-C trên PCB (u, hệ board): tâm x, mép sau z, tâm cao y (ngay dưới mặt dưới PCB) */
export const pcbUsbSpot = (width: number, depth: number, side: 'left' | 'right' = 'left') => ({
  x: side === 'right' ? width / 2 - PCB_USB.x : -width / 2 + PCB_USB.x,
  z: -depth / 2,
  y: Y.pcbBot - (PCB_USB.h / 2) * MM_U,
})
/** lỗ cổng USB-C khoét xuyên vách sau case (mm): rộng `w`, cao `h`, bo góc `r`, tâm ngang tâm cổng USB-C */
export const USB_PORT_MM = { w: 11.5, h: 5.5, r: 2 }

/**
 * Chỗ đặt DTB. Case dựng bằng code: trên sàn, sát mặt trong vách sau, x gần giữa nhất mà lỗ cổng USB không chạm lỗ vít case
 * trong vách sau (vỏ liền khối khoét lỗ, mica khoét rãnh ở tấm ngang tầm cổng). Case CAD: theo lỗ USB có sẵn trong model
 * (`caseUsb.json`, `node scripts/probe-case-usb.mjs`): model có bệ / trụ bắt ốc DTB sẵn thì nằm đúng đó; không thì tâm cổng
 * USB-C ngang tâm lỗ, mép sau sát mặt trong vách, lỗ cao hơn sàn thì kê trụ đỡ (không nghiêng), không thì nằm trên sàn nghiêng
 */
/** số ốc trên tấm tạ che DTB (`CaseDef.weightScrews`), 0 = tạ không ốc (chỉ nhấc ra) */
export const coverScrews = (ctx: Pick<BuildContext, 'caseDef'>) =>
  ctx.caseDef.weightScrews?.length ?? 0

/** số đo lỗ USB / sàn / bệ DTB của 1 model case CAD (mm, hệ model; xem scripts/probe-case-usb.mjs) */
interface CaseUsb {
  hole: number[]
  inner: number
  floor: number
  slope: number
  mount?: number[]
  groove?: number[][]
  cover?: boolean
}
export function dtbSpot(
  model: string | undefined,
  width: number,
  depth: number,
  origin: [number, number],
  caseScrews: Point[],
  /** khoảng tránh vít ghép theo x (trụ nhựa trong lòng case cần rộng hơn lỗ vít trong thành) */
  screwClear?: number,
  /** mặt sàn trong (case nhựa sàn mỏng thấp hơn) */
  floorTop: number = Y.floorTop,
  /** trụ kê DTB (case nhựa): mặt dưới mạch cao hơn sàn */
  post = 0,
): Omit<DtbSpot, 'jack'> | null {
  if (model) {
    const usb = (CASE_USB as Record<string, CaseUsb>)[model]
    if (!usb) return null
    const [hx, hy] = usb.hole
    const floor = Y.floorBot + usb.floor * MM_U
    // sàn lên dốc về phía trước (+z) → xoay quanh x ngược dấu
    const tilt = -usb.slope
    const groove = usb.groove?.map(
      ([x, y, z]) =>
        [x * MM_U - origin[0], Y.floorBot + y * MM_U, z * MM_U - origin[1]] as [
          number,
          number,
          number,
        ],
    )
    // model có sẵn bệ / trụ bắt ốc DTB: nằm đúng chỗ đó (trên bệ, nghiêng theo sàn), không kê thêm trụ
    if (usb.mount) {
      const [mx, mz] = usb.mount
      return {
        x: mx * MM_U - origin[0],
        z: mz * MM_U - origin[1],
        y: floor,
        tilt,
        floor,
        groove,
        cover: usb.cover,
      }
    }
    // không có bệ: tâm cổng USB-C ngang tâm lỗ, mép sau sát vách; lỗ cao hơn sàn thì kê trụ đỡ (không nghiêng)
    const raised = hy - DTB_MM.usb.y - usb.floor > 0.5
    return {
      x: hx * MM_U - origin[0],
      z: (usb.inner + DTB_MM.d / 2) * MM_U - origin[1],
      y: raised ? Y.floorBot + (hy - DTB_MM.usb.y) * MM_U : floor,
      tilt: raised ? 0 : tilt,
      floor,
      groove,
      cover: usb.cover,
    }
  }
  const z = -(depth / 2 + CASE_MARGIN) + (DTB_MM.d / 2) * MM_U
  const clear = screwClear ?? (USB_PORT_MM.w / 2) * MM_U + CASE_BORE.thru + 0.1
  const back = caseScrews.filter((p) => p.z < 0)
  let x = 0
  for (let i = 0; i < 40 && back.some((p) => Math.abs(p.x - x) < clear); i++) x += 0.25
  return x < width / 2 - 1 ? { x, z, y: floorTop + post, tilt: 0, floor: floorTop } : null
}

/** jack JST trên PCB lệch so với DTB khi case không có rãnh dây (u): sang phải + tới trước */
const JACK_OFFSET = { dx: 0, dz: 0.4 }
/**
 * vùng cấm quanh mỗi phím (hệ phím, u). Cứng (`hard`, không được chạm): socket hotswap + pad (tâm lệch 0,05 / 0,1, rộng 0,5 + pad ±0,3)
 * và lỗ chân switch quanh tâm. Mềm (`soft`, cố tránh): khung footprint in trên mạch (±0,354u, `PcbSurface`) + nhãn "SWxx" dưới khung —
 * layout không khe hàng (60%) thì không chỗ nào tránh hết được khung, chọn chỗ chạm ít nhất (thường là góc giao 4 phím)
 */
const KEY_HARD = { x0: -0.33, x1: 0.43, z0: -0.22, z1: 0.26 }
const KEY_SOFT = { x0: -0.38, x1: 0.38, z0: -0.38, z1: 0.47 }
/** điểm mẫu thân jack + đầu cắm (hệ jack, u; miệng ở gốc quay −z): thân 6 × 4,2mm phía +z, đầu cắm + dây ló ra phía −z */
const JACK_SAMPLES = [-0.16, 0, 0.16].flatMap((x) =>
  [-0.2, -0.08, 0.04, 0.14, 0.23].map((z) => [x, z]),
)

/**
 * Chỗ jack JST trên PCB: thử từ chỗ muốn đặt (đầu rãnh dây, không có thì ngay trước DTB `JACK_OFFSET`) ra các vòng xa dần (≤ 2,5u),
 * mỗi chỗ 4 hướng xoay (ưu tiên miệng quay về DTB). Không được chạm vùng cấm cứng (socket / chân switch / lỗ stab) và phải nằm
 * trong PCB; trong các chỗ hợp lệ chọn chỗ chạm khung footprint (mềm) ít nhất, rồi gần chỗ muốn đặt nhất
 */
function jackSpot(dtb: Omit<DtbSpot, 'jack'>, keys: Key[]): DtbSpot['jack'] {
  const end = dtb.groove?.[dtb.groove.length - 1]
  const want = end
    ? { x: end[0], z: end[2] }
    : { x: dtb.x + JACK_OFFSET.dx, z: dtb.z + DTB_MM.jst.z * MM_U + JACK_OFFSET.dz }
  return placeJack(want, dtb, keys)
}

/**
 * Tìm chỗ jack trên PCB quanh `want`, miệng ưu tiên quay về `toward` (DTB / pin); `block` = vùng cấm thêm (jack khác, mặt pin
 * ngay dưới PCB)
 */
function placeJack(
  want: { x: number; z: number },
  toward: { x: number; z: number },
  keys: Key[],
  block?: (x: number, z: number) => boolean,
  /** phạt mỗi điểm mẫu chạm khung footprint (u đi xa tương đương): DTB 1,2 (tránh hẳn), jack pin nhỏ (ưu tiên sát pin) */
  softCost = 1.2,
): DtbSpot['jack'] {
  const dtb = toward
  const x0 = Math.min(...keys.map((k) => k.cx - k.w / 2)) + 0.05
  const x1 = Math.max(...keys.map((k) => k.cx + k.w / 2)) - 0.05
  const z0 = Math.min(...keys.map((k) => k.cz - k.h / 2)) + 0.05
  const z1 = Math.max(...keys.map((k) => k.cz + k.h / 2)) - 0.05
  const holes = keys.filter((k) => k.stab).flatMap(stabHoles)
  /** điểm (px, pz) rơi vào vùng nào: 2 = cứng (hoặc ra ngoài PCB), 1 = khung footprint, 0 = trống */
  const hit = (px: number, pz: number) => {
    if (px < x0 || px > x1 || pz < z0 || pz > z1) return 2
    if (block?.(px, pz)) return 2
    if (holes.some((h) => Math.hypot(px - h.x, pz - h.z) < h.r + 0.06)) return 2
    let soft = 0
    for (const k of keys) {
      const dx = px - k.cx
      const dz = pz - k.cz
      if (Math.abs(dx) > 0.6 || Math.abs(dz) > 0.6) continue
      const lx = dx * Math.cos(k.rot) - dz * Math.sin(k.rot)
      const lz = dx * Math.sin(k.rot) + dz * Math.cos(k.rot)
      const inside = (o: typeof KEY_HARD) => lx > o.x0 && lx < o.x1 && lz > o.z0 && lz < o.z1
      if (inside(KEY_HARD)) return 2
      if (inside(KEY_SOFT)) soft = 1
    }
    return soft
  }
  /** số điểm mẫu chạm khung footprint, -1 = chạm vùng cứng */
  const cost = (x: number, z: number, ry: number) => {
    let soft = 0
    for (const [jx, jz] of JACK_SAMPLES) {
      const h = hit(
        x + jx * Math.cos(ry) + jz * Math.sin(ry),
        z - jx * Math.sin(ry) + jz * Math.cos(ry),
      )
      if (h === 2) return -1
      soft += h
    }
    return soft
  }
  // giữ trong object: TS không theo được phép gán trong vòng lặp lồng (coi `best` luôn null)
  const pick: { best: (DtbSpot['jack'] & { score: number }) | null } = { best: null }
  for (let r = 0; r <= 2.5; r += 0.05) {
    const n = r === 0 ? 1 : Math.max(8, Math.round((2 * Math.PI * r) / 0.05))
    for (let i = 0; i < n; i++) {
      const x = want.x + r * Math.cos((i / n) * 2 * Math.PI)
      const z = want.z + r * Math.sin((i / n) * 2 * Math.PI)
      // miệng quay về phía DTB: hướng miệng (−sin ry, −cos ry) = hướng tới DTB; jack nằm thẳng theo lưới PCB (bội số 90°)
      const face =
        Math.round(Math.atan2(-(dtb.x - x), -(dtb.z - z)) / (Math.PI / 2)) * (Math.PI / 2)
      for (const [t, turn] of [0, Math.PI / 2, -Math.PI / 2, Math.PI].entries()) {
        const ry = face + turn
        const c = cost(x, z, ry)
        if (c < 0) continue
        // chạm khung footprint nặng hơn hẳn đi xa thêm 1u
        const score = c * softCost + t * 0.15 + r
        if (!pick.best || score < pick.best.score) pick.best = { x, z, ry, score }
      }
    }
    // đã có chỗ không chạm khung nào: đi xa hơn chỉ tệ hơn
    if (pick.best && pick.best.score < r + 0.5) break
  }
  if (!pick.best) return { ...want, ry: 0 }
  const { x, z, ry } = pick.best
  return { x, z, ry }
}

/** lỗ bắt vít case ở đáy / xuyên lớp mica (u, ~M2.5 + đầu vít) */
export const SCREW_HOLE_R = 0.1

/** kiểu đầu ốc theo bước vặn: đầu bằng (chữ thập / lục giác / dẹt) / đầu trụ lục giác chìm / đầu tròn */
export type ScrewHead = 'countersunk' | 'socket' | 'button'
export const SCREW_HEADS: Record<ScrewStep, ScrewHead> = {
  caseOpen: 'countersunk',
  stabScrew: 'button',
  // top mount: ốc M2 ngắn bắt tai plate vào case trên (model M2×6 rút còn M2×4)
  topScrew: 'socket',
  bottomScrew: 'socket',
  trayScrew: 'socket',
  // cùng bộ ốc lúc tháo case (caseOpen) vặn lại: cùng kiểu đầu ốc
  caseScrew: 'countersunk',
}
/** cỡ đầu ốc model (mm): bán kính đầu `r`, cao đầu `h` */
const HEAD_MM: Record<ScrewHead, { r: number; h: number }> = {
  countersunk: { r: 3, h: 1.65 },
  socket: { r: 1.9, h: 2 },
  button: { r: 2.85, h: 1.65 },
}

/**
 * Lỗ vít case 2 mảnh bắt từ đáy (u): lỗ xuyên thành case dưới `thru`, lỗ ren ở mặt dưới thành case trên `tap` sâu `tapDepth`.
 * Miệng lỗ theo đầu ốc (`caseHeadHole`): đầu bằng → hốc côn 90° (countersink), đầu trụ / đầu tròn → hốc trụ âm (counterbore)
 */
export const CASE_BORE = { thru: 1.7 / 19.05, tap: 1.25 / 19.05, tapDepth: 0.16 }
/** khe hở quanh đầu ốc trong hốc (mm) */
const HEAD_GAP = 0.2
/** miệng lỗ cho đầu ốc vít case: `r` bán kính ở mặt case, `depth` sâu (đầu bằng: côn 90° từ r xuống bằng lỗ xuyên) */
export function caseHeadHole(head: ScrewHead = SCREW_HEADS.caseOpen) {
  const { r, h } = HEAD_MM[head]
  if (head === 'countersunk') {
    const rr = (r + HEAD_GAP) / 19.05
    return { sink: true, r: rr, depth: rr - CASE_BORE.thru }
  }
  return { sink: false, r: (r + HEAD_GAP) / 19.05, depth: (h + 0.3) / 19.05 }
}
/** case 2 mảnh dựng bằng code bắt vít từ đáy (case CAD theo model, mica bắt từ trên xuyên lớp) */
export const boredCase = (c: {
  pieces: 1 | 2
  model?: string
  material: string
  screwSide?: 'top' | 'bottom'
}) => c.pieces === 2 && !c.model && c.material !== 'mica' && (c.screwSide ?? 'bottom') === 'bottom'
/** hốc côn đầu vít M2 case nhựa 2 mảnh (như `caseHeadHole` đầu bằng, cỡ M2) */
const m2HeadHole = () => {
  const rr = (ABS_SCREW.headR + HEAD_GAP) / 19.05
  return { sink: true, r: rr, depth: rr - ABS_SCREW.thru }
}
/** cao độ mặt tì đầu vít case: mica bắt từ trên mặt case; bắt từ đáy: đầu bằng phẳng mặt đáy, đầu trụ chìm dưới đáy hốc trụ */
export const caseScrewY = (c: Parameters<typeof boredCase>[0]) => {
  if (c.screwSide === 'top') return Y.caseTop
  const hole = caseHeadHole()
  return caseFloorBot(c) + (boredCase(c) && !hole.sink ? hole.depth : 0)
}
/** thân ren dài thêm của vít case (u): mica xuyên mọi lớp tới gần tấm đáy; bắt từ đáy xuyên thành case dưới ăn lên case trên */
export const caseScrewShaft = (c: Parameters<typeof boredCase>[0]) =>
  c.material === 'mica' && c.screwSide === 'top'
    ? Y.caseTop - Y.floorBot - 0.06
    : boredCase(c)
      ? Y.split - caseScrewY(c) + CASE_BORE.tapDepth
      : 0
/**
 * lỗ khoan vào vỏ case 2 mảnh bắt từ đáy (khớp `WallBore` trong caseShell): case dưới (miệng lỗ theo đầu ốc + lỗ xuyên) /
 * case trên (lỗ ren). `r1` = bán kính ở y1 (hốc côn)
 */
export function caseBores(c: Parameters<typeof boredCase>[0], screws: Point[]) {
  if (!boredCase(c)) return { bottom: [], top: [] }
  // case nhựa 2 mảnh: vít M2 nhỏ (lỗ xuyên / ren / hốc côn đầu ốc theo `ABS_SCREW`)
  const m2 = absTwo(c as { material: string; model?: string; pieces: 1 | 2 })
  const B = m2 ? { ...CASE_BORE, thru: ABS_SCREW.thru, tap: ABS_SCREW.tap } : CASE_BORE
  const hole = m2 ? m2HeadHole() : caseHeadHole()
  const fb = caseFloorBot(c)
  const y0 = fb - 0.02
  return {
    bottom: screws.flatMap(({ x, z }) => [
      // nhựa: lỗ xuyên khay đáy, phía trên là trụ nhựa có lỗ sẵn
      { x, z, r: B.thru, y0, y1: m2 ? fb + ABS_FLOOR + 0.02 : Y.split + 0.02 },
      hole.sink
        ? // côn 90°: lùi xuống dưới mặt đáy 0.02 thì bán kính cũng nở thêm 0.02
          { x, z, r: hole.r + 0.02, r1: B.thru, y0, y1: fb + hole.depth }
        : { x, z, r: hole.r, y0, y1: fb + hole.depth },
    ]),
    // nhựa: ren nằm trong trụ case trên (ren đồng cấy), không khoan vào vỏ
    top: (m2 ? [] : screws).map(({ x, z }) => ({
      x,
      z,
      r: B.tap,
      y0: Y.split - 0.02,
      y1: Y.split + B.tapDepth,
    })),
  }
}

/**
 * Lỗ vít case 2 mảnh để khoét vào vỏ: bắt từ đáy → hốc đầu vít ở mặt đáy (sâu như hốc feet);
 * mica bắt từ trên → lỗ xuyên viền mọi lớp (dùng chung danh sách, sâu không dùng)
 */
export function caseScrewHoles(
  caseDef: { pieces: 1 | 2; screwSide?: 'top' | 'bottom'; model?: string },
  width: number,
  depth: number,
): FootPocket[] {
  // case CAD: lỗ vít có sẵn trong model
  if (caseDef.pieces !== 2 || caseDef.model || (caseDef.screwSide ?? 'bottom') === 'bottom')
    return []
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
  wall = CASE_WALL,
): FootPocket[] {
  const pockets = model ? (CASE_FEET as Record<string, number[][]>)[model] : undefined
  if (pockets)
    return pockets.map(([x, z, r, d, f = 0]) => ({
      x: x * MM - origin[0],
      z: z * MM - origin[1],
      r: r * MM,
      depth: d * MM,
      floor: f * MM,
    }))
  const W = width + 2 * (CASE_MARGIN + wall)
  const D = depth + 2 * (CASE_MARGIN + wall)
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
/**
 * nửa khoảng cách 2 chân stab (u) theo datasheet Cherry: 2–2.75u 23,876mm (±0,62u); 3u / 6u / 6.25u đặt cách mép 0,5u
 * ((cỡ − 1) / 2: 3u ±1u = 38,1mm, 6.25u ±2,625u = 100mm); ≥ 7u (space 7u / 10u) dùng dây 7u 114,3mm (±3u)
 */
export const stabSpan = (k: Key) => {
  const len = Math.max(k.w, k.h)
  return len >= 7 ? 3 : len >= 3 ? (len - 1) / 2 : 0.62
}

const MM_U = 1 / 19.05
/** lỗ switch trên plate 14mm; lỗ stab Cherry ~7mm dọc theo phím × 13mm ngang phím */
export const PLATE_CUT = { switch: 14 * MM_U, stabAlong: 7 * MM_U, stabAcross: 13 * MM_U }
/**
 * tray mount: vít bắt từ trên xuống, lọt qua lỗ plate (rộng hơn đầu ốc r 1,9mm), đầu ốc chìm tì mặt PCB,
 * thân xuyên PCB (lỗ vừa thân M2) vào trụ đồng
 */
export const TRAY_HOLE = { pcb: 1.1 * MM_U, plate: 2.4 * MM_U }

/** lỗ cắt plate của 1 phím ([x, z] theo u, chữ nhật xoay theo `rot`): lỗ switch + 2 lỗ stab */
export function keyCutouts(k: Key): [number, number][][] {
  const rect = (x: number, z: number, hx: number, hz: number): [number, number][] => {
    const c = Math.cos(k.rot)
    const s = Math.sin(k.rot)
    return [
      [-hx, -hz],
      [-hx, hz],
      [hx, hz],
      [hx, -hz],
    ].map(([dx, dz]) => [x + dx * c + dz * s, z - dx * s + dz * c])
  }
  const loops = [rect(k.cx, k.cz, PLATE_CUT.switch / 2, PLATE_CUT.switch / 2)]
  if (!k.stab) return loops
  // 2 lỗ stab hai bên switch, dọc theo chiều dài phím (phím dọc như Enter numpad thì theo z)
  const s = stabSpan(k)
  const vertical = k.h >= 2
  const [along, across] = [PLATE_CUT.stabAlong / 2, PLATE_CUT.stabAcross / 2]
  for (const side of [-1, 1]) {
    // lệch dọc theo trục phím rồi xoay theo phím
    const [ox, oz] = vertical ? [0, side * s] : [side * s, 0]
    const x = k.cx + ox * Math.cos(k.rot) + oz * Math.sin(k.rot)
    const z = k.cz - ox * Math.sin(k.rot) + oz * Math.cos(k.rot)
    loops.push(vertical ? rect(x, z, across, along) : rect(x, z, along, across))
  }
  return loops
}

/** lỗ cắt plate dùng để dò chỗ khoét vít tray: plate universal (gộp mọi variant) nếu có, không thì theo phím */
export const plateCutoutsFor = (layout: string, keys: Key[], outline?: unknown) =>
  // Enter ISO / Big-ass (phím chữ L): switch Enter lệch chỗ ANSI → plate universal không khớp, cắt theo phím
  (!outline && !keys.some((k) => k.ext || k.code === 'IntlBackslash') && plateUniversal[layout]) ||
  keys.flatMap(keyCutouts)

/** vòng tròn tâm (x, z) bán kính r không chạm lỗ cắt nào (không nằm trong lỗ, cách mọi cạnh ≥ r) */
export function clearOfCutouts(loops: [number, number][][], x: number, z: number, r: number) {
  return loops.every((loop) => {
    let inside = false
    for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
      const [ax, az] = loop[i]
      const [bx, bz] = loop[j]
      if (az > z !== bz > z && x < ((bx - ax) * (z - az)) / (bz - az) + ax) inside = !inside
      // khoảng cách tới cạnh ab
      const dx = bx - ax
      const dz = bz - az
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)))
      if (Math.hypot(x - ax - t * dx, z - az - t * dz) < r) return false
    }
    return !inside
  })
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
    case 'bottomScrew':
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
      // xong khi đã đóng hết switch lại (hoặc bỏ qua / xong sớm: lubeDone)
      return [b.lubeDone || (b.swClosed ?? 0) >= ctx.keys.length ? 1 : 0, 1]
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
    case 'caseFoam':
      return [b.caseFoam ? 1 : 0, 1]
    case 'dtb':
      // đặt DTB (lỗ ren trên sàn để trống, 2 vít M2 nằm sẵn trên khay) → siết 2 vít → cắm dây
      return [
        (b.dtb?.placed ? 1 : 0) + count(b.dtb?.screws ?? {}) + (b.dtb?.plugged ? 1 : 0),
        2 + DTB_MM.holes.length,
      ]
    case 'coverOff':
      return [count(b.cover?.out ?? {}) + (b.cover?.off ? 1 : 0), coverScrews(ctx) + 1]
    case 'coverOn':
      return [(b.cover?.on ? 1 : 0) + count(b.cover?.tight ?? {}), coverScrews(ctx) + 1]
    case 'jst':
      return [b.jst ? 1 : 0, 1]
    case 'battery':
      // đặt pin vào hốc → cắm dây vào jack PCB
      return [(b.battery ? 1 : 0) + (b.battery?.plugged ? 1 : 0), 2]
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

// Các bước không cho lật bàn phím (đang ở bàn mod / chưa có bàn phím hoàn chỉnh); `dtb` lật được (chỉ có case, xem đáy / lỗ USB)
export const NO_FLIP_STEPS: StepId[] = [
  'unbox',
  'pack',
  'stabMod',
  'caseFoam',
  'switchLube',
  'coverOff',
  'coverOn',
  'jst',
  'battery',
  'caseIn',
  'caseClose',
  'topCase',
]

// Case 2 mảnh: case trên đang lơ lửng chờ úp / đậy thì Q lật riêng case trên (xem mặt trong), board đứng yên
export const TOP_FLIP_STEPS: StepId[] = ['topCase', 'caseClose']

// Các bước tự lật bàn phím để thao tác ở mặt đáy
export function autoFlip(step: StepId, ctx: BuildContext) {
  // top mount (`topScrew`) không tự lật: người chơi úp case trên xong tự lật (Q / bấm case) mới vặn được
  if (step === 'solder' || step === 'stabScrew' || step === 'feet') return true
  return (step === 'caseOpen' || step === 'caseScrew') && ctx.screwSide === 'bottom'
}

/** case có hốc pin Li-Po: dựng bằng code, nhựa (ABS / PC) hoặc nhôm (kể cả nắp PC đáy nhôm), cỡ ≤ 60% */
export const batteryCase = (c: CaseDef) =>
  !c.model &&
  (c.ff === '40' || c.ff === '60') &&
  (isPlasticCase(c) || ['anod', 'ecoat'].includes(c.bottom?.material ?? c.material))

/** chừa quanh pin trong hốc (u, ~1mm mỗi bên) */
const BAT_PAD = 0.05
/** hốc pin cách mép board (≈ mặt trong vách, u): chừa trụ O-ring / vấu gasket / trụ vít nhựa sát vách */
const BAT_WALL = 0.3
/** jack JST PH pin treo dưới PCB cao (u, 3,2mm, khớp `JACK` trong Battery.tsx) */
export const BAT_JACK_H = 3.2 * MM_U
/** mặt trên pin (u): thấp hơn đáy jack pin (jack nằm ngay trên pin, sát đầu dây) + khe 0,02 — cũng dưới đáy socket hotswap */
const BAT_TOP = Y.pcbBot - BAT_JACK_H - 0.02

/** cỡ pin (u): cạnh dài theo x `l`, cạnh ngắn theo z `w` */
export const batterySize = (id: string) => {
  const b = SUPPLIES[id]?.battery
  return b ? { l: b.l * MM_U, w: b.w * MM_U, t: b.t * MM_U } : null
}
/** pin vừa hốc không */
export const batteryFits = (id: string, spot: Pick<BatterySpot, 'w' | 'd'> | null) => {
  const b = batterySize(id)
  return !!b && !!spot && b.l + 2 * BAT_PAD <= spot.w + 1e-6 && b.w + 2 * BAT_PAD <= spot.d + 1e-6
}

/**
 * Hốc pin trên sàn case (u): thử từ pin to nhất (5000mAh) xuống, mỗi cỡ quét lưới tìm chỗ gần giữa case nhất mà
 * nằm trong lòng case (chừa `BAT_WALL`), không đè DTB + dây JST + jack DTB, trụ tray (mọi mount).
 * Đáy hốc: mặt trên pin dưới đáy socket hotswap (case nhôm sàn dày khoét xuống; case nhựa sàn mỏng nằm thẳng trên sàn, bỏ gân).
 * Dây pin ra ở cạnh ngắn phía giữa case (gần DTB), jack JST PH trên PCB ngay ngoài cạnh đó
 */
function batterySpot(
  width: number,
  depth: number,
  keys: Key[],
  dtb: DtbSpot | null,
  posts: Point[],
  floorTop: number,
  usb?: { x: number; z: number },
): BatterySpot | null {
  const hx = width / 2 - BAT_WALL
  const hz = depth / 2 - BAT_WALL
  const dw = (DTB_MM.w / 2) * MM_U + 0.2
  // DTB sát vách sau + dây JST chạy tới trước (tới jack) — chừa cả dải đó
  const dtbZ1 = dtb ? Math.max(dtb.z + (DTB_MM.d / 2) * MM_U + 0.5, dtb.jack.z + 0.35) : 0
  const clash = (x0: number, x1: number, z0: number, z1: number) => {
    if (x0 < -hx || x1 > hx || z0 < -hz || z1 > hz) return true
    if (dtb) {
      const jx0 = Math.min(dtb.x - dw, dtb.jack.x - 0.35)
      const jx1 = Math.max(dtb.x + dw, dtb.jack.x + 0.35)
      if (x1 > jx0 && x0 < jx1 && z0 < dtbZ1) return true
    }
    const near = (p: Point, r: number) =>
      p.x > x0 - r && p.x < x1 + r && p.z > z0 - r && p.z < z1 + r
    if (usb && x0 < usb.x + 0.45 && x1 > usb.x - 0.45 && z0 < usb.z + 0.6) return true
    return posts.some((p) => near(p, 0.2))
  }
  const top = floorTop
  const y = Math.min(floorTop, BAT_TOP - BATTERY_T * MM_U)
  for (const id of [...BATTERY_IDS].reverse()) {
    const b = batterySize(id)!
    const w = b.l + 2 * BAT_PAD
    const d = b.w + 2 * BAT_PAD
    let best: { x: number; z: number; cost: number } | null = null
    for (let x = -hx + w / 2; x <= hx - w / 2 + 1e-6; x += 0.05)
      for (let z = -hz + d / 2; z <= hz - d / 2 + 1e-6; z += 0.05) {
        if (clash(x - w / 2, x + w / 2, z - d / 2, z + d / 2)) continue
        // gần giữa case nhất, hơi lệch về trước (xa DTB)
        const cost = Math.abs(x) + Math.abs(z - 0.3) * 0.5
        if (!best || cost < best.cost) best = { x, z, cost }
      }
    if (!best) continue
    const { x, z } = best
    // dây ra ở cạnh ngắn phía xa DTB (giữa case để trống cho dây JST); jack pin nằm ngay trên pin sát đầu dây,
    // miệng quay ra cạnh pin (đón dây) — gần nhất có thể như PCB không dây thật
    const side: 1 | -1 = x >= (dtb?.x ?? 0) ? 1 : -1
    const edge = x + (side * w) / 2
    const tz = z - d / 4
    const nearDtb = (px: number, pz: number) =>
      !!dtb && Math.hypot(px - dtb.jack.x, pz - dtb.jack.z) < 0.5
    const jack = placeJack(
      { x: edge - side * 0.45, z: tz },
      { x: edge + side, z: tz },
      keys,
      nearDtb,
      0.02,
    )
    return { x, z, w, d, y, top, side, jack }
  }
  return null
}
