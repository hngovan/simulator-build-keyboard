// Nhân vật ở màn hình đăng nhập: thợ phím low-poly (tóc nâu, áo xanh, quần cam) giơ 2 tay như đang doạ,
// tay trái cầm bàn phím, tay phải cầm bút hàn nóng (mũi nháy sáng, khói bay). SVG + SMIL, mặt khối chia sáng / tối
const C = {
  skin: '#f2c79b',
  skinDark: '#d9a576',
  hair: '#8a4b27',
  hairDark: '#5e3118',
  shirt: '#33ace0',
  shirtDark: '#1f86b8',
  shirtLight: '#56c3ee',
  pants: '#f07a1f',
  pantsDark: '#c75c0e',
  shoe: '#5a2e18',
}

/** 1 sợi khói bay lên từ mũi bút hàn (gốc toạ độ = mũi bút), `delay` giây */
function Smoke({ delay, dx }: { delay: number; dx: number }) {
  return (
    <path
      d={`M0 0 q${dx} -7 0 -14 q${-dx} -7 0 -14`}
      fill="none"
      stroke="#d5dae6"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0"
    >
      <animate
        attributeName="opacity"
        values="0;0.75;0"
        dur="2.2s"
        begin={`${delay}s`}
        repeatCount="indefinite"
      />
      <animateTransform
        attributeName="transform"
        type="translate"
        values="0 0;0 -16"
        dur="2.2s"
        begin={`${delay}s`}
        repeatCount="indefinite"
      />
    </path>
  )
}

/** Cánh tay giơ lên: vai → khuỷu → bàn tay (2 lớp nét: tối bên dưới, sáng bên trên như mặt khối) */
function Arm({ pts }: { pts: string }) {
  return (
    <>
      <polyline points={pts} fill="none" stroke={C.skinDark} strokeWidth="12" />
      <polyline points={pts} fill="none" stroke={C.skin} strokeWidth="7" />
    </>
  )
}

/** Nắm tay low-poly */
function Fist({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <polygon points="-7,-3 -3,-8 4,-7 8,-1 5,6 -4,7" fill={C.skin} />
      <polygon points="4,-7 8,-1 5,6 0,1" fill={C.skinDark} />
    </g>
  )
}

export function SolderingScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 230"
      className={className}
      role="img"
      aria-label="Thợ phím giơ bút hàn và bàn phím"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {/* bóng dưới chân */}
      <ellipse cx="110" cy="214" rx="46" ry="7" fill="#000" opacity="0.3" />

      {/* cả người nhún nhẹ */}
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0;0 -3;0 0"
          dur="1.6s"
          repeatCount="indefinite"
        />

        {/* chân + giày */}
        <polygon points="86,138 110,138 106,204 88,204" fill={C.pants} />
        <polygon points="110,138 134,138 132,204 114,204" fill={C.pantsDark} />
        <polygon points="98,150 110,138 106,204 100,204" fill={C.pantsDark} opacity="0.5" />
        <polygon points="82,204 106,204 106,212 78,212" fill={C.shoe} />
        <polygon points="114,204 136,204 142,212 114,212" fill={C.shoe} />

        {/* tay trái (bên trái hình) giơ bàn phím; vung nhẹ như doạ */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 84 84;-6 84 84;0 84 84"
            dur="0.9s"
            repeatCount="indefinite"
          />
          <Arm pts="84,84 56,96 44,62" />
          {/* bàn phím: thân tối + 3 hàng keycap */}
          <g transform="translate(40 50) rotate(-18)">
            <rect x="-36" y="-12" width="60" height="22" rx="3" fill="#2b3447" />
            <rect x="-36" y="-12" width="60" height="5" rx="2" fill="#3d4a63" />
            {[0, 1, 2].map((r) =>
              [0, 1, 2, 3, 4, 5, 6].map((c) => (
                <rect
                  key={`${r}-${c}`}
                  x={-33 + c * 8 + (r === 1 ? 2 : 0)}
                  y={-8 + r * 6}
                  width="6"
                  height="4.5"
                  rx="1"
                  fill={r === 2 && c === 6 ? '#ffcc2e' : '#e6e9f0'}
                />
              )),
            )}
          </g>
          <Fist x={44} y={60} />
        </g>

        {/* tay phải giơ bút hàn; vung ngược pha tay trái */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 136 84;6 136 84;0 136 84"
            dur="0.9s"
            begin="0.45s"
            repeatCount="indefinite"
          />
          <Arm pts="136,84 164,96 176,62" />
          {/* bút hàn: tay cầm cam, ống kim loại, mũi nóng */}
          <line x1="170" y1="70" x2="184" y2="44" stroke="#c75c0e" strokeWidth="8" />
          <line x1="170" y1="70" x2="184" y2="44" stroke="#ff6a3d" strokeWidth="5" />
          <line x1="184" y1="44" x2="192" y2="28" stroke="#9aa3b5" strokeWidth="3" />
          <circle cx="193" cy="26" r="3" fill="#ffcc2e">
            <animate attributeName="r" values="2.5;5;2.5" dur="1.1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.5;1" dur="1.1s" repeatCount="indefinite" />
          </circle>
          <g transform="translate(193 24)">
            <Smoke delay={0} dx={3} />
            <Smoke delay={0.75} dx={-3} />
            <Smoke delay={1.5} dx={2} />
          </g>
          <Fist x={176} y={62} />
        </g>

        {/* thân áo thun xanh: mặt trái sáng, phải tối, tay áo ngắn */}
        <polygon points="84,78 110,74 110,140 86,140" fill={C.shirt} />
        <polygon points="110,74 136,78 134,140 110,140" fill={C.shirtDark} />
        <polygon points="84,78 110,74 100,104" fill={C.shirtLight} />
        <polygon points="84,78 70,86 76,100 88,96" fill={C.shirt} />
        <polygon points="136,78 150,86 144,100 132,96" fill={C.shirtDark} />

        {/* cổ + đầu (mặt khối không mắt mũi như ảnh mẫu) */}
        <polygon points="104,64 116,64 116,76 104,76" fill={C.skinDark} />
        <polygon points="110,22 94,30 92,52 102,66 110,60" fill={C.skin} />
        <polygon points="110,22 126,30 128,52 118,66 110,60" fill={C.skinDark} />
        <polygon points="92,52 102,66 110,60 104,48" fill={C.skinDark} opacity="0.35" />
        <polygon points="126,40 132,44 128,52" fill={C.skinDark} />
        {/* tóc */}
        <polygon points="90,36 92,20 106,12 124,14 130,30 122,26 108,28 98,26" fill={C.hair} />
        <polygon points="124,14 130,30 128,40 122,26" fill={C.hairDark} />
        <polygon points="90,36 98,26 96,40" fill={C.hairDark} />
      </g>
    </svg>
  )
}
