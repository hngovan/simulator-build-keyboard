import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { WINDOW } from './roomLayout'

// Cửa sổ dựng bằng code: khung gỗ trắng 4 ô kính, cảnh ngoài (trời, cây, bãi cỏ, hàng rào) là ảnh vẽ canvas dán sau kính
// (sân vườn 3D thật đã thử rồi bỏ: nặng máy),
// rèm lá (model `VenetianBlind`) hạ kín: nắng lọt qua khe lá thành vài vệt sọc mờ xiên xuống sàn.
// Đơn vị mét; gốc = mặt tường, giữa bậu cửa sổ; +z quay vào phòng

const FRAME = new THREE.MeshStandardMaterial({ color: '#f1ece2', roughness: 0.6 })
/**
 * Rèm lá "Venetian frame window" (người dùng đưa, Sketchfab, chưa rõ giấy phép → chỉ dùng cá nhân): ray + lá + dây + gậy xoay,
 * rộng 1m cao 1,66m, gốc = giữa chân rèm, mặt quay +z
 */
const BLIND_GLB = '/models/room/venetian-blind.glb'
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
      if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true
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

/**
 * Cảnh ngoài cửa sổ buổi sáng: trời xanh mây trắng, đồi + hàng cây xa, bãi cỏ xanh trước nhà, hàng rào gỗ trắng,
 * bụi cây + hoa sát chân tường
 */
function skyTexture() {
  const W = 384
  const H = 480
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  let seed = 11
  const r = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  const blob = (x: number, y: number, rx: number, ry: number, fill: string) => {
    g.fillStyle = fill
    g.beginPath()
    g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
    g.fill()
  }
  // trời
  const sky = g.createLinearGradient(0, 0, 0, H * 0.55)
  sky.addColorStop(0, '#5aa6ea')
  sky.addColorStop(1, '#cfe8f7')
  g.fillStyle = sky
  g.fillRect(0, 0, W, H)
  const sun = g.createRadialGradient(W * 0.7, H * 0.12, 4, W * 0.7, H * 0.12, 140)
  sun.addColorStop(0, 'rgba(255,252,230,1)')
  sun.addColorStop(0.3, 'rgba(255,245,210,0.5)')
  sun.addColorStop(1, 'rgba(255,245,210,0)')
  g.fillStyle = sun
  g.fillRect(0, 0, W, H)
  // mây
  for (const [x, y, s] of [
    [70, 70, 1],
    [250, 120, 0.8],
    [170, 40, 0.6],
  ])
    for (let i = 0; i < 5; i++)
      blob(
        x + (i - 2) * 18 * s,
        y + Math.sin(i * 1.7) * 6 * s,
        26 * s,
        16 * s,
        'rgba(255,255,255,0.92)',
      )
  // đồi xa xanh nhạt + hàng cây xa
  const hill = H * 0.5
  g.fillStyle = '#9cc79a'
  g.beginPath()
  g.moveTo(0, hill)
  for (let x = 0; x <= W; x += 8) g.lineTo(x, hill - 18 - Math.sin(x / 60) * 14)
  g.lineTo(W, H)
  g.lineTo(0, H)
  g.fill()
  for (let x = -10; x < W + 10; x += 16 + r() * 12) {
    const h = 26 + r() * 30
    const y = hill - 8 - Math.sin(x / 60) * 14
    g.fillStyle = '#5b4a36'
    g.fillRect(x - 2, y - h * 0.35, 4, h * 0.35)
    blob(x, y - h * 0.55, 10 + r() * 6, h * 0.45, r() > 0.5 ? '#3f7d3c' : '#4c8c43')
  }
  // bãi cỏ: xanh đậm dần về gần, sọc cắt cỏ
  const lawnY = H * 0.6
  const lawn = g.createLinearGradient(0, lawnY, 0, H)
  lawn.addColorStop(0, '#7cc35a')
  lawn.addColorStop(1, '#3f9a36')
  g.fillStyle = lawn
  g.fillRect(0, lawnY, W, H - lawnY)
  for (let i = 0; i < 6; i++) {
    g.fillStyle = i % 2 ? 'rgba(255,255,255,0.06)' : 'rgba(0,60,0,0.06)'
    g.fillRect(0, lawnY + i * ((H - lawnY) / 6), W, (H - lawnY) / 6)
  }
  // ngọn cỏ lấm tấm
  for (let i = 0; i < 400; i++) {
    const x = r() * W
    const y = lawnY + r() * (H - lawnY)
    g.strokeStyle = r() > 0.5 ? '#2f7d2a' : '#9ad66e'
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 4)
    g.stroke()
  }
  // hàng rào gỗ trắng ngang bãi cỏ
  const fy = H * 0.66
  g.fillStyle = '#f4f1ea'
  g.fillRect(0, fy + 8, W, 5)
  g.fillRect(0, fy + 24, W, 5)
  for (let x = 4; x < W; x += 22) {
    g.beginPath()
    g.moveTo(x, fy + 40)
    g.lineTo(x, fy)
    g.lineTo(x + 5, fy - 6)
    g.lineTo(x + 10, fy)
    g.lineTo(x + 10, fy + 40)
    g.closePath()
    g.fill()
  }
  // bụi cây + hoa sát chân tường
  for (let x = -20; x < W + 20; x += 34 + r() * 16) {
    const y = H - 10 - r() * 20
    blob(x, y, 30 + r() * 14, 26 + r() * 10, '#2f7a2c')
    blob(x - 8, y - 10, 18, 14, '#3d8f36')
    for (let k = 0; k < 6; k++)
      blob(
        x + (r() - 0.5) * 44,
        y + (r() - 0.7) * 30,
        3,
        3,
        ['#ff6f91', '#ffd84a', '#ffffff', '#c86bff'][Math.floor(r() * 4)],
      )
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

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
  const sky = useMemo(() => skyTexture(), [])
  useEffect(() => () => sky.dispose(), [sky])
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
      {/* ngoài trời: ảnh vẽ dán sát mặt tường sau kính */}
      <mesh position={[0, h / 2, 0.004]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={sky} toneMapped={false} />
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
