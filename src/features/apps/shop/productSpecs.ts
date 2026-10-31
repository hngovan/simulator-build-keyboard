import { LAYOUTS } from '@/data/layouts'
import {
  CASES,
  CASE_COLORS,
  CASE_MATERIALS,
  KEYCAP_COLORS,
  KEYCAP_KITS,
  KEYCAP_MATERIALS,
  MOUNTS,
  PCB_TYPES,
  PLATES,
  STABS,
  STAB_MOUNTS,
  SWITCHES,
  SWITCH_KINDS,
  TOOLS,
  keycapMaterialOf,
  stabStock,
  stabText,
} from '@/data/parts'
import { SUPPLIES } from '@/data/supplies'
import type {
  CaseItem,
  KeycapItem,
  PcbItem,
  PlateItem,
  Product,
  ProductOption,
  StabItem,
  SupplyItem,
  SwitchItem,
  ToolItem,
} from '@/types'

/** 1 dòng bảng thông số khung xem sản phẩm Shopii: [tên, giá trị] */
export type SpecRow = [string, string]

const yesNo = (b: boolean) => (b ? 'Có' : 'Không')
const layoutNames = (p: Product) => p.layouts?.map((l) => LAYOUTS[l].name).join(', ')

/** Nhãn ngắn dưới tên sản phẩm (khung xem): layout, chất liệu / loại chính */
export function productTags(p: Product, o: ProductOption): string[] {
  const it = o.item
  switch (p.cat) {
    case 'case': {
      const def = CASES[(it as CaseItem).id]
      return [
        ...(p.layouts?.length === 1 ? [`Layout ${LAYOUTS[p.layouts[0]].name}`] : []),
        CASE_MATERIALS[def.material].name,
        def.pieces === 2 ? '2 mảnh' : '1 mảnh',
      ]
    }
    case 'keycap': {
      const cap = it as KeycapItem
      return [
        `Profile ${KEYCAP_KITS[cap.kit].profile.toUpperCase()}`,
        KEYCAP_MATERIALS[keycapMaterialOf(cap)].name,
      ]
    }
    case 'switch':
      return [SWITCH_KINDS[SWITCHES[(it as SwitchItem).type].kind]]
    case 'stab':
      return [STAB_MOUNTS[STABS[(it as StabItem).type].mount]]
    case 'pcb':
      return [
        `Layout ${LAYOUTS[(it as PcbItem).layout].name}`,
        PCB_TYPES[(it as PcbItem).type].name,
      ]
    case 'plate':
      return [`Layout ${LAYOUTS[(it as PlateItem).layout].name}`]
    default:
      return p.badge ? [p.badge] : []
  }
}

/** Bảng thông số theo option đang chọn (đọc thẳng từ dữ liệu linh kiện / vật tư / dụng cụ) */
export function productSpecs(p: Product, o: ProductOption): SpecRow[] {
  const it = o.item
  switch (p.cat) {
    case 'case': {
      const c = it as CaseItem
      const def = CASES[c.id]
      return [
        ['Chất liệu', CASE_MATERIALS[def.material].name],
        ['Màu', CASE_COLORS[c.color]?.name ?? c.color],
        ['Số mảnh', def.pieces === 2 ? '2 mảnh (trên + dưới)' : '1 mảnh'],
        ['Tương thích PCB / plate', layoutNames(p) ?? def.ff],
        ['Kiểu lắp', def.mounts.map((m) => MOUNTS[m].name).join(', ')],
      ]
    }
    case 'pcb': {
      const pcb = it as PcbItem
      return [
        ['Layout', LAYOUTS[pcb.layout].name],
        ['Loại', PCB_TYPES[pcb.type].name],
        ['Ghi chú', PCB_TYPES[pcb.type].desc],
      ]
    }
    case 'plate': {
      const pl = it as PlateItem
      return [
        ['Layout', LAYOUTS[pl.layout].name],
        ['Chất liệu', PLATES[pl.material].name],
      ]
    }
    case 'switch': {
      const sw = SWITCHES[(it as SwitchItem).type]
      return [
        ['Hãng', sw.brand],
        ['Loại', SWITCH_KINDS[sw.kind]],
        ['Lube sẵn', yesNo(sw.prelubed)],
        ['Số con', `${(it as SwitchItem).count} con`],
      ]
    }
    case 'stab': {
      const st = STABS[(it as StabItem).type]
      return [
        ['Hãng', st.brand],
        ['Kiểu gắn', STAB_MOUNTS[st.mount]],
        ['Lube sẵn', yesNo(st.prelubed)],
        ['Gồm', stabText(stabStock(it as StabItem))],
      ]
    }
    case 'keycap': {
      const cap = it as KeycapItem
      const kit = KEYCAP_KITS[cap.kit]
      return [
        ['Profile', kit.profile.toUpperCase()],
        ['Chất liệu', KEYCAP_MATERIALS[keycapMaterialOf(cap)].name],
        ['Màu', KEYCAP_COLORS[cap.color]?.name ?? cap.color],
        ['Layout hợp', kit.layouts.map((l) => LAYOUTS[l].name).join(', ')],
      ]
    }
    case 'supply':
    case 'spell': {
      const s = it as SupplyItem
      const def = SUPPLIES[s.id]
      return def ? [['Số lượng', `${s.n} ${def.unit}`]] : []
    }
    case 'tool':
    case 'cert': {
      const t = it as ToolItem
      const def = TOOLS[t.kind][t.level]
      return def?.life ? [['Độ bền', `${def.life} lần dùng`]] : []
    }
    default:
      return []
  }
}
