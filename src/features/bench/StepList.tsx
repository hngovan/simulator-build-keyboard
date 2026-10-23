import { useEffect, useState } from 'react'
import { useGame, useBuild, useCtx } from '@/store'
import { STEP_INFO, stepProgress } from '@/data/steps'
import { TOOLS } from '@/data/parts'
import { HudCard } from '@/components/ui'
import { cn } from '@/lib/format'

/**
 * Danh sách các bước build: xong (xanh), đang làm (vàng), chưa tới (xám).
 * Bấm vào bước đã xong 2 lần để quay lại làm từ đầu bước đó
 */
export function StepList() {
  const ctx = useCtx()
  const build = useBuild()
  const clicks = useGame((s) => TOOLS.screw[s.tools.screw].clicks!)
  const busy = useGame((s) => !!s.stabAnim)
  // bước nào quay lại được: đã có thao tác được ghi lại từ lúc bắt đầu bước đó
  const firstRecorded = useGame((s) => (s.history.length ? s.history[0].build.stepIdx : Infinity))
  const backToStep = useGame((s) => s.backToStep)
  const [confirm, setConfirm] = useState<number | null>(null)
  // tự huỷ xác nhận sau vài giây
  useEffect(() => {
    if (confirm === null) return
    const t = setTimeout(() => setConfirm(null), 3000)
    return () => clearTimeout(t)
  }, [confirm])

  return (
    <HudCard>
      <h4 className="mb-1 text-base">Các bước build</h4>
      <div className="mb-1.5 text-[11px] text-muted">Bấm bước đã xong để quay lại làm lại</div>
      {ctx.steps.map((st, i) => {
        const [d, t] = stepProgress(st, build, ctx, clicks)
        const state = i < build.stepIdx ? 'done' : i === build.stepIdx ? 'cur' : 'todo'
        const canBack = state === 'done' && i >= firstRecorded && !busy
        const asking = confirm === i
        return (
          <button
            key={st}
            disabled={!canBack}
            title={canBack ? 'Quay lại bước này' : undefined}
            onClick={() => {
              if (!asking) return setConfirm(i)
              setConfirm(null)
              backToStep(i)
            }}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left',
              state === 'done'
                ? 'text-[#9fe6b6]'
                : state === 'cur'
                  ? 'font-extrabold text-white'
                  : 'text-muted',
              canBack && 'hover:bg-white/10',
              asking && 'bg-yellow/20 ring-1 ring-yellow',
              !canBack && 'cursor-default',
            )}
          >
            <span
              className={cn(
                'grid size-[22px] shrink-0 place-items-center rounded-full text-[11px] font-extrabold',
                state === 'done' && 'bg-green text-[#0d2a17]',
                state === 'cur' && 'bg-yellow text-[#3a2b00] shadow-[0_0_0_3px_#ffcc2e55]',
                state === 'todo' && 'bg-panel-2',
              )}
            >
              {state === 'done' ? (asking ? '↶' : '✓') : i + 1}
            </span>
            <span>{asking ? 'Bấm lần nữa để quay lại' : STEP_INFO[st].title}</span>
            {t > 1 && state !== 'todo' && !asking && (
              <span className="ml-auto text-xs">
                {Math.min(d, t)}/{t}
              </span>
            )}
          </button>
        )
      })}
    </HudCard>
  )
}
