import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import { ENV_HDR } from '@/scene/common/envMap'
import type * as THREE from 'three'
import { LAYOUTS, getLayout } from '@/data/layouts'
import { CASES, CASE_COLORS, KEYCAP_COLORS, KEYCAP_KITS } from '@/data/parts'
import { ModelViewerFrame, Toggle } from '@/components/ui'
import { CameraView, ViewTabs, useViewState } from '@/scene/common/ViewPresets'
import type { Order } from '@/types'
import { buildKeyboardModel, caseSpec, orderSpec, type KeyboardSpec } from './orderThumb'

/** Bàn phím 3D dựng từ spec: dựng xong mới hiện */
function KeyboardModel({ spec, caseOnly }: { spec: KeyboardSpec; caseOnly?: boolean }) {
  const [obj, setObj] = useState<{ spec: KeyboardSpec; model: THREE.Object3D } | null>(null)
  useEffect(() => {
    let alive = true
    buildKeyboardModel(spec, false, caseOnly).then((model) => alive && setObj({ spec, model }))
    return () => {
      alive = false
    }
  }, [spec, caseOnly])
  // đổi màu: giữ model cũ tới khi model mới dựng xong (không chớp trống)
  return obj ? <primitive object={obj.model} /> : null
}

/**
 * Cửa sổ xem bàn phím 3D (khung chung ModelViewerFrame): xoay / kéo / zoom tự do.
 * Dùng cho đơn hàng (Mezzenger) và case (Shopii, chỉ vỏ case)
 */
export function KeyboardViewer({
  spec,
  title,
  onClose,
  caseOnly,
  footer,
  side,
  corner,
  subtitle,
}: {
  spec: KeyboardSpec
  title: ReactNode
  onClose: () => void
  /** chỉ xem vỏ case (Shopii), không có PCB / switch / keycap */
  caseOnly?: boolean
  footer?: ReactNode
  /** panel thông tin cột phải (Shopii) */
  side?: ReactNode
  /** nổi góc trên phải cảnh (công tắc "Xem khi lắp đủ") */
  corner?: ReactNode
  /** thay dòng phụ mặc định (layout · case · keycap) */
  subtitle?: ReactNode
}) {
  const viewW = Math.max(15, getLayout(spec.layout, spec.variant).width)
  const view = useViewState()
  return (
    <ModelViewerFrame
      title={title}
      side={side}
      corner={corner}
      subtitle={
        subtitle ?? (
          <>
            {LAYOUTS[spec.layout].name} · Case {CASES[spec.caseId].name} (
            {CASE_COLORS[spec.color]?.name})
            {!caseOnly && (
              <>
                {' '}
                · Keycap {KEYCAP_KITS[spec.keycapKit].name} màu{' '}
                {KEYCAP_COLORS[spec.keycapColor].name}
              </>
            )}
          </>
        )
      }
      onClose={onClose}
      footer={footer}
    >
      {/* camera lùi theo bề rộng layout (60% = 15u → [0, 10.5, 15]) để TKL / full không bị cắt 2 bên */}
      <ViewTabs view={view.view} onView={view.pick} />
      <Canvas
        shadows
        camera={{ position: [0, 0.7 * viewW, viewW], fov: 40 }}
        onDoubleClick={view.reset}
      >
        <CameraView view={view.view} nonce={view.nonce} dist={Math.hypot(0.7, 1) * viewW} />
        {/* sáng như studio chụp sản phẩm: môi trường phòng + đèn chính + đèn hắt từ dưới (xem đáy case không tối) */}
        <Environment files={ENV_HDR} />
        <hemisphereLight args={['#ffffff', '#8a90a0', 0.9]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[6, 14, 8]} intensity={1.6} castShadow />
        <directionalLight position={[-8, 6, -6]} intensity={0.7} />
        <directionalLight position={[0, -10, 4]} intensity={0.8} />
        <KeyboardModel spec={spec} caseOnly={caseOnly} />
        <ContactShadows position-y={-0.95} opacity={0.5} scale={40} blur={2.5} />
        <OrbitControls makeDefault minDistance={4} maxDistance={40} />
      </Canvas>
    </ModelViewerFrame>
  )
}

/** Xem chi tiết bàn phím của đơn */
export function OrderViewer({ order, onClose }: { order: Order; onClose: () => void }) {
  const [spec] = useState(() => orderSpec(order))
  return <KeyboardViewer spec={spec} title={`Đơn của ${order.customer}`} onClose={onClose} />
}

/**
 * Xem case trên Shopii / Kho: mặc định chỉ vỏ case đúng màu đang chọn, công tắc "Xem khi lắp đủ" ghép PCB + switch + keycap
 * (keycap trắng bộ Cherry) để xem dáng lúc thành phím
 */
export function CaseViewer({
  caseId,
  color,
  onClose,
  footer,
  side,
  title,
  subtitle,
}: {
  caseId: string
  color: string
  onClose: () => void
  /** dãy nút chọn màu trong khung xem */
  footer?: ReactNode
  /** panel thông tin cột phải (Shopii) */
  side?: ReactNode
  title?: ReactNode
  subtitle?: ReactNode
}) {
  // đổi màu trong khung xem thì dựng lại case
  const spec = useMemo(() => caseSpec(caseId, color), [caseId, color])
  const [full, setFull] = useState(false)
  return (
    <KeyboardViewer
      spec={spec}
      title={title ?? `🛒 ${CASES[caseId].name}`}
      subtitle={subtitle}
      onClose={onClose}
      caseOnly={!full}
      footer={footer}
      side={side}
      corner={
        <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-black/45 py-1 pr-1.5 pl-3 font-head text-xs font-extrabold backdrop-blur-sm">
          Xem khi lắp đủ
          <Toggle checked={full} onChange={setFull} label="Ghép PCB, switch, keycap vào case" />
        </label>
      }
    />
  )
}
