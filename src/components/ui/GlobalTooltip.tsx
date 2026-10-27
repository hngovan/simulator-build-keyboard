import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/format'
import { placeTip } from './placeTip'

/** chờ rê chuột bao lâu thì hiện (ms) */
const DELAY = 250

/**
 * Tooltip kiểu game cho mọi phần tử có thuộc tính `title` trong toàn app (gắn 1 lần ở App):
 * rê chuột thì chuyển `title` sang `data-tip` (tắt tooltip mặc định của trình duyệt) và vẽ nhãn tối chữ đậm
 * giống `Tooltip` — ưu tiên phía trên; đo kích thước thật rồi đặt (`placeTip`): không đủ chỗ thì lật xuống dưới, luôn nằm
 * trong màn hình. Code mới chỉ cần ghi `title=`.
 * Mặc định căn giữa phần tử; `data-tip-align="start"` thì căn mép trái (vd tên dài bị cắt "...").
 */
export function GlobalTooltip() {
  const [tip, setTip] = useState<{ text: string; anchor: DOMRect; start: boolean } | null>(null)
  const box = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  useLayoutEffect(() => {
    if (!tip || !box.current) return
    const t = box.current.getBoundingClientRect()
    setPos(placeTip(tip.anchor, t.width, t.height, 'top', tip.start))
  }, [tip])
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
        setPos(null)
        setTip({ text, anchor: el.getBoundingClientRect(), start: el.dataset.tipAlign === 'start' })
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
  return createPortal(
    <span
      ref={box}
      role="tooltip"
      style={pos ?? { left: 0, top: 0 }}
      className={cn(
        'pointer-events-none fixed z-[3000] max-w-[320px] animate-fade-in rounded-lg border border-white/10 bg-[#0e1018]/95 px-2.5 py-1.5 text-[13px] leading-snug font-extrabold text-white shadow-[0_6px_16px_rgba(0,0,0,0.45)]',
        tip.start ? 'text-left' : 'text-center',
        // lần vẽ đầu chỉ để đo
        !pos && 'invisible',
      )}
    >
      {tip.text}
    </span>,
    document.body,
  )
}
