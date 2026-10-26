import { useRef, useState } from 'react'
import { useGame } from '@/store'
import { ChartColumn, Minus } from 'lucide-react'
import { Button, TitleBar, TitleButton } from '@/components/ui'
import { GuideGirl } from '@/components/art/GuideGirl'
import { cn } from '@/lib/format'
import { currentTip } from './tips'
import { OddsDialog } from './OddsDialog'

/**
 * NPC hướng dẫn Keeb-chan: góc dưới màn hình, bong bóng thoại theo tình huống (`TIPS`).
 * Luôn đứng ở góc; bấm vào nhân vật (hoặc nút — trên thanh tiêu đề) để ẩn / hiện bong bóng, đang ẩn thì chấm đỏ báo có mẹo.
 * Mẹo mới (tình huống đổi) thì bong bóng tự hiện lại
 */
export function GuideNpc() {
  const tip = useGame(currentTip)
  const screen = useGame((s) => s.screen)
  // thu nhỏ theo từng mẹo: tình huống đổi (mẹo khác) thì bong bóng tự mở ra
  const [smallAt, setSmallAt] = useState<string | null>(null)
  const small = smallAt === tip.id
  const setSmall = (v: boolean) => setSmallAt(v ? tip.id : null)
  // kéo thanh tiêu đề để dời Keeb-chan (lệch so với góc mặc định, không lưu)
  const [off, setOff] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number } | null>(null)
  const [odds, setOdds] = useState(false)
  if (screen !== 'pc') return null
  // góc phải trên taskbar (bàn build: hội thoại `BenchDialog`)
  const side = 'right-3 bottom-[calc(var(--taskbar-h)+10px)]'
  return (
    <div
      className={cn(
        'pointer-events-none fixed z-[60] flex origin-bottom-right flex-row-reverse items-end gap-1 max-md:scale-90',
        side,
      )}
      style={{ transform: `translate(${off.x}px, ${off.y}px)` }}
    >
      {/* bấm nhân vật để ẩn / hiện bong bóng */}
      <button
        type="button"
        title={small ? 'Keeb-chan có mẹo cho bạn' : 'Ẩn bong bóng'}
        aria-label={small ? 'Hiện mẹo của Keeb-chan' : 'Ẩn bong bóng Keeb-chan'}
        onClick={() => setSmall(!small)}
        className="pointer-events-auto relative shrink-0 cursor-pointer transition-transform hover:-translate-y-1"
      >
        <GuideGirl className="w-[104px] animate-bob max-md:w-20" />
        {small && (
          <span className="absolute top-3 right-2 size-3.5 animate-pulse rounded-full border-2 border-white bg-red" />
        )}
      </button>
      <div
        className={cn('pointer-events-auto relative mb-10 w-[min(300px,70vw)]', small && 'hidden')}
      >
        <div className="relative flex flex-col overflow-hidden rounded-2xl border-[3px] border-black bg-[#fffaf0] text-sm font-bold text-[#2b2630]">
          {/* thanh tiêu đề như cửa sổ app: kéo để dời, nút thu nhỏ bên phải */}
          <TitleBar
            title="Keeb-chan"
            color="#e0558f"
            // thanh gọn hơn cửa sổ app (cn chỉ nối chuỗi nên dùng ! để đè py / text của TitleBar)
            className="cursor-grab touch-none !py-1 !pr-1.5 !pl-3 !text-sm text-white"
            onPointerDown={(e) => {
              drag.current = { x: e.clientX - off.x, y: e.clientY - off.y }
              e.currentTarget.setPointerCapture(e.pointerId)
            }}
            onPointerMove={(e) => {
              if (drag.current)
                setOff({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y })
            }}
            onPointerUp={() => (drag.current = null)}
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
