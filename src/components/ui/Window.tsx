import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { Copy, Minus, Square, X } from 'lucide-react'
import { cn } from '@/lib/format'
import { useNarrow } from '@/hooks/useNarrow'
import { pcFrame } from '@/scene/models/computerLayout'

/** Nút trên thanh tiêu đề (thu nhỏ / phóng to / đóng) cùng 1 kiểu, icon căn giữa; nút đóng rê chuột thì đỏ */
export function TitleButton({
  close,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { close?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'grid size-[30px] place-items-center rounded-[9px] bg-black/25 [&_svg]:size-4 [&_svg]:stroke-[3]',
        close ? 'hover:bg-red' : 'hover:bg-black/40',
        className,
      )}
      onPointerDown={(e) => e.stopPropagation()}
      {...props}
    />
  )
}

/** Thanh tiêu đề cửa sổ app (màu theo app); `children` = các nút bên phải */
export function TitleBar({
  title,
  color,
  className,
  children,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, 'title'> & { title: ReactNode; color: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between py-1.5 pr-2 pl-3.5 font-head text-[17px] font-extrabold [text-shadow:0_2px_0_#0004]',
        className,
      )}
      style={{ background: color }}
      {...props}
    >
      <span className="min-w-0 truncate">{title}</span>
      <div className="flex shrink-0 gap-1">{children}</div>
    </div>
  )
}

interface Props {
  title: ReactNode
  /** màu thanh tiêu đề */
  color: string
  width: number
  zIndex: number
  initial: { x: number; y: number }
  minimized: boolean
  onFocus: () => void
  onMinimize: () => void
  onClose: () => void
  children: ReactNode
}

const TASKBAR_HEIGHT = 58
const VIEWPORT_GAP = 8
const MIN_VISIBLE_HEIGHT = 160

/** cỡ khung desktop (màn hình máy tính trong phòng, không phải cả cửa sổ trình duyệt) */
const screenSize = () => pcFrame(window.innerWidth, window.innerHeight)

function clampPosition(pos: { x: number; y: number }, width: number) {
  const { w, h } = screenSize()
  const maxX = Math.max(VIEWPORT_GAP, w - width - VIEWPORT_GAP)
  const maxY = Math.max(VIEWPORT_GAP, h - TASKBAR_HEIGHT - MIN_VISIBLE_HEIGHT - VIEWPORT_GAP)

  return {
    x: Math.min(Math.max(VIEWPORT_GAP, pos.x), maxX),
    y: Math.min(Math.max(VIEWPORT_GAP, pos.y), maxY),
  }
}

/** Cửa sổ kéo thả được của "máy tính trong game" */
export function Window({
  title,
  color,
  width,
  zIndex,
  initial,
  minimized,
  onFocus,
  onMinimize,
  onClose,
  children,
}: Props) {
  const [pos, setPos] = useState(initial)
  const [maximized, setMaximized] = useState(false)
  // điện thoại: cửa sổ luôn phủ kín màn (trừ taskbar), không kéo / phóng to
  const narrow = useNarrow()
  const full = maximized || narrow
  const drag = useRef<{ dx: number; dy: number } | null>(null)

  useEffect(() => {
    const constrainToViewport = () => setPos((current) => clampPosition(current, width))
    window.addEventListener('resize', constrainToViewport)
    return () => window.removeEventListener('resize', constrainToViewport)
  }, [width])

  const maxHeight = Math.max(
    MIN_VISIBLE_HEIGHT,
    screenSize().h - pos.y - TASKBAR_HEIGHT - VIEWPORT_GAP,
  )

  return (
    <div
      className={cn(
        'absolute flex flex-col overflow-hidden bg-panel shadow-[0_16px_50px_rgba(0,0,0,0.5)]',
        full
          ? 'max-w-none rounded-none border-0'
          : 'max-w-[calc(100%-16px)] rounded-2xl border-[3px] border-black/40',
      )}
      style={
        full
          ? {
              // phủ kín màn nhưng chừa taskbar (cao theo biến CSS --taskbar-h, mobile 2 hàng)
              inset: 0,
              bottom: 'var(--taskbar-h)',
              zIndex,
              display: minimized ? 'none' : undefined,
            }
          : {
              left: pos.x,
              top: pos.y,
              width,
              maxHeight,
              // app có khung cao cố định (Shopii) co theo chiều cao tối đa cửa sổ, không tràn rồi cuộn cả app
              ['--win-max-h' as string]: `${maxHeight}px`,
              zIndex,
              display: minimized ? 'none' : undefined,
            }
      }
      onPointerDown={onFocus}
    >
      <TitleBar
        title={title}
        color={color}
        className={full ? undefined : 'cursor-grab'}
        onPointerDown={(e) => {
          if (full) return
          drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (drag.current)
            setPos(
              clampPosition(
                { x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy },
                width,
              ),
            )
        }}
        onPointerUp={() => (drag.current = null)}
      >
        <TitleButton aria-label="Thu nhỏ cửa sổ xuống taskbar" title="Thu nhỏ" onClick={onMinimize}>
          <Minus />
        </TitleButton>
        {!narrow && (
          <TitleButton
            aria-label={maximized ? 'Khôi phục kích thước cửa sổ' : 'Phóng to cửa sổ'}
            title={maximized ? 'Khôi phục' : 'Phóng to'}
            onClick={() => setMaximized((current) => !current)}
          >
            {maximized ? <Copy /> : <Square />}
          </TitleButton>
        )}
        <TitleButton close aria-label="Đóng cửa sổ" title="Đóng" onClick={onClose}>
          <X />
        </TitleButton>
      </TitleBar>
      {/* @container: app tự đổi bố cục theo bề rộng cửa sổ; data-fill: phóng to / mobile thì app giãn kín chiều cao */}
      <div
        data-fill={full || undefined}
        className="group/win @container min-h-0 flex-1 overflow-auto p-3.5 max-md:p-2.5"
      >
        {children}
      </div>
    </div>
  )
}
