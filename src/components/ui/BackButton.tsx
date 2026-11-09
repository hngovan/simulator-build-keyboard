import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/format'
import { Button } from './Button'

/**
 * Nút quay lại / đứng dậy dùng chung màn máy tính + bàn build: khối nút kiểu game (cùng bóng đổ với IconButton),
 * chỉ mũi tên dày; tooltip chung mọi màn "Quay lại" (Esc giờ mở Cài đặt, rời màn phải bấm nút này)
 */
export function BackButton({
  onClick,
  className,
  tour,
}: {
  onClick: () => void
  className?: string
  /** nhãn cho tour hướng dẫn (`data-tour`) */
  tour?: string
}) {
  const label = 'Quay lại'
  return (
    <Button
      onClick={onClick}
      title={label}
      aria-label={label}
      data-tour={tour}
      className={cn('grid size-11 place-items-center !p-0', className)}
    >
      <ChevronLeft className="size-7" strokeWidth={3} />
    </Button>
  )
}
