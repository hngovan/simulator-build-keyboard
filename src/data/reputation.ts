// Uy tín thợ: bậc uy tín quyết định hệ số tiền công (số đơn mỗi ngày theo cấp xưởng, uy tín âm bớt: data/unlocks.ts `offerRange`);
// chứng chỉ thợ cộng thu nhập cơ bản mỗi đơn nhận

export interface RepTier {
  /** uy tín tối thiểu của bậc */
  min: number
  name: string
  /** hệ số tiền công khách trả */
  pay: number
}

/** các bậc uy tín (tăng dần) */
export const REP_TIERS: RepTier[] = [
  { min: -Infinity, name: 'Bị tẩy chay', pay: 0.8 },
  { min: -5, name: 'Tai tiếng', pay: 0.9 },
  { min: 0, name: 'Mới vào nghề', pay: 1 },
  { min: 10, name: 'Có tiếng', pay: 1.15 },
  { min: 30, name: 'Thợ có tâm', pay: 1.3 },
]

/** bậc uy tín hiện tại + bậc kế tiếp (nếu còn) */
export function repTier(rep: number) {
  let i = 0
  while (i + 1 < REP_TIERS.length && rep >= REP_TIERS[i + 1].min) i++
  return { tier: REP_TIERS[i], next: REP_TIERS[i + 1] as RepTier | undefined }
}

/** Uy tín thay đổi theo (hiện ở bảng uy tín) */
export const REP_RULES: [string, string][] = [
  ['Giao hàng', 'số sao − 3 (5★ +2, 4★ +1, 3★ 0, 1–2★ trừ)'],
  ['Giao trễ hạn', '−1 mỗi ngày trễ'],
  ['Làm sai mô tả khách', 'ít sao → trừ uy tín'],
  ['Từ chối quá 2 đơn / ngày', '−1 mỗi đơn từ đơn thứ 3'],
  ['Khách huỷ vì trễ quá 3 ngày', '−3'],
  ['Uy tín từ −10 trở xuống', 'bị phốt quá nhiều, thua game'],
]

/** thu nhập cơ bản mỗi đơn nhận theo bậc chứng chỉ thợ (TOOLS.cert): lõ / middle / senior (k) */
export const CERT_BONUS = [0, 150, 350]
export const certBonus = (cert: number) => CERT_BONUS[cert] ?? 0
