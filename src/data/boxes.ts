// Thùng hàng vật lý trong phòng: thùng đơn khách (nhận đơn ở Mezzenger → tới kệ ngoài cửa), thùng đã đóng gói (chờ giao).
// Mỗi thùng nằm ở 1 ô kệ (`BoxSpot`), trên bàn build (`benchBox`) hoặc trên tay (`held`) — xem store/carrySlice.ts

/**
 * chỗ để thùng: kệ cuối hành lang (`door`: ô nhận hàng + cất thùng đơn, quá thì đổ đống dưới sàn),
 * kệ giao hàng trong phòng (`ship`: đặt thùng đã đóng gói vào = gửi khách)
 */
export type BoxAt = 'door' | 'ship'
export interface BoxSpot {
  at: BoxAt
  slot: number
}

/** số ô mỗi chỗ. Kệ cửa: 4 tầng × 3 ô nhận hàng (quá thì xếp sàn); kệ giao hàng 4 tầng (cả mặt trên):
 * mỗi tầng 2 ô trái / phải (`NEAT_PER_ROW`, không chồng) */
export const SLOTS_PER_ROW = 3
export const NEAT_PER_ROW = 2
export const DOOR_RACK_SLOTS = 12
export const SHIP_SLOTS = 8

/**
 * bản lưu cũ: thùng ở kệ cất đơn (`'shelf'`, kệ trong phòng nay là kệ giao hàng) ra kệ cửa; ô vượt số ô hiện tại dời vào ô trống,
 * hết ô thì ra kệ cửa
 */
export function fitBoxes(boxes: Record<string, BoxSpot>): Record<string, BoxSpot> {
  const out: Record<string, BoxSpot> = {}
  const limit = { ship: SHIP_SLOTS, door: Infinity }
  const over: [string, BoxSpot][] = []
  for (const [id, b] of Object.entries(boxes))
    if (b.at in limit && b.slot < limit[b.at]) out[id] = b
    else over.push([id, b.at in limit ? b : { at: 'door', slot: 0 }])
  for (const [id, b] of over) {
    const slot = freeSlot(out, b.at, limit[b.at])
    out[id] = slot >= 0 ? { at: b.at, slot } : { at: 'door', slot: freeSlot(out, 'door') }
  }
  return out
}

/** ô trống đầu tiên (`limit` = không giới hạn thì cứ tăng: ô ≥ số ô kệ là xếp dưới sàn), -1 = đầy */
export function freeSlot(boxes: Record<string, BoxSpot>, at: BoxAt, limit = Infinity) {
  const used = new Set(
    Object.values(boxes)
      .filter((b) => b.at === at)
      .map((b) => b.slot),
  )
  for (let i = 0; i < limit; i++) if (!used.has(i)) return i
  return -1
}

/** ô `slot` ở `at` đã có thùng chưa */
export const slotTaken = (boxes: Record<string, BoxSpot>, at: BoxAt, slot: number) =>
  Object.values(boxes).some((b) => b.at === at && b.slot === slot)
