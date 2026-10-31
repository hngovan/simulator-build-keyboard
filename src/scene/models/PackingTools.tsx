import { useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'

// Dụng cụ đóng / mở thùng carton (tự dựng bằng code, đơn vị mét): dao rọc giấy (bước mở hộp) + súng dán băng keo cầm tay
// (đóng gói / cất đơn). Gốc toạ độ = điểm chạm mặt thùng (mũi dao / con lăn dán băng), hướng kéo = +z

const METAL = new THREE.MeshStandardMaterial({ color: '#c9ced6', metalness: 0.9, roughness: 0.25 })
const DARK = new THREE.MeshStandardMaterial({ color: '#23262d', roughness: 0.7 })
const GREY = new THREE.MeshStandardMaterial({ color: '#6c7380', metalness: 0.5, roughness: 0.45 })

/** lưỡi dao rọc giấy bẻ được: hình thang vát mũi, mũi ở gốc toạ độ, dài theo +x */
function useBladeGeometry() {
  return useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0, 0)
    s.lineTo(0.032, 0)
    s.lineTo(0.032, 0.009)
    s.lineTo(0.009, 0.009)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.0006, bevelEnabled: false })
    g.translate(0, 0, -0.0003)
    return g
  }, [])
}

/**
 * Dao rọc giấy: cán nhựa vàng bo góc + 2 miếng cao su đen 2 bên, nút trượt, mũi kim loại, lưỡi vát thò ra.
 * Mũi lưỡi ở gốc, cán chĩa về −z và nghiêng lên (cầm kéo dao về +z)
 */
export function BoxCutter(props: JSX.IntrinsicElements['group']) {
  const blade = useBladeGeometry()
  return (
    <group {...props}>
      <group rotation-y={Math.PI / 2}>
        <group rotation-z={0.55}>
          <mesh geometry={blade} material={METAL} castShadow />
          {/* mũi kim loại giữ lưỡi */}
          <mesh position={[0.038, 0.0045, 0]} material={METAL} castShadow>
            <boxGeometry args={[0.014, 0.017, 0.012]} />
          </mesh>
          {/* cán vàng */}
          <RoundedBox
            args={[0.12, 0.022, 0.016]}
            radius={0.006}
            smoothness={3}
            position={[0.103, 0.0045, 0]}
            castShadow
          >
            <meshStandardMaterial color="#f4c20d" roughness={0.45} />
          </RoundedBox>
          {/* cao su đen 2 bên cán */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0.115, 0.004, s * 0.0083]} material={DARK}>
              <boxGeometry args={[0.075, 0.013, 0.0015]} />
            </mesh>
          ))}
          {/* nút trượt đẩy lưỡi */}
          <mesh position={[0.06, 0.0165, 0]} material={GREY}>
            <boxGeometry args={[0.014, 0.004, 0.008]} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

/**
 * Súng dán băng keo cầm tay: cuộn băng (màu `tape`, rộng 48mm) trên lõi giấy, tấm khung xám 1 bên, tay cầm đỏ, con lăn ép băng
 * + lưỡi cắt răng cưa ở mũi. Con lăn (điểm ép băng xuống mặt thùng) ở gốc, cuộn băng phía sau − trên, súng kéo về +z
 */
export function TapeGun({
  tape,
  ...props
}: { tape: THREE.Material } & JSX.IntrinsicElements['group']) {
  const R = 0.048
  return (
    <group {...props}>
      {/* cuộn băng: trục x, tâm sau − trên con lăn */}
      <group position={[0, 0.062, -0.05]}>
        <mesh rotation-z={Math.PI / 2} material={tape} castShadow>
          <cylinderGeometry args={[R, R, 0.048, 28]} />
        </mesh>
        {/* lõi giấy: 2 mặt tròn nhạt màu ở 2 đầu cuộn */}
        {[-1, 1].map((s) => (
          <mesh key={s} position-x={s * 0.0242} rotation-y={(s * Math.PI) / 2}>
            <ringGeometry args={[0.03, 0.036, 24]} />
            <meshStandardMaterial color="#d9b88a" roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
        ))}
        {/* trục giữa */}
        <mesh rotation-z={Math.PI / 2} material={GREY}>
          <cylinderGeometry args={[0.008, 0.008, 0.07, 12]} />
        </mesh>
      </group>
      {/* tấm khung xám bên phải: nối trục cuộn, con lăn, tay cầm */}
      <mesh position={[0.034, 0.04, -0.03]} material={GREY} castShadow>
        <boxGeometry args={[0.004, 0.09, 0.12]} />
      </mesh>
      {/* tay cầm đỏ chĩa lên − sau */}
      <RoundedBox
        args={[0.026, 0.11, 0.034]}
        radius={0.01}
        smoothness={3}
        position={[0.034, 0.13, -0.075]}
        rotation-x={-0.5}
        castShadow
      >
        <meshStandardMaterial color="#d6332f" roughness={0.5} />
      </RoundedBox>
      {/* con lăn ép băng (gốc toạ độ) */}
      <mesh position-y={0.008} rotation-z={Math.PI / 2} material={DARK}>
        <cylinderGeometry args={[0.008, 0.008, 0.056, 14]} />
      </mesh>
      {/* lưỡi cắt răng cưa trước con lăn */}
      <mesh position={[0, 0.012, 0.016]} rotation-x={0.6} material={METAL}>
        <boxGeometry args={[0.056, 0.012, 0.0012]} />
      </mesh>
      {/* dải băng từ cuộn xuống con lăn */}
      <mesh position={[0, 0.03, -0.022]} rotation-x={0.75} material={tape}>
        <boxGeometry args={[0.048, 0.0008, 0.05]} />
      </mesh>
    </group>
  )
}
