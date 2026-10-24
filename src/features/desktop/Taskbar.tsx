import { useEffect, useState } from 'react'
import { useGame } from '@/store'
import { StatusChips } from '@/components/game/StatusChips'
import { cn } from '@/lib/format'
import type { AppId } from '@/store'
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

const ORDER_KEY = 'sbk-ui-taskbar'

/** Thứ tự icon người chơi tự xếp (tiện ích riêng máy); app mới thêm sau thì nối vào cuối */
function loadOrder(): AppId[] {
  try {
    const saved = JSON.parse(localStorage.getItem(ORDER_KEY) ?? '[]') as AppId[]
    const known = saved.filter((id) => APP_IDS.includes(id))
    return [...known, ...APP_IDS.filter((id) => !known.includes(id))]
  } catch {
    return APP_IDS
  }
}

/** Thanh taskbar dưới cùng màn hình máy tính; kéo thả icon để đổi chỗ */
export function Taskbar() {
  const windows = useGame((s) => s.windows)
  const { openApp } = useGame.getState()
  const [order, setOrder] = useState(loadOrder)
  const [dragging, setDragging] = useState<AppId | null>(null)
  // kéo qua icon khác thì đổi chỗ ngay để thấy trước vị trí mới
  const moveTo = (target: AppId) => {
    if (!dragging || dragging === target) return
    setOrder((list) => {
      const next = list.filter((id) => id !== dragging)
      next.splice(list.indexOf(target), 0, dragging)
      return next
    })
  }
  const save = () => {
    setDragging(null)
    try {
      localStorage.setItem(ORDER_KEY, JSON.stringify(order))
    } catch {
      // không lưu được thì lần sau về thứ tự mặc định
    }
  }
  return (
    <div className="absolute inset-x-0 bottom-0 z-[100] grid h-[58px] grid-cols-[1fr_auto_1fr] items-center gap-2 border-t-2 border-black/50 bg-[rgba(14,16,24,0.92)] px-2.5 backdrop-blur-md">
      <span className="justify-self-start rounded-xl bg-yellow px-3.5 py-2 font-head text-base font-extrabold text-[#3a2b00] shadow-[0_3px_0_#0006]">
        ⌨ KeebOS
      </span>
      <div className="flex items-center justify-center gap-2">
        {order.map((id) => (
          <button
            key={id}
            title={`${APPS[id].title} (kéo để đổi chỗ)`}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move'
              setDragging(id)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              moveTo(id)
            }}
            onDrop={(e) => e.preventDefault()}
            onDragEnd={save}
            className={cn(
              'relative grid size-[42px] cursor-grab place-items-center rounded-xl bg-panel-2 transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-[#34405a] active:cursor-grabbing',
              windows.includes(id) &&
                'after:absolute after:inset-x-3.5 after:bottom-[3px] after:h-[3px] after:rounded after:bg-yellow',
              dragging === id && 'opacity-40',
            )}
            onClick={() => openApp(id)}
          >
            <img src={APPS[id].icon} alt="" className="size-6 brightness-0 invert" />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2.5 justify-self-end">
        <StatusChips />
        <Clock />
      </div>
    </div>
  )
}
