import { cn } from '@/lib/format'

const FILLS = {
  loud: 'bg-gradient-to-r from-green to-yellow',
  pitch: 'bg-gradient-to-r from-purple to-[#3dd6ff]',
  over: 'bg-red',
  // 1 màu theo mức (tiến độ đơn)
  red: 'bg-red',
  yellow: 'bg-yellow',
  green: 'bg-green',
} as const

/** Màu tiến độ: mới làm = đỏ, được 1 nửa = vàng, gần xong = xanh */
export const progressTone = (v: number) => (v < 0.34 ? 'red' : v < 0.8 ? 'yellow' : 'green')

interface Props {
  /** 0..1 */
  value: number
  tone?: keyof typeof FILLS
  /** vạch đánh dấu mục tiêu (0..1) */
  target?: number
  className?: string
}

export function ProgressBar({ value, tone = 'loud', target, className }: Props) {
  return (
    <div className={cn('relative h-2.5 overflow-hidden rounded-full bg-black/30', className)}>
      <div
        className={cn('h-full rounded-full', FILLS[tone])}
        style={{ width: `${Math.min(1, value) * 100}%` }}
      />
      {target !== undefined && (
        <div
          className="absolute -inset-y-0.5 -ml-0.5 w-1 bg-yellow shadow-[0_0_0_1px_#000]"
          style={{ left: `${target * 100}%` }}
        />
      )}
    </div>
  )
}
