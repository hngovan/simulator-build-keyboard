import { useEffect, useState, type ReactNode } from 'react'
import { KEYCAP_KITS, KEYCAP_MATERIALS, SHOP_CATS, keycapMaterialOf } from '@/data/parts'
import { PartArt } from '@/components/art/PartArt'
import { SupplyArt, ToolArt } from '@/components/art/ToolArt'
import { cn } from '@/lib/format'
import { CloseButton, ThumbLoading, ViewHint } from '@/components/ui'
import type { KeycapItem, PartCategory, Product, ProductOption } from '@/types'
import { useModelThumb, type ThumbKind } from './modelThumb'
import { productThumb } from './productThumb'
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
  panel,
  subtitle,
  tags,
}: {
  product: Product
  swatch: string
  item?: ProductOption['item']
  className?: string
  /** panel cột phải khung xem 3D (chọn option, thông số, thêm vào giỏ) */
  panel?: ReactNode
  /** dòng phụ cạnh tiêu đề khung xem (option đang chọn) */
  subtitle?: ReactNode
  /** nhãn nổi góc dưới phải ảnh (vd số stab nhận được) */
  tags?: ReactNode
}) {
  // tiêu đề khung xem: "SHOPII · <mục>" cam nhỏ + tên sản phẩm
  const heading = (
    <>
      <span className="mr-2 font-head text-xs font-extrabold tracking-wider text-orange uppercase">
        Shopii · {SHOP_CATS[product.cat]}
      </span>
      {product.name}
    </>
  )
  const zoom = { heading, subtitle, side: panel }
  const frame = cn(
    'relative flex h-[110px] items-center justify-center overflow-hidden rounded-[10px] bg-black/15',
    className,
  )
  const { kind, type, caseItem } = productThumb(product, item)
  const cap = item as KeycapItem | undefined
  const thumb = useModelThumb(kind, type)
  // case: chụp nguyên bàn phím ghép với đúng case + màu đang chọn
  const caseThumb = useCaseThumb(caseItem?.id, caseItem?.color)
  const [viewing, setViewing] = useState(false)
  const profile = product.cat === 'keycap' ? KEYCAP_KITS[cap?.kit ?? 'base']?.profile : null
  // nhãn góc dưới trái (loại switch...), cùng kiểu nhãn profile keycap
  const badge = (
    <>
      {product.badge && (
        <span className="absolute bottom-1 left-1 rounded-md border-2 border-black/40 bg-yellow px-1.5 py-0.5 text-[11px] font-extrabold tracking-wider text-[#3a2b00] shadow-[0_2px_0_#0006]">
          {product.badge}
        </span>
      )}
      {tags && (
        <span className="pointer-events-none absolute top-1 right-1 flex flex-col items-end gap-0.5">
          {tags}
        </span>
      )}
    </>
  )

  if (product.cat === 'keycap')
    return (
      <ImageZoom title={product.name} kind={kind} type={type} {...zoom}>
        <div className={cn(frame, 'relative')}>
          {thumb ? (
            <img src={thumb} alt={product.name} className="h-full w-full object-contain" />
          ) : thumb === undefined ? (
            <ThumbLoading />
          ) : (
            <PartArt category="keycap" color={swatch} />
          )}
          {/* nhãn nổi trên ảnh: profile (vàng) + chất liệu PBT / ABS / Mix (xanh);
              khung hẹp (ảnh bài chợ) không đủ chỗ thì nhãn chất liệu lên dòng trên, không đè nhau */}
          <div className="absolute inset-x-1 bottom-1 flex flex-wrap-reverse items-end justify-between gap-0.5">
            <span
              className="rounded-md border-2 border-black/40 bg-yellow px-1.5 py-0.5 text-[11px] font-extrabold tracking-wider text-[#3a2b00] shadow-[0_2px_0_#0006]"
              title={profile ? `Profile keycap: ${profile.toUpperCase()}` : 'Profile keycap'}
            >
              {profile?.toUpperCase()}
            </span>
            <span
              className="ml-auto rounded-md border-2 border-black/40 bg-blue px-1.5 py-0.5 text-[11px] font-extrabold text-white shadow-[0_2px_0_#0006]"
              title={`Chất liệu keycap: ${KEYCAP_MATERIALS[keycapMaterialOf(cap ?? {})].name}`}
            >
              {/* tên ngắn (PBT / ABS / MIX) để vừa khung nhỏ, tên đủ ở tooltip */}
              {keycapMaterialOf(cap ?? {}).toUpperCase()}
            </span>
          </div>
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
            // rê chuột chỉ hiện kính lúp (ViewHint), không nhô ảnh / đổ bóng
            'group relative w-full',
          )}
        >
          {caseThumb ? (
            <img src={caseThumb} alt={product.name} className="h-full w-full object-contain" />
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
            title={heading}
            subtitle={subtitle}
            side={panel}
          />
        )}
      </>
    )
  // ảnh model 3D đang chụp (lần đầu tải / vừa đổi option): khung loading thay ảnh vẽ tạm.
  // Vẫn bọc ImageZoom (cùng vị trí với các nhánh dưới) để khung xem 3D đang mở không bị gỡ rồi đóng mất khi đổi option
  if (caseItem && caseThumb === undefined)
    return (
      <div className={frame}>
        <ThumbLoading />
      </div>
    )
  if (!caseItem && thumb === undefined)
    return (
      <ImageZoom title={product.name} kind={kind} type={type} {...zoom}>
        <div className={frame}>
          <ThumbLoading />
        </div>
      </ImageZoom>
    )
  if (thumb)
    return (
      <ImageZoom title={product.name} kind={kind} type={type} {...zoom}>
        <div className={frame}>
          <img src={thumb} alt={product.name} className="h-full w-full object-contain" />
          {badge}
        </div>
      </ImageZoom>
    )
  if (product.supply)
    return (
      <ImageZoom title={product.name} kind={kind} type={type} {...zoom}>
        <div className={frame}>
          <SupplyArt id={product.supply} color={swatch} />
        </div>
      </ImageZoom>
    )
  if (product.tool)
    return (
      <ImageZoom title={product.name} kind={kind} type={type} {...zoom}>
        <div className={frame}>
          <ToolArt kind={product.tool.kind} level={product.tool.level} />
        </div>
      </ImageZoom>
    )
  if (isPartCategory(product.cat))
    return (
      <ImageZoom title={product.name} kind={kind} type={type} {...zoom}>
        <div className={frame}>
          <PartArt category={product.cat} color={swatch} />
          {badge}
        </div>
      </ImageZoom>
    )

  return (
    <ImageZoom title={product.name} kind={kind} type={type} {...zoom}>
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
  heading,
  subtitle,
  side,
  children,
}: {
  title: string
  kind: ThumbKind | null
  type?: string
  /** tiêu đề khung xem 3D (mặc định = title) */
  heading?: ReactNode
  subtitle?: ReactNode
  /** panel cột phải khung xem 3D */
  side?: ReactNode
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
          title={heading ?? title}
          subtitle={subtitle}
          onClose={() => setOpen(false)}
          side={side}
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
