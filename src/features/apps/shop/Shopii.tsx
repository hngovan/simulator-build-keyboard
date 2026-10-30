import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import {
  CircleAlert,
  Flame,
  LoaderCircle,
  PackageX,
  Search,
  ShoppingCart,
  Truck,
} from 'lucide-react'
import { Button, SoundLegend, TabChip, Tooltip } from '@/components/ui'
import { useGame } from '@/store'
import { cn, fmt } from '@/lib/format'
import { SHOP_CATS, buildCatalog } from '@/data/parts'
import { SALE_EVERY, isSaleDay, saleMap, withSale } from '@/data/sale'
import { cartBase, cartLine } from '@/data/cart'
import type { ShopCategory, ToolItem } from '@/types'
import { ListFilterPicker } from './OptionFilter'
import { CartList } from './CartList'
import { ParcelList } from './ParcelList'
import { ProductCard } from './ProductCard'
import { SaleRibbon } from './SaleRibbon'
import { shopFilters } from './shopFilters'

/**
 * Banner sự kiện sale (chỉ ngày sale) kiểu banner sàn thương mại: nền gradient đỏ cam sọc chéo, chữ to "SIÊU SALE", mức giảm,
 * nhãn "Chỉ hôm nay"; ⓘ (rê / focus) hiện luật sale (`Tooltip wide`)
 */
function SaleBanner() {
  return (
    <div
      className="relative flex min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-2xl px-4 py-2 shadow-[0_4px_0_rgba(0,0,0,0.35)]"
      style={{
        background:
          'repeating-linear-gradient(-45deg, rgba(255,255,255,0.07) 0 10px, transparent 10px 22px), linear-gradient(100deg, #e0241b 0%, #ff4d2e 45%, #ff9a1f 100%)',
      }}
    >
      {/* vòng sáng trang trí */}
      <span className="pointer-events-none absolute -top-10 right-24 size-28 rounded-full bg-yellow/30 blur-2xl" />
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/20 ring-2 ring-white/40">
        <Flame className="size-6 fill-yellow text-yellow" />
      </span>
      <div className="relative min-w-0 flex-1">
        <div className="font-head text-2xl leading-none font-black tracking-wide text-white italic drop-shadow-[0_2px_0_rgba(0,0,0,0.35)]">
          SIÊU SALE LINH KIỆN
        </div>
        <div className="mt-1 truncate text-sm font-extrabold text-[#ffe9a8]">
          Giảm đến 30% · 3 mục hàng · tìm ruy băng SALE
        </div>
      </div>
      <span className="relative shrink-0 rotate-[-4deg] rounded-lg bg-yellow px-2.5 py-1 font-head text-sm font-black text-[#7a1500] shadow-[0_3px_0_rgba(0,0,0,0.35)]">
        CHỈ HÔM NAY
      </span>
      <Tooltip
        wide
        side="bottom"
        content={
          <ul className="list-disc pl-4">
            <li>3 mục linh kiện ngẫu nhiên, mỗi mục 1–5 món giảm 5% ~ 30% (gắn ruy băng SALE)</li>
            <li>Mỗi món sale được giảm 1 lần, mua thêm là giá thường</li>
            <li>Chu kỳ lặp lại {SALE_EVERY} ngày 1 lần sẽ có đợt sale</li>
          </ul>
        }
      >
        <button
          type="button"
          aria-label="Luật sale Shopii"
          className="relative grid size-6 shrink-0 place-items-center rounded-full text-white/80 hover:bg-white/15 focus:bg-white/15"
        >
          <CircleAlert className="size-4" />
        </button>
      </Tooltip>
    </div>
  )
}

/** chờ ngừng gõ bao lâu (ms) mới tìm */
const SEARCH_MS = 300

/** chữ thường bỏ dấu (gõ "ban phim" vẫn ra "bàn phím") */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()

// Sàn thương mại: linh kiện mới giá niêm yết + vật tư mod. Cột trái ghim cố định (các mục hàng, mục đang sale gắn ruy băng
// SALE, giỏ hàng, đơn đang giao), bên phải: ô tìm trong mục + bộ lọc trong mục đứng yên, dưới là lưới sản phẩm tự cuộn
export function Shopii() {
  const catalog = useMemo(() => buildCatalog(), [])
  const day = useGame((s) => s.day)
  const purchase = useGame((s) => s.lastSolderPurchase)
  const undoPurchase = useGame((s) => s.undoSolderPurchase)
  const tools = useGame((s) => s.tools)
  const solderOwned = useGame((s) => s.solderOwned)
  const { buyTool, addCart } = useGame.getState()
  const cart = useGame((s) => s.cart)
  // kiện đã đặt chưa nhận (khu "Đơn đang giao")
  const parcels = useGame((s) => s.parcels)
  const arrived = parcels.filter((p) => p.arrive <= day).length
  // khu bên phải: lưới sản phẩm / Đơn đang giao / Giỏ hàng
  const [view, setView] = useState<'grid' | 'ship' | 'cart'>('grid')
  const shipView = view !== 'grid'
  const setShipView = (on: boolean) => setView(on ? 'ship' : 'grid')
  // mục đang xem nằm trong store để chỗ khác mở thẳng đúng mục (vd ô đồ thiếu trên bàn mod)
  const cat = useGame((s) => s.shopCat)
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
    setShipView(false)
    useGame.setState({ shopCat })
  }
  // bộ lọc trong mục (case theo form factor, switch theo loại, dụng cụ theo nhóm); đổi mục thì về "Tất cả"
  const [filter, setFilter] = useState({ cat, id: 'all' })
  // đổi mục / tìm / bộ lọc thì lưới sản phẩm cuộn về đầu
  const grid = useRef<HTMLDivElement>(null)
  useEffect(() => {
    grid.current?.scrollTo({ top: 0 })
  }, [cat, shownQuery, filter])
  // ngày sale: 3 mục linh kiện ngẫu nhiên, mỗi mục 1–5 món giảm 5–30%
  const sales = useMemo(() => saleMap(catalog, day), [catalog, day])
  // mỗi món sale được giảm 1 lần: đã mua giá sale hôm nay / giá sale đang nằm trong giỏ thì thẻ về giá thường
  const saleBought = useGame((s) => (s.saleBought?.day === s.day ? s.saleBought.ids : []))
  const saleUsed = useMemo(
    () => new Set([...saleBought, ...cart.filter((l) => l.sale).map((l) => l.product)]),
    [saleBought, cart],
  )
  // giá hôm nay; dụng cụ / chứng chỉ đã có (hoặc đã có bản tốt hơn, bút / trạm hàn cất
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
        .map((p) => withSale(p, saleUsed.has(p.id) ? 0 : (sales.get(p.id) ?? 0))),
    [catalog, tools, solderOwned, sales, saleUsed],
  )
  // mục có món đang sale: gắn ruy băng SALE
  const saleCats = new Set(stock.filter((p) => p.sale).map((p) => p.cat))
  const q = fold(shownQuery.trim())
  const searching = q.length > 0 && !shipView
  // mục đang chọn → tìm theo tên / mô tả trong mục → bộ lọc trong mục (bộ lọc dựng theo cả mục, số món theo kết quả tìm)
  const all = stock.filter((p) => p.cat === cat)
  const found = searching ? all.filter((p) => fold(`${p.name} ${p.desc}`).includes(q)) : all
  const filters = shopFilters(cat, all)
  const active = filters.find((f) => f.id === (filter.cat === cat ? filter.id : 'all'))
  const list = active ? found.filter(active.match) : found

  return (
    // khung cao cố định: thông báo sale đứng yên trên cùng, cột trái + lưới sản phẩm tự cuộn riêng
    <div className="flex h-[min(680px,74vh)] flex-col gap-3 group-data-fill/win:h-full max-md:h-auto">
      {/* hàng trên cùng: banner sale (chỉ ngày sale) + nút giỏ hàng nằm riêng góc phải (số món + tổng tiền) */}
      <div className="flex shrink-0 items-stretch justify-end gap-3">
        {isSaleDay(day) && <SaleBanner />}
        {/* nút giỏ hàng: số món + tổng tiền hàng (chưa phí giao), bấm mở giỏ để thanh toán */}
        <button
          type="button"
          aria-pressed={view === 'cart'}
          onClick={() => setView('cart')}
          title="Xem giỏ hàng, chọn hình thức giao rồi đặt hàng"
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 transition-colors',
            view === 'cart'
              ? 'bg-yellow text-[#3a2b00] shadow-[0_3px_0_rgba(0,0,0,0.35),inset_0_2px_0_rgba(255,255,255,0.3)]'
              : 'bg-panel-2 hover:bg-line',
          )}
        >
          <ShoppingCart className="size-6" />
          <span className="flex flex-col items-end leading-tight">
            <span className="font-head text-sm font-extrabold">Giỏ hàng ({cart.length})</span>
            <span
              className={cn(
                'font-head text-sm font-extrabold',
                view === 'cart' ? 'text-[#3a2b00]' : 'text-green',
              )}
            >
              {fmt(cart.reduce((a, l) => a + cartBase(l), 0))}
            </span>
          </span>
        </button>
      </div>
      <div className="flex min-h-0 flex-1 gap-3 max-md:flex-col">
        {/* cột trái cố định (cuộn riêng nếu dài) */}
        <div className="flex w-[200px] shrink-0 flex-col gap-1.5 overflow-y-auto max-md:w-auto">
          <div className="flex flex-col gap-1.5 max-md:flex-row max-md:flex-wrap">
            {(Object.entries(SHOP_CATS) as [ShopCategory, string][]).map(([id, name]) => (
              <TabChip
                key={id}
                // đang tìm vẫn sáng mục (tìm trong mục đang chọn)
                active={!shipView && cat === id}
                title={saleCats.has(id) ? 'Mục này đang có món sale' : undefined}
                onClick={() => setCat(id)}
                className="relative md:w-full"
              >
                {name}
                {saleCats.has(id) && <SaleRibbon size={34} className="rounded-tr-xl" />}
              </TabChip>
            ))}
          </div>
          {/* kiện đã đặt chưa nhận: đang giao / đã tới cửa */}
          <TabChip
            active={view === 'ship'}
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
        </div>
        {/* khung bo góc có đệm; lớp cuộn bên trong không bo → thanh cuộn không bị góc bo che */}
        <div className="relative flex min-h-[260px] min-w-0 flex-1 flex-col rounded-2xl bg-black/15 p-1.5">
          {/* trên cùng khu sản phẩm, đứng yên (chỉ lưới bên dưới cuộn): ô tìm trong mục + bộ lọc trong mục */}
          {view === 'grid' && (
            <div className="mb-1.5 flex shrink-0 items-center gap-1.5">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-panel-2 px-3 py-2 ring-yellow ring-inset focus-within:ring-2">
                <Search className="size-4 shrink-0 text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Tìm trong ${SHOP_CATS[cat]}...`}
                  aria-label="Tìm sản phẩm trong mục"
                  className="w-full min-w-0 bg-transparent text-sm font-bold outline-none placeholder:text-muted"
                />
              </label>
              {filters.length > 0 && (
                <div className="w-[180px] shrink-0">
                  <ListFilterPicker
                    title="Lọc sản phẩm trong mục"
                    value={Math.max(
                      0,
                      filters.findIndex((f) => f.id === active?.id),
                    )}
                    onChange={(i) => setFilter({ cat, id: filters[i].id })}
                    items={filters.map((f) => ({
                      label: f.label,
                      note: String(found.filter(f.match).length),
                    }))}
                  />
                </div>
              )}
            </div>
          )}
          {view === 'ship' && <ParcelList />}
          {view === 'cart' && <CartList />}
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
                // đổi sang mỏ hàn đã có; mua thì thêm vào giỏ, thanh toán ở mục Giỏ hàng (chọn tốc độ giao)
                onEquip={(o) => void buyTool('solder', (o.item as ToolItem).level)}
                // giá sale chỉ 1 món: thêm nhiều thì 1 món giá sale + phần còn lại giá thường
                onCart={(p, o, qty) => {
                  addCart(cartLine(p, o, p.sale ? 1 : qty))
                  const base = catalog.find((x) => x.id === p.id)
                  const bo = base?.options.find((x) => x.label === o.label)
                  if (p.sale && qty > 1 && base && bo) addCart(cartLine(base, bo, qty - 1))
                }}
              />
            ))}
          </div>
          {/* đang tìm: loading che lưới tới khi dựng xong kết quả */}
          {searchBusy && !shipView && (
            <div
              role="status"
              aria-label="Đang tìm sản phẩm"
              className="absolute inset-x-0 top-[52px] bottom-0 z-20 flex flex-col items-center justify-start gap-2 rounded-b-2xl bg-[#1a1f2b] pt-20 text-muted"
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
