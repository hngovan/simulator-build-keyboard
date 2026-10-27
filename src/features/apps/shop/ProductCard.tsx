import { useState } from 'react'
import { Badge, Button, OptionChip, OptionSelect, QtyInput, SoundBars } from '@/components/ui'
import { stabStock } from '@/data/parts'
import { fmt } from '@/lib/format'
import type { Product, ProductOption, StabItem, SupplyItem, ToolItem } from '@/types'
import { ProductImage } from './ProductImage'
import { useGame } from '@/store'

interface Props {
  product: Product
  onBuy: (product: Product, option: ProductOption, qty: number) => void
}

/** cỡ stab hiện thành nhãn trên ảnh */
const STAB_SIZES = [
  ['short', '2u'],
  ['long', '6.25u'],
  ['long7', '7u'],
] as const
/** món mua nhiều lần được cộng dồn (switch / stab / vật tư / sách phép): có ô số lượng */
const STACKABLE: Product['cat'][] = ['switch', 'stab', 'supply', 'spell']
/** option vật tư gộp nhiều loại (nhãn "loại · số gói") */
const isPack = (o: ProductOption) => 'n' in o.item && o.label.includes(' · ')
/** Thẻ sản phẩm: chọn option (màu / chất liệu / số lượng) rồi mua */
export function ProductCard({ product, onBuy }: Props) {
  const [sel, setSel] = useState(0)
  const [qty, setQty] = useState(1)
  const stackable = STACKABLE.includes(product.cat)
  const opt = product.options[sel] ?? product.options[0]
  // option 2 cấp (case: chất liệu → màu): chỉ hiện các option cùng nhóm đang chọn
  const groups = [...new Set(product.options.flatMap((o) => (o.group ? [o.group] : [])))]
  const shown = product.options
    .map((o, i) => [o, i] as const)
    .filter(([o]) => !groups.length || o.group === opt.group)
  // đổi nhóm: giữ màu đang chọn nếu nhóm mới có, không thì lấy option đầu của nhóm
  const pickGroup = (gi: number) => {
    const g = groups[gi]
    const same = product.options.findIndex((o) => o.group === g && o.label === opt.label)
    setSel(same >= 0 ? same : product.options.findIndex((o) => o.group === g))
  }
  // vật tư gộp (dây O-ring...): mỗi loại nhiều gói (1 / 5 vòng) → khung 3D chỉ chọn màu / loại, gói chọn ở ô đổ xuống
  const kindOf = (o: ProductOption) =>
    isPack(o) ? (o.item as SupplyItem).id : product.cat === 'stab' ? o.label : o
  const chips = shown.filter(([o], k) => shown.findIndex(([x]) => kindOf(x) === kindOf(o)) === k)
  // đổi loại: giữ cỡ gói đang chọn nếu loại mới có
  const pickKind = (o: ProductOption, i: number) => {
    const pack = isPack(opt) ? (opt.item as SupplyItem).n : 0
    const same = shown.find(([x]) => kindOf(x) === kindOf(o) && (x.item as SupplyItem).n === pack)
    setSel(same ? same[1] : i)
  }
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
        // stab: số stab nhận được theo cỡ dây, nổi trên ảnh
        tags={
          product.cat === 'stab' &&
          STAB_SIZES.map(([k, size]) => {
            const n = stabStock(opt.item as StabItem)[k]
            return n ? (
              <Badge key={k} solid tone="blue" className="ml-0">
                {n}× {size}
              </Badge>
            ) : null
          })
        }
        // chọn màu / loại ngay trong khung xem 3D (đồng bộ với lựa chọn trên thẻ)
        picker={
          // khác màu hoặc khác loại; stab luôn hiện (bộ / lẻ 2u / 6.25u / 7u xem được dây dài khác nhau);
          // chỉ khác số lượng (switch 10 / 70 con...) thì không hiện
          (product.cat === 'stab' ||
            new Set(shown.map(([o]) => `${o.swatch}|${(o.item as { type?: string }).type ?? ''}`))
              .size > 1) &&
          chips.map(([o, i]) => (
            <OptionChip
              key={o.label}
              active={kindOf(o) === kindOf(opt)}
              swatch={o.swatch}
              onClick={() => pickKind(o, i)}
            >
              {isPack(o) ? o.label.split(' · ')[0] : o.label}
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
      {/* mọi sản phẩm chọn option bằng ô đổ xuống cho gọn (kèm giá từng option); có nhóm thì chọn nhóm trước */}
      {groups.length > 1 && (
        <OptionSelect
          value={groups.indexOf(opt.group ?? '')}
          onChange={pickGroup}
          options={groups.map((g) => ({
            label: g,
            note: fmt(product.options.find((o) => o.group === g)!.price),
          }))}
        />
      )}
      <OptionSelect
        value={shown.findIndex(([, i]) => i === sel)}
        onChange={(k) => setSel(shown[k][1])}
        options={shown.map(([o]) => ({
          label: o.label,
          swatch: o.swatch,
          note: fmt(o.price),
        }))}
      />
      {stackable && (
        <div className="flex items-center justify-between text-sm font-bold text-muted">
          Số lượng
          <QtyInput value={qty} onChange={setQty} />
        </div>
      )}
      <div className="mt-auto flex items-center justify-between">
        <span className="font-head text-lg font-extrabold text-[#ff8c5a]">
          {fmt(opt.price * (stackable ? qty : 1))}
        </span>
        <Button
          tone="orange"
          size="sm"
          disabled={equipped}
          onClick={() => onBuy(product, opt, stackable ? qty : 1)}
        >
          {equipped ? 'Đang dùng' : canEquip ? 'Dùng máy này' : 'Mua ngay'}
        </Button>
      </div>
    </div>
  )
}
