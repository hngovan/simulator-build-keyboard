import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { TitleBar, TitleButton } from './Window'

/**
 * Khung xem model 3D dùng chung (sản phẩm Shopii, case, đơn hàng): phủ toàn màn hình nền mờ,
 * thanh tiêu đề giống cửa sổ app (`TitleBar`, màu `color`) + dòng phụ nhỏ cạnh tiêu đề, chỉ có nút đóng.
 * Có `side` thì chia 2 cột: cảnh 3D trái, panel thông tin phải (Shopii: tên, chọn option, thông số, giá, thêm vào giỏ).
 * Esc hoặc bấm nền tối để đóng.
 * children = <Canvas> của cảnh (+ lớp nổi như tab góc nhìn)
 */
const VIEWER_COLOR = '#4a5670'

export function ModelViewerFrame({
  title,
  subtitle,
  onClose,
  footer,
  side,
  corner,
  hint = true,
  color = VIEWER_COLOR,
  children,
}: {
  title: ReactNode
  subtitle?: ReactNode
  onClose: () => void
  /** dãy nút dưới đáy khung (vd chọn màu ngay trong khung xem) */
  footer?: ReactNode
  /** panel thông tin cột phải */
  side?: ReactNode
  /** nổi góc trên phải cảnh 3D (vd công tắc "Xem khi lắp đủ") */
  corner?: ReactNode
  /** dòng hướng dẫn chuột dưới đáy cảnh 3D */
  hint?: boolean
  /** màu thanh tiêu đề (mặc định xám xanh như nút thường) */
  color?: string
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[2000] grid animate-fade-in place-items-center bg-black/75 p-4 backdrop-blur-sm"
      onPointerDown={(event) => event.target === event.currentTarget && onClose()}
    >
      {/* role dialog: phím tắt Esc chung (đứng dậy khỏi máy tính) nhường Esc cho khung xem */}
      <div
        role="dialog"
        aria-modal="true"
        className="flex h-[min(82vh,720px)] w-[min(94vw,1100px)] flex-col overflow-hidden rounded-2xl border-[3px] border-black/40 bg-panel shadow-[0_16px_50px_rgba(0,0,0,0.5)]"
      >
        <TitleBar
          color={color}
          title={
            <>
              {title}
              {subtitle && (
                <span className="ml-2 font-sans text-xs font-bold opacity-80">{subtitle}</span>
              )}
            </>
          }
        >
          <TitleButton close aria-label="Đóng model 3D" title="Đóng" onClick={onClose}>
            <X />
          </TitleButton>
        </TitleBar>
        <div className="flex min-h-0 flex-1 max-md:flex-col">
          <div className="relative min-h-0 min-w-0 flex-1 bg-[radial-gradient(circle_at_50%_42%,#39445b,#171b24_72%)] max-md:min-h-[300px]">
            {children}
            {corner && <div className="absolute top-3 right-3 z-10">{corner}</div>}
            {(footer || hint) && (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center gap-2 px-3">
                {footer && (
                  <div className="pointer-events-auto flex flex-wrap justify-center gap-1.5 rounded-xl border border-white/15 bg-black/55 p-2 backdrop-blur-sm">
                    {footer}
                  </div>
                )}
                {hint && (
                  <div className="rounded-lg bg-black/45 px-3 py-1 text-xs font-bold text-ink/75">
                    Kéo để xoay · Cuộn để phóng to · Nhấp đúp để đặt lại
                  </div>
                )}
              </div>
            )}
          </div>
          {side && (
            // panel tự chia vùng cuộn + đáy ghim (ProductPanel), khung chỉ giữ cột cố định
            <aside className="flex min-h-0 w-[340px] shrink-0 flex-col border-l-2 border-black/30 bg-panel max-md:w-auto max-md:border-t-2 max-md:border-l-0">
              {side}
            </aside>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
