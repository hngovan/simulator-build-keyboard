// Skill check (vặn vít vào / hàn chân switch): nhấn giữ chuột cho thanh lực / nhiệt chạy lên rồi tụt xuống, nhả chuột để chấm.
// Thanh tính 0..1 từ trái sang phải = lực / nhiệt tăng dần: chưa tới xanh = thiếu (vít lỏng / thiếc chưa ăn), xanh = đạt,
// đỏ cuối thanh = quá tay (trượt ren / cháy chân)

export interface SkillCheck {
  /** mốc thời gian bắt đầu giữ chuột (ms, performance.now) */
  at: number
  /** số lần chạy hết thanh mỗi giây */
  speed: number
  /** vùng xanh [lo, hi) */
  lo: number
  hi: number
  /** vùng hoàn hảo [plo, phi) (đã bỏ: plo = phi, giữ field cho save / build.perfect cũ) */
  plo: number
  phi: number
}

export type SkillResult = 'perfect' | 'ok' | 'low' | 'high'

/** độ khó 1 lần thử: bề rộng vùng xanh (phần thanh) + tốc độ kim */
export interface SkillSpec {
  width: number
  speed: number
}

/** đỏ cuối thanh (quá tay) cố định, vùng xanh nằm sát ngay trước */
const RED = 0.16

/** 1 lần thử: 3 khoảng cố định (tối = chưa tới, xanh = đạt, đỏ = quá tay), không random; không còn vùng hoàn hảo */
export function makeCheck({ width, speed }: SkillSpec): SkillCheck {
  const hi = 1 - RED
  const lo = hi - Math.min(0.5, Math.max(0.06, width))
  return { at: performance.now(), speed, lo, hi, plo: hi, phi: hi }
}

/** mức lực 0..1 lúc `now`: giữ chuột thì chạy lên hết thanh rồi tụt xuống lại, lặp tới khi nhả */
export function needleAt(c: SkillCheck, now = performance.now()) {
  const x = ((Math.max(0, now - c.at) / 1000) * c.speed) % 2
  return x < 1 ? x : 2 - x
}

export function judge(c: SkillCheck, pos: number): SkillResult {
  if (pos < c.lo) return 'low'
  if (pos >= c.hi) return 'high'
  return pos >= c.plo && pos < c.phi ? 'perfect' : 'ok'
}
