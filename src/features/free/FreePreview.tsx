import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, OrbitControls } from '@react-three/drei'
import { Keyboard } from 'lucide-react'
import { ENV_HDR } from '@/scene/common/envMap'
import { getLayout } from '@/data/layouts'
import { keycapColorOf } from '@/data/parts'
import { Empty } from '@/components/ui'
import { CameraView, ViewTabs, useViewState } from '@/scene/common/ViewPresets'
import { KeyboardModel } from '@/features/apps/messenger/OrderViewer'
import type { KeyboardSpec } from '@/features/apps/messenger/orderThumb'
import { cn } from '@/lib/format'
import { derive, useFreeForm } from './freeForm'

/**
 * Nền acrylic (kiểu Fluent) của khung xem: nhoè mạnh + tăng bão hoà phần phía sau, phủ lớp màu xanh xám sáng (cho thoáng, bàn phím nổi lên), viền sáng mảnh;
 * hạt nhiễu mịn `NOISE` phủ lên trên cho ra chất nhựa mờ
 */
const ACRYLIC =
  'rounded-2xl border border-white/20 bg-[linear-gradient(160deg,rgba(170,188,224,0.42),rgba(96,116,160,0.34))] shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-[44px] backdrop-saturate-150'
/** hoạ tiết chủ đề bàn phím: lưới keycap bo góc so le (như 1 hàng phím lệch nửa phím), nét trắng mờ, lát nền */
const KEYCAPS = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' fill='none' stroke='white' stroke-width='2'%3E%3Crect x='5' y='5' width='38' height='38' rx='8'/%3E%3Crect x='11' y='9' width='26' height='24' rx='5'/%3E%3Crect x='53' y='5' width='38' height='38' rx='8'/%3E%3Crect x='59' y='9' width='26' height='24' rx='5'/%3E%3Crect x='29' y='53' width='38' height='38' rx='8'/%3E%3Crect x='35' y='57' width='26' height='24' rx='5'/%3E%3Cpath d='M-19 61a8 8 0 0 1 8-8h22a8 8 0 0 1 8 8v22a8 8 0 0 1-8 8h-22a8 8 0 0 1-8-8z'/%3E%3Cpath d='M77 61a8 8 0 0 1 8-8h22a8 8 0 0 1 8 8v22a8 8 0 0 1-8 8H85a8 8 0 0 1-8-8z'/%3E%3C/svg%3E")`
/** hạt nhiễu (SVG feTurbulence) lát nền */
const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

/**
 * Khung xem 3D bàn phím theo cấu hình đang chọn ở bảng Free build (case + màu, layout + kiểu layout, bộ + màu keycap):
 * xoay / zoom tự do, đổi lựa chọn thì dựng lại (giữ model cũ tới khi model mới xong)
 */
export function FreePreview() {
  const f = useFreeForm()
  const d = derive(f)
  const view = useViewState()
  // chỉ dựng lại khi phần nhìn thấy đổi (mount / PCB / plate / stab / switch không đổi hình)
  const key =
    f.pick && f.layout && d.kitId
      ? JSON.stringify([f.pick, f.layout, d.variant, d.kitId, d.kcColor])
      : ''
  const spec = useMemo<KeyboardSpec | null>(() => {
    if (!key) return null
    const [pick, layout, variant, keycapKit, keycapColor] = JSON.parse(key)
    return {
      layout,
      variant,
      caseId: pick.caseId,
      color: pick.color,
      botColor: pick.botColor,
      keycapKit,
      keycapColor,
      accent: keycapColorOf(keycapColor).hex,
    }
  }, [key])
  if (!spec)
    return (
      <div className={cn('grid size-full place-items-center p-4', ACRYLIC)}>
        <Empty icon={<Keyboard />}>Chọn case để xem trước bàn phím 3D</Empty>
      </div>
    )
  // camera lùi theo bề rộng layout để TKL / full không bị cắt 2 bên
  const viewW = Math.max(15, getLayout(spec.layout, spec.variant).width)
  return (
    <div className={cn('relative size-full overflow-hidden', ACRYLIC)}>
      {/* hoạ tiết keycap mờ, đậm ở mép nhạt dần vào giữa để không rối sau bàn phím */}
      <i
        aria-hidden
        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,transparent_30%,#000_85%)] opacity-[0.16]"
        style={{ backgroundImage: KEYCAPS }}
      />
      {/* hạt nhiễu mịn của acrylic */}
      <i
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
        style={{ backgroundImage: NOISE }}
      />
      <ViewTabs view={view.view} onView={view.pick} />
      <Canvas camera={{ position: [0, 0.7 * viewW, viewW], fov: 40 }} onDoubleClick={view.reset}>
        <CameraView view={view.view} nonce={view.nonce} dist={Math.hypot(0.7, 1) * viewW} />
        <Environment files={ENV_HDR} />
        <hemisphereLight args={['#ffffff', '#8a90a0', 0.9]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[6, 14, 8]} intensity={1.6} />
        <directionalLight position={[-8, 6, -6]} intensity={0.7} />
        <directionalLight position={[0, -10, 4]} intensity={0.8} />
        <KeyboardModel spec={spec} />
        <OrbitControls makeDefault minDistance={4} maxDistance={40} />
      </Canvas>
      <span className="pointer-events-none absolute right-3 bottom-2 text-xs font-bold text-white/75">
        Kéo để xoay · cuộn để zoom
      </span>
    </div>
  )
}
