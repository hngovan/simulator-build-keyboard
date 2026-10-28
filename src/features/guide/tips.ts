import { checkInventory } from '@/data/parts'
import { arrivedParcels } from '@/data/shipping'
import type { GameState } from '@/store'

// Gợi ý của NPC hướng dẫn ở máy tính (bàn build dùng hội thoại `benchLines.ts`): Keeb-chan luôn ở góc màn hình,
// nói mẹo đầu tiên đúng tình huống (đổi theo tiến độ), không có mẹo nào hợp thì nói câu chung `IDLE`
export interface Tip {
  id: string
  /** đúng tình huống thì hiện */
  when: (s: GameState) => boolean
  text: string
}

const ready = (s: GameState) =>
  !!s.order && !s.build && !s.result && checkInventory(s.inventory, s.order).every((c) => c.ok)

export const TIPS: Tip[] = [
  {
    id: 'welcome',
    when: (s) => s.screen === 'pc' && !s.order && !s.jobs.length && s.done === 0,
    text: 'Chào thợ mới! Mình là Keeb-chan 💕 Mở Mezzenger để nhận đơn build đầu tiên nhé.',
  },
  {
    id: 'parcel',
    when: (s) => s.screen === 'pc' && arrivedParcels(s.parcels, s.day).length > 0,
    text: 'Có kiện hàng Shopii tới cửa rồi! Ra cửa phòng bấm thùng hàng để nhận, nhận rồi đồ mới vào kho nha 📦',
  },
  {
    id: 'parts',
    when: (s) => s.screen === 'pc' && !!s.order && !s.build && !s.result && !ready(s),
    text: 'Đơn cần linh kiện: mở "Chi tiết đơn" xem còn thiếu gì rồi đặt ở Shopii: Hoả tốc tới cửa ngay nhưng đắt hơn, Tiết kiệm rẻ mà chờ 2 ngày. Hội Phím Cơ rẻ hơn nhưng nhớ xin hình kẻo dính hàng lỗi!',
  },
  {
    id: 'ready',
    when: (s) => s.screen === 'pc' && ready(s),
    text: 'Đủ đồ rồi! Bấm "Đứng dậy" (hoặc Esc) rồi sang bàn build bên cạnh để bắt đầu lắp nào ⌨️',
  },
  {
    id: 'ship',
    when: (s) => s.screen === 'pc' && s.packed.some((p) => !p.shipped),
    text: 'Phím đóng gói xong rồi! Vào Mezzenger gửi cho khách để nhận tiền công nha.',
  },
  {
    id: 'save',
    when: (s) => s.screen === 'pc' && s.done >= 1,
    text: 'Mở Cài đặt (icon ở thanh dưới) để lưu tiến trình lên bảng xếp hạng ở nút xanh trên cùng. Esc là đứng dậy rời máy.',
  },
]

/** câu chung khi không có mẹo nào hợp tình huống */
const IDLE: Tip = {
  id: 'idle',
  when: () => true,
  text: 'Mình ở đây nếu bạn cần nhé! Nhận thêm đơn ở Mezzenger, hết việc thì đứng dậy ra lịch trên tường bấm "Kết thúc ngày".',
}

/** mẹo đang nói (luôn có, chỉ ở màn hình máy tính) */
export const currentTip = (s: GameState) => TIPS.find((t) => t.when(s)) ?? IDLE
