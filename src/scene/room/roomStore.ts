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
  /** điểm trên sàn đang tự đi tới (bấm sàn), x / z đơn vị cảnh */
  goal: [number, number] | null
  fly: CamFly | null
  /** tên việc của vật đang rê chuột (HUD hiện "Bấm: ...") */
  hover: string | null
  /** đang mở popup lịch treo tường */
  calendar: boolean
}>(() => ({
  spot: 'bench',
  goal: null,
  fly: null,
  hover: null,
  calendar: false,
}))
