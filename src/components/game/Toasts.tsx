import { useGame } from '@/store'
import { cn } from '@/lib/format'

const KIND = { info: 'bg-panel-2', good: 'bg-[#1f7a43]', bad: 'bg-[#a8322f]' } as const

/** Tách thông báo thành từng dòng tại dấu gạch " — " / xuống dòng, viết hoa chữ đầu dòng sau */
const lines = (text: string) =>
  text.split(/\s+—\s+|\n/).map((l, i) => (i ? l.charAt(0).toUpperCase() + l.slice(1) : l))

/** ẩn 1 toast trước khi hết giờ */
const hide = (id: number) =>
  useGame.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))

/** Thông báo nổi ở giữa phía trên màn hình, bấm vào để ẩn */
export function Toasts() {
  const toasts = useGame((s) => s.toasts)
  return (
    <div className="pointer-events-none fixed top-3.5 left-1/2 z-[1000] flex -translate-x-1/2 flex-col items-center gap-1.5">
      {toasts.map((t) => (
        <div
          key={t.id}
          title="Bấm để ẩn"
          onClick={() => hide(t.id)}
          style={{ cursor: 'var(--cursor-hand)' }}
          className={cn(
            'pointer-events-auto animate-pop rounded-xl px-4.5 py-2 font-extrabold shadow-[0_4px_0_#0006]',
            KIND[t.kind],
          )}
        >
          {lines(t.text).map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      ))}
    </div>
  )
}
