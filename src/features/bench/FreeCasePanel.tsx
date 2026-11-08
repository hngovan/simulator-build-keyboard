import { useGame } from '@/store'
import { HudPanel } from '@/components/ui'
import { cn } from '@/lib/format'
import { CASES, CASE_COLORS, caseSwatch } from '@/data/parts'
import { setFreeCaseColor } from '@/features/free/freeBuild'

/** Free build: đổi màu case ngay trên bàn build (case / layout / mount chọn ở bảng chọn case lúc bắt đầu) */
export function FreeCasePanel() {
  const current = useGame((s) => s.inventory.case!)
  const def = CASES[current.id]

  return (
    <HudPanel id="freeCase" title="Màu case" className="shrink-0">
      <div className="flex flex-wrap gap-1 p-3 pt-1">
        {def.colors.map((col) => (
          <button
            key={col}
            type="button"
            title={CASE_COLORS[col]?.name ?? col}
            onClick={() => setFreeCaseColor(col)}
            className={cn(
              'size-6 rounded-full border-2 shadow-[0_2px_0_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-px',
              current.color === col ? 'border-yellow' : 'border-black/40',
            )}
            style={{ background: caseSwatch(col) }}
          />
        ))}
      </div>
    </HudPanel>
  )
}
