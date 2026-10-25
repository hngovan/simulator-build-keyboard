import { useEffect, useState, type ReactNode } from 'react'
import { KEYCAP_KITS, SHOP_CATS, keycapKitSize } from '@/data/parts'
import { SUPPLIES } from '@/data/supplies'
import { PartArt } from '@/components/art/PartArt'
import { SupplyArt, ToolArt } from '@/components/art/ToolArt'
import { cn } from '@/lib/format'
import { CloseButton, ViewHint } from '@/components/ui'
import type {
  CaseItem,
  KeycapItem,
  PartCategory,
  PcbItem,
  PlateItem,
  Product,
  ProductOption,
  StabItem,
  SwitchItem,
  ToolItem,
} from '@/types'
import { useModelThumb, type ThumbKind } from './modelThumb'
import { ShopProductViewer } from './ShopProductViewer'
import { useCaseThumb } from '../messenger/orderThumb'
import { CaseViewer } from '../messenger/OrderViewer'

/**
 * Ảnh sản phẩm: switch / stab / keycap chụp từ model 3D trong game (theo option đang chọn),
 * các món khác dùng ảnh SVG vẽ sẵn. Trong lúc chụp hiện ảnh SVG.
 */
export function ProductImage({
  product,
  swatch,
  item,
  className,
  picker,
}: {
  product: Product
  swatch: string
  item?: ProductOption['item']
  className?: string
  /** dãy nút chọn option (màu...) hiện trong khung xem 3D */
  picker?: ReactNode
}) {
  const frame = cn(
    'relative flex h-[110px] items-center justify-center overflow-hidden rounded-[10px] bg-black/15',
    className,
  )
  const kind: ThumbKind | null =
    product.cat === 'switch' ||
    product.cat === 'stab' ||
    product.cat === 'keycap' ||
    product.cat === 'pcb' ||
    product.cat === 'plate'
      ? product.cat
      : product.cat === 'tool' || product.cat === 'cert'
        ? 'tool'
        : (product.cat === 'supply' || product.cat === 'spell') && product.supply
          ? SUPPLIES[product.supply]?.fit
            ? 'lubeJar'
            : 'supply'
          : null
  // keycap: chụp theo bộ (profile) + màu của option đang chọn
  const cap = item as KeycapItem | undefined
  const pcb = item as PcbItem | undefined
  const plate = item as PlateItem | undefined
  const tool = product.tool ?? (item as ToolItem | undefined)
  const type =
    product.cat === 'keycap'
      ? cap && `${cap.kit}:${cap.color}`
      : product.cat === 'pcb'
        ? pcb && `${pcb.layout}:${pcb.type}`
        : product.cat === 'plate'
          ? plate && `${plate.layout}:${plate.material}`
          : product.cat === 'tool' || product.cat === 'cert'
            ? tool && `${tool.kind}:${tool.level}`
            : product.cat === 'supply' || product.cat === 'spell'
              ? product.supply
              : (item as SwitchItem | StabItem | undefined)?.type
  const thumb = useModelThumb(kind, type)
  // case: chụp nguyên bàn phím ghép với đúng case + màu đang chọn
  const caseItem = product.cat === 'case' ? (item as CaseItem | undefined) : undefined
  const caseThumb = useCaseThumb(caseItem?.id, caseItem?.color)
  const [viewing, setViewing] = useState(false)
  const profile = product.cat === 'keycap' ? KEYCAP_KITS[cap?.kit ?? 'base']?.profile : null
  // nhãn góc dưới trái (loại switch...), cùng kiểu nhãn profile keycap
  const badge = product.badge && (
    <span className="absolute bottom-1 left-1 rounded-md border-2 border-black/40 bg-yellow px-1.5 py-0.5 text-[11px] font-extrabold tracking-wider text-[#3a2b00] shadow-[0_2px_0_#0006]">
      {product.badge}
    </span>
  )

  if (product.cat === 'keycap')
    return (
      <ImageZoom title={product.name} kind={kind} type={type} picker={picker}>
        <div className={cn(frame, 'relative')}>
          {thumb ? (
            <img src={thumb} alt={product.name} className="h-full w-full object-contain" />
          ) : (
            <PartArt category="keycap" color={swatch} />
          )}
          {/* nhãn nổi trên ảnh: profile (vàng) + cỡ bộ Full / Base (xanh) */}
          <span
            className="absolute bottom-1 left-1 rounded-md border-2 border-black/40 bg-yellow px-1.5 py-0.5 text-[11px] font-extrabold tracking-wider text-[#3a2b00] shadow-[0_2px_0_#0006]"
            title={profile ? `Profile keycap: ${profile.toUpperCase()}` : 'Profile keycap'}
          >
            {profile?.toUpperCase()}
          </span>
          <span
            className="absolute right-1 bottom-1 rounded-md border-2 border-black/40 bg-blue px-1.5 py-0.5 text-[11px] font-extrabold text-white shadow-[0_2px_0_#0006]"
            title={`Bộ keycap ${keycapKitSize(KEYCAP_KITS[cap?.kit ?? 'base']?.name ?? '')}`}
          >
            {keycapKitSize(KEYCAP_KITS[cap?.kit ?? 'base']?.name ?? '')}
          </span>
        </div>
      </ImageZoom>
    )

  // đang mở khung xem thì giữ nhánh này cả khi đổi màu (ảnh màu mới chưa chụp xong), không thì khung bị đóng rồi mở lại
  if (caseItem && (caseThumb || viewing))
    return (
      <>
        {/* bấm ảnh case để xem bàn phím 3D như xem đơn */}
        <button
          type="button"
          title="Bấm để xem chi tiết 3D"
          onClick={() => setViewing(true)}
          className={cn(
            frame,
            'group relative w-full shadow-[0_2px_6px_rgba(0,0,0,0.25)] transition-shadow duration-200 hover:shadow-[0_6px_18px_rgba(0,0,0,0.55)]',
          )}
        >
          {caseThumb ? (
            <img
              src={caseThumb}
              alt={product.name}
              className="h-full w-full object-contain transition-transform group-hover:scale-105"
            />
          ) : (
            <span className="animate-bob text-2xl">⌨️</span>
          )}
          <ViewHint />
        </button>
        {viewing && (
          <CaseViewer
            caseId={caseItem.id}
            color={caseItem.color}
            onClose={() => setViewing(false)}
            footer={picker}
          />
        )}
      </>
    )
  if (thumb)
    return (
      <ImageZoom title={product.name} kind={kind} type={type} picker={picker}>
        <div className={frame}>
          <img src={thumb} alt={product.name} className="h-full w-full object-contain" />
          {badge}
        </div>
      </ImageZoom>
    )
  if (product.supply)
    return (
      <ImageZoom title={product.name} kind={kind} type={type} picker={picker}>
        <div className={frame}>
          <SupplyArt id={product.supply} color={swatch} />
        </div>
      </ImageZoom>
    )
  if (product.tool)
    return (
      <ImageZoom title={product.name} kind={kind} type={type} picker={picker}>
        <div className={frame}>
          <ToolArt kind={product.tool.kind} level={product.tool.level} />
        </div>
      </ImageZoom>
    )
  if (isPartCategory(product.cat))
    return (
      <ImageZoom title={product.name} kind={kind} type={type} picker={picker}>
        <div className={frame}>
          <PartArt category={product.cat} color={swatch} />
          {badge}
        </div>
      </ImageZoom>
    )

  return (
    <ImageZoom title={product.name} kind={kind} type={type} picker={picker}>
      <div
        className={cn('flex items-end rounded-[10px] border-2 border-white/15 p-1.5', className)}
        style={{ background: swatch }}
      >
        <span className="rounded-full bg-black/65 px-2 font-head text-xs font-extrabold">
          {SHOP_CATS[product.cat]}
        </span>
      </div>
    </ImageZoom>
  )
}

function ImageZoom({
  title,
  kind,
  type,
  picker,
  children,
}: {
  title: string
  kind: ThumbKind | null
  type?: string
  picker?: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <>
      <button
        type="button"
        aria-label={`Phóng to ảnh ${title}`}
        title="Bấm để xem ảnh lớn"
        onClick={() => setOpen(true)}
        className="group relative block w-full cursor-zoom-in text-left"
      >
        {children}
        <ViewHint />
      </button>
      {open && kind && type ? (
        <ShopProductViewer
          kind={kind}
          type={type}
          title={title}
          onClose={() => setOpen(false)}
          footer={picker}
        />
      ) : open ? (
        <div
          role="presentation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(event) => event.stopPropagation()}
            className="relative flex max-h-[92vh] w-[min(92vw,900px)] flex-col items-center gap-3 rounded-2xl border border-white/15 bg-[#151922] p-5 shadow-2xl"
          >
            <CloseButton
              aria-label="Đóng ảnh"
              className="absolute top-2 right-2"
              onClick={() => setOpen(false)}
            />
            <h2 className="max-w-[80%] truncate pr-4 text-center font-bold text-white">{title}</h2>
            <div className="flex h-[min(72vh,620px)] w-full items-center justify-center [&>div]:!h-full [&>div]:!w-full [&>div]:!max-w-full [&>div>img]:!h-full [&>div>img]:!w-full [&>div>img]:!object-contain [&>div>svg]:!h-full [&>div>svg]:!w-auto">
              {children}
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}

function isPartCategory(category: Product['cat']): category is PartCategory {
  return ['case', 'pcb', 'plate', 'stab', 'switch', 'keycap'].includes(category)
}
