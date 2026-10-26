import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/format'
import { Button, type ButtonTone } from './Button'

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  /** icon (lucide-react) */
  icon: ReactNode
  /** chữ hiện khi rê chuột (tooltip) */
  label: string
  tone?: ButtonTone
}

/**
 * Nút vuông chỉ có icon, rê chuột hiện tooltip. Dùng tooltip chung (`title` → GlobalTooltip vẽ qua portal, sát mép trên thì
 * tự lật xuống dưới) thay vì ô absolute ngay dưới nút: nút nằm trong khung overflow-hidden (bảng chọn đơn) thì tooltip bị cắt mất
 */
export function IconButton({ icon, label, tone, className, ...props }: Props) {
  return (
    <Button
      tone={tone}
      aria-label={label}
      title={label}
      className={cn('grid size-11 place-items-center !p-0 [&_svg]:size-[22px]', className)}
      {...props}
    >
      {icon}
    </Button>
  )
}
