import type { ReactNode } from 'react'
import { cn } from '@/lib/format'

const TONES = {
  red: 'border-red/70 bg-red/15 [&_.alert-title]:text-[#ffb4b4] text-[#ffd6d6]',
  yellow: 'border-yellow/70 bg-yellow/10 [&_.alert-title]:text-yellow text-[#fff0c2]',
} as const

/** Khung cảnh báo nổi bật trong HUD / cửa sổ (thay dòng chữ đỏ nhỏ dễ bị bỏ sót) */
export function Alert({
  tone = 'red',
  title,
  children,
  className,
}: {
  tone?: keyof typeof TONES
  title: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col gap-1.5 rounded-xl border-2 px-3 py-2 shadow-[0_3px_0_#0005]',
        TONES[tone],
        className,
      )}
    >
      <div className="alert-title font-extrabold">⚠️ {title}</div>
      {children}
    </div>
  )
}
