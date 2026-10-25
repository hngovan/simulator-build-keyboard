import { useMemo, useState } from 'react'
import { PackageX } from 'lucide-react'
import { Button, OptionSelect, Toggle, SoundLegend } from '@/components/ui'
import { useGame } from '@/store'
import {
  CASES,
  KEYCAP_KITS,
  SHOP_CATS,
  buildCatalog,
  caseFits,
  keycapMaterialOf,
  switchOk,
} from '@/data/parts'
import { cn } from '@/lib/format'
import type {
  CaseItem,
  KeycapItem,
  PlateItem,
  Order,
  PartCategory,
  PartItem,
  Product,
  ShopCategory,
  SupplyItem,
  ToolItem,
} from '@/types'
import { ProductCard } from './ProductCard'
import { shopFilters } from './shopFilters'

/** Sản phẩm hợp đơn đang làm: đúng layout, keycap đúng profile, switch / case / stab đúng con khách đòi (hoặc đúng loại) */
function fitsOrder(p: Product, order: Order) {
  if (p.layouts && !p.layouts.includes(order.layout)) return false
  if (p.cat === 'keycap' && order.keycapKit)
    return KEYCAP_KITS[p.id.replace(/^kc-/, '')]?.profile === KEYCAP_KITS[order.keycapKit]?.profile
  if (p.cat === 'switch') return switchOk(p.id.replace(/^sw-/, ''), order)
  if (p.cat === 'case' && order.caseId)
    return p.options.some((o) => (o.item as CaseItem).id === order.caseId)
  if (p.cat === 'stab' && order.stabType) return p.id === `stab-${order.stabType}`
  return true
}

/** Option hợp đơn: keycap đúng chất liệu + màu (không còn option nào thì giữ nguyên) */
function fitOptions(p: Product, order: Order): Product {
  // plate: chỉ còn đúng chất liệu khách đòi; case: đúng màu khách đòi
  if (p.cat === 'plate' && order.plateMaterial) {
    const options = p.options.filter((o) => (o.item as PlateItem).material === order.plateMaterial)
    return options.length ? { ...p, options } : p
  }
  if (p.cat === 'case') {
    // dòng case nhiều chất liệu: bỏ chất liệu không vừa layout / không phải con khách đòi, rồi lọc màu
    const fit = p.options.filter((o) => {
      const id = (o.item as CaseItem).id
      return order.caseId ? id === order.caseId : caseFits(CASES[id], order.layout)
    })
    const color = fit.filter((o) => (o.item as CaseItem).color === order.caseColor)
    const options = order.caseColor && color.length ? color : fit
    return options.length ? { ...p, options } : p
  }
  if (p.cat !== 'keycap') return p
  const options = p.options.filter((o) => {
    const it = o.item as KeycapItem
    return (
      it.color === order.keycapColor &&
      (!order.keycapMaterial || keycapMaterialOf(it) === order.keycapMaterial)
    )
  })
  return options.length ? { ...p, options } : p
}

// Sàn thương mại: linh kiện mới giá niêm yết + vật tư mod
export function Shopii() {
  const catalog = useMemo(() => buildCatalog(), [])
  const purchase = useGame((s) => s.lastSolderPurchase)
  const undoPurchase = useGame((s) => s.undoSolderPurchase)
  const order = useGame((s) => s.order)
  const tools = useGame((s) => s.tools)
  const solderOwned = useGame((s) => s.solderOwned)
  const { buy, buySupply, buyTool } = useGame.getState()
  // mục đang xem nằm trong store để chỗ khác mở thẳng đúng mục (vd ô đồ thiếu trên bàn mod)
  const cat = useGame((s) => s.shopCat)
  const setCat = (shopCat: ShopCategory) => useGame.setState({ shopCat })
  const [match, setMatch] = useState(false)
  // bộ lọc trong mục (case theo form factor, switch theo loại, dụng cụ theo nhóm); đổi mục thì về "Tất cả"
  const [filter, setFilter] = useState({ cat, id: 'all' })
  const all = catalog
    .filter(
      (p) =>
        p.cat === cat &&
        (!match || !order || fitsOrder(p, order)) &&
        // dụng cụ / chứng chỉ đã có (hoặc đã có bản tốt hơn, bút / trạm hàn cất dự phòng) thì không bán nữa
        !(
          p.tool &&
          (tools[p.tool.kind] >= p.tool.level ||
            (p.tool.kind === 'solder' && solderOwned[p.tool.level] !== undefined))
        ),
    )
    // bật "hợp đơn": keycap chỉ còn option đúng chất liệu + màu khách đòi
    .map((p) => (match && order ? fitOptions(p, order) : p))
  const filters = shopFilters(cat, all)
  const active = filters.find((f) => f.id === (filter.cat === cat ? filter.id : 'all'))
  const list = active ? all.filter(active.match) : all

  return (
    <div className="flex min-h-[420px] gap-3 max-md:flex-col">
      <div className="flex w-[150px] shrink-0 flex-col gap-1.5 self-start max-md:w-auto max-md:flex-row max-md:flex-wrap md:sticky md:top-0">
        {(Object.entries(SHOP_CATS) as [ShopCategory, string][]).map(([id, name]) => (
          <button
            key={id}
            className={cn(
              'rounded-[10px] px-3 py-2 text-left font-extrabold',
              cat === id ? 'bg-orange shadow-[0_3px_0_#0005]' : 'bg-panel-2',
            )}
            onClick={() => setCat(id)}
          >
            {name}
          </button>
        ))}
        <div className="mt-2 flex items-center gap-2 rounded-[10px] bg-panel-2 px-2.5 py-2 text-xs font-bold">
          <Toggle checked={match} onChange={setMatch} label="Chỉ hiện đồ hợp đơn" />
          <span className={match ? 'text-ink' : 'text-muted'}>Chỉ hiện đồ hợp đơn</span>
        </div>
      </div>
      <div className="relative grid flex-1 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))] content-start gap-2.5">
        {(filters.length > 0 || list.some((p) => p.sound)) && (
          // thanh trên ghim ở đỉnh cửa sổ khi cuộn (bù padding p-3.5 / p-2.5 của thân Window):
          // chú thích 2 thanh âm thanh bên trái, bộ lọc bên phải
          <div className="sticky -top-3.5 z-10 col-span-full -mt-3.5 flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5 bg-panel pt-3.5 pb-1.5 max-md:-top-2.5 max-md:-mt-2.5 max-md:pt-2.5">
            {list.some((p) => p.sound) && <SoundLegend className="md:mr-auto" />}
            {/* bộ lọc dạng ô đổ xuống cho gọn, mỗi dòng kèm số sản phẩm khớp */}
            {filters.length > 0 && (
              <OptionSelect
                className="w-56"
                value={Math.max(
                  0,
                  filters.findIndex((f) => f.id === active?.id),
                )}
                onChange={(i) => setFilter({ cat, id: filters[i].id })}
                options={filters.map((f) => ({
                  label: f.label,
                  note: String(all.filter(f.match).length),
                }))}
              />
            )}
          </div>
        )}
        {purchase && (
          <div className="col-span-full">
            <Button size="sm" onClick={undoPurchase}>
              Hoàn tác mua máy hàn · hoàn {purchase.cost}k
            </Button>
          </div>
        )}
        {list.map((p) => (
          <ProductCard
            // bật / tắt lọc thì số option đổi → chọn lại từ đầu
            key={`${p.id}:${match}`}
            product={p}
            onBuy={(p, o) => {
              if (p.cat === 'supply' || p.cat === 'spell') {
                const it = o.item as SupplyItem
                buySupply(it.id, it.n, o.price)
              } else if (p.cat === 'tool' || p.cat === 'cert') {
                const it = o.item as ToolItem
                buyTool(it.kind, it.level, o.price)
              } else buy(p.cat as PartCategory, o.item as PartItem, o.price)
            }}
          />
        ))}
        {/* không có sản phẩm: icon hết hàng nằm giữa khung sản phẩm */}
        {!list.length && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted">
            <PackageX className="size-16 opacity-70" strokeWidth={1.5} />
            <span className="font-head text-lg font-extrabold">Hết hàng</span>
            <span className="text-xs">Không có sản phẩm phù hợp</span>
          </div>
        )}
      </div>
    </div>
  )
}
