import { useEffect, useMemo, useRef, useState } from 'react'
import { RoundedBox, useGLTF } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { APPS, APP_IDS } from '@/features/desktop/apps'
import { wallpaperOf, type WallpaperId } from '@/features/desktop/wallpapers'
import { weatherOf } from '@/features/desktop/weather'
import { useGame } from '@/store'
import { useHover } from '../common/useHover'
import { HINT_COLOR, useHoverOutline } from '../common/hoverOutline'
import { SCREEN } from './computerLayout'
import { useIntro } from '@/features/intro/introStore'

// Màn hình (model ASUS) + thùng CPU (dựng bằng code), đơn vị mét; Room nhân M.
// Bấm màn hình thì về desktop KeebOS; rê chuột vào thì viền xanh

/** chữ KeebOS mờ góc dưới phải, dùng chung mọi hình nền */
const logo = (g: CanvasRenderingContext2D, w: number, h: number, color: string) => {
  g.fillStyle = color
  g.font = 'bold 120px sans-serif'
  g.textAlign = 'right'
  g.textBaseline = 'alphabetic'
  g.fillText('KeebOS', w - 40, h - 90)
}

/** Hình nền desktop vẽ gọn bằng canvas, theo đúng hình đang chọn (`features/desktop/Wallpaper.tsx`); thêm hình nền thì thêm ở đây */
const WALLS: Record<WallpaperId, (g: CanvasRenderingContext2D, w: number, h: number) => void> = {
  // gradient xanh tím
  aurora(g, w, h) {
    const bg = g.createLinearGradient(0, 0, w, h)
    bg.addColorStop(0, '#1d3b6e')
    bg.addColorStop(0.55, '#3f2b72')
    bg.addColorStop(1, '#7a2f6a')
    g.fillStyle = bg
    g.fillRect(0, 0, w, h)
    logo(g, w, h, 'rgba(255,255,255,0.12)')
  },
  // trời cam, mặt trời, 2 lớp đồi
  sunset(g, w, h) {
    const bg = g.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, '#2a1b4a')
    bg.addColorStop(0.45, '#8a3a6b')
    bg.addColorStop(0.75, '#f08a4b')
    bg.addColorStop(1, '#ffc46b')
    g.fillStyle = bg
    g.fillRect(0, 0, w, h)
    const r = w * 0.15
    const sun = g.createLinearGradient(0, h * 0.82 - r * 2, 0, h * 0.82)
    sun.addColorStop(0, '#ffe08a')
    sun.addColorStop(1, '#ff8a4b')
    g.fillStyle = sun
    g.beginPath()
    g.arc(w / 2, h * 0.82 - r, r, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#4a2350'
    g.beginPath()
    g.ellipse(w * 0.275, h * 1.025, w * 0.375, h * 0.275, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#331a3e'
    g.beginPath()
    g.ellipse(w * 0.75, h * 1.075, w * 0.4, h * 0.275, 0, 0, Math.PI * 2)
    g.fill()
    logo(g, w, h, 'rgba(255,255,255,0.15)')
  },
  // nền tối, keycap xếp nghiêng + 2 phím màu nhấn
  keys(g, w, h) {
    const bg = g.createRadialGradient(w * 0.3, h * 0.2, 0, w * 0.3, h * 0.2, w * 0.8)
    bg.addColorStop(0, '#1f3a3a')
    bg.addColorStop(0.7, '#10181f')
    g.fillStyle = bg
    g.fillRect(0, 0, w, h)
    g.save()
    g.translate(w / 2, h / 2)
    g.rotate((-18 * Math.PI) / 180)
    g.fillStyle = 'rgba(255,255,255,0.04)'
    for (let x = -w; x < w; x += 48) for (let y = -w; y < w; y += 48) g.fillRect(x, y, 40, 40)
    g.fillStyle = 'rgba(255,204,46,0.7)'
    g.fillRect(-336, -144, 40, 40)
    g.fillStyle = 'rgba(46,211,160,0.6)'
    g.fillRect(144, 96, 88, 40)
    g.restore()
    logo(g, w, h, 'rgba(46,211,160,0.15)')
  },
}

/**
 * Ảnh desktop KeebOS trên màn hình: hình nền đang chọn, ô icon app, thanh taskbar (thời tiết, giờ, chuông).
 * `paint(wall, day, unread, ping)` vẽ lại; `ping` = tên khách thì
 * thêm thẻ báo tin nhắn mới góc phải trên (đoạn mở đầu người chơi lần đầu, `features/intro`)
 */
function screenTexture() {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 614
  const g = c.getContext('2d')!
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  const paint = (wall: string, day: number, unread: number, ping?: string) => {
    WALLS[wallpaperOf(wall)](g, c.width, c.height)
    // icon app cột trái: mỗi app 1 ô, màu đúng như icon trên desktop thật (`APPS[id].color`)
    APP_IDS.forEach((id, i) => {
      g.fillStyle = APPS[id].color
      g.beginPath()
      g.roundRect(34, 26 + i * 74, 56, 56, 14)
      g.fill()
    })
    // taskbar
    g.fillStyle = '#12141c'
    g.fillRect(0, c.height - 56, c.width, 56)
    const my = c.height - 28
    g.textBaseline = 'middle'
    // góc trái: thời tiết của ngày chơi như taskbar thật (chấm tròn = nắng, cụm mây = mây / mưa; nhiệt độ + tên)
    const w = weatherOf(day)
    g.fillStyle = w.color
    g.beginPath()
    if (w.sun) g.arc(36, my, 13, 0, Math.PI * 2)
    else {
      g.arc(26, my + 4, 9, 0, Math.PI * 2)
      g.arc(36, my - 3, 12, 0, Math.PI * 2)
      g.arc(46, my + 5, 8, 0, Math.PI * 2)
      g.rect(26, my + 3, 20, 10)
    }
    g.fill()
    g.textAlign = 'left'
    g.fillStyle = '#f1f3f8'
    g.font = 'bold 21px Nunito, sans-serif'
    g.fillText(`${w.temp}°C`, 64, my - 9)
    g.fillStyle = '#94a0b8'
    g.font = '15px Nunito, sans-serif'
    g.fillText(w.name, 64, my + 12)
    // góc phải: giờ + chuông thông báo (có thông báo chưa xem: chuông vàng + chấm đỏ)
    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    g.textAlign = 'right'
    g.fillStyle = '#f1f3f8'
    g.font = 'bold 21px Nunito, sans-serif'
    g.fillText(time, c.width - 18, my + 1)
    const bx = c.width - 18 - g.measureText(time).width - 30
    g.fillStyle = unread ? '#ffcc2e' : '#f1f3f8'
    g.beginPath()
    g.arc(bx, my - 3, 9, Math.PI, 0)
    g.lineTo(bx + 13, my + 8)
    g.lineTo(bx - 13, my + 8)
    g.closePath()
    g.fill()
    g.beginPath()
    g.arc(bx, my + 11, 4, 0, Math.PI)
    g.fill()
    if (unread) {
      g.fillStyle = '#ff5d5d'
      g.beginPath()
      g.arc(bx + 10, my - 10, 6, 0, Math.PI * 2)
      g.fill()
    }
    g.textBaseline = 'alphabetic'
    if (ping) {
      // thẻ báo tin nhắn mới: ô màu Mezzenger + tên app + tên khách, chấm đỏ góc thẻ
      const w = 380
      const x = c.width - w - 24
      g.fillStyle = 'rgba(0,0,0,0.4)'
      g.beginPath()
      g.roundRect(x, 29, w, 92, 20)
      g.fill()
      g.fillStyle = '#1f2633'
      g.beginPath()
      g.roundRect(x, 24, w, 92, 20)
      g.fill()
      g.fillStyle = APPS.messenger.color
      g.beginPath()
      g.roundRect(x + 16, 40, 60, 60, 16)
      g.fill()
      g.textAlign = 'left'
      g.textBaseline = 'middle'
      g.fillStyle = '#ffcc2e'
      g.font = 'bold 24px Nunito, sans-serif'
      g.fillText('Mezzenger', x + 92, 56)
      g.fillStyle = '#f1f3f8'
      g.font = 'bold 19px Nunito, sans-serif'
      g.fillText(`Tin nhắn mới từ ${ping}`, x + 92, 86, w - 108)
      g.fillStyle = '#ff5d5d'
      g.beginPath()
      g.arc(x + w - 8, 32, 10, 0, Math.PI * 2)
      g.fill()
    }
    tex.needsUpdate = true
  }
  return { tex, paint }
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
  const { tex, paint } = useMemo(() => screenTexture(), [])
  // đoạn mở đầu: màn hình báo tin nhắn mới của khách đơn đầu
  const ping = useIntro((s) => s.ping)
  const from = useGame((s) => s.offers[0]?.customer ?? 'khách')
  // hình nền đang chọn ở Cài đặt, thời tiết theo ngày chơi, chuông theo thông báo chưa xem; vẽ lại mỗi 30s cho giờ chạy
  const wallpaper = useGame((s) => s.wallpaper)
  const day = useGame((s) => s.day)
  const unread = useGame((s) => s.unread)
  useEffect(() => {
    const draw = () => paint(wallpaper, day, unread, ping ? from : undefined)
    draw()
    const timer = setInterval(draw, 30000)
    return () => clearInterval(timer)
  }, [paint, wallpaper, day, unread, ping, from])
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
