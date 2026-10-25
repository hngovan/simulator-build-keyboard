import { X } from 'lucide-react'
import { useGame } from '@/store'
import { ReviewCard } from './ReviewCard'

/** Thông báo đánh giá mới của khách ở góc phải trên; bấm để mở app Đánh giá */
export function ReviewPops() {
  const pops = useGame((s) => s.reviewPops)
  const screen = useGame((s) => s.screen)
  if (screen === 'title' || !pops.length) return null
  const open = () => {
    const s = useGame.getState()
    s.goPC()
    s.openApp('reviews')
  }
  return (
    // nằm dưới chip tiền / uy tín (bàn build) và icon Bàn build (desktop)
    <div className="pointer-events-none fixed top-28 right-3 z-[1000] flex w-[320px] flex-col gap-1.5">
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
            className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-md text-muted hover:bg-white/10 hover:text-white [&_svg]:size-4"
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
