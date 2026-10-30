import { Truck } from 'lucide-react'
import { Button } from '@/components/ui'
import { SHIP_SPEEDS, arriveText } from '@/data/shipping'
import { cn, fmt } from '@/lib/format'
import { useGame } from '@/store'

/**
 * Đơn đang giao: kiện Shopii (và kiện người bán Hội Phím Cơ gửi) đã đặt chưa nhận (khuôn danh sách bảng xếp hạng).
 * Tới cửa thì dòng viền vàng, nhận ở kệ cửa (bấm thùng hàng); kiện Shopii chưa tới cửa huỷ được (hoàn tiền)
 */
export function ParcelList() {
  const day = useGame((s) => s.day)
  const parcels = useGame((s) => s.parcels)
  const cancel = useGame((s) => s.cancelParcel)
  // tới cửa trước, rồi theo ngày tới
  const rows = [...parcels].sort((a, b) => a.arrive - b.arrive)
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 px-3 pt-1 pb-2 text-[13px] font-bold text-muted">
        <div className="flex-1">Kiện hàng</div>
        <div>Đã trả</div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted">
            <Truck className="size-14 opacity-70" strokeWidth={1.5} />
            <span className="font-head text-lg font-extrabold">Chưa có đơn nào đang giao</span>
          </div>
        ) : (
          rows.map((p) => {
            const here = p.arrive <= day
            return (
              <div
                key={p.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2',
                  here ? 'bg-[#3a3418] ring-2 ring-yellow ring-inset' : 'bg-panel-2',
                )}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div
                    title={p.label}
                    data-tip-align="start"
                    className={cn(
                      'truncate font-head text-base font-extrabold',
                      here && 'text-yellow',
                    )}
                  >
                    {p.label}
                  </div>
                  <div className="text-xs font-bold text-muted">
                    {p.from === 'market' ? `Hội Phím Cơ · ${p.seller}` : SHIP_SPEEDS[p.speed].name}{' '}
                    ·{' '}
                    {here ? (
                      <span className="text-yellow">Đã tới cửa — ra cửa nhận</span>
                    ) : (
                      `Tới cửa: ${arriveText(p.arrive, day)}`
                    )}
                  </div>
                </div>
                {!here && p.from !== 'market' && (
                  <Button size="sm" title="Huỷ đặt, hoàn đủ tiền" onClick={() => cancel(p.id)}>
                    Huỷ
                  </Button>
                )}
                <div className="font-head text-xl font-extrabold whitespace-nowrap text-green">
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
