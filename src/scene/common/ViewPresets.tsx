import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { cn } from '@/lib/format'

/** góc nhìn có sẵn của khung xem 3D (Shopii, case, đơn) */
export type ViewId = 'angle' | 'top' | 'front' | 'bottom'

/** tỉ lệ khung xem cũ (rộng hết, không panel) mà khoảng cách camera gốc được chỉnh theo */
const BASE_ASPECT = 1.6

const VIEWS: { id: ViewId; name: string; dir: [number, number, number] }[] = [
  // nghiêng = góc mặc định của khung xem (camera [0, 0.7, 1] × khoảng cách)
  { id: 'angle', name: 'Nghiêng', dir: [0, 0.7, 1] },
  // lệch 1 chút khỏi trục y để OrbitControls không bị kẹt ở cực
  { id: 'top', name: 'Trên', dir: [0, 1, 0.001] },
  { id: 'front', name: 'Trước', dir: [0, 0.12, 1] },
  { id: 'bottom', name: 'Đáy', dir: [0, -1, 0.001] },
]

/**
 * Trong <Canvas>: đổi `view` (hoặc `nonce` khi bấm lại / nhấp đúp) thì camera bay mượt tới góc đó, khoảng cách `dist`,
 * nhìn vào gốc toạ độ. Kéo chuột giữa chừng thì dừng bay (người chơi tự xoay)
 */
export function CameraView({ view, nonce, dist }: { view: ViewId; nonce: number; dist: number }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as
    | (THREE.EventDispatcher<{ start: object }> & { target: THREE.Vector3; update: () => void })
    | null
  const goal = useRef<THREE.Vector3 | null>(null)
  const first = useRef(true)
  // fov tính theo chiều dọc: khung hẹp hơn tỉ lệ gốc (khung xem có panel phải) thì lùi camera cho khỏi cắt 2 bên
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height))
  const fit = dist * Math.max(1, BASE_ASPECT / aspect)
  useEffect(() => {
    const dir = VIEWS.find((v) => v.id === view)!.dir
    const to = new THREE.Vector3(...dir).normalize().multiplyScalar(fit)
    // lần đầu mở khung: đặt thẳng, không bay
    if (first.current) {
      first.current = false
      camera.position.copy(to)
      camera.lookAt(0, 0, 0)
      return
    }
    goal.current = to
  }, [view, nonce, fit, camera])
  useEffect(() => {
    if (!controls) return
    const stop = () => (goal.current = null)
    controls.addEventListener('start', stop)
    return () => controls.removeEventListener('start', stop)
  }, [controls])
  useFrame((_, dt) => {
    const to = goal.current
    if (!to) return
    camera.position.lerp(to, 1 - Math.exp(-dt * 9))
    controls?.target.lerp(new THREE.Vector3(), 1 - Math.exp(-dt * 9))
    if (camera.position.distanceTo(to) < 0.01) {
      camera.position.copy(to)
      controls?.target.set(0, 0, 0)
      goal.current = null
    }
    if (controls) controls.update()
    else camera.lookAt(0, 0, 0)
  })
  return null
}

/** góc nhìn đang chọn + `nonce` (bấm lại cùng góc / nhấp đúp đặt lại vẫn bay về) */
export function useViewState() {
  const [state, setState] = useState({ view: 'angle' as ViewId, nonce: 0 })
  const pick = (view: ViewId) => setState((s) => ({ view, nonce: s.nonce + 1 }))
  return { ...state, pick, reset: () => pick('angle') }
}

/** Hàng tab góc nhìn nổi góc trên trái khung xem (đang chọn = khối vàng) */
export function ViewTabs({ view, onView }: { view: ViewId; onView: (v: ViewId) => void }) {
  return (
    <div className="absolute top-3 left-3 z-10 flex gap-1 rounded-xl bg-black/45 p-1 backdrop-blur-sm">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          type="button"
          aria-pressed={view === v.id}
          onClick={() => onView(v.id)}
          className={cn(
            'rounded-lg px-3 py-1 font-head text-xs font-extrabold transition-colors',
            view === v.id
              ? 'bg-yellow text-[#3a2b00] shadow-[0_2px_0_rgba(0,0,0,0.35)]'
              : 'text-ink/85 hover:bg-white/10',
          )}
        >
          {v.name}
        </button>
      ))}
    </div>
  )
}
