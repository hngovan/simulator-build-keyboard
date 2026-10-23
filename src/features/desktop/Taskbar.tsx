import { useEffect, useState } from 'react'
import { useGame } from '@/store'
import { Button } from '@/components/ui'
import { StatusChips } from '@/components/game/StatusChips'
import { cn } from '@/lib/format'
import { APPS, APP_IDS } from './apps'

function Clock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="font-head text-base font-extrabold">
      {now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
    </span>
  )
}

/** Thanh taskbar dưới cùng màn hình máy tính */
export function Taskbar() {
  const windows = useGame((s) => s.windows)
  const hasBuild = useGame((s) => !!s.build)
  const { openApp, goBench } = useGame.getState()
  return (
    <div className="absolute inset-x-0 bottom-0 z-[100] grid h-[58px] grid-cols-[1fr_auto_1fr] items-center gap-2 border-t-2 border-black/50 bg-[rgba(14,16,24,0.92)] px-2.5 backdrop-blur-md">
      <span className="justify-self-start rounded-xl bg-yellow px-3.5 py-2 font-head text-base font-extrabold text-[#3a2b00] shadow-[0_3px_0_#0006]">
        ⌨ KeebOS
      </span>
      <div className="flex items-center justify-center gap-2">
        {APP_IDS.map((id) => (
          <button
            key={id}
            title={APPS[id].title}
            className={cn(
              'relative size-[42px] rounded-xl bg-panel-2 text-xl',
              windows.includes(id) &&
                'after:absolute after:inset-x-3.5 after:bottom-[3px] after:h-[3px] after:rounded after:bg-yellow',
            )}
            onClick={() => openApp(id)}
          >
            {APPS[id].icon}
          </button>
        ))}
        {hasBuild && (
          <Button tone="green" size="sm" onClick={goBench}>
            🛠 Bàn build
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2.5 justify-self-end">
        <StatusChips />
        <Clock />
      </div>
    </div>
  )
}
