import type { ThreeEvent } from '@react-three/fiber'
import { useGame, useStep, currentSound } from '@/store'
import { Y } from '@/data/steps'
import type { Key } from '@/types'
import { playClick, playKey } from '@/sound'
import { Drop } from '../common/anim'
import { useHover } from '../common/useHover'
import { SwitchMesh } from '../models/Switch'
import { Keycap } from './Keycap'
import { StabMesh } from './StabMesh'

const HOLE = 14 / 19.05 // lỗ plate 14mm

/** 1 vị trí phím: lỗ plate, stab, switch, keycap; xử lý click theo bước hiện tại */
export function KeySlot({ k }: { k: Key }) {
  const step = useStep()
  const hasStab = useGame((s) => !!s.build?.stabs[k.id])
  const hasSwitch = useGame((s) => !!s.build?.switches[k.id])
  const hasKeycap = useGame((s) => !!s.build?.keycaps[k.id])
  const plate = useGame((s) => !!s.build?.plate)
  const swType = useGame((s) => s.inventory.switch?.type)
  const kcColor = useGame((s) => s.inventory.keycap?.color)
  const canAct =
    (step === 'stab' && k.stab && !hasStab) ||
    (step === 'switch' && !hasSwitch) ||
    (step === 'keycap' && hasSwitch && !hasKeycap) ||
    (step === 'test' && hasKeycap)
  const { hover, bind } = useHover(canAct)

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    const s = useGame.getState()
    if (step === 'test') {
      e.stopPropagation()
      if (s.press(k.id, true)) playKey(currentSound(s), true)
      return
    }
    if (!canAct) return
    e.stopPropagation()
    if (step === 'stab') s.installStab(k.id)
    else if (step === 'switch' || step === 'keycap') s.installRun(step, k.id)
    playClick()
  }
  const onUp = () => {
    const s = useGame.getState()
    if (step === 'test' && s.pressed[k.id]) {
      s.press(k.id, false)
      playKey(currentSound(s), false)
    }
  }

  return (
    <group position={[k.cx, 0, k.cz]}>
      <mesh
        position-y={0.04}
        rotation-x={-Math.PI / 2}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerOver={bind.onPointerOver}
        onPointerOut={() => {
          bind.onPointerOut()
          onUp()
        }}
      >
        <planeGeometry args={[k.w - 0.06, k.h - 0.06]} />
        <meshBasicMaterial
          color="#5cf"
          transparent
          opacity={hover ? 0.4 : step === 'stab' && canAct ? 0.18 : 0}
          depthWrite={false}
        />
      </mesh>
      {plate && !hasSwitch && (
        <mesh position-y={0.003} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[HOLE, HOLE]} />
          <meshBasicMaterial color="#111" />
        </mesh>
      )}
      {hasStab && (
        <Drop y={Y.pcbTop}>
          <StabMesh k={k} />
        </Drop>
      )}
      {hasSwitch && swType && (
        <Drop y={0}>
          <SwitchMesh type={swType} />
        </Drop>
      )}
      {hasKeycap && kcColor && (
        <Drop y={0.36}>
          <Keycap k={k} color={kcColor} />
        </Drop>
      )}
    </group>
  )
}
