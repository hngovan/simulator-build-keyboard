import { useEffect, useRef } from 'react'
import { needleAt, type SkillCheck } from '@/data/skillCheck'

/**
 * Thanh skill check: nền đỏ (trái = chưa tới, phải = quá tay), vùng xanh đạt, vùng vàng hoàn hảo, kim trắng chạy qua lại.
 * Kim vẽ bằng requestAnimationFrame (không render lại React mỗi khung)
 */
export function SkillBar({ check, width = 200 }: { check: SkillCheck; width?: number }) {
  const needle = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      if (needle.current) needle.current.style.left = `${needleAt(check) * 100}%`
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [check])
  const pct = (x: number) => `${x * 100}%`
  return (
    <div className="pointer-events-none -translate-y-12 select-none" style={{ width }}>
      <div className="relative h-4 border-2 border-black/60 bg-red/70">
        <div
          className="absolute inset-y-0 bg-green"
          style={{ left: pct(check.lo), width: pct(check.hi - check.lo) }}
        />
        <div
          className="absolute inset-y-0 bg-yellow"
          style={{ left: pct(check.plo), width: pct(check.phi - check.plo) }}
        />
        <div
          ref={needle}
          className="absolute -inset-y-1.5 w-1 -translate-x-1/2 bg-white shadow-[0_0_0_1px_#000a]"
        />
      </div>
      <div className="mt-1 text-center text-[10px] font-bold whitespace-nowrap text-white drop-shadow-[0_1px_1px_#000]">
        Bấm lần nữa / Space để dừng kim
      </div>
    </div>
  )
}
