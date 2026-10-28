import { create } from 'zustand'
import {
  judge,
  makeCheck,
  needleAt,
  type SkillCheck,
  type SkillResult,
  type SkillSpec,
} from '@/data/skillCheck'

/** Skill check đang chạy (1 lúc chỉ 1): id vật đang thao tác (vít / phím hàn) + lần thử + hàm nhận kết quả */
interface Active {
  id: string
  check: SkillCheck
  done: (r: SkillResult) => void
}
export const useSkill = create<{ active: Active | null }>(() => ({ active: null }))

/** lúc vừa dừng kim (ms): cú bấm dừng kim không được tính là bấm vào vít / chân khác */
let stoppedAt = -1e9

const onKey = (e: KeyboardEvent) => {
  if (e.code !== 'Space' || e.repeat) return
  e.preventDefault()
  e.stopPropagation()
  stopSkill()
}
// bấm lần 2 ở đâu cũng dừng kim (pha capture: chạy trước handler của cảnh 3D)
const onDown = (e: PointerEvent) => {
  if (e.button === 0) stopSkill()
}
const listen = (on: boolean) => {
  const f = on ? window.addEventListener : window.removeEventListener
  f('keydown', onKey as EventListener, true)
  f('pointerdown', onDown as EventListener, true)
}

/** bắt đầu chạy kim cho vật `id` */
export function startSkill(id: string, spec: SkillSpec, done: (r: SkillResult) => void) {
  if (skillBusy()) return
  useSkill.setState({ active: { id, check: makeCheck(spec), done } })
  listen(true)
}

/** dừng kim, chấm kết quả theo vị trí kim lúc bấm */
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
