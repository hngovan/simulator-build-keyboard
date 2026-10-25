/** Định dạng tiền (đơn vị nghìn đồng) */
export const fmt = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}k`

/** Tiền gọn theo cỡ (đơn vị gốc nghìn đồng): dưới 10.000k giữ k, từ 10.000k → m, từ 100.000k → B (ví, bảng xếp hạng) */
export function fmtMoney(n: number) {
  const a = Math.abs(Math.round(n))
  const show = (v: number, unit: string) =>
    `${(Math.round(v * 100) / 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}${unit}`
  if (a >= 1e5) return show(n / 1e6, 'B')
  if (a >= 1e4) return show(n / 1e3, 'm')
  return fmt(n)
}

/** Ghép class Tailwind, bỏ giá trị rỗng */
export const cn = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(' ')
