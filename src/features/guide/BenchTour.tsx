import { useEffect, useState } from 'react'
import { useGame, type GameState } from '@/store'
import { Button } from '@/components/ui'
import { SCREW_FULL, checkInventory } from '@/data/parts'
import {
  BIT_LABELS,
  SCREW_STEPS,
  isOptionalStep,
  stepBit,
  stepProgress,
  stepTitle,
} from '@/data/steps'
import type { ScrewBit, ScrewStep, StepId } from '@/types'
import { usePack } from '@/features/bench/packStore'
import { Spotlight } from './Spotlight'
import { BENCH_TOUR_ID, BIT_TOUR_ID, SHIP_TOUR_ID, TEST_TOUR_ID } from '@/data/tourIds'
import { holeOf, useTargetRect, type Hole } from './spotlightRect'
import { TUT_INTRO, TUT_LINES, TUT_MISSING, TUT_READY } from './benchLines'

/**
 * Keeb-chan ở bàn build (chỉ nằm trong tour, không còn NPC đứng riêng):
 * - Đơn hướng dẫn (`Order.tutorial`, chưa xong `BENCH_TOUR_ID`): tour tối màn như lúc mua đồ: thùng thiếu đồ → sáng nút đứng dậy,
 *   đủ đồ → chừa vùng 3D nhắc bấm vào thùng, mới vào build → lần lượt sáng khung đơn / danh sách bước / việc cần làm; đang làm bước lắp
 *   thì không khung, không tối (mũi tên vàng trong cảnh + khung việc cần làm); xong bước / bước tuỳ chọn → chỉ sáng nút "Bước tiếp theo" / "Bỏ qua".
 *   Đóng gói xong đơn thì ghi đã xem.
 * - Mọi đơn, 1 lần: lần đầu tới bước vặn vít (`BitTour`) / bước test (`TestTour`). Ngoài các tour này không còn lời dẫn nào
 *   (bỏ lời dẫn "lần đầu gặp mỗi bước" kiểu cũ: Keeb-chan chỉ nằm trong tour)
 */
export { BENCH_TOUR_ID, BIT_TOUR_ID, TEST_TOUR_ID } from '@/data/tourIds'

/** tình huống tour đơn hướng dẫn: `missing` / `ready` (thùng trên bàn, chưa build) / `<bước>|act|next|skip|pack` / null */
function tutorialMode(s: GameState): string | null {
  const o = s.order
  if (!o?.tutorial || s.guideSeen.includes(BENCH_TOUR_ID)) return null
  if (!s.build || !s.ctx) {
    if (s.benchBox !== o.id) return null
    return checkInventory(s.inventory, o).some((c) => !c.ok) ? 'missing' : 'ready'
  }
  const step = s.ctx.steps[s.build.stepIdx]
  if (step === 'pack') return 'pack|pack'
  const [d, t] = stepProgress(step, s.build, s.ctx, SCREW_FULL)
  const optional = isOptionalStep(step, o, s.ctx.steps)
  // bước vặn vít vào bắt đủ vít thì game tự sang bước kế (chờ tua vít quay xong): không sáng nút sang bước;
  // riêng stab tuôn ren thì game đứng lại chờ thay stab / tự bấm sang bước
  const autoNext =
    SCREW_STEPS[step as ScrewStep] === 'tighten' &&
    !(step === 'stabScrew' && s.ctx.screws.stabScrew.some((sc) => s.build!.stripped?.[sc.id]))
  if (step !== 'unbox' && d >= t) return autoNext ? `${step}|act` : `${step}|next`
  // bước tuỳ chọn khách không yêu cầu (foam, lube switch): sáng "Bỏ qua"; mod stab tính điểm (khách dặn stab phải êm) nên làm,
  // test cũng nên làm → không bảo bỏ qua
  if (optional && d === 0 && step !== 'test' && step !== 'stabMod') return `${step}|skip`
  return `${step}|act`
}

export function BenchTour() {
  const mode = useGame(tutorialMode)
  // đóng gói xong đơn hướng dẫn: tour bàn build xong
  const packedTut = useGame((s) => s.packed.some((p) => p.order.tutorial))
  useEffect(() => {
    if (packedTut && !useGame.getState().guideSeen.includes(BENCH_TOUR_ID))
      useGame.getState().seeGuide(BENCH_TOUR_ID)
  }, [packedTut])
  // lần đầu gặp bước vặn vít: tối màn, sáng bảng chọn đầu vít (ưu tiên hơn tour khác)
  const bitNeed = useGame((s) =>
    s.build && s.ctx && !s.guideSeen.includes(BIT_TOUR_ID)
      ? stepBit(s.ctx.steps[s.build.stepIdx])
      : undefined,
  )
  const testFirst = useGame(
    (s) =>
      !!s.build && s.ctx?.steps[s.build.stepIdx] === 'test' && !s.guideSeen.includes(TEST_TOUR_ID),
  )
  // đơn hướng dẫn vừa đóng gói, thùng còn trên bàn: nhắc cầm thùng lên mang ra kệ giao hàng
  const packedOnBench = useGame(
    (s) =>
      !s.build &&
      !!s.benchBox &&
      !s.guideSeen.includes(SHIP_TOUR_ID) &&
      s.packed.some((p) => p.order.tutorial && !p.shipped && p.order.id === s.benchBox),
  )
  if (bitNeed) return <BitTour need={bitNeed} />
  if (packedOnBench)
    return (
      <Spotlight
        hole={null}
        top
        text="Đóng gói xong! Nhấn chuột phải vào thùng để cầm lên, rồi đứng dậy (nút quay lại góc trên trái) mang ra kệ giao hàng sát tường phải trong phòng."
        actions={
          <Button size="sm" onClick={() => useGame.getState().seeGuide(SHIP_TOUR_ID)}>
            Bỏ qua hướng dẫn
          </Button>
        }
      />
    )
  if (testFirst) return <TestTour />
  return mode ? <TutorialTour mode={mode} /> : null
}

/** giới thiệu bước test (bấm "Tiếp" / "Hiểu rồi") */
const TEST_STEPS = [
  {
    target: 'hud-sound',
    lines: [
      'Máy đo âm thanh: số % là độ khớp với tiếng khách muốn (vd thock trầm, clack giòn).',
      'Thanh cam = độ ồn (êm → ồn), thanh xanh = cao độ (trầm → giòn), vạch trắng là âm khách muốn. Âm do switch, plate, case, foam, lube quyết định: càng sát vạch trắng càng được chấm cao.',
    ],
  },
  {
    target: 'bench-objective',
    lines: [
      'Gõ từng phím bằng bàn phím thật (hoặc click phím 3D), phím test rồi có chấm xanh. Phím không có trên bàn phím của bạn (Fn, macro...) thì click.',
      'Test hết phím rồi mới sang bước: bỏ sót là khách có thể báo lỗi nút; phím bấm không ăn thì quay lại bước lắp / hàn sửa.',
    ],
  },
]

/** Tour 1 lần ở bước test: sáng máy đo âm thanh rồi khung việc cần làm */
function TestTour() {
  const [i, setI] = useState(0)
  const step = TEST_STEPS[i]
  const rect = useTargetRect(step.target)
  const last = i + 1 >= TEST_STEPS.length
  return (
    <Spotlight
      hole={holeOf(rect)}
      label={`${i + 1} / ${TEST_STEPS.length}`}
      text={
        <div className="flex flex-col gap-1.5">
          {step.lines.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>
      }
      actions={
        <Button
          size="sm"
          tone="green"
          onClick={() => {
            if (!last) return setI(i + 1)
            useGame.getState().seeGuide(TEST_TOUR_ID)
          }}
        >
          {last ? 'Hiểu rồi' : 'Tiếp'}
        </Button>
      }
    />
  )
}

/** đầu vít theo thứ tự nút trên bảng (phím tắt 1–4) */
const BIT_ORDER = Object.keys(BIT_LABELS) as ScrewBit[]

/** Tour 1 lần: bước này phải vặn vít → sáng bảng đầu vít, chọn đúng đầu thì xong (đã đúng sẵn thì bấm "Hiểu rồi") */
function BitTour({ need }: { need: ScrewBit }) {
  const right = useGame((s) => s.screwBit === need)
  const [wasRight] = useState(right)
  const rect = useTargetRect('bit-picker')
  const done = () => useGame.getState().seeGuide(BIT_TOUR_ID)
  // chọn đúng đầu (lúc đầu đang sai) thì tự xong sau 1 nhịp cho thấy nút sáng xanh
  useEffect(() => {
    if (!right || wasRight) return
    const t = window.setTimeout(done, 700)
    return () => clearTimeout(t)
  }, [right, wasRight])
  const label = BIT_LABELS[need]
  return (
    <Spotlight
      hole={holeOf(rect)}
      side
      text={
        <div className="flex flex-col gap-1.5">
          <p>
            Bước này phải vặn vít! Mặt ốc là đầu <b>{label}</b> (hình góc phải bảng này).
          </p>
          <p>
            {right
              ? `Tua vít đang lắp đúng đầu ${label} rồi, cứ thế vặn nhé.`
              : `Bấm nút "${label}" (hoặc phím ${BIT_ORDER.indexOf(need) + 1}) để thay đầu vít.`}{' '}
            Sai đầu là trượt ren, 3 lần thì tuôn ren hỏng vít đó!
          </p>
        </div>
      }
      actions={
        right && wasRight ? (
          <Button size="sm" tone="green" onClick={done}>
            Hiểu rồi
          </Button>
        ) : undefined
      }
    />
  )
}

const skipTour = () => useGame.getState().seeGuide(BENCH_TOUR_ID)

/** giới thiệu HUD lúc mới vào build (bấm "Tiếp") */
const INTRO_STEPS = [
  {
    target: 'hud-order',
    text: 'Đây là yêu cầu của khách: layout, switch, keycap, kiểu lắp... Làm sai là bị chấm thấp đó.',
  },
  {
    target: 'hud-steps',
    text: 'Các bước build theo thứ tự. Bước đã làm thì bấm vào để quay lại sửa (lỡ tay thì Ctrl + Z).',
  },
  {
    target: 'bench-objective',
    text: `Khung này luôn ghi việc cần làm ngay bây giờ. ${TUT_INTRO[0]}`,
  },
]

function TutorialTour({ mode }: { mode: string }) {
  // đang hỏi lại trước khi đóng gói (popup `ConfirmDeliver`): ẩn tour, không đè lên popup
  const asking = usePack((p) => p.ask)
  const [step, kind] = mode.split('|') as [StepId | 'missing' | 'ready', string | undefined]
  const building = !!kind
  const title = useGame((s) =>
    building && s.ctx ? stepTitle(step as StepId, s.order, s.ctx.steps) : '',
  )
  // giới thiệu HUD 1 lần khi mới vào build (đang ở bước đầu)
  const [intro, setIntro] = useState(() =>
    useGame.getState().build && (useGame.getState().build?.stepIdx ?? 0) > 1
      ? INTRO_STEPS.length
      : 0,
  )
  const inIntro = building && intro < INTRO_STEPS.length

  // phần tử cần sáng: nút đứng dậy / nút sang bước / nút đóng gói / popup test xong / khung HUD lúc giới thiệu
  const testDone = useTargetRect('test-done')
  const target = inIntro
    ? INTRO_STEPS[intro].target
    : step === 'missing'
      ? 'bench-back'
      : kind === 'pack'
        ? 'bench-pack'
        : kind === 'next' || kind === 'skip'
          ? 'bench-next'
          : null
  const rect = useTargetRect(target)
  let hole: Hole | null = holeOf(kind === 'next' && testDone ? testDone : rect)
  // đủ đồ: chừa cả vùng 3D dưới thanh trên cùng, trên dòng hướng dẫn đáy (bấm chuột trái vào thùng để build)
  if (step === 'ready') hole = { x: 4, y: 60, w: innerWidth - 8, h: innerHeight - 60 - 64 }

  const tut = building ? TUT_LINES[step as StepId] : undefined
  const lines: string[] = inIntro
    ? [INTRO_STEPS[intro].text]
    : step === 'missing'
      ? TUT_MISSING
      : step === 'ready'
        ? TUT_READY
        : kind === 'next'
          ? [`Xong bước "${title}"! Bấm "Bước tiếp theo" để sang bước kế.`]
          : kind === 'skip'
            ? [...(tut ?? []), `Bước "${title}" là tuỳ chọn, khách không yêu cầu: bấm "Bỏ qua".`]
            : (tut ?? [])

  // đang làm bước lắp (sau phần giới thiệu): không khung, không tối (khung việc cần làm + mũi tên vàng đã đủ rõ);
  // chỉ hiện lại khi xong bước / bước tuỳ chọn (sáng nút sang bước) hoặc đóng gói
  if (asking) return null
  // đang test phím: lời dẫn giữa trên màn (không tối, không chặn bấm) nhắc gõ phím
  if (kind === 'act' && !inIntro && step === 'test')
    return (
      <Spotlight
        hole={null}
        top
        text="Gõ từng phím bằng bàn phím thật (hoặc click phím 3D trên bàn) để test. Phím test rồi có chấm xanh; test đủ hết phím mới sang bước đóng gói được."
        actions={
          <Button size="sm" onClick={skipTour}>
            Bỏ qua hướng dẫn
          </Button>
        }
      />
    )
  if (kind === 'act' && !inIntro) return null

  return (
    <Spotlight
      hole={hole}
      // nút sang bước / đóng gói: chỉ viền nút, không chặn bấm (vẫn lùi bước ở danh sách bước, bấm thùng carton được)
      passive={kind === 'next' || kind === 'skip' || kind === 'pack'}
      text={
        <div className="flex flex-col gap-1.5">
          {lines.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>
      }
      actions={
        <>
          <Button size="sm" onClick={skipTour}>
            Bỏ qua hướng dẫn
          </Button>
          {inIntro && (
            <Button size="sm" tone="green" onClick={() => setIntro(intro + 1)}>
              Tiếp
            </Button>
          )}
        </>
      }
    />
  )
}
