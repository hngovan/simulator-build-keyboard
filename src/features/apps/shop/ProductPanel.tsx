import type { ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { Badge, ColorDot, OptionChip, QtyInput, SoundBars, Tooltip } from '@/components/ui'
import { fmt } from '@/lib/format'
import { useGame } from '@/store'
import type { Product, ProductOption } from '@/types'
import { productSpecs, productTags } from './productSpecs'

type Opt = readonly [ProductOption, number]

/**
 * Panel cột phải khung xem 3D sản phẩm Shopii (dùng chung state với thẻ sản phẩm): tên + nhãn, chọn chất liệu (chip) rồi
 * màu / loại (ô màu tròn, tên ở tooltip), gói (vật tư nhiều cỡ gói), âm thanh, bảng thông số; mô tả ở icon ! cạnh tên; đáy: số lượng, giá, nút mua
 */
export function ProductPanel({
  product,
  opt,
  groups,
  onGroup,
  tiles,
  tileActive,
  onTile,
  tileLabel,
  packs,
  onPack,
  qty,
  onQty,
  total,
  action,
}: {
  product: Product
  opt: ProductOption
  /** nhóm option cấp 1 (chất liệu); < 2 nhóm thì không hiện hàng chip */
  groups: string[]
  onGroup: (gi: number) => void
  /** ô chọn màu / loại trong nhóm đang chọn */
  tiles: Opt[]
  tileActive: (o: ProductOption) => boolean
  onTile: (o: ProductOption, i: number) => void
  tileLabel: (o: ProductOption) => string
  /** cỡ gói cùng loại (vật tư gộp), < 2 thì không hiện */
  packs: Opt[]
  onPack: (i: number) => void
  /** món cộng dồn (switch / stab / vật tư): có ô số lượng */
  qty: number | null
  onQty: (n: number) => void
  total: number
  /** nút mua / dùng máy này */
  action: ReactNode
}) {
  // Free build: mọi món miễn phí
  const free = useGame((s) => s.free)
  const specs = productSpecs(product, opt)
  const tags = productTags(product, opt)
  const multiTile = tiles.length > 1
  // cùng 1 màu (chỉ khác số lượng / cỡ) thì chip chữ, khác màu mới ô màu to
  const swatches = new Set(tiles.map(([o]) => o.swatch)).size > 1
  return (
    <>
      {/* nội dung cuộn riêng, phần mua ghim đáy panel */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start gap-2">
            <h2 className="min-w-0 flex-1 font-head text-2xl leading-tight font-extrabold">
              {product.name}
            </h2>
            {product.sale && (
              <Badge solid tone="red" className="mt-1 ml-0 shrink-0">
                −{product.sale}%
              </Badge>
            )}
            {/* mô tả (chất liệu / profile...): icon ! góc phải, rê xem tooltip nhiều dòng */}
            <Tooltip wide content={opt.hint ?? product.desc}>
              <span
                aria-label={`Mô tả ${product.name}`}
                className="mt-1 shrink-0 cursor-help text-muted hover:text-ink"
              >
                <CircleAlert className="size-5" />
              </span>
            </Tooltip>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Badge key={t} solid className="ml-0">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {groups.length > 1 && (
          <Section title={`Chất liệu · ${opt.group}`}>
            <div className="flex flex-wrap gap-1.5">
              {groups.map((g, gi) => (
                <OptionChip key={g} active={g === opt.group} onClick={() => onGroup(gi)}>
                  {g}
                </OptionChip>
              ))}
            </div>
          </Section>
        )}

        {multiTile && !swatches && (
          <Section title={`Lựa chọn · ${tileLabel(opt)}`}>
            <div className="flex flex-wrap gap-1.5">
              {tiles.map(([o, i]) => (
                <OptionChip
                  key={`${o.group ?? ''}:${o.label}`}
                  active={tileActive(o)}
                  onClick={() => onTile(o, i)}
                >
                  {tileLabel(o)}
                </OptionChip>
              ))}
            </div>
          </Section>
        )}

        {multiTile && swatches && (
          <Section title={`${groups.length > 1 ? 'Màu' : 'Lựa chọn'} · ${tileLabel(opt)}`}>
            {/* ô màu tròn như Free build, tên màu ở tooltip + tiêu đề mục */}
            <div className="flex flex-wrap gap-2">
              {tiles.map(([o, i]) => (
                <ColorDot
                  key={`${o.group ?? ''}:${o.label}`}
                  color={o.swatch ?? '#888'}
                  name={tileLabel(o)}
                  active={tileActive(o)}
                  onClick={() => onTile(o, i)}
                  className="size-8"
                />
              ))}
            </div>
          </Section>
        )}

        {packs.length > 1 && (
          <Section title="Cỡ gói">
            <div className="flex flex-wrap gap-1.5">
              {packs.map(([o, i]) => (
                <OptionChip key={o.label} active={o === opt} onClick={() => onPack(i)}>
                  {o.label.split(' · ')[1] ?? o.label}
                </OptionChip>
              ))}
            </div>
          </Section>
        )}

        {product.sound && (
          <Section title="Âm thanh">
            <SoundBars {...product.sound} />
          </Section>
        )}

        {specs.length > 0 && (
          <div className="flex flex-col rounded-xl bg-black/20 px-3 py-1">
            {specs.map(([k, v]) => (
              <div
                key={k}
                className="flex items-baseline justify-between gap-3 border-b border-white/5 py-1.5 text-sm last:border-0"
              >
                <span className="shrink-0 text-muted">{k}</span>
                <span className="min-w-0 text-right font-bold">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-2 border-t-2 border-black/30 bg-black/10 p-4">
        {qty !== null && (
          <div className="flex items-center justify-between text-sm font-bold text-muted">
            Số lượng
            <QtyInput value={qty} onChange={onQty} />
          </div>
        )}
        <div className="flex items-end justify-between gap-2">
          <span className="text-sm font-bold text-muted">Giá</span>
          <span className="flex items-baseline gap-1.5">
            {!free && opt.was !== undefined && (
              <s className="text-sm font-bold text-muted">{fmt(opt.was * (qty ?? 1))}</s>
            )}
            <span className="font-head text-3xl leading-none font-extrabold text-green">
              {free ? 'Miễn phí' : fmt(total)}
            </span>
          </span>
        </div>
        {action}
      </div>
    </>
  )
}

/** Tiêu đề nhỏ in hoa + nội dung */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-xs font-extrabold tracking-wider text-muted uppercase">{title}</div>
      {children}
    </div>
  )
}
