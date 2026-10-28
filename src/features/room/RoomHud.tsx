import { CalendarDays, Hammer, Monitor, MousePointerClick, Package } from 'lucide-react'
import { useGame } from '@/store'
import { arrivedParcels } from '@/data/shipping'
import { IconButton } from '@/components/ui'
import { StatusChips } from '@/components/game/StatusChips'
import { useRoom } from '@/scene/room/roomStore'
import { sitAtBench } from '@/scene/room/sitAtBench'

/** HUD khi đi lại trong phòng: lối tắt máy tính / bàn build / lịch, chữ gợi ý vật đang rê, cách điều khiển */
export function RoomHud() {
  const hover = useRoom((r) => r.hover)
  const calendar = useRoom((r) => r.calendar)
  const flying = useRoom((r) => !!r.fly)
  const zoomToPC = useGame((s) => s.zoomToPC)
  const atDoor = useGame((s) => arrivedParcels(s.parcels, s.day).length)
  return (
    <>
      <div className="pointer-events-none fixed inset-x-3 top-3 z-[8] flex items-center justify-between max-md:flex-wrap max-md:gap-2 [&>*]:pointer-events-auto">
        <div className="flex gap-2">
          <IconButton tone="blue" icon={<Monitor />} label="Dùng máy tính" onClick={zoomToPC} />
          <IconButton
            tone="green"
            icon={<Hammer />}
            label="Ngồi vào bàn build"
            onClick={sitAtBench}
            disabled={flying}
          />
          <IconButton
            tone="yellow"
            icon={<CalendarDays />}
            label="Xem lịch / kết thúc ngày"
            onClick={() => useRoom.setState({ calendar: true })}
          />
        </div>
        <StatusChips />
      </div>
      {atDoor > 0 && (
        <div className="pointer-events-none fixed top-17 left-3 z-[5] flex items-center gap-2 rounded-xl bg-[rgba(14,16,24,0.85)] px-3 py-2 text-sm font-bold text-orange">
          <Package className="size-4" />
          {atDoor} thùng hàng đang chờ ở hành lang
        </div>
      )}
      {hover && !calendar && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-[5] flex -translate-x-1/2 items-center gap-2 rounded-xl border-2 border-green bg-[rgba(14,16,24,0.9)] px-4 py-2 font-head text-lg font-extrabold text-green">
          <MousePointerClick className="size-5" />
          Bấm: {hover}
        </div>
      )}
      <div className="pointer-events-none fixed bottom-3 left-1/2 z-[5] -translate-x-1/2 rounded-xl bg-[rgba(14,16,24,0.75)] px-4 py-2 text-center text-sm text-muted max-md:w-[calc(100%-24px)]">
        <b className="text-text">WASD / phím mũi tên</b> đi · <b className="text-text">Shift</b>{' '}
        chạy · <b className="text-text">kéo chuột</b> nhìn quanh ·{' '}
        <b className="text-text">bấm sàn</b> đi tới · <b className="text-text">bấm đồ vật</b> để
        dùng
      </div>
    </>
  )
}
