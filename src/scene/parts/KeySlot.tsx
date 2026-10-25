import type { ThreeEvent } from '@react-three/fiber'
import { create } from 'zustand'
import { useGame, useStep, currentSound } from '@/store'
import { Y } from '@/data/steps'
import { STABS, TOOLS } from '@/data/parts'
import { SPELL_ASSEM, SPELL_KEYCAP, installTargets, spellBonus, spellRun } from '@/data/supplies'
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

/** Ô sáng khi rê vào 1 ô ở bước lắp switch / keycap: cả dãy phím sẽ lắp 1 lần (bậc thợ + sách phép) */
const useRunLit = create<{ lit: ReadonlySet<string> }>(() => ({ lit: new Set() }))
function lightRun(id: string | null) {
  const s = useGame.getState()
  const step = s.build && s.ctx?.steps[s.build.stepIdx]
  if (!id || !s.build || !s.ctx || (step !== 'switch' && step !== 'keycap'))
    return useRunLit.setState({ lit: new Set() })
  const field = step === 'switch' ? 'switches' : 'keycaps'
  const spell = step === 'switch' ? SPELL_ASSEM : SPELL_KEYCAP
  let n = spellRun(TOOLS.cert[s.tools.cert ?? 0].n!, spellBonus(s.supplies, spell))
  // lắp switch: không quá số switch còn trong kho
  if (step === 'switch') n = Math.min(n, s.inventory.switch?.count ?? 0)
  const build = s.build
  useRunLit.setState({ lit: new Set(installTargets(s.ctx.keys, (k) => !!build[field][k], id, n)) })
}

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
  const lit = useRunLit((s) => s.lit.has(k.id)) && canAct

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
    else if (step === 'switch' || step === 'keycap') {
      s.installRun(step, k.id)
      lightRun(null)
    }
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
        onPointerOver={(e) => {
          bind.onPointerOver(e)
          if (canAct) lightRun(k.id)
        }}
        onPointerOut={() => {
          bind.onPointerOut()
          lightRun(null)
          onUp()
        }}
      >
        <planeGeometry args={[k.w - 0.06, k.h - 0.06]} />
        <meshBasicMaterial
          color="#5cf"
          transparent
          opacity={hover || lit ? 0.4 : step === 'stab' && canAct ? 0.18 : 0}
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
