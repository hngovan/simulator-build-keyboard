import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { useBuild, useCtx, useGame, useStep, useStepIdx } from '@/store'
import { coverBeforeJst } from '@/data/steps'
import { lerpTo } from '../common/anim'
import { Board } from './Board'
import { Case } from './Case'
import { useAssemblyFlipped } from './caseSplit'
import { CaseFoam } from './Foam'
import { Drop } from '../common/anim'
import { useHover } from '../common/useHover'
import { playClick } from '@/sound'
import { HintArrow } from '../stations/StationKit'

/** foam đáy case: bước `caseFoam` = tấm mờ lơ lửng trên lòng case, bấm để lót (rơi xuống đáy); đã lót thì nằm yên dưới đáy */
function CaseFoamSlot({ step }: { step: string }) {
  const laid = !!useBuild().caseFoam
  const ctx = useCtx()
  const active = step === 'caseFoam' && !laid
  const { hover, bind } = useHover(active)
  if (!laid && !active) return null
  return laid ? (
    <Drop y={0} from={0.6}>
      <CaseFoam />
    </Drop>
  ) : (
    <>
      <group
        onPointerDown={(e) => {
          e.stopPropagation()
          useGame.getState().placeCaseFoam()
          playClick(700)
        }}
        {...bind}
      >
        <CaseFoam ghost hover={hover} />
      </group>
      <HintArrow at={[0, (ctx.dtb?.floor ?? -0.6) + 1.4, 0]} size={0.8} />
    </>
  )
}

/** Bàn phím (case + board) — tự lật khi cần thao tác mặt đáy, hoặc khi người chơi bấm "Lật xem đáy" */
export function Assembly() {
  const ctx = useCtx()
  const step = useStep()!
  const stepIdx = useStepIdx()
  const ref = useRef<THREE.Group>(null)
  // mở case / dán feet / lắp daughterboard: chỉ có case trên bàn (board để riêng), dán feet thì case lật úp;
  // case dây JST luồn qua tạ: lắp lại tạ trước khi cắm dây → board vẫn để riêng
  const caseOnly =
    step === 'caseOpen' ||
    step === 'feet' ||
    step === 'caseFoam' ||
    step === 'coverOff' ||
    step === 'dtb' ||
    (step === 'coverOn' && coverBeforeJst(ctx.steps))
  // cắm dây JST: board nhấc trên case (như lúc chờ thả vào case)
  // lắp lại tạ (sau khi cắm JST): board vẫn nhấc trên case, dây nối DTB lên PCB
  const showCase =
    caseOnly ||
    step === 'jst' ||
    step === 'battery' ||
    step === 'coverOn' ||
    stepIdx >= ctx.steps.indexOf('caseIn')
  const topEarly = ctx.steps.includes('topCase') && stepIdx >= ctx.steps.indexOf('topCase')
  // bước tự lật vẫn cho Q lật lại xem mặt trên; case 2 mảnh vừa tháo hết vít đáy: ngửa lại (tách 2 mảnh)
  const flipped = useAssemblyFlipped()
  useFrame((_, dt) => {
    if (!ref.current) return
    const r = ref.current.rotation
    r.x += ((flipped ? Math.PI : 0) - r.x) * Math.min(1, dt * 5)
    lerpTo(ref, 'y', flipped ? (showCase ? 0.3 : 0.6) : 0, dt, 5)
  })
  return (
    <group ref={ref}>
      {showCase ? (
        // top mount đã bắt case trên vào plate: board để riêng (tháo / lắp tạ, DTB) thì case trên đi cùng board, chỉ vẽ case dưới
        <Case bottomOnly={caseOnly && topEarly} />
      ) : (
        // top mount: case trên úp lên plate (bắt vít) trước khi có case dưới
        topEarly && <Case topOnly />
      )}
      {showCase && <CaseFoamSlot step={step} />}
      {!caseOnly && <Board />}
    </group>
  )
}
