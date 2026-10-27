import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell, X } from 'lucide-react'
import { useGame } from '@/store'
import { cn } from '@/lib/format'

type Side = 'top' | 'bottom'

const CLOSE =
  'grid size-6 shrink-0 place-items-center rounded-md text-muted hover:bg-white/10 hover:text-white [&_svg]:size-4'

/**
 * Chuông thông báo cạnh chip trạng thái (góc phải): số chưa xem, bấm mở danh sách thông báo đã nhận
 * (khách phát hiện bán đồ, đánh giá, fast bid...), xoá từng cái hoặc xoá hết. `side`: bảng mở lên / xuống
 */
export function NotifyBell({ side }: { side: Side }) {
  const inbox = useGame((s) => s.inbox)
  const unread = useGame((s) => s.unread)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const { readNotify, removeNotify, clearNotify } = useGame.getState()

  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      const t = e.target as Node
      if (!ref.current?.contains(t) && !panel.current?.contains(t)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', away)
    window.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', away)
      window.removeEventListener('keydown', esc)
    }
  }, [open])
  // mở bảng (hoặc đang mở mà có thông báo mới) thì coi như đã xem hết
  useEffect(() => {
    if (open && unread) readNotify()
  }, [open, unread, readNotify])

  const openReviews = () => {
    const s = useGame.getState()
    s.goPC()
    s.openApp('reviews')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Thông báo"
        aria-expanded={open}
        title="Thông báo"
        onClick={() => setOpen(!open)}
        className="relative grid h-full min-h-8 place-items-center rounded-full bg-[#2c3647] px-2.5 shadow-[inset_0_-3px_0_#0004] hover:bg-[#34405a] [&_svg]:size-4"
      >
        <Bell className={cn(unread ? 'fill-yellow/40 text-yellow' : 'text-ink')} />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red px-1 text-[11px] leading-none font-extrabold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {/* portal ra body: nằm trên mọi cửa sổ / Keeb-chan (taskbar ở trong stacking context của desktop) */}
      {open &&
        createPortal(
          <div
            ref={panel}
            className={cn(
              'fixed right-3 z-[3100] flex max-h-[min(480px,70vh)] w-[340px] animate-pop flex-col gap-2 rounded-xl border-[3px] border-black/40 bg-panel p-2.5 text-left text-sm shadow-[0_12px_32px_rgba(0,0,0,0.55)]',
              // sát trên taskbar / dưới thanh menu bàn build; mobile: rộng hết màn
              side === 'top' ? 'bottom-[calc(var(--taskbar-h)+8px)]' : 'top-16',
              'max-md:inset-x-2 max-md:w-auto',
            )}
          >
            <div className="flex items-center gap-2 px-1">
              <span className="flex-1 font-head text-lg font-extrabold text-yellow">Thông báo</span>
              {inbox.length > 0 && (
                <button
                  type="button"
                  className="rounded-md px-2 py-0.5 text-xs font-bold text-muted hover:bg-white/10 hover:text-white"
                  onClick={clearNotify}
                >
                  Xoá hết
                </button>
              )}
            </div>
            <div className="flex min-h-0 flex-col gap-1.5 overflow-y-auto rounded-2xl bg-black/15 p-1.5">
              {inbox.length === 0 ? (
                <div className="py-6 text-center text-ink/75">Chưa có thông báo nào.</div>
              ) : (
                inbox.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-2 rounded-xl bg-panel-2 px-3 py-2"
                  >
                    <div
                      className={cn('min-w-0 flex-1', n.review && 'cursor-pointer')}
                      title={n.review ? 'Xem tất cả đánh giá' : undefined}
                      onClick={n.review ? openReviews : undefined}
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="flex-1 font-extrabold">{n.title}</span>
                        <span className="shrink-0 text-xs text-muted">Ngày {n.day}</span>
                      </div>
                      <div className="leading-snug text-ink/85">{n.text}</div>
                    </div>
                    <button
                      type="button"
                      aria-label="Xoá thông báo"
                      title="Xoá thông báo"
                      className={CLOSE}
                      onClick={() => removeNotify(n.id)}
                    >
                      <X />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
