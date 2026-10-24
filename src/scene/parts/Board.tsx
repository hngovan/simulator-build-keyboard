import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useGame, useBuild, useCtx, useStep, useStepIdx } from '@/store'
import { PLATES } from '@/data/parts'
import { Y, stabSpan } from '@/data/steps'
import type { Key, StepId } from '@/types'
import { playClick } from '@/sound'
import { Drop, lerpTo } from '../common/anim'
import { MM } from '../models/Switch'
import { useHover } from '../common/useHover'
import { Gaskets, HotswapSockets, SiliconeRing } from './BoardDetails'
import { KeySlot } from './KeySlot'
import { PcbSurface } from './PcbSurface'
import { boardOutline } from './boardOutline'
import { ScrewSet } from './Screw'
import { SolderPad } from './SolderPad'
import { plate60Cutouts } from '@/data/generated/plate60'

/** lỗ cắt switch MX trên plate: 14 × 14mm */
const CUTOUT = 14 * MM
/** lỗ cắt stab Cherry trên plate: ~7mm dọc theo phím × 13mm ngang phím */
const STAB_CUT = { along: 7 * MM, across: 13 * MM }

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
) {
  // viền plate theo layout (Alice: 2 nửa xoay), nhỏ hơn PCB 0.01u mỗi cạnh
  const { shapes, shapeOf } = boardOutline(keys, width, depth, 0.01, outline)
  let shape = shapes[0]
  // trục y của hình = -z của cảnh (do xoay -90° quanh x)
  // lỗ chữ nhật tâm (x, z) nửa cạnh hx × hz, xoay rot quanh tâm (phím xoay như Alice)
  const rect = (x: number, z: number, hx: number, hz: number, rot: number) => {
    const c = Math.cos(rot)
    const s = Math.sin(rot)
    const pt = (dx: number, dz: number): [number, number] => [
      x + dx * c + dz * s,
      -(z - dx * s + dz * c),
    ]
    const hole = new THREE.Path()
    hole.moveTo(...pt(-hx, -hz))
    hole.lineTo(...pt(-hx, hz))
    hole.lineTo(...pt(hx, hz))
    hole.lineTo(...pt(hx, -hz))
    hole.closePath()
    shape.holes.push(hole)
  }
  if (cadCutouts) {
    const points = cadCutouts.flat()
    const minX = Math.min(...points.map(([x]) => x))
    const maxX = Math.max(...points.map(([x]) => x))
    const minY = Math.min(...points.map(([, y]) => y))
    const maxY = Math.max(...points.map(([, y]) => y))
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    for (const loop of cadCutouts) {
      const hole = new THREE.Path()
      loop.forEach(([x, y], i) => {
        const p = new THREE.Vector2((x - centerX) * MM, -(y - centerY) * MM)
        if (i === 0) hole.moveTo(p.x, p.y)
        else hole.lineTo(p.x, p.y)
      })
      hole.closePath()
      shapes[0].holes.push(hole)
    }
  } else
    for (const k of keys) {
      // lỗ khoét vào đúng mảnh plate chứa phím
      shape = shapeOf(k)
      rect(k.cx, k.cz, CUTOUT / 2, CUTOUT / 2, k.rot)
      if (!k.stab) continue
      // 2 lỗ stab hai bên switch, dọc theo chiều dài phím (phím dọc như Enter numpad thì theo z)
      const s = stabSpan(k)
      const vertical = k.h >= 2
      for (const side of [-1, 1]) {
        // lệch dọc theo trục phím rồi xoay theo phím
        const [ox, oz] = vertical ? [0, side * s] : [side * s, 0]
        const x = k.cx + ox * Math.cos(k.rot) + oz * Math.sin(k.rot)
        const z = k.cz - ox * Math.sin(k.rot) + oz * Math.cos(k.rot)
        if (vertical) rect(x, z, STAB_CUT.across / 2, STAB_CUT.along / 2, k.rot)
        else rect(x, z, STAB_CUT.along / 2, STAB_CUT.across / 2, k.rot)
      }
    }
  return new THREE.ExtrudeGeometry(shapes, { depth: -Y.plateBot, bevelEnabled: false }).rotateX(
    -Math.PI / 2,
  )
}

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
  const { nodes } = useGLTF(ALICE_PLATE) as unknown as { nodes: Record<string, THREE.Mesh> }
  return (
    <mesh
      geometry={nodes['alice-plate'].geometry}
      castShadow
      receiveShadow
      position-y={ghost ? 1 : 0}
      scale={MM}
    >
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
  const { placePlate, wrapRing, dropInCase } = useGame.getState()
  const ref = useRef<THREE.Group>(null)
  const lifted = step === 'caseIn' && !b.inCase
  const boardClick = step === 'plate' || step === 'ring' || step === 'caseIn'
  const { hover, bind } = useHover(boardClick)
  // case CAD có plate nghiêng (Alice): thả vào case thì board nâng + nghiêng theo mặt case
  const seat = b.inCase ? ctx.caseDef.seat : undefined
  useFrame((_, dt) => {
    lerpTo(ref, 'y', lifted ? 2.6 : (seat?.rise ?? 0), dt, 6)
    const r = ref.current?.rotation
    if (r) r.x += ((seat?.tilt ?? 0) - r.x) * Math.min(1, dt * 6)
  })

  const onBoard = (e: ThreeEvent<PointerEvent>) => {
    if (!boardClick) return
    e.stopPropagation()
    if (step === 'plate') placePlate()
    if (step === 'ring') wrapRing()
    if (step === 'caseIn') dropInCase()
    playClick(900)
  }

  const plate = PLATES[plateMat]
  const aliceCAD = ctx.layout === 'alice'
  const standard60CAD =
    ctx.layout === '60' &&
    (ctx.variant.backspace ?? '2u') === '2u' &&
    (ctx.variant.bottom ?? 'wk') === 'wk' &&
    (ctx.variant.rshift ?? '2.75u') === '2.75u'
  const plateGeo = useMemo(
    () =>
      plateGeometry(
        ctx.width,
        ctx.depth,
        ctx.keys,
        ctx.outline,
        standard60CAD ? plate60Cutouts : undefined,
      ),
    [ctx, standard60CAD],
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
          type={ctx.pcbType}
          hover={hover}
        />
      </group>
      {ctx.pcbType === 'hotswap' && <HotswapSockets />}
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
      {ctx.keys.map((k) => (
        <KeySlot key={k.id} k={k} />
      ))}
      {(step === 'solder' || Object.keys(b.solder).length > 0) &&
        ctx.keys.map((k) => <SolderPad key={k.id} k={k} />)}
      {at('stabScrew') >= 0 && stepIdx >= at('stabScrew') && (
        <ScrewSet step="stabScrew" y={Y.pcbBot} flip />
      )}
      {at('trayScrew') >= 0 && b.inCase && <ScrewSet step="trayScrew" y={0.03} />}
      <Gaskets />
      {(b.ring || step === 'ring') && (
        <group onPointerDown={onBoard}>
          <SiliconeRing ghost={!b.ring} />
        </group>
      )}
    </group>
  )
}
