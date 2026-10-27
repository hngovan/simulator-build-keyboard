import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, HudCard, Muted, OptionChip, OptionSelect } from '@/components/ui'
import { cn } from '@/lib/format'
import { LAYOUTS } from '@/data/layouts'
import { CASES, CASE_COLORS, MOUNTS, PCB_TYPES, PLATES, STABS, plateIds } from '@/data/parts'
import type { FormFactor, LayoutId } from '@/types'
import { devLayouts, startDevBuild } from './devBuild'

/** thứ tự nhóm cỡ case trong bảng */
const FF_ORDER: FormFactor[] = ['40', 'planck', '60', '65', '75', 'alice', 'frl', 'tkl', 'full']
const PLATE_IDS = plateIds()
const STAB_IDS = Object.keys(STABS)

/** Chỉ khi dev: bảng mọi case + màu, chọn 1 ô rồi vào build thử ngay (đủ đồ, bỏ qua bước nào cũng được) */
export function DevBuildDialog({ onClose }: { onClose: () => void }) {
  const [pick, setPick] = useState<{ caseId: string; color: string } | null>(null)
  const [layout, setLayout] = useState<LayoutId | ''>('')
  const [mount, setMount] = useState('')
  const [pcb, setPcb] = useState('hotswap')
  const [plate, setPlate] = useState(0)
  const [stab, setStab] = useState(0)

  const groups = FF_ORDER.map((ff) => ({
    ff,
    ids: Object.keys(CASES).filter((id) => CASES[id].ff === ff),
  })).filter((g) => g.ids.length)
  const choose = (caseId: string, color: string) => {
    setPick({ caseId, color })
    const lays = devLayouts(caseId)
    if (!layout || !lays.includes(layout)) setLayout(lays[0] ?? '')
    if (!CASES[caseId].mounts.includes(mount)) setMount(CASES[caseId].mounts[0])
  }
  const layouts = pick ? devLayouts(pick.caseId) : []
  const go = () => {
    if (!pick || !layout) return
    startDevBuild({
      ...pick,
      layout,
      mount,
      pcb,
      plate: PLATE_IDS[plate],
      stab: STAB_IDS[stab],
    })
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[3500] grid animate-fade-in place-items-center bg-black/60 p-4"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <HudCard className="flex max-h-[90vh] w-[min(920px,100%)] flex-col gap-3">
        <h3 className="font-head text-xl font-extrabold text-yellow">🧪 Build thử mọi case</h3>
        <Muted className="text-sm">
          Bấm 1 ô màu để chọn case. Đơn thử có sẵn đủ linh kiện + dụng cụ + vật tư, bước nào cũng bỏ
          qua được, giao thì chỉ dọn bàn (không chấm điểm). Đơn đang làm được cất lại.
        </Muted>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-2xl bg-black/15 p-1.5">
          {groups.map((g) => (
            <div key={g.ff} className="flex flex-col gap-1">
              <div className="px-2 pt-1 text-[13px] font-bold text-muted">
                {g.ff.toUpperCase()} · {g.ids.length} case
              </div>
              {g.ids.map((id) => {
                const c = CASES[id]
                return (
                  <div
                    key={id}
                    className={cn(
                      'flex flex-wrap items-center gap-2 rounded-xl border-2 bg-panel-2 px-3 py-1.5',
                      pick?.caseId === id ? 'border-yellow' : 'border-transparent',
                    )}
                  >
                    <span className="min-w-[200px] flex-1 text-sm font-bold">
                      {c.name}
                      <span className="ml-1.5 text-xs font-normal text-muted">
                        {c.pieces} mảnh · {c.mounts.map((m) => MOUNTS[m].name).join(', ')}
                        {c.model ? ' · CAD' : ''}
                      </span>
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {c.colors.map((col) => (
                        <button
                          key={col}
                          type="button"
                          title={CASE_COLORS[col]?.name ?? col}
                          onClick={() => choose(id, col)}
                          className={cn(
                            'size-6 rounded-md border-2 shadow-[0_2px_0_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-px',
                            pick?.caseId === id && pick.color === col
                              ? 'border-yellow'
                              : 'border-black/40',
                          )}
                          style={{ background: CASE_COLORS[col]?.hex ?? col }}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        {pick && (
          <div className="flex flex-col gap-2 text-sm">
            <div className="font-bold text-yellow">
              {CASES[pick.caseId].name} · {CASE_COLORS[pick.color]?.name ?? pick.color}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-16 text-muted">Layout</span>
              {layouts.map((l) => (
                <OptionChip key={l} active={layout === l} onClick={() => setLayout(l)}>
                  {LAYOUTS[l].name}
                </OptionChip>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-16 text-muted">Mount</span>
              {CASES[pick.caseId].mounts.map((m) => (
                <OptionChip key={m} active={mount === m} onClick={() => setMount(m)}>
                  {MOUNTS[m].name}
                </OptionChip>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-16 text-muted">PCB</span>
              {Object.keys(PCB_TYPES).map((t) => (
                <OptionChip key={t} active={pcb === t} onClick={() => setPcb(t)}>
                  {PCB_TYPES[t].name}
                </OptionChip>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-16 text-muted">Plate</span>
              <OptionSelect
                className="w-56"
                options={PLATE_IDS.map((id) => ({ label: PLATES[id].name }))}
                value={plate}
                onChange={setPlate}
              />
              <span className="ml-3 w-12 text-muted">Stab</span>
              <OptionSelect
                className="w-56"
                options={STAB_IDS.map((id) => ({ label: STABS[id].name }))}
                value={stab}
                onChange={setStab}
              />
            </div>
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={onClose}>Đóng</Button>
          <Button tone="green" disabled={!pick || !layout} onClick={go}>
            🔧 Build thử
          </Button>
        </div>
      </HudCard>
    </div>,
    document.body,
  )
}
