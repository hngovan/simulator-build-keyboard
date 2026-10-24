import { cn } from '@/lib/format'

interface Props {
  loud: number
  pitch: number
  /** [độ ồn, cao độ] khách mong muốn */
  target?: [number, number]
  /** md: máy đo ở bàn build (to hơn, có tên thanh) */
  size?: 'sm' | 'md'
}

const pct = (v: number) => `${Math.min(1, Math.max(0, v)) * 100}%`

/** 1 màu theo độ lệch so với âm khách muốn: sát = xanh, hơi lệch = vàng, lệch xa = đỏ */
const fillOf = (value: number, target?: number) => {
  if (target === undefined) return 'bg-blue'
  const d = Math.abs(value - target)
  return d < 0.1 ? 'bg-green' : d < 0.25 ? 'bg-yellow' : 'bg-red'
}

/** 1 thanh đo 1 màu; vạch trắng = âm khách muốn */
function Meter({
  title,
  left,
  right,
  value,
  target,
  size,
}: {
  title: string
  left: string
  right: string
  value: number
  target?: number
  size: 'sm' | 'md'
}) {
  const md = size === 'md'
  return (
    <div className="flex flex-col gap-0.5">
      {md && (
        <div className="text-[11px] font-extrabold tracking-wide text-muted uppercase">{title}</div>
      )}
      <div className={cn('relative rounded-full bg-black/30', md ? 'h-3' : 'h-2.5')}>
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-300',
            fillOf(value, target),
          )}
          style={{ width: pct(value) }}
        />
        {target !== undefined && (
          <div
            className="absolute -inset-y-1 w-[3px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_1px_#0009]"
            style={{ left: pct(target) }}
          />
        )}
      </div>
      <div className={cn('flex justify-between text-muted', md ? 'text-xs' : 'text-[10px]')}>
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  )
}

/** 2 thanh mô tả âm thanh: êm ↔ ồn, trầm ↔ giòn */
export function SoundBars({ loud, pitch, target, size = 'sm' }: Props) {
  return (
    <div className={cn('my-1 flex flex-col', size === 'md' ? 'gap-2' : 'gap-1')}>
      <Meter title="Độ ồn" left="Êm" right="Ồn" value={loud} target={target?.[0]} size={size} />
      <Meter
        title="Cao độ"
        left="Trầm"
        right="Giòn"
        value={pitch}
        target={target?.[1]}
        size={size}
      />
    </div>
  )
}
