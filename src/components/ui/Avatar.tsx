import type { ReactNode } from 'react'
import { cn } from '@/lib/format'

/** Ảnh đại diện tròn (emoji hoặc chữ cái đầu) */
export function Avatar({ children, small }: { children: ReactNode; small?: boolean }) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full',
        small ? 'size-9 bg-blue text-base font-extrabold' : 'size-11 bg-panel-2 text-2xl',
      )}
    >
      {children}
    </span>
  )
}
