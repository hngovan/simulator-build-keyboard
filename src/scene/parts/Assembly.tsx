import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { useGame, useCtx, useStep, useStepIdx } from '@/store'
import { NO_FLIP_STEPS, autoFlip } from '@/data/steps'
import { lerpTo } from '../common/anim'
import { Board } from './Board'
import { Case } from './Case'
import { useCaseSplit } from './caseSplit'

/** Bàn phím (case + board) — tự lật khi cần thao tác mặt đáy, hoặc khi người chơi bấm "Lật xem đáy" */
export function Assembly() {
  const ctx = useCtx()
  const step = useStep()!
  const stepIdx = useStepIdx()
  const viewFlip = useGame((s) => s.viewFlip)
  const ref = useRef<THREE.Group>(null)
  // mở case / dán feet: chỉ có case trên bàn (board để riêng), dán feet thì case lật úp
  const caseOnly = step === 'caseOpen' || step === 'feet'
  const showCase = caseOnly || stepIdx >= ctx.steps.indexOf('caseIn')
  const topEarly = ctx.steps.includes('topCase') && stepIdx >= ctx.steps.indexOf('topCase')
  // Auto-flipped work steps must still let the player flip back to inspect the top.
  // case 2 mảnh vừa tháo hết vít đáy: lật ngửa lại cho thấy case trên nhấc ra (tách 2 mảnh)
  const split = useCaseSplit()
  const flipped =
    NO_FLIP_STEPS.includes(step) || split ? false : autoFlip(step, ctx) ? !viewFlip : viewFlip
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
      {!caseOnly && <Board />}
    </group>
  )
}
