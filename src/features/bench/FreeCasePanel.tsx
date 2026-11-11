import { useGame } from '@/store'
import { ColorInput, HudPanel } from '@/components/ui'
import { CASES, caseColorOf, caseTwoTone } from '@/data/parts'
import { setFreeCaseColor } from '@/features/free/freeBuild'

/** Free build: đổi màu case ngay trên bàn build (case / layout / mount chọn ở bảng chọn case lúc bắt đầu);
 * case 2 mảnh chọn riêng màu case trên / case dưới */
export function FreeCasePanel() {
  const current = useGame((s) => s.inventory.case!)
  const def = CASES[current.id]
  const two = caseTwoTone(def)

  return (
    <HudPanel id="freeCase" title="Màu case" className="shrink-0">
      <div className="flex flex-col gap-2 p-3 pt-1">
        {(two ? (['top', 'bottom'] as const) : (['top'] as const)).map((part) => {
          const cur = part === 'top' ? current.color : (current.botColor ?? current.color)
          return (
            <div key={part} className="flex flex-col gap-1">
              {two && (
                <span className="text-[11px] font-extrabold tracking-wide text-muted uppercase">
                  {part === 'top' ? 'Case trên' : 'Case dưới'}
                </span>
              )}
              <ColorInput
                hex={caseColorOf(cur).hex}
                onChange={(col) => setFreeCaseColor(col, part)}
              />
            </div>
          )
        })}
      </div>
    </HudPanel>
  )
}
