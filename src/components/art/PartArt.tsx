import type { PartCategory } from '@/types'

interface Props {
  category: PartCategory
  color: string
}

/** Minh hoạ SVG cho từng nhóm linh kiện Shopii, không phụ thuộc ảnh bên ngoài. */
export function PartArt({ category, color }: Props) {
  const body = {
    case: <CaseArt color={color} />,
    pcb: <PcbArt />,
    plate: <PlateArt color={color} />,
    stab: <StabArt color={color} />,
    switch: <SwitchArt color={color} />,
    keycap: <KeycapArt color={color} />,
  }[category]

  return (
    <svg
      className="block h-full w-auto max-w-full rounded-[10px] shadow-[inset_0_0_0_2px_#0003,0_3px_0_#0005]"
      viewBox="0 0 160 100"
      role="img"
      aria-label={`Minh hoạ ${category}`}
    >
      <defs>
        <linearGradient id={`part-bg-${category}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#344563" />
          <stop offset="1" stopColor="#151b2b" />
        </linearGradient>
      </defs>
      <rect width="160" height="100" rx="10" fill={`url(#part-bg-${category})`} />
      <circle cx="80" cy="54" r="43" fill="#ffffff0d" />
      {body}
    </svg>
  )
}

function CaseArt({ color }: { color: string }) {
  return (
    <g transform="translate(19 24)">
      <rect x="4" y="8" width="114" height="52" rx="12" fill="#080b12" opacity="0.65" />
      <rect width="122" height="56" rx="12" fill={color} stroke="#ffffff66" strokeWidth="2" />
      <rect
        x="8"
        y="8"
        width="106"
        height="39"
        rx="7"
        fill="#151a25"
        stroke="#0008"
        strokeWidth="2"
      />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect
          key={i}
          x={14 + i * 16}
          y="14"
          width="11"
          height="10"
          rx="2"
          fill="#e8edf4"
          opacity="0.86"
        />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={22 + i * 18}
          y="29"
          width={i === 2 ? 28 : 12}
          height="10"
          rx="2"
          fill="#e8edf4"
          opacity="0.72"
        />
      ))}
      <circle cx="10" cy="51" r="3" fill="#0006" />
      <circle cx="112" cy="51" r="3" fill="#0006" />
    </g>
  )
}

function PcbArt() {
  return (
    <g transform="translate(22 18)">
      <rect width="116" height="64" rx="7" fill="#217143" stroke="#7ce29d" strokeWidth="2" />
      <path
        d="M12 15 H48 V31 H73 V15 H104 M12 49 H37 V37 H61 V49 H104"
        fill="none"
        stroke="#e7c94d"
        strokeWidth="2.5"
      />
      {[16, 36, 56, 76, 96].map((x) => (
        <g key={x}>
          <circle cx={x} cy="15" r="4" fill="#d9d4a0" />
          <circle cx={x} cy="49" r="4" fill="#d9d4a0" />
          <circle cx={x} cy="15" r="1.5" fill="#39431e" />
          <circle cx={x} cy="49" r="1.5" fill="#39431e" />
        </g>
      ))}
      <rect x="51" y="24" width="15" height="16" rx="2" fill="#101820" stroke="#c2c9c6" />
      <text x="58" y="36" textAnchor="middle" fontSize="8" fontWeight="800" fill="#e9f3eb">
        PCB
      </text>
    </g>
  )
}

function PlateArt({ color }: { color: string }) {
  return (
    <g transform="translate(22 19)">
      <rect width="116" height="62" rx="7" fill={color} stroke="#ffffffa0" strokeWidth="2" />
      <rect x="8" y="8" width="100" height="46" rx="4" fill="#111722" opacity="0.75" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={13 + i * 15} y="13" width="9" height="9" rx="1.5" fill={color} />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={20 + i * 17}
          y="29"
          width={i === 2 ? 25 : 10}
          height="10"
          rx="1.5"
          fill={color}
        />
      ))}
      <circle cx="7" cy="7" r="2.5" fill="#121722" />
      <circle cx="109" cy="55" r="2.5" fill="#121722" />
    </g>
  )
}

function StabArt({ color }: { color: string }) {
  return (
    <g transform="translate(17 24)">
      <path
        d="M9 45 V17 H28 M28 17 H105 V45"
        fill="none"
        stroke="#d8e0ed"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M9 45 V17 H28 M28 17 H105 V45" fill="none" stroke="#18202d" strokeWidth="1" />
      <rect
        x="0"
        y="38"
        width="18"
        height="18"
        rx="4"
        fill={color}
        stroke="#fff8"
        strokeWidth="2"
      />
      <rect
        x="96"
        y="38"
        width="18"
        height="18"
        rx="4"
        fill={color}
        stroke="#fff8"
        strokeWidth="2"
      />
      <rect x="4" y="42" width="10" height="10" rx="2" fill="#232a37" />
      <rect x="100" y="42" width="10" height="10" rx="2" fill="#232a37" />
      <rect x="42" y="11" width="30" height="9" rx="4" fill="#f1f4f8" opacity="0.85" />
    </g>
  )
}

function SwitchArt({ color }: { color: string }) {
  return (
    <g transform="translate(51 16)">
      <path d="M5 19 L29 3 L53 19 V61 L29 76 L5 61 Z" fill="#121821" opacity="0.8" />
      <path
        d="M0 18 L29 0 L58 18 V63 L29 81 L0 63 Z"
        fill={color}
        stroke="#ffffffaa"
        strokeWidth="2"
      />
      <path d="M8 22 L29 9 L50 22 V53 L29 66 L8 53 Z" fill="#f1f4f6" opacity="0.9" />
      <path
        d="M25 20 H33 V30 H43 V38 H33 V48 H25 V38 H15 V30 H25 Z"
        fill="#e4bb38"
        stroke="#775e11"
        strokeWidth="1.5"
      />
      <circle cx="10" cy="68" r="3" fill="#293242" />
      <circle cx="48" cy="68" r="3" fill="#293242" />
    </g>
  )
}

function KeycapArt({ color }: { color: string }) {
  return (
    <g transform="translate(24 21)">
      <g transform="rotate(-7 54 30)">
        <rect x="4" y="18" width="109" height="43" rx="9" fill="#0008" />
        <rect width="109" height="50" rx="9" fill={color} stroke="#ffffffa0" strokeWidth="2" />
        <rect x="8" y="7" width="93" height="31" rx="7" fill="#ffffff25" />
        <text x="54" y="31" textAnchor="middle" fontSize="19" fontWeight="900" fill="#151b27">
          KEebOS
        </text>
      </g>
      <rect x="19" y="60" width="23" height="14" rx="4" fill={color} opacity="0.8" />
      <rect x="73" y="60" width="23" height="14" rx="4" fill={color} opacity="0.8" />
    </g>
  )
}
