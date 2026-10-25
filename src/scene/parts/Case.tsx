import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { RoundedBox, useGLTF } from '@react-three/drei'
import { DoubleSide, EdgesGeometry } from 'three'
import type * as THREE from 'three'
import { useGame, useBuild, useCtx, useStep, useStepIdx } from '@/store'
import { CASE_MARGIN, CASE_WALL, Y } from '@/data/steps'
import { BLOCKER_TOP, blockerGaps } from '@/data/layouts'
import type { Key, StepId } from '@/types'
import { playClick } from '@/sound'
import { lerpTo } from '../common/anim'
import { useHover } from '../common/useHover'
import { CaseMaterial, WEIGHT_METALS, woodBoxGeometry, woodUV } from '../materials'
import { ScrewSet } from './Screw'
import { caseShellGeometry, micaEdgeMaterial, micaLayerGeometry, micaStackPlan } from './caseShell'
import { caseModelOf } from '@/data/parts'
import { MM } from '../models/Switch'
import CASE_FEET from '@/data/caseFeet.json'

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

/**
 * Vỏ case liền 1 khối (không phải 4 thanh + tấm đáy ghép): vành bo góc khoét ruột từ y0 tới y1,
 * `floorTop`: kèm sàn đáy liền. Gỗ trải UV vân theo toạ độ thật
 */
function Walls({ W, D, y0, y1, mat, wood, floorTop }: ShellProps & { floorTop?: number }) {
  const geometry = useMemo(() => {
    const g = caseShellGeometry(W, D, y0, y1, CASE_WALL, floorTop)
    return wood ? woodUV(g) : g
  }, [W, D, y0, y1, floorTop, wood])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      {mat}
    </mesh>
  )
}

/**
 * Case mica: nhiều tấm mica cắt phẳng xếp chồng (mỗi lớp 1 tấm viền liền bo góc ngoài, khoét ruột), khe nhỏ
 * giữa các lớp + viền mép cắt trắng mờ. floor: 2 lớp dưới là tấm đáy liền
 */
function Layers({ W, D, y0, y1, mat, floor }: ShellProps & { floor?: boolean }) {
  const { n, step } = micaStackPlan(y0, y1)
  const geo = useMemo(() => {
    const { h } = micaStackPlan(y0, y1)
    const ring = micaLayerGeometry(W, D, h, CASE_WALL)
    const solid = micaLayerGeometry(W, D, h, CASE_WALL, true)
    return {
      ring,
      solid,
      ringEdges: new EdgesGeometry(ring, 30),
      solidEdges: new EdgesGeometry(solid, 30),
    }
  }, [W, D, y0, y1])
  useEffect(
    () => () => {
      for (const g of Object.values(geo)) g.dispose()
    },
    [geo],
  )
  return Array.from({ length: n }, (_, i) => {
    const solid = floor && i < 2
    return (
      <group key={i} position-y={y0 + i * step}>
        <mesh geometry={solid ? geo.solid : geo.ring} castShadow receiveShadow>
          {mat}
        </mesh>
        <lineSegments
          geometry={solid ? geo.solidEdges : geo.ringEdges}
          material={micaEdgeMaterial}
        />
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

const FEET_MAT = <meshStandardMaterial color="#111" roughness={1} />

/**
 * Feet cao su: case CAD có hốc dán feet (`caseFeet.json`, `node scripts/probe-case-feet.mjs`) thì dán đúng vào hốc,
 * lồi ra 1mm dưới đáy; case dựng bằng code / case CAD không dò được hốc thì đặt 4 góc
 */
function RubberFeet({
  W,
  D,
  model,
  origin,
}: {
  W: number
  D: number
  model?: string
  origin: [number, number]
}) {
  const pockets = model ? (CASE_FEET as Record<string, number[][]>)[model] : undefined
  if (pockets)
    return (
      <group position={[-origin[0], Y.floorBot, -origin[1]]} scale={MM}>
        {/* [x, z, bán kính, độ sâu trần hốc] (mm, hệ toạ độ model case) */}
        {pockets.map(([x, z, r, depth], i) => (
          <mesh key={i} position={[x, (depth - 1) / 2, z]}>
            <cylinderGeometry args={[r * 0.92, r * 0.92, depth + 1, 24]} />
            {FEET_MAT}
          </mesh>
        ))}
      </group>
    )
  return [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].map(([sx, sz], i) => (
    <mesh key={i} position={[sx * (W / 2 - 0.7), Y.floorBot - 0.02, sz * (D / 2 - 0.5)]}>
      <cylinderGeometry args={[0.22, 0.22, 0.04, 16]} />
      {FEET_MAT}
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
            <Walls
              W={W}
              D={D}
              y0={Y.floorBot}
              y1={wallTop}
              floorTop={Y.floorTop}
              mat={bottomMat(bottom.hover)}
              wood={wood && !lower}
            />
          )}
          <RubberFeet W={W} D={D} model={model} origin={ctx.origin} />
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
