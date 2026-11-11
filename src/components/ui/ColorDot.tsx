import { cn } from '@/lib/format'

/**
 * Ô màu tròn bấm chọn (Free build, Shopii): viền vàng khi đang chọn, tên màu ở tooltip.
 * `color` là nền CSS (màu đặc, hoặc chia đôi đặc / nhạt cho màu trong nhuộm `tintSwatch`)
 */
export function ColorDot({
  color,
  name,
  active,
  onClick,
  className,
}: {
  color: string
  name: string
  active: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      title={name}
      aria-label={name}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'size-6 shrink-0 rounded-full border-2 shadow-[0_2px_0_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-px',
        active ? 'border-yellow' : 'border-black/40',
        className,
      )}
      style={{ background: color }}
    />
  )
}
