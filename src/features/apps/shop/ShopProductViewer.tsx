import { useEffect, useState, type ReactNode } from 'react'
import { Environment, OrbitControls } from '@react-three/drei'
import { ENV_HDR } from '@/scene/common/envMap'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { ModelViewerFrame } from '@/components/ui'
import { CameraView, ViewTabs, useViewState } from '@/scene/common/ViewPresets'
import { buildScene, type ThumbKind } from './modelThumb'

/** cạnh dài nhất của sản phẩm trong khung xem (đơn vị cảnh) */
const VIEW_SIZE = 4

function ProductModel({ kind, type }: { kind: ThumbKind; type: string }) {
  const [scene, setScene] = useState<{ key: string; model: THREE.Object3D } | null>(null)
  const key = `${kind}:${type}`
  useEffect(() => {
    let alive = true
    buildScene(kind, type).then((model) => {
      if (!alive) return
      model.updateMatrixWorld(true)
      // mọi sản phẩm (switch nhỏ xíu, PCB / plate dài) thu về cùng cỡ: cạnh dài nhất = VIEW_SIZE,
      // camera cố định như khung xem case, không phải tự fit liên tục
      const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
      const longest = Math.max(size.x, size.y, size.z)
      if (longest > 0) model.scale.multiplyScalar(VIEW_SIZE / longest)
      model.updateMatrixWorld(true)
      const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3())
      model.position.sub(center)
      model.updateMatrixWorld(true)
      setScene({ key, model })
    })
    return () => {
      alive = false
    }
  }, [kind, type, key])
  // đổi option: giữ model cũ tới khi model mới dựng xong (không chớp trống)
  return scene ? <primitive object={scene.model} /> : null
}

/** khoảng cách camera mặc định (góc nghiêng [0, 5, 10] như trước) */
const VIEW_DIST = Math.hypot(5, 10)

/**
 * Xem 3D mọi sản phẩm Shopii: kéo xoay, cuộn zoom, tab góc nhìn Nghiêng / Trên / Trước / Đáy, nhấp đúp đặt lại
 * (khung dùng chung ModelViewerFrame; `side` = panel thông tin + thêm vào giỏ cột phải)
 */
export function ShopProductViewer({
  kind,
  type,
  title,
  subtitle,
  onClose,
  footer,
  side,
}: {
  kind: ThumbKind
  type: string
  title: ReactNode
  subtitle?: ReactNode
  onClose: () => void
  footer?: ReactNode
  side?: ReactNode
}) {
  const view = useViewState()
  return (
    <ModelViewerFrame
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={footer}
      side={side}
    >
      <ViewTabs view={view.view} onView={view.pick} />
      <Canvas camera={{ position: [0, 5, 10], fov: 40 }} onDoubleClick={view.reset}>
        <CameraView view={view.view} nonce={view.nonce} dist={VIEW_DIST} />
        {/* cùng kiểu đèn với khung xem case: môi trường + đèn hắt từ dưới */}
        <Environment files={ENV_HDR} />
        <hemisphereLight args={['#ffffff', '#8a90a0', 0.9]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 8, 7]} intensity={1.8} />
        <directionalLight position={[-5, 3, -4]} intensity={0.8} />
        <directionalLight position={[0, -10, 4]} intensity={0.8} />
        <ProductModel kind={kind} type={type} />
        <OrbitControls
          makeDefault
          target={[0, 0, 0]}
          enablePan={false}
          minDistance={4}
          maxDistance={20}
        />
      </Canvas>
    </ModelViewerFrame>
  )
}
