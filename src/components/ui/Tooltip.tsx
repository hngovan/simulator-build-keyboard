import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/format'
import { placeTip } from './placeTip'

/**
 * Tooltip kiểu thanh menu bàn build (nền tối, chữ đậm) cho phần tử bất kỳ.
 * Vẽ qua portal theo toạ độ màn hình nên không bị khung cuộn / cửa sổ app cắt mất; đo kích thước thật rồi mới đặt
 * (`placeTip`: không đủ chỗ phía `side` thì lật sang phía kia, luôn nằm trong màn hình).
 * Nội dung: `content` hoặc `label` (2 tên như nhau); `hidden`: tạm ẩn (vd đang kéo thả); `wide`: nội dung nhiều dòng
 * (mô tả, gạch đầu dòng) căn trái, chữ thường
 */
export function Tooltip({
  content,
  label,
  children,
  side = 'top',
  hidden,
  wide,
  className,
}: {
  content?: ReactNode
  label?: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom'
  hidden?: boolean
  wide?: boolean
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const tip = useRef<HTMLSpanElement>(null)
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const show = () => {
    // span bọc là display: contents (không có khung) → đo phần tử con
    const r = (ref.current?.firstElementChild ?? ref.current)?.getBoundingClientRect()
    if (r) {
      setPos(null)
      setAnchor(r)
    }
  }
  const hide = () => setAnchor(null)
  useLayoutEffect(() => {
    if (!anchor || !tip.current) return
    const t = tip.current.getBoundingClientRect()
    setPos(placeTip(anchor, t.width, t.height, side))
  }, [anchor, side])
  return (
    <span
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={hide}
      onMouseDown={hide}
      onFocus={show}
      onBlur={hide}
      className={cn('contents', className)}
    >
      {children}
      {anchor &&
        !hidden &&
        createPortal(
          <span
            ref={tip}
            role="tooltip"
            style={pos ?? { left: 0, top: 0 }}
            className={cn(
              'pointer-events-none fixed z-[3000] max-w-[320px] animate-fade-in rounded-lg border border-white/10 bg-[#0e1018]/95 px-2.5 py-1.5 text-[13px] leading-snug text-white shadow-[0_6px_16px_rgba(0,0,0,0.45)]',
              wide
                ? 'w-64 text-left text-xs leading-relaxed font-normal'
                : 'text-center font-extrabold',
              // lần vẽ đầu chỉ để đo
              !pos && 'invisible',
            )}
          >
            {content ?? label}
          </span>,
          document.body,
        )}
    </span>
  )
}
