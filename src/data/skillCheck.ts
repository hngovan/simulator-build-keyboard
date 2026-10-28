// Skill check (vặn vít vào / hàn chân switch): bấm 1 lần cho kim chạy qua lại trên thanh, bấm lần nữa (hoặc Space) để dừng.
// Thanh tính 0..1 từ trái sang phải = lực / nhiệt tăng dần: đỏ trái = chưa tới (vít lỏng / thiếc chưa ăn), xanh = đạt,
// vàng (trong xanh) = hoàn hảo, đỏ phải = quá tay (trượt ren / cháy chân)

export interface SkillCheck {
  /** mốc thời gian bắt đầu chạy kim (ms, performance.now) */
  at: number
  /** số lượt chạy hết thanh mỗi giây */
  speed: number
  /** vùng xanh [lo, hi) */
  lo: number
  hi: number
  /** vùng vàng hoàn hảo [plo, phi) nằm trong vùng xanh */
  plo: number
  phi: number
}

export type SkillResult = 'perfect' | 'ok' | 'low' | 'high'

/** độ khó 1 lần thử: bề rộng vùng xanh (phần thanh) + tốc độ kim */
export interface SkillSpec {
  width: number
  speed: number
}

/** vùng vàng = phần này của vùng xanh */
const PERFECT = 0.3

/** tạo 1 lần thử: vùng xanh ngẫu nhiên, luôn chừa đỏ 2 bên (trái ≥ 0.2, phải ≥ 0.12), vùng vàng ngẫu nhiên trong xanh */
export function makeCheck({ width, speed }: SkillSpec, rng = Math.random): SkillCheck {
  const w = Math.min(0.6, Math.max(0.06, width))
  const lo = 0.2 + (0.88 - w - 0.2) * rng()
  const pw = w * PERFECT
  const plo = lo + (w - pw) * rng()
  return { at: performance.now(), speed, lo, hi: lo + w, plo, phi: plo + pw }
}

/** vị trí kim 0..1 lúc `now`: chạy qua lại liên tục */
export function needleAt(c: SkillCheck, now = performance.now()) {
  const x = ((Math.max(0, now - c.at) / 1000) * c.speed) % 2
  return x < 1 ? x : 2 - x
}

export function judge(c: SkillCheck, pos: number): SkillResult {
  if (pos < c.lo) return 'low'
  if (pos >= c.hi) return 'high'
  return pos >= c.plo && pos < c.phi ? 'perfect' : 'ok'
}
