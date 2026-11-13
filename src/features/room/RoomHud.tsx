import { Box } from 'lucide-react'
import { useGame } from '@/store'
import { parcelStacks } from '@/data/shipping'
import { BUTTON_TONES } from '@/components/ui/buttonTones'
import { cn } from '@/lib/format'
import { StatusChips } from '@/components/game/StatusChips'
import { ControlsHint, KeyCap, MouseIcon } from '@/components/game/ControlsHint'
import { useRoom } from '@/scene/room/roomStore'
import { boxCustomer, isPackedBox } from '@/store/carrySlice'
import { RoomGuide } from '@/features/guide/RoomGuide'
import { LearnPad } from '@/features/intro/LearnHud'
import { useIntro } from '@/features/intro/introStore'

/** cách điều khiển khi đi lại: 1 dòng chữ to giữa đáy màn hình (đang khoá tâm chuột: rê chuột nhìn, giữ Alt hiện chuột) */
const HINT_LOCKED = (
  <>
    <span>Rê chuột nhìn quanh,</span>
    <span className="flex gap-1">
      {['A', 'D', 'W', 'S'].map((k) => (
        <KeyCap key={k}>{k}</KeyCap>
      ))}
    </span>
    <span>di chuyển, giữ</span>
    <KeyCap>Alt</KeyCap>
    <span>hiện chuột</span>
  </>
)

/** chưa khoá tâm chuột (vừa nhả Esc / giữ Alt / cảm ứng) */
const HINT = (
  <>
    <span>Nhấn</span>
    <MouseIcon btn="left" />
    <span>vào cảnh để điều khiển (hoặc kéo nhìn quanh),</span>
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
  const hoverNote = useRoom((r) => r.hoverNote)
  const calendar = useRoom((r) => r.calendar)
  const locked = useRoom((r) => r.locked)
  const learning = useIntro((s) => !!s.learn)
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
      {/* gọn nhất: ô vuông cam viền cam đậm hình thùng + ô số trắng viền cam ở góc + vòng sáng lan ra; rê chuột mới hiện chữ (tooltip) */}
      {atDoor > 0 && (
        <div
          title={`${atDoor} thùng hàng ở hành lang`}
          className="fixed top-3 left-3 z-[5] size-11"
        >
          <span className="absolute inset-0 animate-ping rounded-xl bg-orange/60" />
          <span
            className={cn(
              'relative grid size-11 place-items-center rounded-xl border-[3px] border-[#b4471d] shadow-[0_4px_0_rgba(0,0,0,0.35)]',
              BUTTON_TONES.orange,
            )}
          >
            <Box className="size-6" strokeWidth={2.6} />
          </span>
          <span className="absolute -top-2.5 -right-2.5 grid h-6 min-w-6 place-items-center rounded-lg border-[3px] border-orange bg-white px-1 font-head text-sm leading-none font-extrabold text-[#b4471d]">
            {atDoor}
          </span>
        </div>
      )}
      {/* tâm ngắm giữa màn khi khoá chuột: trỏ vào vật bấm được thì sáng vàng, to ra */}
      {locked && !calendar && (
        <div
          className={cn(
            'pointer-events-none fixed top-1/2 left-1/2 z-[6] -translate-1/2 rounded-full border-2 border-black/60 transition-[width,height,background-color] duration-100',
            hover ? 'size-3.5 bg-yellow' : 'size-2 bg-white/90',
          )}
        />
      )}
      {/* Keeb-chan dẫn người mới: bấm màn hình máy tính → nhận kiện → cầm thùng đơn → bàn build */}
      <RoomGuide />
      <LearnPad />
      {heldWho && !hover && !hoverNote && (
        <div className="pointer-events-none fixed bottom-16 left-1/2 z-[5] -translate-x-1/2 rounded-xl bg-[rgba(14,16,24,0.85)] px-4 py-2 font-head text-lg font-bold text-ink max-md:bottom-3">
          {heldPacked
            ? `Đang cầm thùng đã đóng gói của ${heldWho}: đặt lên kệ giao hàng trong phòng`
            : `Đang cầm thùng đơn của ${heldWho}: bấm bàn build để đặt, hoặc cất lại kệ cuối hành lang`}
        </div>
      )}
      {/* đang tập đi lại (sau đoạn mở đầu): không có dòng chữ đáy màn nào (kể cả chữ gợi ý lúc rê vào vật), chỉ vòng tròn / dấu ? / phụ đề */}
      {/* rê vào vật bấm được: dòng hướng dẫn đổi thành "Nhấn [chuột trái] {việc}" (cùng kiểu chữ trắng, không khung) */}
      <ControlsHint>
        {learning ? null : hoverNote && !calendar ? (
          // trỏ vật không bấm được gì (vd bàn build trống): chỉ dòng chữ
          <span>{hoverNote}</span>
        ) : hover && !calendar ? (
          <>
            <span>Nhấn</span>
            <MouseIcon btn="left" />
            <span>{hover.charAt(0).toLowerCase() + hover.slice(1)}</span>
          </>
        ) : locked ? (
          HINT_LOCKED
        ) : (
          HINT
        )}
      </ControlsHint>
    </>
  )
}
