import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/format'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  swatch?: string
  /** dạng thẻ lớn có tiêu đề + mô tả */
  big?: boolean
  children: ReactNode
}

/** Nút chọn 1 lựa chọn (màu, chất liệu, loại...) */
export function OptionChip({ active, swatch, big, className, children, ...props }: Props) {
  return (
    <button
      // nút kiểu game sim: khối dày có bóng đổ, nhấn lún xuống; đang chọn thì viền + chữ vàng sáng
      className={cn(
        'rounded-md border-2 text-xs font-bold transition-[transform,box-shadow,border-color] duration-100',
        'shadow-[0_3px_0_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]',
        'enabled:hover:-translate-y-px enabled:active:translate-y-0.5 enabled:active:shadow-[0_1px_0_rgba(0,0,0,0.45)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        active
          ? 'border-yellow bg-[#4a3f1a] text-yellow shadow-[0_3px_0_rgba(0,0,0,0.45),0_0_0_2px_rgba(255,204,46,0.25)]'
          : 'border-[#4a5670] bg-[#2b3447] text-ink enabled:hover:border-[#6b7a99]',
        big
          ? 'flex min-w-[150px] flex-1 flex-col items-start px-2.5 py-2 text-left'
          : 'inline-flex items-center gap-1.5 px-2.5 py-1',
        className,
      )}
      {...props}
    >
      {swatch && (
        <i className="size-3 rounded-sm border-2 border-black/40" style={{ background: swatch }} />
      )}
      {children}
    </button>
  )
}
