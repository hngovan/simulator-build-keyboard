import { useState } from 'react'
import { useGame } from '@/store'
import { Button } from '@/components/ui'
import { GuideGirl } from '@/components/art/GuideGirl'
import { cn } from '@/lib/format'
import { currentTip } from './tips'

/**
 * NPC hướng dẫn Keeb-chan: góc dưới màn hình, bong bóng thoại theo tình huống (`TIPS`).
 * "Hiểu rồi" = không hiện lại mẹo đó; thu nhỏ thành avatar tròn (bấm để mở lại). Không có nút tắt hẳn
 */
export function GuideNpc() {
  const tip = useGame(currentTip)
  const screen = useGame((s) => s.screen)
  const [small, setSmall] = useState(false)
  if (!tip || screen === 'title') return null
  const { seeGuide } = useGame.getState()
  // máy tính: góc phải trên taskbar · bàn build: góc trái dưới (giữa dưới là bảng bước)
  const side = screen === 'pc' ? 'right-3 bottom-[calc(var(--taskbar-h)+10px)]' : 'bottom-3 left-3'
  if (small)
    return (
      <button
        type="button"
        title="Keeb-chan có mẹo cho bạn"
        onClick={() => setSmall(false)}
        className={cn(
          'fixed z-[60] grid size-16 place-items-center overflow-hidden rounded-full border-[3px] border-yellow bg-panel shadow-[0_4px_0_#0006] hover:-translate-y-0.5',
          side,
        )}
      >
        <GuideGirl className="mt-6 w-16" />
        <span className="absolute top-0.5 right-1 size-3 animate-pulse rounded-full bg-red" />
      </button>
    )
  return (
    <div
      className={cn(
        'pointer-events-none fixed z-[60] flex items-end gap-1 max-md:scale-90',
        side,
        screen === 'pc' ? 'origin-bottom-right flex-row-reverse' : 'origin-bottom-left',
      )}
    >
      <GuideGirl className="w-[104px] animate-bob drop-shadow-[0_6px_0_rgba(0,0,0,0.35)] max-md:w-20" />
      <div className="pointer-events-auto mb-10 flex w-[min(300px,70vw)] flex-col gap-2 rounded-2xl border-[3px] border-black/40 bg-[#fffaf0] px-3 py-2.5 text-sm font-bold text-[#2b2630] shadow-[0_4px_0_#0006]">
        <div className="font-head text-base font-extrabold text-[#c2410c]">Keeb-chan</div>
        <p className="leading-snug">{tip.text}</p>
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button size="sm" onClick={() => setSmall(true)}>
            Thu nhỏ
          </Button>
          <Button size="sm" tone="green" onClick={() => seeGuide(tip.id)}>
            Hiểu rồi
          </Button>
        </div>
      </div>
    </div>
  )
}
