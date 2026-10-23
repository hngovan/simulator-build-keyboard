import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/format'

const TONES = {
  default: 'bg-[#4a5670] text-white',
  green: 'bg-green text-[#0d2a17]',
  yellow: 'bg-yellow text-[#3a2b00]',
  red: 'bg-red text-white',
  blue: 'bg-blue text-white',
  orange: 'bg-orange text-white',
} as const

const SIZES = {
  sm: 'px-3 py-1 text-[13px] rounded-[10px]',
  md: 'px-4 py-2 text-[15px] rounded-xl',
  lg: 'px-7 py-3 text-xl rounded-2xl',
} as const

export type ButtonTone = keyof typeof TONES

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone
  size?: keyof typeof SIZES
  wide?: boolean
}

// Nút kiểu game: dày, có bóng đổ phía dưới, nhấn thì lún xuống
export function Button({ tone = 'default', size = 'md', wide, className, ...props }: Props) {
  return (
    <button
      className={cn(
        'font-head font-extrabold transition-[transform,filter] duration-75',
        'shadow-[0_4px_0_rgba(0,0,0,0.35),inset_0_2px_0_rgba(255,255,255,0.25)]',
        'enabled:hover:brightness-110 enabled:active:translate-y-[3px] enabled:active:shadow-[0_1px_0_rgba(0,0,0,0.35)]',
        'disabled:opacity-45',
        TONES[tone],
        SIZES[size],
        wide && 'mt-2.5 w-full',
        className,
      )}
      {...props}
    />
  )
}
