import { useGame, useBuild, useCtx } from '@/store'
import { STEP_INFO, stepProgress } from '@/data/steps'
import { SCREW_FULL } from '@/data/parts'
import { HudPanel, StepDot } from '@/components/ui'
import { cn } from '@/lib/format'
import { deadKey } from '@/store/scoring'

/**
 * Danh sách các bước build: xong (xanh), đang làm (vàng), chưa tới (xám).
 * Bước đã làm thì bấm để lùi về hoặc tiến tới tuỳ ý (đi lại theo lịch sử, không mất công đã làm);
 * làm thao tác mới ở bước cũ thì các bước phía sau phải làm lại
 */
export function StepList() {
  const ctx = useCtx()
  const build = useBuild()
  const clicks = SCREW_FULL
  const busy = useGame((s) => !!s.stabAnim || !!s.lubeAnim)
  // bước nào lùi về được: đã có thao tác được ghi lại từ lúc bắt đầu bước đó
  const firstRecorded = useGame((s) => (s.history.length ? s.history[0].build.stepIdx : Infinity))
  // xa nhất đã làm tới (khi đang đứng ở bước cũ)
  const furthest = useGame((s) => (s.future.length > 1 ? s.future.at(-1)!.build.stepIdx : -1))
  const { backToStep, forwardToStep } = useGame.getState()
  // test thấy phím không ăn (còn chưa hàn / cháy): sáng bước hàn để quay lại sửa
  const fault = Object.keys(build.testFaults ?? {}).some((id) => deadKey(build, id))

  return (
    <HudPanel id="steps" title="Các bước build">
      <div className="text-[11px] text-muted">Bấm bước đã làm để lùi về / tiến tới</div>
      {ctx.steps.map((st, i) => {
        const [d, t] = stepProgress(st, build, ctx, clicks)
        const state =
          i < build.stepIdx
            ? 'done'
            : i === build.stepIdx
              ? 'cur'
              : i <= furthest
                ? 'ahead'
                : 'todo'
        const canBack = state === 'done' && i >= firstRecorded && !busy
        const canAhead = state === 'ahead' && !busy
        const go = canBack ? () => backToStep(i) : canAhead ? () => forwardToStep(i) : undefined
        const alert = fault && st === 'solder' && state === 'done'
        return (
          <button
            key={st}
            disabled={!go}
            title={
              alert
                ? 'Test thấy phím không nhận: bấm để quay lại hàn, hoặc cứ thế giao cho khách'
                : canBack
                  ? 'Lùi về bước này'
                  : canAhead
                    ? 'Tiến tới bước đã làm'
                    : undefined
            }
            onClick={go}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left transition-colors',
              state === 'done' && (alert ? 'font-extrabold text-[#ffb4b4]' : 'text-[#9fe6b6]'),
              state === 'ahead' && 'text-[#9fe6b6]/75',
              state === 'cur' && 'font-extrabold text-white',
              state === 'todo' && 'text-muted',
              go ? 'hover:bg-white/10' : 'cursor-default',
            )}
          >
            <StepDot state={state} alert={alert}>
              {i + 1}
            </StepDot>
            <span>{STEP_INFO[st].title}</span>
            {canAhead && <span className="ml-auto text-xs">↷</span>}
            {t > 1 && state !== 'todo' && state !== 'ahead' && (
              <span className="ml-auto text-xs">
                {Math.min(d, t)}/{t}
              </span>
            )}
          </button>
        )
      })}
    </HudPanel>
  )
}
