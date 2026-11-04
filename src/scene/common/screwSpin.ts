import { useEffect } from 'react'
import { create } from 'zustand'
import { useSkill } from './skill'

/**
 * Đang vặn vít (tua vít còn quay sau cú bấm tháo / siết): khoá đổi tua vít / đầu vít, đổi giữa chừng thì tua vít cũ
 * kẹt lại trên vít (hình ảnh không gỡ được)
 */
export const useScrewSpin = create<{ on: boolean }>(() => ({ on: false }))

let until = 0
let timer: ReturnType<typeof setTimeout> | undefined

/** tua vít bắt đầu quay `ms` (nhiều vít nối nhau thì lấy mốc xa nhất) */
export function markScrewSpin(ms: number) {
  until = Math.max(until, performance.now() + ms)
  useScrewSpin.setState({ on: true })
  clearTimeout(timer)
  timer = setTimeout(() => useScrewSpin.setState({ on: false }), until - performance.now())
}

/** đang vặn: đang giữ chuột chạy thanh lực (skill check; bảng đầu vít chỉ hiện ở bước vít) hoặc tua vít còn quay */
export function useScrewBusy() {
  const spin = useScrewSpin((s) => s.on)
  const skill = useSkill((s) => !!s.active)
  return spin || skill
}
export const screwBusy = () => useScrewSpin.getState().on || !!useSkill.getState().active

/**
 * Số tua vít đang cầm trên vít (hiện ở chỗ vặn: rê chuột / đang vặn / còn quay): > 0 thì tua vít nằm trên bàn
 * (`DeskTools` trong Room.tsx) ẩn đi, chỉ có 1 cây tua vít; xong thì về lại bàn
 */
export const useDriverInHand = create<{ n: number }>(() => ({ n: 0 }))

/** gắn vào tua vít đang hiện trên vít: mount = cầm lên, unmount = đặt lại bàn */
export function useHoldDriver(on: boolean) {
  useEffect(() => {
    if (!on) return
    useDriverInHand.setState((s) => ({ n: s.n + 1 }))
    return () => useDriverInHand.setState((s) => ({ n: Math.max(0, s.n - 1) }))
  }, [on])
}
