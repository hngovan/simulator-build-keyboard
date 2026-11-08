import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Clone, Html, RoundedBox, useGLTF } from '@react-three/drei'
import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Path,
  Shape,
  EdgesGeometry,
  Mesh,
  Quaternion,
  Raycaster,
  SphereGeometry,
  Vector3,
} from 'three'
import type * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { ringPosts } from './ringPosts'
import { RIB_H, RIB_T, absRibs, hasAbsRibs, wallRibBox } from './absRibs'
import { useGame, useBuild, useCtx, useStep, useStepIdx } from '@/store'
import {
  CASE_MARGIN,
  CASE_WALL,
  caseWall,
  ABS_BOSS,
  ABS_SCREW,
  ABS_SHELL,
  ABS_TOP,
  DTB_MM,
  caseFloorBot,
  caseTopOf,
  absTwo,
  pcbUsbSpot,
  caseFloorTop,
  gasketTabbed,
  GASKET,
  GASKET_NOTCH,
  TOP_FLIP_STEPS,
  TOP_HOLE,
  TOP_NOTCH,
  TOP_TAB,
  Y,
  caseBores,
  caseScrewHoles,
  caseScrewY,
  torqueSpec,
  coverBeforeJst,
  stepBit,
} from '@/data/steps'
import { TOOLS, screwLevel } from '@/data/parts'
import { SkillBar } from '@/components/game/SkillBar'
import { SKILL_PORTAL } from '@/components/game/skillPortal'
import { skillBusy, startSkill, useSkill } from '../common/skill'
import { BLOCKER_SKIN, BLOCKER_TOP, blockerGaps, keyRegions } from '@/data/layouts'
import type { CaseDef, FootPocket, Key, StepId } from '@/types'
import { playClick, playDrill, playScrew } from '@/sound'
import { lerpTo } from '../common/anim'
import { useHover } from '../common/useHover'
import { CaseMaterial, WEIGHT_METALS, woodBoxGeometry, woodUV } from '../materials'
import { CurrentDriver, OUT_MS, ScrewSet } from './Screw'
import { SCREW_SPIN, SPIN_MS } from '../models/HandTools'
import { useAssemblyFlipped, useCaseSplit } from './caseSplit'
import { HintArrow } from '../stations/StationKit'
import {
  absTwoShellGeometry,
  caseShellGeometry,
  micaEdgeMaterial,
  micaHitsPort,
  micaLayerGeometry,
  micaLayerKind,
  micaStackPlan,
  type ShellTub,
  type WallBore,
  type WallNotch,
  type WallPort,
} from './caseShell'
import { Daughterboard, jstStand, usbPort } from './Daughterboard'
import { BatterySlot } from './Battery'
import { caseModelOf } from '@/data/parts'
import { SUPPLIES } from '@/data/supplies'
import { MM } from '../models/Switch'
import { HINT_COLOR, HINT_HOVER } from '../common/hoverOutline'

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
  notches,
  notchTop,
  bores,
  ports,
  tub,
  wall = CASE_WALL,
}: ShellProps & {
  floorTop?: number
  pockets?: FootPocket[]
  /** hốc khoét mặt trong vách từ đáy lên tới `notchTop` (top mount) */
  notches?: WallNotch[]
  notchTop?: number
  /** lỗ khoan đứng (lỗ vít xuyên / lỗ ren / hốc chìm đầu ốc) */
  bores?: WallBore[]
  /** lỗ ngang xuyên vách sau (cổng USB daughterboard) */
  ports?: WallPort[]
  /** bề dày thành (nhựa ABS mỏng hơn, `caseWall`) */
  wall?: number
  /** hốc pin khoét xuống sàn (case nhôm sàn dày) */
  tub?: ShellTub
}) {
  const key = JSON.stringify([notches ?? [], bores ?? [], ports ?? [], tub ?? null])
  const geometry = useMemo(() => {
    const g = caseShellGeometry(W, D, y0, y1, wall, floorTop, pockets, ...cuts(key, notchTop))
    return wood ? woodUV(g) : g
  }, [W, D, y0, y1, wall, floorTop, wood, pockets, key, notchTop])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      {mat}
    </mesh>
  )
}

/**
 * Case nhựa 2 mảnh kiểu đúc (`absTwoShellGeometry`): case trên trùm case dưới, thành rỗng 2 lớp da có gân ngang; trụ vít vẽ riêng
 * (`AbsScrewBosses`, kèm ren đồng)
 */
function AbsTwoShell({
  part,
  W,
  D,
  wall,
  mat,
  notches,
  notchTop,
  pockets,
  bores,
  ports,
}: {
  part: 'top' | 'bottom'
  W: number
  D: number
  wall: number
  mat: ReactNode
  notches?: WallNotch[]
  notchTop?: number
  pockets?: FootPocket[]
  bores?: WallBore[]
  ports?: WallPort[]
}) {
  const ctx = useCtx()
  const screws = ctx.screws.caseOpen
  const floor = caseFloorTop(ctx.caseDef)
  const key = JSON.stringify([
    notches ?? [],
    notchTop ?? null,
    pockets ?? [],
    bores ?? [],
    ports ?? [],
    screws.map((p) => [p.x, p.z]),
  ])
  const geometry = useMemo(() => {
    const [nt, top, pk, br, po, sc] = JSON.parse(key) as [
      WallNotch[],
      number | null,
      FootPocket[],
      WallBore[],
      WallPort[],
      [number, number][],
    ]
    return absTwoShellGeometry(
      part,
      W,
      D,
      wall,
      { bot: caseFloorBot(ctx.caseDef), floor, split: Y.split, top: caseTopOf(ctx.caseDef) },
      ABS_SHELL,
      {
        screws: sc.map(([x, z]) => ({ x, z })),
        hole: part === 'top' ? ABS_SCREW.tap : ABS_SCREW.thru,
        notches: nt,
        notchTop: top ?? undefined,
        pockets: pk,
        bores: br,
        ports: po,
      },
    )
  }, [part, W, D, wall, floor, key])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      {mat}
    </mesh>
  )
}

/** khoét vỏ theo khoá JSON (hốc / lỗ khoan, ghi nhớ theo nội dung chứ không theo mảng mới mỗi lần vẽ) */
const cuts = (key: string, notchTop?: number) => {
  const [notches, bores, ports, tub] = JSON.parse(key) as [
    WallNotch[],
    WallBore[],
    WallPort[],
    ShellTub | null,
  ]
  return [notches, notchTop, bores, ports, tub ?? undefined] as const
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
  ports = [],
  notches = [],
}: ShellProps & {
  floor?: boolean
  pockets?: FootPocket[]
  /** lỗ vít xuyên mọi lớp (case mica 2 mảnh) */
  holes?: FootPocket[]
  /** vùng phím khoét ở tấm trên mặt plate: khung chặn liền 1 tấm với mặt case */
  cutouts?: [number, number][][]
  /** cổng USB daughterboard: tấm viền nằm ngang tầm cổng khoét rãnh xuyên vách sau (mica cắt laser) */
  ports?: WallPort[]
  /** hốc tai plate top mount ở tấm viền (case trên, dưới mặt plate) */
  notches?: WallNotch[]
}) {
  const { n, step, h: layerH } = micaStackPlan(y0, y1)
  const portKey = JSON.stringify(ports)
  const notchKey = JSON.stringify(notches)
  const geo = useMemo(() => {
    const { h } = micaStackPlan(y0, y1)
    const slots = (JSON.parse(portKey) as WallPort[]).map((o) => ({ x: o.x, w: o.w }))
    const nt = JSON.parse(notchKey) as WallNotch[]
    const slot = micaLayerGeometry(W, D, h, CASE_WALL, false, [], holes, [], slots, nt)
    const ring = micaLayerGeometry(W, D, h, CASE_WALL, false, [], holes, [], [], nt)
    const solid = micaLayerGeometry(W, D, h, CASE_WALL, true, [], holes)
    const base = micaLayerGeometry(W, D, h, CASE_WALL, true, pockets, holes)
    const frame = micaLayerGeometry(W, D, h, CASE_WALL, false, [], holes, cutouts)
    return {
      ring,
      solid,
      base,
      frame,
      slot,
      slotEdges: new EdgesGeometry(slot, 30),
      ringEdges: new EdgesGeometry(ring, 30),
      solidEdges: new EdgesGeometry(solid, 30),
      // viền tấm đáy lấy theo tấm liền: không vẽ vòng tròn lỗ feet (mica trong, nhìn từ trong case vẫn thấy)
      baseEdges: new EdgesGeometry(solid, 30),
      frameEdges: new EdgesGeometry(frame, 30),
    }
  }, [W, D, y0, y1, pockets, holes, cutouts, portKey, notchKey])
  useEffect(
    () => () => {
      for (const g of Object.values(geo)) g.dispose()
    },
    [geo],
  )
  return Array.from({ length: n }, (_, i) => {
    const y = y0 + i * step
    const base = micaLayerKind(i, y, floor ? 2 : 0)
    const kind = base === 'ring' && ports.some((o) => micaHitsPort(y, layerH, o)) ? 'slot' : base
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
 * Bước `feet` (case lật úp): hốc chưa dán có vòng xanh, click để dán 1 cái loại đang chọn
 */
function RubberFeet({ pockets }: { pockets: FootPocket[] }) {
  const step = useStep()
  const feet = useBuild().feet ?? {}
  // mặt đáy case (case nhựa nâng đáy)
  const bot = caseFloorBot(useCtx().caseDef)
  const placeFoot = useGame((s) => s.placeFoot)
  const [hover, setHover] = useState<number | null>(null)
  // hốc ở mặt đáy: chỉ dán được khi case đang lật úp (Q lật lên mặt trên thì không bấm xuyên qua case)
  const flipped = useAssemblyFlipped()
  const active = step === 'feet' && flipped
  // hốc dán tiếp: bắt đầu từ góc phải (bên trái có cột HUD, menu sổ ra che mũi tên), phải → trái
  const next = active
    ? pockets.reduce(
        (best, p, i) => (feet[i] || (best >= 0 && pockets[best].x >= p.x) ? best : i),
        -1,
      )
    : -1
  return pockets.map((p, i) => {
    const kind = feet[i]
    const lit = hover === i || next === i
    return (
      // gốc = mặt đáy quanh hốc (đáy 2 tầng: hốc phía trước cao hơn đáy thấp nhất), feet nhô ra dưới mặt đó như nhau
      <group key={i} position={[p.x, bot + (p.floor ?? 0), p.z]}>
        {/* mũi tên xanh chỉ hốc dán tiếp theo: dưới đáy, mũi hướng vào đáy (case đang lật úp thì chỉ xuống) */}
        {i === next && hover !== i && (
          <group rotation-x={Math.PI}>
            <HintArrow at={[0, 0.05, 0]} size={1.6} />
          </group>
        )}
        {kind && (
          <mesh
            geometry={FOOT_DOME}
            position-y={p.depth - (p.floor ?? 0)}
            scale={[p.r * 0.92, p.depth - (p.floor ?? 0) + 0.08, p.r * 0.92]}
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
              color={hover === i ? HINT_HOVER : HINT_COLOR}
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

/**
 * O-ring case 1 mảnh dựng bằng code: trụ tròn đúc liền vách trước / sau mọc từ sàn lên (`ringPosts`), đỉnh sát mặt dưới
 * mép board; gộp 1 lưới
 */
function RingPosts({ mat }: { mat: ReactNode }) {
  const ctx = useCtx()
  const geometry = useMemo(() => {
    const parts = ringPosts(ctx).map((p) =>
      new CylinderGeometry(p.r, p.r, p.y1 - p.y0, 24).translate(p.x, (p.y0 + p.y1) / 2, p.z),
    )
    if (!parts.length) return null
    const g = mergeGeometries(parts)
    parts.forEach((p) => p.dispose())
    return g
  }, [ctx])
  useEffect(() => () => geometry?.dispose(), [geometry])
  if (!geometry) return null
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      {mat}
    </mesh>
  )
}

/** case nhựa ABS dựng bằng code: khung xương cá đúc liền sàn + gân đứng tựa vách (`absRibs`), gộp 1 lưới */
function AbsRibs({ mat }: { mat: ReactNode }) {
  const ctx = useCtx()
  const geometry = useMemo(() => {
    const { segs, walls, floor } = absRibs(ctx)
    const parts = [
      ...segs.map((s) => {
        // đoạn nối liền nhau (cao / thấp): chỉ đoạn cao mới chờm thêm nửa bề dày 2 đầu (chỗ giao gân / chạm vách)
        const h = s.h ?? RIB_H
        const len = Math.hypot(s.x1 - s.x0, s.z1 - s.z0) + (s.tall ? RIB_T : 0)
        return new BoxGeometry(len, h, RIB_T)
          .rotateY(-Math.atan2(s.z1 - s.z0, s.x1 - s.x0))
          .translate((s.x0 + s.x1) / 2, floor + h / 2, (s.z0 + s.z1) / 2)
      }),
      ...walls.map((w) => {
        const [x0, x1, z0, z1] = wallRibBox(w)
        const h = w.y1 - floor
        return new BoxGeometry(x1 - x0, h, z1 - z0).translate(
          (x0 + x1) / 2,
          floor + h / 2,
          (z0 + z1) / 2,
        )
      }),
    ]
    if (!parts.length) return null
    const g = mergeGeometries(parts)
    parts.forEach((p) => p.dispose())
    return g
  }, [ctx])
  useEffect(() => () => geometry?.dispose(), [geometry])
  if (!geometry) return null
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      {mat}
    </mesh>
  )
}

/** top mount: độ sâu lỗ ren M2 khoan lên từ trần hốc tai plate (u) */
const TOP_TAP_DEPTH = 0.15

/** đáy lỗ ren tối (lòng lỗ khoan CSG trong vỏ được chiếu sáng, nhìn không ra độ sâu): đĩa đen ở cuối lỗ, mặt hướng xuống */
function BoreEnds({ holes }: { holes: { x: number; z: number; r: number; y: number }[] }) {
  return holes.map((h, i) => (
    <mesh key={i} position={[h.x, h.y - 0.002, h.z]} rotation-x={Math.PI / 2}>
      <circleGeometry args={[h.r, 24]} />
      <meshBasicMaterial color="#060607" />
    </mesh>
  ))
}

/** hốc trong vách case trên cho tai plate top mount: đúng chỗ vít, sâu `TOP_NOTCH.d`, trần ngang mặt plate (y = 0) */
const topNotches = (screws: { x: number; z: number }[]): WallNotch[] =>
  screws.map((p) => ({
    x: p.x,
    side: p.z > 0 ? 1 : -1,
    w: TOP_TAB + 2 * TOP_NOTCH.gap,
    d: TOP_NOTCH.d,
  }))

/** bottom mount: trần hốc vách case trên chừa trên mặt plate cho đầu ốc M2 (đầu trụ cao 2mm) vặn từ trên xuống */
const BOTTOM_NOTCH_TOP = 0.14
const ABS_BOTTOM_NOTCH_TOP = 0.1

/**
 * Bottom mount (case 2 mảnh dựng bằng code): vấu case dưới nhô từ mép ghép lên tới mặt dưới plate trong hốc vách case trên,
 * tai plate tì lên vấu, ốc M2 từ trên xuyên tai bắt xuống lỗ ren giữa vấu (đĩa tối = miệng lỗ ren)
 */
function BottomPads({ mat }: { mat: ReactNode }) {
  const ctx = useCtx()
  const h = Y.plateBot - Y.split
  // case nhựa 2 mảnh: như trụ top mount lật ngược: trụ nhỏ tâm ngay mặt trong vách, mọc từ sàn khay đúc liền da trong lên đỡ tai plate
  // trong hốc nông vách case trên (PCB + foam đáy khoét rãnh né), đỉnh cấy ren đồng
  if (absTwo(ctx.caseDef))
    return ctx.screws.bottomScrew.map((p) => (
      <AbsBoss
        key={p.id}
        x={p.x}
        z={p.z}
        r={ABS_TOP.bossR}
        y0={caseFloorTop(ctx.caseDef) - 0.005}
        y1={Y.plateBot}
        hole={ABS_SCREW.tap}
        insertTop
        mat={mat}
      />
    ))
  const w = TOP_TAB + 2 * TOP_NOTCH.gap - 0.02
  // từ sát mép PCB (không chạm) qua khe board – vách tới gần đáy hốc
  const z0 = ctx.depth / 2 + 0.01
  const z1 = ctx.depth / 2 + CASE_MARGIN + TOP_NOTCH.d - 0.01
  const d = z1 - z0
  return ctx.screws.bottomScrew.map((p) => {
    const s = p.z > 0 ? 1 : -1
    return (
      <group key={p.id}>
        <mesh position={[p.x, Y.split + h / 2, s * (z0 + d / 2)]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          {mat}
        </mesh>
        <mesh position={[p.x, Y.plateBot + 0.002, p.z]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[TOP_HOLE.tap, 24]} />
          <meshBasicMaterial color="#060607" />
        </mesh>
      </group>
    )
  })
}

/** ống tròn đứng (u): bán kính ngoài `r`, lỗ `hole`, từ y0 tới y1 tâm (x, z) */
function tubeGeometry(r: number, hole: number, y0: number, y1: number) {
  const shape = new Shape().absarc(0, 0, r, 0, Math.PI * 2, false)
  shape.holes.push(new Path().absarc(0, 0, hole, 0, Math.PI * 2, true))
  return new ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false, curveSegments: 24 })
    .rotateX(-Math.PI / 2)
    .translate(0, y0, 0)
}

/**
 * Trụ nhựa đúc liền vách case nhựa 2 mảnh (`ABS_BOSS`): ống tròn có lỗ; `insertTop` / `insertBottom` = ren đồng cấy ở đầu trên / dưới
 * (vành đồng lộ ở miệng lỗ + đáy tối)
 */
function AbsBoss({
  x,
  z,
  y0,
  y1,
  hole,
  insertTop,
  insertBottom,
  mat,
  r = ABS_BOSS.r,
}: {
  x: number
  z: number
  y0: number
  y1: number
  /** bán kính trụ (mặc định `ABS_BOSS.r`) */
  r?: number
  hole: number
  insertTop?: boolean
  insertBottom?: boolean
  mat: ReactNode
}) {
  const geo = useMemo(() => tubeGeometry(r, hole, y0, y1), [r, hole, y0, y1])
  useEffect(() => () => geo.dispose(), [geo])
  const ins = (y: number, s: 1 | -1) => (
    <group position-y={y}>
      {/* vành ren đồng: ống mỏng lộ ở miệng lỗ */}
      <mesh position-y={(s * INSERT_DEPTH) / 2}>
        <cylinderGeometry args={[hole + 0.025, hole + 0.025, INSERT_DEPTH, 20, 1, true]} />
        <meshStandardMaterial color="#c9a54a" metalness={0.85} roughness={0.3} side={DoubleSide} />
      </mesh>
      <mesh position-y={s * 0.001} rotation-x={s > 0 ? -Math.PI / 2 : Math.PI / 2}>
        <ringGeometry args={[hole, hole + 0.025, 20]} />
        <meshStandardMaterial color="#c9a54a" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position-y={s * INSERT_DEPTH} rotation-x={s > 0 ? Math.PI / 2 : -Math.PI / 2}>
        <circleGeometry args={[hole, 16]} />
        <meshBasicMaterial color="#060607" />
      </mesh>
    </group>
  )
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={geo} castShadow receiveShadow>
        {mat}
      </mesh>
      {insertTop && ins(y1, -1)}
      {insertBottom && ins(y0, 1)}
    </group>
  )
}
/** ren đồng cấy: sâu (u) */
const INSERT_DEPTH = 0.08

/**
 * Trụ vít ghép case nhựa 2 mảnh, nằm trong rãnh thành rỗng (`ABS_SHELL`): `bottom` = case dưới (sàn khay → mép ghép, lỗ xuyên vít),
 * `top` = case trên (mép ghép → dưới mặt trên, ren đồng cấy ở miệng dưới)
 */
function AbsScrewBosses({ part, mat }: { part: 'top' | 'bottom'; mat: ReactNode }) {
  const ctx = useCtx()
  return ctx.screws.caseOpen.map((p) =>
    part === 'bottom' ? (
      <AbsBoss
        key={p.id}
        x={p.x}
        z={p.z}
        y0={caseFloorTop(ctx.caseDef) - 0.005}
        y1={Y.split}
        r={ABS_SHELL.bossR}
        hole={ABS_SCREW.thru}
        mat={mat}
      />
    ) : (
      <AbsBoss
        key={p.id}
        x={p.x}
        z={p.z}
        y0={Y.split}
        y1={caseTopOf(ctx.caseDef) - ABS_SHELL.deck + 0.005}
        r={ABS_SHELL.bossR}
        hole={ABS_SCREW.tap}
        insertBottom
        mat={mat}
      />
    ),
  )
}

/** trụ nhựa kê DTB đúc liền sàn case nhựa (`ABS_DTB_POST`): đúng 2 lỗ vít DTB, ren đồng ở đầu trụ do `Daughterboard` vẽ */
function DtbPosts({ mat }: { mat: ReactNode }) {
  const ctx = useCtx()
  const at = ctx.dtb!
  const y0 = caseFloorTop(ctx.caseDef) - 0.005
  if (at.y - at.floor < 0.01) return null
  return DTB_MM.holes.map(([hx, hz], i) => (
    <AbsBoss
      key={i}
      x={at.x + hx * MM}
      z={at.z + hz * MM}
      y0={y0}
      y1={at.y}
      r={DTB_POST_R}
      hole={ABS_SCREW.tap}
      mat={mat}
    />
  ))
}
/** bán kính trụ kê DTB (u, Ø ~4,4mm: đủ ôm ren đồng M2) */
const DTB_POST_R = 2.2 * MM

/** tab gasket: hốc trong vách case trên đúng chỗ tai plate, từ mép ghép lên trần ngang mặt trên dải gasket trên */
const gasketNotches = (gaskets: { x: number; z: number }[]): WallNotch[] =>
  gaskets.map((g) => ({
    x: g.x,
    side: g.z > 0 ? 1 : -1,
    w: GASKET.w + 2 * GASKET_NOTCH.gap,
    d: GASKET_NOTCH.d,
  }))

/**
 * Tab gasket: vấu case dưới nhô lên trong hốc vách case trên (đúng hốc), từ mép ghép tới mặt dưới dải gasket dưới → tai plate
 * kẹp giữa 2 dải: vấu đỡ dưới, trần hốc đè trên
 */
/**
 * Case nhựa 2 mảnh: vấu đỡ gasket kiểu khối lược đúc liền đáy (như case nhựa M0110), mọc từ sàn case dưới trong rãnh thành, nhô qua mép ghép
 * vào hốc vách case trên: gân ngang dày đặc hở về phía lòng case (không thanh dọc mặt trong), 1 thanh dọc mặt ngoài sát vách. Gân bậc:
 * đoạn trong thấp (mặt dưới dải gasket dưới, tai plate gá lên), đoạn ngoài cao thành gờ chặn đầu tai (`COMB.lip`, đỉnh `COMB.lipTop`),
 * 2 đầu là thành bên cao bằng gờ giữ tai không trôi ngang
 */
const COMB = { lip: 0.05, lipTop: -0.02, fin: 0.025, pitch: 0.11, rail: 0.03, side: 0.022 }
/** khối lược: trục z cục bộ từ đầu trong (0) ra ngoài (`d`), gờ từ `ze` */
function combPadGeometry(w: number, d: number, ze: number, y0: number, y1: number, y2: number) {
  const box = (bw: number, ya: number, yb: number, za: number, zb: number, x = 0) =>
    new BoxGeometry(bw, yb - ya, zb - za).translate(x, (ya + yb) / 2, (za + zb) / 2)
  // 2 thành bên cao bằng gờ, suốt chiều sâu: ôm 2 cạnh tai plate (khe ~0,1mm) cho plate không trôi ngang
  const inner = w - 2 * COMB.side
  const n = Math.max(2, Math.round(inner / COMB.pitch))
  const parts = [
    box(w, y0, y2, d - COMB.rail, d),
    ...[-1, 1].map((sx) => box(COMB.side, y0, y2, 0, d, (sx * (w - COMB.side)) / 2)),
    ...Array.from({ length: n - 1 }, (_, k) => {
      const x = ((k + 1) / n - 0.5) * inner
      return [
        box(COMB.fin, y0, y1, 0, ze + 0.002, x),
        box(COMB.fin, y0, y2, ze, d - COMB.rail + 0.002, x),
      ]
    }).flat(),
  ]
  const geo = mergeGeometries(parts)
  parts.forEach((g) => g.dispose())
  return geo
}

function GasketPads({ mat }: { mat: ReactNode }) {
  const ctx = useCtx()
  const comb = absTwo(ctx.caseDef)
  // từ sát mép PCB (không chạm) tới gần đáy hốc vách case trên (hốc sâu thêm `COMB.lip` cho gờ)
  const z0 = ctx.depth / 2 + 0.01
  const zEnd = ctx.depth / 2 + CASE_MARGIN + GASKET_NOTCH.d + COMB.lip - 0.01
  // gờ bắt đầu sau đầu tai plate (tai dài `GASKET_NOTCH.tab` từ mép plate) + khe 0,01
  const zLip = ctx.depth / 2 - 0.01 + GASKET_NOTCH.tab + 0.01
  const combGeo = useMemo(() => {
    if (!comb) return null
    // rộng gần bằng hốc vách case trên (thành bên lọt hốc, mặt trong thành sát cạnh tai)
    const w = GASKET.w + 2 * GASKET_NOTCH.gap - 0.004
    return combPadGeometry(
      w,
      zEnd - z0,
      zLip - z0,
      caseFloorTop(ctx.caseDef) - 0.005,
      Y.plateBot - GASKET.t,
      COMB.lipTop,
    )
  }, [comb, ctx.caseDef, z0, zEnd, zLip])
  useEffect(() => () => combGeo?.dispose(), [combGeo])
  if (combGeo)
    return ctx.gaskets.map((g, i) => {
      const s = g.z > 0 ? 1 : -1
      return (
        <mesh
          key={i}
          geometry={combGeo}
          position={[g.x, 0, s * z0]}
          rotation-y={s > 0 ? 0 : Math.PI}
          castShadow
          receiveShadow
        >
          {mat}
        </mesh>
      )
    })
  const top = Y.plateBot - GASKET.t
  const h = top - Y.split
  const w = GASKET.w + 2 * GASKET_NOTCH.gap - 0.02
  // từ sát mép PCB (không chạm) qua khe board – vách tới gần đáy hốc: đỡ hết dải gasket dưới (dải phủ cả tai)
  const z1 = ctx.depth / 2 + CASE_MARGIN + GASKET_NOTCH.d - 0.01
  const d = z1 - z0
  return ctx.gaskets.map((g, i) => {
    const s = g.z > 0 ? 1 : -1
    return (
      <mesh key={i} position={[g.x, Y.split + h / 2, s * (z0 + d / 2)]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        {mat}
      </mesh>
    )
  })
}

/** standoff tray mount: trụ đồng M2 (u), lỗ ren tối ở đỉnh */
const STANDOFF_R = 0.1
const STANDOFF_HOLE = new CylinderGeometry(0.045, 0.045, 0.004, 16)
/** case nhựa: trụ nhựa (u, ~Ø5,7mm) + ren đồng cấy (Ø3,4mm, cao 1,3mm lộ vành ở đỉnh trụ) */
const BOSS_R = 0.15
const INSERT_R = 0.09
const INSERT_H = 0.07
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
  boss,
}: {
  nodes: Record<string, THREE.Mesh> | null
  origin: [number, number]
  /** mặt sàn case dựng bằng code (mica: mặt trên 2 tấm đáy) */
  floorY?: number
  /** case nhựa: trụ nhựa đúc liền case (vật liệu case) + ren đồng cấy ở đỉnh thay trụ đồng */
  boss?: ReactNode
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
      {boss ? (
        <>
          {/* trụ nhựa tròn đúc liền sàn, to hơn trụ đồng; đỉnh lộ vành ren đồng cấy (insert) */}
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[BOSS_R, BOSS_R * 1.15, p.h, 24]} />
            {boss}
          </mesh>
          <mesh position-y={p.h / 2 - INSERT_H / 2 + 0.002}>
            <cylinderGeometry args={[INSERT_R, INSERT_R, INSERT_H, 20]} />
            <meshStandardMaterial color="#c9a54a" metalness={0.85} roughness={0.3} />
          </mesh>
        </>
      ) : (
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[STANDOFF_R, STANDOFF_R, p.h, 6]} />
          <meshStandardMaterial color="#c9a54a" metalness={0.85} roughness={0.32} />
        </mesh>
      )}
      <mesh geometry={STANDOFF_HOLE} position-y={p.h / 2}>
        <meshStandardMaterial color="#2b2418" metalness={0.4} roughness={0.7} />
      </mesh>
    </group>
  ))
}

/** standoff tray của case CAD: dò sàn theo model GLB */
function CadStandoffs({ model, origin }: { model: string; origin: [number, number] }) {
  const { nodes } = useGLTF(`/models/keyboards/${model}.glb`) as unknown as {
    nodes: Record<string, THREE.Mesh>
  }
  return <TrayStandoffs nodes={nodes} origin={origin} />
}

/**
 * Case từ bản vẽ CAD thật (MIT, `bun run convert:cases`): hệ mm, đáy ở y = 0, tâm ở gốc.
 * Đặt đáy trùng đáy case dựng bằng code, vẫn tô theo chất liệu + màu khách chọn
 */
/**
 * ốc cố định trên case CAD (trang trí, không tháo): model (mm, đỉnh đầu ở y = 0, thân chĩa −y), `head` = phần đầu giữ nguyên khi
 * rút thân, `len` = dài model gốc, `keep` = dài còn lại, `d` = đường kính đầu model, `lift` = đầu nhô khỏi mặt tì (như `HEAD_H` vít)
 */
const FIXED_SCREWS = {
  // ốc nón M3×10 bắt tạ / accent (đầu côn 1,7mm chìm ngang mặt): còn 4mm — dài 10mm xuyên qua đáy case
  flat: { url: '/models/screws/countersunk-m3x10.glb', head: 1.7, len: 10, keep: 4, d: 6, lift: 0 },
  // vít đầu trụ M2×6 (model dài 8mm, đầu 2mm nhô) bắt badge từ trong nắp lên: còn 5mm (thân 3mm ăn hết lỗ ren nắp z 3,7–4,6,
  // không lên tới mặt trên nắp ~7,75)
  socket: { url: '/models/screws/socket-cap-m2x6.glb', head: 2, len: 8, keep: 5, d: 3.8, lift: 2 },
} as const

/**
 * Ốc cố định (tạ / accent / badge): co theo đường kính lỗ (`d` trong danh sách, 0 = giữ cỡ model), mặt đầu tại điểm cho sẵn,
 * trục theo hướng ốc đi vào; thân rút ngắn theo `FIXED_SCREWS` (không lòi ra mặt kia của case)
 */
function FixedScrews({
  list,
  kind,
}: {
  list: NonNullable<CaseDef['weightScrews']>
  kind: keyof typeof FIXED_SCREWS
}) {
  const spec = FIXED_SCREWS[kind]
  const { scene } = useGLTF(spec.url)
  const short = useMemo(() => {
    const root = scene.clone(true)
    root.updateMatrixWorld(true)
    const k = (spec.keep - spec.head) / (spec.len - spec.head)
    const meshes: Mesh[] = []
    root.traverse((o) => (o as Mesh).isMesh && meshes.push(o as Mesh))
    for (const m of meshes) {
      // đưa về hệ model rồi ép phần thân dưới đầu ốc theo y
      const g = m.geometry.clone().applyMatrix4(m.matrixWorld)
      const pos = g.attributes.position
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i)
        if (y < -spec.head) pos.setY(i, -spec.head + (y + spec.head) * k)
      }
      g.computeBoundingSphere()
      m.removeFromParent()
      m.geometry = g
      m.position.set(0, 0, 0)
      m.rotation.set(0, 0, 0)
      m.scale.set(1, 1, 1)
      m.castShadow = true
      root.add(m)
    }
    return root
  }, [scene, spec])
  return list.map(([x, y, z, dx, dy, dz, d], i) => (
    <group
      key={i}
      position={[x, y, z]}
      quaternion={new Quaternion().setFromUnitVectors(
        new Vector3(0, -1, 0),
        new Vector3(dx, dy, dz).normalize(),
      )}
      scale={d ? d / spec.d : 1}
    >
      {/* đầu ốc nhô (đầu trụ): nâng model cho mặt dưới đầu tì đúng điểm cho sẵn */}
      <Clone object={short} castShadow position-y={spec.lift} />
    </group>
  ))
}

/** tạ nhấc ra đặt trước case (phía người chơi), cách mép trước case (mm): bên phải thì khuất tầm nhìn, sau case bị board dựng che */
const COVER_GAP = 8
/** khối mờ chỗ ốc tạ (bấm tháo / nhấn giữ siết) */
const coverGhost = (hot: boolean) => (
  <meshBasicMaterial
    color={hot ? '#7dffb2' : '#3ddc84'}
    transparent
    opacity={hot ? 0.85 : 0.5}
    depthWrite={false}
  />
)

/** ốc tạ trồi lên theo ren khi tháo hết (mm) */
const COVER_LIFT = 7
const easeIO = (t: number) => t * t * (3 - 2 * t)

/**
 * 1 ốc tạ có hoạt cảnh như vít assem (mm, hệ model): `p` = tiến độ tháo 0 → 1 (tua vít quay, ốc trồi lên theo ren, chạy dần theo nhịp
 * quay), `outAt` = lúc ốc bay ra (tháo xong), `spinning` = đang siết (ốc nằm trên miệng lỗ, tua vít quay liên tục lúc giữ thanh lực);
 * `tool` = hiện tua vít trên đầu ốc
 */
function CoverScrew({
  s,
  p,
  outAt,
  spinning,
  tool,
  spinKey,
}: {
  s: NonNullable<CaseDef['weightScrews']>[number]
  p: number
  outAt: number | null
  spinning: boolean
  tool: boolean
  spinKey: number
}) {
  const [x, y, z, dx, dy, dz] = s
  const electric = useGame((st) => screwLevel(st.tools, st.screwPick) > 0)
  const spinMs = electric ? SPIN_MS.electric : SPIN_MS.manual
  const axis = useMemo(() => new Vector3(dx, dy, dz).normalize(), [dx, dy, dz])
  // tua vít dọc trục ốc, mũi chạm đầu ốc (model tua vít: mũi ở gốc, thân theo +y)
  const toolQ = useMemo(
    () => new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), axis.clone().negate()),
    [axis],
  )
  const lift = useRef<THREE.Group>(null)
  const spin = useRef<THREE.Group>(null)
  const anim = useRef({ p, from: p, at: 0 })
  const shown = useRef(p)
  useFrame((_, dt) => {
    const now = performance.now()
    const a = anim.current
    if (a.p !== p) {
      a.from = shown.current
      a.at = now
      a.p = p
    }
    const k = Math.min(1, (now - a.at) / spinMs)
    shown.current = a.from + (p - a.from) * (electric ? k : easeIO(k))
    const t = outAt === null ? 0 : Math.min(1, Math.max(0, (now - outAt) / OUT_MS))
    // siết: ốc nằm trên miệng lỗ (nhô 1/2 ren); tháo: trồi lên theo tiến độ rồi vọt ra
    const out = spinning ? COVER_LIFT / 2 : shown.current * COVER_LIFT + easeIO(t) * 25
    lift.current?.position.copy(axis).multiplyScalar(-out)
    if (spin.current)
      spin.current.rotation.y = spinning
        ? spin.current.rotation.y - dt * 8
        : shown.current * (electric ? SCREW_SPIN.electric : SCREW_SPIN.manual)
  })
  return (
    <group ref={lift}>
      <group
        position={[x, y, z]}
        quaternion={new Quaternion().setFromUnitVectors(
          new Vector3(0, 1, 0),
          axis.clone().negate(),
        )}
      >
        <group ref={spin}>
          <group
            quaternion={new Quaternion().setFromUnitVectors(
              axis.clone().negate(),
              new Vector3(0, 1, 0),
            )}
          >
            <group position={[-x, -y, -z]}>
              <FixedScrews list={[s]} kind="flat" />
            </group>
          </group>
        </group>
      </group>
      {tool && (
        <group position={[x, y, z]} quaternion={toolQ}>
          <group position-y={0.5} scale={1.6 / MM}>
            <CurrentDriver spinKey={spinKey} dir={spinning ? -1 : 1} />
          </group>
        </group>
      )}
    </group>
  )
}

/**
 * Tấm tạ trong lòng case CAD (node `weight`) + ốc tạ cố định (`CaseDef.weightScrews`). Case có tạ đè chỗ DTB (`ctx.dtb.cover`):
 * bước `coverOff` bấm từng ốc để tháo rồi bấm tạ nhấc ra (tạ nằm trước case), bước `coverOn` bấm tạ đặt lại rồi nhấn giữ từng lỗ
 * ốc canh lực siết (skill check như vít assem). Toạ độ mm (trong group scale MM của CaseModel)
 */
function CoverWeight({
  geometry,
  metal,
  seeThrough,
  screws,
  front,
}: {
  geometry: THREE.BufferGeometry
  metal: keyof typeof WEIGHT_METALS
  seeThrough: boolean
  screws: NonNullable<CaseDef['weightScrews']>
  /** mép trước vỏ case (z lớn nhất, mm hệ model) */
  front: number
}) {
  const step = useStep()
  const ctx = useCtx()
  const build = useBuild()
  const c = build.cover ?? {}
  const jst = build.jst
  const { unscrewCover, liftCover, placeCover, screwCover } = useGame.getState()
  const toolLv = useGame((s) => screwLevel(s.tools, s.screwPick))
  const skill = useSkill((k) => (k.active?.id.startsWith('cover-') ? k.active : null))
  const ref = useRef<THREE.Group>(null)
  const cover = !!ctx.dtb?.cover
  // tạ đang ở ngoài (đã nhấc, chưa đặt lại); bản lưu cũ không có dữ liệu thì coi như nằm trong case.
  // Bước lắp lại tạ: tạ vẫn nằm ngoài chỗ đã nhấc ra (camera lùi cho thấy, mũi tên chỉ vào), bấm tạ thì trượt vào case
  const away = cover && !!c.off && !c.on
  // dời ra trước: mép sau tạ cách mép trước case 1 khe
  const shift = useMemo(() => {
    geometry.computeBoundingBox()
    return front - geometry.boundingBox!.min.z + COVER_GAP
  }, [geometry, front])
  useFrame((_, dt) => lerpTo(ref, 'z', away ? shift : 0, dt, 6))
  // cắm JST xong (bước `jst`) bấm tạ đang nằm ngoài là sang luôn bước lắp lại tạ + đặt vào, khỏi bấm "Bước tiếp theo"
  const early = cover && step === 'jst' && !!jst && !!c.off && !c.on
  // tạ mờ (bước DTB / JST, cho thấy DTB bên dưới) chỉ khi còn nằm trong case; nằm ngoài thì vẽ đặc cho dễ thấy
  const see = seeThrough && !away
  // mũi tên nhấc / đặt tạ: ngay trên giữa tấm tạ (tâm model case thì lệch xa tạ, bị board dựng che)
  const weightTop = useMemo((): [number, number, number] => {
    geometry.computeBoundingBox()
    const b = geometry.boundingBox!
    return [(b.min.x + b.max.x) / 2, b.max.y + 12, (b.min.z + b.max.z) / 2]
  }, [geometry])
  const removing = cover && step === 'coverOff'
  const placing = cover && step === 'coverOn'
  // ốc còn trên tạ: chưa nhấc thì trừ ốc đã tháo; đã đặt lại thì ốc đã siết (bước coverOn), qua bước rồi thì đủ
  const shown = screws.map((_, i) =>
    !cover ? true : !c.off ? !c.out?.[i] : c.on ? !placing || !!c.tight?.[i] : false,
  )
  const allOut = screws.every((_, i) => c.out?.[i])
  const pickWeight = (removing && allOut && !c.off) || (placing && !c.on) || early
  const { hover, bind } = useHover(pickWeight)
  const next = removing
    ? shown.findIndex((v) => v)
    : placing && c.on
      ? screws.findIndex((_, i) => !c.tight?.[i])
      : -1
  const u = 1 / MM
  // hoạt cảnh tháo (cục bộ, không lưu): số nấc đã vặn mỗi ốc, lúc ốc bay ra; ốc đang rê (hiện tua vít)
  const clicks = TOOLS.screw[toolLv]?.clicks ?? 1
  const spinMs = toolLv ? SPIN_MS.electric : SPIN_MS.manual
  const [turns, setTurns] = useState<Record<number, number>>({})
  const [outAt, setOutAt] = useState<Record<number, number>>({})
  const [hot, setHot] = useState(-1)
  const [tick, setTick] = useState(0)
  // hoàn tác / quay lại bước: ốc đã tháo (`cover.out`) trở lại trên tạ thì xoá tiến độ tháo cục bộ của ốc đó (không thì ốc vẫn
  // "bay mất", bấm không ăn) + huỷ hẹn giờ tháo đang chờ
  const outKey = screws.map((_, i) => (c.out?.[i] ? 1 : 0)).join('')
  const [prevOut, setPrevOut] = useState(outKey)
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>[]>>({})
  if (prevOut !== outKey) {
    setPrevOut(outKey)
    const back = screws.map((_, i) => i).filter((i) => prevOut[i] === '1' && outKey[i] !== '1')
    if (back.length) {
      const drop = <T,>(o: Record<number, T>) =>
        Object.fromEntries(Object.entries(o).filter(([k]) => !back.includes(Number(k))))
      setTurns(drop(turns))
      setOutAt(drop(outAt))
    }
  }
  // hoàn tác lúc ốc đang vặn dở / đang bay (chưa ghi vào store): thao tác trước đó bị lùi, ốc đang dở cũng về lại như chưa vặn
  const history = useGame((st) => st.history.length)
  const [prevHist, setPrevHist] = useState(history)
  if (prevHist !== history) {
    setPrevHist(history)
    if (history < prevHist) {
      const pending = screws.map((_, i) => i).filter((i) => turns[i] !== undefined && !c.out?.[i])
      if (pending.length) {
        const drop = <T,>(o: Record<number, T>) =>
          Object.fromEntries(Object.entries(o).filter(([k]) => !pending.includes(Number(k))))
        setTurns(drop(turns))
        setOutAt(drop(outAt))
      }
    }
  }
  useEffect(() => {
    // ốc bị xoá tiến độ thì huỷ hẹn giờ của nó (không tự tháo lại sau khi đã hoàn tác)
    for (const k of Object.keys(timers.current))
      if (turns[Number(k)] === undefined) {
        timers.current[Number(k)].forEach(clearTimeout)
        delete timers.current[Number(k)]
      }
  }, [turns])
  useEffect(() => () => Object.values(timers.current).flat().forEach(clearTimeout), [])
  const skillIdx = skill ? Number(skill.id.slice(6)) : -1
  // đang siết (giữ thanh lực): tua vít quay mỗi nhịp
  useFrame(() => {
    if (!skill) return
    const n = Math.floor((performance.now() - skill.check.at) / spinMs)
    if (n !== tick) setTick(n)
  })
  const turnOut = (i: number) => {
    if ((turns[i] ?? 0) >= clicks) return
    // sai đầu vít (ốc nón tạ lục giác chìm): trượt ren, ốc không ra; tuôn ren (3 lần) thì vẫn tháo tiếp được
    const g = useGame.getState()
    if (
      (turns[i] ?? 0) === 0 &&
      g.screwBit !== stepBit('coverOff') &&
      !build.stripped?.[`cover-${i}`] &&
      !g.slipBit(`cover-${i}`, 'ốc tạ')
    ) {
      playClick(300)
      return
    }
    const n = (turns[i] ?? 0) + 1
    if (toolLv) playDrill()
    else playScrew()
    setTurns({ ...turns, [i]: n })
    if (n < clicks) return
    // tua vít quay xong nấc cuối thì ốc bay ra, bay xong mới tính là đã tháo
    timers.current[i] = [
      setTimeout(() => setOutAt((o) => ({ ...o, [i]: performance.now() })), spinMs),
      setTimeout(() => {
        delete timers.current[i]
        unscrewCover(i)
      }, spinMs + OUT_MS),
    ]
  }
  return (
    <group ref={ref}>
      <group
        onPointerDown={(e) => {
          if (!pickWeight) return
          if (early) useGame.getState().nextStep()
          e.stopPropagation()
          if (removing) liftCover()
          else placeCover()
          playClick(600)
        }}
        {...bind}
      >
        <mesh geometry={geometry} castShadow receiveShadow>
          <meshStandardMaterial
            {...WEIGHT_METALS[metal]}
            side={DoubleSide}
            transparent={see}
            opacity={see ? 0.25 : 1}
            depthWrite={!see}
            emissive={hover ? '#3ddc84' : '#000000'}
            emissiveIntensity={hover ? 0.45 : 0}
          />
        </mesh>
      </group>
      {screws.map((sc, i) =>
        shown[i] || skillIdx === i ? (
          <CoverScrew
            key={i}
            s={sc}
            p={removing ? Math.min(1, (turns[i] ?? 0) / clicks) : 0}
            outAt={removing ? (outAt[i] ?? null) : null}
            spinning={skillIdx === i}
            tool={
              (removing && (hot === i || turns[i] !== undefined)) ||
              skillIdx === i ||
              (placing && hot === i)
            }
            spinKey={skillIdx === i ? tick : (turns[i] ?? 0)}
          />
        ) : null,
      )}
      {screws.map(([x, y, z, , , , d], i) => {
        const r = (d || 6) / 2 + 0.6
        // tháo: bấm ốc còn trên tạ; siết: nhấn giữ lỗ ốc chưa siết (thanh lực như vít assem)
        const unscrew = removing && shown[i]
        const tighten = placing && !!c.on && !c.tight?.[i]
        if (!unscrew && !tighten) return null
        return (
          <mesh
            key={i}
            position={[x, y + 0.8, z]}
            rotation-x={-Math.PI / 2}
            onPointerOver={() => setHot(i)}
            onPointerOut={() => setHot((h) => (h === i ? -1 : h))}
            onPointerDown={(e) => {
              e.stopPropagation()
              if (unscrew) return turnOut(i)
              if (skillBusy()) return
              startSkill(`cover-${i}`, torqueSpec(toolLv), (res) => {
                if (res !== 'low') playClick(res === 'high' ? 300 : 1100)
                screwCover(i, res)
              })
            }}
          >
            <circleGeometry args={[r, 24]} />
            {coverGhost(i === next)}
          </mesh>
        )
      })}
      {/* mũi tên + thanh lực (đơn vị u: thu nhỏ ngược scale mm của model) */}
      {/* tháo: ẩn khi ốc đã vặn dở; siết lại (`turns` còn giữ từ lúc tháo) thì không xét */}
      {next >= 0 && !skill && hot !== next && (!removing || turns[next] === undefined) && (
        <group position={screws[next].slice(0, 3) as [number, number, number]} scale={u}>
          <HintArrow at={[0, 0.3, 0]} size={0.7} />
        </group>
      )}
      {pickWeight && (
        <group position={weightTop} scale={u}>
          <HintArrow at={[0, 0.3, 0]} size={1.4} />
        </group>
      )}
      {skill && (
        <Html
          center
          position={screws[Number(skill.id.slice(6))].slice(0, 3) as [number, number, number]}
          zIndexRange={[6, 6]}
          portal={SKILL_PORTAL}
        >
          <SkillBar check={skill.check} />
        </Html>
      )}
    </group>
  )
}

function CaseModel({
  model,
  origin,
  weight = 'brass',
  bottomMat,
  part = 'all',
  screws,
  badgeScrews,
  seeThroughWeight = false,
  children,
}: {
  model: string
  origin: [number, number]
  weight?: keyof typeof WEIGHT_METALS
  /** vật liệu đáy (node "bottom"), không có thì dùng chung vật liệu nắp */
  bottomMat?: ReactNode
  /** case CAD 2 mảnh: chỉ vẽ nắp (node "case" + "badge") hoặc chỉ đáy (node "bottom" + tạ: tạ gắn trong đáy) */
  part?: 'all' | 'top' | 'bottom'
  /** ốc nón cố định trên tạ (đi cùng đáy) */
  screws?: CaseDef['weightScrews']
  /** vít cố định bắt badge (đi cùng nắp) */
  badgeScrews?: CaseDef['badgeScrews']
  /** tạ mờ đi (bước lắp / cắm dây daughterboard: tạ trong lòng case như Exodus60 che DTB nằm bên dưới) */
  seeThroughWeight?: boolean
  children: ReactNode
}) {
  const { nodes } = useGLTF(`/models/keyboards/${model}.glb`) as unknown as {
    nodes: Record<string, THREE.Mesh>
  }
  // mép trước vỏ (mm hệ model): tạ nhấc ra đặt trước mép này
  const front = useMemo(() => {
    const g = (nodes.bottom ?? nodes.case).geometry
    g.computeBoundingBox()
    return g.boundingBox!.max.z
  }, [nodes])
  // vỏ tô theo chất liệu + màu khách chọn; tạ / badge (node "weight") tô kim loại riêng
  return (
    <group position={[-origin[0], Y.floorBot, -origin[1]]} scale={MM}>
      {part !== 'bottom' && (
        <mesh geometry={nodes.case.geometry} castShadow receiveShadow>
          {children}
        </mesh>
      )}
      {nodes.bottom && part !== 'top' && (
        <mesh geometry={nodes.bottom.geometry} castShadow receiveShadow>
          {bottomMat ?? children}
        </mesh>
      )}
      {nodes.weight && part !== 'top' && (
        <CoverWeight
          geometry={nodes.weight.geometry}
          metal={weight}
          seeThrough={seeThroughWeight}
          screws={screws ?? []}
          front={front}
        />
      )}
      {!nodes.weight && screws && part !== 'top' && <FixedScrews list={screws} kind="flat" />}
      {badgeScrews && part !== 'bottom' && <FixedScrews list={badgeScrews} kind="socket" />}
      {/* badge (kim loại như tạ) gắn trên nắp: vẽ cùng nắp */}
      {nodes.badge && part !== 'bottom' && (
        <mesh geometry={nodes.badge.geometry} castShadow receiveShadow>
          <meshStandardMaterial {...WEIGHT_METALS[weight]} side={DoubleSide} />
        </mesh>
      )}
    </group>
  )
}

/** Case 1 hoặc 2 mảnh, nhiều chất liệu; vít ở đáy hoặc trên (mica).
 * topOnly: chỉ vẽ case trên (top mount: úp + bắt vít plate trước khi thả vào case dưới);
 * bottomOnly: chỉ vẽ case dưới (top mount, case trên đã bắt vào board đang để riêng) */
export function Case({
  topOnly = false,
  bottomOnly = false,
}: {
  topOnly?: boolean
  bottomOnly?: boolean
}) {
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
  // mép trên case (nhựa thấp hơn)
  const caseTop = caseTopOf(caseDef)
  const sandwich = ctx.mount === 'sandwich'
  const wood = caseDef.material === 'wood'
  // thành case theo chất liệu (nhựa ABS mỏng hơn nhôm / gỗ)
  const wall = caseWall(caseDef)
  const W = ctx.width + 2 * (CASE_MARGIN + wall)
  const D = ctx.depth + 2 * (CASE_MARGIN + wall)
  // case 2 mảnh: lỗ vít ở đáy (nhôm / PC / acrylic) hoặc xuyên mọi lớp (mica ghép)
  const screwHoles = useMemo(() => caseScrewHoles(caseDef, ctx.width, ctx.depth), [ctx, caseDef])
  // case 2 mảnh bắt vít từ đáy: lỗ xuyên + hốc chìm đầu ốc ở case dưới, lỗ ren ở case trên; top mount thêm lỗ ren trần hốc tai plate
  const bores = useMemo(() => caseBores(caseDef, ctx.screws.caseOpen), [ctx, caseDef])
  const topBores = useMemo(
    () => [
      ...bores.top,
      // case nhựa 2 mảnh: ren nằm trong trụ nhựa trên mặt plate (`AbsTopBosses`), không khoan vào vách mỏng
      ...(ctx.steps.includes('topScrew') && !absTwo(caseDef)
        ? ctx.screws.topScrew.map(({ x, z }) => ({
            x,
            z,
            r: TOP_HOLE.tap,
            y0: -0.02,
            y1: TOP_TAP_DEPTH,
          }))
        : []),
    ],
    [ctx, bores],
  )
  // cổng USB daughterboard khoét xuyên vách sau case dưới
  // cổng USB-C khoét vách sau: ngang cổng DTB, hoặc ngang cổng hàn trên PCB (`pcbUsb`)
  const ports = useMemo(() => {
    // DTB kê trụ (case nhựa): lỗ ngang cổng theo mặt dưới mạch
    if (ctx.dtb) return [usbPort(ctx.dtb.x, ctx.dtb.y)]
    if (!caseDef.pcbUsb) return undefined
    const p = pcbUsbSpot(ctx.width, ctx.depth, ctx.caseDef.pcbUsb)
    return [{ ...usbPort(p.x), y: p.y }]
  }, [ctx, caseDef])
  // mặt sàn trong (case nhựa sàn mỏng thấp hơn)
  const floorTop = caseFloorTop(caseDef)
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
  // không có bước đậy case (top mount) thì `at('caseClose')` = −1: phải loại ra, không thì luôn vẽ case trên đè lên case dưới
  const showTop =
    two &&
    !bottomOnly &&
    (step === 'caseOpen' ||
      closeNext ||
      (at('caseClose') >= 0 && stepIdx >= at('caseClose')) ||
      (topMount && stepIdx >= at('topCase')))
  const placing = ((step === 'caseClose' || step === 'topCase') && !closed) || closeNext
  // case trên chờ đậy / úp lơ lửng; top mount: case trên đã bắt vít vào plate nên nhấc lên cùng board khi thả vào case
  // mở case: tháo hết vít đáy thì case trên nhấc lên lơ lửng (đã tách 2 mảnh)
  const split = useCaseSplit()
  // đã tách mà Q lật úp cụm: case trên nhấc về phía đáy case dưới (sau khi lật nằm trên, không chìm xuống bàn)
  const splitFlipped = useAssemblyFlipped() && split
  const topY = splitFlipped
    ? -(caseTop - caseFloorBot(caseDef)) - 1.2
    : placing ||
        split ||
        (topMount && ((step === 'caseIn' && !inCase) || step === 'jst' || step === 'battery'))
      ? 2.6
      : 0
  // cao độ case trên lúc mới dựng; sau đó chỉ `lerpTo` trong useFrame (gán thẳng prop thì đổi `topY` là nhảy ngay về chỗ:
  // top mount thả board vào case thì case trên rơi xuống trước, board + plate lerp theo sau)
  const [topY0] = useState(topY)
  const bottom = useHover(step === 'caseIn')
  // top mount đã úp case trên, chưa lật cụm lên: bấm case trên (hoặc Q) để lật, vít ở mặt dưới
  const viewFlip = useGame((s) => s.viewFlip)
  const needFlip = topMount && step === 'topScrew' && !viewFlip
  const top = useHover(placing || needFlip)
  // Q ở bước úp / đậy: lật riêng case trên đang lơ lửng quanh tâm của nó (xem mặt trong), đậy xuống thì lật về
  const topFlip = viewFlip && placing && !!step && TOP_FLIP_STEPS.includes(step)
  const flipRef = useRef<THREE.Group>(null)
  const topMid = (Y.split + caseTop) / 2
  // top mount: case trên đã bắt vít vào plate → bước cắm dây JST dựng lên cùng board
  // (case dây luồn qua tạ thì lắp tạ trước khi cắm dây: lúc đó board + case trên để riêng, không dựng)
  const coverFirst = coverBeforeJst(ctx.steps)
  const stand =
    topMount && (step === 'jst' || step === 'battery' || (step === 'coverOn' && !coverFirst))
      ? jstStand(ctx.depth)
      : null
  // top mount: board chưa nằm trong case (còn phẳng ngoài bàn / nhấc chờ thả / dựng cắm JST, không có `seat`) → nắp CAD đi cùng
  // board phải bỏ `seat` (phép ngược), không thì nắp lệch / hở khỏi plate theo độ nâng + góc nghiêng
  const unseated = topOnly || (topMount && ((step === 'caseIn' && !inCase) || !!stand))
  // mức bỏ `seat` của nắp (1 = bỏ hẳn, 0 = theo `seat`): lerp cùng nhịp board lerp vào `seat` lúc thả → nắp đi cùng plate, không giật
  const unseatK = useRef(unseated ? 1 : 0)
  const seatTilt = useRef<THREE.Group>(null)
  const seatShift = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    unseatK.current += ((unseated ? 1 : 0) - unseatK.current) * Math.min(1, dt * 6)
    const k = unseatK.current
    const seat = caseDef.seat
    if (seatTilt.current) seatTilt.current.rotation.x = -(seat?.tilt ?? 0) * k
    seatShift.current?.position.set(
      -(seat?.dx ?? 0) * k,
      -(seat?.rise ?? 0) * k,
      -(seat?.dz ?? 0) * k,
    )
    lerpTo(topRef, 'y', stand?.y ?? topY, dt, 6)
    lerpTo(topRef, 'z', stand?.z ?? 0, dt, 6)
    const tr = topRef.current?.rotation
    if (tr) tr.x += ((stand?.tilt ?? 0) - tr.x) * Math.min(1, dt * 6)
    const r = flipRef.current?.rotation
    if (r) r.x += ((topFlip ? Math.PI : 0) - r.x) * Math.min(1, dt * 5)
  })

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
  const wallTop = two ? Y.split : caseTop
  // giữa vách trước case (mũi tên hướng dẫn bấm case)
  const frontZ = ctx.depth / 2 + CASE_MARGIN + wall / 2
  // gờ / vấu chỉ dựng cho case dựng bằng code (case CAD theo model), mica kẹp plate giữa các lớp nên không cần
  const coded = !model && !mica
  // tab gasket (hốc vách + vấu đỡ): mọi case 2 mảnh dựng bằng code (case nhựa: vấu khối lược mọc từ sàn)
  const gasket = coded && two && ctx.mount === 'gasket' && gasketTabbed(caseDef)
  const screwY = caseScrewY(caseDef)
  // hốc mặt trong vách case trên: top mount (tai plate), bottom mount (vấu), tab gasket
  const topWallNotches = topMount
    ? absTwo(caseDef)
      ? topNotches(ctx.screws.topScrew).map((n) => ({ ...n, d: ABS_TOP.d }))
      : topNotches(ctx.screws.topScrew)
    : ctx.screws.bottomScrew.length
      ? absTwo(caseDef)
        ? topNotches(ctx.screws.bottomScrew).map((n) => ({ ...n, d: ABS_TOP.d }))
        : topNotches(ctx.screws.bottomScrew)
      : gasket
        ? absTwo(caseDef)
          ? // case nhựa: hốc sâu thêm chứa gờ chặn đầu tai của khối lược
            gasketNotches(ctx.gaskets).map((n) => ({ ...n, d: n.d + COMB.lip }))
          : gasketNotches(ctx.gaskets)
        : undefined
  // top mount: trần hốc ngang mặt plate; bottom mount: chừa đầu ốc trên plate; tab gasket: ngang mặt trên dải gasket trên
  // case nhựa (mép trên thấp): trần hốc bottom mount vừa chừa đầu ốc M2 đầu bằng (~1,3mm) + khe, lót hốc không lòi mặt trên
  const topNotchTop = topMount
    ? 0
    : ctx.screws.bottomScrew.length
      ? absTwo(caseDef)
        ? ABS_BOTTOM_NOTCH_TOP
        : BOTTOM_NOTCH_TOP
      : GASKET.t
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
              part={two ? 'bottom' : 'all'}
              screws={caseDef.weightScrews}
              badgeScrews={caseDef.badgeScrews}
              // dây luồn lên qua tạ: tạ đã lắp lại lúc cắm dây, vẽ đặc
              seeThroughWeight={!!ctx.dtb && (step === 'dtb' || (step === 'jst' && !coverFirst))}
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
              ports={ports}
              cutouts={cutouts}
            />
          ) : absTwo(caseDef) ? (
            // case nhựa 2 mảnh: khay đáy lọt trong da ngoài case trên + da trong, rãnh thành có gân
            <AbsTwoShell
              part="bottom"
              wall={wall}
              W={W}
              D={D}
              mat={bottomMat(bottom.hover)}
              pockets={ctx.feet}
              bores={bores.bottom}
              ports={ports}
            />
          ) : (
            <Walls
              wall={wall}
              W={W}
              D={D}
              y0={caseFloorBot(caseDef)}
              y1={wallTop}
              floorTop={floorTop}
              pockets={floorPockets}
              mat={bottomMat(bottom.hover)}
              wood={wood && !lower}
              bores={bores.bottom}
              ports={ports}
              tub={ctx.battery && ctx.battery.y < floorTop - 0.005 ? ctx.battery : undefined}
            />
          )}
          <RubberFeet pockets={ctx.feet} />
          {ctx.dtb && <Daughterboard at={ctx.dtb} />}
          {ctx.battery && <BatterySlot at={ctx.battery} />}
          {/* thả board vào case: mũi tên xanh chỉ mép trước case dưới (bấm case) */}
          {step === 'caseIn' && !inCase && (
            <HintArrow at={[0, (model ? BLOCKER_TOP : wallTop) + 0.05, frontZ]} size={1.6} />
          )}
          {coded && !two && ctx.mount === 'oring' && (
            // O-ring: trụ đúc liền vách mọc từ sàn (phay từ trên xuống được) đỡ mép board, không lọt xuống đáy
            <RingPosts mat={bottomMat(bottom.hover)} />
          )}
          {coded && hasAbsRibs(ctx) && (
            // case nhựa: khung xương cá gia cố đúc liền sàn
            <AbsRibs mat={bottomMat(bottom.hover)} />
          )}
          {gasket && (
            // tab gasket: vấu case dưới trong hốc vách đỡ dải gasket dưới tai plate
            <GasketPads mat={bottomMat(bottom.hover)} />
          )}
          {coded && two && ctx.screws.bottomScrew.length > 0 && (
            <BottomPads mat={bottomMat(bottom.hover)} />
          )}
          {coded && absTwo(caseDef) && (
            // case nhựa 2 mảnh: nửa dưới trụ vít ghép trong rãnh thành (lỗ xuyên vít M2)
            <AbsScrewBosses part="bottom" mat={bottomMat(bottom.hover)} />
          )}
          {coded && hasAbsRibs(ctx) && ctx.dtb && (
            // case nhựa: trụ kê DTB đúc liền sàn (ren đồng ở đầu trụ)
            <DtbPosts mat={bottomMat(bottom.hover)} />
          )}
          {ctx.mount === 'tray' &&
            (model ? (
              <CadStandoffs model={model} origin={ctx.origin} />
            ) : (
              <TrayStandoffs
                nodes={null}
                origin={ctx.origin}
                floorY={mica ? Y.floorBot + 2 * micaStackPlan(Y.floorBot, wallTop).step : floorTop}
                boss={hasAbsRibs(ctx) ? bottomMat(bottom.hover) : undefined}
              />
            ))}
          {/* case CAD: khối chặn tới BLOCKER_TOP · case dựng bằng code: vừa bằng mép trên case, không nhô lên.
              Case 2 mảnh: khung chặn thuộc case trên (đi cùng case trên); mica: khung nằm trong tấm mica trên */}
          {!two && !caseDef.ownBlocks && (
            <Blockers
              keys={ctx.keys}
              width={ctx.width}
              depth={ctx.depth}
              mat={mat(bottom.hover)}
              wood={wood}
              top={model ? BLOCKER_TOP : caseTop}
            />
          )}
        </group>
      )}
      {showTop && (
        <group
          ref={topRef}
          position-y={topY0}
          onPointerDown={
            topMount
              ? needFlip
                ? onClick('topScrew', useGame.getState().toggleFlip)
                : onClick('topCase', placeTopCase)
              : closeNext
                ? onClick('caseIn', () => {
                    nextStep()
                    useGame.getState().closeCase()
                  })
                : onClick('caseClose', closeCase)
          }
          {...top.bind}
        >
          <group ref={flipRef} position-y={topMid}>
            <group position-y={-topMid}>
              {model ? (
                // case CAD 2 mảnh: nắp (node "case") + khung chặn, đi cùng case trên
                <>
                  {/* top mount, board còn nằm phẳng ngoài case (topOnly / nhấc chờ thả / dựng cắm JST): đặt nắp theo phép ngược của `seat` (dời rồi xoay
                      ngược góc nghiêng) cho mặt đỡ plate trong nắp nằm phẳng trên plate — không thì nắp có góc gõ hở 1 đầu */}
                  <group ref={seatTilt}>
                    <group ref={seatShift}>
                      <CaseModel
                        model={model}
                        origin={ctx.origin}
                        weight={caseDef.weight}
                        part="top"
                        badgeScrews={caseDef.badgeScrews}
                      >
                        <CaseMaterial
                          material={caseDef.material}
                          color={color}
                          hover={top.hover}
                          doubleSide
                        />
                      </CaseModel>
                    </group>
                  </group>
                  {/* model có sẵn khối chặn (Duality Horns): không dựng thêm */}
                  {!caseDef.ownBlocks && (
                    <Blockers
                      keys={ctx.keys}
                      width={ctx.width}
                      depth={ctx.depth}
                      mat={mat(top.hover)}
                      wood={wood}
                      top={BLOCKER_TOP}
                    />
                  )}
                </>
              ) : mica && sandwich ? (
                // sandwich: chừa đúng khe plate (plate viền liền là 1 lớp kẹp giữa) → lớp dưới plate + lớp trên plate
                <>
                  <Layers
                    W={W}
                    D={D}
                    y0={Y.split}
                    y1={Y.plateBot}
                    mat={mat(top.hover)}
                    holes={screwHoles}
                    ports={ports}
                  />
                  <Layers
                    W={W}
                    D={D}
                    y0={0}
                    y1={caseTop}
                    mat={mat(top.hover)}
                    holes={screwHoles}
                    ports={ports}
                    cutouts={cutouts}
                  />
                </>
              ) : mica && topMount ? (
                // top mount: tấm viền dưới mặt plate khoét hốc cho tai plate (vặn vít từ dưới lên), tấm ngay trên mặt plate
                // là trần hốc giữ ren vít
                <>
                  <Layers
                    W={W}
                    D={D}
                    y0={Y.split}
                    y1={0}
                    mat={mat(top.hover)}
                    holes={screwHoles}
                    ports={ports}
                    notches={topNotches(ctx.screws.topScrew)}
                  />
                  <Layers
                    W={W}
                    D={D}
                    y0={0}
                    y1={caseTop}
                    mat={mat(top.hover)}
                    holes={screwHoles}
                    ports={ports}
                    cutouts={cutouts}
                  />
                </>
              ) : mica ? (
                <Layers
                  W={W}
                  D={D}
                  y0={Y.split}
                  y1={caseTop}
                  mat={mat(top.hover)}
                  holes={screwHoles}
                  ports={ports}
                  cutouts={cutouts}
                />
              ) : (
                <>
                  {absTwo(caseDef) ? (
                    // case nhựa 2 mảnh: da ngoài trùm xuống tận đáy (bọc khay case dưới), thành rỗng có gân + trụ vít
                    <AbsTwoShell
                      part="top"
                      wall={wall}
                      W={W}
                      D={D}
                      mat={mat(top.hover)}
                      notches={topWallNotches}
                      notchTop={topNotchTop}
                      ports={ports}
                    />
                  ) : (
                    <Walls
                      wall={wall}
                      W={W}
                      D={D}
                      y0={Y.split}
                      y1={caseTop}
                      mat={mat(top.hover)}
                      wood={wood}
                      notches={topWallNotches}
                      notchTop={topNotchTop}
                      bores={topBores}
                    />
                  )}
                  <BoreEnds holes={topBores.map((b) => ({ ...b, y: b.y1 }))} />
                  {absTwo(caseDef) && (
                    // case nhựa 2 mảnh: nửa trên trụ vít ghép, ren đồng cấy ở miệng dưới
                    <AbsScrewBosses part="top" mat={mat(top.hover)} />
                  )}
                  {absTwo(caseDef) &&
                    topMount &&
                    // top mount case nhựa 2 mảnh: trụ ren nhỏ đúc liền vách ngay trên mặt plate (vít M2 từ dưới qua tai plate)
                    ctx.screws.topScrew.map((p) => (
                      <AbsBoss
                        key={p.id}
                        x={p.x}
                        z={p.z}
                        y0={0}
                        y1={ABS_TOP.bossH}
                        r={ABS_TOP.bossR}
                        hole={ABS_SCREW.tap}
                        insertBottom
                        mat={mat(top.hover)}
                      />
                    ))}
                  <Blockers
                    keys={ctx.keys}
                    width={ctx.width}
                    depth={ctx.depth}
                    mat={mat(top.hover)}
                    wood={wood}
                    top={caseTop}
                  />
                </>
              )}
            </group>
          </group>
          {/* đậy / úp case trên: mũi tên xanh chỉ mép trước case trên đang lơ lửng */}
          {(placing || needFlip) && !topFlip && (
            <HintArrow at={[0, caseTop + 0.05, frontZ]} size={1.6} />
          )}
          {/* top mount: vít từ dưới xuyên tai plate bắt vào vấu case trên, đi cùng case trên */}
          {topMount && stepIdx >= at('topScrew') && (
            <ScrewSet step="topScrew" y={Y.plateBot} flip active={viewFlip} />
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
