import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useGame, useBuild, useCtx, useStep, useStepIdx } from '@/store'
import { PLATES } from '@/data/parts'
import { CASE_MARGIN, CASE_WALL, TRAY_HOLE, Y, caseScrewHoles, keyCutouts } from '@/data/steps'
import type { Key, Point, StepId } from '@/types'
import { playClick } from '@/sound'
import { Drop, lerpTo } from '../common/anim'
import { MM } from '../models/Switch'
import { useHover } from '../common/useHover'
import { Gaskets, HotswapSockets, SiliconeRing } from './BoardDetails'
import { SUPPLIES } from '@/data/supplies'
import { KeySlot } from './KeySlot'
import { KeycapPreload } from './Keycap'
import { PcbFoam } from './Foam'
import { PcbSurface } from './PcbSurface'
import { boardOutline, pointInPolygon } from './boardOutline'
import { sandwichPlateShape } from './caseShell'
import { ScrewSet } from './Screw'
import { SolderPad } from './SolderPad'
import { HintArrow } from '../stations/StationKit'
import { plate60Cutouts } from '@/data/generated/plate60'
import { plateUniversal } from '@/data/generated/plateUniversal'

/**
 * Lỗ switch spacebar của typ60 (toạ độ DXF, mm): trong DXF nó nối thông ra mép trước nên nằm trong
 * đường viền ngoài, không có trong plate60Cutouts → thêm tay
 */
const PLATE60_SPACE: [number, number][] = [
  [-149.9, 78.7],
  [-124, 78.7],
  [-124, 92.7],
  [-149.9, 92.7],
]

/**
 * Plate có lỗ cắt cho từng switch (nhìn xuyên xuống PCB), đáy ở y = 0, dày bằng plate thật.
 * Vẽ hình 2D trên mặt xz rồi đùn lên theo y
 */
function plateGeometry(
  width: number,
  depth: number,
  keys: Key[],
  outline?: [number, number][],
  cadCutouts?: [number, number][][],
  /** lỗ cắt plate universal (ai03 Plate Generator): [x, z] theo u quanh tâm layout */
  universal?: [number, number][][],
  /** sandwich mount: viền ngoài tấm liền theo case mica (thay viền layout) */
  sandwich?: THREE.Shape,
  /** tray mount: lỗ to hơn đầu ốc để vít lọt xuống PCB (đã dò không chạm lỗ switch / stab) */
  trayHoles: Point[] = [],
) {
  // viền plate theo layout (Alice: 2 nửa xoay), nhỏ hơn PCB 0.01u mỗi cạnh
  const { shapes, shapeOf } = sandwich
    ? { shapes: [sandwich], shapeOf: () => sandwich }
    : boardOutline(keys, width, depth, 0.01, outline)
  // trục y của hình = -z của cảnh (do xoay -90° quanh x)
  const loopHole = (loop: [number, number][]) => {
    const hole = new THREE.Path(loop.map(([x, z]) => new THREE.Vector2(x, -z)))
    hole.closePath()
    return hole
  }
  if (cadCutouts) {
    const points = cadCutouts.flat()
    const minX = Math.min(...points.map(([x]) => x))
    const maxX = Math.max(...points.map(([x]) => x))
    const minY = Math.min(...points.map(([, y]) => y))
    const maxY = Math.max(...points.map(([, y]) => y))
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    for (const loop of [...cadCutouts, PLATE60_SPACE]) {
      const hole = new THREE.Path()
      loop.forEach(([x, y], i) => {
        // DXF typ60 vẽ ngược trái / phải (backspace 2u ở x âm nhất) → lật x cho khớp layout
        const p = new THREE.Vector2(-(x - centerX) * MM, -(y - centerY) * MM)
        if (i === 0) hole.moveTo(p.x, p.y)
        else hole.lineTo(p.x, p.y)
      })
      hole.closePath()
      shapes[0].holes.push(hole)
    }
  } else if (universal) for (const loop of universal) shapes[0].holes.push(loopHole(loop))
  else
    for (const k of keys) {
      // lỗ khoét vào đúng mảnh plate chứa phím
      const shape = shapeOf(k)
      for (const loop of keyCutouts(k)) shape.holes.push(loopHole(loop))
    }
  // lỗ vít tray: vào mảnh plate chứa tâm lỗ
  for (const { x, z } of trayHoles) {
    const target = shapes.find((c) => pointInPolygon(new THREE.Vector2(x, -z), c.getPoints()))
    if (!target) continue
    const hole = new THREE.Path()
    hole.absarc(x, -z, TRAY_HOLE.plate, 0, Math.PI * 2, false)
    target.holes.push(hole)
  }
  return new THREE.ExtrudeGeometry(shapes, { depth: -Y.plateBot, bevelEnabled: false }).rotateX(
    -Math.PI / 2,
  )
}

const NO_HOLES: Point[] = []

const ALICE_PLATE = '/models/plates/alice.glb'
useGLTF.preload(ALICE_PLATE)

/** Vật liệu plate: kim loại bóng; PC / PEI (clear) là nhựa trong suốt, nhìn xuyên thấy PCB */
function PlateMaterial({
  color,
  metal,
  clear,
  ghost = false,
}: {
  color: string
  metal: boolean
  clear: boolean
  ghost?: boolean
}) {
  if (clear)
    return (
      <meshPhysicalMaterial
        color={color}
        roughness={0.12}
        metalness={0}
        transmission={0.92}
        thickness={0.15}
        ior={1.58}
        clearcoat={0.6}
        transparent
        opacity={ghost ? 0.3 : 0.45}
        depthWrite={false}
      />
    )
  return (
    <meshStandardMaterial
      color={color}
      metalness={metal ? 0.8 : 0}
      roughness={metal ? 0.35 : 0.5}
      transparent={ghost}
      opacity={ghost ? 0.5 : 1}
    />
  )
}

function AlicePlate({
  color,
  metal,
  clear,
  ghost = false,
}: {
  color: string
  metal: boolean
  clear: boolean
  ghost?: boolean
}) {
  const { scene } = useGLTF(ALICE_PLATE)
  // lấy mesh đầu tiên trong GLB (tên node 'alice-plate' lúc load có thể không phải mesh → geometry rỗng, plate không hiện)
  const geometry = useMemo(() => {
    let g: THREE.BufferGeometry | undefined
    scene.traverse((o) => {
      if (!g && (o as THREE.Mesh).isMesh) g = (o as THREE.Mesh).geometry
    })
    return g
  }, [scene])
  return (
    <mesh geometry={geometry} castShadow receiveShadow position-y={ghost ? 1 : 0} scale={MM}>
      <PlateMaterial color={color} metal={metal} clear={clear} ghost={ghost} />
    </mesh>
  )
}

/** PCB + plate + linh kiện; nhấc lên khi chuẩn bị thả vào case */
export function Board() {
  const ctx = useCtx()
  const step = useStep()
  const stepIdx = useStepIdx()
  const b = useBuild()
  const plateMat = useGame((s) => s.inventory.plate!.material)
  const kcKit = useGame((s) => s.inventory.keycap?.kit)
  const { placePlate, placeFoam, wrapRing, dropInCase } = useGame.getState()
  const ref = useRef<THREE.Group>(null)
  const lifted = step === 'caseIn' && !b.inCase
  const boardClick = step === 'plate' || step === 'foam' || step === 'ring' || step === 'caseIn'
  const { hover, bind } = useHover(boardClick)
  // case CAD có plate nghiêng (Alice): thả vào case thì board nâng + nghiêng theo mặt case
  const seat = b.inCase ? ctx.caseDef.seat : undefined
  useFrame((_, dt) => {
    lerpTo(ref, 'y', lifted ? 2.6 : (seat?.rise ?? 0), dt, 6)
    lerpTo(ref, 'z', seat?.dz ?? 0, dt, 6)
    lerpTo(ref, 'x', seat?.dx ?? 0, dt, 6)
    const r = ref.current?.rotation
    if (r) r.x += ((seat?.tilt ?? 0) - r.x) * Math.min(1, dt * 6)
  })

  const onBoard = (e: ThreeEvent<PointerEvent>) => {
    if (!boardClick) return
    e.stopPropagation()
    if (step === 'plate') placePlate()
    if (step === 'foam') placeFoam()
    if (step === 'ring') wrapRing()
    if (step === 'caseIn') dropInCase()
    playClick(900)
  }

  const plate = PLATES[plateMat]
  // sandwich (case mica): plate kẹp giữa các lớp mica → viền liền cùng case + lỗ vít case, Alice cũng không dùng plate gasket CAD
  const sandwich = ctx.mount === 'sandwich' && ctx.caseDef.material === 'mica' && !ctx.caseDef.model
  // tray: plate CAD Alice không có lỗ vít tray → dựng plate theo phím (như sandwich) để khoét lỗ
  const aliceCAD = ctx.layout === 'alice' && !sandwich && ctx.mount !== 'tray'
  const standard60CAD =
    ctx.layout === '60' &&
    (ctx.variant.backspace ?? '2u') === '2u' &&
    (ctx.variant.bottom ?? 'wk') === 'wk' &&
    (ctx.variant.rshift ?? '2.75u') === '2.75u'
  // tray mount: vít xuyên plate + PCB bắt vào trụ đồng đáy case (vị trí đã dò không chạm lỗ switch / stab)
  const trayHoles = ctx.mount === 'tray' ? ctx.screws.trayScrew : NO_HOLES
  const plateGeo = useMemo(
    () =>
      plateGeometry(
        ctx.width,
        ctx.depth,
        ctx.keys,
        ctx.outline,
        standard60CAD ? plate60Cutouts : undefined,
        // 60 / 75 / TKL / full: plate universal có lỗ cho mọi variant
        standard60CAD || ctx.outline ? undefined : plateUniversal[ctx.layout],
        sandwich
          ? sandwichPlateShape(
              ctx.width + 2 * (CASE_MARGIN + CASE_WALL),
              ctx.depth + 2 * (CASE_MARGIN + CASE_WALL),
              caseScrewHoles(ctx.caseDef, ctx.width, ctx.depth),
            )
          : undefined,
        trayHoles,
      ),
    [ctx, standard60CAD, sandwich, trayHoles],
  )
  const at = (name: StepId) => ctx.steps.indexOf(name)
  return (
    <group ref={ref}>
      <group onPointerDown={onBoard} {...bind}>
        <PcbSurface
          width={ctx.width}
          depth={ctx.depth}
          outline={ctx.outline}
          keys={ctx.keys}
          screwHoles={at('stabScrew') >= 0 ? ctx.screws.stabScrew : []}
          mountHoles={trayHoles}
          type={ctx.pcbType}
          hover={hover}
        />
      </group>
      {ctx.pcbType === 'hotswap' && <HotswapSockets />}
      {(b.foam || step === 'foam') && (
        <Drop y={0} from={b.foam ? 0.6 : 0}>
          <group onPointerDown={onBoard} {...bind}>
            <PcbFoam
              keys={ctx.keys}
              width={ctx.width}
              depth={ctx.depth}
              outline={ctx.outline}
              trayHoles={trayHoles}
              ghost={!b.foam}
            />
          </group>
        </Drop>
      )}
      {b.plate ? (
        <Drop y={Y.plateBot} from={0.8}>
          <group onPointerDown={onBoard} {...bind}>
            {aliceCAD ? (
              <AlicePlate color={plate.color} metal={!!plate.metal} clear={!!plate.clear} />
            ) : (
              <mesh geometry={plateGeo} receiveShadow castShadow>
                <PlateMaterial color={plate.color} metal={!!plate.metal} clear={!!plate.clear} />
              </mesh>
            )}
          </group>
        </Drop>
      ) : (
        step === 'plate' && (
          // plate chờ đặt: lơ lửng phía trên PCB
          <group onPointerDown={onBoard}>
            {aliceCAD ? (
              <AlicePlate color={plate.color} metal={!!plate.metal} clear={!!plate.clear} ghost />
            ) : (
              <mesh geometry={plateGeo} position-y={1}>
                <meshBasicMaterial color={plate.color} transparent opacity={0.5} />
              </mesh>
            )}
          </group>
        )
      )}
      <KeycapPreload kit={kcKit} keys={ctx.keys} />
      {ctx.keys.map((k) => (
        <KeySlot key={k.id} k={k} />
      ))}
      {(step === 'solder' || Object.keys(b.solder).length > 0) &&
        ctx.keys.map((k) => <SolderPad key={k.id} k={k} />)}
      {at('stabScrew') >= 0 && stepIdx >= at('stabScrew') && (
        <ScrewSet step="stabScrew" y={Y.pcbBot} flip />
      )}
      {at('trayScrew') >= 0 && b.inCase && (
        // đầu ốc chìm trong lỗ plate, tì mặt PCB; khung nét đứt / vòng vàng ở miệng lỗ trên mặt plate (plateless: mặt PCB)
        <ScrewSet
          step="trayScrew"
          y={Y.pcbTop}
          mouth={ctx.steps.includes('plate') ? 0 : Y.pcbTop}
        />
      )}
      <Gaskets />
      {(b.ring || step === 'ring') && (
        <group onPointerDown={onBoard}>
          <SiliconeRing
            ghost={!b.ring}
            between={ctx.mount === 'oring'}
            color={SUPPLIES[typeof b.ring === 'string' ? b.ring : 'oring50']?.color}
          />
        </group>
      )}
      {/* mũi tên vàng chỉ vòng silicon chờ gá (cạnh trước) */}
      {step === 'ring' && !b.ring && <HintArrow at={[0, 0.1, ctx.depth / 2 + 0.1]} size={1.6} />}
    </group>
  )
}
