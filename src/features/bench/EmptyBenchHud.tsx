import { useEffect } from 'react'
import { useGame } from '@/store'
import { CATS, checkInventory } from '@/data/parts'
import { BackButton } from '@/components/ui'
import { StatusChips } from '@/components/game/StatusChips'
import { ControlsHint, MouseIcon } from '@/components/game/ControlsHint'
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
  // thùng đã đóng gói / thùng đơn đủ đồ: dòng hướng dẫn như khi tương tác đồ vật (chuột trái vào thùng = build, chuột phải cầm lên)
  if (isPackedBox(s, box))
    return (
      <ControlsHint>
        {s.packed.some((p) => p.order.id === box && p.session?.build) && (
          <>
            Nhấn <MouseIcon btn="left" /> vào thùng để mở ra build lại,{' '}
          </>
        )}
        nhấn <MouseIcon btn="right" /> để cầm thùng lên đặt vào kệ giao hàng
      </ControlsHint>
    )
  // thùng đơn trên bàn nhưng chưa vào build: còn thiếu linh kiện
  const missing =
    s.order?.id === box ? checkInventory(s.inventory, s.order).filter((c) => !c.ok) : []
  // cùng 1 dòng hướng dẫn cho thùng đơn; thiếu đồ thì bấm thùng không vào build được (chỉ còn cầm lên)
  const hint = (
    <ControlsHint>
      {!missing.length && (
        <>
          Nhấn <MouseIcon btn="left" /> vào thùng để build,{' '}
        </>
      )}
      nhấn <MouseIcon btn="right" /> để cầm thùng lên
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

/**
 * Thùng trên bàn (đang ngồi): bấm chuột phải lên cảnh 3D (nhả ra không kéo, kéo là trượt khung nhìn) = cầm thùng lên.
 * Build = chuột trái vào thùng (`EmptyBench`), không còn phím B
 */
function useBoxPick() {
  useEffect(() => {
    let down: { x: number; y: number } | null = null
    const onDown = (e: PointerEvent) => {
      down =
        e.button === 2 && (e.target as Element)?.tagName === 'CANVAS'
          ? { x: e.clientX, y: e.clientY }
          : null
    }
    const onUp = (e: PointerEvent) => {
      const d = down
      down = null
      if (e.button !== 2 || !d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return
      const s = useGame.getState()
      if (s.screen === 'bench' && !s.walk && s.benchBox && !s.build) s.pickBench()
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])
}

/** HUD bàn build chưa vào build: nút quay lại (Esc), góc nhìn + khung trạng thái thùng trên bàn */
export function EmptyBenchHud() {
  const s = useGame()
  useBoxPick()
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
