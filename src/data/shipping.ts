import type { Parcel, ToolKind } from '@/types'

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
  stacks.map((l) => (l.length > 1 ? `${l[0].label} ×${l.length}` : l[0].label)).join(', ')

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
