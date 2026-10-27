import type { ReactNode } from 'react'
import type { BadgeTone } from '@/components/ui'
import { cn } from '@/lib/format'

/** màu chữ theo tone (cùng bảng màu `BUTTON_TONES`, xanh dương sáng hơn cho dễ đọc trên nền tối) */
const TONE_TEXT: Record<BadgeTone, string> = {
  default: 'text-muted',
  green: 'text-green',
  yellow: 'text-yellow',
  red: 'text-red',
  blue: 'text-[#7fb0ff]',
  orange: 'text-orange',
  purple: 'text-[#a993ff]',
  money: 'text-green',
  rep: 'text-[#f0c060]',
  day: 'text-[#7fb0ff]',
}

/** Nhãn chữ màu (thay Badge, giống bảng xếp hạng): tag bài pass, nguồn món, trạng thái */
export function Tag({
  tone = 'default',
  title,
  className,
  children,
}: {
  tone?: BadgeTone
  title?: string
  className?: string
  children: ReactNode
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 text-[13px] font-bold [&_svg]:size-3.5',
        TONE_TEXT[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
