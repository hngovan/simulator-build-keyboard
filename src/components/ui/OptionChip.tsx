import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/format'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  swatch?: string
  /** dạng thẻ lớn có tiêu đề + mô tả */
  big?: boolean
  children: ReactNode
}

/** Nút chọn 1 lựa chọn (màu, chất liệu, loại...) */
export function OptionChip({ active, swatch, big, className, children, ...props }: Props) {
  return (
    <button
      className={cn(
        'rounded-lg border-2 bg-panel text-xs disabled:opacity-60',
        active ? 'border-yellow bg-[#3a3420]' : 'border-line',
        big
          ? 'flex min-w-[150px] flex-1 flex-col items-start px-2.5 py-2 text-left'
          : 'inline-flex items-center gap-1 px-2 py-0.5',
        className,
      )}
      {...props}
    >
      {swatch && (
        <i
          className="size-2.5 rounded-full border border-white/30"
          style={{ background: swatch }}
        />
      )}
      {children}
    </button>
  )
}
