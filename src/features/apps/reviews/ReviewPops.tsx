import { X } from 'lucide-react'
import { useGame } from '@/store'
import { ReviewCard } from './ReviewCard'

const CLOSE =
  'absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-md text-muted hover:bg-white/10 hover:text-white [&_svg]:size-4'

/**
 * Thông báo góc phải trên: thông báo hệ thống (bị ban khỏi chợ...) + đánh giá mới của khách (bấm mở app Đánh giá).
 * Ghim cố định sát góc trên cùng, nằm trên cả cửa sổ / popup
 */
export function ReviewPops() {
  const pops = useGame((s) => s.reviewPops)
  const notices = useGame((s) => s.notices)
  const screen = useGame((s) => s.screen)
  if (screen === 'title' || (!pops.length && !notices.length)) return null
  const open = () => {
    const s = useGame.getState()
    s.goPC()
    s.openApp('reviews')
  }
  return (
    <div className="pointer-events-none fixed top-3 right-3 z-[3000] flex w-[min(320px,calc(100vw-24px))] flex-col gap-1.5">
      {notices.map((n) => (
        <div
          key={n.id}
          role="alert"
          className="pointer-events-auto relative animate-pop rounded-xl border border-red/60 bg-[#2a0f12]/95 px-3 py-2 pr-8 shadow-[0_6px_16px_rgba(0,0,0,0.45)]"
        >
          <div className="text-[11px] font-extrabold tracking-wide text-[#ffb4b4] uppercase">
            {n.title}
          </div>
          <div className="text-sm leading-snug">{n.text}</div>
          <button
            type="button"
            aria-label="Ẩn thông báo"
            title="Ẩn thông báo"
            className={CLOSE}
            onClick={() => useGame.getState().dismissNotice(n.id)}
          >
            <X />
          </button>
        </div>
      ))}
      {pops.map((r) => (
        <div
          key={r.id}
          role="button"
          tabIndex={0}
          title="Xem tất cả đánh giá"
          onClick={open}
          onKeyDown={(e) => e.key === 'Enter' && open()}
          className="pointer-events-auto relative animate-pop cursor-pointer rounded-xl border border-white/10 bg-[#0e1018]/95 p-1 shadow-[0_6px_16px_rgba(0,0,0,0.45)]"
        >
          <div className="px-2 pt-1 text-[11px] font-extrabold tracking-wide text-muted uppercase">
            ⭐ Đánh giá mới
          </div>
          <ReviewCard r={r} className="bg-transparent" />
          <button
            type="button"
            aria-label="Ẩn thông báo"
            title="Ẩn thông báo đánh giá"
            className={CLOSE}
            onClick={(e) => {
              e.stopPropagation()
              useGame.getState().dismissReview(r.id)
            }}
          >
            <X />
          </button>
        </div>
      ))}
    </div>
  )
}
