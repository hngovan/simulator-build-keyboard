import type { ReactNode } from 'react'
import type { ShopCategory } from '@/types'

// Bộ icon trong game (UI kit "Simulator Build Keyboard — Start Screen", trang 1): nét 2.2 trên lưới 24, đầu / góc tròn,
// cùng 1 nét cho mọi cỡ. Ô nền kiểu keycap (bo lớn, viền đáy dày) vẽ ở nơi dùng (DesktopIcon, Taskbar...)

export type GameIcon = (props: { className?: string }) => ReactNode

const make =
  (body: ReactNode): GameIcon =>
  ({ className }) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {body}
    </svg>
  )

// ---------- chung ----------
export const IconStar = make(
  <path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />,
)
// ---------- danh mục Shopii ----------
export const IconCase = make(
  <>
    <path d="M3 10.5h18V16a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16z" />
    <path d="M5 10.5 7 7.5h10l2 3M3 14h18" />
  </>,
)
export const IconPcb = make(
  <>
    <rect x="3.5" y="5" width="17" height="14" rx="2" />
    <path d="M7.5 9h4.5v3.5h4.5M7.5 15.5h4" />
    <circle cx="16.5" cy="15.5" r=".9" />
  </>,
)
export const IconPlate = make(
  <>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <rect x="6.5" y="9.2" width="11" height="5.6" rx=".8" />
    <path d="M10.2 9.2v5.6M13.8 9.2v5.6" />
  </>,
)
export const IconStab = make(
  <>
    <path d="M6 13V11a2.5 2.5 0 0 1 2.5-2.5h7A2.5 2.5 0 0 1 18 11v2" />
    <rect x="3.5" y="13" width="5" height="5.5" rx="1.2" />
    <rect x="15.5" y="13" width="5" height="5.5" rx="1.2" />
  </>,
)
export const IconSwitch = make(
  <>
    <path d="M12 3.5v6M9 6.5h6" />
    <rect x="5" y="11.5" width="14" height="9" rx="2.2" />
  </>,
)
export const IconKeycap = make(
  <>
    <path d="M5.5 19.5 7.8 6.2A1.5 1.5 0 0 1 9.3 5h5.4a1.5 1.5 0 0 1 1.5 1.2l2.3 13.3z" />
    <path d="M4 19.5h16" />
  </>,
)
export const IconLube = make(
  <>
    <path d="M10 3.8S5 9.5 5 13.3a5 5 0 0 0 10 0C15 9.5 10 3.8 10 3.8z" />
    <path d="M15.5 12.5 21 9.5M17 15l4 1" />
  </>,
)
export const IconTool = make(
  <>
    <path d="m14.5 3.5 6 6-2.6 2.6-6-6z" />
    <path d="m12.4 8.6-8 8a1.6 1.6 0 0 0 0 2.3l.7.7a1.6 1.6 0 0 0 2.3 0l8-8" />
  </>,
)
export const IconCert = make(
  <>
    <rect x="3.5" y="4" width="17" height="12" rx="2" />
    <path d="M7 8h10M7 11.2h5.5" />
    <circle cx="16" cy="15.5" r="2.5" />
    <path d="m14.8 17.6-.8 3.4 2-1 2 1-.8-3.4" />
  </>,
)
export const IconBook = make(
  <>
    <path d="M6.5 3.5H19v17H6.5A2.5 2.5 0 0 1 4 18V6a2.5 2.5 0 0 1 2.5-2.5z" />
    <path d="M8 8.5h7.5M8 12h5" />
  </>,
)

/** icon mỗi mục hàng Shopii */
export const SHOP_CAT_ICONS: Record<ShopCategory, GameIcon> = {
  case: IconCase,
  pcb: IconPcb,
  plate: IconPlate,
  stab: IconStab,
  switch: IconSwitch,
  keycap: IconKeycap,
  supply: IconLube,
  tool: IconTool,
  cert: IconCert,
  spell: IconBook,
}

// ---------- HUD ----------
export const IconWallet = make(
  <>
    <rect x="3" y="6" width="18" height="13" rx="2.5" />
    <path d="M3 10h18M16 14.5h1.5" />
  </>,
)
export const IconShield = make(
  <>
    <path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6z" />
    <path d="m9 12 2 2 4-4" />
  </>,
)
