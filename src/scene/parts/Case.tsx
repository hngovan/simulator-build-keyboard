import { useRef, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import type * as THREE from 'three'
import { useGame, useBuild, useCtx, useStep, useStepIdx } from '@/store'
import { CASE_MARGIN, CASE_WALL, Y } from '@/data/steps'
import type { StepId } from '@/types'
import { playClick } from '@/sound'
import { lerpTo } from '../common/anim'
import { useHover } from '../common/useHover'
import { CaseMaterial } from '../materials'
import { ScrewSet } from './Screw'

type Rect = [x: number, z: number, w: number, d: number]

// 4 thành case theo kích thước ngoài W × D
const wallRects = (W: number, D: number): Rect[] => {
  const t = CASE_WALL
  return [
    [0, -D / 2 + t / 2, W, t],
    [0, D / 2 - t / 2, W, t],
    [-W / 2 + t / 2, 0, t, D - 2 * t],
    [W / 2 - t / 2, 0, t, D - 2 * t],
  ]
}

interface ShellProps {
  W: number
  D: number
  y0: number
  y1: number
  mat: ReactNode
}

function Walls({ W, D, y0, y1, mat }: ShellProps) {
  const h = y1 - y0
  return wallRects(W, D).map(([x, z, w, d], i) => (
    <RoundedBox
      key={i}
      args={[w, h, d]}
      radius={Math.min(0.08, h / 3)}
      position={[x, (y0 + y1) / 2, z]}
      castShadow
      receiveShadow
    >
      {mat}
    </RoundedBox>
  ))
}

/** Case mica: nhiều lớp mỏng xếp chồng, có khe giữa các lớp. floor: 2 lớp dưới là tấm đáy liền */
function Layers({ W, D, y0, y1, mat, floor }: ShellProps & { floor?: boolean }) {
  const n = Math.max(1, Math.round((y1 - y0) / 0.15))
  const h = (y1 - y0) / n
  return Array.from({ length: n }, (_, i) => {
    const y = y0 + i * h + h / 2
    if (floor && i < 2)
      return (
        <mesh key={i} position-y={y}>
          <boxGeometry args={[W, h - 0.012, D]} />
          {mat}
        </mesh>
      )
    return (
      <group key={i}>
        {wallRects(W, D).map(([x, z, w, d], j) => (
          <mesh key={j} position={[x, y, z]}>
            <boxGeometry args={[w, h - 0.012, d]} />
            {mat}
          </mesh>
        ))}
      </group>
    )
  })
}

function RubberFeet({ W, D }: { W: number; D: number }) {
  return [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].map(([sx, sz], i) => (
    <mesh key={i} position={[sx * (W / 2 - 0.7), Y.floorBot - 0.02, sz * (D / 2 - 0.5)]}>
      <cylinderGeometry args={[0.22, 0.22, 0.04, 16]} />
      <meshStandardMaterial color="#111" roughness={1} />
    </mesh>
  ))
}

/** Case 1 hoặc 2 mảnh, nhiều chất liệu; vít ở đáy hoặc trên (mica) */
export function Case() {
  const ctx = useCtx()
  const color = useGame((s) => s.inventory.case!.color)
  const step = useStep()
  const stepIdx = useStepIdx()
  const closed = useBuild().closed
  const { dropInCase, closeCase } = useGame.getState()
  const topRef = useRef<THREE.Group>(null)
  const { caseDef, screwSide } = ctx
  const two = caseDef.pieces === 2
  const mica = caseDef.material === 'mica'
  const W = ctx.width + 2 * (CASE_MARGIN + CASE_WALL)
  const D = ctx.depth + 2 * (CASE_MARGIN + CASE_WALL)
  const at = (name: StepId) => ctx.steps.indexOf(name)
  const showTop = two && (step === 'caseOpen' || stepIdx >= at('caseClose'))
  const topY = step === 'caseClose' && !closed ? 2.6 : 0
  const bottom = useHover(step === 'caseIn')
  const top = useHover(step === 'caseClose' && !closed)
  useFrame((_, dt) => lerpTo(topRef, 'y', topY, dt, 6))

  const mat = (hover: boolean) => (
    <CaseMaterial material={caseDef.material} color={color} hover={hover} />
  )
  const wallTop = two ? Y.split : Y.caseTop
  const screwY = screwSide === 'top' ? Y.caseTop : Y.floorBot
  const onClick = (target: StepId, action: () => void) => (e: ThreeEvent<PointerEvent>) => {
    if (step !== target) return
    e.stopPropagation()
    action()
    playClick(700)
  }

  return (
    <group>
      <group onPointerDown={onClick('caseIn', dropInCase)} {...bottom.bind}>
        {mica ? (
          <Layers W={W} D={D} y0={Y.floorBot} y1={wallTop} mat={mat(bottom.hover)} floor />
        ) : (
          <>
            <RoundedBox
              args={[W, Y.floorTop - Y.floorBot, D]}
              radius={0.12}
              position-y={(Y.floorTop + Y.floorBot) / 2}
              castShadow
              receiveShadow
            >
              {mat(bottom.hover)}
            </RoundedBox>
            <Walls W={W} D={D} y0={Y.floorBot} y1={wallTop} mat={mat(bottom.hover)} />
          </>
        )}
        <RubberFeet W={W} D={D} />
      </group>
      {showTop && (
        <group
          ref={topRef}
          position-y={topY}
          onPointerDown={onClick('caseClose', closeCase)}
          {...top.bind}
        >
          {mica ? (
            <Layers W={W} D={D} y0={Y.split} y1={Y.caseTop} mat={mat(top.hover)} />
          ) : (
            <Walls W={W} D={D} y0={Y.split} y1={Y.caseTop} mat={mat(top.hover)} />
          )}
        </group>
      )}
      {step === 'caseOpen' && <ScrewSet step="caseOpen" y={screwY} flip={screwSide === 'bottom'} />}
      {two && stepIdx >= at('caseScrew') && (
        <ScrewSet step="caseScrew" y={screwY} flip={screwSide === 'bottom'} />
      )}
    </group>
  )
}
