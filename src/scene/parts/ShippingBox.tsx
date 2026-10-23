import { Text } from '@react-three/drei'
import { useGame, useCtx } from '@/store'
import { Y } from '@/data/steps'
import { playClick } from '@/sound'
import { useHover } from '../common/useHover'

// Màu bao bì: [thường, khi rê chuột]
const PACK_COLOR: Record<string, [string, string]> = {
  'túi zip': ['#cfd9e3', '#dfe8f0'],
  'hộp giấy': ['#e4dfd2', '#f2efe6'],
  'thùng carton': ['#c69456', '#d9a86c'],
}

/** Kiện hàng (túi zip / hộp giấy / thùng carton): click để mở */
export function ShippingBox() {
  const ctx = useCtx()
  const packaging = useGame((s) => s.order?.kit?.packaging ?? 'thùng carton')
  const unbox = useGame((s) => s.unbox)
  const { hover, bind } = useHover(true)
  const W = ctx.width + 2
  const D = ctx.depth + 2
  const bag = packaging === 'túi zip'
  const h = bag ? 1 : 2
  const base = Y.table
  return (
    <group
      onPointerDown={(e) => {
        e.stopPropagation()
        unbox()
        playClick(600)
      }}
      {...bind}
    >
      <mesh position-y={base + h / 2} castShadow>
        <boxGeometry args={[W, h, D]} />
        <meshStandardMaterial
          color={PACK_COLOR[packaging][hover ? 1 : 0]}
          roughness={bag ? 0.2 : 0.9}
          transparent={bag}
          opacity={bag ? 0.8 : 1}
        />
      </mesh>
      {!bag && (
        <mesh position={[0, base + h + 0.01, 0]}>
          <boxGeometry args={[1.2, 0.02, D + 0.02]} />
          <meshStandardMaterial color="#c8b48a" />
        </mesh>
      )}
      <Text
        position={[0, base + h + 0.03, D / 4]}
        rotation-x={-Math.PI / 2}
        fontSize={Math.min(0.9, W / 18)}
        color="#4a2f14"
        anchorX="center"
      >
        CLICK ĐỂ MỞ {packaging.toUpperCase()}
      </Text>
    </group>
  )
}
