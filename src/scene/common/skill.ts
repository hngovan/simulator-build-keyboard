import { create } from 'zustand'
import {
  judge,
  makeCheck,
  needleAt,
  type SkillCheck,
  type SkillResult,
  type SkillSpec,
} from '@/data/skillCheck'
import { useCamLock } from './camLock'

/** Skill check đang chạy (1 lúc chỉ 1): id vật đang thao tác (vít / phím hàn) + lần thử + hàm nhận kết quả */
interface Active {
  id: string
  check: SkillCheck
  done: (r: SkillResult) => void
}
export const useSkill = create<{ active: Active | null }>(() => ({ active: null }))

/** lúc vừa dừng kim (ms): cú nhả chuột dừng kim không được tính là bấm vào vít / chân khác */
let stoppedAt = -1e9

// giữ chuột trái cho kim chạy, nhả ra (ở đâu cũng được, pha capture) thì dừng kim chấm điểm
const onUp = (e: PointerEvent) => {
  if (e.button === 0) stopSkill()
}
const listen = (on: boolean) => {
  const f = on ? window.addEventListener : window.removeEventListener
  f('pointerup', onUp as EventListener, true)
  f('pointercancel', onUp as EventListener, true)
  // đang giữ chuột: khoá camera, kéo chuột không xoay cảnh
  useCamLock.setState({ locked: on })
}

/** nhấn giữ chuột lên vật `id`: bắt đầu chạy kim (nhả chuột thì chấm) */
export function startSkill(id: string, spec: SkillSpec, done: (r: SkillResult) => void) {
  if (skillBusy()) return
  useSkill.setState({ active: { id, check: makeCheck(spec), done } })
  listen(true)
}

/** dừng kim, chấm kết quả theo vị trí kim lúc nhả chuột */
export function stopSkill() {
  const a = useSkill.getState().active
  if (!a) return
  listen(false)
  stoppedAt = performance.now()
  useSkill.setState({ active: null })
  a.done(judge(a.check, needleAt(a.check)))
}

/** huỷ (rời bước / vật biến mất) không chấm */
export function cancelSkill(id?: string) {
  const a = useSkill.getState().active
  if (!a || (id && a.id !== id)) return
  listen(false)
  useSkill.setState({ active: null })
}

/** đang chạy kim, hoặc cú bấm hiện tại vừa dùng để dừng kim */
export const skillBusy = () => !!useSkill.getState().active || performance.now() - stoppedAt < 120
