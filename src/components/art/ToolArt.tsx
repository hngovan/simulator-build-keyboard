import type { ReactNode } from 'react'

// Ảnh minh hoạ dụng cụ / vật tư vẽ bằng SVG (không cần file ảnh)

const BG: Record<string, [string, string]> = {
  switch: ['#3b6fd8', '#24418a'],
  keycap: ['#d85c9a', '#7d2b5c'],
  screw: ['#3fa36b', '#1d5c3a'],
  solder: ['#e0782f', '#8a3a12'],
  tipCleaner: ['#b8873a', '#5a3d12'],
  clipper: ['#8a5cd8', '#432a7d'],
  opener: ['#2fb3b3', '#145757'],
  brush: ['#c98a3a', '#6b3f12'],
  supply: ['#5a6478', '#2a3040'],
}

// Switch nhìn từ trên xuống
function Sw({
  x,
  y,
  s = 1,
  stem = '#e8c33a',
}: {
  x: number
  y: number
  s?: number
  stem?: string
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect width="28" height="28" rx="4" fill="#26262b" />
      <rect x="3" y="3" width="22" height="22" rx="3" fill="#e8eef3" opacity="0.9" />
      <rect x="12" y="7" width="4" height="14" rx="1" fill={stem} />
      <rect x="7" y="12" width="14" height="4" rx="1" fill={stem} />
    </g>
  )
}

// Keycap nhìn nghiêng 3/4
function Kc({
  x,
  y,
  w = 30,
  color = '#f2efe8',
  s = 1,
}: {
  x: number
  y: number
  w?: number
  color?: string
  s?: number
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect y="6" width={w} height="22" rx="5" fill="#00000055" />
      <rect y="4" width={w} height="22" rx="5" fill={color} />
      <rect y="4" width={w} height="22" rx="5" fill="#0003" />
      <rect x="4" y="0" width={w - 8} height="17" rx="4" fill={color} />
      <rect x="8" y="5" width="6" height="3" rx="1" fill="#0004" />
    </g>
  )
}

function Badge({ text, x = 128, y = 8 }: { text: string; x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="28" height="18" rx="9" fill="#ffcc2e" stroke="#0006" strokeWidth="1.5" />
      <text
        x="14"
        y="13"
        textAnchor="middle"
        fontSize="11"
        fontWeight="800"
        fill="#3a2b00"
        fontFamily="Baloo 2, Nunito, sans-serif"
      >
        {text}
      </text>
    </g>
  )
}

// Bàn tay đơn giản (ngón trỏ đang ấn)
function Hand({ x, y }: { x: number; y: number }) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      fill="#f2c39b"
      stroke="#a8724a"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <rect x="10" y="0" width="9" height="28" rx="4.5" />
      <path d="M4 24 Q4 18 9 18 H34 Q40 18 40 26 V40 Q40 50 30 50 H14 Q4 50 4 40 Z" />
      <path d="M19 18 V26 M26 18 V26 M33 19 V27" fill="none" />
    </g>
  )
}

function Press({ children }: { children: ReactNode }) {
  return (
    <>
      <rect x="14" y="72" width="112" height="14" rx="4" fill="#5b6273" />
      <rect x="20" y="14" width="10" height="60" rx="3" fill="#7d8597" />
      <rect x="110" y="14" width="10" height="60" rx="3" fill="#7d8597" />
      <rect x="14" y="10" width="112" height="12" rx="4" fill="#9aa3b5" />
      <rect x="34" y="34" width="72" height="8" rx="3" fill="#c7ced9" />
      <rect x="66" y="22" width="8" height="12" fill="#c7ced9" />
      <path d="M20 16 L11 9" stroke="#d33" strokeWidth="4" strokeLinecap="round" />
      <circle cx="10" cy="8" r="4.5" fill="#d33" />
      {children}
    </>
  )
}

type Art = (() => ReactNode) | null

const ART: Record<string, Art[]> = {
  switch: [
    () => (
      <>
        <Sw x={56} y={46} s={1.4} />
        <Hand x={68} y={6} />
        <Badge text="x1" />
      </>
    ),
    () => (
      <>
        <rect
          x="10"
          y="40"
          width="140"
          height="40"
          rx="6"
          fill="#9aa3b5"
          stroke="#5b6273"
          strokeWidth="2"
        />
        {[0, 1, 2, 3, 4].map((i) => (
          <Sw key={i} x={16 + i * 27} y={46} s={0.95} stem="#e05555" />
        ))}
        <rect x="10" y="30" width="140" height="8" rx="3" fill="#c7ced9" />
        <Badge text="x5" />
      </>
    ),
    () => (
      <Press>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <Sw key={i} x={30 + i * 12} y={54} s={0.42} stem="#3ecf6e" />
        ))}
        <Badge text="ALL" />
      </Press>
    ),
  ],
  keycap: [
    () => (
      <>
        <Kc x={52} y={46} w={44} s={1.1} color="#f2efe8" />
        <Hand x={66} y={2} />
        <Badge text="x1" />
      </>
    ),
    () => (
      <>
        <rect
          x="8"
          y="48"
          width="144"
          height="36"
          rx="8"
          fill="#3a3f4d"
          stroke="#1f2633"
          strokeWidth="2"
        />
        {['#f4b6c8', '#a8e0cf', '#f2efe8', '#f2d16b', '#2c3e6b'].map((c, i) => (
          <Kc key={i} x={14 + i * 27} y={46} w={24} color={c} />
        ))}
        <Badge text="x5" />
      </>
    ),
    () => (
      <Press>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Kc key={i} x={26 + i * 15} y={50} w={13} color="#f4b6c8" />
        ))}
        <Badge text="ALL" />
      </Press>
    ),
  ],
  screw: [
    () => (
      <g transform="rotate(-30 80 50)">
        <rect
          x="18"
          y="38"
          width="56"
          height="24"
          rx="10"
          fill="#e8b23a"
          stroke="#8a5f10"
          strokeWidth="2"
        />
        <path d="M30 40 V60 M42 40 V60 M54 40 V60" stroke="#8a5f10" strokeWidth="2" />
        <rect x="72" y="45" width="56" height="10" rx="2" fill="#c7ced9" />
        <path d="M128 45 L142 50 L128 55 Z" fill="#9aa3b5" />
      </g>
    ),
    () => (
      <>
        <path
          d="M30 24 H100 Q112 24 112 36 V44 Q112 52 100 52 H74 L66 84 H40 L48 52 H30 Q22 52 22 44 V32 Q22 24 30 24 Z"
          fill="#2fa860"
          stroke="#185c34"
          strokeWidth="2"
        />
        <rect x="36" y="78" width="36" height="12" rx="3" fill="#26262b" />
        <rect x="112" y="33" width="20" height="10" rx="2" fill="#c7ced9" />
        <path d="M132 33 L148 38 L132 43 Z" fill="#9aa3b5" />
        <path d="M70 30 L62 40 H70 L64 50 L78 37 H70 L76 30 Z" fill="#ffcc2e" />
        <Badge text="⚡" x={128} y={70} />
      </>
    ),
  ],
  solder: [
    null,
    () => (
      <>
        <g transform="rotate(-25 80 55)">
          <rect x="14" y="46" width="58" height="18" rx="9" fill="#26262b" />
          <rect x="22" y="48" width="40" height="14" rx="7" fill="#d33" opacity="0.9" />
          <rect x="70" y="50" width="50" height="10" rx="2" fill="#c7ced9" />
          <path d="M120 50 L146 55 L120 60 Z" fill="#9aa3b5" />
          <path d="M14 55 Q0 70 10 92" stroke="#26262b" strokeWidth="4" fill="none" />
        </g>
        <path
          d="M132 34 q-6 -8 0 -16 q6 -8 0 -16"
          stroke="#ffffffaa"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </>
    ),
    () => (
      <>
        <rect
          x="8"
          y="40"
          width="70"
          height="48"
          rx="8"
          fill="#e0782f"
          stroke="#8a3a12"
          strokeWidth="2"
        />
        <rect x="16" y="48" width="44" height="20" rx="3" fill="#111" />
        <text
          x="38"
          y="63"
          textAnchor="middle"
          fontSize="13"
          fontWeight="800"
          fill="#ff5d5d"
          fontFamily="monospace"
        >
          350°
        </text>
        <circle cx="66" cy="76" r="7" fill="#26262b" />
        <circle cx="28" cy="78" r="4" fill="#3ecf6e" />
        <path d="M100 88 L118 60 L128 64 L112 90 Z" fill="#5b6273" />
        <g transform="rotate(-60 120 50)">
          <rect x="88" y="44" width="36" height="12" rx="6" fill="#26262b" />
          <rect x="122" y="46" width="22" height="8" rx="2" fill="#c7ced9" />
          <path d="M144 46 L156 50 L144 54 Z" fill="#9aa3b5" />
        </g>
        <path d="M78 70 Q92 70 100 80" stroke="#26262b" strokeWidth="4" fill="none" />
      </>
    ),
  ],
}

// Bùi nhùi đồng trong cốc: cuộn sợi đồng xoắn
ART.tipCleaner = [
  null,
  () => (
    <>
      <path d="M52 56 H108 L102 88 H58 Z" fill="#3a3f4a" />
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M${56 + i * 4} 58 q12 -22 ${24 - i * 2} -4 q10 -18 ${20 - i * 3} 2`}
          stroke="#e0a948"
          strokeWidth="3"
          fill="none"
        />
      ))}
    </>
  ),
]

// Kìm cắt: 2 cán cao su + lưỡi cắt
ART.clipper = [
  null,
  () => (
    <>
      <path d="M78 46 L40 90" stroke="#d33" strokeWidth="14" strokeLinecap="round" />
      <path d="M86 46 L124 90" stroke="#2f6fd8" strokeWidth="14" strokeLinecap="round" />
      <path d="M70 48 L82 10 L86 48 Z" fill="#c7ced9" stroke="#5b6273" strokeWidth="2" />
      <path d="M94 48 L82 10 L78 48 Z" fill="#aab3c2" stroke="#5b6273" strokeWidth="2" />
      <circle cx="82" cy="48" r="7" fill="#5b6273" />
      <circle cx="82" cy="48" r="3" fill="#c7ced9" />
    </>
  ),
]

// Đồ mở switch: khối nhựa có lỗ, switch đang mở + cọ
const OpenSwitch = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect width="26" height="10" rx="2" fill="#26262b" />
    <path
      d="M2 -4 L24 -4 L20 -14 L6 -14 Z"
      fill="#e8eef3"
      opacity="0.85"
      transform="translate(0 -6)"
    />
    <rect x="11" y="-12" width="4" height="10" fill="#e05555" />
  </g>
)
ART.opener = [
  null,
  () => (
    <>
      <rect
        x="40"
        y="56"
        width="80"
        height="28"
        rx="6"
        fill="#e8b23a"
        stroke="#8a5f10"
        strokeWidth="2"
      />
      <rect x="66" y="50" width="28" height="10" rx="2" fill="#1b1b1b" />
      <OpenSwitch x={67} y={40} />
      <path d="M126 20 L104 62" stroke="#c9302c" strokeWidth="5" strokeLinecap="round" />
      <path d="M104 62 l-6 10 l8 -4 Z" fill="#f2efe6" />
      <Badge text="x10" />
    </>
  ),
  () => (
    <>
      <rect
        x="14"
        y="48"
        width="132"
        height="38"
        rx="6"
        fill="#e8b23a"
        stroke="#8a5f10"
        strokeWidth="2"
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <OpenSwitch key={i} x={22 + i * 25} y={44} s={0.8} />
      ))}
      <path d="M150 14 L130 44" stroke="#c9302c" strokeWidth="5" strokeLinecap="round" />
      <Badge text="x25" x={4} y={8} />
    </>
  ),
]

// Cọ lube: cán gỗ + đầu lông
const Brush = ({ x, y, r = 0, w = 6 }: { x: number; y: number; r?: number; w?: number }) => (
  <g transform={`translate(${x} ${y}) rotate(${r})`}>
    <rect
      x={-3}
      y={0}
      width={6}
      height={52}
      rx={3}
      fill="#d9a35b"
      stroke="#6b3f12"
      strokeWidth="1.5"
    />
    <rect x={-w / 2 - 1} y={-6} width={w + 2} height={8} rx={2} fill="#c7ced9" />
    <path d={`M${-w / 2} -6 Q0 ${-26} ${w / 2} -6 Z`} fill="#3a2a1a" />
  </g>
)
ART.brush = [
  null,
  () => (
    <>
      <Brush x={80} y={34} r={-20} />
      <Badge text="0" />
    </>
  ),
  () => (
    <>
      <Brush x={56} y={36} r={-20} w={4} />
      <Brush x={80} y={32} r={-8} />
      <Brush x={104} y={34} r={6} w={12} />
      <Badge text="x3" />
    </>
  ),
]

// Ảnh vật tư: hũ lube, tuýp mỡ, hộp băng keo
export function SupplyArt({ id, color }: { id: string; color: string }) {
  let body: ReactNode
  if (id === 'urgo') {
    body = (
      <>
        <rect
          x="34"
          y="30"
          width="92"
          height="50"
          rx="6"
          fill="#f2f2f2"
          stroke="#c03b3b"
          strokeWidth="3"
        />
        <text
          x="80"
          y="52"
          textAnchor="middle"
          fontSize="16"
          fontWeight="800"
          fill="#c03b3b"
          fontFamily="Baloo 2, Nunito, sans-serif"
        >
          URGO
        </text>
        <g transform="rotate(-12 80 70)">
          <rect x="44" y="60" width="72" height="16" rx="8" fill={color} stroke="#a8724a" />
          <rect x="68" y="62" width="24" height="12" rx="3" fill="#f5e3cf" />
        </g>
      </>
    )
  } else if (id === 'permatex') {
    body = (
      <>
        <path
          d="M30 40 H110 L124 48 V60 L110 68 H30 Z"
          fill={color}
          stroke="#3a5a7a"
          strokeWidth="2"
        />
        <rect x="124" y="50" width="16" height="8" rx="2" fill="#c9302c" />
        <text
          x="70"
          y="58"
          textAnchor="middle"
          fontSize="13"
          fontWeight="800"
          fill="#1d3550"
          fontFamily="Baloo 2, Nunito, sans-serif"
        >
          PERMATEX
        </text>
      </>
    )
  } else {
    const LABELS: Record<string, string> = {
      g0: '205g0',
      g00: '205g00',
      g2: '205g2',
      t3203: '3203',
      t3204: '3204',
      gpl105: 'GPL 105',
      bdz: 'XHT-BDZ',
      solderCheap: 'Thiếc đểu',
      solder6337: 'Sakura',
      solderPro: 'Asahi',
    }
    const label = LABELS[id] ?? id
    body = (
      <>
        <rect x="50" y="22" width="60" height="14" rx="4" fill="#26262b" />
        <rect
          x="46"
          y="34"
          width="68"
          height="50"
          rx="8"
          fill={color}
          stroke="#0004"
          strokeWidth="2"
        />
        <rect x="52" y="48" width="56" height="22" rx="3" fill="#ffffffdd" />
        <text
          x="80"
          y="64"
          textAnchor="middle"
          fontSize="13"
          fontWeight="800"
          fill="#2a2f3a"
          fontFamily="Baloo 2, Nunito, sans-serif"
        >
          {label}
        </text>
      </>
    )
  }
  return <ArtFrame kind="supply">{body}</ArtFrame>
}

/** Khung ảnh 160×100: nền gradient theo nhóm + vòng sáng ở giữa */
function ArtFrame({ kind, children }: { kind: string; children: ReactNode }) {
  const [a, b] = BG[kind]
  const id = `bg-${kind}`
  return (
    <svg
      className="block h-auto w-full rounded-[10px] shadow-[inset_0_0_0_2px_#0003,0_3px_0_#0005]"
      viewBox="0 0 160 100"
      role="img"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="160" height="100" rx="10" fill={`url(#${id})`} />
      <circle cx="80" cy="58" r="42" fill="#ffffff14" />
      {children}
    </svg>
  )
}

export function ToolArt({ kind, level }: { kind: string; level: number }) {
  const Art = ART[kind]?.[level]
  if (!Art) return null
  return (
    <ArtFrame kind={kind}>
      <Art />
    </ArtFrame>
  )
}
