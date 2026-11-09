import { create } from 'zustand'

/** chỗ đứng khi bắt đầu đi lại (vừa rời máy tính / bàn build) */
export type RoomSpot = 'pc' | 'bench'

/** camera bay tới tư thế (đơn vị cảnh), xong thì gọi `then` */
export interface CamFly {
  pos: [number, number, number]
  look: [number, number, number]
  then: () => void
}

/** Trạng thái chế độ đi lại trong phòng (không lưu) */
export const useRoom = create<{
  spot: RoomSpot
  fly: CamFly | null
  /** việc chuột trái của vật đang rê (HUD hiện "Nhấn [chuột trái] ...") */
  hover: string | null
  /** đang rê vật mà không bấm được gì: chỉ hiện dòng chữ này (vd bàn build trống) */
  hoverNote: string | null
  /** đang trỏ bàn build lúc cầm thùng đơn tới bàn trống: khối chỗ đặt trên bàn sáng viền */
  benchHover: boolean
  /** đang mở popup lịch treo tường */
  calendar: boolean
  /** dẫn đường người mới (`GuideMarker`): hướng chỗ cần tới so với hướng nhìn (độ, + = phải), khoảng cách (m); null = không dẫn */
  guideDir: number | null
  guideDist: number | null
  /** đang khoá tâm chuột (pointer lock, kiểu Minecraft): ẩn con trỏ, hiện tâm ngắm giữa màn */
  locked: boolean
}>(() => ({
  spot: 'bench',
  fly: null,
  hover: null,
  hoverNote: null,
  benchHover: false,
  calendar: false,
  guideDir: null,
  guideDist: null,
  locked: false,
}))
