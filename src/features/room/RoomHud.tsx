import { Package } from 'lucide-react'
import { useGame } from '@/store'
import { arrivedParcels } from '@/data/shipping'
import { StatusChips } from '@/components/game/StatusChips'
import { ControlsHint, KeyCap, MouseIcon } from '@/components/game/ControlsHint'
import { useRoom } from '@/scene/room/roomStore'
import { boxCustomer, isPackedBox } from '@/store/carrySlice'

/** cách điều khiển khi đi lại: 1 dòng chữ to giữa đáy màn hình */
const HINT = (
  <>
    <span>Kéo</span>
    <MouseIcon btn="left" />
    <span>để nhìn quanh,</span>
    <MouseIcon btn="wheel" />
    <span>phóng to và</span>
    <span className="flex gap-1">
      {['A', 'D', 'W', 'S'].map((k) => (
        <KeyCap key={k}>{k}</KeyCap>
      ))}
    </span>
    <span>di chuyển</span>
  </>
)

/** HUD khi đi lại trong phòng: trạng thái, chữ gợi ý vật đang rê, cách điều khiển */
export function RoomHud() {
  const hover = useRoom((r) => r.hover)
  const hoverAlt = useRoom((r) => r.hoverAlt)
  const hoverNote = useRoom((r) => r.hoverNote)
  const calendar = useRoom((r) => r.calendar)
  const atDoor = useGame((s) => arrivedParcels(s.parcels, s.day).length)
  // thùng đang cầm: của ai, đặt ở đâu (2 selector giá trị đơn, không tạo object mới mỗi lần)
  const heldWho = useGame((s) => (s.held ? boxCustomer(s, s.held) : null))
  const heldPacked = useGame((s) => !!s.held && isPackedBox(s, s.held))
  return (
    <>
      {/* không có lối tắt máy tính / bàn build / lịch: bấm thẳng vào vật trong phòng */}
      <div className="pointer-events-none fixed inset-x-3 top-3 z-[8] flex items-center justify-end max-md:flex-wrap max-md:gap-2 [&>*]:pointer-events-auto">
        <StatusChips />
      </div>
      {atDoor > 0 && (
        <div className="pointer-events-none fixed top-3 left-3 z-[5] flex items-center gap-2 rounded-xl bg-[rgba(14,16,24,0.85)] px-3 py-2 text-sm font-bold text-orange">
          <Package className="size-4" />
          {atDoor} thùng hàng đang chờ ở hành lang
        </div>
      )}
      {heldWho && !hover && !hoverNote && (
        <div className="pointer-events-none fixed bottom-16 left-1/2 z-[5] -translate-x-1/2 rounded-xl bg-[rgba(14,16,24,0.85)] px-4 py-2 font-head text-lg font-bold text-ink max-md:bottom-3">
          {heldPacked
            ? `Đang cầm thùng đã đóng gói của ${heldWho}: mang ra kệ giao hàng cạnh chậu cây`
            : `Đang cầm thùng đơn của ${heldWho}: bấm bàn build để đặt, hoặc cất vào kệ cất đơn`}
        </div>
      )}
      {/* rê vào vật bấm được: dòng hướng dẫn đổi thành "Nhấn [chuột trái] {việc}" (cùng kiểu chữ trắng, không khung) */}
      <ControlsHint>
        {hoverNote && !calendar ? (
          // trỏ vật không bấm được gì (vd bàn build trống): chỉ dòng chữ
          <span>{hoverNote}</span>
        ) : hover && !calendar ? (
          <>
            <span>Nhấn</span>
            <MouseIcon btn="left" />
            <span>
              {hover.charAt(0).toLowerCase() + hover.slice(1)}
              {hoverAlt && ','}
            </span>
            {hoverAlt && (
              <>
                <span>nhấn</span>
                <MouseIcon btn="right" />
                <span>{hoverAlt}</span>
              </>
            )}
          </>
        ) : (
          HINT
        )}
      </ControlsHint>
    </>
  )
}
