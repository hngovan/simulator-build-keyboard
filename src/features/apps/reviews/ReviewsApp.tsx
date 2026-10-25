import { useState } from 'react'
import { useGame } from '@/store'
import { Muted, OptionChip } from '@/components/ui'
import { ReviewCard, Stars } from './ReviewCard'

const FILTERS = { all: 'Tất cả', good: '4–5 sao', bad: '1–2 sao' } as const

// Đánh giá của khách: sao trung bình + danh sách mới nhất trước
export function ReviewsApp() {
  const reviews = useGame((s) => s.reviews)
  const rep = useGame((s) => s.rep)
  const [filter, setFilter] = useState<keyof typeof FILTERS>('all')
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.stars, 0) / reviews.length : 0
  const list = [...reviews]
    .reverse()
    .filter((r) => filter === 'all' || (filter === 'good' ? r.stars >= 4 : r.stars <= 2))
  return (
    <div className="flex h-[min(560px,68vh)] flex-col gap-2 group-data-fill/win:h-full">
      <div className="flex items-center gap-3 rounded-xl bg-black/15 px-3 py-2">
        <div className="font-head text-3xl font-extrabold">{avg ? avg.toFixed(1) : '–'}</div>
        <div className="flex-1">
          <Stars n={Math.round(avg)} className="block text-lg" />
          <Muted className="text-[13px]">
            {reviews.length} đánh giá · uy tín {rep}
          </Muted>
        </div>
      </div>
      <div className="flex gap-1.5">
        {Object.entries(FILTERS).map(([k, label]) => (
          <OptionChip
            key={k}
            active={filter === k}
            onClick={() => setFilter(k as typeof filter)}
            className="text-[13px]"
          >
            {label}
          </OptionChip>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {list.map((r) => (
          <ReviewCard key={r.id} r={r} />
        ))}
        {!list.length && (
          <Muted className="py-6 text-center text-[13px]">
            Chưa có đánh giá nào. Giao đơn cho khách để nhận đánh giá nhé.
          </Muted>
        )}
      </div>
    </div>
  )
}
