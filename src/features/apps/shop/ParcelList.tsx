import { Truck } from 'lucide-react'
import { Button, Tooltip } from '@/components/ui'
import { SHIP_SPEEDS, parcelContents } from '@/data/shipping'
import { cn, fmt } from '@/lib/format'
import { useGame } from '@/store'

/**
 * Chờ giao hàng: kiện Shopii (và kiện người bán Hội Phím Cơ gửi) đã đặt chưa nhận (khuôn danh sách bảng xếp hạng, bảng cột
 * Kiện hàng | Trạng thái | Hình thức | Đã trả). Tới cửa thì dòng viền vàng, nhận ở kệ cửa (bấm thùng hàng);
 * kiện Shopii chưa tới cửa huỷ được (hoàn tiền)
 */
export function ParcelList() {
  const day = useGame((s) => s.day)
  const parcels = useGame((s) => s.parcels)
  const cancel = useGame((s) => s.cancelParcel)
  // tới cửa trước, rồi theo ngày tới
  const rows = [...parcels].sort((a, b) => a.arrive - b.arrive)
  const waiting = parcels.filter((p) => p.arrive <= day).length
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* đầu app kiểu bảng xếp hạng: ô icon vàng + tiêu đề + mô tả */}
      <div className="flex items-center gap-3 px-1.5 pt-1 pb-2">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-yellow/15 text-yellow">
          <Truck className="size-7 fill-yellow/30" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-head text-xl leading-tight font-extrabold text-yellow">
            Chờ giao hàng
          </div>
          <div className="truncate text-sm text-muted">
            {waiting
              ? `${waiting} kiện đã tới kệ nhận hàng cuối hành lang, ra cửa nhận`
              : 'Kiện tới cửa nằm ở kệ nhận hàng cuối hành lang'}
          </div>
        </div>
      </div>
      {/* hàng tiêu đề cột */}
      <div className="flex items-center gap-3 px-3 pt-1 pb-2 text-[13px] font-bold text-muted">
        <div className="min-w-0 flex-1">Kiện hàng</div>
        <div className="w-[130px]">Trạng thái</div>
        <div className="w-[150px]">Hình thức</div>
        <div className="w-14" />
        <div className="w-24 text-right">Đã trả</div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted">
            <Truck className="size-14 opacity-70" strokeWidth={1.5} />
            <span className="font-head text-lg font-extrabold">Không có kiện nào chờ giao</span>
          </div>
        ) : (
          rows.map((p) => {
            const here = p.arrive <= day
            const market = p.from === 'market'
            return (
              <div
                key={p.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2',
                  here ? 'bg-[#3a3418] ring-2 ring-yellow ring-inset' : 'bg-panel-2',
                )}
              >
                {/* rê tên kiện: danh sách đủ các món trong kiện (tên chỉ ghi món đầu + "+n món") */}
                <Tooltip
                  wide
                  content={
                    <ul className="flex flex-col gap-0.5">
                      {parcelContents(p.items).map((it) => (
                        <li key={it.name}>
                          • {it.name}
                          {it.qty > 1 && <b className="text-yellow"> x{it.qty}</b>}
                        </li>
                      ))}
                    </ul>
                  }
                >
                  <div
                    className={cn(
                      'min-w-0 flex-1 truncate font-head text-base font-extrabold',
                      here && 'text-yellow',
                    )}
                  >
                    {p.label}
                  </div>
                </Tooltip>
                <div
                  className={cn(
                    'w-[130px] text-sm font-bold',
                    here ? 'text-yellow' : 'text-ink/85',
                  )}
                >
                  {here ? 'Đã giao' : `${p.arrive - day} ngày tới`}
                </div>
                <div
                  title={market ? `Người bán: ${p.seller}` : SHIP_SPEEDS[p.speed].desc}
                  data-tip-align="start"
                  className="w-[150px] truncate text-sm font-bold text-muted"
                >
                  {market ? `Hội Phím Cơ · ${p.seller}` : SHIP_SPEEDS[p.speed].name}
                </div>
                <div className="flex w-14 justify-end">
                  {!here && !market && (
                    <Button size="sm" title="Huỷ đặt, hoàn đủ tiền" onClick={() => cancel(p.id)}>
                      Huỷ
                    </Button>
                  )}
                </div>
                <div className="w-24 text-right font-head text-xl font-extrabold whitespace-nowrap text-green">
                  {fmt(p.items.reduce((a, it) => a + it.price, 0) + (p.fee ?? 0))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
