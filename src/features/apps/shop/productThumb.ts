import { stabStock } from '@/data/parts'
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
import type { ThumbKind } from './modelThumb'

/** ảnh stab theo option: chỉ có stab dài 6.25u / 7u thì chụp dây dài, còn lại (bộ, lẻ 2u) chụp stab 2u */
function stabThumbType(item: StabItem) {
  const { short, long, long7 } = stabStock(item)
  return short ? item.type : long ? `${item.type}:6.25u` : long7 ? `${item.type}:7u` : item.type
}

/**
 * Loại + khoá ảnh model 3D của sản phẩm theo option (dùng chung thẻ Shopii và script chụp sẵn `bake:thumbs`);
 * case chụp nguyên bàn phím theo case + màu (`caseKey`)
 */
export function productThumb(product: Product, item?: ProductOption['item']) {
  const kind: ThumbKind | null =
    product.cat === 'switch' ||
    product.cat === 'stab' ||
    product.cat === 'keycap' ||
    product.cat === 'pcb' ||
    product.cat === 'plate'
      ? product.cat
      : product.cat === 'tool' || product.cat === 'cert'
        ? 'tool'
        : (product.cat === 'supply' || product.cat === 'spell') && product.supply
          ? SUPPLIES[product.supply]?.fit
            ? 'lubeJar'
            : 'supply'
          : null
  // keycap: chụp theo bộ (profile) + màu của option đang chọn
  const cap = item as KeycapItem | undefined
  const pcb = item as PcbItem | undefined
  const plate = item as PlateItem | undefined
  const tool = product.tool ?? (item as ToolItem | undefined)
  const type =
    product.cat === 'keycap'
      ? cap && `${cap.kit}:${cap.color}`
      : product.cat === 'pcb'
        ? pcb && `${pcb.layout}:${pcb.type}`
        : product.cat === 'plate'
          ? plate && `${plate.layout}:${plate.material}`
          : product.cat === 'tool' || product.cat === 'cert'
            ? tool && `${tool.kind}:${tool.level}`
            : product.cat === 'supply' || product.cat === 'spell'
              ? ((item as SupplyItem | undefined)?.id ?? product.supply)
              : product.cat === 'stab'
                ? item && stabThumbType(item as StabItem)
                : (item as SwitchItem | StabItem | undefined)?.type
  const caseItem = product.cat === 'case' ? (item as CaseItem | undefined) : undefined
  return { kind, type, caseItem }
}

/** khoá ảnh case (nguyên bàn phím với case + màu), cùng khoá `useCaseThumb` */
export const caseKey = (caseId: string, color: string) => `caseonly:${caseId}:${color}`
