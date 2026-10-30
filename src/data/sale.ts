import type { PartCategory, Product } from '@/types'

/** Shopii sale linh kiện theo sự kiện: cứ SALE_EVERY ngày 1 lần (ngày 3, 6, 9...) */
export const SALE_EVERY = 3
export const isSaleDay = (day: number) => day % SALE_EVERY === 0
/** ngày sale gần nhất từ hôm nay (hôm nay sale thì là hôm nay) */
export const nextSaleDay = (day: number) => Math.ceil(day / SALE_EVERY) * SALE_EVERY
/** chỉ linh kiện được sale (không vật tư / dụng cụ / chứng chỉ / sách phép) */
const SALE_CATS: PartCategory[] = ['case', 'pcb', 'plate', 'stab', 'switch', 'keycap']
/** số mục được sale mỗi ngày sale, số món sale mỗi mục (1 → SALE_MAX) */
const SALE_CAT_N = 3
const SALE_MAX = 5

/** số giả ngẫu nhiên [0, 1) cố định theo chuỗi (cùng ngày + sản phẩm luôn ra cùng mức giảm) */
function hash01(key: string) {
  let h = 2166136261
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return (h >>> 0) / 2 ** 32
}

/** mục linh kiện được sale hôm nay (3 mục ngẫu nhiên theo ngày); ngày thường rỗng */
export function saleCats(day: number): PartCategory[] {
  if (!isSaleDay(day)) return []
  return [...SALE_CATS]
    .sort((a, b) => hash01(`${day}:cat:${a}`) - hash01(`${day}:cat:${b}`))
    .slice(0, SALE_CAT_N)
}

/** % giảm từng sản phẩm hôm nay (id → %): mỗi mục sale 1–5 món ngẫu nhiên, giảm 5–30% (cố định theo ngày + id) */
export function saleMap(catalog: Pick<Product, 'id' | 'cat'>[], day: number) {
  const out = new Map<string, number>()
  for (const cat of saleCats(day)) {
    const list = catalog
      .filter((p) => p.cat === cat)
      .sort((a, b) => hash01(`${day}:${a.id}`) - hash01(`${day}:${b.id}`))
    const n = 1 + Math.floor(hash01(`${day}:n:${cat}`) * SALE_MAX)
    for (const p of list.slice(0, n))
      out.set(p.id, 5 + Math.floor(hash01(`${day}:${p.id}:pct`) * 26))
  }
  return out
}

/** sản phẩm với giá hôm nay: được sale (`pct` > 0) thì mọi option giảm `pct`%, giữ giá gốc ở `was` */
export function withSale(p: Product, pct: number): Product {
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
