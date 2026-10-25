import { useProgress } from '@react-three/drei'
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
      {/* chỉ icon + chữ, không khung viền / thanh tiến độ */}
      <div className="flex flex-col items-center gap-2 drop-shadow-[0_2px_4px_#000a]">
        <span className="animate-bob text-4xl">⌨️</span>
        <span className="font-head text-lg font-extrabold text-yellow">
          {ready ? 'Đang tải mô hình...' : 'Đang dọn bàn build...'}
        </span>
        <span className="text-xs text-muted">
          {active ? `${Math.round(progress)}%` : 'Sắp xong'}
        </span>
      </div>
    </div>
  )
}
