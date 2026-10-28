import * as THREE from 'three'

// Ghế đôn thấp kiểu xưởng (dựng bằng code): mặt gỗ tròn, 4 chân thép đen choãi ra + vòng gác chân.
// Đơn vị mét, gốc = sàn dưới tâm ghế

const SEAT_H = 0.6
const SEAT_R = 0.17
const LEG_R = 0.24
const WOOD = new THREE.MeshStandardMaterial({ color: '#c49a6c', roughness: 0.55 })
const STEEL = new THREE.MeshStandardMaterial({ color: '#2a2c30', roughness: 0.45, metalness: 0.7 })

/** 1 chân: từ dưới mặt ghế choãi ra tới sàn */
function Leg({ angle }: { angle: number }) {
  const top = new THREE.Vector3(Math.cos(angle) * 0.1, SEAT_H - 0.05, Math.sin(angle) * 0.1)
  const foot = new THREE.Vector3(Math.cos(angle) * LEG_R, 0, Math.sin(angle) * LEG_R)
  const mid = top.clone().add(foot).multiplyScalar(0.5)
  const len = top.distanceTo(foot)
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    top.clone().sub(foot).normalize(),
  )
  return (
    <mesh position={mid} quaternion={q} material={STEEL} castShadow>
      <cylinderGeometry args={[0.011, 0.011, len, 8]} />
    </mesh>
  )
}

export function Stool(props: JSX.IntrinsicElements['group']) {
  return (
    <group {...props}>
      <mesh position-y={SEAT_H - 0.02} material={WOOD} castShadow receiveShadow>
        <cylinderGeometry args={[SEAT_R, SEAT_R - 0.01, 0.04, 28]} />
      </mesh>
      {/* đế xoay dưới mặt ghế */}
      <mesh position-y={SEAT_H - 0.06} material={STEEL}>
        <cylinderGeometry args={[0.11, 0.11, 0.03, 20]} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <Leg key={i} angle={Math.PI / 4 + (i * Math.PI) / 2} />
      ))}
      {/* vòng gác chân */}
      <mesh position-y={0.2} rotation-x={Math.PI / 2} material={STEEL}>
        <torusGeometry args={[0.19, 0.008, 6, 32]} />
      </mesh>
      {/* đầu chân cao su */}
      {[0, 1, 2, 3].map((i) => {
        const a = Math.PI / 4 + (i * Math.PI) / 2
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * LEG_R, 0.008, Math.sin(a) * LEG_R]}
            material={STEEL}
          >
            <cylinderGeometry args={[0.016, 0.016, 0.016, 8]} />
          </mesh>
        )
      })}
    </group>
  )
}
