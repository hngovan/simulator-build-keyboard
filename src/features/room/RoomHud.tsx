import { Package } from 'lucide-react'
import { useGame } from '@/store'
import { parcelStacks } from '@/data/shipping'
import { BUTTON_TONES } from '@/components/ui/buttonTones'
import { cn } from '@/lib/format'
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
  // thùng đang chờ ở kệ cuối hành lang: thùng đơn khách gửi tới + thùng kiện Shopii / chợ đã tới
  // (kiện cùng nguồn + cùng tên gộp 1 thùng như trên kệ, `parcelStacks`: đếm theo thùng nhìn thấy, không theo từng kiện)
  const atDoor = useGame(
    (s) =>
      parcelStacks(s.parcels, s.day).length +
      Object.values(s.boxes).filter((b) => b.at === 'door').length,
  )
  // thùng đang cầm: của ai, đặt ở đâu (2 selector giá trị đơn, không tạo object mới mỗi lần)
  const heldWho = useGame((s) => (s.held ? boxCustomer(s, s.held) : null))
  const heldPacked = useGame((s) => !!s.held && isPackedBox(s, s.held))
  return (
    <>
      {/* không có lối tắt máy tính / bàn build / lịch: bấm thẳng vào vật trong phòng */}
      <div className="pointer-events-none fixed inset-x-3 top-3 z-[8] flex items-center justify-end max-md:flex-wrap max-md:gap-2 [&>*]:pointer-events-auto">
        <StatusChips />
      </div>
      {/* viên cam kiểu nút game: ô icon trắng (hộp cam) + chữ trắng đậm */}
      {atDoor > 0 && (
        <div
          className={cn(
            'pointer-events-none fixed top-3 left-3 z-[5] flex items-center gap-2.5 rounded-xl py-1.5 pr-4 pl-1.5 font-head text-base font-extrabold shadow-[0_4px_0_rgba(0,0,0,0.35),inset_0_2px_0_rgba(255,255,255,0.25)] [text-shadow:0_1px_0_#0004]',
            BUTTON_TONES.orange,
          )}
        >
          <span className="grid size-7 place-items-center rounded-lg bg-white/90 text-orange shadow-[0_2px_0_rgba(0,0,0,0.2)]">
            <Package className="size-[18px]" strokeWidth={2.6} />
          </span>
          {atDoor} thùng hàng ở hành lang
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
