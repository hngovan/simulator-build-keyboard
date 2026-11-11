import { isHex } from '@/lib/color'
import { create } from 'zustand'
import { LAYOUTS } from '@/data/layouts'
import {
  caseFits,
  CASES,
  caseTwoTone,
  CLEAR_TAG,
  KEYCAP_KITS,
  KEYCAP_MATERIALS,
  keycapColorsFor,
  mountStabIssue,
  plateIds,
  STABS,
  SWITCHES,
} from '@/data/parts'
import type { FormFactor, KeycapMaterial, LayoutId, SwitchKind, Variant, VariantKey } from '@/types'
import { freeKits, freeLayouts, startFreeBuild } from './freeBuild'

// Lựa chọn của bảng Free build (`FreeBuildDialog`): 1 store nhỏ để mỗi ô bento (`FreeTiles`) + mỗi bảng chọn (`FreePickers`)
// tự đọc phần của mình. Không lưu save; giữ trong phiên để build xong mở lại bảng vẫn còn cấu hình cũ.

/**
 * các ô lựa chọn phụ ở cột phải (lưới bento); bấm ô nào thì cột phải vào màn chọn riêng của ô đó.
 * Loại case (lựa chọn chính) nằm riêng ở cột trái, màu case chọn ngay trên ô (không cần vào màn riêng)
 */
export type TileId = 'layout' | 'mount' | 'pcb' | 'plate' | 'stab' | 'switch' | 'keycap' | 'feet'

/** chất liệu keycap chọn được (mọi bộ đều có PBT / mix / ABS như Shopii) */
export const KC_MATS = Object.keys(KEYCAP_MATERIALS) as KeycapMaterial[]
/** nhóm case theo cỡ từ nhỏ tới lớn (Planck ortho 12 × 4 ngay sau 40%) */
export const FF_ORDER: FormFactor[] = [
  '40',
  'planck',
  '60',
  '65',
  'alice',
  '75',
  'frl',
  'tkl',
  'full',
]
/** tên nhóm cỡ case (đầu nhóm + nút lọc) */
export const FF_NAME: Record<FormFactor, string> = {
  '40': '40%',
  planck: 'Planck',
  '60': '60%',
  '65': '65%',
  alice: 'Alice',
  '75': '75%',
  frl: 'FRL',
  tkl: 'TKL',
  full: 'Full size',
}
export const PLATE_IDS = plateIds()
export const STAB_IDS = Object.keys(STABS)
export const SWITCH_IDS = Object.keys(SWITCHES)

/** chất liệu chọn trong thẻ case dựng bằng code (thứ tự nút) */
export const FINISHES = [
  ['anod', 'Nhôm anod'],
  ['ecoat', 'Nhôm E-coat'],
  ['abs', 'Nhựa ABS'],
  ['pc', 'Nhựa PC'],
  ['pcalu', 'Nắp PC · đáy nhôm'],
  ['wood', 'Gỗ'],
  ['mica', 'Mica'],
  ['acrylic', 'Acrylic'],
] as const
/** chất liệu 1 case trong thẻ: case 2 chất liệu (nắp PC đáy nhôm) tính riêng */
export const finishOf = (id: string) => (CASES[id].bottom ? 'pcalu' : CASES[id].material)
/** kiểu space 40% thuộc nhóm "40% HHKB" (bỏ 2 phím góc hàng dưới) */
export const isHhkb40 = (v?: string) => !!v?.startsWith('hhkb')
/** tên nút layout ở bảng chọn (HHKB là layout 60%) */
export const CHIP_NAME: Partial<Record<LayoutId, string>> = {
  hhkb: '60% HHKB',
  truehhkb: '60% True HHKB',
}
/** tên bộ keycap gọn: bỏ "Full" / "(mọi layout)", chỉ còn profile (Cherry, OEM, SA...) */
export const kitName = (id: string) =>
  KEYCAP_KITS[id].name.replace(/\s*\(.*\)/, '').replace(/\s+Full$/, '')
export const layoutName = (l: LayoutId) => CHIP_NAME[l] ?? LAYOUTS[l].name

/** lựa chọn trong thẻ case dựng bằng code: chất liệu + số mảnh (+ cổng USB) */
export type FamPick = { finish: string; pieces: number; usb?: boolean }
/** 1 dòng trong danh sách case: case CAD lẻ hoặc cả họ case dựng bằng code cùng cỡ (gộp 1 thẻ "Case 60%") */
export type CaseRow = { id: string } | { ff: FormFactor; ids: string[] }

/** case trong họ theo chất liệu + số mảnh; thiếu đúng tổ hợp thì giữ chất liệu (PC chỉ có 2 mảnh), rồi cùng số mảnh */
export const famCase = (ids: string[], { finish, pieces, usb = false }: FamPick) => {
  // cổng USB: daughterboard / cổng C hàn trên PCB (`pcbUsb`, nhôm 1 mảnh 60% / 40% bên trái, TKL bên phải); thiếu thì lấy bản DTB
  const list = ids.filter((id) => !!CASES[id].pcbUsb === usb)
  const pool = list.length ? list : ids.filter((id) => !CASES[id].pcbUsb)
  return (
    pool.find((id) => finishOf(id) === finish && CASES[id].pieces === pieces) ??
    pool.find((id) => finishOf(id) === finish) ??
    pool.find((id) => CASES[id].pieces === pieces) ??
    pool[0] ??
    ids[0]
  )
}

/** danh sách case theo cỡ: thẻ case dựng bằng code (gộp) trước, rồi tới từng case CAD */
export const CASE_GROUPS = FF_ORDER.map((ff) => {
  const ids = Object.keys(CASES).filter((id) => CASES[id].ff === ff)
  const coded = ids.filter((id) => !CASES[id].model)
  const rows: CaseRow[] = [
    ...(coded.length > 1 ? [{ ff, ids: coded }] : coded.map((id) => ({ id }))),
    ...ids.filter((id) => CASES[id].model).map((id) => ({ id })),
  ]
  return { ff, rows }
}).filter((g) => g.rows.length)

export interface FreeForm {
  /** ô lựa chọn phụ đang mở màn chọn riêng; null = lưới ô */
  tile: TileId | null
  /** lọc danh sách switch theo loại ('' = tất cả) */
  swKind: SwitchKind | ''
  /** lọc danh sách case theo cỡ ('' = tất cả) */
  ffFilter: FormFactor | ''
  /** chất liệu + số mảnh đang chọn ở từng thẻ case dựng bằng code (khoá = cỡ case) */
  famSel: Record<string, FamPick>
  pick: { caseId: string; color: string; botColor?: string } | null
  layout: LayoutId | ''
  /** kiểu layout đang chọn (space liền / 7u / split, backspace, hàng dưới...); kiểu không có ở layout thì lấy kiểu đầu */
  variant: Variant
  mount: string
  pcb: string
  plate: string
  stab: string
  sw: string
  kit: string
  kcMat: KeycapMaterial
  kcColor: string
}

export const useFreeForm = create<FreeForm>(() => ({
  tile: null,
  swKind: '',
  ffFilter: '',
  famSel: {},
  pick: null,
  layout: '',
  variant: {},
  mount: '',
  pcb: 'hotswap',
  plate: PLATE_IDS[0],
  stab: STAB_IDS[0],
  sw: SWITCH_IDS[0],
  kit: '',
  kcMat: KC_MATS[0],
  kcColor: keycapColorsFor(KC_MATS[0])[0],
}))
export const setFree = useFreeForm.setState

/** chất liệu + số mảnh của thẻ case dựng bằng code: mặc định nhôm anod (không có thì chất liệu đầu theo thứ tự nút), 2 mảnh */
export const famOf = (f: FreeForm, ff: FormFactor, ids: string[]): FamPick =>
  f.famSel[ff] ?? {
    finish: FINISHES.find(([x]) => ids.some((id) => finishOf(id) === x))?.[0] ?? finishOf(ids[0]),
    pieces: ids.some((id) => CASES[id].pieces === 2) ? 2 : 1,
  }

/** chọn case + màu: layout / mount đang chọn không hợp case mới thì lấy cái đầu tiên hợp */
export function chooseCase(
  caseId: string,
  color: string,
  botColor = useFreeForm.getState().pick?.botColor,
) {
  const f = useFreeForm.getState()
  const def = CASES[caseId]
  // màu case dưới: chỉ giữ khi case 2 mảnh có màu đó
  const bot =
    caseTwoTone(def) && botColor && (isHex(botColor) || def.colors.includes(botColor))
      ? botColor
      : undefined
  const lays = freeLayouts(caseId)
  const ms = CASES[caseId].mounts
  setFree({
    pick: { caseId, color, botColor: bot },
    layout: f.layout && lays.includes(f.layout) ? f.layout : (lays[0] ?? ''),
    mount:
      ms.includes(f.mount) && !mountStabIssue(f.mount, f.stab)
        ? f.mount
        : (ms.find((m) => !mountStabIssue(m, f.stab)) ?? ms[0]),
  })
}

/** bấm vào thẻ case (không bấm ô màu): chọn case đó, giữ màu đang chọn nếu case có màu đó, không thì màu đầu */
export function chooseCaseAuto(caseId: string) {
  const color = useFreeForm.getState().pick?.color
  const colors = CASES[caseId].colors
  chooseCase(caseId, color && (isHex(color) || colors.includes(color)) ? color : colors[0])
}

/** đổi chất liệu / số mảnh ở thẻ case dựng bằng code = chọn luôn case đó (giữ màu nếu có) */
export function setFam(ff: FormFactor, ids: string[], next: FamPick) {
  setFree({ famSel: { ...useFreeForm.getState().famSel, [ff]: next } })
  chooseCaseAuto(famCase(ids, next))
}

/** mở bảng lần đầu: chọn sẵn case 60% đầu tiên để có ngay bàn phím xem trước + bấm Build được luôn */
export function pickDefaultCase() {
  const f = useFreeForm.getState()
  if (f.pick) return
  const row = (CASE_GROUPS.find((g) => g.ff === '60') ?? CASE_GROUPS[0]).rows[0]
  chooseCaseAuto('ids' in row ? famCase(row.ids, famOf(f, row.ff, row.ids)) : row.id)
}

/** stab screw-in: O-ring mount bị cấn → đang chọn O-ring thì về mount khác */
export function chooseStab(stab: string) {
  const f = useFreeForm.getState()
  const m =
    f.pick && mountStabIssue(f.mount, stab)
      ? CASES[f.pick.caseId].mounts.find((x) => !mountStabIssue(x, stab))
      : undefined
  setFree({ stab, ...(m ? { mount: m } : {}) })
}

/** Phần suy ra từ lựa chọn: layout case làm được, kiểu layout còn hợp, bộ keycap, màu keycap... */
export function derive(f: FreeForm) {
  const layouts = f.pick ? freeLayouts(f.pick.caseId) : []
  // Planck (ortho) gộp vào "kiểu space" của 40% (không nút layout riêng) khi case làm được cả 2
  const planckIn40 = layouts.includes('40') && layouts.includes('planck')
  const baseLayout: LayoutId | '' = f.layout === 'planck' && planckIn40 ? '40' : f.layout
  // kiểu layout case đang chọn làm được (HHKB space 10u chỉ case 2 mảnh: `caseFits`)
  const variantOpts = (k: VariantKey, opts: string[]) =>
    f.pick && baseLayout
      ? opts.filter((val) =>
          caseFits(CASES[f.pick!.caseId], baseLayout, { ...f.variant, [k]: val }),
        )
      : opts
  // nút layout "40% HHKB" = layout 40% chỉ với các kiểu space HHKB (bỏ 2 phím góc); nút "40%" = các kiểu còn lại (+ Planck);
  // dữ liệu vẫn là layout '40' + `variant.space`
  const hhkb40 = baseLayout === '40' && f.layout === '40' && isHhkb40(f.variant.space)
  const scopeOpts = (k: VariantKey, opts: string[]) =>
    baseLayout === '40' && k === 'space'
      ? hhkb40
        ? opts.filter(isHhkb40)
        : [...opts.filter((v) => !isHhkb40(v)), ...(planckIn40 ? ['planck'] : [])]
      : opts
  /** kiểu đang chọn thật sự (không hợp case thì kiểu đầu) */
  const curVariant = (k: VariantKey, opts: string[]) => {
    const ok = variantOpts(k, opts)
    return f.variant[k] && ok.includes(f.variant[k]!) ? f.variant[k]! : ok[0]
  }
  const variant: Variant = f.layout
    ? Object.fromEntries(
        (Object.entries(LAYOUTS[f.layout].variants) as [VariantKey, string[]][]).map(
          ([k, opts]) => [k, curVariant(k, opts)],
        ),
      )
    : {}
  // các kiểu layout có > 1 lựa chọn (Planck chỉ còn ô space để đổi về 40%)
  const variantRows = baseLayout
    ? (Object.entries(LAYOUTS[baseLayout].variants) as [VariantKey, string[]][])
        .map(([k, all]) => [k, scopeOpts(k, variantOpts(k, all))] as const)
        .filter(([k, opts]) => opts.length > 1 && (f.layout !== 'planck' || k === 'space'))
    : []
  /** 40% có cả kiểu thường lẫn HHKB → tách 2 nút layout */
  const split40 = variantOpts('space', LAYOUTS['40'].variants.space ?? []).some(isHhkb40)
  const kits = f.layout ? freeKits(f.layout) : []
  const kitId = kits.includes(f.kit) ? f.kit : (kits[0] ?? '')
  // màu keycap theo chất liệu (PC = màu nhuộm trong); đổi chất liệu mà màu không còn bán thì lấy màu đầu
  const kcColors = keycapColorsFor(f.kcMat)
  // màu tự chọn (hex): keycap PC thì gắn đuôi `CLEAR_TAG` = nhựa trong nhuộm màu đó
  const kcColor = isHex(f.kcColor)
    ? f.kcColor + (f.kcMat === 'pc' ? CLEAR_TAG : '')
    : kcColors.includes(f.kcColor)
      ? f.kcColor
      : kcColors[0]
  return {
    layouts,
    planckIn40,
    baseLayout,
    hhkb40,
    split40,
    variantOpts,
    curVariant,
    variant,
    variantRows,
    kits,
    kitId,
    kcColors,
    kcColor,
  }
}

/** bấm nút layout "40%" / "40% HHKB": về layout 40% với kiểu space đầu tiên của nhóm đó */
export function pick40(hhkb: boolean) {
  const f = useFreeForm.getState()
  const opts = derive({ ...f, layout: '40' })
    .variantOpts('space', LAYOUTS['40'].variants.space ?? [])
    .filter((v) => isHhkb40(v) === hhkb)
  setFree({ layout: '40', variant: { ...f.variant, space: opts[0] } })
}

/** vào build với cấu hình đang chọn */
export function buildFree() {
  const f = useFreeForm.getState()
  if (!f.pick || !f.layout) return
  const d = derive(f)
  startFreeBuild({
    ...f.pick,
    layout: f.layout,
    variant: d.variant,
    mount: f.mount,
    pcb: f.pcb,
    plate: f.plate,
    stab: f.stab,
    switchType: f.sw,
    keycapKit: d.kitId,
    keycapColor: d.kcColor,
    keycapMaterial: f.kcMat,
  })
}
