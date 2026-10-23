import { SHOP_CATS } from '@/data/parts'
import { PartArt } from '@/components/art/PartArt'
import { SupplyArt, ToolArt } from '@/components/art/ToolArt'
import { cn } from '@/lib/format'
import type { PartCategory, Product } from '@/types'

/** Ảnh SVG riêng cho từng loại sản phẩm, không cần tải asset ngoài. */
export function ProductImage({
  product,
  swatch,
  className,
}: {
  product: Product
  swatch: string
  className?: string
}) {
  const frame = cn(
    'flex h-[70px] items-center justify-center overflow-hidden rounded-[10px] bg-black/15',
    className,
  )

  if (product.supply)
    return (
      <div className={frame}>
        <SupplyArt id={product.supply} color={swatch} />
      </div>
    )
  if (product.tool)
    return (
      <div className={frame}>
        <ToolArt kind={product.tool.kind} level={product.tool.level} />
      </div>
    )
  if (isPartCategory(product.cat))
    return (
      <div className={frame}>
        <PartArt category={product.cat} color={swatch} />
      </div>
    )

  return (
    <div
      className={cn('flex items-end rounded-[10px] border-2 border-white/15 p-1.5', className)}
      style={{ background: swatch }}
    >
      <span className="rounded-full bg-black/65 px-2 font-head text-xs font-extrabold">
        {SHOP_CATS[product.cat]}
      </span>
    </div>
  )
}

function isPartCategory(category: Product['cat']): category is PartCategory {
  return ['case', 'pcb', 'plate', 'stab', 'switch', 'keycap'].includes(category)
}
