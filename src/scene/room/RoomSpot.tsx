import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import type * as THREE from 'three'
import { useHover } from '../common/useHover'
import { useHoverOutline } from '../common/hoverOutline'
import { useRoom } from './roomStore'
import { inReach } from './roomLayout'
import { useGame } from '@/store'

/**
 * Vật bấm được trong phòng: rê chuột viền xanh + HUD hiện "Nhấn [chuột] {label}", bấm (không phải kéo nhìn) thì `onAct`.
 * Phải đứng gần (`REACH_M` theo mặt sàn) mới rê sáng / bấm được. outline = false: con tự vẽ viền (màn hình máy tính có viền riêng)
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
  // trong tầm với: tính lại mỗi lần rê / di chuột trên vật (đứng xa thì như không bấm được)
  const [near, setNear] = useState(true)
  const { hover, bind } = useHover(active && near)
  const reach = (e: ThreeEvent<PointerEvent | MouseEvent>) => !useGame.getState().walk || inReach(e)
  const can = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const ok = reach(e)
    if (ok !== near) setNear(ok)
    return active && ok
  }
  useHoverOutline(ref, hover && outline)
  // vật biến mất lúc đang rê (vừa đặt / cầm thùng): bỏ chữ gợi ý của nó
  useEffect(
    () => () => {
      if (useRoom.getState().hover === label) useRoom.setState({ hover: null })
    },
    [label],
  )
  return (
    <group
      ref={ref}
      {...props}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        if (!active) return
        bind.onPointerOver(e)
        if (can(e)) useRoom.setState({ hover: label, hoverAlt: null, hoverNote: null })
      }}
      // con tự bắt hover (màn hình máy tính) chặn onPointerOver lan lên: lấy chữ gợi ý theo lúc rê
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        if (!active) return
        const ok = can(e)
        const cur = useRoom.getState().hover
        if (ok && cur !== label) useRoom.setState({ hover: label, hoverAlt: null, hoverNote: null })
        else if (!ok && cur === label) useRoom.setState({ hover: null })
      }}
      onPointerOut={() => {
        bind.onPointerOut()
        if (useRoom.getState().hover === label) useRoom.setState({ hover: null })
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        // kéo nhìn quanh thì không tính là bấm; đứng xa thì không với tới
        if (!active || e.delta > 6 || !reach(e)) return
        e.stopPropagation()
        useRoom.setState({ hover: null })
        onAct()
      }}
    >
      {children}
    </group>
  )
}
