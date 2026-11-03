import { useEffect } from 'react'
import { useGame } from '@/store'
import { cn } from '@/lib/format'
import { softwareGpu, startPerfSampling, usePerfHud, usePerfSample } from '@/lib/perfStats'

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

/**
 * Dải thông số hiệu năng góc trái dưới (bật ở Cài đặt → Hiển thị), không bắt chuột. Góc phải đã có bảng chọn đầu vít / chip trạng thái
 * (trên) và avatar Keeb-chan (dưới) nên không đặt bên phải; ngồi máy tính thì nằm trên thanh taskbar
 */
export function PerfHud() {
  const on = usePerfHud((s) => s.on)
  const pc = useGame((s) => s.screen === 'pc')
  useEffect(() => (on ? startPerfSampling() : undefined), [on])
  const s = usePerfSample()
  if (!on) return null
  const soft = softwareGpu(s.gpuName)
  return (
    <div
      className={cn(
        'pointer-events-none fixed left-3 z-[2900] flex max-w-[calc(100vw-24px)] flex-wrap items-center gap-x-3 gap-y-0.5 rounded-xl border-2 border-black/40 bg-[rgba(14,16,24,0.82)] px-2.5 py-1 text-[12px] font-bold shadow-[0_6px_16px_rgba(0,0,0,0.45)]',
        pc ? 'bottom-[calc(var(--taskbar-h)+8px)]' : 'bottom-3',
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
