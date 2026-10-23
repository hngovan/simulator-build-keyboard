import { useEffect, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'

// Đổi con trỏ khi rê vào vật thể có thể tương tác
export function useHover(active: boolean) {
  const [hover, setHover] = useState(false)
  useEffect(() => {
    document.body.style.cursor = hover && active ? 'pointer' : 'auto'
  }, [hover, active])
  useEffect(
    () => () => {
      document.body.style.cursor = 'auto'
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
