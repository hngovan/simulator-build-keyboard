import { useEffect, useMemo, useState } from 'react'
import { useGame } from '@/store'
import { nextSaleDay } from '@/data/sale'
import { calendarDays } from '@/data/calendar'
import { SHIP_SPEEDS } from '@/data/shipping'
import { Button, HudCard } from '@/components/ui'
import { cn } from '@/lib/format'
import { EndDayDialog } from '@/features/desktop/EndDayDialog'
import { useRoom } from '@/scene/room/roomStore'

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

/**
 * Popup lịch xưởng (bấm lịch treo tường / nút lịch): lưới 4 tuần như tờ lịch nhưng chi tiết hơn — mỗi ô ghi sale,
 * đơn tới hạn, hàng tới cửa; bấm 1 ngày xem danh sách việc ngày đó. 2 lựa chọn: "Kết thúc ngày" (popup tổng kết
 * `EndDayDialog`) / "Quay lại làm việc"
 */
export function CalendarDialog() {
  const day = useGame((s) => s.day)
  const order = useGame((s) => (s.result ? null : s.order))
  const jobs = useGame((s) => s.jobs)
  const parcels = useGame((s) => s.parcels)
  const packed = useGame((s) => s.packed.filter((p) => !p.shipped).length)
  const [endDay, setEndDay] = useState(false)
  const [pick, setPick] = useState(day)
  const close = () => useRoom.setState({ calendar: false })
  const days = useMemo(
    () => calendarDays(day, [...(order ? [order] : []), ...jobs.map((j) => j.order)], parcels),
    [day, order, jobs, parcels],
  )
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  if (endDay)
    return (
      <EndDayDialog
        onClose={() => {
          setEndDay(false)
          close()
        }}
      />
    )
  const sel = days.find((d) => d.day === pick) ?? days[0]
  const sale = nextSaleDay(day)
  return (
    <div
      role="dialog"
      className="fixed inset-0 z-[3000] grid animate-fade-in place-items-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <HudCard className="flex max-h-full w-[min(680px,100%)] flex-col gap-3 overflow-y-auto">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-head text-2xl font-extrabold text-yellow">
            📅 Lịch xưởng · Ngày {day}
          </h3>
          <span className="text-sm text-muted">
            Đã làm {day - 1} ngày · sale tiếp: {sale === day ? 'hôm nay' : `ngày ${sale}`}
          </span>
        </div>
        <div className="rounded-2xl bg-black/15 p-1.5">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted">
            {WEEKDAYS.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((d) => (
              <button
                key={d.day}
                onClick={() => setPick(d.day)}
                className={cn(
                  'relative flex min-h-16 flex-col items-start gap-0.5 rounded-lg bg-panel-2 p-1 text-left text-[11px] leading-tight',
                  d.day < day && 'opacity-45',
                  d.sale && 'bg-[#4a2026]',
                  d.day === pick && 'outline-2 outline-yellow',
                  d.day === day && 'ring-2 ring-green',
                )}
              >
                <span
                  className={cn(
                    'font-head text-base font-extrabold',
                    d.day === day ? 'text-green' : 'text-text',
                  )}
                >
                  {d.day}
                  {d.day < day && <span className="ml-1 text-red">✕</span>}
                </span>
                {d.sale && <span className="font-bold text-red">SALE</span>}
                {d.due.length > 0 && (
                  <span className="truncate font-bold text-orange">⏰ {d.due.length} đơn</span>
                )}
                {d.parcels.length > 0 && (
                  <span className="truncate font-bold text-blue">📦 {d.parcels.length} kiện</span>
                )}
              </button>
            ))}
          </div>
        </div>
        {/* việc ngày đang chọn */}
        <div className="rounded-2xl bg-black/15 p-3 text-sm">
          <div className="mb-1 font-head font-extrabold text-yellow">
            Ngày {sel.day}
            {sel.day === day ? ' (hôm nay)' : sel.day < day ? ' (đã qua)' : ''}
          </div>
          <ul className="flex flex-col gap-1">
            {sel.sale && <li className="text-red">🔥 Shopii sale linh kiện 5–30%</li>}
            {sel.due.map((o) => (
              <li key={o.id} className={cn(o.dueDay! < day ? 'text-red' : 'text-orange')}>
                ⏰ Hạn giao đơn {o.customer}
              </li>
            ))}
            {sel.parcels.map((p) => (
              <li key={p.id} className="text-blue">
                📦 Hàng tới cửa: {p.label} ({SHIP_SPEEDS[p.speed].name})
                {p.arrive <= day ? ' — đang chờ ở hành lang' : ''}
              </li>
            ))}
            {sel.day === day && packed > 0 && (
              <li className="text-green">📮 {packed} đơn đóng gói chờ gửi (thùng ở hành lang)</li>
            )}
            {!sel.sale &&
              !sel.due.length &&
              !sel.parcels.length &&
              !(sel.day === day && packed) && <li className="text-muted">Không có việc gì</li>}
          </ul>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={close}>
            Quay lại làm việc
          </Button>
          <Button tone="green" className="flex-1" onClick={() => setEndDay(true)}>
            Kết thúc ngày
          </Button>
        </div>
      </HudCard>
    </div>
  )
}
