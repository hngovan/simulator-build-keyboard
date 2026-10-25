import { ZoomIn } from 'lucide-react'
import { cn } from '@/lib/format'

/** Icon kính lúp tròn hiện khi rê chuột lên ảnh bấm được (xem 3D / phóng to), chỉ icon không chữ */
export function ViewHint({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute right-1.5 bottom-1.5 grid size-7 place-items-center rounded-full bg-black/60 text-white opacity-0 shadow-[0_2px_6px_rgba(0,0,0,0.4)] backdrop-blur-sm transition-[opacity,transform] duration-150 group-hover:scale-110 group-hover:opacity-100',
        className,
      )}
    >
      <ZoomIn className="size-4" strokeWidth={2.5} />
    </span>
  )
}
