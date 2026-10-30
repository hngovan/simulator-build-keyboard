import { cn } from '@/lib/format'

/**
 * Ruy băng đỏ "SALE" chéo góc trên phải (mục hàng / thẻ sản phẩm đang sale): tự cắt trong ô góc, cha chỉ cần `relative`
 * (không `overflow-hidden` cho thẻ trong lưới: hàng lưới cao cố định sẽ co thẻ lại); `size` = cạnh ô góc (px), bo góc theo cha qua `className`
 */
export function SaleRibbon({ size = 44, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('pointer-events-none absolute top-0 right-0 z-10 overflow-hidden', className)}
      style={{ width: size, height: size }}
    >
      <span
        className="absolute block rotate-45 bg-gradient-to-b from-[#ff3b3b] to-[#c81818] text-center font-head font-black tracking-wider text-white shadow-[0_2px_3px_rgba(0,0,0,0.45)]"
        style={{
          width: size * 1.6,
          top: size * 0.18,
          right: -size * 0.42,
          fontSize: size * 0.22,
          lineHeight: `${size * 0.3}px`,
        }}
      >
        SALE
      </span>
    </span>
  )
}
