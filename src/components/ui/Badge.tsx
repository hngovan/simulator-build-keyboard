import type { ReactNode } from 'react'
import { cn } from '@/lib/format'

const TONES = {
  default: 'bg-panel-2',
  green: 'bg-green text-[#0d2a17]',
  blue: 'bg-blue',
  yellow: 'bg-yellow text-[#3a2b00]',
  red: 'bg-[#6a2424]',
  money: 'bg-[#2f6d3f]',
  rep: 'bg-[#7a5a12]',
  day: 'bg-[#2a4a7a]',
} as const

// Nhãn nhỏ: nền nhạt cùng màu + viền mảnh, chữ đậm màu (đỡ thô hơn khối màu đặc)
const BADGE_TONES = {
  default: 'bg-white/8 text-[#d5dae6] ring-white/15',
  green: 'bg-green/15 text-green ring-green/35',
  blue: 'bg-blue/15 text-[#7fb0ff] ring-blue/35',
  yellow: 'bg-yellow/15 text-yellow ring-yellow/35',
  orange: 'bg-orange/15 text-orange ring-orange/35',
  red: 'bg-red/15 text-[#ff8a8a] ring-red/35',
  money: 'bg-green/15 text-green ring-green/35',
  rep: 'bg-[#d9a441]/15 text-[#f0c060] ring-[#d9a441]/35',
  day: 'bg-blue/15 text-[#7fb0ff] ring-blue/35',
} as const

export type BadgeTone = keyof typeof BADGE_TONES

/** Nhãn bo tròn nhỏ */
export function Badge({
  tone = 'default',
  children,
  className,
}: {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'ml-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold whitespace-nowrap ring-1 ring-inset',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Chip trạng thái lớn hơn (tiền, uy tín, ngày) */
export function Chip({
  tone = 'default',
  children,
}: {
  tone?: keyof typeof TONES
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'rounded-full px-3 py-1 font-head font-extrabold whitespace-nowrap shadow-[inset_0_-3px_0_#0004]',
        TONES[tone],
      )}
    >
      {children}
    </span>
  )
}
