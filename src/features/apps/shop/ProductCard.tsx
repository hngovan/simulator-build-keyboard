import { useState } from 'react'
import { Button, OptionChip, SoundBars } from '@/components/ui'
import { fmt } from '@/lib/format'
import type { Product, ProductOption } from '@/types'
import { ProductImage } from './ProductImage'

interface Props {
  product: Product
  onBuy: (product: Product, option: ProductOption) => void
}

/** Thẻ sản phẩm: chọn option (màu / chất liệu / số lượng) rồi mua */
export function ProductCard({ product, onBuy }: Props) {
  const [sel, setSel] = useState(0)
  const opt = product.options[sel]
  return (
    <div className="flex flex-col gap-1.5 rounded-[14px] border-2 border-transparent bg-panel-2 p-2.5 hover:border-orange">
      <ProductImage product={product} swatch={opt.swatch} className="h-[70px]" />
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1 truncate font-extrabold" title={product.name}>
          {product.name}
        </div>
        <div className="group/info relative shrink-0">
          <button
            className="grid size-5 place-items-center rounded-full bg-white/10 text-xs font-extrabold text-muted hover:bg-orange hover:text-black focus:bg-orange focus:text-black"
            aria-label={`Xem mô tả ${product.name}`}
            aria-describedby={`desc-${product.id}`}
          >
            i
          </button>
          <div
            id={`desc-${product.id}`}
            role="tooltip"
            className="pointer-events-none absolute top-full right-0 z-20 mt-1 w-52 rounded-lg border border-white/15 bg-[#101522] px-2.5 py-2 text-xs leading-relaxed text-white opacity-0 shadow-xl transition-opacity group-focus-within/info:opacity-100 group-hover/info:opacity-100"
          >
            {opt.hint ?? product.desc}
          </div>
        </div>
      </div>
      {product.sound && <SoundBars {...product.sound} />}
      <div className="flex flex-wrap gap-1">
        {product.options.map((o, i) => (
          <OptionChip
            key={i}
            active={i === sel}
            swatch={o.swatch}
            title={o.hint}
            onClick={() => setSel(i)}
          >
            {o.label}
          </OptionChip>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between">
        <span className="font-head text-lg font-extrabold text-[#ff8c5a]">{fmt(opt.price)}</span>
        <Button tone="orange" size="sm" onClick={() => onBuy(product, opt)}>
          Mua ngay
        </Button>
      </div>
    </div>
  )
}
