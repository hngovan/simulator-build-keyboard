import { useEffect, useRef } from 'react'
import { needleAt, type SkillCheck } from '@/data/skillCheck'

/** màu theo khoảng thanh: chưa tới / xanh / quá */
const SKILL_COLORS = {
  turn: 'var(--color-yellow)',
  ok: 'var(--color-green)',
  over: 'var(--color-red)',
} as const

/**
 * Thanh lực / nhiệt (giữ chuột): 3 khoảng cố định nền tối (chưa tới) / xanh (nhả là đạt) / đỏ cuối (quá tay);
 * phần đang giữ vàng → xanh → đỏ theo khoảng, chạy lên rồi tụt xuống. Vẽ bằng requestAnimationFrame (không render lại React mỗi khung)
 */
export function SkillBar({ check, width = 180 }: { check: SkillCheck; width?: number }) {
  const fill = useRef<HTMLDivElement>(null)
  const zone = useRef<HTMLDivElement>(null)
  const mouse = useRef<HTMLDivElement>(null)
  const btn = useRef<SVGPathElement>(null)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const t = needleAt(check)
      const at = t < check.lo ? 'turn' : t < check.hi ? 'ok' : 'over'
      if (fill.current) {
        fill.current.style.width = `${t * 100}%`
        fill.current.style.background = SKILL_COLORS[at]
      }
      // vùng xanh mờ khi chưa tới, tới nơi thì đậm
      if (zone.current) zone.current.style.opacity = at === 'turn' ? '0.2' : '0.75'
      // chuột mô phỏng: đang giữ (lún, nút trái vàng) → vùng xanh (nảy lên + mũi tên ↑ = nhả) → quá tay (đỏ)
      if (mouse.current) mouse.current.dataset.at = at
      if (btn.current) btn.current.setAttribute('fill', SKILL_COLORS[at])
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [check])
  const pct = (x: number) => `${x * 100}%`
  return (
    <div className="pointer-events-none -translate-y-12 select-none" style={{ width }}>
      <div className="relative h-4 overflow-hidden border-2 border-black/60 bg-[#1b1f28]">
        <div
          ref={zone}
          className="absolute inset-y-0 bg-green"
          style={{ left: pct(check.lo), width: pct(check.hi - check.lo) }}
        />
        <div className="absolute inset-y-0 right-0 bg-red/45" style={{ left: pct(check.hi) }} />
        <div ref={fill} className="relative h-full bg-yellow" style={{ width: 0 }} />
      </div>
      {/* icon chuột thay chữ hướng dẫn: giữ nút trái, tới vùng xanh thì nhả */}
      <div
        ref={mouse}
        data-at="turn"
        className="group mt-1 flex items-center justify-center gap-1 drop-shadow-[0_1px_1px_#000]"
      >
        <svg
          viewBox="0 0 20 28"
          className="h-7 w-5 translate-y-0.5 transition-transform duration-100 group-data-[at=ok]:-translate-y-0.5"
          aria-hidden
        >
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
          <path ref={btn} d="M10 1.8 A8.2 8.2 0 0 0 1.8 10 V11 H10 Z" fill={SKILL_COLORS.turn} />
          <line x1="10" y1="1" x2="10" y2="11" stroke="#141821" strokeWidth="1.4" />
          <line x1="1.5" y1="11" x2="18.5" y2="11" stroke="#141821" strokeWidth="1.4" />
          <rect
            x="8"
            y="4"
            width="4"
            height="5"
            rx="2"
            fill="#94a0b8"
            stroke="#141821"
            strokeWidth="1"
          />
        </svg>
        <span className="hidden animate-pulse text-sm font-extrabold text-green group-data-[at=ok]:inline">
          ↑
        </span>
      </div>
    </div>
  )
}
