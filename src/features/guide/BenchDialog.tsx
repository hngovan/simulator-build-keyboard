import { useEffect, useState } from 'react'
import { useGame, useStep } from '@/store'
import { SCREW_STEPS } from '@/data/steps'
import { useSceneLoading } from '@/scene/common/loadingStore'
import { GuideGirl } from '@/components/art/GuideGirl'
import { cn } from '@/lib/format'
import { benchTopics } from './benchLines'

/**
 * Hội thoại Keeb-chan ở bàn build kiểu game nhập vai: giữa trên màn hình, khung thoại + nhân vật bên phải,
 * chữ chạy từng ký tự; bấm khung = hiện hết câu / sang câu sau, hết câu thì ghi `guideSeen` (không hiện lại).
 * Không bỏ qua được, chỉ thu nhỏ (nút "Thu nhỏ" / bấm nhân vật) thành avatar tròn góc phải dưới, bấm để nói tiếp câu đang dở.
 * Bàn trống (chưa build) cũng nói: chưa có đơn → đi nhận đơn, có đơn → bấm ô vàng chọn đơn
 */
export function BenchDialog() {
  const step = useStep()
  const seen = useGame((s) => s.guideSeen)
  const hasOrder = useGame((s) => !!s.order || s.jobs.length > 0)
  // đang mở bảng chọn đơn: không che
  const picker = useGame((s) => s.benchPicker)
  // cảnh 3D đang tải (vào bàn lần đầu / bước mới cần model): chờ `BenchLoader` xong mới nói
  const loading = useSceneLoading((s) => !s.ready || s.pending > 0)
  const topics = benchTopics(step, hasOrder).filter((t) => !seen.includes(t.id))
  const lines = topics.flatMap((t) => t.lines)
  const topic = topics.map((t) => t.id).join('|')
  const [idx, setIdx] = useState(0)
  const [small, setSmall] = useState(false)
  const [prevTopic, setPrevTopic] = useState(topic)
  // đổi tình huống (bước / nhận đơn) thì mở lại, đọc từ câu đầu của hội thoại mới
  if (prevTopic !== topic) {
    setPrevTopic(topic)
    setIdx(0)
    setSmall(false)
  }
  if (!lines.length || picker || loading) return null
  const finish = () => {
    const { seeGuide } = useGame.getState()
    topics.forEach((t) => seeGuide(t.id))
    setIdx(0)
  }
  const next = () => (idx + 1 < lines.length ? setIdx(idx + 1) : finish())
  // vặn vít: bảng chọn đầu vít nằm giữa trên → hạ khung thoại xuống dưới nó
  const top = step && step in SCREW_STEPS ? 'top-[136px]' : 'top-16'
  if (small)
    return (
      <button
        type="button"
        title="Keeb-chan đang hướng dẫn dở"
        onClick={() => setSmall(false)}
        className={cn(
          // góc phải dưới (giữa dưới là bảng bước, điện thoại bảng bước trải ngang nên nhích lên)
          'fixed right-3 bottom-3 z-[9] grid size-16 place-items-center overflow-hidden rounded-full border-[3px] border-yellow bg-panel shadow-[0_4px_0_#0006] hover:-translate-y-0.5 max-md:bottom-32',
        )}
      >
        <GuideGirl className="mt-6 w-16" />
        <span className="absolute top-0.5 right-1 size-3 animate-pulse rounded-full bg-red" />
      </button>
    )
  return (
    <div
      className={cn(
        'pointer-events-none fixed left-1/2 z-[9] flex -translate-x-1/2 items-start gap-2 max-md:top-[116px]',
        top,
      )}
    >
      <Line key={`${topic}-${idx}`} text={lines[idx]} more={idx + 1 < lines.length} onNext={next}>
        <span className="text-xs text-muted">
          {idx + 1}/{lines.length}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setSmall(true)
          }}
          className="text-xs font-bold text-muted hover:text-white"
        >
          Thu nhỏ
        </button>
      </Line>
      <button
        type="button"
        title="Thu nhỏ Keeb-chan"
        onClick={() => setSmall(true)}
        className="pointer-events-auto shrink-0 cursor-pointer transition-transform hover:-translate-y-0.5"
      >
        <GuideGirl className="w-[96px] animate-bob drop-shadow-[0_6px_0_rgba(0,0,0,0.35)] max-md:w-16" />
      </button>
    </div>
  )
}

/** 1 câu thoại: chữ chạy dần, bấm khi đang chạy thì hiện hết, bấm lần nữa sang câu sau */
function Line({
  text,
  more,
  onNext,
  children,
}: {
  text: string
  more: boolean
  onNext: () => void
  children: React.ReactNode
}) {
  // tách theo ký tự thật (emoji 2 đơn vị UTF-16 không bị cắt đôi)
  const chars = Array.from(text)
  const [shown, setShown] = useState(0)
  const done = shown >= chars.length
  useEffect(() => {
    if (done) return
    const t = window.setTimeout(() => setShown((n) => n + 1), 22)
    return () => window.clearTimeout(t)
  }, [shown, done])
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => (done ? onNext() : setShown(chars.length))}
      className="pointer-events-auto mt-3 flex w-[min(400px,calc(100vw-120px))] cursor-pointer flex-col gap-1.5 rounded-xl border border-white/30 bg-[rgba(14,16,24,0.94)] px-4 py-3 shadow-[0_6px_0_#0006] select-none hover:border-white/50"
    >
      <div className="flex items-center gap-2">
        <span className="font-head text-base font-extrabold text-white">Keeb-chan</span>
        <span className="ml-auto flex items-center gap-3">{children}</span>
      </div>
      <p className="min-h-[2.75em] text-sm leading-snug">{chars.slice(0, shown).join('')}</p>
      <span className={cn('self-end text-xs text-muted', done ? 'animate-pulse' : 'invisible')}>
        ▼ {more ? 'Nhấn để tiếp tục' : 'Nhấn để đóng'}
      </span>
    </div>
  )
}
