// NPC hướng dẫn "Keeb-chan": cô bé chibi kiểu moe hoá đồ vật (cảm hứng Typewriter-chan), chủ đề bàn phím cơ —
// tóc mái đen cắt ngang, tóc dài 2 bên màu kem, băng đô là 1 hàng keycap có núm 2 đầu, váy tạp dề in keycap,
// mắt nhắm cười ":3". SVG thuần, viền đậm kiểu sticker
const C = {
  line: '#2b2630',
  hair: '#2a2a31',
  hairHi: '#45454f',
  cream: '#efe2c4',
  creamDark: '#d9c79f',
  skin: '#fde8d9',
  blush: '#f6a3a3',
  dress: '#30343f',
  dressDark: '#23262f',
  key: '#f7f3ea',
  keyShade: '#cfc8b8',
  shoe: '#1f1f25',
}

/** 1 hàng keycap nhỏ (x đầu, y, số nút, cỡ nút) */
function Keys({
  x,
  y,
  n,
  s = 6.5,
  gap = 1.4,
}: {
  x: number
  y: number
  n: number
  s?: number
  gap?: number
}) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <g key={i} transform={`translate(${x + i * (s + gap)} ${y})`}>
          <rect width={s} height={s} rx={1.6} fill={C.keyShade} stroke={C.line} strokeWidth={0.8} />
          <rect x={0.9} y={0.6} width={s - 1.8} height={s - 2.2} rx={1.1} fill={C.key} />
        </g>
      ))}
    </>
  )
}

export function GuideGirl({ className }: { className?: string }) {
  const sw = { stroke: C.line, strokeWidth: 1.6, strokeLinejoin: 'round' as const }
  return (
    <svg viewBox="0 0 120 168" className={className} aria-hidden>
      {/* tóc dài 2 bên màu kem, gợn sóng ra sau lưng */}
      <path
        d="M26 46 C14 70 22 86 12 104 C20 108 30 100 30 92 C34 104 28 116 36 120 C42 108 40 92 40 70 Z"
        fill={C.cream}
        {...sw}
      />
      <path
        d="M94 46 C106 70 98 86 108 104 C100 108 90 100 90 92 C86 104 92 116 84 120 C78 108 80 92 80 70 Z"
        fill={C.cream}
        {...sw}
      />

      {/* chân + giày */}
      <rect x={47} y={136} width={10} height={20} rx={3} fill={C.cream} {...sw} />
      <rect x={63} y={136} width={10} height={20} rx={3} fill={C.cream} {...sw} />
      <ellipse cx={51} cy={158} rx={8} ry={5} fill={C.shoe} {...sw} />
      <ellipse cx={69} cy={158} rx={8} ry={5} fill={C.shoe} {...sw} />

      {/* váy: thân tối, xoè ở dưới */}
      <path d="M44 88 L76 88 L88 140 Q60 146 32 140 Z" fill={C.dress} {...sw} />
      {/* tạp dề in 3 hàng keycap + phím space */}
      <path d="M48 104 L72 104 L78 136 Q60 140 42 136 Z" fill={C.dressDark} {...sw} />
      <Keys x={46.5} y={108} n={4} s={5.6} gap={1.2} />
      <Keys x={45} y={115.5} n={5} s={5} gap={1} />
      <Keys x={46.5} y={122.5} n={4} s={5.6} gap={1.2} />
      <rect
        x={51}
        y={130}
        width={18}
        height={4.5}
        rx={1.6}
        fill={C.key}
        stroke={C.line}
        strokeWidth={0.8}
      />
      {/* tay áo + bàn tay */}
      <path d="M44 90 Q34 98 36 114 L44 114 Q44 102 48 96 Z" fill={C.dress} {...sw} />
      <path d="M76 90 Q86 98 84 114 L76 114 Q76 102 72 96 Z" fill={C.dress} {...sw} />
      <circle cx={40} cy={116} r={4} fill={C.skin} {...sw} />
      <circle cx={80} cy={116} r={4} fill={C.skin} {...sw} />
      {/* cổ áo + nơ cravat màu kem */}
      <path d="M52 86 L60 94 L68 86 Z" fill={C.cream} {...sw} />
      <path d="M56 92 L60 104 L64 92 Z" fill={C.creamDark} {...sw} />

      {/* đầu: mặt to kiểu chibi */}
      <ellipse cx={60} cy={58} rx={30} ry={28} fill={C.skin} {...sw} />
      {/* tóc đen: chỏm + 2 mái ôm má + mái bằng cắt ngang */}
      <path
        d="M29 62 C26 36 40 22 60 22 C80 22 94 36 91 62 L86 76 L84 52 L36 52 L34 76 Z"
        fill={C.hair}
        {...sw}
      />
      <path d="M36 50 L84 50 L84 56 Q60 52 36 56 Z" fill={C.hair} />
      <path
        d="M40 30 Q50 26 58 28"
        stroke={C.hairHi}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />

      {/* mắt nhắm cười ^^ + miệng :3 + má hồng */}
      <path
        d="M44 66 Q48.5 61 53 66"
        fill="none"
        stroke={C.line}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <path
        d="M67 66 Q71.5 61 76 66"
        fill="none"
        stroke={C.line}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <path
        d="M56 73 Q58 75.5 60 73 Q62 75.5 64 73"
        fill="none"
        stroke={C.line}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <ellipse cx={42} cy={71} rx={4.5} ry={2.4} fill={C.blush} opacity={0.8} />
      <ellipse cx={78} cy={71} rx={4.5} ry={2.4} fill={C.blush} opacity={0.8} />

      {/* mũ bèo màu kem + băng đô là 1 hàng keycap, núm tròn 2 đầu như trục giấy máy chữ */}
      <path d="M38 24 Q42 12 48 18 Q52 8 60 16 Q68 8 72 18 Q78 12 82 24 Z" fill={C.cream} {...sw} />
      <rect x={30} y={22} width={60} height={9} rx={3} fill={C.dressDark} {...sw} />
      <Keys x={33.5} y={23.2} n={7} s={6.2} gap={1.6} />
      <circle cx={28} cy={26.5} r={4} fill={C.dress} {...sw} />
      <circle cx={92} cy={26.5} r={4} fill={C.dress} {...sw} />
    </svg>
  )
}
