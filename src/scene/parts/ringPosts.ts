// Trụ đỡ O-ring trong case 1 mảnh dựng bằng code: trụ tròn đúc liền vách, mọc từ sàn lên (phay từ trên xuống được, không có
// gờ lơ lửng kiểu undercut): vách trước / sau mỗi bên 4 trụ, vách trái / phải mỗi bên 1 trụ lệch về phía sau
import { CASE_MARGIN, DTB_MM, Y, caseFloorTop, caseWall, pcbUsbSpot } from '@/data/steps'
import type { BuildContext } from '@/types'
import { MM } from '../models/Switch'

/** khe chừa trên vách sau cho daughterboard + cổng USB */
const DTB_GAP = (DTB_MM.w + 2) * MM
/** bán kính trụ (u): 2/3 bề ngang trụ vuông cũ 0,4u */
const POST_R = 0.135
/** tâm trụ lấn vào trong vách (u): nửa trụ chìm trong vách, nửa nhô ra lòng case, thò vào gầm mép board ~1,4mm */
const POST_IN = 0.03
/** vách mỏng: chừa giữa mặt ngoài trụ và mặt ngoài vách (u) */
const SKIN = 0.02
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

/** case có trụ đỡ vòng: case 1 mảnh dựng bằng code (không CAD, không mica) lắp O-ring */
export const hasRingPosts = (ctx: BuildContext) =>
  ctx.mount === 'oring' &&
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
  // tâm trụ lấn vào vách `POST_IN`, nhưng vách mỏng (case nhựa) thì lùi vào lòng case cho mặt ngoài trụ còn cách mặt ngoài vách
  // `SKIN` (không lòi ra ngoài vỏ)
  const into = Math.min(POST_IN, caseWall(ctx.caseDef) - POST_R - SKIN)
  const out: PostCyl[] = []
  const y0 = caseFloorTop(ctx.caseDef) - 0.01
  const y1 = Y.pcbBot - TOP_GAP
  // trụ vách trái / phải: khe giữa 2 hàng phím gần chỗ `SIDE_AT` nhất (gân ngang khung xương cá case nhựa đi qua tâm trụ)
  const rows = [...new Set(ctx.keys.filter((k) => k.h === 1).map((k) => +k.cz.toFixed(3)))].sort(
    (p, q) => p - q,
  )
  const want = -hd + SIDE_AT * 2 * hd
  const sideZ = rows
    .slice(1)
    .map((z, i) => (z + rows[i]) / 2)
    .reduce((m, z) => (Math.abs(z - want) < Math.abs(m - want) ? z : m), want)
  for (const side of [-1, 1])
    out.push({
      x: side * (hw + CASE_MARGIN + into),
      z: sideZ,
      r: POST_R,
      y0,
      y1,
    })
  for (const side of [-1, 1])
    for (const x of xs) {
      if (side < 0 && ctx.dtb && Math.abs(x - ctx.dtb.x) < DTB_GAP / 2 + POST_R + 0.05) continue
      // cổng USB-C hàn trên PCB: né lỗ cổng ở vách sau
      if (
        side < 0 &&
        ctx.caseDef.pcbUsb &&
        Math.abs(x - pcbUsbSpot(ctx.width, ctx.depth, ctx.caseDef.pcbUsb).x) < DTB_GAP / 2 + POST_R
      )
        continue
      out.push({
        x,
        z: side * (hd + CASE_MARGIN + into),
        r: POST_R,
        y0,
        y1,
      })
    }
  return out
}
