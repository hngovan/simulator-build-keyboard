import { useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/format'

/**
 * Tooltip kiểu thanh menu bàn build (nền tối, chữ đậm) cho phần tử bất kỳ.
 * Vẽ qua portal theo toạ độ màn hình nên không bị khung cuộn / cửa sổ app cắt mất.
 * Nội dung: `content` hoặc `label` (2 tên như nhau); `hidden`: tạm ẩn (vd đang kéo thả)
 */
export function Tooltip({
  content,
  label,
  children,
  side = 'top',
  hidden,
  className,
}: {
  content?: ReactNode
  label?: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom'
  hidden?: boolean
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [at, setAt] = useState<{ x: number; y: number } | null>(null)
  const show = () => {
    // span bọc là display: contents (không có khung) → đo phần tử con
    const r = (ref.current?.firstElementChild ?? ref.current)?.getBoundingClientRect()
    if (r) setAt({ x: r.left + r.width / 2, y: side === 'top' ? r.top : r.bottom })
  }
  return (
    <span
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={() => setAt(null)}
      onMouseDown={() => setAt(null)}
      className={cn('contents', className)}
    >
      {children}
      {at &&
        !hidden &&
        createPortal(
          <span
            role="tooltip"
            style={{ left: at.x, top: at.y }}
            className={cn(
              'pointer-events-none fixed z-[200] max-w-[320px] -translate-x-1/2 animate-fade-in rounded-lg border border-white/10 bg-[#0e1018]/95 px-2.5 py-1.5 text-center text-[13px] leading-snug font-extrabold text-white shadow-[0_6px_16px_rgba(0,0,0,0.45)]',
              side === 'top' ? '-translate-y-[calc(100%+8px)]' : 'translate-y-2',
            )}
          >
            {content ?? label}
          </span>,
          document.body,
        )}
    </span>
  )
}
