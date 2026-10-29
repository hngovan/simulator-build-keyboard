import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { WINDOW } from './roomLayout'

// Cửa sổ dựng bằng code: khung gỗ nâu 4 ô kính, nền sau kính trắng bóng như gương
// (sân vườn 3D thật đã thử rồi bỏ: nặng máy),
// rèm lá (model `VenetianBlind`) hạ kín: nắng lọt qua khe lá thành vài vệt sọc mờ xiên xuống sàn.
// Đơn vị mét; gốc = mặt tường, giữa bậu cửa sổ; +z quay vào phòng

/** khung + bậu cửa gỗ nâu (vân óc chó Poly Haven CC0 có sẵn trong game, người dùng: "khung cửa gỗ nâu") */
const WOOD_TEX = new THREE.TextureLoader().load('/textures/room/walnut_veneer_diff_1k.jpg', (t) => {
  t.colorSpace = THREE.SRGBColorSpace
})
const FRAME = new THREE.MeshStandardMaterial({ map: WOOD_TEX, color: '#b07a4f', roughness: 0.55 })
/**
 * Rèm lá "Venetian frame window" (người dùng đưa, Sketchfab, chưa rõ giấy phép → chỉ dùng cá nhân): ray + lá + dây + gậy xoay,
 * rộng 1m cao 1,66m, gốc = giữa chân rèm, mặt quay +z
 */
const BLIND_GLB = '/models/room/venetian-blind.glb'
/** gỗ sồi cho lá rèm: vân `oak_veneer_01` (Poly Haven CC0), lặp dọc lá (UV tự sinh, xem `woodUv`) */
const OAK_TEX = new THREE.TextureLoader().load('/textures/room/oak_veneer_01_diff_1k.jpg', (t) => {
  t.colorSpace = THREE.SRGBColorSpace
})
OAK_TEX.wrapS = OAK_TEX.wrapT = THREE.RepeatWrapping
const BLIND_WOOD = new THREE.MeshStandardMaterial({
  map: OAK_TEX,
  color: '#c99a66',
  roughness: 0.5,
})

/**
 * Model rèm không có UV ở lá / ray: sinh UV phẳng theo toạ độ model (m) — u chạy dọc lá (x), v theo bề ngang lá (y + z)
 * → vân gỗ chạy dọc lá như lá gỗ thật
 */
function woodUv(g: THREE.BufferGeometry) {
  const pos = g.getAttribute('position')
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) * 1.5
    uv[i * 2 + 1] = (pos.getY(i) + pos.getZ(i)) * 6
  }
  const out = g.clone()
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return out
}
useGLTF.preload(BLIND_GLB)

/** rèm lá co giãn vừa ô cửa w × h (m), chân rèm ở y = 0 */
function VenetianBlind({
  w,
  h,
  ...props
}: { w: number; h: number } & JSX.IntrinsicElements['group']) {
  const { scene } = useGLTF(BLIND_GLB)
  const model = useMemo(() => {
    const copy = scene.clone(true)
    copy.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.castShadow = m.receiveShadow = true
      // rèm gỗ sồi có vân: lá, ray, thanh đáy, gậy xoay (người dùng: "rèm gỗ", "không thấy vân gỗ sồi"); dây giữ nguyên
      if (!/string/i.test(m.name) && !/string/i.test(m.parent?.name ?? '')) {
        m.geometry = woodUv(m.geometry)
        m.material = BLIND_WOOD
      }
    })
    copy.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(copy)
    const size = box.getSize(new THREE.Vector3())
    const g = new THREE.Group()
    copy.scale.set(w / size.x, h / size.y, 1)
    copy.position.set(
      (-(box.min.x + box.max.x) / 2) * (w / size.x),
      -box.min.y * (h / size.y),
      -(box.min.z + box.max.z) / 2,
    )
    g.add(copy)
    return g
  }, [scene, w, h])
  return (
    <group {...props}>
      <primitive object={model} />
    </group>
  )
}

/** bước lá, bản lá (m), góc nghiêng lá: chỉ dùng tính khe lọt nắng (vệt sáng), lá thật là model `VenetianBlind` */
const SLAT_STEP = 0.025
const SLAT_W = 0.028
const SLAT_TILT = 1.2
/** cứ mấy khe lá vẽ 1 vệt nắng: chỉ lọt ít nắng (người dùng: "ít ánh sáng thôi") */
const RAY_EVERY = 9
/** hướng nắng chiếu vào (xiên xuống, lệch sang phải) */
const SUN = new THREE.Vector3(0.25, -0.62, 1).normalize()

/** nền sau kính: trắng tự sáng + phủ bóng phản chiếu môi trường như mặt gương */
const MIRROR = new THREE.MeshPhysicalMaterial({
  color: '#ffffff',
  emissive: '#eef3f8',
  emissiveIntensity: 0.85,
  roughness: 0.04,
  metalness: 0.1,
  clearcoat: 1,
  clearcoatRoughness: 0.02,
})

/**
 * Vệt nắng lọt qua khe rèm lá: mỗi khe (dải ngang mỏng trong mặt cửa sổ) quét theo hướng nắng tới sàn thành
 * 1 lăng trụ vẽ cộng sáng mờ; kèm các dải sáng trên sàn
 */
function raysGeometry(w: number, ys: number[], gap: number, floorY: number) {
  const shaft: number[] = []
  const floor: number[] = []
  const push = (out: number[], vs: THREE.Vector3[]) => vs.forEach((v) => out.push(v.x, v.y, v.z))
  for (const y of ys) {
    const near = [
      [-w / 2, y],
      [w / 2, y],
      [w / 2, y + gap],
      [-w / 2, y + gap],
    ].map(([x, yy]) => new THREE.Vector3(x, yy, 0.06))
    const far = near.map((c) => c.clone().addScaledVector(SUN, (c.y - floorY) / -SUN.y))
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4
      push(shaft, [near[i], near[j], far[j], near[i], far[j], far[i]])
    }
    const [a, b, c, d] = far.map((v) => v.clone().setY(v.y + 0.003))
    push(floor, [a, b, c, a, c, d])
  }
  const geo = (pos: number[]) => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    return g
  }
  return { shaft: geo(shaft), floor: geo(floor) }
}

/** size: cỡ cửa sổ (mặc định cửa sổ lớn trong phòng `WINDOW`) */
export function RoomWindow({
  size = WINDOW,
  ...props
}: { size?: { w: number; h: number; sill: number } } & JSX.IntrinsicElements['group']) {
  const { w, h, sill } = size
  // rèm lá treo trong lòng khung, từ hộp ray trên xuống sát bậu
  const blindW = w - 0.02
  const slats = useMemo(
    () =>
      Array.from(
        { length: Math.floor((h - 0.06) / SLAT_STEP) },
        (_, i) => h - 0.07 - i * SLAT_STEP,
      ),
    [h],
  )
  // khe hở giữa 2 lá khi nghiêng gần khép
  const gap = SLAT_STEP - SLAT_W * Math.sin(SLAT_TILT)
  const rays = useMemo(
    () =>
      raysGeometry(
        blindW,
        slats.filter((_, i) => i % RAY_EVERY === 4).map((y) => y - gap / 2),
        Math.max(gap, 0.004),
        -sill,
      ),
    [blindW, slats, gap, sill],
  )
  const fr = 0.05
  return (
    <group {...props}>
      {/* nền sau kính: trắng sáng bóng như gương (người dùng: thay cảnh vẽ ngoài trời) */}
      <mesh position={[0, h / 2, 0.004]} material={MIRROR}>
        <planeGeometry args={[w, h]} />
      </mesh>
      {/* kính */}
      <mesh position={[0, h / 2, 0.03]}>
        <planeGeometry args={[w, h]} />
        <meshPhysicalMaterial color="#dfefff" transparent opacity={0.12} roughness={0.05} />
      </mesh>
      {/* khung ngoài + đố giữa (đứng / ngang) */}
      {[
        [0, h + fr / 2, w + fr * 2, fr],
        [0, -fr / 2, w + fr * 2, fr],
        [-w / 2 - fr / 2, h / 2, fr, h],
        [w / 2 + fr / 2, h / 2, fr, h],
        [0, h / 2, 0.035, h],
        [0, h * 0.62, w, 0.035],
      ].map(([x, y, sw, sh], i) => (
        <mesh key={i} position={[x, y, 0.035]} material={FRAME} castShadow>
          <boxGeometry args={[sw, sh, 0.07]} />
        </mesh>
      ))}
      {/* bậu cửa */}
      <mesh position={[0, -fr - 0.012, 0.08]} material={FRAME} castShadow receiveShadow>
        <boxGeometry args={[w + 0.2, 0.025, 0.17]} />
      </mesh>
      {/* rèm lá: model người dùng đưa, co vừa lòng khung */}
      <VenetianBlind w={blindW} h={h} position-z={0.09} />
      {/* nắng lọt qua khe lá: vệt sáng xiên + sọc sáng trên sàn */}
      <>
        <mesh geometry={rays.shaft} renderOrder={2}>
          <meshBasicMaterial
            color="#ffe2a8"
            transparent
            opacity={0.012}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh geometry={rays.floor} renderOrder={2}>
          <meshBasicMaterial
            color="#ffdc9a"
            transparent
            opacity={0.1}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      </>
    </group>
  )
}
