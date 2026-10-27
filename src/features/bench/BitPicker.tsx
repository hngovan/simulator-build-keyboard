import { useGame } from '@/store'
import { BIT_LABELS, SCREW_BITS } from '@/data/steps'
import { cn } from '@/lib/format'
import type { ScrewBit, ScrewStep } from '@/types'
import { useBenchKey } from './useBenchKey'

const BITS = Object.keys(BIT_LABELS) as ScrewBit[]
/** phím tắt 1 2 3 4 = đầu vít từ trái qua phải */
const PICK_BIT = BITS.map((b) => () => useGame.getState().setScrewBit(b))

/** Hình mặt đầu vít nhìn từ mũi (cũng là hình rãnh trên đầu ốc) */
function BitIcon({ bit, className }: { bit: ScrewBit; className?: string }) {
  return (
    <svg viewBox="-20 -20 40 40" className={className}>
      <circle r="18" fill="#c9ced6" stroke="#7d8591" strokeWidth="2" />
      {bit === 'phillips' && <path d="M-11 0H11M0 -11V11" stroke="#30343a" strokeWidth="5" />}
      {bit === 'flat' && <path d="M-13 0H13" stroke="#30343a" strokeWidth="5" />}
      {bit === 'hex' && (
        <polygon points="9,0 4.5,7.8 -4.5,7.8 -9,0 -4.5,-7.8 4.5,-7.8" fill="#30343a" />
      )}
      {bit === 'torx' &&
        [0, 60, 120].map((r) => (
          <rect
            key={r}
            x="-11"
            y="-3"
            width="22"
            height="6"
            rx="3"
            fill="#30343a"
            transform={`rotate(${r})`}
          />
        ))}
    </svg>
  )
}

/**
 * Chọn đầu tua vít ở giữa trên màn hình khi tới bước vặn vít.
 * Hiện mặt ốc của bước này để so; chọn đầu khác thì tua vít chạy hiệu ứng thay đầu trên bàn
 */
export function BitPicker({ step }: { step: ScrewStep }) {
  const bit = useGame((s) => s.screwBit)
  const swapAt = useGame((s) => s.bitSwapAt)
  const setScrewBit = useGame((s) => s.setScrewBit)
  const need = SCREW_BITS[step]
  useBenchKey('Digit1', PICK_BIT[0])
  useBenchKey('Digit2', PICK_BIT[1])
  useBenchKey('Digit3', PICK_BIT[2])
  useBenchKey('Digit4', PICK_BIT[3])
  return (
    <div className="fixed top-16 left-1/2 z-[5] flex -translate-x-1/2 items-center gap-3 rounded-2xl border-2 border-line bg-[rgba(14,16,24,0.92)] px-3 py-2 shadow-[0_6px_0_#0006]">
      <div className="flex flex-col items-center gap-0.5 text-xs text-muted">
        Mặt ốc
        <BitIcon bit={need} className="size-9" />
      </div>
      <div className="h-12 w-px bg-line" />
      <div className="flex flex-col gap-1">
        <div className="flex gap-1.5">
          {BITS.map((b, i) => (
            <button
              key={b}
              type="button"
              onClick={() => setScrewBit(b)}
              title={
                b === bit
                  ? `Đang lắp đầu ${BIT_LABELS[b]}`
                  : `Lắp đầu vít ${BIT_LABELS[b]} (phím ${i + 1})`
              }
              className={cn(
                'relative flex w-[72px] flex-col items-center gap-0.5 rounded-xl border-2 px-1.5 py-1 text-xs font-bold',
                b === bit
                  ? 'border-green bg-green/15 text-[#9fe6b6]'
                  : 'border-transparent bg-panel-2 hover:border-yellow',
              )}
            >
              {/* số phím tắt ở góc trái trên */}
              <span className="absolute top-0.5 left-1.5 text-[10px] font-extrabold text-muted">
                {i + 1}
              </span>
              {/* key theo lần thay để icon nảy lên mỗi lần lắp đầu mới */}
              <BitIcon
                key={b === bit ? swapAt : 0}
                bit={b}
                className={cn('size-8', b === bit && swapAt > 0 && 'animate-pop')}
              />
              {BIT_LABELS[b]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
