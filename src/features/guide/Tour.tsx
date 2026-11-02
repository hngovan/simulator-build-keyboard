import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGame } from '@/store'
import { Button, HudCard } from '@/components/ui'
import { GuideGirl } from '@/components/art/GuideGirl'

/**
 * Tour hướng dẫn lần đầu ngồi máy tính: làm tối cả màn, chừa 1 ô sáng (viền vàng nhấp nháy) đúng chỗ cần bấm + bong bóng lời
 * Keeb-chan. Bấm đúng chỗ đó thì sang bước sau; vùng tối chặn bấm chỗ khác. Phần tử đích gắn `data-tour="<id>"`.
 * Xong / bỏ qua thì ghi `guideSeen` (`TOUR_ID`), Cài đặt → Hướng dẫn có nút xem lại
 */
export const TOUR_ID = 'tour:pc'

interface TourStep {
  /** `data-tour` của phần tử cần bấm */
  target: string
  text: string
}

const STEPS: TourStep[] = [
  {
    target: 'app-messenger',
    text: 'Khách đặt phím qua Mezzenger. Bấm vào đây để mở xem đơn nhé!',
  },
  {
    target: 'offer',
    text: 'Mỗi thẻ là 1 đơn khách gửi. Bấm vào để đọc yêu cầu: layout, switch, keycap, ngân sách, hạn giao.',
  },
  {
    target: 'accept',
    text: 'Hợp túi tiền với tay nghề thì bấm Nhận đơn. Thùng đơn của khách sẽ tới kệ cuối hành lang.',
  },
  {
    target: 'app-shop',
    text: 'Linh kiện khách không gửi thì mua ở Shopii. Bấm để mở cửa hàng.',
  },
  {
    target: 'cart',
    text: 'Bấm "Thêm vào giỏ" ở thẻ sản phẩm, xong vào Giỏ hàng chọn tốc độ giao rồi đặt. Hàng tới kệ cuối hành lang.',
  },
  {
    target: 'back',
    text: 'Xong việc ở máy tính thì bấm đây (hoặc Esc) đứng dậy: ra hành lang lấy thùng đơn, nhận hàng, mang tới bàn build lắp phím!',
  },
]

/** chừa quanh ô sáng (px) */
const PAD = 6

/** khung của phần tử đích (theo dõi mỗi khung hình: cửa sổ kéo / mở app thì ô sáng chạy theo); không có trên màn thì null */
function useTargetRect(target: string) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    let raf = 0
    let last = ''
    const tick = () => {
      const el = document.querySelector(`[data-tour="${target}"]`)
      const r = el?.getBoundingClientRect()
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
  return rect
}

export function Tour() {
  const [i, setI] = useState(0)
  const step = STEPS[i]
  const rect = useTargetRect(step.target)
  const done = () => useGame.getState().seeGuide(TOUR_ID)

  // bấm đúng phần tử đích (bắt ở pha capture, không chặn click của nó) → sang bước sau khi giao diện kịp đổi
  useEffect(() => {
    let t = 0
    const onClick = (e: MouseEvent) => {
      if (!(e.target as Element).closest?.(`[data-tour="${step.target}"]`)) return
      // bước cuối (đứng dậy) ghi đã xem ngay: màn đổi liền, tour bị gỡ trước khi hẹn giờ kịp chạy
      if (i + 1 >= STEPS.length) return done()
      t = window.setTimeout(() => setI(i + 1), 250)
    }
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      clearTimeout(t)
    }
  }, [i, step.target])

  const hole = rect && {
    x: rect.left - PAD,
    y: rect.top - PAD,
    w: rect.width + PAD * 2,
    h: rect.height + PAD * 2,
  }
  // bong bóng lời dẫn: dưới ô sáng nếu đủ chỗ, không thì trên; chưa thấy phần tử đích thì giữa đáy màn hình
  const below = hole && hole.y + hole.h + 190 < innerHeight
  const bubbleW = 360
  const bubbleLeft = hole
    ? Math.min(Math.max(12, hole.x + hole.w / 2 - bubbleW / 2), innerWidth - bubbleW - 12)
    : undefined
  const dim = 'fixed bg-black/65'

  return createPortal(
    <div className="z-[2500]" data-tour-overlay>
      {hole && (
        <>
          {/* 4 khối tối quanh ô sáng: chặn bấm chỗ khác, ô sáng để bấm xuyên xuống phần tử thật */}
          <div
            className={`${dim} inset-x-0 top-0 z-[2500]`}
            style={{ height: Math.max(0, hole.y) }}
          />
          <div className={`${dim} inset-x-0 bottom-0 z-[2500]`} style={{ top: hole.y + hole.h }} />
          <div
            className={`${dim} left-0 z-[2500]`}
            style={{ top: hole.y, height: hole.h, width: Math.max(0, hole.x) }}
          />
          <div
            className={`${dim} right-0 z-[2500]`}
            style={{ top: hole.y, height: hole.h, left: hole.x + hole.w }}
          />
          <div
            className="pointer-events-none fixed z-[2500] animate-pulse rounded-xl shadow-[0_0_24px_rgba(255,214,79,0.7)] ring-4 ring-yellow"
            style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }}
          />
        </>
      )}
      <HudCard
        className="fixed z-[2501] flex items-start gap-3 !p-3"
        style={
          hole
            ? {
                width: bubbleW,
                left: bubbleLeft,
                ...(below ? { top: hole.y + hole.h + 14 } : { bottom: innerHeight - hole.y + 14 }),
              }
            : { width: bubbleW, left: (innerWidth - bubbleW) / 2, bottom: 24 }
        }
      >
        <GuideGirl className="h-20 w-auto shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center justify-between font-head text-sm font-extrabold text-yellow">
            Keeb-chan
            <span className="text-xs text-muted">
              {i + 1} / {STEPS.length}
            </span>
          </div>
          <p className="text-sm leading-snug">{step.text}</p>
          <Button size="sm" className="self-end" onClick={done}>
            Bỏ qua hướng dẫn
          </Button>
        </div>
      </HudCard>
    </div>,
    document.body,
  )
}
