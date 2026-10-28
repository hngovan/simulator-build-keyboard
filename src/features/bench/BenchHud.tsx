import { useEffect, useState } from 'react'
import { useGame, useBuild, useCtx } from '@/store'
import {
  autoFlip,
  NO_FLIP_STEPS,
  TOP_FLIP_STEPS,
  isOptionalStep,
  stepTitle,
  SCREW_STEPS,
  STEP_INFO,
  stepProgress,
} from '@/data/steps'
import { SCREW_FULL, SWITCHES, TOOLS, screwLevel } from '@/data/parts'
import { SUPPLIES } from '@/data/supplies'
import { FlipVertical2, ListOrdered, Monitor, PackageCheck, Undo2 } from 'lucide-react'
import { Alert, Button, HudCard, HudPanel, IconButton, useOpen } from '@/components/ui'
import { cn } from '@/lib/format'
import { OrderSpec } from '@/components/game/OrderSpec'
import { StatusChips } from '@/components/game/StatusChips'
import type { ScrewStep, StepId, ToolKind } from '@/types'
import { StepList } from './StepList'
import { FeetPanel, FoamPanel, LubePanel, RingPanel, SolderPanel, StabModPanel } from './ModPanels'
import { DevCasePanel } from './DevCasePanel'
import { SoundMeter } from './SoundMeter'
import { BitPicker } from './BitPicker'
import { CamModeButton, ResetCamButton } from './CamModeButton'
import { useBenchKey } from './useBenchKey'
import { stabModHint, stabModRules } from '@/data/mods'
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
  const order = useGame((s) => s.order)
  const clicks = SCREW_FULL
  return ctx.steps
    .filter((st) => !isOptionalStep(st, order))
    .every((st) => {
      const [d, t] = stepProgress(st, build, ctx, clicks)
      return d >= t
    })
}

interface DeliverIssues {
  /** bước bắt buộc chưa xong */
  missing: string[]
  /** yêu cầu của khách chưa đạt (lube, dây O-ring...) */
  requested: string[]
  /** bước tuỳ chọn đã bỏ qua / làm dở (mod stab, lube, foam, test) */
  skipped: string[]
}

/** Những gì còn thiếu trước khi đóng gói: bước bắt buộc, yêu cầu của khách, bước tuỳ chọn bị bỏ qua */
function useDeliverIssues(): DeliverIssues {
  const ctx = useCtx()
  const build = useBuild()
  const order = useGame((s) => s.order)
  const swType = useGame((s) => s.inventory.switch?.type)
  const stabType = useGame((s) => s.inventory.stab?.type)
  const missing: string[] = []
  const requested: string[] = []
  const skipped: string[] = []
  const has = (st: StepId) => ctx.steps.includes(st)
  for (const st of ctx.steps.filter((x) => !isOptionalStep(x, order))) {
    const [d, t] = stepProgress(st, build, ctx, SCREW_FULL)
    if (d < t) missing.push(`${stepTitle(st, order)}${t > 1 ? ` (${Math.min(d, t)}/${t})` : ''}`)
  }
  const n = ctx.keys.length
  const prelubed = !!(swType && SWITCHES[swType]?.prelubed)
  if (order?.lubePref === 'want' && !prelubed && build.lubed < n)
    requested.push(`Khách muốn lube switch: mới lube ${build.lubed}/${n} con`)
  if (order?.lubePref === 'none' && build.lubed > 0)
    requested.push('Khách dặn KHÔNG lube switch nhưng đã lube')
  if (order?.oring && has('ring') && build.ring !== order.oring)
    requested.push(`Khách muốn dây O-ring ${SUPPLIES[order.oring].name.replace('Dây O-ring ', '')}`)
  if (has('stabMod') && stabType) {
    const todo = stabModRules(stabType).filter((r) => r.needed && !build.stabMods[r.kind])
    if (todo.length) skipped.push(`Mod stab: còn ${todo.map((r) => r.label).join(', ')}`)
  }
  if (has('switchLube') && order?.lubePref === 'any' && !prelubed && build.lubed < n)
    skipped.push(`Lube switch: ${build.lubed}/${n} con`)
  if (has('foam') && isOptionalStep('foam', order) && !build.foam) skipped.push('Lót foam PCB')
  const tested = Object.keys(build.tested).length
  if (has('test') && tested < n) skipped.push(`Test phím: ${tested}/${n} phím`)
  return { missing, requested, skipped }
}

/** Hỏi lại trước khi đóng gói khi còn bước chưa xong / yêu cầu của khách chưa đạt / bước bị bỏ qua: liệt kê từng mục */
function ConfirmDeliver({
  issues,
  onCancel,
  onConfirm,
}: {
  issues: DeliverIssues
  onCancel: () => void
  onConfirm: () => void
}) {
  const list = (items: string[]) => (
    <ul className="list-disc pl-5 text-sm">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  )
  return (
    <div
      className="fixed inset-0 z-[30] grid animate-fade-in place-items-center bg-black/55 p-4"
      onPointerDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <HudCard className="flex w-[min(460px,100%)] flex-col gap-3">
        <h3 className="font-head text-xl font-extrabold text-yellow">
          📮 Chắc chắn đóng gói đơn này?
        </h3>
        {issues.missing.length > 0 && (
          <Alert title="Bàn phím vẫn chưa build xong">{list(issues.missing)}</Alert>
        )}
        {issues.requested.length > 0 && (
          <Alert title="Chưa đúng yêu cầu của khách">{list(issues.requested)}</Alert>
        )}
        {issues.skipped.length > 0 && (
          <Alert tone="yellow" title="Các bước đã bỏ qua">
            {list(issues.skipped)}
          </Alert>
        )}
        <div className="text-sm text-muted">
          Giao lúc này khách có thể chấm điểm thấp và ảnh hưởng tới uy tín của bạn. Bạn không muốn
          làm tới cùng cho khách sao?
        </div>
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

const noop = () => {}

function TopBar({ canFlip, isFlipped }: { canFlip: boolean; isFlipped: boolean }) {
  const started = useBuild().stepIdx > 0
  const issues = useDeliverIssues()
  const clean = !issues.missing.length && !issues.requested.length && !issues.skipped.length
  const [confirming, setConfirming] = useState(false)
  const busy = useGame((s) => !!s.stabAnim || !!s.lubeAnim)
  const canUndo = useGame((s) => s.history.length > 0 && !s.stabAnim)
  const { zoomToPC, toggleFlip, deliver, undo } = useGame.getState()
  // phím Q lật xem đáy / lật lại mặt trên (như nút vàng)
  useBenchKey('KeyQ', canFlip ? toggleFlip : noop)
  // Ctrl+Z để hoàn tác (phím R đổi kéo / xoay, Space về góc nhìn mặc định: CamModeButton)
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
          label={isFlipped ? 'Lật lại mặt trên (Q)' : 'Lật xem đáy (Q)'}
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
          label="Danh sách đơn (M)"
          onClick={() => useGame.setState({ benchPicker: true })}
          disabled={busy}
        />
        <IconButton
          tone="orange"
          icon={<PackageCheck />}
          label="Đóng gói đơn này"
          onClick={() => (clean ? deliver() : setConfirming(true))}
          disabled={!started}
        />
      </div>
      <StatusChips />
      {confirming && (
        <ConfirmDeliver
          issues={issues}
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
  const [done, total] = stepProgress(step, build, ctx, SCREW_FULL)
  const finished = done >= total
  const optional = isOptionalStep(step, s.order, ctx.steps)
  // hàn dở vẫn đi tiếp được (nút đỏ cảnh báo), khớp nextStep
  const soft = step === 'solder' && done > 0 && !finished
  const last = build.stepIdx >= ctx.steps.length - 1
  const busy = !!s.stabAnim || !!s.lubeAnim
  // đang đứng ở bước cũ (đã lùi về): đi tiếp theo các bước đã làm
  const ahead = s.future.length > 1
  const toolKind = STEP_TOOL[step]
  // tua vít: loại đang chọn dùng (có thể là loại thường dù đã mua tua vít điện)
  const toolLv =
    toolKind === 'screw' ? screwLevel(s.tools, s.screwPick) : toolKind && s.tools[toolKind]
  const tool = toolKind && TOOLS[toolKind][toolLv as number]
  // đã có tua vít điện: bấm ô dụng cụ để đổi qua lại tay / điện
  const swapTo = toolKind === 'screw' && s.tools.screw > 0 ? (toolLv ? 0 : s.tools.screw) : null
  const isFlipped = canFlip && (autoFlip(step, ctx) ? !s.viewFlip : s.viewFlip)
  const hint =
    step === 'switch' && !s.inventory.switch?.count
      ? '⚠️ Hết switch! Về máy tính mua thêm.'
      : step === 'topScrew'
        ? s.viewFlip
          ? info.hint
          : 'Bấm Q (hoặc bấm vào case) để lật cả cụm lên, ốc top mount vặn từ mặt dưới'
        : // chỉ nhắc khi người chơi tự lật ra mặt kia (bước tự lật như hàn / vặn vít đáy thì mặt đáy là mặt thao tác)
          canFlip && s.viewFlip
          ? isFlipped
            ? 'Đang xem mặt đáy — bấm "Lật lại mặt trên" để thao tác.'
            : 'Đang xem mặt trên — bấm "Lật xem đáy" để thao tác.'
          : step === 'stabMod' && s.inventory.stab
            ? stabModHint(s.inventory.stab.type)
            : step === 'caseIn' && build.inCase && ctx.steps[build.stepIdx + 1] === 'caseClose'
              ? 'Board đã vào case: click vào case trên để đậy lại'
              : info.hint
  // thu gọn: chỉ còn tiêu đề + tiến độ + nút bước sau (nhớ trạng thái như các panel HUD)
  const [open, toggle] = useOpen('objective')
  return (
    // điện thoại: thẻ trải hết bề ngang (không bị bóp làm tên bước xuống nhiều dòng)
    <div className="fixed bottom-3 left-1/2 z-[5] flex max-w-[calc(100%-24px)] -translate-x-1/2 flex-col items-center gap-1 max-md:w-[calc(100%-24px)]">
      <div
        className={cn(
          'flex items-center rounded-2xl border-[3px] border-yellow bg-[rgba(14,16,24,0.92)] shadow-[0_6px_0_#0006] max-md:w-full',
          open
            ? 'flex-col gap-2 px-5 py-3 max-md:px-3 max-md:py-2'
            : 'gap-3 py-1.5 pr-1.5 pl-4 max-md:justify-between',
        )}
      >
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          title={open ? 'Thu gọn hướng dẫn' : 'Mở hướng dẫn'}
          className="flex items-center gap-2 font-head text-xl font-extrabold text-yellow transition-opacity hover:opacity-85 max-md:text-lg max-md:whitespace-nowrap"
        >
          <span>
            {stepTitle(step, s.order)}{' '}
            {total > 1 && (
              <b>
                {done}/{total}
              </b>
            )}
          </span>
          <span className={cn('text-xs transition-transform', !open && '-rotate-90')}>▼</span>
        </button>
        {open && (
          <span className="max-w-[640px] text-center text-base leading-snug max-md:text-sm">
            {hint}
          </span>
        )}
        {/* dụng cụ đang dùng + nút bước sau: cùng cỡ, đứng cạnh nhau (thu gọn thì chỉ còn nút) */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {open &&
            tool &&
            !tool.none &&
            (swapTo !== null ? (
              // đổi tua vít: viền vàng = bấm được
              <button
                type="button"
                title={`Đổi sang ${TOOLS.screw[swapTo].name}`}
                onClick={() => s.setScrewPick(swapTo)}
                className="inline-flex h-9 min-w-[180px] items-center justify-center gap-1.5 rounded-[10px] border-2 border-yellow bg-panel-2 px-4 font-head text-sm font-extrabold shadow-[0_4px_0_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-0.5"
              >
                🔧 {tool.name} ⇄
              </button>
            ) : (
              <span className="inline-flex h-9 min-w-[180px] items-center justify-center gap-1.5 rounded-[10px] bg-panel-2 px-4 font-head text-sm font-extrabold shadow-[0_4px_0_rgba(0,0,0,0.35)]">
                🔧 {tool.name}
              </span>
            ))}
          {/* mọi bước đều phải bấm mới sang bước sau; bước tuỳ chọn thì bỏ qua được */}
          {/* bước mở hộp: click thùng là tự sang bước sau, không cần nút */}
          {!last && step !== 'unbox' && (
            <Button
              tone={finished || ahead ? 'green' : soft ? 'red' : 'blue'}
              size="sm"
              className="inline-flex h-9 min-w-[180px] items-center justify-center px-4 text-sm max-md:min-w-[140px]"
              onClick={s.nextStep}
              disabled={busy || (!finished && !optional && !ahead && !soft)}
              title={
                finished || optional || ahead
                  ? undefined
                  : soft
                    ? 'Phím chưa hàn / hàn cháy sẽ không ăn khi test, khách nhận sẽ báo lỗi'
                    : 'Làm xong bước này trước'
              }
            >
              {finished || ahead
                ? 'Bước tiếp theo'
                : optional
                  ? 'Bỏ qua'
                  : soft
                    ? `Bỏ dở, còn ${total - done} phím`
                    : `Còn ${total - done} nữa`}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Test hết phím (và build đã xong các bước bắt buộc): báo phím xong rồi, bấm OK thì đóng gói đơn và mở hội thoại
 * Mezzenger của khách để gửi hàng. "Để sau" thì ẩn tới khi đổi đơn
 */
function TestDone() {
  const ctx = useCtx()
  const build = useBuild()
  const order = useGame((s) => s.order)
  const complete = useBuildComplete()
  const [closed, setClosed] = useState<string | null>(null)
  const step = ctx.steps[build.stepIdx]
  const [tested, total] = stepProgress('test', build, ctx, 0)
  if (!order || step !== 'test' || tested < total || !complete || closed === order.id) return null
  return (
    <div className="fixed inset-0 z-[30] grid animate-fade-in place-items-center bg-black/55 p-4">
      <HudCard className="flex w-[min(460px,100%)] flex-col gap-3">
        <h3 className="font-head text-xl font-extrabold text-yellow">🎉 Phím đã xong rồi!</h3>
        <p className="text-base leading-snug">
          <b className="text-green">
            Test đủ {total}/{total} phím, mọi phím đều nhận.
          </b>{' '}
          Bàn phím của {order.customer} đã build xong, đóng gói rồi nhắn khách để gửi hàng thôi!
        </p>
        <div className="flex justify-end gap-2">
          <Button onClick={() => setClosed(order.id)}>Để sau</Button>
          <Button tone="green" onClick={() => useGame.getState().deliver()}>
            OK, gửi khách
          </Button>
        </div>
      </HudCard>
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
  const canFlip = !NO_FLIP_STEPS.includes(step) || (TOP_FLIP_STEPS.includes(step) && !build.closed)
  const isFlipped = canFlip && (autoFlip(step, ctx) ? !viewFlip : viewFlip)
  const side =
    step === 'stabMod' ? (
      <StabModPanel />
    ) : step === 'switchLube' ? (
      <LubePanel />
    ) : step === 'solder' ? (
      <SolderPanel />
    ) : step === 'feet' ? (
      <FeetPanel />
    ) : step === 'foam' ? (
      <FoamPanel />
    ) : step === 'ring' ? (
      <RingPanel />
    ) : step === 'test' ? (
      <SoundMeter />
    ) : null

  // dev: đơn build thử có bảng đổi case / màu / mount ngay trên bàn
  const devCase = import.meta.env.DEV && !!order.dev

  return (
    <>
      <TopBar canFlip={canFlip} isFlipped={isFlipped} />
      {/* 2 cột HUD: mỗi thẻ bấm tiêu đề để thu gọn / mở, thân cuộn riêng */}
      <div className="fixed top-16 left-3 z-[5] flex max-h-[calc(100vh-160px)] w-[300px] flex-col gap-2 text-sm max-md:top-[116px] max-md:max-h-[calc(100dvh-300px)] max-md:w-[min(280px,calc(100vw-24px))] max-md:text-[13px] [&_.text-base]:text-lg [&_.text-xs]:text-sm">
        <HudPanel id="order" title={`Đơn của ${order.customer}`} className="shrink-0">
          <OrderSpec order={order} compact mount={ctx.mount} />
        </HudPanel>
        <StepList />
      </div>
      {(side || devCase) && (
        // cột phải: chữ 14px đồng bộ với cột trái (chữ nhỏ 12 → 14px, tiêu đề lớn hơn 1 bậc)
        <div className="fixed top-16 right-3 z-[5] flex max-h-[calc(100vh-160px)] w-[310px] flex-col gap-2 text-sm max-md:hidden [&_.text-base]:text-lg [&_.text-xs]:text-sm">
          {devCase && <DevCasePanel />}
          {side}
        </div>
      )}
      <Objective step={step} canFlip={canFlip} />
      {step in SCREW_STEPS && <BitPicker step={step as ScrewStep} />}
      <OrderPicker />
      <TestDone />
    </>
  )
}
