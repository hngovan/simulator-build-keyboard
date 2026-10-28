import { useState } from 'react'
import {
  CircleAlert,
  MessageSquareText,
  Star,
  ThumbsDown,
  ThumbsUp,
  type LucideIcon,
} from 'lucide-react'
import { useGame } from '@/store'
import { Muted } from '@/components/ui'
import { cn } from '@/lib/format'
import { ReviewCard, Stars } from './ReviewCard'

type Filter = 'all' | 'good' | 'bad'
/** tab lọc: tên + icon (kiểu tab bảng xếp hạng) */
const FILTERS: [Filter, string, LucideIcon][] = [
  ['all', 'Tất cả', MessageSquareText],
  ['good', '4–5 sao', ThumbsUp],
  ['bad', '1–3 sao', ThumbsDown],
]
/** cách chấm sao (khớp `scoreDelivery` trong store/scoring.ts + `shipRep` trong data/reviews.ts) */
const HOW_SCORED =
  'Điểm giao hàng /100: âm thanh, màu keycap / case, mount, build, mối hàn, stab, lube, test phím, ngân sách, thao tác hoàn hảo (vùng vàng, thưởng tối đa +5); nút lỗi −15, linh kiện lỗi −8. Sao: ≥90 = 5★, ≥75 = 4★, ≥55 = 3★, ≥35 = 2★, khách báo lỗi nút tối đa 2★. Uy tín +(sao − 3), trễ mỗi ngày −1, case hỏng (nứt / tuôn ren) −2'

// Đánh giá của khách (style giống bảng xếp hạng): sao trung bình + danh sách mới nhất trước
export function ReviewsApp() {
  const reviews = useGame((s) => s.reviews)
  const rep = useGame((s) => s.rep)
  const [filter, setFilter] = useState<Filter>('all')
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.stars, 0) / reviews.length : 0
  const list = [...reviews]
    .reverse()
    .filter((r) => filter === 'all' || (filter === 'good' ? r.stars >= 4 : r.stars <= 3))
  return (
    <div className="flex h-[min(560px,68vh)] flex-col gap-3 group-data-fill/win:h-full">
      <div className="flex items-center gap-3">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-yellow/15 text-yellow">
          <Star className="size-9 fill-yellow/30" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-head text-2xl leading-tight font-extrabold text-yellow">
            Đánh giá
          </div>
          {/* tóm tắt: sao trung bình + số đánh giá + uy tín (chữ thường, không badge) */}
          <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted">
            <Stars n={Math.round(avg)} className="shrink-0" />
            <span className="font-head font-extrabold text-ink">{avg ? avg.toFixed(1) : '–'}</span>
            <span className="truncate">
              · {reviews.length} đánh giá · uy tín{' '}
              <b className={rep < 0 ? 'text-red' : 'text-ink'}>{rep}</b>
            </span>
          </div>
        </div>
        <span
          title={HOW_SCORED}
          aria-label={HOW_SCORED}
          className="shrink-0 self-start text-muted hover:text-ink"
        >
          <CircleAlert className="size-5" />
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(([k, name, Icon]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-head text-sm font-extrabold transition-colors',
              k === filter
                ? 'bg-yellow text-[#3a2b00] shadow-[0_3px_0_rgba(0,0,0,0.35),inset_0_2px_0_rgba(255,255,255,0.3)]'
                : 'bg-panel-2 text-ink/85 hover:bg-line',
            )}
          >
            <Icon className="size-4" />
            {name}
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto rounded-2xl bg-black/15 p-1.5">
        {list.map((r) => (
          <ReviewCard key={r.id} r={r} />
        ))}
        {!list.length && (
          <Muted className="py-8 text-center text-[13px]">
            Chưa có đánh giá nào. Giao đơn cho khách để nhận đánh giá nhé.
          </Muted>
        )}
      </div>
    </div>
  )
}
