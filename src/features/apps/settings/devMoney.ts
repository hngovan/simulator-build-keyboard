import { create } from 'zustand'
import { useGame } from '@/store'

// Chỉ dùng khi dev: tiền vô hạn để thử Shopii / dụng cụ / sách phép cho nhanh
const RICH = 999_999_999

export const useDevMoney = create<{ on: boolean }>(() => ({ on: false }))

let unsub: (() => void) | null = null
/** tiền trước khi bật, tắt thì trả lại */
let before = 0

/** Bật: ví luôn được bơm lại về RICH mỗi khi tiêu; tắt: trả về số tiền cũ */
export function setDevMoney(on: boolean) {
  if (on === useDevMoney.getState().on) return
  useDevMoney.setState({ on })
  unsub?.()
  unsub = null
  if (!on) return useGame.setState({ money: before })
  before = useGame.getState().money
  const top = () => {
    if (useGame.getState().money < RICH) useGame.setState({ money: RICH })
  }
  top()
  unsub = useGame.subscribe(top)
}
