import { CASES, SWITCH_KINDS } from '@/data/parts'
import type { Product, ShopCategory, ToolKind } from '@/types'

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

const ffOf = (p: Product) => CASES[p.id.replace(/^case-/, '')]?.ff

/** Bộ lọc của 1 mục Shopii (rỗng: mục không có bộ lọc); chỉ giữ nhóm có sản phẩm */
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
  if (cat === 'tool')
    groups = TOOL_GROUPS.map((g) => ({
      id: g.id,
      label: g.label,
      match: (p) => !!p.tool && g.kinds.includes(p.tool.kind),
    }))
  groups = groups.filter((g) => list.some(g.match))
  return groups.length ? [{ id: 'all', label: 'Tất cả', match: () => true }, ...groups] : []
}
