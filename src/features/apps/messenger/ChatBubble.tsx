import type { ReactNode } from 'react'
import { cn } from '@/lib/format'
import { withEmotes } from './emotes'

/** Bong bóng chat: in = khách, out = shop; wide = bong bóng rộng (bảng yêu cầu); emoji → emote ếch */
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
        'animate-fade-in rounded-xl px-3 py-2 leading-snug',
        wide ? 'w-[92%]' : 'max-w-[78%]',
        from === 'in' ? 'self-start rounded-bl-sm bg-panel-2' : 'self-end rounded-br-sm bg-purple',
      )}
    >
      {withEmotes(children)}
    </div>
  )
}
