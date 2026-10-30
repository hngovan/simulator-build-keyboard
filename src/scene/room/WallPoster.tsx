import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

// Poster giấy dán thẳng lên tường (không khung, người dùng: "kiểu banner dán trên tường, không phải khung tranh"):
// tấm giấy phẳng sát tường + 4 miếng băng keo giấy chéo ở góc. Đơn vị mét; gốc = tâm poster trên mặt tường, mặt quay +z

/** cách mặt tường (m): đủ khỏi chớp hình với tường */
const LIFT = 0.002
/** băng keo giấy (m): dài, bản, màu kem mờ */
const TAPE = { l: 0.06, w: 0.018 }
const tapeMat = new THREE.MeshStandardMaterial({
  color: '#efe6cf',
  roughness: 0.9,
  transparent: true,
  opacity: 0.85,
})

export function WallPoster({
  url,
  w,
  h,
  ...props
}: { url: string; w: number; h: number } & JSX.IntrinsicElements['group']) {
  const tex = useTexture(url, (t) => {
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
  })
  return (
    <group {...props}>
      <mesh position-z={LIFT} receiveShadow>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} roughness={0.75} />
      </mesh>
      {/* băng keo chéo 45° ở 4 góc, đè lên mép giấy */}
      {[
        [-1, 1],
        [1, 1],
        [-1, -1],
        [1, -1],
      ].map(([sx, sy]) => (
        <mesh
          key={`${sx}${sy}`}
          position={[(sx * w) / 2, (sy * h) / 2, LIFT * 2]}
          rotation-z={(sx * sy * Math.PI) / 4}
          material={tapeMat}
        >
          <planeGeometry args={[TAPE.l, TAPE.w]} />
        </mesh>
      ))}
    </group>
  )
}
