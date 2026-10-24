import type { ReactNode } from 'react'
import { cn } from '@/lib/format'

/** Bong bóng chat: in = khách, out = shop; wide = bong bóng rộng (bảng yêu cầu) */
export function ChatBubble({
  from,
  wide,
  children,
}: {
  from: 'in' | 'out'
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'animate-fade-in rounded-2xl px-3 py-2 leading-snug shadow-[0_2px_0_rgba(0,0,0,0.2)]',
        wide ? 'w-[92%]' : 'max-w-[78%]',
        from === 'in' ? 'self-start rounded-bl-md bg-panel-2' : 'self-end rounded-br-md bg-purple',
      )}
    >
      {children}
    </div>
  )
}
