import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/format'
import { Button, type ButtonTone } from './Button'

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  /** icon (lucide-react) */
  icon: ReactNode
  /** chữ hiện khi rê chuột (tooltip) */
  label: string
  /** dòng phụ nhỏ trong tooltip (phím tắt, giải thích) */
  hint?: string
  tone?: ButtonTone
}

/** Nút vuông chỉ có icon, rê chuột hiện tooltip bên dưới (thanh menu bàn build) */
export function IconButton({ icon, label, hint, tone, className, ...props }: Props) {
  return (
    <span className="group/tip relative inline-flex">
      <Button
        tone={tone}
        aria-label={label}
        className={cn('grid size-11 place-items-center !p-0 [&_svg]:size-[22px]', className)}
        {...props}
      >
        {icon}
      </Button>
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full left-1/2 z-10 mt-2.5 -translate-x-1/2 translate-y-1 rounded-lg border border-white/10 bg-[#0e1018]/95 px-2.5 py-1.5 text-center text-[13px] font-extrabold whitespace-nowrap text-white opacity-0 shadow-[0_6px_16px_rgba(0,0,0,0.45)] transition-[opacity,transform] duration-150 group-hover/tip:translate-y-0 group-hover/tip:opacity-100"
      >
        {label}
        {hint && <span className="block text-[11px] font-semibold text-muted">{hint}</span>}
      </span>
    </span>
  )
}
