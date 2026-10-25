import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { cn } from '@/lib/format'

// Emote ếch xanh (Pepe, FrankerFaceZ, `bun run fetch:emotes`) thay cho emoji trong tin nhắn
const EMOTE_OF: Record<string, string> = {
  '👌': 'FeelsOkayMan',
  '👍': 'FeelsGoodMan',
  '🙏': 'Prayge',
  '😒': 'peepoMad',
  '😤': 'peepoMad',
  '😡': 'peepoMad',
  '😕': 'Sadge',
  '🥲': 'Sadge',
  '😮‍💨': 'peepoSad',
  '😢': 'peepoSad',
  '📦': 'peepoHappy',
  '😊': 'peepoHappy',
  '🎉': 'FeelsGoodMan',
  '🛵': 'peepoRun',
  '🚚': 'peepoRun',
  '😍': 'peepoLove',
  '❤️': 'peepoLove',
  '😂': 'pepeLaugh',
  '🤣': 'pepeLaugh',
  '😨': 'monkaS',
  '😰': 'monkaS',
}
// emoji dài (có ký tự nối) đứng trước để khớp trọn
const RE = new RegExp(
  `(${Object.keys(EMOTE_OF)
    .sort((a, b) => b.length - a.length)
    .join('|')})`,
  'gu',
)

/** Ảnh emote nằm cùng dòng chữ */
export function Emote({ name, className }: { name: string; className?: string }) {
  return (
    <img
      src={`/emotes/${name}.png`}
      alt={name}
      title={name}
      draggable={false}
      className={cn('inline-block h-[1.7em] w-auto align-middle', className)}
    />
  )
}

/** Thay emoji trong chuỗi / cây phần tử (giữ nguyên <b>, Highlight...) bằng emote ếch */
export function withEmotes(node: ReactNode, className?: string): ReactNode {
  if (typeof node === 'string') {
    const parts = node.split(RE)
    if (parts.length === 1) return node
    return parts.map((p, i) =>
      EMOTE_OF[p] ? <Emote key={i} name={EMOTE_OF[p]} className={className} /> : p,
    )
  }
  if (Array.isArray(node)) return Children.map(node, (c) => withEmotes(c, className))
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>
    if (el.props.children === undefined) return el
    return cloneElement(el, undefined, withEmotes(el.props.children, className))
  }
  return node
}
