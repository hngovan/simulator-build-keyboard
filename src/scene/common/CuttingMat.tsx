import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import type { GroupProps } from '@react-three/fiber'
import * as THREE from 'three'

// Tấm lót "Voxel Cutting Mat" (shpawen, Sketchfab, CC BY 4.0): 16 ô voxel, tô màu bằng dải palette
const MAT_GLB = '/models/room/voxel_cutting_mat.glb'
useGLTF.preload(MAT_GLB)

/**
 * Tấm lót cắt w × d, dày h (đáy ở y = 0 của group).
 * cover: co giãn đều cho ô lưới không méo, phủ kín (có thể tràn ra) · stretch: vừa khít w × d
 */
export function CuttingMat({
  w,
  d,
  h = 0.07,
  fit = 'cover',
  ...props
}: GroupProps & { w: number; d: number; h?: number; fit?: 'cover' | 'stretch' }) {
  const { scene } = useGLTF(MAT_GLB)
  const { model, size } = useMemo(() => {
    const copy = scene.clone(true)
    copy.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      // model gốc unlit: đổi sang vật liệu có ánh sáng cho hợp phòng, giữ màu palette sắc nét
      const src = m.material as THREE.MeshBasicMaterial
      const map = src.map
      if (map) {
        map.magFilter = THREE.NearestFilter
        map.minFilter = THREE.NearestFilter
        map.colorSpace = THREE.SRGBColorSpace
      }
      m.material = new THREE.MeshStandardMaterial({ map, color: src.color, roughness: 0.9 })
      m.receiveShadow = true
    })
    // dời tâm về gốc trước, rồi mới xoay (group ngoài) để xoay quanh tâm tấm lót.
    // Model dựng dọc (sâu > rộng): xoay ngang -90° cho chiều dài chạy theo bàn, chữ / thước đọc xuôi
    const box = new THREE.Box3().setFromObject(copy)
    const c = box.getCenter(new THREE.Vector3())
    const s = box.getSize(new THREE.Vector3())
    copy.position.set(-c.x, -box.min.y, -c.z)
    const holder = new THREE.Group()
    holder.add(copy)
    holder.rotation.y = -Math.PI / 2
    return { model: holder, size: { w: s.z, h: s.y, d: s.x } }
  }, [scene])
  const k = Math.max(w / size.w, d / size.d)
  const [sx, sz] = fit === 'cover' ? [k, k] : [w / size.w, d / size.d]
  return (
    <group {...props}>
      <group scale={[sx, h / size.h, sz]}>
        <primitive object={model} />
      </group>
    </group>
  )
}
