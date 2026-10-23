import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { useGame, useCtx, useStep } from '@/store'
import { TOOLS } from '@/data/parts'
import { SCREW_STEPS } from '@/data/steps'
import type { ScrewPoint, ScrewStep } from '@/types'
import { playDrill, playScrew } from '@/sound'
import { lerpTo } from '../common/anim'
import { useHover } from '../common/useHover'
import { ElectricScrewdriver, ManualScrewdriver } from '../models/HandTools'

interface ScrewProps extends ScrewPoint {
  y?: number
  mode: 'remove' | 'tighten'
  interactive: boolean
}

/** Con vít: click để vặn (tua vít tay 3 lần, tua vít điện 1 lần). Rê chuột hiện tua vít */
export function Screw({ id, x, y = 0, z, mode, interactive }: ScrewProps) {
  const turns = useGame((s) => s.build?.screws[id] ?? 0)
  const toolLv = useGame((s) => s.tools.screw)
  const turnScrew = useGame((s) => s.turnScrew)
  const clicks = TOOLS.screw[toolLv].clicks!
  const done = turns >= clicks
  const { hover, bind } = useHover(interactive && !done)
  const ref = useRef<THREE.Group>(null)
  const p = Math.min(1, turns / clicks)
  const lift = mode === 'tighten' ? (1 - p) * 0.25 : p * 0.25
  useFrame((_, dt) => {
    lerpTo(ref, 'y', y + lift, dt)
    if (ref.current)
      ref.current.rotation.y += (turns * 2.2 - ref.current.rotation.y) * Math.min(1, dt * 10)
  })

  // tua vít vẫn hiện thêm 1 chút sau click cuối để thấy hiệu ứng
  const [showTool, setShowTool] = useState(false)
  useEffect(() => {
    if (hover) return setShowTool(true)
    const t = setTimeout(() => setShowTool(false), 350)
    return () => clearTimeout(t)
  }, [hover])

  const removed = mode === 'remove' && done
  if (removed && !showTool) return null
  return (
    <group position={[x, 0, z]}>
      <group
        ref={ref}
        position-y={y + lift}
        onPointerDown={(e) => {
          if (!interactive || done) return
          e.stopPropagation()
          turnScrew(id)
          if (toolLv) playDrill()
          else playScrew()
        }}
        {...bind}
      >
        {!removed && (
          <>
            <mesh castShadow>
              <cylinderGeometry args={[0.11, 0.11, 0.06, 16]} />
              <meshStandardMaterial
                color={hover ? '#ffd84a' : done ? '#8a8f99' : '#d9dde3'}
                metalness={0.9}
                roughness={0.3}
              />
            </mesh>
            {[0, Math.PI / 2].map((r) => (
              <mesh key={r} position-y={0.031} rotation-y={r}>
                <boxGeometry args={[0.16, 0.015, 0.035]} />
                <meshBasicMaterial color="#333" />
              </mesh>
            ))}
            <mesh position-y={-0.16}>
              <cylinderGeometry args={[0.04, 0.04, 0.28, 8]} />
              <meshStandardMaterial color="#aaa" metalness={0.9} />
            </mesh>
          </>
        )}
        {interactive && !done && !hover && (
          <mesh position-y={0.04} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.15, 0.2, 24]} />
            <meshBasicMaterial color="#ffd84a" transparent opacity={0.8} />
          </mesh>
        )}
      </group>
      {showTool && interactive && (
        <group position-y={y + lift + 0.04} rotation={[0.35, 0, -0.3]} scale={1.6}>
          {toolLv ? <ElectricScrewdriver spinKey={turns} /> : <ManualScrewdriver spinKey={turns} />}
        </group>
      )}
    </group>
  )
}

/** Bộ vít của 1 bước. flip: vít bắt từ mặt dưới (đầu vít hướng xuống) */
export function ScrewSet({ step, y, flip }: { step: ScrewStep; y: number; flip?: boolean }) {
  const ctx = useCtx()
  const cur = useStep()
  const list = ctx.screws[step].map((sc) => (
    <Screw
      key={sc.id}
      {...sc}
      y={flip ? 0 : y}
      mode={SCREW_STEPS[step]}
      interactive={cur === step}
    />
  ))
  return flip ? (
    <group position-y={y} rotation-x={Math.PI}>
      {list}
    </group>
  ) : (
    <>{list}</>
  )
}
