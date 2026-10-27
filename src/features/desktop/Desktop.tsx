import { useState } from 'react'
import { useGame } from '@/store'
import { Window } from '@/components/ui'
import { APPS, APP_IDS, BENCH_ICON, END_DAY_ICON } from './apps'
import { DesktopIcon } from './DesktopIcon'
import { EndDayDialog } from './EndDayDialog'
import { Taskbar } from './Taskbar'

// Màn hình "máy tính trong game": icon app, các cửa sổ, taskbar
export function Desktop() {
  const windows = useGame((s) => s.windows)
  const minimized = useGame((s) => s.minimized)
  const hasOffer = useGame((s) => s.offers.length > 0)
  const hasBuild = useGame((s) => !!s.build)
  const { openApp, minimizeApp, closeApp, goBench } = useGame.getState()
  const [endDay, setEndDay] = useState(false)

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#1d3b6e_0%,#3f2b72_55%,#7a2f6a_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:22px_22px]" />
        <div className="absolute right-10 bottom-[70px] font-head text-[90px] font-extrabold text-white/10">
          KeebOS
        </div>
      </div>

      <div className="absolute top-4 left-4 z-[2] flex flex-col gap-3 max-md:right-4 max-md:grid max-md:grid-cols-4 max-md:justify-items-center max-md:gap-y-4">
        {APP_IDS.map((id) => (
          <DesktopIcon
            key={id}
            app={APPS[id]}
            badge={id === 'messenger' && hasOffer}
            onOpen={() => openApp(id)}
          />
        ))}
        {/* kết thúc ngày: popup tổng kết, chọn kết thúc hoặc làm tiếp */}
        <DesktopIcon app={END_DAY_ICON} onOpen={() => setEndDay(true)} />
        {/* mobile: bàn build nằm chung lưới icon (máy tính thì đứng riêng góc phải) */}
        <span className="md:hidden">
          <DesktopIcon app={BENCH_ICON} badge={hasBuild} onOpen={goBench} />
        </span>
      </div>
      {/* lối tắt bàn build đứng riêng ở góc phải trên cùng */}
      <div className="absolute top-4 right-4 z-[2] max-md:hidden">
        <DesktopIcon app={BENCH_ICON} badge={hasBuild} onOpen={goBench} />
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
              x: Math.max(8, Math.min(window.innerWidth - app.width - 8, 140 + i * 40)),
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
      {endDay && <EndDayDialog onClose={() => setEndDay(false)} />}
    </div>
  )
}
