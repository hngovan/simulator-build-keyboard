import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import { KeyCap, MouseIcon } from '@/components/game/ControlsHint'
import { useEffect, useState } from 'react'
import { TYPE_MS, useIntro } from './introStore'

const R = 72
const RING = 2 * Math.PI * R

/**
 * Vòng tròn góc phải dưới lúc tập đi lại (sau khi chọn ✓ ở đoạn mở đầu): "Nhìn xung quanh" (chuột + 4 mũi tên) rồi "Di chuyển"
 * (W A S D); viền vàng chạy theo tiến độ (`useIntro.progress`), đầy thì xanh rồi sang bước sau
 */
export function LearnPad() {
  const learn = useIntro((s) => s.learn)
  const progress = useIntro((s) => s.progress)
  if (learn !== 'look' && learn !== 'move') return null
  return (
    <div
      key={learn}
      className="pointer-events-none fixed right-6 bottom-6 z-[6] flex animate-pop flex-col items-center gap-1.5 select-none max-md:right-3 max-md:bottom-3"
    >
      <div className="font-head text-lg font-extrabold tracking-wide text-ink uppercase [text-shadow:0_2px_4px_#000,0_0_2px_#000]">
        {learn === 'look' ? 'Nhìn xung quanh' : 'Di chuyển'}
      </div>
      <div className="relative grid size-40 place-items-center rounded-full bg-panel/90 shadow-[0_5px_0_rgba(0,0,0,0.4)]">
        <svg viewBox="0 0 160 160" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle
            cx="80"
            cy="80"
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="8"
          />
          <circle
            cx="80"
            cy="80"
            r={R}
            fill="none"
            stroke={progress >= 1 ? 'var(--color-green)' : 'var(--color-yellow)'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={RING}
            strokeDashoffset={RING * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-150"
          />
        </svg>
        {learn === 'look' ? (
          <div className="grid grid-cols-3 place-items-center text-ink">
            <span />
            <ChevronUp className="size-6" strokeWidth={3} />
            <span />
            <ChevronLeft className="size-6" strokeWidth={3} />
            <MouseIcon />
            <ChevronRight className="size-6" strokeWidth={3} />
            <span />
            <ChevronDown className="size-6" strokeWidth={3} />
            <span />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <KeyCap>W</KeyCap>
            <div className="flex gap-1">
              <KeyCap>A</KeyCap>
              <KeyCap>S</KeyCap>
              <KeyCap>D</KeyCap>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** chữ phụ đề hiện dần từng ký tự (phần chưa hiện vẫn chiếm chỗ: dòng chữ không xô lệch lúc đang chạy) */
function Typed({ text }: { text: string }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const id = window.setInterval(
      () => setN((v) => (v >= text.length ? (window.clearInterval(id), v) : v + 1)),
      TYPE_MS,
    )
    return () => window.clearInterval(id)
  }, [text])
  return (
    <>
      {text.slice(0, n)}
      <span className="invisible">{text.slice(n)}</span>
    </>
  )
}

/** Phụ đề chữ to giữa đáy màn (chữ trắng viền đen đậm cho dễ đọc trên mọi nền), chạy chữ dần (lời tự nói khi bấm dấu ? / màn hình máy tính lúc tập đi lại), `say()` trong introStore */
export function IntroCaption() {
  const text = useIntro((s) => s.caption)
  const id = useIntro((s) => s.captionId)
  if (!text) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[2600] px-6 text-center font-head text-4xl leading-tight font-extrabold text-white select-none [-webkit-text-stroke:7px_#141821] [paint-order:stroke_fill] [text-shadow:0_4px_10px_rgba(0,0,0,0.6)] max-md:text-2xl">
      <Typed key={id} text={text} />
    </div>
  )
}
