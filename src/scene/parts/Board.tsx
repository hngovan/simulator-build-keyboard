import { useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import type * as THREE from 'three'
import { useGame, useBuild, useCtx, useStep, useStepIdx } from '@/store'
import { PLATES } from '@/data/parts'
import { Y } from '@/data/steps'
import type { StepId } from '@/types'
import { playClick } from '@/sound'
import { Drop, lerpTo } from '../common/anim'
import { useHover } from '../common/useHover'
import { Gaskets, HotswapSockets, SiliconeRing } from './BoardDetails'
import { KeySlot } from './KeySlot'
import { ScrewSet } from './Screw'
import { SolderPad } from './SolderPad'

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
  useFrame((_, dt) => lerpTo(ref, 'y', lifted ? 2.6 : 0, dt, 6))

  const onBoard = (e: ThreeEvent<PointerEvent>) => {
    if (!boardClick) return
    e.stopPropagation()
    if (step === 'plate') placePlate()
    if (step === 'ring') wrapRing()
    if (step === 'caseIn') dropInCase()
    playClick(900)
  }

  const plate = PLATES[plateMat]
  const at = (name: StepId) => ctx.steps.indexOf(name)
  return (
    <group ref={ref}>
      <mesh
        position-y={(Y.pcbTop + Y.pcbBot) / 2}
        receiveShadow
        castShadow
        onPointerDown={onBoard}
        {...bind}
      >
        <boxGeometry args={[ctx.width, Y.pcbTop - Y.pcbBot, ctx.depth]} />
        <meshStandardMaterial color={hover ? '#2f9a57' : '#1d6b3a'} roughness={0.6} />
      </mesh>
      {ctx.pcbType === 'hotswap' && <HotswapSockets />}
      {b.plate ? (
        <Drop y={Y.plateBot / 2} from={0.8}>
          <mesh receiveShadow onPointerDown={onBoard} {...bind}>
            <boxGeometry args={[ctx.width - 0.02, -Y.plateBot, ctx.depth - 0.02]} />
            <meshStandardMaterial
              color={plate.color}
              metalness={plate.metal ? 0.8 : 0}
              roughness={plate.metal ? 0.35 : 0.5}
              transparent={plate.clear}
              opacity={plate.clear ? 0.75 : 1}
            />
          </mesh>
        </Drop>
      ) : (
        step === 'plate' && (
          <mesh position-y={1} onPointerDown={onBoard}>
            <boxGeometry args={[ctx.width, 0.08, ctx.depth]} />
            <meshBasicMaterial color={plate.color} transparent opacity={0.35} />
          </mesh>
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
