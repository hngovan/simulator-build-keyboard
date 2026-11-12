import type { ReactNode } from 'react'
import type { ShopCategory } from '@/types'

// Bộ icon trong game trên lưới 24, đầu / góc tròn. Icon HUD: nét 2.2. Icon linh kiện (mục Shopii, ô Free build): vẽ đúng hình
// linh kiện thật, nét mảnh `PART_W` + thân tô nhạt `TINT`, chi tiết nhỏ nét `FINE`; vẽ ở cỡ 20px trở lên cho rõ chi tiết

export type GameIcon = (props: { className?: string }) => ReactNode

/** nét icon linh kiện (mảnh hơn icon HUD) + nét chi tiết nhỏ bên trong */
const PART_W = 1.7
const FINE = 1.2
/** phần thân linh kiện tô nhạt cùng màu nét */
const TINT = { fill: 'currentColor', fillOpacity: 0.22 } as const
/** vùng chỉ tô, không viền (thân có lỗ khoét: tô theo evenodd, viền vẽ riêng) */
const FILL = { ...TINT, stroke: 'none' } as const

const make =
  (body: ReactNode, width = 2.2): GameIcon =>
  ({ className }) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
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
// ---------- linh kiện (mục Shopii, ô Free build) ----------
const part = (body: ReactNode) => make(body, PART_W)
/** toạ độ lỗ switch của icon plate (2 hàng × 4 lỗ) */
const HOLE_X = [5, 8.8, 12.6, 16.4]
const HOLE_Y = [7.5, 11]

// case = hình bàn phím: khung bo tròn, 2 hàng 5 chấm phím, thanh space
export const IconCase = part(
  <>
    <rect x="2" y="4.5" width="20" height="15" rx="4" {...TINT} />
    {[9.4, 12.6].map((y) =>
      [6.4, 9.2, 12, 14.8, 17.6].map((x) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="currentColor" stroke="none" />
      )),
    )}
    <path d="M8.4 16h7.2" />
  </>,
)
// PCB = bo mạch in: khung chữ nhật, chip vuông góc dưới trái, đường mạch gập 45° nối các lỗ via tròn
export const IconPcb = part(
  <>
    <rect x="2.5" y="4.5" width="19" height="15" rx="1.8" {...TINT} />
    <g strokeWidth={FINE}>
      <rect x="5.6" y="11.6" width="4.8" height="4.8" rx=".6" />
      <circle cx="6.6" cy="8" r="1" />
      <path d="M7.6 8h2.2l1.4-1.4M13.4 5.2v7.4L12 14h-1.4M17 8.6h-1.4v5l1.2 1.2" />
      <circle cx="18" cy="8.6" r="1" />
      <circle cx="17.6" cy="15.6" r="1" />
    </g>
  </>,
)
// plate = cùng khung với case nhưng phím là lỗ khoét: 2 hàng 4 lỗ switch vuông + lỗ dài phím space (thân tô, lỗ để rỗng)
export const IconPlate = part(
  <>
    <path
      {...FILL}
      fillRule="evenodd"
      d={`M6 4.5h12a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4v-7a4 4 0 0 1 4-4z${HOLE_Y.map(
        (y) => HOLE_X.map((x) => `M${x} ${y}h2.6v2.6h-2.6z`).join(''),
      ).join('')}M7.5 14.5h9v2.4h-9z`}
    />
    <rect x="2" y="4.5" width="20" height="15" rx="4" />
    <g strokeWidth={FINE}>
      {HOLE_Y.map((y) =>
        HOLE_X.map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="2.6" height="2.6" rx=".5" />),
      )}
      <rect x="7.5" y="14.5" width="9" height="2.4" rx=".6" />
    </g>
  </>,
)
// stab: 2 housing nối nhau bằng dây thép, mỗi housing có trục chữ thập
export const IconStab = part(
  <>
    <path d="M5.5 10.5V8a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v2.5" />
    <rect x="2.5" y="10.5" width="6" height="8.5" rx="1.5" {...TINT} />
    <rect x="15.5" y="10.5" width="6" height="8.5" rx="1.5" {...TINT} />
    <path strokeWidth={FINE} d="M5.5 13.2v3M4 14.7h3M18.5 13.2v3M17 14.7h3" />
  </>,
)
// switch nhìn ngang: nắp trên hình thang, cổ 2 vách, đế dưới có 2 chân + chốt giữa
export const IconSwitch = part(
  <>
    <path d="M6.6 2.5h10.8l.8 9H5.8z" {...TINT} />
    <path d="M9.2 11.5V14M14.8 11.5V14" />
    <path d="M7.5 14h9v4h-9z" {...FILL} />
    <path d="M7.5 20.5V14h9v6.5M7.5 18h9" />
    <path d="M10.4 18v3.5h3.2V18" />
  </>,
)
// keycap nhìn từ trên: váy phím ngoài, mặt phím trong lệch lên
export const IconKeycap = part(
  <>
    <rect x="3" y="3" width="18" height="18" rx="4.2" {...TINT} />
    <rect x="6.2" y="5" width="11.6" height="11.6" rx="2.6" />
  </>,
)
// lube & vật tư: hũ lube có nắp + cọ lube
export const IconLube = part(
  <>
    <rect x="3.5" y="4.5" width="9" height="3.2" rx="1" />
    <path d="M4.5 7.7h7v10.6a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2z" {...TINT} />
    <path strokeWidth={FINE} d="M6.5 12.5h3" />
    <path d="M20.5 3.5 17 13" />
    <path d="M15.6 12.6l2.7 1-1.5 5.2-2.6-1z" {...TINT} />
  </>,
)
// dụng cụ: tua vít + kìm nhổ keycap dây thép
export const IconTool = part(
  <>
    <rect x="3.5" y="2.8" width="5" height="8.2" rx="2.2" {...TINT} />
    <path d="M6 11v7.2M4.8 18.2h2.4L6.8 21h-1.6z" />
    <circle cx="16.5" cy="4.8" r="1.8" />
    <path d="M16.5 6.6v3M16.5 9.6l-3 3.2V20l1.6 1M16.5 9.6l3 3.2V20l-1.6 1" />
  </>,
)
// chứng chỉ thợ: tấm bằng có hàng keycap nhỏ + huy hiệu ruy băng
export const IconCert = part(
  <>
    <rect x="3" y="3.5" width="18" height="13" rx="2.2" {...TINT} />
    <g strokeWidth={FINE}>
      {[6, 10, 14].map((x) => (
        <rect key={x} x={x} y="6.6" width="2.8" height="2.8" rx=".7" />
      ))}
      <path d="M6 12.6h4.5" />
    </g>
    <circle cx="16.5" cy="15.5" r="2.6" />
    <path d="m15.2 17.8-.7 3.2 2-1 2 1-.7-3.2" />
  </>,
)
// sách phép: quyển sách có ngôi sao phép 4 cánh
export const IconBook = part(
  <>
    <path d="M6.5 3.5H19v17H6.5A2.5 2.5 0 0 1 4 18V6a2.5 2.5 0 0 1 2.5-2.5z" {...TINT} />
    <path d="M4 18a2.5 2.5 0 0 1 2.5-2.5H19" />
    <path
      strokeWidth={FINE}
      d="M12.3 5.8c.4 2 1 2.6 3 3-2 .4-2.6 1-3 3-.4-2-1-2.6-3-3 2-.4 2.6-1 3-3z"
    />
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
