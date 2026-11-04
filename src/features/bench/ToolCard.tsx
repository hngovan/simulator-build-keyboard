import type { ReactNode } from 'react'
import { ThumbLoading } from '@/components/ui'
import { ToolArt } from '@/components/art/ToolArt'
import { cn } from '@/lib/format'
import { useModelThumb } from '@/features/apps/shop/modelThumb'

/**
 * Ô chọn dụng cụ trên HUD bàn build (tua vít tay / điện, bút hàn / trạm hàn): ảnh model 3D chụp như thẻ Shopii
 * (`useModelThumb('tool', 'kind:level')`) + tên ngắn bên dưới; đang dùng = viền xanh
 */
export function ToolCard({
  kind,
  level,
  label,
  active,
  disabled,
  title,
  onClick,
  note,
}: {
  kind: string
  level: number
  label: ReactNode
  active: boolean
  disabled?: boolean
  title: string
  onClick: () => void
  /** dòng phụ nhỏ dưới tên (giá / đang giao...) */
  note?: ReactNode
}) {
  const thumb = useModelThumb('tool', `${kind}:${level}`)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl border-2 p-1 text-xs font-bold',
        active
          ? 'border-green bg-green/15 text-[#9fe6b6]'
          : 'border-transparent bg-panel-2 enabled:hover:border-yellow disabled:opacity-50',
      )}
    >
      <div className="relative grid h-14 w-full place-items-center overflow-hidden rounded-lg bg-black/15">
        {thumb ? (
          <img
            src={thumb}
            alt=""
            className="absolute inset-0 size-full object-contain"
            draggable={false}
          />
        ) : thumb === undefined ? (
          <ThumbLoading />
        ) : (
          <ToolArt kind={kind} level={level} />
        )}
      </div>
      <span className="truncate">{label}</span>
      {note && <span className="truncate text-[10px] font-semibold text-muted">{note}</span>}
    </button>
  )
}
