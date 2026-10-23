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

export type BadgeTone = keyof typeof TONES

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
        'ml-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-extrabold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Chip trạng thái lớn hơn (tiền, uy tín, ngày) */
export function Chip({ tone = 'default', children }: { tone?: BadgeTone; children: ReactNode }) {
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
