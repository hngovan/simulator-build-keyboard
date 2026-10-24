import type { ThreeEvent } from '@react-three/fiber'
import { useGame, useStep, currentSound } from '@/store'
import { Y } from '@/data/steps'
import { STABS } from '@/data/parts'
import type { Key } from '@/types'
import { playClick, playKey } from '@/sound'
import { Drop } from '../common/anim'
import { useHover } from '../common/useHover'
import { SwitchMesh } from '../models/Switch'
import { Keycap } from './Keycap'
import { StabMesh } from './StabMesh'

/** 1 vị trí phím: lỗ plate, stab, switch, keycap; xử lý click theo bước hiện tại */
/** stab plate-mount: housing gài vào plate nên cao hơn PCB mount ~1.5mm (không chạm PCB) */
const PLATE_STAB_Y = Y.pcbTop + 1.5 / 19.05

export function KeySlot({ k }: { k: Key }) {
  const step = useStep()
  const hasStab = useGame((s) => !!s.build?.stabs[k.id])
  const plateStab = useGame(
    (s) => s.inventory.stab && STABS[s.inventory.stab.type]?.mount === 'plate',
  )
  const hasSwitch = useGame((s) => !!s.build?.switches[k.id])
  const hasKeycap = useGame((s) => !!s.build?.keycaps[k.id])
  const swType = useGame((s) => s.inventory.switch?.type)
  const kcColor = useGame((s) => s.inventory.keycap?.color)
  const kcKit = useGame((s) => s.inventory.keycap?.kit)
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
    <group position={[k.cx, 0, k.cz]} rotation-y={k.rot}>
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
      {hasStab && (
        // PCB mount: đế housing tì lên PCB · plate mount: ngàm gài vào plate, housing treo cách PCB 1 khoảng
        <Drop y={plateStab ? PLATE_STAB_Y : Y.pcbTop}>
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
          <Keycap k={k} color={kcColor} kit={kcKit} />
        </Drop>
      )}
    </group>
  )
}
