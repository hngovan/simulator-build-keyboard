import { useEffect, useRef, useState } from 'react'
import { useGame } from '@/store'
import { ChartColumn, Minus } from 'lucide-react'
import { Button, TitleBar, TitleButton } from '@/components/ui'
import { GuideGirl } from '@/components/art/GuideGirl'
import { cn } from '@/lib/format'
import { currentTip } from './tips'
import { OddsDialog } from './OddsDialog'

type Off = { x: number; y: number }

/**
 * Giữ cả cụm Keeb-chan trong màn hình: góc mặc định (off = 0) là mép phải / sát trên taskbar nên chỉ dời trái / lên được.
 * cur = độ lệch đang hiển thị trên DOM lúc đo
 */
function clampOff(el: HTMLElement | null, x: number, y: number, cur: Off): Off {
  if (!el) return { x, y }
  const r = el.getBoundingClientRect()
  // vị trí khi off = 0
  const left = r.left - cur.x
  const top = r.top - cur.y
  return { x: Math.min(0, Math.max(x, 8 - left)), y: Math.min(0, Math.max(y, 8 - top)) }
}

/**
 * NPC hướng dẫn Keeb-chan: góc dưới màn hình, bong bóng thoại theo tình huống (`TIPS`).
 * Luôn đứng ở góc; bấm vào nhân vật (hoặc nút — trên thanh tiêu đề) để ẩn / hiện bong bóng, đang ẩn thì chấm đỏ báo có mẹo.
 * Cầm nhân vật kéo để dời cả cụm (bong bóng đi theo), luôn giữ trong màn hình, không đè taskbar.
 * Mặc định thu nhỏ (chỉ còn nhân vật), bấm mới hiện bong bóng; mẹo mới chưa xem thì chấm đỏ trên nhân vật
 */
export function GuideNpc() {
  const tip = useGame(currentTip)
  const screen = useGame((s) => s.screen)
  // mặc định ẩn bong bóng, bấm nhân vật mới hiện; mẹo đã mở xem rồi thì tắt chấm đỏ
  const [small, setSmallState] = useState(true)
  const [readTip, setReadTip] = useState<string | null>(null)
  const setSmall = (v: boolean) => {
    setSmallState(v)
    if (!v) setReadTip(tip.id)
  }
  // đang mở bong bóng mà đổi mẹo thì coi như đã xem mẹo mới
  if (!small && readTip !== tip.id) setReadTip(tip.id)
  const unread = small && readTip !== tip.id
  // cầm nhân vật kéo để dời Keeb-chan (lệch so với góc mặc định, không lưu)
  const [off, setOff] = useState<Off>({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; sx: number; sy: number; moved: boolean } | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const [odds, setOdds] = useState(false)
  // bong bóng hiện ra (to hơn: mẹo mới / bấm hiện) hoặc đổi cỡ cửa sổ: khung hình sau kéo lại vào trong màn hình nếu tràn
  useEffect(() => {
    const fit = () => requestAnimationFrame(() => setOff((o) => clampOff(box.current, o.x, o.y, o)))
    if (!small) fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [small, tip.id])
  if (screen !== 'pc') return null
  // góc phải trên taskbar (bàn build: hội thoại `BenchDialog`)
  const side = 'right-3 bottom-[calc(var(--taskbar-h)+10px)]'
  return (
    <div
      ref={box}
      className={cn(
        'pointer-events-none fixed z-[60] flex origin-bottom-right flex-row-reverse items-end gap-1 max-md:scale-90',
        side,
      )}
      style={{ transform: `translate(${off.x}px, ${off.y}px)` }}
    >
      {/* bấm nhân vật để ẩn / hiện bong bóng, cầm kéo (lệch > 4px) để dời */}
      <button
        type="button"
        title={
          small
            ? unread
              ? 'Keeb-chan có mẹo mới · kéo để dời'
              : 'Xem mẹo của Keeb-chan · kéo để dời'
            : 'Ẩn bong bóng · kéo để dời'
        }
        aria-label={small ? 'Hiện mẹo của Keeb-chan' : 'Ẩn bong bóng Keeb-chan'}
        onPointerDown={(e) => {
          drag.current = {
            x: e.clientX - off.x,
            y: e.clientY - off.y,
            sx: e.clientX,
            sy: e.clientY,
            moved: false,
          }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d) return
          if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 4) return
          d.moved = true
          setOff(clampOff(box.current, e.clientX - d.x, e.clientY - d.y, off))
        }}
        onPointerUp={() => {
          // không kéo thì là bấm: ẩn / hiện bong bóng
          if (drag.current && !drag.current.moved) setSmall(!small)
          drag.current = null
        }}
        onPointerCancel={() => (drag.current = null)}
        className="pointer-events-auto relative shrink-0 cursor-grab touch-none transition-transform hover:-translate-y-1 active:cursor-grabbing"
      >
        <GuideGirl className="w-[104px] animate-bob max-md:w-20" />
        {unread && (
          <span className="absolute top-3 right-2 size-3.5 animate-pulse rounded-full border-2 border-white bg-red" />
        )}
      </button>
      <div
        className={cn('pointer-events-auto relative mb-10 w-[min(300px,70vw)]', small && 'hidden')}
      >
        <div className="relative flex flex-col overflow-hidden rounded-2xl border-[3px] border-black bg-[#fffaf0] text-sm font-bold text-[#2b2630]">
          {/* thanh tiêu đề như cửa sổ app (chỉ có nút thu nhỏ; kéo dời bằng cách cầm nhân vật) */}
          <TitleBar
            title="Keeb-chan"
            color="#e0558f"
            // thanh gọn hơn cửa sổ app (cn chỉ nối chuỗi nên dùng ! để đè py / text của TitleBar)
            className="!py-1 !pr-1.5 !pl-3 !text-sm text-white"
          >
            <TitleButton
              aria-label="Thu nhỏ Keeb-chan"
              title="Thu nhỏ"
              className="!size-6 !rounded-[7px] [&_svg]:!size-3.5"
              onClick={() => setSmall(true)}
            >
              <Minus />
            </TitleButton>
          </TitleBar>
          <p className="px-3 pt-2.5 leading-snug">{tip.text}</p>
          {/* bảng tỉ lệ (chợ, bán phím khách, hàn, test, đơn hàng) */}
          <div className="flex justify-end px-3 pt-1.5 pb-2.5">
            {/* nút nhỏ trong bong bóng: bóng hover của Button (6px) quá to → giữ 4px, nhích lên 1px;
                nền bong bóng sáng nên bóng đen 35% thành vệt xám → bóng cùng tông xanh, nhạt hơn */}
            <Button
              size="sm"
              tone="blue"
              className="inline-flex items-center gap-1.5 !shadow-[0_4px_0_#9cc3ff,inset_0_2px_0_rgba(255,255,255,0.25)] enabled:hover:!translate-y-[-1px] enabled:hover:!shadow-[0_4px_0_#9cc3ff,inset_0_2px_0_rgba(255,255,255,0.3)] enabled:active:!shadow-[0_1px_0_#9cc3ff] [&_svg]:size-4"
              onClick={() => setOdds(true)}
            >
              <ChartColumn strokeWidth={2.5} />
              Bảng tỉ lệ
            </Button>
          </div>
        </div>
      </div>
      {odds && <OddsDialog onClose={() => setOdds(false)} />}
    </div>
  )
}
