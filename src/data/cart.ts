import type {
  CartLine,
  ParcelItem,
  PartCategory,
  PartItem,
  Product,
  ProductOption,
  StabItem,
  SupplyItem,
  SwitchItem,
  ToolItem,
} from '@/types'
import { stabStock } from './parts'

// Giỏ hàng Shopii: mỗi dòng = 1 đơn vị (`unit`, đúng option trên thẻ sản phẩm) × số lượng (`qty`)

/** dụng cụ / chứng chỉ chỉ mua 1; dòng giá sale chỉ 1 (mỗi món sale được giảm 1 lần, mua thêm là giá thường) */
export const cartMax = (l: CartLine) => (l.unit.kind === 'tool' || l.sale ? 1 : 99)

/**
 * Món đặt của 1 dòng giỏ: switch / stab / vật tư cộng dồn thành 1 món (số con / số stab / số gói × qty),
 * món khác (case, PCB, keycap...) thành `qty` món riêng
 */
export function cartItems(l: CartLine): ParcelItem[] {
  const u = l.unit
  const qty = Math.max(1, Math.min(cartMax(l), l.qty))
  if (qty === 1) return [u]
  const price = u.price * qty
  if (u.kind === 'supply') return [{ ...u, n: u.n * qty, price }]
  if (u.kind === 'part' && u.cat === 'switch') {
    const sw = u.item as SwitchItem
    return [{ ...u, item: { ...sw, count: sw.count * qty }, price }]
  }
  if (u.kind === 'part' && u.cat === 'stab') {
    const st = stabStock(u.item as StabItem)
    const item = {
      ...(u.item as StabItem),
      short: st.short * qty,
      long: st.long * qty,
      long7: st.long7 * qty,
    }
    return [{ ...u, item, price }]
  }
  return Array.from({ length: qty }, () => u)
}

/** giá 1 dòng (phí giao tính riêng 1 lần cho cả kiện, `SHIP_SPEEDS[speed].fee`) */
export const cartBase = (l: CartLine) => cartItems(l).reduce((a, it) => a + it.price, 0)

/** 1 đơn vị món đặt từ sản phẩm + option (giá hôm nay, chưa phí giao) */
export function unitItem(p: Product, o: ProductOption): ParcelItem {
  if (p.cat === 'tool' || p.cat === 'cert') {
    const it = o.item as ToolItem
    return { kind: 'tool', tool: it.kind, level: it.level, price: o.price }
  }
  if (p.cat === 'supply' || p.cat === 'spell') {
    const it = o.item as SupplyItem
    return { kind: 'supply', id: it.id, n: it.n, price: o.price }
  }
  return { kind: 'part', cat: p.cat as PartCategory, item: o.item as PartItem, price: o.price }
}

/** dòng giỏ từ sản phẩm + option (key = sản phẩm + option: thêm lại cùng option thì cộng số lượng) */
export const cartLine = (p: Product, o: ProductOption, qty: number): CartLine => ({
  // giá sale tách dòng riêng với giá thường cùng option
  key: `${p.id}:${o.label}${p.sale ? ':sale' : ''}`,
  product: p.id,
  sale: !!p.sale,
  label: p.options.length > 1 ? `${p.name} · ${o.label}` : p.name,
  unit: unitItem(p, o),
  qty,
})
