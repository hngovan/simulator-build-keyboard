import { useEffect, useState } from 'react'
import { useGame, useStep } from '@/store'
import { SCREW_FULL, screwLevel } from '@/data/parts'
import { SPIN_MS } from '../models/HandTools'
import { OUT_MS } from './Screw'

/**
 * Bước mở case 2 mảnh: tháo hết vít đáy (chờ con cuối quay xong + bay ra) thì case tách 2 mảnh — cụm lật ngửa lại,
 * case trên nhấc lên lơ lửng cho thấy đã tách. Tải lại khi đã tháo hết thì tách luôn
 */
export function useCaseSplit() {
  const step = useStep()
  const done = useGame(
    (s) =>
      step === 'caseOpen' &&
      !!s.ctx?.screws.caseOpen.length &&
      s.ctx.screws.caseOpen.every((sc) => (s.build?.screws[sc.id] ?? 0) >= SCREW_FULL),
  )
  const electric = useGame((s) => screwLevel(s.tools, s.screwPick) > 0)
  const [split, setSplit] = useState(done)
  // hoàn tác (vít quay lại) thì ghép lại ngay
  if (!done && split) setSplit(false)
  useEffect(() => {
    if (!done) return
    const t = setTimeout(
      () => setSplit(true),
      (electric ? SPIN_MS.electric : SPIN_MS.manual) + OUT_MS,
    )
    return () => clearTimeout(t)
  }, [done, electric])
  return done && split
}
