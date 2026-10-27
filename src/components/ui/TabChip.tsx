import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/format'

/** Tab lọc kiểu bảng xếp hạng: icon + chữ (+ số món), đang chọn = khối vàng đặc có bóng đổ */
export function TabChip({
  active,
  icon: Icon,
  count,
  title,
  onClick,
  className,
  children,
}: {
  active: boolean
  /** không có thì chỉ chữ (menu mục hàng Shopii) */
  icon?: LucideIcon
  /** số món trong mục (Kho) */
  count?: number
  /** tooltip 1 dòng */
  title?: string
  onClick: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-head text-sm font-extrabold transition-colors',
        active
          ? 'bg-yellow text-[#3a2b00] shadow-[0_3px_0_rgba(0,0,0,0.35),inset_0_2px_0_rgba(255,255,255,0.3)]'
          : 'bg-panel-2 text-ink/85 hover:bg-line',
        className,
      )}
    >
      {Icon && <Icon className="size-4" />}
      {children}
      {count !== undefined && (
        <span
          className={cn(
            'ml-auto rounded-md px-1.5 text-xs tabular-nums',
            active ? 'bg-black/15' : 'bg-black/25 text-muted',
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}
