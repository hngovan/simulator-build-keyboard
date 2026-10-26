import { checkInventory } from '@/data/parts'
import type { GameState } from '@/store'

// Gợi ý của NPC hướng dẫn: mỗi mẹo hiện 1 lần (bấm "Hiểu rồi" thì không hiện lại), lấy mẹo đầu tiên đúng tình huống
export interface Tip {
  id: string
  /** đúng tình huống thì hiện */
  when: (s: GameState) => boolean
  text: string
}

const step = (s: GameState) => (s.build && s.ctx ? s.ctx.steps[s.build.stepIdx] : undefined)
const ready = (s: GameState) =>
  !!s.order && !s.build && !s.result && checkInventory(s.inventory, s.order).every((c) => c.ok)

export const TIPS: Tip[] = [
  {
    id: 'welcome',
    when: (s) => s.screen === 'pc' && !s.order && !s.jobs.length && s.done === 0,
    text: 'Chào thợ mới! Mình là Keeb-chan 💕 Mở Mezzenger để nhận đơn build đầu tiên nhé.',
  },
  {
    id: 'parts',
    when: (s) => s.screen === 'pc' && !!s.order && !s.build && !s.result && !ready(s),
    text: 'Đơn cần linh kiện: mở "Chi tiết đơn" xem còn thiếu gì rồi mua ở Shopii. Hội Phím Cơ rẻ hơn nhưng nhớ xin hình kẻo dính hàng lỗi!',
  },
  {
    id: 'ready',
    when: (s) => s.screen === 'pc' && ready(s),
    text: 'Đủ đồ rồi! Bấm "Bàn build" góc phải màn hình để bắt đầu lắp nào ⌨️',
  },
  {
    id: 'bench',
    when: (s) => s.screen === 'bench' && !!s.build && s.build.stepIdx <= 1,
    text: 'Làm theo danh sách bước bên trái, mũi tên vàng chỉ chỗ cần bấm. Bấm vào bước đã làm để quay lại sửa.',
  },
  {
    id: 'solder',
    when: (s) => s.screen === 'bench' && step(s) === 'solder',
    text: 'Giữ chuột lên chân switch, nhả khi thanh nhiệt vào vùng xanh. Hàn cháy thì lau mũi hàn vào bùi nhùi rồi hàn lại.',
  },
  {
    id: 'test',
    when: (s) => s.screen === 'bench' && step(s) === 'test',
    text: 'Test hết phím trước khi giao nhé! Bỏ sót là khách có thể báo lỗi nút, bị đánh giá thấp đó 😣',
  },
  {
    id: 'ship',
    when: (s) => s.screen === 'pc' && s.packed.some((p) => !p.shipped),
    text: 'Phím đóng gói xong rồi! Vào Mezzenger gửi cho khách để nhận tiền công nha.',
  },
  {
    id: 'save',
    when: (s) => s.screen === 'pc' && s.done >= 1,
    text: 'Nhấn Esc để mở Cài đặt: lưu tiến trình lên bảng xếp hạng ở nút xanh trên cùng.',
  },
]

/** mẹo đang hiện (null = không có mẹo hợp tình huống) */
export const currentTip = (s: GameState) =>
  TIPS.find((t) => !s.guideSeen.includes(t.id) && t.when(s)) ?? null
