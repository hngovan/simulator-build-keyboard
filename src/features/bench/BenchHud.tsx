import { useEffect, useState } from 'react'
import { useGame, useBuild, useCtx } from '@/store'
import {
  autoFlip,
  NO_FLIP_STEPS,
  OPTIONAL_STEPS,
  SCREW_STEPS,
  STEP_INFO,
  stepProgress,
} from '@/data/steps'
import { TOOLS } from '@/data/parts'
import { FlipVertical2, ListOrdered, Monitor, PackageCheck, Undo2 } from 'lucide-react'
import { Alert, Button, HudCard, HudPanel, IconButton, useOpen } from '@/components/ui'
import { cn } from '@/lib/format'
import { OrderSpec } from '@/components/game/OrderSpec'
import { StatusChips } from '@/components/game/StatusChips'
import type { ScrewStep, StepId, ToolKind } from '@/types'
import { StepList } from './StepList'
import { LubePanel, SolderPanel, StabModPanel } from './ModPanels'
import { SoundMeter } from './SoundMeter'
import { BitPicker } from './BitPicker'
import { CamModeButton, ResetCamButton } from './CamModeButton'
import { OrderPicker } from './EmptyBenchHud'

// Dụng cụ đang dùng ở mỗi bước (hiện ở thanh nhiệm vụ)
const STEP_TOOL: Partial<Record<StepId, ToolKind>> = {
  switch: 'switch',
  keycap: 'keycap',
  caseOpen: 'screw',
  stabScrew: 'screw',
  topScrew: 'screw',
  trayScrew: 'screw',
  caseScrew: 'screw',
  solder: 'solder',
  stabMod: 'clipper',
  switchLube: 'opener',
}

/** Build đã xong hết các bước bắt buộc chưa (giao sớm thì hỏi lại) */
function useBuildComplete() {
  const ctx = useCtx()
  const build = useBuild()
  const clicks = useGame((s) => TOOLS.screw[s.tools.screw].clicks!)
  return ctx.steps
    .filter((st) => !OPTIONAL_STEPS.includes(st))
    .every((st) => {
      const [d, t] = stepProgress(st, build, ctx, clicks)
      return d >= t
    })
}

/** Hỏi lại trước khi giao bàn phím chưa build xong cho khách */
function ConfirmDeliver({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[30] grid animate-fade-in place-items-center bg-black/55 p-4"
      onPointerDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <HudCard className="flex w-[460px] max-w-full flex-col gap-3">
        <h3 className="font-head text-xl font-extrabold text-yellow">
          📮 Giao bàn phím chưa xong?
        </h3>
        <Alert title="Bàn phím vẫn chưa build xong">
          Giao lúc này khách sẽ chấm điểm thấp và có thể ảnh hưởng tới uy tín của bạn. Bạn không
          muốn làm tới cùng cho khách sao?
        </Alert>
        <div className="flex justify-end gap-2">
          <Button tone="red" onClick={onConfirm}>
            Vẫn giao
          </Button>
          <Button tone="green" onClick={onCancel}>
            🛠 Làm tiếp
          </Button>
        </div>
      </HudCard>
    </div>
  )
}

function TopBar({ canFlip, isFlipped }: { canFlip: boolean; isFlipped: boolean }) {
  const started = useBuild().stepIdx > 0
  const complete = useBuildComplete()
  const [confirming, setConfirming] = useState(false)
  const busy = useGame((s) => !!s.stabAnim || !!s.lubeAnim)
  const canUndo = useGame((s) => s.history.length > 0 && !s.stabAnim)
  const { zoomToPC, toggleFlip, deliver, undo } = useGame.getState()
  // Ctrl+Z để hoàn tác (phím H đổi kéo / xoay nằm trong CamModeButton)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useGame.getState()
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault()
        s.undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    // z-[8]: tooltip icon nổi trên khung HUD 2 bên (z-[5]), dưới bảng hỏi / danh sách đơn
    <div className="pointer-events-none fixed inset-x-3 top-3 z-[8] flex items-center justify-between max-md:flex-wrap max-md:gap-2 [&>*]:pointer-events-auto">
      <div className="flex gap-2">
        <IconButton tone="blue" icon={<Monitor />} label="Về máy tính" onClick={zoomToPC} />
        <IconButton
          tone="yellow"
          icon={<FlipVertical2 />}
          label={isFlipped ? 'Lật lại mặt trên' : 'Lật xem đáy'}
          onClick={toggleFlip}
          disabled={!canFlip}
        />
        <IconButton
          icon={<Undo2 />}
          label="Hoàn tác (Ctrl + Z)"
          onClick={undo}
          disabled={!canUndo}
        />
        <ResetCamButton />
        <CamModeButton />
        {/* danh sách đơn: xem tiến độ, đổi sang đơn khác (bản đang dở được cất lại nguyên trạng) */}
        <IconButton
          tone="blue"
          icon={<ListOrdered />}
          label="Danh sách đơn"
          onClick={() => useGame.setState({ benchPicker: true })}
          disabled={busy}
        />
        <IconButton
          tone="orange"
          icon={<PackageCheck />}
          label="Đóng gói đơn này"
          onClick={() => (complete ? deliver() : setConfirming(true))}
          disabled={!started}
        />
      </div>
      <StatusChips />
      {confirming && (
        <ConfirmDeliver
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false)
            deliver()
          }}
        />
      )}
    </div>
  )
}

function Objective({ step, canFlip }: { step: StepId; canFlip: boolean }) {
  const ctx = useCtx()
  const build = useBuild()
  const s = useGame()
  const info = STEP_INFO[step]
  const [done, total] = stepProgress(step, build, ctx, TOOLS.screw[s.tools.screw].clicks!)
  const finished = done >= total
  const optional = step === 'stabMod' || step === 'switchLube'
  const last = build.stepIdx >= ctx.steps.length - 1
  const busy = !!s.stabAnim || !!s.lubeAnim
  // đang đứng ở bước cũ (đã lùi về): đi tiếp theo các bước đã làm
  const ahead = s.future.length > 1
  const toolKind = STEP_TOOL[step]
  const tool = toolKind && TOOLS[toolKind][s.tools[toolKind]]
  const isFlipped = canFlip && (autoFlip(step, ctx) ? !s.viewFlip : s.viewFlip)
  const hint =
    step === 'switch' && !s.inventory.switch?.count
      ? '⚠️ Hết switch! Về máy tính mua thêm.'
      : // chỉ nhắc khi người chơi tự lật ra mặt kia (bước tự lật như hàn / vặn vít đáy thì mặt đáy là mặt thao tác)
        canFlip && s.viewFlip
        ? isFlipped
          ? 'Đang xem mặt đáy — bấm "Lật lại mặt trên" để thao tác.'
          : 'Đang xem mặt trên — bấm "Lật xem đáy" để thao tác.'
        : info.hint
  // thu gọn: chỉ còn tiêu đề + tiến độ + nút bước sau (nhớ trạng thái như các panel HUD)
  const [open, toggle] = useOpen('objective')
  return (
    <div className="fixed bottom-3 left-1/2 z-[5] flex max-w-[calc(100%-24px)] -translate-x-1/2 flex-col items-center gap-1">
      <div
        className={cn(
          'flex items-center rounded-2xl border-[3px] border-yellow bg-[rgba(14,16,24,0.92)] shadow-[0_6px_0_#0006]',
          open ? 'flex-col gap-2 px-5 py-3' : 'gap-3 py-1.5 pr-1.5 pl-4',
        )}
      >
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          title={open ? 'Thu gọn hướng dẫn' : 'Mở hướng dẫn'}
          className="flex items-center gap-2 font-head text-xl font-extrabold text-yellow transition-opacity hover:opacity-85"
        >
          <span>
            {info.title}{' '}
            {total > 1 && (
              <b>
                {done}/{total}
              </b>
            )}
          </span>
          <span className={cn('text-xs transition-transform', !open && '-rotate-90')}>▼</span>
        </button>
        {open && <span className="max-w-[640px] text-center text-base leading-snug">{hint}</span>}
        {/* dụng cụ đang dùng + nút bước sau: cùng cỡ, đứng cạnh nhau (thu gọn thì chỉ còn nút) */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {open && tool && !tool.none && (
            <span className="inline-flex h-9 min-w-[180px] items-center justify-center gap-1.5 rounded-[10px] bg-panel-2 px-4 font-head text-sm font-extrabold shadow-[0_4px_0_rgba(0,0,0,0.35)]">
              🔧 {tool.name}
            </span>
          )}
          {/* mọi bước đều phải bấm mới sang bước sau; bước tuỳ chọn thì bỏ qua được */}
          {/* bước mở hộp: click thùng là tự sang bước sau, không cần nút */}
          {!last && step !== 'unbox' && (
            <Button
              tone={finished || ahead ? 'green' : 'blue'}
              size="sm"
              className="inline-flex h-9 min-w-[180px] items-center justify-center px-4 text-sm"
              onClick={s.nextStep}
              disabled={busy || (!finished && !optional && !ahead)}
              title={finished || optional || ahead ? undefined : 'Làm xong bước này trước'}
            >
              {finished || ahead
                ? 'Bước tiếp theo →'
                : optional
                  ? 'Bỏ qua →'
                  : `Còn ${total - done} nữa`}
            </Button>
          )}
        </div>
      </div>
      <span className={cn('text-xs text-muted', !open && 'hidden')}>
        {s.camMode === 'pan'
          ? '✋ Chuột trái: kéo khung nhìn · Chuột phải: xoay 360° · Cuộn: zoom · H: đổi chế độ'
          : 'Chuột trái: thao tác / xoay 360° · Chuột phải hoặc Shift + kéo: di chuyển · Cuộn: zoom · H: bàn tay'}
      </span>
    </div>
  )
}

// HUD trên bàn build 3D
export function BenchHud() {
  const ctx = useCtx()
  const build = useBuild()
  const order = useGame((s) => s.order!)
  const viewFlip = useGame((s) => s.viewFlip)
  const step = ctx.steps[build.stepIdx]
  const canFlip = !NO_FLIP_STEPS.includes(step)
  const isFlipped = canFlip && (autoFlip(step, ctx) ? !viewFlip : viewFlip)
  const side =
    step === 'stabMod' ? (
      <StabModPanel />
    ) : step === 'switchLube' ? (
      <LubePanel />
    ) : step === 'solder' ? (
      <SolderPanel />
    ) : step === 'test' ? (
      <SoundMeter />
    ) : null

  return (
    <>
      <TopBar canFlip={canFlip} isFlipped={isFlipped} />
      {/* 2 cột HUD: mỗi thẻ bấm tiêu đề để thu gọn / mở, thân cuộn riêng */}
      <div className="fixed top-16 left-3 z-[5] flex max-h-[calc(100vh-160px)] w-[300px] flex-col gap-2 text-sm max-md:top-[116px] max-md:max-h-[calc(100dvh-300px)] max-md:w-[min(240px,calc(100vw-24px))] max-md:text-[13px] [&_.text-base]:text-lg [&_.text-xs]:text-sm">
        <HudPanel id="order" title={`Đơn của ${order.customer}`} className="shrink-0">
          <OrderSpec order={order} compact />
        </HudPanel>
        <StepList />
      </div>
      {side && (
        // cột phải: chữ 14px đồng bộ với cột trái (chữ nhỏ 12 → 14px, tiêu đề lớn hơn 1 bậc)
        <div className="fixed top-16 right-3 z-[5] flex max-h-[calc(100vh-160px)] w-[310px] flex-col text-sm max-md:hidden [&_.text-base]:text-lg [&_.text-xs]:text-sm">
          {side}
        </div>
      )}
      <Objective step={step} canFlip={canFlip} />
      {step in SCREW_STEPS && <BitPicker step={step as ScrewStep} />}
      <OrderPicker />
    </>
  )
}
