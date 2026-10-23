import { useMemo, useState } from 'react'
import { useGame } from '@/store'
import { SHOP_CATS, buildCatalog } from '@/data/parts'
import { cn } from '@/lib/format'
import type { PartCategory, PartItem, ShopCategory, SupplyItem, ToolItem } from '@/types'
import { ProductCard } from './ProductCard'

// Sàn thương mại: linh kiện mới giá niêm yết + vật tư mod
export function Shopii() {
  const catalog = useMemo(buildCatalog, [])
  const order = useGame((s) => s.order)
  const { buy, buySupply, buyTool } = useGame.getState()
  const [cat, setCat] = useState<ShopCategory>('case')
  const [match, setMatch] = useState(true)
  const list = catalog.filter(
    (p) => p.cat === cat && (!match || !order || !p.layouts || p.layouts.includes(order.layout)),
  )

  return (
    <div className="flex min-h-[420px] gap-3 max-md:flex-col">
      <div className="flex w-[150px] shrink-0 flex-col gap-1.5 max-md:w-auto max-md:flex-row max-md:flex-wrap">
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
        <label className="mt-2 flex items-start gap-1.5 text-xs text-muted">
          <input type="checkbox" checked={match} onChange={(e) => setMatch(e.target.checked)} />
          Chỉ hiện đồ hợp layout đơn
        </label>
      </div>
      <div className="grid flex-1 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))] content-start gap-2.5">
        {list.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            onBuy={(p, o) => {
              if (p.cat === 'supply') {
                const it = o.item as SupplyItem
                buySupply(it.id, it.n, o.price)
              } else if (p.cat === 'tool') {
                const it = o.item as ToolItem
                buyTool(it.kind, it.level, o.price)
              } else buy(p.cat as PartCategory, o.item as PartItem, o.price)
            }}
          />
        ))}
        {!list.length && <div className="text-muted">Không có sản phẩm phù hợp</div>}
      </div>
    </div>
  )
}
