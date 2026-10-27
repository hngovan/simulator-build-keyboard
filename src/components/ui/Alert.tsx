import type { ReactNode } from 'react'
import { TriangleAlert, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/format'

const TONES = {
  red: 'border-red/70 bg-red/15 [&_.alert-title]:text-[#ffb4b4] text-[#ffd6d6]',
  yellow: 'border-yellow/70 bg-yellow/10 [&_.alert-title]:text-yellow text-[#fff0c2]',
} as const

/** Khung cảnh báo nổi bật trong HUD / cửa sổ (thay dòng chữ đỏ nhỏ dễ bị bỏ sót) */
export function Alert({
  tone = 'red',
  icon: Icon = TriangleAlert,
  title,
  children,
  className,
}: {
  tone?: keyof typeof TONES
  /** icon đầu tiêu đề (mặc định tam giác cảnh báo) */
  icon?: LucideIcon
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
      <div className="alert-title flex items-start gap-1.5 font-extrabold">
        <Icon className="mt-0.5 size-4 shrink-0" strokeWidth={2.5} />
        <span>{title}</span>
      </div>
      {children}
    </div>
  )
}
