import type { ReactNode } from 'react'
import { cn } from '@/lib/format'

/** Bong bóng chat: in = khách, out = shop */
export function ChatBubble({ from, children }: { from: 'in' | 'out'; children: ReactNode }) {
  return (
    <div
      className={cn(
        'max-w-[85%] rounded-2xl px-3 py-2 leading-snug',
        from === 'in' ? 'rounded-bl bg-panel-2' : 'self-end rounded-br bg-purple',
      )}
    >
      {children}
    </div>
  )
}
