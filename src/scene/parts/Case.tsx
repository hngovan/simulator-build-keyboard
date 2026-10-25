import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { RoundedBox, useGLTF } from '@react-three/drei'
import { DoubleSide } from 'three'
import type * as THREE from 'three'
import { useGame, useBuild, useCtx, useStep, useStepIdx } from '@/store'
import { CASE_MARGIN, CASE_WALL, Y } from '@/data/steps'
import { BLOCKER_TOP, blockerGaps } from '@/data/layouts'
import type { Key, StepId } from '@/types'
import { playClick } from '@/sound'
import { lerpTo } from '../common/anim'
import { useHover } from '../common/useHover'
import { CaseMaterial, WEIGHT_METALS, woodBoxGeometry } from '../materials'
import { ScrewSet } from './Screw'
import { caseModelOf } from '@/data/parts'
import { MM } from '../models/Switch'

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
  wood?: boolean
}

function CaseBox({
  w,
  h,
  d,
  radius,
  position,
  mat,
  wood,
}: {
  w: number
  h: number
  d: number
  radius: number
  position: [number, number, number]
  mat: ReactNode
  wood?: boolean
}) {
  const geometry = useMemo(
    () => (wood ? woodBoxGeometry(w, h, d, radius) : null),
    [w, h, d, radius, wood],
  )
  if (wood)
    return (
      <mesh geometry={geometry!} position={position} castShadow receiveShadow>
        {mat}
      </mesh>
    )
  return (
    <RoundedBox args={[w, h, d]} radius={radius} position={position} castShadow receiveShadow>
      {mat}
    </RoundedBox>
  )
}

function Walls({ W, D, y0, y1, mat, wood }: ShellProps) {
  const h = y1 - y0
  return wallRects(W, D).map(([x, z, w, d], i) => (
    <CaseBox
      key={i}
      w={w}
      h={h}
      d={d}
      radius={Math.min(0.08, h / 3)}
      position={[x, (y0 + y1) / 2, z]}
      mat={mat}
      wood={wood}
    />
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

/**
 * Khối chặn (blocker) liền case ở chỗ trống hàng dưới cùng: 2 đầu HHKB, giữa Ctrl / Alt của WKL...
 * (vị trí từ blockerGaps), lấp bằng khối cùng chất liệu case
 */
function Blockers({
  keys,
  width,
  depth,
  mat,
  wood,
  top = BLOCKER_TOP,
}: {
  keys: Key[]
  width: number
  depth: number
  mat: ReactNode
  wood?: boolean
  /** mặt trên khối chặn: ngang mép trên case đang dùng (case dựng bằng code thấp hơn case CAD) */
  top?: number
}) {
  const blocks = useMemo(
    () => blockerGaps(keys, width, depth, CASE_MARGIN + 0.05),
    [keys, width, depth],
  )
  // khối vuông cạnh từ mặt plate lên ngang mép case, ăn nhẹ vào thành trong (0.2u từ mép phím) →
  // liền với thành case mà không lòi ra ngoài case CAD mỏng (Bakeneko...)
  const h = top - Y.plateBot
  return blocks.map((b, i) => (
    <CaseBox
      key={i}
      w={b.w}
      h={b.top !== undefined ? b.top - Y.plateBot : h}
      d={b.d}
      radius={0}
      position={[b.x, Y.plateBot + (b.top !== undefined ? b.top - Y.plateBot : h) / 2, b.z]}
      mat={mat}
      wood={wood}
    />
  ))
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

/**
 * Case từ bản vẽ CAD thật (MIT, `bun run convert:cases`): hệ mm, đáy ở y = 0, tâm ở gốc.
 * Đặt đáy trùng đáy case dựng bằng code, vẫn tô theo chất liệu + màu khách chọn
 */
function CaseModel({
  model,
  origin,
  weight = 'brass',
  bottomMat,
  children,
}: {
  model: string
  origin: [number, number]
  weight?: keyof typeof WEIGHT_METALS
  /** vật liệu đáy (node "bottom"), không có thì dùng chung vật liệu nắp */
  bottomMat?: ReactNode
  children: ReactNode
}) {
  const { nodes } = useGLTF(`/models/cases/${model}.glb`) as unknown as {
    nodes: Record<string, THREE.Mesh>
  }
  // vỏ tô theo chất liệu + màu khách chọn; tạ / badge (node "weight") tô kim loại riêng
  return (
    <group position={[-origin[0], Y.floorBot, -origin[1]]} scale={MM}>
      <mesh geometry={nodes.case.geometry} castShadow receiveShadow>
        {children}
      </mesh>
      {nodes.bottom && (
        <mesh geometry={nodes.bottom.geometry} castShadow receiveShadow>
          {bottomMat ?? children}
        </mesh>
      )}
      {nodes.weight && (
        <mesh geometry={nodes.weight.geometry} castShadow receiveShadow>
          <meshStandardMaterial {...WEIGHT_METALS[weight]} side={DoubleSide} />
        </mesh>
      )}
    </group>
  )
}

/** Case 1 hoặc 2 mảnh, nhiều chất liệu; vít ở đáy hoặc trên (mica).
 * topOnly: chỉ vẽ case trên (top mount: úp + bắt vít plate trước khi thả vào case dưới) */
export function Case({ topOnly = false }: { topOnly?: boolean }) {
  const ctx = useCtx()
  const color = useGame((s) => s.inventory.case!.color)
  const step = useStep()
  const stepIdx = useStepIdx()
  const { closed, inCase } = useBuild()
  const { dropInCase, closeCase, placeTopCase } = useGame.getState()
  const topRef = useRef<THREE.Group>(null)
  const { caseDef, screwSide } = ctx
  const order = useGame((s) => s.order)
  // nắp CAD riêng theo layout (Exodus60: WK / WKL / HHKB)
  const model = order ? caseModelOf(caseDef, order.layout, order.variant) : caseDef.model
  const two = caseDef.pieces === 2
  const mica = caseDef.material === 'mica'
  const wood = caseDef.material === 'wood'
  const W = ctx.width + 2 * (CASE_MARGIN + CASE_WALL)
  const D = ctx.depth + 2 * (CASE_MARGIN + CASE_WALL)
  const at = (name: StepId) => ctx.steps.indexOf(name)
  const topMount = at('topCase') >= 0
  const showTop =
    two &&
    (step === 'caseOpen' || stepIdx >= at('caseClose') || (topMount && stepIdx >= at('topCase')))
  const placing = (step === 'caseClose' || step === 'topCase') && !closed
  // case trên chờ đậy / úp lơ lửng; top mount: case trên đã bắt vít vào plate nên nhấc lên cùng board khi thả vào case
  const topY = placing || (topMount && step === 'caseIn' && !inCase) ? 2.6 : 0
  const bottom = useHover(step === 'caseIn')
  const top = useHover(placing)
  useFrame((_, dt) => lerpTo(topRef, 'y', topY, dt, 6))

  const mat = (hover: boolean) => (
    <CaseMaterial material={caseDef.material} color={color} hover={hover} />
  )
  // case 2 tông: đáy chất liệu / màu riêng (vd nắp PC, đáy nhôm)
  const lower = caseDef.bottom
  const bottomMat = (hover: boolean, doubleSide?: boolean) =>
    lower ? (
      <CaseMaterial
        material={lower.material}
        color={lower.color}
        hover={hover}
        doubleSide={doubleSide}
      />
    ) : (
      <CaseMaterial
        material={caseDef.material}
        color={color}
        hover={hover}
        doubleSide={doubleSide}
      />
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
      {!topOnly && (
        <group onPointerDown={onClick('caseIn', dropInCase)} {...bottom.bind}>
          {model ? (
            <CaseModel
              model={model}
              origin={ctx.origin}
              weight={caseDef.weight}
              bottomMat={lower && bottomMat(bottom.hover, true)}
            >
              {/* STL in 3D hay có mặt lật chiều → vẽ 2 mặt cho khỏi trong suốt */}
              <CaseMaterial
                material={caseDef.material}
                color={color}
                hover={bottom.hover}
                doubleSide
              />
            </CaseModel>
          ) : mica ? (
            <Layers W={W} D={D} y0={Y.floorBot} y1={wallTop} mat={mat(bottom.hover)} floor />
          ) : (
            <>
              <CaseBox
                w={W}
                h={Y.floorTop - Y.floorBot}
                d={D}
                radius={0.12}
                position={[0, (Y.floorTop + Y.floorBot) / 2, 0]}
                mat={bottomMat(bottom.hover)}
                wood={wood && !lower}
              />
              <Walls
                W={W}
                D={D}
                y0={Y.floorBot}
                y1={wallTop}
                mat={bottomMat(bottom.hover)}
                wood={wood && !lower}
              />
            </>
          )}
          <RubberFeet W={W} D={D} />
          {/* case CAD: khối chặn tới BLOCKER_TOP · case dựng bằng code: vừa bằng mép trên case, không nhô lên */}
          <Blockers
            keys={ctx.keys}
            width={ctx.width}
            depth={ctx.depth}
            mat={mat(bottom.hover)}
            wood={wood}
            top={model ? BLOCKER_TOP : Y.caseTop}
          />
        </group>
      )}
      {showTop && (
        <group
          ref={topRef}
          position-y={topY}
          onPointerDown={
            topMount ? onClick('topCase', placeTopCase) : onClick('caseClose', closeCase)
          }
          {...top.bind}
        >
          {mica ? (
            <Layers W={W} D={D} y0={Y.split} y1={Y.caseTop} mat={mat(top.hover)} />
          ) : (
            <Walls W={W} D={D} y0={Y.split} y1={Y.caseTop} mat={mat(top.hover)} wood={wood} />
          )}
          {/* top mount: vít plate bắt vào mép dưới vách case trên, đi cùng case trên */}
          {topMount && stepIdx >= at('topScrew') && <ScrewSet step="topScrew" y={Y.split} flip />}
        </group>
      )}
      {step === 'caseOpen' && <ScrewSet step="caseOpen" y={screwY} flip={screwSide === 'bottom'} />}
      {two && stepIdx >= at('caseScrew') && (
        <ScrewSet step="caseScrew" y={screwY} flip={screwSide === 'bottom'} />
      )}
    </group>
  )
}
