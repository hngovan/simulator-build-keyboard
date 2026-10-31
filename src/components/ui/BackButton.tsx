import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/format'
import { Button } from './Button'

/**
 * Nút quay lại / đứng dậy (= Esc) dùng chung màn máy tính + bàn build: khối nút kiểu game (cùng bóng đổ với IconButton),
 * chỉ mũi tên dày; tooltip chung mọi màn "Quay lại (Esc)"
 */
export function BackButton({ onClick, className }: { onClick: () => void; className?: string }) {
  const label = 'Quay lại (Esc)'
  return (
    <Button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn('grid size-11 place-items-center !p-0', className)}
    >
      <ChevronLeft className="size-7" strokeWidth={3} />
    </Button>
  )
}
