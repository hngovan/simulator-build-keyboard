import { isSaleDay } from './sale'
import type { Order, Parcel } from '@/types'

// Lịch xưởng (lịch treo tường + popup lịch): 4 tuần quanh hôm nay, việc từng ngày

/** ngày đầu của lưới 4 tuần: tuần trước + tuần này + 2 tuần tới (tuần 7 ngày tính từ ngày 1) */
export const calendarStart = (day: number) => Math.max(1, Math.floor((day - 1) / 7) * 7 + 1 - 7)

export interface CalendarDay {
  day: number
  sale: boolean
  /** đơn tới hạn giao ngày này */
  due: Order[]
  /** kiện Shopii tới cửa ngày này */
  parcels: Parcel[]
}

/** 28 ngày của lưới lịch kèm việc từng ngày */
export function calendarDays(day: number, orders: Order[], parcels: Parcel[]): CalendarDay[] {
  const start = calendarStart(day)
  return Array.from({ length: 28 }, (_, i) => {
    const d = start + i
    return {
      day: d,
      sale: isSaleDay(d),
      due: orders.filter((o) => !o.cancel && o.dueDay === d),
      parcels: parcels.filter((p) => p.arrive === d),
    }
  })
}
