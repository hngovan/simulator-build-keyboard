/** Định dạng tiền (đơn vị nghìn đồng) */
export const fmt = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}k`

/** Ghép class Tailwind, bỏ giá trị rỗng */
export const cn = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(' ')
