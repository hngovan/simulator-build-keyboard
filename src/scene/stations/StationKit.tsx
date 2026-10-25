import { useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { Text } from '@/scene/common/Text3D'
import { useFrame, type GroupProps, type ThreeEvent } from '@react-three/fiber'
import { useHover } from '../common/useHover'
import { useHoverOutline } from '../common/hoverOutline'
import { CuttingMat } from '../common/CuttingMat'

/** Chữ nằm trên mặt bàn */
export function Label({
  children,
  position,
  color = '#fff',
}: {
  children: ReactNode
  position: [number, number, number]
  color?: string
}) {
  return (
    <Text
      position={position}
      rotation-x={-Math.PI / 2}
      fontSize={0.28}
      color={color}
      anchorX="center"
      outlineWidth={0.02}
      outlineColor="#000"
    >
      {children}
    </Text>
  )
}

// Bộ phận có thể click: phóng to nhẹ khi rê chuột
export function Part({
  active,
  onAct,
  children,
  ...props
}: GroupProps & { active: boolean; onAct: () => void }) {
  const { hover, bind } = useHover(active)
  return (
    <group
      {...props}
      {...bind}
      onPointerDown={(e) => {
        if (!active) return
        e.stopPropagation()
        onAct()
      }}
      scale={hover ? 1.06 : 1}
    >
      {children}
    </group>
  )
}

/**
 * Ô trống nét đứt cho món đồ còn thiếu trên bàn (chưa mua dụng cụ / hết vật tư).
 * Click để mở Shopii mua; mua xong món đồ tự hiện lại thay ô này.
 * Vẽ đè lên mặt bàn (không bị tấm lót / mặt bàn che)
 */
export function MissingSlot({
  at,
  size: [w, d],
  label,
  onAct,
}: {
  at: THREE.Vector3
  size: [number, number]
  label: string
  onAct: () => void
}) {
  const { hover, bind } = useHover(true)
  const color = hover ? '#ffe07a' : '#ffcc2e'
  const y = 0.02
  const outline: [number, number, number][] = [
    [-w / 2, y, -d / 2],
    [w / 2, y, -d / 2],
    [w / 2, y, d / 2],
    [-w / 2, y, d / 2],
    [-w / 2, y, -d / 2],
  ]
  return (
    <group
      position={at}
      {...bind}
      onPointerDown={(e) => {
        e.stopPropagation()
        onAct()
      }}
    >
      <mesh position-y={y} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={hover ? 0.18 : 0.09}
          depthWrite={false}
        />
      </mesh>
      <Line
        points={outline}
        color={color}
        lineWidth={2.5}
        dashed
        dashSize={0.1}
        gapSize={0.07}
        renderOrder={2}
      />
      <Label position={[0, y + 0.02, d / 2 + 0.25]} color={color}>
        {label}
      </Label>
    </group>
  )
}

// Lớp lube bóng phủ lên bộ phận đã mod
export const lubed = (on: boolean) =>
  on
    ? { roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05 }
    : { roughness: 0.55, clearcoat: 0 }

/** Mặt bàn làm việc của station = tấm cutting mat (mặt trên y = -0.55); đặt sát mặt bàn bất kể tỉ lệ k */
export function StationTable({
  k,
  w,
  d,
  children,
}: {
  k: number
  w: number
  d: number
  children: ReactNode
}) {
  return (
    <group scale={k} position-y={-0.95 + 0.65 * k}>
      <CuttingMat w={w} d={d} h={0.1} fit="stretch" position-y={-0.65} />
      {children}
    </group>
  )
}

// ---------- tiện ích hoạt cảnh dùng chung cho các bàn ----------

export const ease = (t: number) => t * t * (3 - 2 * t)
/** tiến độ 0..1 của đoạn [a, b] trong p */
export const seg = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)))
/** tiến độ của nét thứ i trong n nét */
export const passPhase = (p: number, i: number, n: number) => seg(p, i / n, (i + 1) / n)

/** Vị trí mũi cọ trên 1 nét: chạy hết đường (nửa đầu) rồi quét ngược lại cho đều (nửa sau) */
export function alongPass(points: THREE.Vector3[], q: number) {
  const t = q < 0.55 ? q / 0.55 : 1 - (q - 0.55) / 0.45
  const f = t * (points.length - 1)
  const i = Math.min(points.length - 2, Math.floor(f))
  return points[i].clone().lerp(points[i + 1], f - i)
}

/** Vùng click được: đổi con trỏ + viền vàng quanh vật khi rê chuột (như màn hình PC) */
export function Clickable({
  active,
  onAct,
  outline = true,
  children,
}: {
  active: boolean
  /** nhận sự kiện để biết bấm trúng chi tiết nào (vd. instance switch trong lưới) */
  onAct: (e: ThreeEvent<PointerEvent>) => void
  /** false: con tự vẽ viền (vd. lưới switch chỉ viền con đang rê) */
  outline?: boolean
  children: ReactNode
}) {
  const ref = useRef<THREE.Group>(null)
  const { hover, bind } = useHover(active)
  useHoverOutline(ref, hover && outline)
  return (
    <group
      ref={ref}
      {...bind}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        if (!active) return
        e.stopPropagation()
        onAct(e)
      }}
    >
      {children}
    </group>
  )
}

/** Mũi tên vàng nhấp nhô chỉ thao tác tiếp theo */
export function HintArrow({ at, size = 1 }: { at: [number, number, number]; size?: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (ref.current)
      ref.current.position.y = at[1] + (0.15 + Math.sin(clock.elapsedTime * 4) * 0.08) * size
  })
  return (
    <mesh ref={ref} position={at} rotation-x={Math.PI} scale={size}>
      <coneGeometry args={[0.12, 0.3, 12]} />
      <meshBasicMaterial color="#ffcc2e" />
    </mesh>
  )
}
