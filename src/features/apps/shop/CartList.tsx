import { useMemo, useState } from 'react'
import { PiggyBank, ShoppingCart, Trash2, Truck, X, Zap, type LucideIcon } from 'lucide-react'
import { Badge, Button, OptionSelect, QtyInput } from '@/components/ui'
import { cartBase, cartLine, cartMax, optName } from '@/data/cart'
import { buildCatalog } from '@/data/parts'
import { saleMap, withSale } from '@/data/sale'
import { SHIP_ORDER, SHIP_SPEEDS, arriveDay, arriveText, type ShipSpeed } from '@/data/shipping'
import { cn, fmt } from '@/lib/format'
import { useGame } from '@/store'
import type { ProductOption } from '@/types'

/** icon thẻ hình thức giao hàng */
const SHIP_ICONS: Record<ShipSpeed, LucideIcon> = { express: Zap, fast: Truck, saver: PiggyBank }

/** phí giao hiện trên thẻ hình thức giao: Tiết kiệm miễn phí, còn lại +phí / món */
const feeText = (k: ShipSpeed) =>
  SHIP_SPEEDS[k].fee ? `+${fmt(SHIP_SPEEDS[k].fee)} / món` : 'Miễn phí'

/**
 * Đổi loại 1 dòng giỏ: có nhóm (chất liệu: keycap, dòng case) thì 2 ô riêng chất liệu → màu (đổi chất liệu giữ màu nếu có,
 * giá chỉ ghi ở ô chất liệu), không thì 1 ô
 */
function OptionPick({
  opts,
  cur,
  onPick,
}: {
  opts: ProductOption[]
  cur: number
  onPick: (i: number) => void
}) {
  const groups = [...new Set(opts.flatMap((o) => (o.group ? [o.group] : [])))]
  if (groups.length < 2)
    return (
      <OptionSelect
        className="max-w-[260px]"
        value={cur}
        onChange={onPick}
        options={opts.map((o) => ({ label: optName(o), swatch: o.swatch, note: fmt(o.price) }))}
      />
    )
  const opt = opts[cur]
  const inGroup = opts.flatMap((o, i) => (o.group === opt.group ? [i] : []))
  const pickGroup = (g: string) => {
    const same = opts.findIndex((o) => o.group === g && o.label === opt.label)
    onPick(same >= 0 ? same : opts.findIndex((o) => o.group === g))
  }
  return (
    <div className="flex max-w-[360px] gap-1.5">
      <OptionSelect
        className="min-w-0 flex-1"
        value={groups.indexOf(opt.group!)}
        onChange={(gi) => pickGroup(groups[gi])}
        options={groups.map((g) => ({
          label: g,
          note: fmt(opts.find((o) => o.group === g)!.price),
        }))}
      />
      <OptionSelect
        className="min-w-0 flex-1"
        value={inGroup.indexOf(cur)}
        onChange={(i) => onPick(inGroup[i])}
        options={inGroup.map((i) => ({ label: opts[i].label, swatch: opts[i].swatch }))}
      />
    </div>
  )
}

/**
 * Giỏ hàng Shopii (khuôn danh sách bảng xếp hạng): mỗi dòng đổi loại (option) được, chỉnh số lượng (ô nhập / + −), bỏ món;
 * tốc độ giao chọn 1 lần cho cả giỏ, phí giao tính từng dòng (món khác nhau; cùng món nhiều cái 1 lần), "Đặt hàng" = 1 kiện tới cửa
 */
export function CartList() {
  const day = useGame((s) => s.day)
  const cart = useGame((s) => s.cart)
  const remove = useGame((s) => s.removeCart)
  const setQty = useGame((s) => s.setCartQty)
  const swap = useGame((s) => s.swapCart)
  const order = useGame((s) => s.orderCart)
  const clear = useGame((s) => s.clearCart)
  const [speed, setSpeed] = useState<ShipSpeed>('saver')
  // sản phẩm với giá hôm nay (sale) để đổi loại trong giỏ
  const catalog = useMemo(() => buildCatalog(), [])
  const products = useMemo(() => {
    const sales = saleMap(catalog, day)
    return new Map(catalog.map((p) => [p.id, withSale(p, sales.get(p.id) ?? 0)]))
  }, [catalog, day])
  const plain = useMemo(() => new Map(catalog.map((p) => [p.id, p])), [catalog])
  const base = cart.reduce((a, l) => a + cartBase(l), 0)
  // phí giao từng dòng (món khác nhau), cùng món nhiều cái tính 1 lần
  const lineFee = SHIP_SPEEDS[speed].fee
  const fee = lineFee * cart.length
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* đầu app kiểu bảng xếp hạng: ô icon vàng + tiêu đề + mô tả, nút xoá hết bên phải */}
      <div className="flex items-center gap-3 px-1.5 pt-1 pb-2">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-yellow/15 text-yellow">
          <ShoppingCart className="size-7 fill-yellow/30" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-head text-xl leading-tight font-extrabold text-yellow">Giỏ hàng</div>
          <div className="truncate text-sm text-muted">
            Kiểm tra lại sản phẩm trước khi thanh toán
          </div>
        </div>
        {cart.length > 0 && (
          <Button
            size="sm"
            onClick={clear}
            title="Bỏ hết món trong giỏ"
            // icon + chữ cùng 1 hàng
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap"
          >
            <Trash2 className="size-4" />
            Xoá tất cả
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3 px-3 pt-1 pb-2 text-[13px] font-bold text-muted">
        <div className="flex-1">Món trong giỏ</div>
        <div className="w-[104px] text-center">Số lượng</div>
        <div className="w-24 text-right">Thành tiền</div>
        <div className="w-7" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted">
            <ShoppingCart className="size-14 opacity-70" strokeWidth={1.5} />
            <span className="font-head text-lg font-extrabold">Giỏ hàng trống</span>
            <span className="text-xs">Bấm "Thêm vào giỏ" ở thẻ sản phẩm để gom đồ đặt 1 lần</span>
          </div>
        ) : (
          cart.map((l) => {
            // dòng giá sale đổi loại vẫn giá sale, dòng giá thường đổi loại giá thường
            const p = (l.sale ? products : plain).get(l.product)
            const opts = p?.options ?? []
            const cur = p ? opts.findIndex((o) => cartLine(p, o, 1).key === l.key) : -1
            return (
              <div key={l.key} className="flex items-center gap-3 rounded-xl bg-panel-2 px-3 py-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {/* tên món, sau đó (dòng giá sale) badge đỏ "Sale −x%" phân biệt với dòng giá thường cùng món */}
                  <div className="flex min-w-0 items-center gap-1.5">
                    <div
                      title={l.label}
                      data-tip-align="start"
                      className="min-w-0 truncate font-head text-base font-extrabold"
                    >
                      {p?.name ?? l.label}
                    </div>
                    {l.sale && (
                      <Badge solid tone="red" className="ml-0 shrink-0">
                        Sale{p?.sale ? ` −${p.sale}%` : ''}
                      </Badge>
                    )}
                  </div>
                  {/* đổi loại (màu / chất liệu / số gói...) ngay trong giỏ, giữ số lượng */}
                  {p && opts.length > 1 && cur >= 0 && (
                    <OptionPick
                      opts={opts}
                      cur={cur}
                      onPick={(i) => swap(l.key, cartLine(p, opts[i], l.qty))}
                    />
                  )}
                  <div className="text-xs font-bold text-muted">
                    {fmt(l.unit.price)} × {l.qty}
                    {/* giá gốc gạch ngang (dòng sale) */}
                    {l.sale && cur >= 0 && opts[cur].was !== undefined && (
                      <s className="ml-1.5">{fmt(opts[cur].was!)}</s>
                    )}{' '}
                    · ship {SHIP_SPEEDS[speed].name}{' '}
                    <span className="text-green">{lineFee ? `+${fmt(lineFee)}` : 'miễn phí'}</span>
                  </div>
                </div>
                {cartMax(l) > 1 ? (
                  <QtyInput
                    value={l.qty}
                    max={cartMax(l)}
                    onChange={(n) => setQty(l.key, n)}
                    className="w-[104px] justify-center"
                  />
                ) : (
                  <span className="w-[104px] text-center font-head text-sm font-extrabold">1</span>
                )}
                <div className="w-24 text-right font-head text-xl font-extrabold whitespace-nowrap text-green">
                  {fmt(cartBase(l) + lineFee)}
                </div>
                <Button
                  size="sm"
                  title="Bỏ khỏi giỏ"
                  aria-label={`Bỏ ${l.label} khỏi giỏ`}
                  className="grid size-7 place-items-center !p-0"
                  onClick={() => remove(l.key)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            )
          })
        )}
      </div>
      {cart.length > 0 && (
        <div className="mt-1.5 flex flex-col gap-1.5 rounded-xl bg-panel-2 p-2.5">
          {/* hình thức giao hàng: 3 thẻ icon + tên + phí / ngày tới, ngăn cách vạch dọc; đang chọn viền vàng */}
          <div className="grid grid-cols-3 rounded-xl bg-black/20 p-1">
            {SHIP_ORDER.map((k, i) => {
              const Icon = SHIP_ICONS[k]
              const on = speed === k
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  title={SHIP_SPEEDS[k].desc}
                  onClick={() => setSpeed(k)}
                  className={cn(
                    'relative flex min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                    on ? 'bg-yellow/10 ring-2 ring-yellow ring-inset' : 'hover:bg-white/5',
                    // vạch dọc giữa 2 thẻ (ẩn cạnh thẻ đang chọn)
                    i > 0 &&
                      !on &&
                      speed !== SHIP_ORDER[i - 1] &&
                      'before:absolute before:inset-y-2 before:left-0 before:w-px before:bg-white/10',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-10 shrink-0 place-items-center rounded-full',
                      on ? 'bg-yellow/20 text-yellow' : 'bg-white/10 text-ink/80',
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span
                      className={cn(
                        'truncate font-head text-sm font-extrabold',
                        on ? 'text-yellow' : 'text-ink',
                      )}
                    >
                      {SHIP_SPEEDS[k].name} · {feeText(k)}
                    </span>
                    <span className="truncate text-xs text-muted">
                      Tới cửa: {arriveText(arriveDay(day, k), day)}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
          <div className="flex items-end justify-between gap-2">
            <div className="flex flex-col text-xs font-bold text-muted">
              <span>Hình thức giao hàng: {SHIP_SPEEDS[speed].name}</span>
              <span>Thời gian giao hàng: {arriveText(arriveDay(day, speed), day)}</span>
              <span className="font-head text-xl font-extrabold text-green">
                Tổng tiền {fmt(base + fee)}
              </span>
            </div>
            <Button tone="orange" onClick={() => order(speed)}>
              Đặt hàng
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
