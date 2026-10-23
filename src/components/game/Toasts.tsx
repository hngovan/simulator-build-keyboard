import { useGame } from '@/store'
import { cn } from '@/lib/format'

const KIND = { info: 'bg-panel-2', good: 'bg-[#1f7a43]', bad: 'bg-[#a8322f]' } as const

/** Thông báo nổi ở giữa phía trên màn hình */
export function Toasts() {
  const toasts = useGame((s) => s.toasts)
  return (
    <div className="pointer-events-none fixed top-3.5 left-1/2 z-[1000] flex -translate-x-1/2 flex-col items-center gap-1.5">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'animate-pop rounded-xl px-4.5 py-2 font-extrabold shadow-[0_4px_0_#0006]',
            KIND[t.kind],
          )}
        >
          {t.text}
        </div>
      ))}
    </div>
  )
}
