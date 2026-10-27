import { CustomerAvatar } from '@/components/game/CustomerAvatar'
import { cn } from '@/lib/format'
import type { Review } from '@/types'

/** Hàng sao vàng / xám */
export function Stars({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cn('tracking-tight whitespace-nowrap', className)} aria-label={`${n} sao`}>
      <span className="text-yellow">{'★'.repeat(n)}</span>
      <span className="text-white/20">{'★'.repeat(5 - n)}</span>
    </span>
  )
}

const KIND_TEXT = { ship: 'Đã nhận hàng', decline: 'Bị từ chối đơn', cancel: 'Huỷ đơn' } as const

/** 1 đánh giá: avatar, tên, sao, lời khách, uy tín +/- */
export function ReviewCard({ r, className }: { r: Review; className?: string }) {
  return (
    <div className={cn('flex shrink-0 gap-3 rounded-xl bg-panel-2 px-3 py-2', className)}>
      <CustomerAvatar
        avatar={r.avatar}
        customer={r.customer}
        className="size-10 shrink-0 ring-2 ring-white/15"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[14px]">
          <span className="truncate font-head font-extrabold">{r.customer}</span>
          <Stars n={r.stars} />
          {r.rep !== 0 && (
            <span
              className={cn(
                'ml-auto shrink-0 font-head text-[13px] font-extrabold',
                r.rep > 0 ? 'text-green' : 'text-red',
              )}
            >
              {r.rep > 0 ? '+' : '−'}
              {Math.abs(r.rep)} uy tín
            </span>
          )}
        </div>
        <div className="text-[14px] leading-snug">{r.text}</div>
        <div className="text-[13px] text-muted">
          Ngày {r.day} · {KIND_TEXT[r.kind]}
        </div>
      </div>
    </div>
  )
}
