import { useGame } from '@/store'
import { CATS, checkInventory } from '@/data/parts'
import { BackButton, Button } from '@/components/ui'
import { StatusChips } from '@/components/game/StatusChips'
import { ControlsHint, KeyCap, MouseIcon } from '@/components/game/ControlsHint'
import { boxCustomer, isPackedBox } from '@/store/carrySlice'
import { ResetCamButton } from './CamModeButton'

/**
 * Khung giữa đáy khi bàn build chưa vào build: bàn trống (ra kệ cửa lấy thùng đơn), thùng đơn còn thiếu linh kiện (danh sách
 * thiếu + chỗ mua, đủ thì bắt đầu build), hoặc thùng vừa đóng gói (cầm đặt lên kệ giao hàng trong phòng)
 */
function BenchStatus() {
  const s = useGame()
  const box = s.benchBox
  // at: vị trí đáy (mặc định sát đáy; có dòng hướng dẫn bên dưới thì đẩy lên)
  const frame = (title: string, body: React.ReactNode, at = 'bottom-3') => (
    <div
      className={`fixed ${at} left-1/2 z-[5] flex w-[min(560px,calc(100%-24px))] -translate-x-1/2 flex-col gap-2 rounded-2xl border-[3px] border-yellow bg-[rgba(14,16,24,0.92)] px-5 py-3 text-center shadow-[0_6px_0_#0006]`}
    >
      <div className="font-head text-xl font-extrabold text-yellow">{title}</div>
      {body}
    </div>
  )
  // Free build: bàn trống (vừa build xong / đóng bảng chọn) thì mở lại bảng chọn case; bảng đang mở thì ẩn khung này
  if (!box && s.free)
    return s.freePick
      ? null
      : frame(
          'Free build',
          <div className="flex flex-col items-center gap-2 text-base">
            Chọn case để build, có sẵn đủ linh kiện
            <Button tone="green" onClick={() => useGame.setState({ freePick: true })}>
              Chọn case
            </Button>
          </div>,
        )
  if (!box)
    return frame(
      'Bàn build đang trống',
      <div className="text-base">
        {s.order || s.jobs.length
          ? 'Đứng dậy ra kệ hàng cuối hành lang cầm thùng đơn, mang về bấm bàn để đặt lên'
          : 'Chưa nhận đơn nào: về máy tính mở Mezzenger nhận đơn, thùng đơn tới kệ cuối hành lang'}
      </div>,
    )
  const who = boxCustomer(s, box)
  // dòng hướng dẫn như khi tương tác đồ vật, chỉ chuột trái: thùng đã đóng gói (không mở lại được) = cầm lên
  if (isPackedBox(s, box))
    return (
      <ControlsHint>
        Nhấn <MouseIcon btn="left" /> vào thùng để cầm lên đặt vào kệ giao hàng,{' '}
        <KeyCap>Esc</KeyCap> để rời bàn
      </ControlsHint>
    )
  // thùng đơn trên bàn nhưng chưa vào build: còn thiếu linh kiện
  const missing =
    s.order?.id === box ? checkInventory(s.inventory, s.order).filter((c) => !c.ok) : []
  // thùng đơn đủ đồ: bấm = build (đổi đơn thì vào build bấm "Cầm thùng đơn lên"); thiếu đồ: bấm = cầm lên
  const hint = (
    <ControlsHint>
      Nhấn <MouseIcon btn="left" /> vào thùng để {missing.length ? 'cầm thùng lên' : 'build'},{' '}
      <KeyCap>Esc</KeyCap> để rời bàn
    </ControlsHint>
  )
  if (!missing.length) return hint
  // thiếu đồ: khung chỉ liệt kê món thiếu (không nút), dưới là dòng hướng dẫn
  return (
    <>
      {frame(
        `Đơn ${who} còn thiếu linh kiện`,
        <ul className="flex flex-col gap-1 text-left">
          {missing.map((m) => (
            <li key={m.cat} className="rounded-lg bg-panel-2 px-3 py-1.5 text-sm">
              <b>{CATS[m.cat]}</b>: <span className="text-yellow">{m.msg}</span>
            </li>
          ))}
        </ul>,
        'bottom-16 max-md:bottom-3',
      )}
      {hint}
    </>
  )
}

/** HUD bàn build chưa vào build: nút quay lại (Esc), góc nhìn + khung trạng thái thùng trên bàn */
export function EmptyBenchHud() {
  const s = useGame()
  return (
    <>
      <div className="pointer-events-none fixed inset-x-3 top-3 z-[8] flex items-center justify-between max-md:flex-wrap max-md:gap-2 [&>*]:pointer-events-auto">
        <div className="flex gap-2">
          <BackButton tour="bench-back" onClick={() => s.standUp('bench')} />
          <ResetCamButton />
        </div>
        <StatusChips />
      </div>
      <BenchStatus />
    </>
  )
}
