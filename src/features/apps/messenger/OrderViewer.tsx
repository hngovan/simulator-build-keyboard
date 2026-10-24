import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import { ENV_HDR } from '@/scene/common/envMap'
import type * as THREE from 'three'
import { LAYOUTS } from '@/data/layouts'
import { CASES, CASE_COLORS, KEYCAP_COLORS, KEYCAP_KITS } from '@/data/parts'
import { ModelViewerFrame } from '@/components/ui'
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
  return obj?.spec === spec ? <primitive object={obj.model} /> : null
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
}: {
  spec: KeyboardSpec
  title: ReactNode
  onClose: () => void
  /** chỉ xem vỏ case (Shopii), không có PCB / switch / keycap */
  caseOnly?: boolean
  footer?: ReactNode
}) {
  return (
    <ModelViewerFrame
      title={title}
      subtitle={
        <>
          {LAYOUTS[spec.layout].name} · Case {CASES[spec.caseId].name} (
          {CASE_COLORS[spec.color]?.name})
          {!caseOnly && (
            <>
              {' '}
              · Keycap {KEYCAP_KITS[spec.keycapKit].name} màu {KEYCAP_COLORS[spec.keycapColor].name}
            </>
          )}
        </>
      }
      onClose={onClose}
      footer={footer}
    >
      <Canvas shadows camera={{ position: [0, 10.5, 15], fov: 40 }}>
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

/** Xem case trên Shopii: chỉ vỏ case đúng màu đang chọn (không ghép PCB / keycap) */
export function CaseViewer({
  caseId,
  color,
  onClose,
  footer,
}: {
  caseId: string
  color: string
  onClose: () => void
  /** dãy nút chọn màu trong khung xem */
  footer?: ReactNode
}) {
  // đổi màu trong khung xem thì dựng lại case
  const spec = useMemo(() => caseSpec(caseId, color), [caseId, color])
  return (
    <KeyboardViewer
      spec={spec}
      title={`🛒 ${CASES[caseId].name}`}
      onClose={onClose}
      caseOnly
      footer={footer}
    />
  )
}
