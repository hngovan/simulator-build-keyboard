import { create } from 'zustand'

// Đoạn mở đầu cho người chơi lần đầu (không lưu trong save): chữ studio trên cảnh phòng → camera bay vào màn hình máy tính,
// màn hình báo tin nhắn mới → popup hỏi có cần hướng dẫn không. Camera do `scene/room/IntroCam` lái theo `phase`

/** credits = chữ studio (camera lia phòng), message = bay vào màn hình + tin nhắn mới, ask = popup hỏi hướng dẫn */
export type IntroPhase = 'credits' | 'message' | 'ask'

/** thời lượng từng đoạn (giây) */
export const INTRO = {
  /** lia phòng + chữ studio */
  credits: 5.2,
  /** bay tới màn hình */
  fly: 2.4,
  /** tới nơi bao lâu thì màn hình báo tin nhắn */
  ping: 0.5,
  /** báo tin nhắn xong bao lâu thì hiện popup hỏi */
  ask: 1.7,
}

export const useIntro = create<{
  phase: IntroPhase | null
  /** màn hình 3D đã hiện thông báo tin nhắn mới */
  ping: boolean
}>(() => ({ phase: null, ping: false }))

/** máy này đã xem đoạn mở đầu chưa (ghi theo máy, không theo bản lưu: thua / chơi mới không hiện lại) */
const SEEN_KEY = 'sbk-intro-seen'
export function introSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return true
  }
}
export function markIntroSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* không ghi được thì lần sau hiện lại */
  }
}
