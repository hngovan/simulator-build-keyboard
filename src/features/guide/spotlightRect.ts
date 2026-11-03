import { useEffect, useState } from 'react'

// Đo ô sáng cho tour (`Spotlight`): khung phần tử `[data-tour]` theo dõi mỗi khung hình

export interface Hole {
  x: number
  y: number
  w: number
  h: number
}

/** chừa quanh ô sáng (px) */
const PAD = 6

/** khung của phần tử `[data-tour="<target>"]` (theo dõi mỗi khung hình: cửa sổ kéo / mở app thì ô sáng chạy theo); không có thì null */
export function useTargetRect(target: string | null) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    if (!target) return
    let raf = 0
    let last = ''
    const tick = () => {
      const el = document.querySelector(`[data-tour="${target}"]`)
      // bọc `display: contents` (không có khung riêng): lấy khung phần tử con
      const box = el && getComputedStyle(el).display === 'contents' ? el.firstElementChild : el
      const r = box?.getBoundingClientRect()
      const ok = r && r.width > 0 && r.height > 0
      const key = ok ? `${r.x},${r.y},${r.width},${r.height}` : ''
      if (key !== last) {
        last = key
        setRect(ok ? r : null)
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [target])
  // không theo dõi gì: luôn null (rect cũ của đích trước không còn đúng)
  return target ? rect : null
}

/** ô sáng quanh khung phần tử (nới `PAD`) */
export const holeOf = (r: DOMRect | null): Hole | null =>
  r && { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 }
