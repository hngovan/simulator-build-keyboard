import { useState } from 'react'
import { useGame, useCtx } from '@/store'
import { HudPanel, OptionChip } from '@/components/ui'
import { cn } from '@/lib/format'
import { CASES, CASE_COLORS, CASE_MATERIALS, MOUNTS, caseFits } from '@/data/parts'
import { setDevCase, setDevCaseColor } from '@/features/apps/settings/devBuild'

/** Chỉ khi dev, đơn build thử: đổi case (lọc theo chất liệu, chỉ case vừa layout) / màu / mount ngay trên bàn build */
export function DevCasePanel() {
  const ctx = useCtx()
  const order = useGame((s) => s.order!)
  const current = useGame((s) => s.inventory.case!)
  const [material, setMaterial] = useState<string | null>(null)
  const fit = Object.keys(CASES).filter((id) => caseFits(CASES[id], order.layout))
  const materials = [...new Set(fit.map((id) => CASES[id].material))]
  const list = fit.filter((id) => !material || CASES[id].material === material)
  const def = CASES[current.id]

  return (
    <HudPanel id="devCase" title="🧪 Đổi case (dev)" className="shrink-0">
      <div className="flex flex-col gap-2 p-3 pt-1">
        <div className="flex flex-wrap gap-1">
          <OptionChip active={!material} onClick={() => setMaterial(null)}>
            Tất cả
          </OptionChip>
          {materials.map((m) => (
            <OptionChip key={m} active={material === m} onClick={() => setMaterial(m)}>
              {CASE_MATERIALS[m]?.name ?? m}
            </OptionChip>
          ))}
        </div>
        <div className="flex max-h-48 flex-wrap gap-1 overflow-y-auto">
          {list.map((id) => (
            <OptionChip
              key={id}
              active={id === current.id}
              title={`${CASES[id].pieces} mảnh · ${CASES[id].mounts.map((m) => MOUNTS[m].name).join(', ')}`}
              onClick={() => setDevCase(id)}
            >
              {CASES[id].name}
            </OptionChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
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
        <div className="flex flex-wrap gap-1">
          {def.mounts.map((m) => (
            <OptionChip key={m} active={ctx.mount === m} onClick={() => setDevCase(current.id, m)}>
              {MOUNTS[m].name}
            </OptionChip>
          ))}
        </div>
      </div>
    </HudPanel>
  )
}
