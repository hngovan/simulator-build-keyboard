// Trụ đỡ O-ring / OG trong case 1 mảnh dựng bằng code: trụ tròn đúc liền vách, mọc từ sàn lên (phay từ trên xuống được, không có
// gờ lơ lửng kiểu undercut): vách trước / sau mỗi bên 4 trụ, vách trái / phải mỗi bên 1 trụ lệch về phía sau
import { CASE_MARGIN, DTB_MM, Y } from '@/data/steps'
import type { BuildContext } from '@/types'
import { MM } from '../models/Switch'

/** khe chừa trên vách sau cho daughterboard + cổng USB */
const DTB_GAP = (DTB_MM.w + 2) * MM
/** bán kính trụ (u): 2/3 bề ngang trụ vuông cũ 0,4u */
const POST_R = 0.135
/** tâm trụ lấn vào trong vách (u): nửa trụ chìm trong vách, nửa nhô ra lòng case, thò vào gầm mép board ~1,4mm */
const POST_IN = 0.03
/** đỉnh trụ thấp hơn mặt dưới PCB (u): đỡ mép board (vòng silicon kẹp ở mép board), không chạm */
const TOP_GAP = 0.005
/** trụ gần góc cách góc lòng case (u) */
const CORNER = 0.6
/** trụ vách trái / phải: cách vách sau chừng này phần chiều sâu lòng case (lệch về sau, không nằm giữa) */
const SIDE_AT = 0.3

/** trụ tròn (u, toạ độ case): tâm x, z, bán kính r, từ y0 tới y1 */
export interface PostCyl {
  x: number
  z: number
  r: number
  y0: number
  y1: number
}

/** case có trụ đỡ vòng: case 1 mảnh dựng bằng code (không CAD, không mica) lắp O-ring / OG */
export const hasRingPosts = (ctx: BuildContext) =>
  (ctx.mount === 'oring' || ctx.mount === 'og') &&
  !ctx.caseDef.model &&
  ctx.caseDef.pieces === 1 &&
  ctx.caseDef.material !== 'mica'

/**
 * Trụ đỡ: vách trước + vách sau mỗi bên 4 trụ (gần 2 góc + 1/4, 3/4 chiều dài), vách trái / phải mỗi bên 1 trụ cách vách sau
 * `SIDE_AT` chiều sâu; vách sau né khe daughterboard. Trụ đều 1 khối từ sàn tới sát mặt dưới PCB
 */
export function ringPosts(ctx: BuildContext): PostCyl[] {
  if (!hasRingPosts(ctx)) return []
  const hw = ctx.width / 2
  const hd = ctx.depth / 2
  const xs = [-(hw - CORNER), -hw / 2, hw / 2, hw - CORNER]
  const out: PostCyl[] = []
  const y0 = Y.floorTop - 0.01
  const y1 = Y.pcbBot - TOP_GAP
  for (const side of [-1, 1])
    out.push({
      x: side * (hw + CASE_MARGIN + POST_IN),
      z: -hd + SIDE_AT * 2 * hd,
      r: POST_R,
      y0,
      y1,
    })
  for (const side of [-1, 1])
    for (const x of xs) {
      if (side < 0 && ctx.dtb && Math.abs(x - ctx.dtb.x) < DTB_GAP / 2 + POST_R + 0.05) continue
      out.push({
        x,
        z: side * (hd + CASE_MARGIN + POST_IN),
        r: POST_R,
        y0,
        y1,
      })
    }
  return out
}
