import type { ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from '@/lib/format'

/** Khối 1 nhóm cài đặt (khuôn bảng xếp hạng): hàng tiêu đề chữ xám + ⓘ bên phải, các dòng `bg-panel-2` */
export function Section({
  title,
  info,
  children,
}: {
  title: string
  info?: string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl bg-black/15 p-1.5">
      <div className="flex items-center gap-3 px-3 pt-1 pb-2 text-[13px] font-bold text-muted">
        <div className="flex-1">{title}</div>
        {info && (
          <span title={info} className="shrink-0 hover:text-ink">
            <CircleAlert className="size-4" />
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

/** Dòng trong khối: chữ trái, điều khiển / giá trị phải */
export function Row({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex items-center gap-3 rounded-xl bg-panel-2 px-3 py-2.5', className)}>
      {children}
    </div>
  )
}
