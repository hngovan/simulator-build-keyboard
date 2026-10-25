import type { CSSProperties } from 'react'
import { cn } from '@/lib/format'

interface Props {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
  'aria-label'?: string
  title?: string
}

/** Thanh kéo kiểu game (âm lượng...): rãnh dày lõm, phần đã kéo màu cam, núm có bóng đổ như Button */
export function Slider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.05,
  className,
  ...props
}: Props) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ '--fill': `${((value - min) / (max - min)) * 100}%` } as CSSProperties}
      className={cn(
        'my-1 block h-5 w-full cursor-pointer appearance-none bg-transparent',
        // rãnh (Chrome / Firefox)
        '[&::-webkit-slider-runnable-track]:h-2.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--color-orange)_var(--fill),#ffffff_var(--fill))] [&::-webkit-slider-runnable-track]:shadow-[inset_0_2px_0_rgba(0,0,0,0.25)]',
        '[&::-moz-range-track]:h-2.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-[linear-gradient(to_right,var(--color-orange)_var(--fill),#ffffff_var(--fill))] [&::-moz-range-track]:shadow-[inset_0_2px_0_rgba(0,0,0,0.25)]',
        // núm
        '[&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-md [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-orange [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_2px_0_rgba(0,0,0,0.4),inset_0_-2px_0_rgba(0,0,0,0.18)] [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:-translate-y-0.5',
        '[&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-md [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-orange [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_2px_0_rgba(0,0,0,0.4),inset_0_-2px_0_rgba(0,0,0,0.18)]',
        className,
      )}
      {...props}
    />
  )
}
