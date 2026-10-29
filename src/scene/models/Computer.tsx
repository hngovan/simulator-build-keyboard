import { useMemo, useRef, useState } from 'react'
import { RoundedBox, useGLTF } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '@/store'
import { useHover } from '../common/useHover'
import { HINT_COLOR, useHoverOutline } from '../common/hoverOutline'
import { SCREEN } from './computerLayout'

// Màn hình (model ASUS) + thùng CPU (dựng bằng code), đơn vị mét; Room nhân M.
// Bấm màn hình thì về desktop KeebOS; rê chuột vào thì viền xanh

/** Ảnh desktop KeebOS trên màn hình: nền tím xanh, vài icon app, thanh taskbar */
function screenTexture() {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 614
  const g = c.getContext('2d')!
  const bg = g.createLinearGradient(0, 0, c.width, c.height)
  bg.addColorStop(0, '#3b2d7a')
  bg.addColorStop(0.55, '#4b3a8f')
  bg.addColorStop(1, '#8a3f6e')
  g.fillStyle = bg
  g.fillRect(0, 0, c.width, c.height)
  // icon app cột trái
  const icons = ['#7c5cff', '#f0532d', '#2f7bf5', '#1fa463', '#f29a2e', '#6b7280']
  icons.forEach((color, i) => {
    g.fillStyle = color
    g.beginPath()
    g.roundRect(34, 30 + i * 82, 58, 58, 14)
    g.fill()
  })
  // chữ KeebOS mờ góc dưới phải
  g.fillStyle = 'rgba(255,255,255,0.14)'
  g.font = 'bold 120px sans-serif'
  g.textAlign = 'right'
  g.fillText('KeebOS', c.width - 40, c.height - 90)
  // taskbar
  g.fillStyle = '#12141c'
  g.fillRect(0, c.height - 56, c.width, 56)
  g.fillStyle = '#f5c518'
  g.beginPath()
  g.roundRect(14, c.height - 46, 120, 36, 10)
  g.fill()
  g.fillStyle = '#12141c'
  g.font = 'bold 22px sans-serif'
  g.textAlign = 'center'
  g.fillText('KeebOS', 74, c.height - 21)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

const BLACK = new THREE.MeshStandardMaterial({ color: '#16181d', roughness: 0.45, metalness: 0.3 })

/**
 * Màn hình gaming ASUS (model người dùng đưa, Sketchfab, chưa rõ giấy phép → chỉ dùng cá nhân): mesh mặt kính (material
 * "Screen") thay bằng ảnh desktop KeebOS, UV đặt lại theo khung mặt kính. Co cả model cho mặt kính rộng SCREEN.w, chân đế
 * chạm mặt bàn (y = 0), mặt kính ở z = SCREEN.d / 2 (computerLayout tính điểm camera bay vào theo SCREEN).
 * Model quay mặt kính về −z nên xoay 180°. Bấm vào thì camera bay vào màn hình rồi về máy tính
 */
const MONITOR_GLB = '/models/desk/asus-monitor.glb'
/** khung viền hover phẳng quanh mép màn hình (xanh như viền tương tác khác) */
const FRAME = new THREE.MeshBasicMaterial({
  color: HINT_COLOR,
  toneMapped: false,
  side: THREE.DoubleSide,
})
useGLTF.preload(MONITOR_GLB)

export function Monitor(props: { position?: [number, number, number]; rotationY?: number }) {
  const tex = useMemo(() => screenTexture(), [])
  const { scene } = useGLTF(MONITOR_GLB)
  const zoomToPC = useGame((s) => s.zoomToPC)
  const [down, setDown] = useState<[number, number] | null>(null)
  const { hover, bind } = useHover(true)
  const ref = useRef<THREE.Group>(null)
  useHoverOutline(ref, hover)
  const model = useMemo(() => {
    const copy = scene.clone(true)
    const outer = new THREE.Group()
    const inner = new THREE.Group()
    inner.rotation.y = Math.PI
    inner.add(copy)
    outer.add(inner)
    let screen: THREE.Mesh | null = null
    copy.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.castShadow = m.receiveShadow = true
      if ((m.material as THREE.Material).name === 'Screen') screen = m
    })
    if (screen) {
      const m = screen as THREE.Mesh
      // UV 0..1 theo khung mặt kính (mặt phẳng x / y của mesh); model xoay 180° nên lật u cho chữ không bị ngược
      const g = m.geometry.clone()
      g.computeBoundingBox()
      const b = g.boundingBox!
      const pos = g.getAttribute('position')
      const uv = new Float32Array(pos.count * 2)
      for (let i = 0; i < pos.count; i++) {
        uv[i * 2] = 1 - (pos.getX(i) - b.min.x) / (b.max.x - b.min.x)
        uv[i * 2 + 1] = (pos.getY(i) - b.min.y) / (b.max.y - b.min.y)
      }
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
      m.geometry = g
      m.material = new THREE.MeshBasicMaterial({
        map: tex,
        toneMapped: false,
        side: THREE.DoubleSide,
      })
    }
    // co theo bề rộng mặt kính, chân đế xuống y = 0, mặt kính ra z = SCREEN.d / 2
    outer.updateMatrixWorld(true)
    const sb = new THREE.Box3().setFromObject(screen ?? copy)
    const k = SCREEN.w / (sb.max.x - sb.min.x)
    outer.scale.setScalar(k)
    outer.updateMatrixWorld(true)
    const all = new THREE.Box3().setFromObject(outer)
    const sc = new THREE.Box3().setFromObject(screen ?? copy)
    outer.position.set(-(sc.min.x + sc.max.x) / 2, -all.min.y, SCREEN.d / 2 - sc.max.z)
    // viền hover quanh mép màn hình: mặt kính / vỏ là tấm phẳng mỏng nên viền phồng (useHoverOutline) không lộ ra,
    // vẽ khung chữ nhật xanh phẳng ôm mép vỏ, đặt sát trước mặt kính (chân đế vẫn viền phồng như thường)
    outer.updateMatrixWorld(true)
    const bezel = new THREE.Box3()
    copy.traverse((o) => {
      const m = o as THREE.Mesh
      if (
        m.isMesh &&
        /Base|Backboard|Screen/.test((m.material as THREE.Material).name) &&
        m.name.includes('001')
      )
        bezel.expandByObject(m)
    })
    if (bezel.isEmpty()) bezel.copy(new THREE.Box3().setFromObject(screen ?? copy))
    const rect = (x0: number, y0: number, x1: number, y1: number) =>
      [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ].map(([x, y]) => new THREE.Vector2(x, y))
    const t = 0.004
    const shape = new THREE.Shape(
      rect(bezel.min.x - t, bezel.min.y - t, bezel.max.x + t, bezel.max.y + t),
    )
    shape.holes.push(
      new THREE.Path(rect(bezel.min.x, bezel.min.y, bezel.max.x, bezel.max.y).reverse()),
    )
    return { group: outer, frame: new THREE.ShapeGeometry(shape) }
  }, [scene, tex])
  return (
    <group
      ref={ref}
      position={props.position}
      rotation-y={props.rotationY ?? 0}
      {...bind}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => setDown([e.clientX, e.clientY])}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        // kéo xoay camera thì không tính là bấm
        if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return
        e.stopPropagation()
        zoomToPC()
      }}
    >
      <primitive object={model.group} />
      <mesh
        geometry={model.frame}
        material={FRAME}
        position-z={SCREEN.d / 2 + 0.001}
        visible={hover}
        raycast={() => null}
      />
    </group>
  )
}

/** Thùng CPU mini tower: mặt trước có khe gió, nút nguồn + đèn xanh */
export function PcTower(props: { position?: [number, number, number]; rotationY?: number }) {
  const W = 0.18
  const H = 0.36
  const D = 0.34
  return (
    <group position={props.position} rotation-y={props.rotationY ?? 0}>
      <RoundedBox args={[W, H, D]} radius={0.008} position-y={H / 2} material={BLACK} castShadow />
      {/* khe gió mặt trước */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[0, 0.06 + i * 0.022, D / 2 + 0.001]}>
          <planeGeometry args={[W - 0.06, 0.006]} />
          <meshStandardMaterial color="#0b0c10" roughness={0.8} />
        </mesh>
      ))}
      {/* nút nguồn + đèn */}
      <mesh position={[0, H - 0.04, D / 2 + 0.002]}>
        <circleGeometry args={[0.012, 20]} />
        <meshStandardMaterial color="#3a3f4a" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0.04, H - 0.04, D / 2 + 0.002]}>
        <circleGeometry args={[0.003, 12]} />
        <meshBasicMaterial color="#3ecf6e" toneMapped={false} />
      </mesh>
      {/* kính hông (nhìn thấy đèn RGB mờ bên trong) */}
      <mesh position={[-W / 2 - 0.001, H / 2, 0]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[D - 0.04, H - 0.04]} />
        <meshStandardMaterial
          color="#5b3fb0"
          emissive="#5b3fb0"
          emissiveIntensity={0.35}
          roughness={0.1}
          metalness={0.2}
        />
      </mesh>
    </group>
  )
}
