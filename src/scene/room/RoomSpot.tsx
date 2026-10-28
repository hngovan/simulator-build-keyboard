import { useRef, type ReactNode } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import type * as THREE from 'three'
import { useHover } from '../common/useHover'
import { useHoverOutline } from '../common/hoverOutline'
import { useRoom } from './roomStore'

/**
 * Vật bấm được trong phòng: rê chuột viền xanh + HUD hiện "Bấm: {label}", bấm (không phải kéo nhìn) thì `onAct`.
 * outline = false: con tự vẽ viền (màn hình máy tính có viền riêng)
 */
export function RoomSpot({
  label,
  onAct,
  active = true,
  outline = true,
  children,
  ...props
}: {
  label: string
  onAct: () => void
  active?: boolean
  outline?: boolean
  children: ReactNode
} & Omit<JSX.IntrinsicElements['group'], 'children'>) {
  const ref = useRef<THREE.Group>(null)
  const { hover, bind } = useHover(active)
  useHoverOutline(ref, hover && outline)
  return (
    <group
      ref={ref}
      {...props}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        if (!active) return
        bind.onPointerOver(e)
        useRoom.setState({ hover: label })
      }}
      // con tự bắt hover (màn hình máy tính) chặn onPointerOver lan lên: lấy chữ gợi ý theo lúc rê
      onPointerMove={() => {
        if (active && useRoom.getState().hover !== label) useRoom.setState({ hover: label })
      }}
      onPointerOut={() => {
        bind.onPointerOut()
        if (useRoom.getState().hover === label) useRoom.setState({ hover: null })
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        // kéo nhìn quanh thì không tính là bấm
        if (!active || e.delta > 6) return
        e.stopPropagation()
        useRoom.setState({ hover: null })
        onAct()
      }}
    >
      {children}
    </group>
  )
}
