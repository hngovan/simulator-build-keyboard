import type { ButtonHTMLAttributes } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/format'
import { Button } from './Button'

/** Nút đóng dùng chung: nền đỏ kiểu Button, icon ✕ (lucide) căn giữa */
export function CloseButton({
  className,
  'aria-label': label = 'Đóng',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button
      type="button"
      tone="red"
      aria-label={label}
      title="Đóng"
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-[10px] !p-0 [&_svg]:size-5',
        className,
      )}
      {...props}
    >
      <X strokeWidth={3} />
    </Button>
  )
}
