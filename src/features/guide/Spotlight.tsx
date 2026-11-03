import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Hole } from './spotlightRect'
import { createPortal } from 'react-dom'
import { HudCard } from '@/components/ui'
import { GuideGirl } from '@/components/art/GuideGirl'

// Lớp tour dùng chung (máy tính `Tour`, bàn build `BenchTour`): làm tối màn, chừa 1 ô sáng viền vàng nhấp nháy + bong bóng lời
// Keeb-chan. Vùng tối chặn bấm ngoài ô sáng (không lạc khỏi tour); popup portal z cao hơn (chọn option z-[4500]) vẫn bấm được

const BUBBLE_W = 360
/** chừa mép màn hình / khoảng cách tới ô sáng (px) */
const EDGE = 12
const GAP = 14

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(lo, v), Math.max(lo, hi))

/**
 * Chỗ đặt bong bóng (cao `h` đo thật) kiểu tooltip: `side` thì ưu tiên sang cạnh ô sáng; còn lại dưới ô sáng nếu đủ chỗ,
 * không thì lật lên trên, cả 2 đều thiếu thì sang cạnh (phải, hết thì trái), vẫn không được thì góc phải dưới.
 * Luôn kẹp trong màn hình. Không có ô sáng: giữa đáy (hoặc giữa trên `top`)
 */
function place(hole: Hole | null, w: number, h: number, side: boolean, top: boolean) {
  const maxTop = innerHeight - h - EDGE
  if (!hole) return { left: (innerWidth - w) / 2, top: top ? 64 : maxTop - 12 }
  const left = clamp(hole.x + hole.w / 2 - w / 2, EDGE, innerWidth - w - EDGE)
  const sideLeft =
    hole.x + hole.w + GAP + w <= innerWidth - EDGE
      ? hole.x + hole.w + GAP
      : hole.x - GAP - w >= EDGE
        ? hole.x - GAP - w
        : null
  const sideTop = clamp(hole.y + hole.h / 2 - h / 2, EDGE, maxTop)
  if (side && sideLeft !== null) return { left: sideLeft, top: sideTop }
  if (hole.y + hole.h + GAP + h <= innerHeight - EDGE) return { left, top: hole.y + hole.h + GAP }
  if (hole.y - GAP - h >= EDGE) return { left, top: hole.y - GAP - h }
  if (sideLeft !== null) return { left: sideLeft, top: sideTop }
  return { left: innerWidth - w - 16, top: maxTop }
}

export function Spotlight({
  hole,
  dimAll = false,
  side = false,
  top = false,
  passive = false,
  label,
  text,
  children,
  actions,
}: {
  /** ô sáng; null = không có ô (xem `dimAll`) */
  hole: Hole | null
  /** không có ô sáng: true = tối + chặn cả màn (chỉ nghe phím), false = không tối, chỉ bong bóng */
  dimAll?: boolean
  /** ô sáng nhỏ nằm trong khối cần nhìn (vd ô option trong thẻ sản phẩm): bong bóng đặt sang cạnh, không che */
  side?: boolean
  /** chỉ viền ô sáng + bong bóng, không làm tối / không chặn bấm chỗ khác (vd nút sang bước: vẫn lùi bước / bấm cảnh 3D được) */
  passive?: boolean
  /** không có ô sáng: bong bóng giữa trên màn hình (giữa dưới vướng khung việc cần làm ở bàn build) thay vì giữa đáy */
  top?: boolean
  /** góc phải tiêu đề bong bóng (vd "3 / 25") */
  label?: ReactNode
  text: ReactNode
  /** nội dung thêm dưới lời dẫn (vd danh sách món cần mua) */
  children?: ReactNode
  /** nút cuối bong bóng (Tiếp / Bỏ qua hướng dẫn) */
  actions?: ReactNode
}) {
  const W = BUBBLE_W
  // đo chiều cao thật của bong bóng (lời dẫn dài / có danh sách món) để đặt kiểu tooltip, không tràn khỏi màn
  const ref = useRef<HTMLDivElement>(null)
  const [h, setH] = useState(200)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setH(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const pos = place(hole, W, h, side, top)
  const dim = 'fixed z-[2500] bg-black/65'

  return createPortal(
    <div className="z-[2500]" data-tour-overlay>
      {hole && passive ? (
        <div
          className="pointer-events-none fixed z-[2500] animate-pulse rounded-xl shadow-[0_0_24px_rgba(255,214,79,0.7)] ring-4 ring-yellow"
          style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }}
        />
      ) : hole ? (
        <>
          {/* 4 khối tối quanh ô sáng: chặn bấm chỗ khác, ô sáng để bấm xuyên xuống phần tử thật */}
          <div className={`${dim} inset-x-0 top-0`} style={{ height: Math.max(0, hole.y) }} />
          <div className={`${dim} inset-x-0 bottom-0`} style={{ top: hole.y + hole.h }} />
          <div
            className={`${dim} left-0`}
            style={{ top: hole.y, height: hole.h, width: Math.max(0, hole.x) }}
          />
          <div
            className={`${dim} right-0`}
            style={{ top: hole.y, height: hole.h, left: hole.x + hole.w }}
          />
          <div
            className="pointer-events-none fixed z-[2500] animate-pulse rounded-xl shadow-[0_0_24px_rgba(255,214,79,0.7)] ring-4 ring-yellow"
            style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }}
          />
        </>
      ) : (
        dimAll && <div className={`${dim} inset-0`} />
      )}
      {/* khung ngoài đo chiều cao + đặt vị trí (HudCard không nhận ref) */}
      <div ref={ref} className="fixed z-[2501]" style={{ width: W, ...pos }}>
        <HudCard className="flex items-start gap-3 !p-3">
          <GuideGirl className="h-20 w-auto shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center justify-between font-head text-sm font-extrabold text-yellow">
              Keeb-chan
              {label && <span className="text-xs text-muted">{label}</span>}
            </div>
            <div className="text-sm leading-snug">{text}</div>
            {children}
            {actions && <div className="flex justify-end gap-2">{actions}</div>}
          </div>
        </HudCard>
      </div>
    </div>,
    document.body,
  )
}
