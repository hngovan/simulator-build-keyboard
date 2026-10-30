import { useEffect, useRef } from 'react'
import { needleAt, type SkillCheck } from '@/data/skillCheck'

/**
 * Thanh lực / nhiệt (giữ chuột): 3 khoảng cố định nền tối (chưa tới) / xanh (nhả là đạt) / đỏ cuối (quá tay);
 * phần đang giữ vàng → xanh → đỏ theo khoảng, chạy lên rồi tụt xuống. Vẽ bằng requestAnimationFrame (không render lại React mỗi khung)
 */
export function SkillBar({ check, width = 180 }: { check: SkillCheck; width?: number }) {
  const fill = useRef<HTMLDivElement>(null)
  const zone = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const t = needleAt(check)
      const at = t < check.lo ? 'turn' : t < check.hi ? 'ok' : 'over'
      if (fill.current) {
        fill.current.style.width = `${t * 100}%`
        fill.current.style.background =
          at === 'turn'
            ? 'var(--color-yellow)'
            : at === 'ok'
              ? 'var(--color-green)'
              : 'var(--color-red)'
      }
      // vùng xanh mờ khi chưa tới, tới nơi thì đậm
      if (zone.current) zone.current.style.opacity = at === 'turn' ? '0.2' : '0.75'
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
      <div className="mt-1 text-center text-[10px] font-bold whitespace-nowrap text-white drop-shadow-[0_1px_1px_#000]">
        Giữ chuột, nhả trong vùng xanh
      </div>
    </div>
  )
}
