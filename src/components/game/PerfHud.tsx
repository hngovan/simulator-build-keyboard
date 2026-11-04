import { useEffect, useState } from 'react'
import { useGame } from '@/store'
import { cn } from '@/lib/format'
import {
  setPerfCorner,
  softwareGpu,
  startPerfSampling,
  usePerfCorner,
  usePerfHud,
  usePerfSample,
  type PerfCorner,
} from '@/lib/perfStats'

/** màu theo ngưỡng: tốt xanh / vừa vàng / tệ đỏ */
const tone = (bad: boolean, warn: boolean) =>
  bad ? 'text-red' : warn ? 'text-yellow' : 'text-green'
const pctTone = (v: number | null) => (v == null ? 'text-muted' : tone(v >= 85, v >= 60))

function Stat({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <span className="flex items-baseline gap-1 whitespace-nowrap">
      <span className="text-muted">{label}</span>
      <span className={cn('font-head tabular-nums', className)}>{value}</span>
    </span>
  )
}

const pct = (v: number | null) => (v == null ? '—' : `${v}%`)
const kilo = (v: number) =>
  v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : `${v}`

/** vị trí từng góc; ngồi máy tính thì góc dưới nằm trên thanh taskbar */
const CORNER_CLS: Record<PerfCorner, string> = {
  tl: 'top-3 left-3',
  tr: 'top-3 right-3',
  bl: 'left-3',
  br: 'right-3',
}

/**
 * Dải thông số hiệu năng (chỉ khi dev, bật ở Cài đặt → Dev). Kéo thả được: thả ra thì hút vào góc gần nhất
 * (4 góc, lưu theo máy `setPerfCorner`)
 */
export function PerfHud() {
  const on = usePerfHud((s) => s.on)
  const corner = usePerfCorner((s) => s.corner)
  const pc = useGame((s) => s.screen === 'pc')
  // đang kéo: toạ độ góc trên trái khung + điểm bấm lệch so với khung
  const [drag, setDrag] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null)
  useEffect(() => (on ? startPerfSampling() : undefined), [on])
  const s = usePerfSample()
  if (!on) return null
  const soft = softwareGpu(s.gpuName)
  const bottom = corner[0] === 'b'
  return (
    <div
      title="Kéo sang góc khác"
      onPointerDown={(e) => {
        if (e.button !== 0) return
        const r = e.currentTarget.getBoundingClientRect()
        e.currentTarget.setPointerCapture(e.pointerId)
        setDrag({ x: r.left, y: r.top, dx: e.clientX - r.left, dy: e.clientY - r.top })
      }}
      onPointerMove={(e) =>
        drag && setDrag({ ...drag, x: e.clientX - drag.dx, y: e.clientY - drag.dy })
      }
      onPointerUp={(e) => {
        if (!drag) return
        setDrag(null)
        const v = e.clientY < window.innerHeight / 2 ? 't' : 'b'
        const h = e.clientX < window.innerWidth / 2 ? 'l' : 'r'
        setPerfCorner(`${v}${h}` as PerfCorner)
      }}
      onPointerCancel={() => setDrag(null)}
      style={drag ? { left: drag.x, top: drag.y } : undefined}
      className={cn(
        'fixed z-[2900] flex max-w-[calc(100vw-24px)] cursor-pointer touch-none flex-wrap items-center gap-x-3 gap-y-0.5 rounded-xl border-2 border-black/40 bg-[rgba(14,16,24,0.82)] px-2.5 py-1 text-[12px] font-bold shadow-[0_6px_16px_rgba(0,0,0,0.45)] select-none',
        drag ? 'opacity-80' : CORNER_CLS[corner],
        !drag && bottom && (pc ? 'bottom-[calc(var(--taskbar-h)+8px)]' : 'bottom-3'),
      )}
    >
      <Stat label="FPS" value={`${s.fps}`} className={tone(s.fps < 30, s.fps < 50)} />
      <Stat
        label="chậm nhất"
        value={`${s.worstMs}ms`}
        className={tone(s.worstMs > 50, s.worstMs > 25)}
      />
      <Stat label="CPU" value={pct(s.cpu)} className={pctTone(s.cpu)} />
      <Stat label="GPU" value={pct(s.gpu)} className={pctTone(s.gpu)} />
      <Stat
        label="RAM"
        value={s.ramMb == null ? '—' : `${s.ramMb}MB`}
        className={pctTone(s.ramPct)}
      />
      {s.calls != null && (
        <Stat label="Draw" value={`${s.calls} · ${kilo(s.tris ?? 0)}`} className="text-ink" />
      )}
      {soft && <span className="text-red">⚠ Chrome đang vẽ bằng CPU</span>}
    </div>
  )
}
