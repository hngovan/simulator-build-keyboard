import { useMemo } from 'react'
import { Clone, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// Dây điện (dựng bằng code) + ổ cắm tường + công tắc đèn (model), dùng chung cho đèn bàn build, máy tính. Đơn vị mét

const CABLE = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.7 })
const PLUG = new THREE.MeshStandardMaterial({ color: '#1c1c1c', roughness: 0.6 })
const SWITCH_GLB = '/models/room/light-switch.glb'
/** mặt sau mặt nạ công tắc lùi sau tâm model 2,5mm: dời ra cho mặt nạ áp sát tường (+0,5mm khỏi chớp hình) */
const SWITCH_BACK = 0.003
useGLTF.preload(SWITCH_GLB)

/** Dây cáp mềm qua các điểm (m, hệ cha) */
export function Cable({ points, r = 0.004 }: { points: [number, number, number][]; r?: number }) {
  const geo = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        48,
        r,
        6,
      ),
    [points, r],
  )
  return <mesh geometry={geo} material={CABLE} castShadow />
}

/**
 * Model ổ cắm đôi "Electrical Wall Outlet" (sacapuntas, Sketchfab, CC BY 4.0): đơn vị file ×10 (thu 0,1 → mặt nạ 8,1 × 12,4cm),
 * tâm mặt nạ ở gốc, mặt ổ quay +z (lỗ cắm ở z +1,6mm), lưng lún sau 5,3mm; 2 ổ ở y ±2,8cm
 */
const OUTLET_GLB = '/models/room/wall-outlet.glb'
useGLTF.preload(OUTLET_GLB)
/** đẩy model ra khỏi tường: lưng mặt nạ sát mặt tường */
const OUTLET_Z = 0.0053

/**
 * Ổ cắm đôi gắn tường (gốc = tâm mặt ổ sát tường, mặt quay +z); `plugged` = số phích đang cắm (0–2, ổ trên trước),
 * dây đi ra từ đáy phích (~2cm dưới tâm ổ trên)
 */
export function Outlet({
  plugged = 1,
  ...props
}: { plugged?: number } & JSX.IntrinsicElements['group']) {
  const { scene } = useGLTF(OUTLET_GLB)
  return (
    <group {...props}>
      <Clone object={scene} position-z={OUTLET_Z} scale={0.1} castShadow receiveShadow />
      {[0.028, -0.028].map(
        (y, i) =>
          i < plugged && (
            <mesh key={y} position={[0, y, OUTLET_Z + 0.0017 + 0.014]} material={PLUG} castShadow>
              <boxGeometry args={[0.032, 0.04, 0.028]} />
            </mesh>
          ),
      )}
    </group>
  )
}

/**
 * Công tắc đèn gắn tường: model "Light Switch" (Avot, Sketchfab, CC BY 4.0; người dùng đưa, `public/models/room/light-switch.glb`,
 * texture thu 512px JPEG + meshopt). Model mét, mặt nạ 70 × 114 × 5mm, mặt trước +x → xoay cho mặt quay +z, đáy mặt nạ sát tường.
 * Gốc = tâm mặt nạ trên mặt tường
 */
export function LightSwitch(props: JSX.IntrinsicElements['group']) {
  const { scene } = useGLTF(SWITCH_GLB)
  return (
    <group {...props}>
      <group position-z={SWITCH_BACK} rotation-y={-Math.PI / 2}>
        <Clone object={scene} castShadow />
      </group>
    </group>
  )
}
