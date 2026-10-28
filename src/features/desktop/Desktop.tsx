import { useGame } from '@/store'
import { Window } from '@/components/ui'
import { APPS, APP_IDS, STAND_ICON } from './apps'
import { DesktopIcon } from './DesktopIcon'
import { Taskbar } from './Taskbar'
import { Wallpaper } from './Wallpaper'

// Màn hình "máy tính trong game": icon app, các cửa sổ, taskbar
export function Desktop() {
  const windows = useGame((s) => s.windows)
  const minimized = useGame((s) => s.minimized)
  const hasOffer = useGame((s) => s.offers.length > 0)
  const wallpaper = useGame((s) => s.wallpaper)
  const { openApp, minimizeApp, closeApp, standUp } = useGame.getState()

  return (
    <div className="fixed inset-0 overflow-hidden">
      <Wallpaper id={wallpaper} />

      <div className="absolute top-4 left-4 z-[2] flex flex-col gap-3 max-md:right-4 max-md:grid max-md:grid-cols-4 max-md:justify-items-center max-md:gap-y-4">
        {APP_IDS.map((id) => (
          <DesktopIcon
            key={id}
            app={APPS[id]}
            badge={id === 'messenger' && hasOffer}
            onOpen={() => openApp(id)}
          />
        ))}
        {/* đứng dậy đi lại trong phòng: sang bàn build, lấy hàng ở cửa, kết thúc ngày ở lịch treo tường (không còn icon ra thẳng bàn build) */}
        <DesktopIcon app={STAND_ICON} onOpen={() => standUp('pc')} />
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
    </div>
  )
}
