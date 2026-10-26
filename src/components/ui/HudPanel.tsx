import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/format'

const OPEN_KEY = 'sbk-ui-open:'

/** Trạng thái mở / thu gọn nhớ theo id (tiện ích riêng máy; localStorage lỗi thì bỏ qua) */
export function useOpen(id: string, initial = true) {
  // điện thoại: panel HUD mặc định thu gọn (chưa từng bấm) cho đỡ che cảnh 3D
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches)
    initial = false
  const [open, setOpen] = useState(() => {
    try {
      const v = localStorage.getItem(OPEN_KEY + id)
      return v === null ? initial : v === '1'
    } catch {
      return initial
    }
  })
  const toggle = () => {
    const next = !open
    setOpen(next)
    try {
      localStorage.setItem(OPEN_KEY + id, next ? '1' : '0')
    } catch {
      // không lưu được thì thôi, lần sau mở lại mặc định
    }
  }
  return [open, toggle] as const
}

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden
      className={cn('text-xs text-muted transition-transform', !open && '-rotate-90')}
    >
      ▼
    </span>
  )
}

/**
 * Thẻ HUD thu gọn được: bấm tiêu đề để đóng / mở. Thân cuộn riêng (tiêu đề mục con dính lại),
 * footer (nút chính) luôn nằm cố định dưới đáy thẻ
 */
export function HudPanel({
  id,
  title,
  footer,
  children,
  className,
}: {
  id: string
  title: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
}) {
  const [open, toggle] = useOpen(id)
  return (
    <div
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-2xl border-[3px] border-black/40 bg-panel/95 shadow-[0_8px_24px_#0006]',
        className,
      )}
    >
      <button
        onClick={toggle}
        aria-expanded={open}
        title={open ? 'Thu gọn' : 'Mở ra'}
        className="flex w-full shrink-0 items-center gap-2 px-3 py-2.5 text-left font-head text-base font-extrabold transition-colors hover:bg-white/5"
      >
        <span className="min-w-0 flex-1">{title}</span>
        <Chevron open={open} />
      </button>
      {open && (
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 pb-3">
          {children}
        </div>
      )}
      {open && footer && <div className="shrink-0 border-t border-line px-3 py-2.5">{footer}</div>}
    </div>
  )
}

/** Mục con trong HudPanel: tiêu đề dính trên cùng khi cuộn, bấm để đóng / mở */
export function HudSection({
  id,
  title,
  children,
}: {
  id: string
  title: ReactNode
  children: ReactNode
}) {
  const [open, toggle] = useOpen(id)
  return (
    <section>
      <button
        onClick={toggle}
        aria-expanded={open}
        title={open ? 'Thu gọn mục này' : 'Mở mục này'}
        className="sticky top-0 z-[1] -mx-3 flex w-[calc(100%+1.5rem)] items-center gap-2 border-t border-line bg-panel px-3 py-1.5 text-left text-xs font-extrabold tracking-wide text-muted uppercase transition-colors hover:text-ink"
      >
        <span className="min-w-0 flex-1">{title}</span>
        <Chevron open={open} />
      </button>
      {open && <div className="flex flex-col gap-1.5 pt-1.5 pb-1">{children}</div>}
    </section>
  )
}

export type StepDotState = 'done' | 'ahead' | 'cur' | 'todo' | 'skip'

/** Chấm trạng thái của 1 bước: ✓ xong · số đang làm (vàng) / chưa tới (xám) · – không cần */
/** alert: bước gây lỗi (vd test thấy phím chưa hàn) — chấm đỏ nhấp nháy dấu "!" để quay lại sửa */
export function StepDot({
  state,
  alert,
  children,
}: {
  state: StepDotState
  alert?: boolean
  children?: ReactNode
}) {
  if (alert)
    return (
      <span className="grid size-[22px] shrink-0 animate-pulse place-items-center rounded-full bg-red text-[12px] font-extrabold text-white shadow-[0_0_0_4px_#ff5a5a66]">
        !
      </span>
    )
  return (
    <span
      className={cn(
        'grid size-[22px] shrink-0 place-items-center rounded-full text-[11px] font-extrabold',
        state === 'done' && 'bg-green text-[#0d2a17]',
        state === 'ahead' && 'bg-green/45 text-[#0d2a17]',
        state === 'cur' && 'bg-yellow text-[#3a2b00] shadow-[0_0_0_3px_#ffcc2e55]',
        state === 'todo' && 'bg-panel-2',
        state === 'skip' && 'bg-panel-2 text-muted',
      )}
    >
      {state === 'done' || state === 'ahead' ? '✓' : state === 'skip' ? '–' : children}
    </span>
  )
}
