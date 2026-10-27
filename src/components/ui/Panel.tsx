import type { HTMLAttributes, ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from '@/lib/format'

type DivProps = HTMLAttributes<HTMLDivElement>

/** Khối nền tối nằm trong cửa sổ */
export function Panel({ className, ...props }: DivProps) {
  return <div className={cn('mt-2.5 rounded-xl bg-panel-2 p-3', className)} {...props} />
}

/** Thẻ nổi trên màn hình 3D (HUD) */
export function HudCard({ className, ...props }: DivProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border-[3px] border-black/40 bg-panel/95 p-3 shadow-[0_8px_24px_#0006]',
        className,
      )}
      {...props}
    />
  )
}

/** Tiêu đề nhỏ của khối */
/** info: ghi chú phụ (lưu cùng tiến trình, không hoàn tác được...) gói vào icon "!", rê chuột mới hiện */
export function Heading({
  children,
  note,
  info,
}: {
  children: ReactNode
  note?: ReactNode
  info?: string
}) {
  return (
    <h4 className="mb-2 flex items-center gap-1.5 text-base">
      {children} {note && <span className="text-xs font-normal text-muted">{note}</span>}
      {/* ⓘ góc phải, kiểu đầu app bảng xếp hạng */}
      {info && (
        <span
          title={info}
          aria-label={info}
          className="ml-auto shrink-0 cursor-help text-muted hover:text-ink"
        >
          <CircleAlert className="size-5" />
        </span>
      )}
    </h4>
  )
}

/** Dòng chữ phụ màu xám */
export function Muted({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('text-xs text-muted', className)} {...props} />
}
