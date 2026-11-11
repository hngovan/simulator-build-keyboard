/** mã màu hex 6 số (`#rrggbb`) */
export const isHex = (c: string) => /^#[0-9a-f]{6}$/i.test(c)

const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, '0')

/** chữ người dùng gõ → `#rrggbb`: nhận `#rgb`, `#rrggbb` (có / không dấu #), `rgb(r, g, b)`, `r, g, b`, `r g b`; sai thì null */
export function parseColor(text: string): string | null {
  const t = text.trim().toLowerCase()
  const h = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/.exec(t)?.[1]
  if (h) return '#' + (h.length === 3 ? [...h].map((c) => c + c).join('') : h)
  const m = /^(?:rgba?\s*\()?\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})\s*\)?$/.exec(t)
  if (!m) return null
  const rgb = m.slice(1, 4).map(Number)
  return rgb.some((n) => n > 255) ? null : '#' + rgb.map(hex2).join('')
}

/** màu ngẫu nhiên dễ nhìn: 20% trung tính (đen → trắng), còn lại sắc bất kỳ, không quá chói / quá tối */
export function randomHex(rnd: () => number = Math.random): string {
  const grey = rnd() < 0.2
  const h = rnd() * 360
  const s = grey ? rnd() * 0.06 : 0.3 + rnd() * 0.5
  const l = grey ? 0.12 + rnd() * 0.78 : 0.25 + rnd() * 0.45
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))
  }
  return '#' + [f(0), f(8), f(4)].map(hex2).join('')
}

/** màu chữ dễ đọc trên nền `hex`: nền sáng chữ tối, nền tối chữ sáng */
export function contrastOn(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#2a2a2e' : '#f2efe8'
}
