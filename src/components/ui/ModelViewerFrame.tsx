import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Khung xem model 3D dùng chung (sản phẩm Shopii, case, đơn hàng): phủ toàn màn hình nền mờ,
 * tiêu đề + dòng phụ, nút ✕ tròn. Esc hoặc bấm nền tối để đóng.
 * children = <Canvas> của cảnh
 */
export function ModelViewerFrame({
  title,
  subtitle,
  onClose,
  footer,
  children,
}: {
  title: ReactNode
  subtitle?: ReactNode
  onClose: () => void
  /** dãy nút dưới đáy khung (vd chọn màu ngay trong khung xem) */
  footer?: ReactNode
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
      <div className="flex h-[min(82vh,720px)] w-[min(94vw,1050px)] flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#151922] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate font-bold text-white">{title}</h2>
            {subtitle && <div className="truncate text-xs text-white/60">{subtitle}</div>}
          </div>
          <button
            type="button"
            aria-label="Đóng model 3D"
            title="Đóng"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-xl text-white transition-colors hover:bg-white/20"
          >
            ✕
          </button>
        </div>
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
