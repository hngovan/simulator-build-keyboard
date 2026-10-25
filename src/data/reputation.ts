// Uy tín thợ: bậc uy tín quyết định số đơn mỗi ngày + hệ số tiền công; chứng chỉ thợ cộng thu nhập cơ bản mỗi đơn nhận

export interface RepTier {
  /** uy tín tối thiểu của bậc */
  min: number
  name: string
  /** số đơn mới mỗi ngày [ít nhất, nhiều nhất] */
  offers: [number, number]
  /** hệ số tiền công khách trả */
  pay: number
}

/** các bậc uy tín (tăng dần) */
export const REP_TIERS: RepTier[] = [
  { min: -Infinity, name: 'Bị tẩy chay', offers: [3, 4], pay: 0.8 },
  { min: -5, name: 'Tai tiếng', offers: [4, 5], pay: 0.9 },
  { min: 0, name: 'Mới vào nghề', offers: [5, 7], pay: 1 },
  { min: 10, name: 'Có tiếng', offers: [6, 8], pay: 1.15 },
  { min: 30, name: 'Thợ có tâm', offers: [7, 9], pay: 1.3 },
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
]

/** thu nhập cơ bản mỗi đơn nhận theo bậc chứng chỉ thợ (TOOLS.cert): lõ / middle / senior (k) */
export const CERT_BONUS = [0, 150, 350]
export const certBonus = (cert: number) => CERT_BONUS[cert] ?? 0
