import { useGame } from '@/store'
import { BIT_LABELS } from '@/data/steps'
import { screwLevel, TOOLS } from '@/data/parts'
import { cn } from '@/lib/format'
import type { ScrewBit } from '@/types'
import { useBenchKey } from './useBenchKey'
import { ToolCard } from './ToolCard'
import { screwBusy, useScrewBusy } from '@/scene/common/screwSpin'

const BITS = Object.keys(BIT_LABELS) as ScrewBit[]
/** phím tắt 1 2 3 4 = đầu vít từ trái qua phải */
const PICK_BIT = BITS.map((b) => () => !screwBusy() && useGame.getState().setScrewBit(b))

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

/** 4 nút đầu vít (to ở bảng giữa, nhỏ khi thu gọn vào cột phải) */
function BitButtons({ small }: { small?: boolean }) {
  const bit = useGame((s) => s.screwBit)
  const swapAt = useGame((s) => s.bitSwapAt)
  const setScrewBit = useGame((s) => s.setScrewBit)
  // đang vặn vít thì không thay đầu
  const busy = useScrewBusy()
  return (
    <div className={cn('flex', small ? 'gap-1' : 'gap-1.5')}>
      {BITS.map((b, i) => (
        <button
          key={b}
          type="button"
          onClick={() => setScrewBit(b)}
          disabled={busy && b !== bit}
          title={
            busy && b !== bit
              ? 'Đang vặn vít, xong mới thay đầu được'
              : b === bit
                ? `Đang lắp đầu ${BIT_LABELS[b]}`
                : `Lắp đầu vít ${BIT_LABELS[b]} (phím ${i + 1})`
          }
          className={cn(
            'relative flex flex-col items-center gap-0.5 rounded-xl border-2 px-1.5 py-1 text-xs font-bold',
            small ? 'flex-1' : 'w-[72px]',
            b === bit
              ? 'border-green bg-green/15 text-[#9fe6b6]'
              : 'border-transparent bg-panel-2 enabled:hover:border-yellow disabled:opacity-50',
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
            className={cn(small ? 'size-6' : 'size-8', b === bit && swapAt > 0 && 'animate-pop')}
          />
          {!small && BIT_LABELS[b]}
        </button>
      ))}
    </div>
  )
}

/** Tua vít đang dùng (ảnh model): đã mua tua vít điện thì 2 ô đổi tay / điện; tua vít trên bàn đổi theo */
function DriverButtons() {
  const owned = useGame((s) => s.tools.screw)
  const level = useGame((s) => screwLevel(s.tools, s.screwPick))
  const setScrewPick = useGame((s) => s.setScrewPick)
  // đang vặn vít thì không đổi tua vít (đổi giữa chừng thì tua vít cũ kẹt lại trên vít)
  const busy = useScrewBusy()
  return (
    <div className="flex gap-1">
      {(owned ? [0, owned] : [0]).map((lv) => (
        <ToolCard
          key={lv}
          kind="screw"
          level={lv}
          label={TOOLS.screw[lv].name}
          active={lv === level}
          onClick={() => setScrewPick(lv)}
          disabled={busy && lv !== level}
          title={
            lv === level
              ? `Đang dùng ${TOOLS.screw[lv].name}`
              : busy
                ? 'Đang vặn vít, xong mới đổi được'
                : `Đổi sang ${TOOLS.screw[lv].name}`
          }
        />
      ))}
    </div>
  )
}

/**
 * Chọn đầu tua vít khi tới bước vặn vít: thẻ cố định đầu cột phải HUD (BenchHud), hiện mặt ốc của bước này để so;
 * chọn đầu khác thì tua vít nằm trên bàn chạy hiệu ứng thay đầu. Phím 1–4 chọn nhanh. Đã mua tua vít điện thì có thêm hàng đổi tay / điện
 */
export function BitPicker({ need }: { need: ScrewBit }) {
  useBenchKey('Digit1', PICK_BIT[0])
  useBenchKey('Digit2', PICK_BIT[1])
  useBenchKey('Digit3', PICK_BIT[2])
  useBenchKey('Digit4', PICK_BIT[3])
  return (
    <div
      // tour lần đầu chọn đầu vít (`BitTour`) chỉ đúng bảng này
      data-tour="bit-picker"
      className="flex shrink-0 flex-col gap-2 rounded-2xl border-[3px] border-black/40 bg-panel/95 px-3 py-2.5 shadow-[0_8px_24px_#0006]"
    >
      <div className="flex items-center gap-2">
        <span className="flex-1 font-head text-base font-extrabold">Đầu vít</span>
        <span className="flex items-center gap-1 text-xs font-bold text-muted">
          Mặt ốc
          <BitIcon bit={need} className="size-6" />
        </span>
      </div>
      <BitButtons small />
      <DriverButtons />
    </div>
  )
}
