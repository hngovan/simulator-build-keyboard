import { CASES, KEYCAP_KITS, STAB_MOUNTS, SWITCH_KINDS } from '@/data/parts'
import { LAYOUTS } from '@/data/layouts'
import { SUPPLIES } from '@/data/supplies'
import type { CaseItem, Product, ShopCategory, ToolKind } from '@/types'

export interface ShopFilter {
  id: string
  label: string
  match: (p: Product) => boolean
}

/** tên form factor case */
const FF_LABEL: Record<string, string> = {
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
const FF_ORDER = Object.keys(FF_LABEL)

/** nhóm dụng cụ theo việc dùng */
const TOOL_GROUPS: { id: string; label: string; kinds: ToolKind[] }[] = [
  { id: 'solder', label: 'Hàn', kinds: ['solder', 'desolder', 'spoolHolder', 'tipCleaner'] },
  { id: 'assem', label: 'Lắp ráp', kinds: ['switch', 'keycap', 'screw'] },
  { id: 'mod', label: 'Mod & lube', kinds: ['brush', 'opener', 'clipper'] },
]

// dòng case gộp nhiều chất liệu: cỡ lấy theo case của option đầu (cả dòng cùng cỡ)
const ffOf = (p: Product) => CASES[(p.options[0]?.item as CaseItem | undefined)?.id ?? '']?.ff
const profileOf = (p: Product) => KEYCAP_KITS[p.id.replace(/^kc-/, '')]?.profile

/** nhóm vật tư: thiếc / lube switch / lube stab / lò xo / khác */
function supplyGroup(p: Product) {
  const sp = p.supply ? SUPPLIES[p.supply] : undefined
  if (!sp) return 'Khác'
  if (sp.solder) return 'Thiếc hàn'
  const fit = sp.fit ?? {}
  if (fit.linear || fit.tactile || fit.clicky) return 'Lube switch'
  if (fit.housing || fit.wire) return 'Lube stab'
  if (fit.spring) return 'Dầu lò xo'
  return 'Vật tư khác'
}

/** Nhóm theo 1 khoá của sản phẩm (giữ thứ tự xuất hiện) */
function groupBy(
  list: Product[],
  key: (p: Product) => string | undefined,
  label = (k: string) => k,
) {
  return [...new Set(list.map(key).filter(Boolean) as string[])].map((k) => ({
    id: k,
    label: label(k),
    match: (p: Product) => key(p) === k,
  }))
}

/** Bộ lọc của 1 mục Shopii: mục nào cũng có (không có nhóm riêng thì lọc theo từng sản phẩm); chỉ giữ nhóm có sản phẩm */
export function shopFilters(cat: ShopCategory, list: Product[]): ShopFilter[] {
  let groups: ShopFilter[] = []
  if (cat === 'case')
    groups = [...new Set(list.map(ffOf).filter(Boolean) as string[])]
      .sort((a, b) => FF_ORDER.indexOf(a) - FF_ORDER.indexOf(b))
      .map((ff) => ({ id: ff, label: FF_LABEL[ff] ?? ff, match: (p) => ffOf(p) === ff }))
  if (cat === 'switch')
    groups = Object.values(SWITCH_KINDS).map((kind) => ({
      id: kind,
      label: kind,
      match: (p) => p.badge === kind,
    }))
  if (cat === 'stab')
    groups = Object.values(STAB_MOUNTS).map((mount) => ({
      id: mount,
      label: mount,
      match: (p) => p.badge === mount,
    }))
  if (cat === 'tool')
    groups = TOOL_GROUPS.map((g) => ({
      id: g.id,
      label: g.label,
      match: (p) => !!p.tool && g.kinds.includes(p.tool.kind),
    }))
  // PCB / plate theo layout
  if (cat === 'pcb' || cat === 'plate')
    groups = groupBy(
      list,
      (p) => p.layouts?.[0],
      (l) => LAYOUTS[l as keyof typeof LAYOUTS]?.name ?? l,
    )
  if (cat === 'keycap') groups = groupBy(list, profileOf, (pr) => pr.toUpperCase())
  if (cat === 'supply') groups = groupBy(list, supplyGroup)
  // chứng chỉ, sách phép...: mỗi sản phẩm 1 lựa chọn
  if (!groups.length)
    groups = groupBy(
      list,
      (p) => p.id,
      (id) => list.find((p) => p.id === id)!.name,
    )
  groups = groups.filter((g) => list.some(g.match))
  return groups.length ? [{ id: 'all', label: 'Tất cả', match: () => true }, ...groups] : []
}
