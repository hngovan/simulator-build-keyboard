import { useEffect, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'

// Đổi con trỏ khi rê vào vật thể có thể tương tác
export function useHover(active: boolean) {
  const [hover, setHover] = useState(false)
  useEffect(() => {
    // bàn tay pixel (`--cursor-hand` trong index.css); rời ra thì về con trỏ mặc định của body
    document.body.style.cursor = hover && active ? 'var(--cursor-hand)' : ''
  }, [hover, active])
  useEffect(
    () => () => {
      document.body.style.cursor = ''
    },
    [],
  )
  return {
    hover: hover && active,
    bind: {
      onPointerOver: (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        setHover(true)
      },
      onPointerOut: () => setHover(false),
    },
  }
}
