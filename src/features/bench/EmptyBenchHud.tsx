import { useEffect } from 'react'
import { useGame } from '@/store'
import { CATS, checkInventory } from '@/data/parts'
import { BackButton } from '@/components/ui'
import { StatusChips } from '@/components/game/StatusChips'
import { ControlsHint, KeyCap, MouseIcon } from '@/components/game/ControlsHint'
import { boxCustomer, isPackedBox } from '@/store/carrySlice'
import { ResetCamButton } from './CamModeButton'

/**
 * Khung giữa đáy khi bàn build chưa vào build: bàn trống (ra kệ cửa lấy thùng đơn), thùng đơn còn thiếu linh kiện (danh sách
 * thiếu + chỗ mua, đủ thì bắt đầu build), hoặc thùng vừa đóng gói (cầm ra kệ giao hàng)
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
          ? 'Đứng dậy ra kệ hàng cuối hành lang (hoặc kệ cất đơn) cầm thùng đơn, mang về bấm bàn để đặt lên'
          : 'Chưa nhận đơn nào: về máy tính mở Mezzenger nhận đơn, thùng đơn tới kệ ngoài cửa / kệ cất đơn'}
      </div>,
    )
  const who = boxCustomer(s, box)
  // thùng đã đóng gói / thùng đơn đủ đồ: dòng hướng dẫn như khi tương tác đồ vật (chuột phải cầm, B mở thùng; `useBoxKeys`)
  if (isPackedBox(s, box))
    return (
      <ControlsHint>
        Nhấn <MouseIcon btn="right" /> để cầm thùng lên mang ra kệ giao hàng
        {s.packed.some((p) => p.order.id === box && p.session?.build) && (
          <>
            , nhấn <KeyCap>B</KeyCap> để mở thùng build lại
          </>
        )}
      </ControlsHint>
    )
  // thùng đơn trên bàn nhưng chưa vào build: còn thiếu linh kiện
  const missing =
    s.order?.id === box ? checkInventory(s.inventory, s.order).filter((c) => !c.ok) : []
  // cùng 1 dòng hướng dẫn cho thùng đơn; thiếu đồ thì phím B xám (bấm không vào build)
  const hint = (
    <ControlsHint>
      Nhấn <MouseIcon btn="right" /> để cầm thùng lên, nhấn{' '}
      <KeyCap off={!!missing.length}>B</KeyCap> để build
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
 * Thùng trên bàn (đang ngồi): bấm chuột phải lên cảnh 3D (nhả ra không kéo, kéo là xoay camera) = cầm thùng lên;
 * phím B = mở thùng (đủ đồ thì bắt đầu build, thùng đã đóng gói thì mở ra build lại). Bỏ qua khi đang gõ chữ / có popup
 */
function useBoxKeys() {
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
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.key.toLowerCase() !== 'b') return
      if (
        (e.target as HTMLElement | null)?.closest(
          'input, textarea, select, [contenteditable="true"]',
        )
      )
        return
      if (document.querySelector('[role="dialog"]')) return
      const s = useGame.getState()
      if (s.screen !== 'bench' || s.walk || !s.benchBox || s.build) return
      if (isPackedBox(s, s.benchBox)) return s.unpackBox()
      s.buildOrder(s.benchBox)
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('keydown', onKey)
    }
  }, [])
}

/** HUD bàn build chưa vào build: nút quay lại (Esc), góc nhìn + khung trạng thái thùng trên bàn */
export function EmptyBenchHud() {
  const s = useGame()
  useBoxKeys()
  return (
    <>
      <div className="pointer-events-none fixed inset-x-3 top-3 z-[8] flex items-center justify-between max-md:flex-wrap max-md:gap-2 [&>*]:pointer-events-auto">
        <div className="flex gap-2">
          <BackButton onClick={() => s.standUp('bench')} />
          <ResetCamButton />
        </div>
        <StatusChips />
      </div>
      <BenchStatus />
    </>
  )
}
