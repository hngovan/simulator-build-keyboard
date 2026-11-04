import { useGame } from '@/store'
import { HudPanel } from '@/components/ui'
import { cn } from '@/lib/format'
import { CASES, CASE_COLORS } from '@/data/parts'
import { setDevCaseColor } from '@/features/apps/settings/devBuild'

/** Chỉ khi dev, đơn build thử: chỉ đổi màu case ngay trên bàn build (case / layout / mount chọn ở bảng Build thử) */
export function DevCasePanel() {
  const current = useGame((s) => s.inventory.case!)
  const def = CASES[current.id]

  return (
    <HudPanel id="devCase" title="🧪 Màu case (dev)" className="shrink-0">
      <div className="flex flex-wrap gap-1 p-3 pt-1">
        {def.colors.map((col) => (
          <button
            key={col}
            type="button"
            title={CASE_COLORS[col]?.name ?? col}
            onClick={() => setDevCaseColor(col)}
            className={cn(
              'size-6 rounded-md border-2 shadow-[0_2px_0_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-px',
              current.color === col ? 'border-yellow' : 'border-black/40',
            )}
            style={{ background: CASE_COLORS[col]?.hex ?? col }}
          />
        ))}
      </div>
    </HudPanel>
  )
}
