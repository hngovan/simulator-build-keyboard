import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { RoundedBox, useGLTF } from '@react-three/drei'
import {
  CylinderGeometry,
  DoubleSide,
  EdgesGeometry,
  Mesh,
  Raycaster,
  SphereGeometry,
  Vector3,
} from 'three'
import type * as THREE from 'three'
import { useGame, useBuild, useCtx, useStep, useStepIdx } from '@/store'
import { CASE_MARGIN, CASE_WALL, Y, caseScrewHoles } from '@/data/steps'
import { BLOCKER_SKIN, BLOCKER_TOP, blockerGaps, keyRegions } from '@/data/layouts'
import type { FootPocket, Key, StepId } from '@/types'
import { playClick } from '@/sound'
import { lerpTo } from '../common/anim'
import { useHover } from '../common/useHover'
import { CaseMaterial, WEIGHT_METALS, woodBoxGeometry, woodUV } from '../materials'
import { ScrewSet } from './Screw'
import {
  caseShellGeometry,
  micaEdgeMaterial,
  micaLayerGeometry,
  micaLayerKind,
  micaStackPlan,
} from './caseShell'
import { caseModelOf } from '@/data/parts'
import { SUPPLIES } from '@/data/supplies'
import { MM } from '../models/Switch'

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
 * `floorTop`: kèm sàn đáy liền, `pockets`: hốc feet CNC lõm ở mặt đáy. Gỗ trải UV vân theo toạ độ thật
 */
function Walls({
  W,
  D,
  y0,
  y1,
  mat,
  wood,
  floorTop,
  pockets,
}: ShellProps & { floorTop?: number; pockets?: FootPocket[] }) {
  const geometry = useMemo(() => {
    const g = caseShellGeometry(W, D, y0, y1, CASE_WALL, floorTop, pockets)
    return wood ? woodUV(g) : g
  }, [W, D, y0, y1, floorTop, wood, pockets])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      {mat}
    </mesh>
  )
}

/**
 * Case mica: nhiều tấm mica cắt phẳng xếp chồng (mỗi lớp 1 tấm viền liền bo góc ngoài, khoét ruột), khe nhỏ
 * giữa các lớp + viền mép cắt trắng mờ. floor: 2 lớp dưới là tấm đáy liền (tấm dưới cùng cắt lỗ feet `pockets`)
 */
function Layers({
  W,
  D,
  y0,
  y1,
  mat,
  floor,
  pockets,
  holes,
  cutouts,
}: ShellProps & {
  floor?: boolean
  pockets?: FootPocket[]
  /** lỗ vít xuyên mọi lớp (case mica 2 mảnh) */
  holes?: FootPocket[]
  /** vùng phím khoét ở tấm trên mặt plate: khung chặn liền 1 tấm với mặt case */
  cutouts?: [number, number][][]
}) {
  const { n, step } = micaStackPlan(y0, y1)
  const geo = useMemo(() => {
    const { h } = micaStackPlan(y0, y1)
    const ring = micaLayerGeometry(W, D, h, CASE_WALL, false, [], holes)
    const solid = micaLayerGeometry(W, D, h, CASE_WALL, true, [], holes)
    const base = micaLayerGeometry(W, D, h, CASE_WALL, true, pockets, holes)
    const frame = micaLayerGeometry(W, D, h, CASE_WALL, false, [], holes, cutouts)
    return {
      ring,
      solid,
      base,
      frame,
      ringEdges: new EdgesGeometry(ring, 30),
      solidEdges: new EdgesGeometry(solid, 30),
      // viền tấm đáy lấy theo tấm liền: không vẽ vòng tròn lỗ feet (mica trong, nhìn từ trong case vẫn thấy)
      baseEdges: new EdgesGeometry(solid, 30),
      frameEdges: new EdgesGeometry(frame, 30),
    }
  }, [W, D, y0, y1, pockets, holes, cutouts])
  useEffect(
    () => () => {
      for (const g of Object.values(geo)) g.dispose()
    },
    [geo],
  )
  return Array.from({ length: n }, (_, i) => {
    const kind = micaLayerKind(i, y0 + i * step, floor ? 2 : 0)
    return (
      <group key={i} position-y={y0 + i * step}>
        <mesh geometry={geo[kind]} castShadow receiveShadow>
          {mat}
        </mesh>
        <lineSegments geometry={geo[`${kind}Edges`]} material={micaEdgeMaterial} />
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
  // tấm khung mỏng ở mặt trên case (BLOCKER_SKIN), bên dưới rỗng; nối vào thành case qua các dải nên không lơ lửng,
  // ăn nhẹ vào thành trong → liền với thành case mà không lòi ra ngoài case CAD mỏng (Bakeneko...)
  return blocks.map((b, i) => {
    const t = b.top ?? top
    const h = Math.min(BLOCKER_SKIN, t - Y.plateBot)
    return (
      <CaseBox
        key={i}
        w={b.w}
        h={h}
        d={b.d}
        radius={0}
        position={[b.x, t - h / 2, b.z]}
        mat={mat}
        wood={wood}
      />
    )
  })
}

/** màu feet theo loại vật tư */
/** feet bán cầu: nửa cầu úp xuống (đỉnh y = 0, đáy cầu y = −1) */
const FOOT_DOME = new SphereGeometry(1, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)

/**
 * Feet cao su dán vào hốc dưới đáy case (`ctx.feet`: case CAD = hốc dò sẵn `caseFeet.json`, case dựng bằng code =
 * 4 hốc CNC). Feet bán cầu theo màu đã dán (`build.feet`, màu = `SUPPLIES[id].color`), lồi ra ~1,5mm dưới đáy.
 * Bước `feet` (case lật úp): hốc chưa dán có vòng vàng, click để dán 1 cái loại đang chọn
 */
function RubberFeet({ pockets }: { pockets: FootPocket[] }) {
  const step = useStep()
  const feet = useBuild().feet ?? {}
  const placeFoot = useGame((s) => s.placeFoot)
  const [hover, setHover] = useState<number | null>(null)
  const active = step === 'feet'
  const next = active ? pockets.findIndex((_, i) => !feet[i]) : -1
  return pockets.map((p, i) => {
    const kind = feet[i]
    const lit = hover === i || next === i
    return (
      <group key={i} position={[p.x, Y.floorBot, p.z]}>
        {kind && (
          <mesh
            geometry={FOOT_DOME}
            position-y={p.depth}
            scale={[p.r * 0.92, p.depth + 0.08, p.r * 0.92]}
            castShadow
          >
            <meshStandardMaterial color={SUPPLIES[kind]?.color ?? '#1c1c1f'} roughness={0.55} />
          </mesh>
        )}
        {active && !kind && (
          <mesh
            rotation-x={Math.PI / 2}
            position-y={-0.006}
            onPointerDown={(e) => {
              e.stopPropagation()
              placeFoot(i)
              playClick(500)
            }}
            onPointerOver={(e) => (e.stopPropagation(), setHover(i))}
            onPointerOut={() => setHover((h) => (h === i ? null : h))}
          >
            <circleGeometry args={[p.r * 1.3, 32]} />
            <meshBasicMaterial
              color={hover === i ? '#ffffff' : '#ffcc2e'}
              transparent
              opacity={lit ? 0.75 : 0.35}
              side={DoubleSide}
              depthWrite={false}
            />
          </mesh>
        )}
      </group>
    )
  })
}

/** standoff tray mount: trụ đồng M2 (u), lỗ ren tối ở đỉnh */
const STANDOFF_R = 0.1
const STANDOFF_HOLE = new CylinderGeometry(0.045, 0.045, 0.004, 16)
/** case CAD có sẵn trụ ngay dưới PCB (khe < ngưỡng) thì không thêm standoff */
const STANDOFF_MIN = 0.03

/**
 * Standoff tray mount liền đáy case dưới, đúng chỗ vít tray (`ctx.screws.trayScrew`): đỉnh tì mặt dưới PCB
 * (theo `seat` nâng / nghiêng board khi vào case), chân xuống sàn. Case dựng bằng code: sàn `Y.floorTop`;
 * case CAD: bắn tia từ mặt dưới PCB xuống model tìm sàn (trúng trụ có sẵn sát PCB thì bỏ qua)
 */
function TrayStandoffs({
  nodes,
  origin,
  floorY = Y.floorTop,
}: {
  nodes: Record<string, THREE.Mesh> | null
  origin: [number, number]
  /** mặt sàn case dựng bằng code (mica: mặt trên 2 tấm đáy) */
  floorY?: number
}) {
  const ctx = useCtx()
  const posts = useMemo(() => {
    const seat = ctx.caseDef.seat
    const t = seat?.tilt ?? 0
    // điểm mặt dưới PCB (toạ độ board) → toạ độ case: xoay quanh x theo tilt rồi dời theo seat
    const top = (x: number, z: number) =>
      new Vector3(
        x + (seat?.dx ?? 0),
        Y.pcbBot * Math.cos(t) - z * Math.sin(t) + (seat?.rise ?? 0),
        Y.pcbBot * Math.sin(t) + z * Math.cos(t) + (seat?.dz ?? 0),
      )
    const meshes = nodes
      ? Object.values(nodes)
          .filter((n) => n.isMesh)
          .map((n) => {
            const m = new Mesh(n.geometry)
            m.position.set(-origin[0], Y.floorBot, -origin[1])
            m.scale.setScalar(MM)
            m.updateMatrixWorld(true)
            return m
          })
      : null
    const ray = new Raycaster()
    return ctx.screws.trayScrew.flatMap((p) => {
      const a = top(p.x, p.z)
      let floor = floorY
      if (meshes) {
        ray.set(new Vector3(a.x, a.y - 0.001, a.z), new Vector3(0, -1, 0))
        const hit = ray.intersectObjects(meshes, false)[0]
        if (!hit || hit.distance < STANDOFF_MIN) return []
        floor = a.y - hit.distance
      }
      const h = a.y - floor
      return h > 0 ? [{ id: p.id, x: a.x, z: a.z, y: floor + h / 2, h }] : []
    })
  }, [ctx, nodes, origin, floorY])
  return posts.map((p) => (
    <group key={p.id} position={[p.x, p.y, p.z]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[STANDOFF_R, STANDOFF_R, p.h, 6]} />
        <meshStandardMaterial color="#c9a54a" metalness={0.85} roughness={0.32} />
      </mesh>
      <mesh geometry={STANDOFF_HOLE} position-y={p.h / 2}>
        <meshStandardMaterial color="#2b2418" metalness={0.4} roughness={0.7} />
      </mesh>
    </group>
  ))
}

/** standoff tray của case CAD: dò sàn theo model GLB */
function CadStandoffs({ model, origin }: { model: string; origin: [number, number] }) {
  const { nodes } = useGLTF(`/models/cases/${model}.glb`) as unknown as {
    nodes: Record<string, THREE.Mesh>
  }
  return <TrayStandoffs nodes={nodes} origin={origin} />
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
  const { dropInCase, closeCase, placeTopCase, nextStep } = useGame.getState()
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
  // case 2 mảnh: lỗ vít ở đáy (nhôm / PC / acrylic) hoặc xuyên mọi lớp (mica ghép)
  const screwHoles = useMemo(() => caseScrewHoles(caseDef, ctx.width, ctx.depth), [ctx, caseDef])
  const floorPockets = useMemo(
    () => (mica ? ctx.feet : [...ctx.feet, ...screwHoles]),
    [ctx, mica, screwHoles],
  )
  // mica: tấm trên mặt plate khoét theo vùng phím → khung chặn liền tấm (không đặt khối chặn rời)
  const cutouts = useMemo(
    () => (mica ? keyRegions(ctx.keys, ctx.width, ctx.depth) : []),
    [ctx, mica],
  )
  const at = (name: StepId) => ctx.steps.indexOf(name)
  const topMount = at('topCase') >= 0
  // board đã thả vào case (bước caseIn xong, bước sau là đậy case): case trên hiện lơ lửng luôn, bấm là sang bước + đậy
  const closeNext = step === 'caseIn' && inCase && ctx.steps[stepIdx + 1] === 'caseClose'
  const showTop =
    two &&
    (step === 'caseOpen' ||
      closeNext ||
      stepIdx >= at('caseClose') ||
      (topMount && stepIdx >= at('topCase')))
  const placing = ((step === 'caseClose' || step === 'topCase') && !closed) || closeNext
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
            <Layers
              W={W}
              D={D}
              y0={Y.floorBot}
              y1={wallTop}
              mat={mat(bottom.hover)}
              floor
              pockets={ctx.feet}
              holes={screwHoles}
              cutouts={cutouts}
            />
          ) : (
            <Walls
              W={W}
              D={D}
              y0={Y.floorBot}
              y1={wallTop}
              floorTop={Y.floorTop}
              pockets={floorPockets}
              mat={bottomMat(bottom.hover)}
              wood={wood && !lower}
            />
          )}
          <RubberFeet pockets={ctx.feet} />
          {ctx.mount === 'tray' &&
            (model ? (
              <CadStandoffs model={model} origin={ctx.origin} />
            ) : (
              <TrayStandoffs
                nodes={null}
                origin={ctx.origin}
                floorY={
                  mica ? Y.floorBot + 2 * micaStackPlan(Y.floorBot, wallTop).step : Y.floorTop
                }
              />
            ))}
          {/* case CAD: khối chặn tới BLOCKER_TOP · case dựng bằng code: vừa bằng mép trên case, không nhô lên.
              Case 2 mảnh: khung chặn thuộc case trên (đi cùng case trên); mica: khung nằm trong tấm mica trên */}
          {!two && (
            <Blockers
              keys={ctx.keys}
              width={ctx.width}
              depth={ctx.depth}
              mat={mat(bottom.hover)}
              wood={wood}
              top={model ? BLOCKER_TOP : Y.caseTop}
            />
          )}
        </group>
      )}
      {showTop && (
        <group
          ref={topRef}
          position-y={topY}
          onPointerDown={
            topMount
              ? onClick('topCase', placeTopCase)
              : closeNext
                ? onClick('caseIn', () => {
                    nextStep()
                    useGame.getState().closeCase()
                  })
                : onClick('caseClose', closeCase)
          }
          {...top.bind}
        >
          {mica ? (
            <Layers
              W={W}
              D={D}
              y0={Y.split}
              y1={Y.caseTop}
              mat={mat(top.hover)}
              holes={screwHoles}
              cutouts={cutouts}
            />
          ) : (
            <>
              <Walls W={W} D={D} y0={Y.split} y1={Y.caseTop} mat={mat(top.hover)} wood={wood} />
              <Blockers
                keys={ctx.keys}
                width={ctx.width}
                depth={ctx.depth}
                mat={mat(top.hover)}
                wood={wood}
                top={Y.caseTop}
              />
            </>
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
