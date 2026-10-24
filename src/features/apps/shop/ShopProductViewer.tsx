import { useEffect, useState, type ReactNode } from 'react'
import { Environment, OrbitControls } from '@react-three/drei'
import { ENV_HDR } from '@/scene/common/envMap'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { ModelViewerFrame } from '@/components/ui'
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
  return scene?.key === key ? <primitive object={scene.model} /> : null
}

/** Xem 3D mọi sản phẩm Shopii: kéo xoay, cuộn zoom (khung dùng chung ModelViewerFrame) */
export function ShopProductViewer({
  kind,
  type,
  title,
  onClose,
  footer,
}: {
  kind: ThumbKind
  type: string
  title: string
  onClose: () => void
  footer?: ReactNode
}) {
  return (
    <ModelViewerFrame title={title} onClose={onClose} footer={footer}>
      {/* camera nhìn chéo từ trên như khung xem case; xoay quanh sản phẩm nhưng không lật xuống dưới */}
      <Canvas camera={{ position: [0, 5, 10], fov: 40 }}>
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
          minPolarAngle={0.15}
          maxPolarAngle={Math.PI / 2 + 0.2}
        />
      </Canvas>
    </ModelViewerFrame>
  )
}
