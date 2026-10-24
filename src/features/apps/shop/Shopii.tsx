import { useMemo, useState } from 'react'
import { Button, Toggle } from '@/components/ui'
import { useGame } from '@/store'
import { SHOP_CATS, buildCatalog } from '@/data/parts'
import { cn } from '@/lib/format'
import type { PartCategory, PartItem, ShopCategory, SupplyItem, ToolItem } from '@/types'
import { ProductCard } from './ProductCard'

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
  const list = catalog.filter(
    (p) =>
      p.cat === cat &&
      (!match || !order || !p.layouts || p.layouts.includes(order.layout)) &&
      // dụng cụ / chứng chỉ đã có (hoặc đã có bản tốt hơn, bút / trạm hàn cất dự phòng) thì không bán nữa
      !(
        p.tool &&
        (tools[p.tool.kind] >= p.tool.level ||
          (p.tool.kind === 'solder' && solderOwned[p.tool.level] !== undefined))
      ),
  )

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
          <Toggle checked={match} onChange={setMatch} label="Chỉ hiện đồ hợp layout đơn" />
          <span className={match ? 'text-ink' : 'text-muted'}>Chỉ hiện đồ hợp layout đơn</span>
        </div>
      </div>
      <div className="grid flex-1 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))] content-start gap-2.5">
        {purchase && (
          <div className="col-span-full">
            <Button size="sm" onClick={undoPurchase}>
              Hoàn tác mua máy hàn · hoàn {purchase.cost}k
            </Button>
          </div>
        )}
        {list.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            onBuy={(p, o) => {
              if (p.cat === 'supply') {
                const it = o.item as SupplyItem
                buySupply(it.id, it.n, o.price)
              } else if (p.cat === 'tool' || p.cat === 'cert') {
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
