import type { ReactNode } from 'react'

/** nút chuột sáng lên: trái / phải / con lăn */
type MouseBtn = 'left' | 'right' | 'wheel'

/** Hình chuột nhỏ, sáng phần nút cần bấm (xanh) */
export function MouseIcon({ btn }: { btn: MouseBtn }) {
  const on = '#3ecf6e'
  return (
    <svg viewBox="0 0 20 28" className="h-8 w-6 shrink-0" aria-hidden>
      <rect
        x="1"
        y="1"
        width="18"
        height="26"
        rx="9"
        fill="#f1f3f8"
        stroke="#141821"
        strokeWidth="1.6"
      />
      {btn === 'left' && <path d="M10 1.8 A8.2 8.2 0 0 0 1.8 10 V11 H10 Z" fill={on} />}
      {btn === 'right' && <path d="M10 1.8 A8.2 8.2 0 0 1 18.2 10 V11 H10 Z" fill={on} />}
      <line x1="10" y1="1" x2="10" y2="11" stroke="#141821" strokeWidth="1.4" />
      <line x1="1.5" y1="11" x2="18.5" y2="11" stroke="#141821" strokeWidth="1.4" />
      <rect
        x="8"
        y="4"
        width="4"
        height="5"
        rx="2"
        fill={btn === 'wheel' ? on : '#94a0b8'}
        stroke="#141821"
        strokeWidth="1"
      />
    </svg>
  )
}

/** Phím bấm vẽ như keycap trắng (chữ đậm, rõ trên nền cảnh 3D) */
export function KeyCap({ children }: { children: ReactNode }) {
  return (
    <span className="grid h-8 min-w-8 shrink-0 place-items-center rounded-md border-2 border-bg bg-ink px-1 font-head text-lg leading-none font-extrabold text-bg shadow-[0_3px_0_#000a] [text-shadow:none]">
      {children}
    </span>
  )
}

/**
 * Hướng dẫn điều khiển 1 dòng chữ to giữa đáy màn hình, không khung (chữ trắng bóng đổ), xen hình chuột / phím:
 * truyền nội dung dòng làm children
 */
export function ControlsHint({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-4 z-[5] flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-head text-xl font-bold text-ink select-none [text-shadow:0_2px_4px_#000,0_0_2px_#000] max-md:hidden">
      {children}
    </div>
  )
}
