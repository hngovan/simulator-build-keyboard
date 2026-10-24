import { useProgress } from '@react-three/drei'
import { ProgressBar } from '@/components/ui'
import { cn } from '@/lib/format'
import { useSceneLoading } from '@/scene/common/loadingStore'

// Màn hình chờ khi tải cảnh 3D: phủ kín lúc vào bàn build lần đầu, phủ mờ khi bước mới cần tải model
export function BenchLoader() {
  const ready = useSceneLoading((s) => s.ready)
  const stepLoading = useSceneLoading((s) => s.pending > 0)
  const { active, progress } = useProgress()
  if (ready && !stepLoading) return null
  return (
    <div
      className={cn(
        'fixed inset-0 grid animate-fade-in place-items-center',
        ready ? 'pointer-events-none z-[4] bg-black/35' : 'z-[50] bg-bg',
      )}
    >
      <div className="flex w-[260px] flex-col items-center gap-3 rounded-2xl border-[3px] border-yellow bg-[rgba(14,16,24,0.92)] px-5 py-4 shadow-[0_6px_0_#0006]">
        <span className="animate-bob text-4xl">⌨️</span>
        <span className="font-head text-lg font-extrabold text-yellow">
          {ready ? 'Đang tải mô hình...' : 'Đang dọn bàn build...'}
        </span>
        <ProgressBar value={active ? progress / 100 : 1} className="w-full" />
        <span className="text-xs text-muted">
          {active ? `${Math.round(progress)}%` : 'Sắp xong'}
        </span>
      </div>
    </div>
  )
}
