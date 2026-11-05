// Logo game (PDF "Logo game — kiểu PC Building Simulator"): icon keycap có stem dấu + trong ô bo góc, chữ nghiêng đậm
// "BUILD KEYBOARD / SIMULATOR". Icon app (mục 03) = ô xanh đậm keycap trắng (favicon `public/favicon.svg`);
// trên màn bắt đầu (mục 04) = ô trắng keycap xanh đậm, chữ trắng + SIMULATOR vàng

/** icon keycap: `bg` = màu ô ngoài + mặt phím + vạch chân, `fg` = màu thân keycap + dấu + */
export function LogoIcon({
  bg = '#ffffff',
  fg = '#1f2340',
  className,
}: {
  bg?: string
  fg?: string
  className?: string
}) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <rect width="64" height="64" rx="14" fill={bg} />
      {/* thân keycap (viền dày) + mặt phím cùng màu ô ngoài */}
      <rect x="9" y="8" width="46" height="47" rx="9" fill={fg} />
      <rect x="14.5" y="12.5" width="35" height="33" rx="6" fill={bg} />
      {/* dấu + (stem MX) */}
      <rect x="28" y="19.5" width="8" height="19" rx="2" fill={fg} />
      <rect x="22.5" y="25" width="19" height="8" rx="2" fill={fg} />
      {/* chân keycap: 2 vạch xiên ở 2 góc đáy */}
      <path
        d="M14.5 51.5l3-3.5M49.5 51.5l-3-3.5"
        stroke={bg}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** logo màn bắt đầu: icon trắng trên, "BUILD KEYBOARD" trắng, "SIMULATOR" vàng (chữ nghiêng đậm Kanit) */
export function GameLogo({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className ?? ''}`}>
      <LogoIcon className="size-24 drop-shadow-[0_6px_0_rgba(0,0,0,0.35)] max-md:size-16" />
      <h1 className="mt-3 font-logo text-[64px] leading-[0.95] font-extrabold tracking-wide text-white uppercase italic [text-shadow:0_5px_0_rgba(0,0,0,0.45)] max-md:text-[36px]">
        Build Keyboard
        <span className="block text-yellow">Simulator</span>
      </h1>
    </div>
  )
}
