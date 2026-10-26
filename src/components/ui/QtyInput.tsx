import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/format'
import { Button } from './Button'

interface Props {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  className?: string
}

/** Ô số lượng: nút − / + kiểu game, ở giữa gõ số trực tiếp (kẹp trong min..max) */
export function QtyInput({ value, onChange, min = 1, max = 99, className }: Props) {
  const set = (n: number) => onChange(Math.min(max, Math.max(min, Math.floor(n) || min)))
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        size="sm"
        aria-label="Giảm số lượng"
        disabled={value <= min}
        className="grid size-7 place-items-center !p-0 [&_svg]:size-4"
        onClick={() => set(value - 1)}
      >
        <Minus />
      </Button>
      <input
        type="text"
        inputMode="numeric"
        aria-label="Số lượng"
        value={value}
        onChange={(e) => set(Number(e.target.value.replace(/\D/g, '')))}
        onFocus={(e) => e.target.select()}
        className="h-7 w-10 rounded-lg border-2 border-white/15 bg-black/25 text-center font-head text-sm font-extrabold outline-none focus:border-orange"
      />
      <Button
        size="sm"
        aria-label="Tăng số lượng"
        disabled={value >= max}
        className="grid size-7 place-items-center !p-0 [&_svg]:size-4"
        onClick={() => set(value + 1)}
      >
        <Plus />
      </Button>
    </div>
  )
}
