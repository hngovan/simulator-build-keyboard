import { useEffect, useState } from 'react'
import { useCtx, useGame, useStep } from '@/store'
import { NO_FLIP_STEPS, autoFlip } from '@/data/steps'
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
    // tách 2 mảnh: cụm ngửa lại (đặt viewFlip sao cho không lật: bước mở case tự lật úp thì viewFlip = true), từ đó Q lật bình thường
    const upright = () => {
      const g = useGame.getState()
      if (g.ctx) useGame.setState({ viewFlip: autoFlip('caseOpen', g.ctx) })
    }
    const t = setTimeout(
      () => {
        setSplit(true)
        upright()
      },
      split ? 0 : (electric ? SPIN_MS.electric : SPIN_MS.manual) + OUT_MS,
    )
    return () => clearTimeout(t)
    // chỉ chạy lại khi vừa tháo xong / đổi tua vít (split đọc lúc bắt đầu: tải lại đã tách thì ngửa luôn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, electric])
  return done && split
}

/**
 * Cụm bàn phím (Assembly) đang lật úp (thấy mặt đáy): bước tự lật (hàn, vít đáy…) thì Q lật ngược lại xem mặt trên; case 2 mảnh vừa
 * tách thì ngửa lại (đặt viewFlip lúc tách, Q vẫn lật được). Dùng chung cho Assembly (xoay) và vít (chỉ vặn được khi mặt có vít quay lên, `ScrewSet`)
 */
export function useAssemblyFlipped() {
  const ctx = useCtx()
  const step = useStep()
  const viewFlip = useGame((s) => s.viewFlip)
  if (!step || NO_FLIP_STEPS.includes(step)) return false
  return autoFlip(step, ctx) ? !viewFlip : viewFlip
}
