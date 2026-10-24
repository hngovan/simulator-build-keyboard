import { useMemo, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '@/store'
import { useHover } from '../common/useHover'
import { SCREEN } from './computerLayout'

// Màn hình + thùng CPU trên bàn (dựng bằng code, đơn vị mét; Room nhân M).
// Bấm màn hình thì về desktop KeebOS; rê chuột vào thì viền vàng liền nét
const HOVER = '#ffd84a'

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
const GREY = new THREE.MeshStandardMaterial({ color: '#2b2f37', roughness: 0.5, metalness: 0.6 })
/** viền hover: hộp nở ra 1 chút, chỉ vẽ mặt sau → thành đường viền vàng liền nét quanh vật */
const SHELL = new THREE.MeshBasicMaterial({ color: HOVER, side: THREE.BackSide, toneMapped: false })
/** độ dày viền hover (m) */
const T = 0.0025

function HoverShell({ args, show }: { args: [number, number, number]; show: boolean }) {
  return (
    <mesh visible={show} material={SHELL} raycast={() => null}>
      <boxGeometry args={[args[0] + T * 2, args[1] + T * 2, args[2] + T * 2]} />
    </mesh>
  )
}

/** Màn hình trên chân đế; bấm vào thì camera bay vào màn hình rồi về máy tính */
export function Monitor(props: { position?: [number, number, number]; rotationY?: number }) {
  const tex = useMemo(() => screenTexture(), [])
  const zoomToPC = useGame((s) => s.zoomToPC)
  const [down, setDown] = useState<[number, number] | null>(null)
  const { hover, bind } = useHover(true)
  return (
    <group
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
      {/* đế + cổ */}
      <RoundedBox args={[0.22, 0.012, 0.16]} radius={0.005} position-y={0.006} material={GREY}>
        <HoverShell args={[0.22, 0.012, 0.16]} show={hover} />
      </RoundedBox>
      <RoundedBox
        args={[0.045, SCREEN.y + 0.06, 0.02]}
        radius={0.006}
        position={[0, (SCREEN.y + 0.06) / 2, -0.03]}
        material={GREY}
      >
        <HoverShell args={[0.045, SCREEN.y + 0.06, 0.02]} show={hover} />
      </RoundedBox>
      {/* thân màn hình (viền mỏng) */}
      <group position={[0, SCREEN.y + SCREEN.h / 2, 0]}>
        <RoundedBox
          args={[SCREEN.w, SCREEN.h, SCREEN.d]}
          radius={0.006}
          material={BLACK}
          castShadow
        >
          <HoverShell args={[SCREEN.w, SCREEN.h, SCREEN.d]} show={hover} />
        </RoundedBox>
        <mesh position-z={SCREEN.d / 2 + 0.0005}>
          <planeGeometry args={[SCREEN.w - 0.016, SCREEN.h - 0.026]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      </group>
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
