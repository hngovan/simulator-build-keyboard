import { useEffect } from 'react'
import { useGame, useBuild, useCtx } from '@/store'
import { NO_FLIP_STEPS, STEP_INFO, stepProgress } from '@/data/steps'
import { TOOLS } from '@/data/parts'
import { Button, HudCard } from '@/components/ui'
import { OrderSpec } from '@/components/game/OrderSpec'
import { StatusChips } from '@/components/game/StatusChips'
import type { StepId, ToolKind } from '@/types'
import { StepList } from './StepList'
import { LubePanel, StabModPanel } from './ModPanels'
import { SoundMeter } from './SoundMeter'

// Dụng cụ đang dùng ở mỗi bước (hiện ở thanh nhiệm vụ)
const STEP_TOOL: Partial<Record<StepId, ToolKind>> = {
  switch: 'switch',
  keycap: 'keycap',
  caseOpen: 'screw',
  stabScrew: 'screw',
  trayScrew: 'screw',
  caseScrew: 'screw',
  solder: 'solder',
  stabMod: 'clipper',
  switchLube: 'opener',
}

function TopBar({ canFlip }: { canFlip: boolean }) {
  const viewFlip = useGame((s) => s.viewFlip)
  const started = useBuild().stepIdx > 0
  const canUndo = useGame((s) => s.history.length > 0 && !s.stabAnim)
  const { goPC, toggleFlip, resetCam, deliver, undo } = useGame.getState()
  // Ctrl+Z để hoàn tác
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault()
        useGame.getState().undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <div className="pointer-events-none fixed inset-x-3 top-3 z-[5] flex items-center justify-between [&>*]:pointer-events-auto">
      <div className="flex gap-2">
        <Button tone="blue" onClick={goPC}>
          🖥 Về máy tính
        </Button>
        <Button tone="yellow" onClick={toggleFlip} disabled={!canFlip}>
          🔄 {viewFlip ? 'Lật lại mặt trên' : 'Lật xem đáy'}
        </Button>
        <Button
          tone="blue"
          onClick={undo}
          disabled={!canUndo}
          title="Hoàn tác thao tác vừa làm (Ctrl+Z)"
        >
          ↶ Hoàn tác
        </Button>
        <Button onClick={resetCam} title="Đưa camera về góc nhìn mặc định">
          🎥 Góc nhìn
        </Button>
        <Button tone="orange" onClick={deliver} disabled={!started}>
          📮 Đóng gói & giao hàng
        </Button>
      </div>
      <StatusChips />
    </div>
  )
}

function Objective({ step, canFlip }: { step: StepId; canFlip: boolean }) {
  const ctx = useCtx()
  const build = useBuild()
  const s = useGame()
  const info = STEP_INFO[step]
  const [done, total] = stepProgress(step, build, ctx, TOOLS.screw[s.tools.screw].clicks!)
  const toolKind = STEP_TOOL[step]
  const tool = toolKind && TOOLS[toolKind][s.tools[toolKind]]
  const hint =
    step === 'switch' && !s.inventory.switch?.count
      ? '⚠️ Hết switch! Về máy tính mua thêm.'
      : s.viewFlip && canFlip
        ? 'Đang xem mặt đáy — bấm "Lật lại mặt trên" để thao tác.'
        : info.hint
  return (
    <div className="fixed bottom-3 left-1/2 z-[5] flex max-w-[calc(100%-24px)] -translate-x-1/2 flex-col items-center gap-1">
      <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border-[3px] border-yellow bg-[rgba(14,16,24,0.92)] px-4.5 py-2.5 shadow-[0_6px_0_#0006]">
        <span className="font-head text-lg font-extrabold text-yellow">
          {info.title}{' '}
          {total > 1 && (
            <b>
              {done}/{total}
            </b>
          )}
        </span>
        <span>{hint}</span>
        {tool && !tool.none && (
          <span className="rounded-full bg-panel-2 px-2.5 py-0.5 text-xs font-extrabold">
            🔧 {tool.name}
          </span>
        )}
      </div>
      <span className="text-xs text-muted">
        Chuột trái: thao tác / xoay · Chuột phải: kéo · Cuộn: zoom
      </span>
    </div>
  )
}

// HUD trên bàn build 3D
export function BenchHud() {
  const ctx = useCtx()
  const build = useBuild()
  const order = useGame((s) => s.order!)
  const step = ctx.steps[build.stepIdx]
  const canFlip = !NO_FLIP_STEPS.includes(step)
  const side =
    step === 'stabMod' ? (
      <StabModPanel />
    ) : step === 'switchLube' ? (
      <LubePanel />
    ) : step === 'test' ? (
      <SoundMeter />
    ) : null

  return (
    <>
      <TopBar canFlip={canFlip} />
      <div className="fixed top-16 left-3 z-[5] flex max-h-[calc(100vh-160px)] w-[280px] flex-col gap-2 overflow-auto max-md:w-[220px]">
        <HudCard>
          <h4 className="mb-2 text-base">
            {order.avatar} Đơn của {order.customer}
          </h4>
          <OrderSpec order={order} compact />
        </HudCard>
        <StepList />
      </div>
      {side && (
        <div className="fixed top-16 right-3 z-[5] max-h-[calc(100vh-160px)] w-[260px] overflow-auto max-md:hidden">
          {side}
        </div>
      )}
      <Objective step={step} canFlip={canFlip} />
    </>
  )
}
