import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { useGame } from '@/store'
import { BackButton, Window } from '@/components/ui'
import { cn } from '@/lib/format'
import { BEZEL, pcFrame } from '@/scene/models/computerLayout'
import { APPS, APP_IDS } from './apps'
import { DesktopIcon } from './DesktopIcon'
import { Taskbar } from './Taskbar'
import { Wallpaper } from './Wallpaper'

/** cỡ khung desktop theo cửa sổ trình duyệt (đổi cỡ thì tính lại) */
function usePcFrame() {
  const get = () => pcFrame(window.innerWidth, window.innerHeight)
  const [frame, setFrame] = useState(get)
  useEffect(() => {
    const on = () => setFrame(get())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return frame
}

/**
 * Màn hình "máy tính trong game": icon app, các cửa sổ, taskbar. Nằm trong khung đúng chỗ mặt kính màn hình 3D (~90%),
 * quanh đó là phòng (Bench làm nền); góc trên trái nút quay lại = đứng dậy (như Esc)
 */
export function Desktop() {
  const frame = usePcFrame()
  const windows = useGame((s) => s.windows)
  const minimized = useGame((s) => s.minimized)
  // còn đơn chào chưa mở xem ở Mezzenger
  const hasOffer = useGame((s) => s.offers.some((o) => !o.seen))
  const wallpaper = useGame((s) => s.wallpaper)
  const { openApp, minimizeApp, closeApp, standUp } = useGame.getState()
  // bấm vùng phòng quanh màn hình = đứng dậy (như nút quay lại / Esc); viền vỏ màn hình (`BEZEL`) vẫn tính là trong.
  // Nhấn và nhả đều phải ở vùng ngoài (kéo cửa sổ / bôi chữ lố ra mép không tính), có popup đang mở thì bỏ qua
  const downOut = useRef(false)
  const outside = (e: MouseEvent) => {
    if (e.target !== e.currentTarget) return false
    const fw = frame.w
    const fh = frame.h
    const x0 = (window.innerWidth - fw) / 2 - fw * BEZEL.side
    const y0 = (window.innerHeight - fh) / 2 - fh * BEZEL.top
    const x1 = (window.innerWidth + fw) / 2 + fw * BEZEL.side
    const y1 = (window.innerHeight + fh) / 2 + fh * BEZEL.bottom
    return e.clientX < x0 || e.clientX > x1 || e.clientY < y0 || e.clientY > y1
  }

  return (
    <div
      className="fixed inset-0 z-[1] grid place-items-center"
      onPointerDown={(e) => (downOut.current = outside(e))}
      onClick={(e) => {
        if (!downOut.current || !outside(e)) return
        if (document.querySelector('[role="dialog"]')) return
        standUp('pc')
      }}
    >
      {/* transform: khung là gốc toạ độ cho phần tử fixed bên trong (popup, cửa sổ phóng to) */}
      <div
        className="relative [transform:translateZ(0)] overflow-hidden"
        style={{ width: frame.w, height: frame.h }}
      >
        <Wallpaper id={wallpaper} />

        {/* icon xếp dọc, thiếu chỗ (màn thấp) thì tự sang cột bên cạnh, dừng trên taskbar */}
        <div className="absolute top-4 bottom-[calc(var(--taskbar-h)+1rem)] left-4 z-[2] flex flex-col flex-wrap content-start gap-3 max-md:right-4 max-md:bottom-auto max-md:grid max-md:grid-cols-4 max-md:justify-items-center max-md:gap-y-4">
          {APP_IDS.map((id) => (
            <DesktopIcon
              key={id}
              app={APPS[id]}
              badge={id === 'messenger' && hasOffer}
              onOpen={() => openApp(id)}
            />
          ))}
        </div>

        {windows.map((id, z) => {
          const app = APPS[id]
          const i = APP_IDS.indexOf(id)
          return (
            <Window
              key={id}
              title={app.title}
              color={app.color}
              width={app.width}
              zIndex={10 + z}
              initial={{
                x: Math.max(8, Math.min(frame.w - app.width - 8, 140 + i * 40)),
                // mọi app mở sát mép trên màn hình, chỉ lệch ngang cho khỏi chồng khít nhau
                y: 12,
              }}
              minimized={minimized.includes(id)}
              onFocus={() => openApp(id)}
              onMinimize={() => minimizeApp(id)}
              onClose={() => closeApp(id)}
            >
              <app.Component />
            </Window>
          )
        })}

        <Taskbar />
      </div>

      {/* rời máy tính, đi lại trong phòng (sang bàn build, lấy hàng ở cửa, kết thúc ngày ở lịch treo tường) */}
      <BackButton
        onClick={() => standUp('pc')}
        className={cn(
          'absolute top-3 left-3 z-[200]',
          // điện thoại: khung phủ kín, nút sang góc phải cho khỏi đè icon
          frame.full && 'right-3 left-auto',
        )}
      />
    </div>
  )
}
