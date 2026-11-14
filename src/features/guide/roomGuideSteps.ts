import type { GameState } from '@/store'
import { checkInventory } from '@/data/parts'
import { BENCH_TOUR_ID, SHIP_TOUR_ID, TOUR_ID } from '@/data/tourIds'

/** chỗ Keeb-chan chỉ tới trong phòng (điểm đánh dấu 3D `GuideMarker` + mũi tên hướng ở HUD) */
export type GuideTarget = 'pc' | 'door' | 'bench' | 'calendar' | 'ship'

export { SHIP_TOUR_ID } from '@/data/tourIds'

export interface RoomGuideStep {
  text: string
  /** câu đọc thay cho `text` khi `text` ghép tên khách / số ngày (không có giọng sinh sẵn) */
  voice?: string
  target: GuideTarget | null
}

/** câu tĩnh của lời dẫn khi đi lại (`bun run gen:voice` sinh giọng Keeb-chan; câu ghép số ngày / tên khách không có giọng) */
export const ROOM_LINES = {
  start:
    'Chào chủ xưởng mới! Đi tới bàn máy tính (theo mũi tên) và bấm vào màn hình để mở máy, nhận đơn đầu tiên.',
  collect:
    'Đã gửi đơn đầu tiên 🎉 Giờ thu tiền công: bấm vào màn hình máy tính, mở Mezzenger rồi bấm "Thu tiền" trong tin nhắn của khách.',
  endDay:
    'Thu tiền xong rồi! Hết việc hôm nay thì bấm vào lịch treo tường để kết thúc ngày, sang ngày mới có đơn mới.',
  carryPacked:
    'Đang cầm thùng đã đóng gói. Mang tới kệ giao hàng sát tường phải trong phòng, bấm vào ô trống trên kệ để đặt = gửi cho khách.',
  takePacked: 'Phím đã đóng gói! Tới bàn build, nhấn chuột trái vào bàn để cầm thùng lên.',
  carryBox:
    'Đang cầm thùng đơn. Đi về bàn build trong phòng, bấm vào bàn để đặt thùng xuống rồi ngồi vào lắp.',
  sitDown:
    'Thùng đơn đã nằm trên bàn build. Bấm vào bàn để ngồi xuống, rồi bấm chuột trái vào thùng để bắt đầu lắp.',
  parcel:
    'Linh kiện tới rồi! Đi ra cửa phòng bên trái, rẽ vào hành lang tới kệ sắt cuối hành lang, bấm kiện Shopii (logo cam) để nhận.',
  missing:
    'Còn thiếu linh kiện cho đơn. Bấm màn hình máy tính, mở Shopii mua nốt (app Danh sách đơn ghi món còn thiếu).',
}

/** câu chỉ để đọc (khung hiện câu ghép số ngày / tên khách) */
export const ROOM_VOICE = {
  waiting: 'Kiện đang giao. Bấm lịch treo tường để chờ hàng tới.',
  pickBox: 'Đủ đồ rồi! Ra kệ sắt cuối hành lang cầm thùng đơn lên.',
}

/**
 * Lời dẫn của Keeb-chan khi đi lại trong phòng cho người mới: chưa xem tour máy tính thì chỉ màn hình máy tính;
 * đang làm đơn hướng dẫn (chưa vào build) thì chỉ việc kế tiếp: nhận kiện ở kệ cuối hành lang → cầm thùng đơn → bàn build
 */
export function roomGuide(s: GameState): RoomGuideStep | null {
  if (!s.guideSeen.includes(TOUR_ID))
    return {
      text: ROOM_LINES.start,
      target: 'pc',
    }
  // đơn hướng dẫn đã đóng gói: cầm thùng → kệ giao hàng → (đã gửi) bấm lịch kết thúc ngày
  const tut = s.packed.find((p) => p.order.tutorial)
  if (tut && !s.guideSeen.includes(SHIP_TOUR_ID)) {
    const id = tut.order.id
    if (tut.shipped && tut.paid === false)
      return {
        text: ROOM_LINES.collect,
        target: 'pc',
      }
    if (tut.shipped)
      return {
        text: ROOM_LINES.endDay,
        target: 'calendar',
      }
    if (s.held === id)
      return {
        text: ROOM_LINES.carryPacked,
        target: 'ship',
      }
    if (s.benchBox === id)
      return {
        text: ROOM_LINES.takePacked,
        target: 'bench',
      }
  }
  const o = s.order
  // tour bàn build đã xem / bỏ qua (hoặc người đã từng chơi): không dẫn đường đơn hướng dẫn nữa
  if (!o?.tutorial || s.build || s.result || s.guideSeen.includes(BENCH_TOUR_ID)) return null
  if (s.held === o.id)
    return {
      text: ROOM_LINES.carryBox,
      target: 'bench',
    }
  if (s.benchBox === o.id)
    return {
      text: ROOM_LINES.sitDown,
      target: 'bench',
    }
  if (s.parcels.some((p) => p.arrive <= s.day))
    return {
      text: ROOM_LINES.parcel,
      target: 'door',
    }
  const pending = s.parcels.filter((p) => p.arrive > s.day)
  if (pending.length)
    return {
      text: `Kiện đang giao, tới ngày ${Math.min(...pending.map((p) => p.arrive))}. Bấm lịch treo tường để kết thúc ngày, chờ hàng tới.`,
      voice: ROOM_VOICE.waiting,
      target: 'calendar',
    }
  if (checkInventory(s.inventory, o).some((c) => !c.ok))
    return {
      text: ROOM_LINES.missing,
      target: 'pc',
    }
  if (s.boxes[o.id]?.at === 'door')
    return {
      text: `Đủ đồ rồi! Ra kệ sắt cuối hành lang (cửa phòng bên trái), bấm thùng đơn của ${o.customer} để cầm lên.`,
      voice: ROOM_VOICE.pickBox,
      target: 'door',
    }
  return null
}

/** chỉ chỗ cần tới (selector giá trị đơn cho Zustand) */
export const roomGuideTarget = (s: GameState) => roomGuide(s)?.target ?? null
export const roomGuideText = (s: GameState) => roomGuide(s)?.text ?? null
/** câu đọc thành tiếng của lời dẫn đang hiện */
export const roomGuideVoice = (s: GameState) => {
  const g = roomGuide(s)
  return g ? (g.voice ?? g.text) : null
}
