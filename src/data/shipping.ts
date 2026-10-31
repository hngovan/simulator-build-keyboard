import type { Parcel, ParcelItem, ToolKind } from '@/types'
import { TOOLS, itemName } from './parts'
import { SUPPLIES } from './supplies'

/** tốc độ giao hàng Shopii: phí cố định mỗi dòng giỏ hàng (mỗi món khác nhau; cùng món nhiều cái không cộng dồn), Tiết kiệm miễn phí */
export type ShipSpeed = 'express' | 'fast' | 'saver'

export const SHIP_SPEEDS: Record<
  ShipSpeed,
  { name: string; days: number; fee: number; desc: string }
> = {
  express: { name: 'Hoả tốc', days: 0, fee: 50, desc: 'Tới cửa ngay trong ngày' },
  fast: { name: 'Nhanh', days: 1, fee: 20, desc: 'Tới cửa ngày mai' },
  saver: { name: 'Tiết kiệm', days: 2, fee: 0, desc: 'Tới cửa sau 2 ngày, miễn phí giao' },
}
export const SHIP_ORDER: ShipSpeed[] = ['express', 'fast', 'saver']

/** ngày hàng tới cửa nếu đặt hôm nay */
export const arriveDay = (day: number, speed: ShipSpeed) => day + SHIP_SPEEDS[speed].days

/** chữ ngày tới: "Hôm nay" / "Ngày X" */
export const arriveText = (arrive: number, day: number) =>
  arrive <= day ? 'Hôm nay' : `Ngày ${arrive}`

/** kiện đã tới cửa (chờ người chơi ra nhận) */
export function arrivedParcels(parcels: Parcel[], day: number): Parcel[] {
  return parcels.filter((p) => p.arrive <= day)
}

/**
 * Kiện đã tới gộp thành thùng trên kệ cửa: cùng nguồn (Shopii / chợ) + cùng tên = 1 thùng (bấm nhận cả chồng).
 * Dùng chung cho kệ 3D (`DoorParcels`) và số thùng đếm ở HUD để 2 bên luôn khớp
 */
export function parcelStacks(parcels: Parcel[], day: number): Parcel[][] {
  const map = new Map<string, Parcel[]>()
  for (const p of arrivedParcels(parcels, day)) {
    const k = `${p.from ?? 'shopii'}|${p.label}`
    map.set(k, [...(map.get(k) ?? []), p])
  }
  return [...map.values()]
}

/** tên kiện gộp theo thùng: "PCB 40% Hotswap ×2, Switch ..." */
export const stackLabels = (stacks: Parcel[][]) =>
  stacks.map((l) => (l.length > 1 ? `${l[0].label} x${l.length}` : l[0].label)).join(', ')

/** dụng cụ (mỏ hàn: đúng loại, món khác: bậc này trở lên) đang trên đường giao / chờ ở cửa */
export const toolOnWay = (parcels: Parcel[], kind: ToolKind, level: number) =>
  parcels.some((p) =>
    p.items.some(
      (i) =>
        i.kind === 'tool' &&
        i.tool === kind &&
        (kind === 'solder' ? i.level === level : i.level >= level),
    ),
  )

/** mã kiện mới */
export const parcelId = () =>
  `pc${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** tên 1 món trong kiện */
export const parcelItemName = (it: ParcelItem) =>
  it.kind === 'part'
    ? itemName(it.cat, it.item)
    : it.kind === 'supply'
      ? SUPPLIES[it.id].name
      : TOOLS[it.tool][it.level].name

/** các món trong kiện, gộp trùng tên (giỏ tách case / plate... số lượng N thành N món riêng) */
export function parcelContents(items: ParcelItem[]): { name: string; qty: number }[] {
  const count = new Map<string, number>()
  for (const it of items) {
    const name = parcelItemName(it)
    count.set(name, (count.get(name) ?? 0) + 1)
  }
  return [...count].map(([name, qty]) => ({ name, qty }))
}

/** tên kiện: món đầu (mua nhiều cái thì "x2") + số món khác loại còn lại; cùng món nhiều cái tính 1 món */
export function parcelLabel(items: ParcelItem[]) {
  const [first, ...rest] = parcelContents(items)
  return `${first.name}${first.qty > 1 ? ` x${first.qty}` : ''}${rest.length ? ` +${rest.length} món` : ''}`
}
