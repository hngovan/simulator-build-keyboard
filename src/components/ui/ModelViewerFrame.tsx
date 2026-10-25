import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { TitleBar, TitleButton } from './Window'

/**
 * Khung xem model 3D dùng chung (sản phẩm Shopii, case, đơn hàng): phủ toàn màn hình nền mờ,
 * thanh tiêu đề giống cửa sổ app (`TitleBar`, màu `color`) + dòng phụ nhỏ cạnh tiêu đề, chỉ có nút đóng.
 * Esc hoặc bấm nền tối để đóng.
 * children = <Canvas> của cảnh
 */
const VIEWER_COLOR = '#4a5670'

export function ModelViewerFrame({
  title,
  subtitle,
  onClose,
  footer,
  color = VIEWER_COLOR,
  children,
}: {
  title: ReactNode
  subtitle?: ReactNode
  onClose: () => void
  /** dãy nút dưới đáy khung (vd chọn màu ngay trong khung xem) */
  footer?: ReactNode
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
      <div className="flex h-[min(82vh,720px)] w-[min(94vw,1050px)] flex-col overflow-hidden rounded-2xl border-[3px] border-black/40 bg-panel shadow-[0_16px_50px_rgba(0,0,0,0.5)]">
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
        <div className="relative min-h-0 flex-1 bg-[radial-gradient(circle_at_50%_42%,#39445b,#171b24_72%)]">
          {children}
          {footer && (
            <div className="absolute inset-x-0 bottom-3 flex justify-center px-3">
              <div className="flex flex-wrap justify-center gap-1.5 rounded-xl border border-white/15 bg-black/55 p-2 backdrop-blur-sm">
                {footer}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
