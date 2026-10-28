import { useMemo } from 'react'
import * as THREE from 'three'

// Dây điện + ổ cắm tường (dựng bằng code, dùng chung cho đèn bàn build, máy tính). Đơn vị mét

const CABLE = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.7 })
const PLATE = new THREE.MeshStandardMaterial({ color: '#efece6', roughness: 0.5 })
const HOLE = new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.8 })
const PLUG = new THREE.MeshStandardMaterial({ color: '#1c1c1c', roughness: 0.6 })

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
 * Ổ cắm đôi gắn tường (gốc = tâm mặt ổ sát tường, mặt quay +z); `plugged` = số phích đang cắm (0–2, ổ trên trước),
 * dây đi ra từ đáy phích (~2cm dưới tâm ổ trên)
 */
export function Outlet({
  plugged = 1,
  ...props
}: { plugged?: number } & JSX.IntrinsicElements['group']) {
  return (
    <group {...props}>
      <mesh position-z={0.004} material={PLATE} castShadow>
        <boxGeometry args={[0.08, 0.13, 0.008]} />
      </mesh>
      {[0.03, -0.03].map((y, i) => (
        <group key={y} position={[0, y, 0.009]}>
          <mesh rotation-x={Math.PI / 2} material={PLATE}>
            <cylinderGeometry args={[0.022, 0.022, 0.004, 20]} />
          </mesh>
          {[-0.009, 0.009].map((x) => (
            <mesh key={x} position={[x, 0, 0.0025]} rotation-x={Math.PI / 2} material={HOLE}>
              <cylinderGeometry args={[0.0025, 0.0025, 0.002, 8]} />
            </mesh>
          ))}
          {i < plugged && (
            <mesh position-z={0.017} material={PLUG} castShadow>
              <boxGeometry args={[0.032, 0.04, 0.028]} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}
