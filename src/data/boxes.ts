// Thùng hàng vật lý trong phòng: thùng đơn khách (nhận đơn ở Mezzenger → tới kệ ngoài cửa), thùng đã đóng gói (chờ giao).
// Mỗi thùng nằm ở 1 ô kệ (`BoxSpot`), trên bàn build (`benchBox`) hoặc trên tay (`held`) — xem store/carrySlice.ts

/** chỗ để thùng: kệ ngoài cửa (ô nhận đơn, quá thì xếp dưới sàn), kệ cất đơn trong phòng, ô giao hàng trên kệ ngoài cửa */
export type BoxAt = 'door' | 'shelf' | 'ship'
export interface BoxSpot {
  at: BoxAt
  slot: number
}

/** số ô mỗi chỗ: mỗi hàng 3 ô. Kệ cửa: 2 tầng dưới nhận đơn (quá thì xếp sàn), 2 tầng trên giao hàng; kệ cất đơn 4 tầng (cả mặt trên) */
export const SLOTS_PER_ROW = 3
export const DOOR_RACK_SLOTS = 6
export const SHIP_SLOTS = 6
export const SHELF_SLOTS = 12

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
