import type { ReactNode } from 'react'
import { cn } from '@/lib/format'

export type ArtCardState = 'owned' | 'outdated' | 'buyable'

interface Props {
  art: ReactNode
  title: ReactNode
  desc?: ReactNode
  state: ArtCardState
  /** chữ hiện khi rê chuột (vd "Mua 300k") */
  action?: string
  onAction?: () => void
}

/**
 * Thẻ có ảnh minh hoạ: viền xanh = đang dùng, mờ = đã có bản tốt hơn,
 * còn lại rê chuột hiện chữ action, click để thực hiện
 */
export function ArtCard({ art, title, desc, state, action, onAction }: Props) {
  const buyable = state === 'buyable'
  return (
    <div
      className={cn(
        'group flex flex-col items-start gap-1.5 rounded-xl border-2 bg-panel-2 p-2.5',
        state === 'owned' && 'border-green',
        state === 'outdated' && 'border-transparent opacity-50',
        buyable && 'cursor-pointer border-transparent hover:border-yellow',
      )}
      onClick={buyable ? onAction : undefined}
      title={
        state === 'owned'
          ? 'Đang dùng'
          : state === 'outdated'
            ? 'Đã có bản tốt hơn'
            : (action ?? 'Bấm để mua')
      }
    >
      <div className="relative w-full group-active:translate-y-0.5">
        {art}
        {buyable && action && (
          <div className="absolute inset-0 grid place-items-center rounded-[10px] bg-[rgba(10,12,18,0.6)] font-head text-xl font-extrabold text-yellow opacity-0 transition-opacity [text-shadow:0_2px_0_#000a] group-hover:opacity-100">
            {action}
          </div>
        )}
      </div>
      <b>{title}</b>
      {desc && <div className="text-xs text-muted">{desc}</div>}
    </div>
  )
}
