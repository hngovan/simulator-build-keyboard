import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { CircleAlert, Flame, LoaderCircle, PackageX, Search, Truck } from 'lucide-react'
import { Alert, Button, SoundLegend, TabChip, Tooltip } from '@/components/ui'
import { useGame } from '@/store'
import { SHOP_CATS, buildCatalog, stabStock } from '@/data/parts'
import { SALE_EVERY, isSaleDay, nextSaleDay, withSale } from '@/data/sale'
import type {
  PartCategory,
  PartItem,
  Product,
  ShopCategory,
  StabItem,
  SupplyItem,
  SwitchItem,
  ToolItem,
} from '@/types'
import { ListFilterPicker } from './OptionFilter'
import { ParcelList } from './ParcelList'
import { ProductCard } from './ProductCard'
import { shopFilters } from './shopFilters'

/**
 * Thông báo sale trải hết bề ngang trên cùng Shopii: ngày sale / đếm ngược tới đợt sale; ⓘ góc phải (rê / focus) hiện mô tả
 * gạch đầu dòng (`Tooltip wide`, vì tooltip `title` chung chỉ 1 dòng)
 */
function SaleBanner({ day }: { day: number }) {
  const left = nextSaleDay(day) - day
  return (
    <Alert
      icon={Flame}
      className="relative shrink-0 pr-9"
      title={isSaleDay(day) ? 'Đang sale linh kiện hôm nay' : `Sale tiếp theo: còn ${left} ngày`}
    >
      <span className="absolute top-1.5 right-2">
        <Tooltip
          wide
          side="bottom"
          content={
            <ul className="list-disc pl-4">
              <li>Giá bán các vật phẩm sẽ giảm từ 5% ~ 30%</li>
              <li>Chu kỳ lặp lại {SALE_EVERY} ngày 1 lần sẽ có đợt sale</li>
            </ul>
          }
        >
          <button
            type="button"
            aria-label="Lịch sale Shopii"
            className="grid size-6 place-items-center rounded-full text-[#ffb4b4] hover:bg-white/10 focus:bg-white/10"
          >
            <CircleAlert className="size-4" />
          </button>
        </Tooltip>
      </span>
    </Alert>
  )
}

/** chờ ngừng gõ bao lâu (ms) mới tìm */
const SEARCH_MS = 300

/** chữ thường bỏ dấu (gõ "ban phim" vẫn ra "bàn phím") */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()

// Sàn thương mại: linh kiện mới giá niêm yết + vật tư mod. Cột trái ghim cố định (ô tìm kiếm chung mọi mục, mục "Đang sale"
// ngày sale, các mục hàng, bộ lọc trong mục), bên phải lưới sản phẩm trong khung nền tối như bảng xếp hạng
export function Shopii() {
  const catalog = useMemo(() => buildCatalog(), [])
  const day = useGame((s) => s.day)
  const purchase = useGame((s) => s.lastSolderPurchase)
  const undoPurchase = useGame((s) => s.undoSolderPurchase)
  const tools = useGame((s) => s.tools)
  const solderOwned = useGame((s) => s.solderOwned)
  const { orderParcel, buyTool } = useGame.getState()
  /** ghi món sale vừa mua (danh sách theo ngày, sang ngày khác thì làm lại) */
  const markSale = (id: string) =>
    useGame.setState((s) => {
      const cur = s.saleBought?.day === s.day ? s.saleBought.ids : []
      return { saleBought: { day: s.day, ids: [...cur, id] } }
    })
  // kiện đã đặt chưa nhận (khu "Đơn đang giao")
  const parcels = useGame((s) => s.parcels)
  const arrived = parcels.filter((p) => p.arrive <= day).length
  const [shipView, setShipView] = useState(false)
  // mục đang xem nằm trong store để chỗ khác mở thẳng đúng mục (vd ô đồ thiếu trên bàn mod)
  const cat = useGame((s) => s.shopCat)
  const [saleView, setSaleView] = useState(false)
  // ô tìm kiếm: `query` = chữ đang gõ, `applied` = chữ đã tìm (debounce SEARCH_MS sau lần gõ cuối)
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setApplied(query), SEARCH_MS)
    return () => clearTimeout(t)
  }, [query])
  // lưới sản phẩm dựng nền (không giật ô gõ); dựng xong mới hiện. Loading chỉ hiện sau debounce (đang dựng kết quả),
  // lúc đang gõ thì chưa (trước tính cả `query !== applied` nên vừa gõ đã loading)
  const shownQuery = useDeferredValue(applied)
  const searchBusy = shownQuery !== applied
  const clearSearch = () => (setQuery(''), setApplied(''))
  const setCat = (shopCat: ShopCategory) => {
    setSaleView(false)
    setShipView(false)
    useGame.setState({ shopCat })
  }
  // bộ lọc trong mục (case theo form factor, switch theo loại, dụng cụ theo nhóm); đổi mục thì về "Tất cả"
  const [filter, setFilter] = useState({ cat, id: 'all' })
  // đổi mục / Đang sale / tìm / bộ lọc thì lưới sản phẩm cuộn về đầu
  const grid = useRef<HTMLDivElement>(null)
  useEffect(() => {
    grid.current?.scrollTo({ top: 0 })
  }, [cat, saleView, shownQuery, filter])
  const sale = isSaleDay(day)
  // giá hôm nay (ngày sale: linh kiện giảm 5–30%); dụng cụ / chứng chỉ đã có (hoặc đã có bản tốt hơn, bút / trạm hàn cất
  // dự phòng) thì không bán nữa
  const stock = useMemo(
    () =>
      catalog
        .filter(
          (p) =>
            !(
              p.tool &&
              (tools[p.tool.kind] >= p.tool.level ||
                (p.tool.kind === 'solder' && solderOwned[p.tool.level] !== undefined))
            ),
        )
        .map((p) => withSale(p, day)),
    [catalog, tools, solderOwned, day],
  )
  const onSale = stock.filter((p) => p.sale)
  const q = fold(shownQuery.trim())
  const searching = q.length > 0 && !shipView
  // tìm kiếm: mọi mục theo tên / mô tả · Đang sale: mọi linh kiện đang giảm · còn lại: mục đang chọn + bộ lọc trong mục
  const all = searching
    ? stock.filter((p) => fold(`${p.name} ${p.desc}`).includes(q))
    : saleView && sale
      ? onSale
      : stock.filter((p) => p.cat === cat)
  const filters = searching || (saleView && sale) ? [] : shopFilters(cat, all)
  const active = filters.find((f) => f.id === (filter.cat === cat ? filter.id : 'all'))
  const list = active ? all.filter(active.match) : all

  return (
    // khung cao cố định: thông báo sale đứng yên trên cùng, cột trái + lưới sản phẩm tự cuộn riêng
    <div className="flex h-[min(680px,74vh)] flex-col gap-3 group-data-fill/win:h-full max-md:h-auto">
      <SaleBanner day={day} />
      <div className="flex min-h-0 flex-1 gap-3 max-md:flex-col">
        {/* cột trái cố định (cuộn riêng nếu dài) */}
        <div className="flex w-[200px] shrink-0 flex-col gap-1.5 overflow-y-auto max-md:w-auto">
          {/* viền vàng khi gõ vẽ vào trong (ring-inset): cột trái overflow-y-auto cắt mất ring nhô ra ngoài */}
          <label className="flex items-center gap-2 rounded-xl bg-panel-2 px-3 py-2 ring-yellow ring-inset focus-within:ring-2">
            <Search className="size-4 shrink-0 text-muted" />
            <input
              value={query}
              onChange={(e) => (setShipView(false), setQuery(e.target.value))}
              placeholder="Tìm sản phẩm..."
              aria-label="Tìm sản phẩm"
              className="w-full min-w-0 bg-transparent text-sm font-bold outline-none placeholder:text-muted"
            />
          </label>
          {sale && (
            <TabChip
              active={saleView && !searching && !shipView}
              count={onSale.length}
              title="Hôm nay Shopii sale linh kiện 5–30%"
              onClick={() => (clearSearch(), setShipView(false), setSaleView(true))}
              className="w-full"
            >
              Đang sale
            </TabChip>
          )}
          <div className="flex flex-col gap-1.5 max-md:flex-row max-md:flex-wrap">
            {(Object.entries(SHOP_CATS) as [ShopCategory, string][]).map(([id, name]) => (
              <TabChip
                key={id}
                active={!searching && !shipView && !(saleView && sale) && cat === id}
                onClick={() => (clearSearch(), setCat(id))}
                className="md:w-full"
              >
                {name}
              </TabChip>
            ))}
          </div>
          {/* kiện đã đặt chưa nhận: đang giao / đã tới cửa */}
          <TabChip
            active={shipView}
            icon={Truck}
            count={parcels.length}
            title={
              arrived ? `${arrived} kiện đã tới cửa, ra cửa nhận` : 'Kiện hàng đã đặt chưa nhận'
            }
            onClick={() => (clearSearch(), setShipView(true))}
            className="w-full"
          >
            Đơn đang giao
          </TabChip>
          {/* bộ lọc trong mục: nút lọc + popup (cùng kiểu chọn option trong thẻ sản phẩm), mỗi dòng kèm số sản phẩm khớp */}
          {filters.length > 0 && !shipView && (
            <div className="mt-1.5">
              <ListFilterPicker
                title="Lọc sản phẩm trong mục"
                value={Math.max(
                  0,
                  filters.findIndex((f) => f.id === active?.id),
                )}
                onChange={(i) => setFilter({ cat, id: filters[i].id })}
                items={filters.map((f) => ({
                  label: f.label,
                  note: String(all.filter(f.match).length),
                }))}
              />
            </div>
          )}
        </div>
        {/* khung bo góc có đệm; lớp cuộn bên trong không bo → thanh cuộn không bị góc bo che */}
        <div className="relative flex min-h-[260px] min-w-0 flex-1 flex-col rounded-2xl bg-black/15 p-1.5">
          {shipView && <ParcelList />}
          <div
            hidden={shipView}
            ref={grid}
            className="grid min-h-0 flex-1 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))] content-start gap-2 overflow-y-auto"
          >
            {list.some((p) => p.sound) && (
              <div className="col-span-full px-1">
                <SoundLegend />
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
                // giá đổi theo ngày sale → chọn lại option từ đầu
                key={`${p.id}:${p.sale ?? 0}`}
                product={p}
                // đặt hàng theo tốc độ giao (trả tiền ngay, hàng tới cửa theo ngày); speed null = đổi mỏ hàn đã có
                onBuy={(p, o, qty, speed) => {
                  const price = o.price * qty
                  let res: string
                  if (p.cat === 'tool' || p.cat === 'cert') {
                    const it = o.item as ToolItem
                    if (!speed) return void buyTool(it.kind, it.level)
                    res = orderParcel(
                      { kind: 'tool', tool: it.kind, level: it.level, price: o.price },
                      speed,
                    )
                  } else if (!speed) return
                  else if (p.cat === 'supply' || p.cat === 'spell') {
                    const it = o.item as SupplyItem
                    res = orderParcel({ kind: 'supply', id: it.id, n: it.n * qty, price }, speed)
                  } else {
                    const cat = p.cat as PartCategory
                    const item = multiply(p.cat, o.item as PartItem, qty)
                    res = orderParcel({ kind: 'part', cat, item, price }, speed)
                  }
                  // món đang sale: mua 1 lần trong ngày sale rồi khoá nút (ProductCard)
                  if (res === 'ok' && p.sale) markSale(p.id)
                }}
              />
            ))}
          </div>
          {/* đang tìm: loading che lưới tới khi dựng xong kết quả */}
          {searchBusy && !shipView && (
            <div
              role="status"
              aria-label="Đang tìm sản phẩm"
              className="absolute inset-0 z-20 flex flex-col items-center justify-start gap-2 rounded-2xl bg-[#1a1f2b] pt-24 text-muted"
            >
              <LoaderCircle className="size-10 animate-spin" />
              <span className="font-head text-sm font-extrabold">Đang tìm...</span>
            </div>
          )}
          {/* không có sản phẩm: icon hết hàng nằm giữa khung sản phẩm */}
          {!list.length && !searchBusy && !shipView && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted">
              <PackageX className="size-16 opacity-70" strokeWidth={1.5} />
              <span className="font-head text-lg font-extrabold">
                {searching ? 'Không tìm thấy' : 'Hết hàng'}
              </span>
              <span className="text-xs">Không có sản phẩm phù hợp</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** nhân số lượng món mua (switch: số con, stab: số stab từng cỡ); món khác mua 1 */
function multiply(cat: Product['cat'], item: PartItem, qty: number): PartItem {
  if (qty === 1) return item
  if (cat === 'switch') {
    const sw = item as SwitchItem
    return { ...sw, count: sw.count * qty }
  }
  if (cat === 'stab') {
    const st = stabStock(item as StabItem)
    return {
      ...(item as StabItem),
      short: st.short * qty,
      long: st.long * qty,
      long7: st.long7 * qty,
    }
  }
  return item
}
