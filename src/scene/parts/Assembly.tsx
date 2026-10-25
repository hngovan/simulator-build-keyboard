import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { useGame, useCtx, useStep, useStepIdx } from '@/store'
import { NO_FLIP_STEPS, autoFlip } from '@/data/steps'
import { lerpTo } from '../common/anim'
import { Board } from './Board'
import { Case } from './Case'

/** Bàn phím (case + board) — tự lật khi cần thao tác mặt đáy, hoặc khi người chơi bấm "Lật xem đáy" */
export function Assembly() {
  const ctx = useCtx()
  const step = useStep()!
  const stepIdx = useStepIdx()
  const viewFlip = useGame((s) => s.viewFlip)
  const ref = useRef<THREE.Group>(null)
  const showCase = step === 'caseOpen' || stepIdx >= ctx.steps.indexOf('caseIn')
  const topEarly = ctx.steps.includes('topCase') && stepIdx >= ctx.steps.indexOf('topCase')
  // Auto-flipped work steps must still let the player flip back to inspect the top.
  const flipped = NO_FLIP_STEPS.includes(step) ? false : autoFlip(step, ctx) ? !viewFlip : viewFlip
  useFrame((_, dt) => {
    if (!ref.current) return
    const r = ref.current.rotation
    r.x += ((flipped ? Math.PI : 0) - r.x) * Math.min(1, dt * 5)
    lerpTo(ref, 'y', flipped ? (showCase ? 0.3 : 0.6) : 0, dt, 5)
  })
  return (
    <group ref={ref}>
      {showCase ? (
        <Case />
      ) : (
        // top mount: case trên úp lên plate (bắt vít) trước khi có case dưới
        topEarly && <Case topOnly />
      )}
      {step !== 'caseOpen' && <Board />}
    </group>
  )
}
