import { useState } from 'react'
import { Button, OptionChip, SoundBars } from '@/components/ui'
import { fmt } from '@/lib/format'
import type { Product, ProductOption, ToolItem } from '@/types'
import { ProductImage } from './ProductImage'
import { useGame } from '@/store'

interface Props {
  product: Product
  onBuy: (product: Product, option: ProductOption) => void
}

/** Thẻ sản phẩm: chọn option (màu / chất liệu / số lượng) rồi mua */
export function ProductCard({ product, onBuy }: Props) {
  const [sel, setSel] = useState(0)
  const opt = product.options[sel]
  const tools = useGame((s) => s.tools)
  const owned = useGame((s) => s.solderOwned)
  const solderItem =
    product.cat === 'tool' && (opt.item as ToolItem).kind === 'solder'
      ? (opt.item as ToolItem)
      : null
  const equipped = !!solderItem && tools.solder === solderItem.level
  const canEquip = !!solderItem && owned[solderItem.level] !== undefined
  return (
    <div className="flex flex-col gap-1.5 rounded-[14px] border-2 border-transparent bg-panel-2 p-2.5 hover:border-orange">
      <ProductImage
        product={product}
        swatch={opt.swatch}
        item={opt.item}
        className="h-[110px]"
        // chọn màu / loại ngay trong khung xem 3D (đồng bộ với lựa chọn trên thẻ)
        picker={
          // khác màu hoặc khác loại (vd stab Cherry clip-in / screw-in / plate-mount cùng màu); chỉ khác số lượng thì không hiện
          new Set(
            product.options.map((o) => `${o.swatch}|${(o.item as { type?: string }).type ?? ''}`),
          ).size > 1 &&
          product.options.map((o, i) => (
            <OptionChip
              key={o.label}
              active={i === sel}
              swatch={o.swatch}
              onClick={() => setSel(i)}
            >
              {o.label}
            </OptionChip>
          ))
        }
      />
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1 truncate font-extrabold" title={product.name}>
          {product.name}
        </div>
        <div className="group/info relative shrink-0">
          <button
            className="grid size-5 place-items-center rounded-full bg-white/10 text-xs font-extrabold text-muted hover:bg-orange hover:text-black focus:bg-orange focus:text-black"
            aria-label={`Xem mô tả ${product.name}`}
            aria-describedby={`desc-${product.id}`}
            title={`Xem mô tả ${product.name}`}
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
          <OptionChip key={i} active={i === sel} swatch={o.swatch} onClick={() => setSel(i)}>
            {o.label}
          </OptionChip>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between">
        <span className="font-head text-lg font-extrabold text-[#ff8c5a]">{fmt(opt.price)}</span>
        <Button tone="orange" size="sm" disabled={equipped} onClick={() => onBuy(product, opt)}>
          {equipped ? 'Đang dùng' : canEquip ? 'Dùng máy này' : 'Mua ngay'}
        </Button>
      </div>
    </div>
  )
}
