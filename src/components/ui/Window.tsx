import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/format'

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

function clampPosition(pos: { x: number; y: number }, width: number) {
  const maxX = Math.max(VIEWPORT_GAP, window.innerWidth - width - VIEWPORT_GAP)
  const maxY = Math.max(
    VIEWPORT_GAP,
    window.innerHeight - TASKBAR_HEIGHT - MIN_VISIBLE_HEIGHT - VIEWPORT_GAP,
  )

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
  const drag = useRef<{ dx: number; dy: number } | null>(null)

  useEffect(() => {
    const constrainToViewport = () => setPos((current) => clampPosition(current, width))
    window.addEventListener('resize', constrainToViewport)
    return () => window.removeEventListener('resize', constrainToViewport)
  }, [width])

  const maxHeight = Math.max(
    MIN_VISIBLE_HEIGHT,
    window.innerHeight - pos.y - TASKBAR_HEIGHT - VIEWPORT_GAP,
  )

  return (
    <div
      className={cn(
        'absolute flex flex-col overflow-hidden bg-panel shadow-[0_16px_50px_rgba(0,0,0,0.5)]',
        maximized
          ? 'max-w-none rounded-none border-0'
          : 'max-w-[calc(100vw-16px)] rounded-2xl border-[3px] border-black/40 max-md:!top-24 max-md:!left-2 max-md:!w-[calc(100vw-16px)]',
      )}
      style={
        maximized
          ? {
              left: 0,
              top: 0,
              width: window.innerWidth,
              height: window.innerHeight,
              maxHeight: window.innerHeight,
              zIndex: 101,
              display: minimized ? 'none' : undefined,
            }
          : {
              left: pos.x,
              top: pos.y,
              width,
              maxHeight,
              zIndex,
              display: minimized ? 'none' : undefined,
            }
      }
      onPointerDown={onFocus}
    >
      <div
        className="flex cursor-grab items-center justify-between py-1.5 pr-2 pl-3.5 font-head text-[17px] font-extrabold [text-shadow:0_2px_0_#0004]"
        style={{ background: color }}
        onPointerDown={(e) => {
          if (maximized) return
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
        <span className="min-w-0 truncate">{title}</span>
        <div className="flex shrink-0 gap-1">
          <button
            className="size-[30px] rounded-[9px] bg-black/25 pb-2 font-extrabold hover:bg-black/40"
            aria-label="Thu nhỏ cửa sổ xuống taskbar"
            title="Thu nhỏ"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onMinimize}
          >
            −
          </button>
          <button
            className="size-[30px] rounded-[9px] bg-black/25 font-extrabold hover:bg-black/40"
            aria-label={maximized ? 'Khôi phục kích thước cửa sổ' : 'Phóng to cửa sổ'}
            title={maximized ? 'Khôi phục' : 'Phóng to'}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setMaximized((current) => !current)}
          >
            {maximized ? '❐' : '□'}
          </button>
          <button
            className="size-[30px] rounded-[9px] bg-black/25 font-extrabold hover:bg-red"
            aria-label="Đóng cửa sổ"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3.5">{children}</div>
    </div>
  )
}
