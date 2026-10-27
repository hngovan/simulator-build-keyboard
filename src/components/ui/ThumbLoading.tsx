import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/format'

/** Khung chờ ảnh model 3D đang chụp (lần đầu tải tài nguyên): nền nhấp nháy + vòng xoay, thay cho ảnh vẽ tạm */
export function ThumbLoading({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Đang tải ảnh"
      className={cn(
        'grid size-full animate-pulse place-items-center rounded-lg bg-white/5',
        className,
      )}
    >
      <LoaderCircle className="size-7 animate-spin text-muted" />
    </div>
  )
}
