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
    // mobile: 2 hàng (chip trạng thái trên, icon app cuộn ngang dưới), cao theo --taskbar-h
    <div className="absolute inset-x-0 bottom-0 z-[100] grid h-(--taskbar-h) grid-cols-[1fr_auto_1fr] items-center gap-2 border-t-2 border-black/50 bg-[rgba(14,16,24,0.92)] px-2.5 backdrop-blur-md max-md:flex max-md:flex-col max-md:justify-center max-md:gap-1.5 max-md:px-2">
      <span className="justify-self-start rounded-xl bg-yellow px-3.5 py-2 font-head text-base font-extrabold text-[#3a2b00] shadow-[0_3px_0_#0006] max-md:hidden">
        ⌨ KeebOS
      </span>
      <div className="flex items-center justify-center gap-2 max-md:order-2 max-md:w-full max-md:justify-start max-md:overflow-x-auto max-md:pb-0.5 max-md:[scrollbar-width:none]">
        {order.map((id) => (
          // rê chuột hiện tooltip tên app phía trên icon (cùng kiểu tooltip thanh menu bàn build)
          <span key={id} className="group/tip relative inline-flex">
            <button
              aria-label={APPS[id].title}
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
                'relative grid size-[42px] shrink-0 cursor-grab place-items-center rounded-xl bg-panel-2 transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-[#34405a] active:cursor-grabbing',
                windows.includes(id) &&
                  'after:absolute after:inset-x-3.5 after:bottom-[3px] after:h-[3px] after:rounded after:bg-yellow',
                dragging === id && 'opacity-40',
              )}
              onClick={() => openApp(id)}
            >
              <img src={APPS[id].icon} alt="" className="size-6 brightness-0 invert" />
            </button>
            {!dragging && (
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2.5 -translate-x-1/2 -translate-y-1 rounded-lg border border-white/10 bg-[#0e1018]/95 px-2.5 py-1.5 text-[13px] font-extrabold whitespace-nowrap text-white opacity-0 shadow-[0_6px_16px_rgba(0,0,0,0.45)] transition-[opacity,transform] duration-150 group-hover/tip:translate-y-0 group-hover/tip:opacity-100"
              >
                {APPS[id].title}
              </span>
            )}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2.5 justify-self-end max-md:order-1 max-md:justify-center max-md:self-stretch">
        <StatusChips tipSide="top" />
        <span className="max-md:hidden">
          <Clock />
        </span>
      </div>
    </div>
  )
}
