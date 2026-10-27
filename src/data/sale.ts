import type { PartCategory, Product } from '@/types'

/** Shopii sale linh kiện theo sự kiện: cứ SALE_EVERY ngày 1 lần (ngày 3, 6, 9...) */
export const SALE_EVERY = 3
export const isSaleDay = (day: number) => day % SALE_EVERY === 0
/** ngày sale gần nhất từ hôm nay (hôm nay sale thì là hôm nay) */
export const nextSaleDay = (day: number) => Math.ceil(day / SALE_EVERY) * SALE_EVERY
/** chỉ linh kiện được sale (không vật tư / dụng cụ / chứng chỉ / sách phép) */
const SALE_CATS: PartCategory[] = ['case', 'pcb', 'plate', 'stab', 'switch', 'keycap']
/** tỉ lệ sản phẩm linh kiện được sale trong ngày sale */
const SALE_SHARE = 0.6

/** số giả ngẫu nhiên [0, 1) cố định theo chuỗi (cùng ngày + sản phẩm luôn ra cùng mức giảm) */
function hash01(key: string) {
  let h = 2166136261
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return (h >>> 0) / 2 ** 32
}

/** % giảm của sản phẩm trong ngày: 0 = không sale, còn lại 5 → 30% (bước 5%) */
export function salePct(day: number, p: Pick<Product, 'id' | 'cat'>) {
  if (!isSaleDay(day) || !SALE_CATS.includes(p.cat as PartCategory)) return 0
  if (hash01(`${day}:${p.id}`) >= SALE_SHARE) return 0
  return 5 + Math.floor(hash01(`${day}:${p.id}:pct`) * 6) * 5
}

/** sản phẩm với giá hôm nay: ngày sale thì mọi option giảm `salePct`, giữ giá gốc ở `was` */
export function withSale(p: Product, day: number): Product {
  const pct = salePct(day, p)
  if (!pct) return p
  return {
    ...p,
    sale: pct,
    options: p.options.map((o) => ({
      ...o,
      was: o.price,
      price: Math.max(1, Math.round((o.price * (100 - pct)) / 100)),
    })),
  }
}
