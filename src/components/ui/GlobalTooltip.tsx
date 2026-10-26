import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/format'

/** chờ rê chuột bao lâu thì hiện (ms) */
const DELAY = 250
/** khoảng cách tooltip tới phần tử (px) */
const GAP = 8

/**
 * Tooltip kiểu game cho mọi phần tử có thuộc tính `title` trong toàn app (gắn 1 lần ở App):
 * rê chuột thì chuyển `title` sang `data-tip` (tắt tooltip mặc định của trình duyệt) và vẽ nhãn tối chữ đậm
 * giống `Tooltip` — ưu tiên phía trên, sát mép trên màn hình thì lật xuống dưới. Code mới chỉ cần ghi `title=`.
 */
export function GlobalTooltip() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number; below: boolean } | null>(
    null,
  )
  useEffect(() => {
    let timer = 0
    let current: HTMLElement | null = null
    const hide = () => {
      clearTimeout(timer)
      current = null
      setTip(null)
    }
    const over = (e: PointerEvent) => {
      // đang giữ chuột (kéo Keeb-chan, kéo cửa sổ, kéo đồ trong kho...) thì không hiện tooltip
      if (e.buttons) return hide()
      const el = (e.target as Element | null)?.closest?.<HTMLElement>('[title], [data-tip]')
      if (!el || el === current) return
      // title mới (React đổi prop) thì cập nhật lại data-tip
      const title = el.getAttribute('title')
      if (title) {
        el.dataset.tip = title
        el.removeAttribute('title')
      }
      // chỉ 1 dòng chữ chính, bỏ phần phụ xuống dòng
      const text = el.dataset.tip?.split('\n')[0].trim()
      hide()
      if (!text) return
      current = el
      timer = window.setTimeout(() => {
        if (current !== el || !el.isConnected) return
        const r = el.getBoundingClientRect()
        const below = r.top < 48
        setTip({ text, x: r.left + r.width / 2, y: below ? r.bottom + GAP : r.top - GAP, below })
      }, DELAY)
    }
    const out = (e: PointerEvent) => {
      if (current && !current.contains(e.relatedTarget as Node | null)) hide()
    }
    document.addEventListener('pointerover', over)
    document.addEventListener('pointerout', out)
    document.addEventListener('pointerdown', hide, true)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('wheel', hide, { passive: true })
    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerover', over)
      document.removeEventListener('pointerout', out)
      document.removeEventListener('pointerdown', hide, true)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('wheel', hide)
    }
  }, [])
  if (!tip) return null
  // giữ tooltip trong màn hình theo chiều ngang (rộng tối đa 320px)
  const x = Math.min(Math.max(tip.x, 170), window.innerWidth - 170)
  return createPortal(
    <span
      role="tooltip"
      style={{ left: x, top: tip.y }}
      className={cn(
        'pointer-events-none fixed z-[3000] max-w-[320px] -translate-x-1/2 animate-fade-in rounded-lg border border-white/10 bg-[#0e1018]/95 px-2.5 py-1.5 text-center text-[13px] leading-snug font-extrabold text-white shadow-[0_6px_16px_rgba(0,0,0,0.45)]',
        !tip.below && '-translate-y-full',
      )}
    >
      {tip.text}
    </span>,
    document.body,
  )
}
