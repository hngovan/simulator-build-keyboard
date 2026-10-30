import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { WINDOW } from './roomLayout'

// Cửa sổ dựng bằng code: khung gỗ sồi 4 ô kính, nền sau kính trắng bóng như gương
// (sân vườn 3D thật đã thử rồi bỏ: nặng máy),
// rèm lá (model `VenetianBlind`) hạ kín: nắng lọt qua khe lá thành vài vệt sọc mờ xiên xuống sàn.
// Đơn vị mét; gốc = mặt tường, giữa mép dưới lòng khung; +z quay vào phòng

/**
 * Rèm lá "Window Blind - 3MB" (Mehdi Shahsavan, Sketchfab, CC BY 4.0): ray + lá + dây, texture riêng,
 * rộng 1,03m cao 1,29m (khung bao = cả rèm), mặt quay +z
 */
const BLIND_GLB = '/models/room/window-blind.glb'
/** lá rèm chiếm 88,1% bề ngang model (đo đỉnh trong glb), cân giữa; phần còn lại là 2 nắp đầu ray trên */
const SLAT_FRAC = 0.881
/** khung cửa sổ: vân `oak_veneer_01` (Poly Haven CC0, người dùng: đổi vân cửa sổ sang `oak_veneer_01`) */
const OAK_TEX = new THREE.TextureLoader().load('/textures/room/oak_veneer_01_diff_1k.jpg', (t) => {
  t.colorSpace = THREE.SRGBColorSpace
})
OAK_TEX.wrapS = OAK_TEX.wrapT = THREE.RepeatWrapping
const FRAME = new THREE.MeshStandardMaterial({ map: OAK_TEX, color: '#c99a66', roughness: 0.55 })
useGLTF.preload(BLIND_GLB)
/** hệ số nhân màu khung + rèm theo kênh r, g, b (linear) */
type Shade = readonly [number, number, number]
/**
 * cửa sổ trong phòng quay mặt về phía đèn chính: hệ số đo trên ảnh chụp cho lá rèm khớp màu cửa sổ hành lang
 * (216, 208, 177); hằng số ngoài component để rèm không clone lại mỗi lần vẽ
 */
export const LIT_SHADE: Shade = [0.32, 0.29, 0.21]

/** rèm lá co giãn vừa ô cửa w × h (m), chân rèm ở y = 0; `clip` = nửa bề ngang tối đa (xén 2 đầu nắp ray lòi quá khung) */
function VenetianBlind({
  w,
  h,
  shade,
  clip,
  ...props
}: { w: number; h: number; shade?: Shade; clip: number } & JSX.IntrinsicElements['group']) {
  // dày (z) ép còn BLIND_D: rèm gốc dày 6,7cm lồi khỏi tường quá nhiều
  const { scene } = useGLTF(BLIND_GLB)
  const model = useMemo(() => {
    const copy = scene.clone(true)
    copy.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.castShadow = m.receiveShadow = true
      // tối bớt khi cửa sổ quay về phía đèn chính (xem `shade` của RoomWindow); vật liệu clone riêng, không đụng bản gốc
      if (shade) {
        const mat = (m.material as THREE.MeshStandardMaterial).clone()
        mat.color.multiply(new THREE.Color().setRGB(...shade))
        m.material = mat
      }
    })
    copy.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(copy)
    const size = box.getSize(new THREE.Vector3())
    const g = new THREE.Group()
    const sz = BLIND_D / size.z
    copy.scale.set(w / size.x, h / size.y, sz)
    copy.position.set(
      (-(box.min.x + box.max.x) / 2) * (w / size.x),
      -box.min.y * (h / size.y),
      (-(box.min.z + box.max.z) / 2) * sz,
    )
    copy.updateMatrixWorld(true)
    // nướng biến đổi vào hình (clone, không đụng model gốc) rồi ép đỉnh |x| > clip về clip: 2 nắp đầu ray cụt bằng mép ngoài khung
    copy.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const geo = m.geometry.clone().applyMatrix4(m.matrixWorld)
      const pos = geo.getAttribute('position')
      for (let i = 0; i < pos.count; i++)
        pos.setX(i, THREE.MathUtils.clamp(pos.getX(i), -clip, clip))
      const baked = new THREE.Mesh(geo, m.material)
      baked.castShadow = baked.receiveShadow = true
      g.add(baked)
    })
    return g
  }, [scene, w, h, shade, clip])
  return (
    <group {...props}>
      <primitive object={model} />
    </group>
  )
}

/**
 * bề dày (m): khung cửa lồi khỏi mặt tường `FRAME_D`, rèm `BLIND_D` (nằm ngay trước khung); bỏ bậu cửa (người dùng)
 * (người dùng: "viền cửa sổ quá dày, làm mỏng lại"; cũ: khung 7cm + rèm 6,7cm + bậu 17cm)
 */
const FRAME_D = 0.025
const BLIND_D = 0.03
/** bản khung cửa sổ (m), 4 cạnh như nhau */
const FRAME_W = 0.03

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
  shade,
  ...props
}: {
  size?: { w: number; h: number; sill: number }
  /**
   * nhân màu khung + rèm: cửa sổ quay mặt về phía đèn chính (directional light trắng trong Bench.tsx) bị rọi thẳng nên bạc
   * màu, hạ xuống + ngả ấm cho khớp cửa sổ quay lưng lại đèn (cửa sổ hành lang, chỉ ánh sáng môi trường)
   */
  shade?: Shade
} & JSX.IntrinsicElements['group']) {
  const { w, h, sill } = size
  const frame = useMemo(() => {
    if (!shade) return FRAME
    const m = FRAME.clone()
    m.color.multiply(new THREE.Color().setRGB(...shade))
    return m
  }, [shade])
  // lá rèm phủ vừa khít lòng khung (lấn 5mm mỗi bên), 2 nắp đầu ray trên nằm trọn trên khung: khung rộng bằng
  // phần nắp lòi ra (người dùng: "viền khít, không dư ra")
  const blindW = (w + 0.01) / SLAT_FRAC
  // khung mỏng đều 4 cạnh (người dùng: "viền 2 bên vẫn dày, cho nhỏ lại như ở dưới"); nắp ray lòi quá khung thì xén
  const fr = FRAME_W
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
        w,
        slats.filter((_, i) => i % RAY_EVERY === 4).map((y) => y - gap / 2),
        Math.max(gap, 0.004),
        -sill,
      ),
    [w, slats, gap, sill],
  )
  return (
    <group {...props}>
      {/* nền sau kính: trắng sáng bóng như gương (người dùng: thay cảnh vẽ ngoài trời) */}
      <mesh position={[0, h / 2, 0.004]} material={MIRROR}>
        <planeGeometry args={[w, h]} />
      </mesh>
      {/* kính */}
      <mesh position={[0, h / 2, FRAME_D * 0.6]}>
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
        <mesh key={i} position={[x, y, FRAME_D / 2]} material={frame} castShadow>
          <boxGeometry args={[sw, sh, FRAME_D]} />
        </mesh>
      ))}
      {/* rèm lá: lá phủ lòng khung, nắp đầu ray nằm trên khung */}
      <VenetianBlind
        w={blindW}
        h={h}
        shade={shade}
        clip={w / 2 + fr}
        position-z={FRAME_D + BLIND_D / 2 + 0.002}
      />
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
