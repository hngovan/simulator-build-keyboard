import { create } from 'zustand'

// Đoạn mở đầu mỗi lần chơi mới (không lưu trong save, bấm phím bất kỳ để bỏ qua): chữ studio trên cảnh phòng → camera bay vào màn hình máy tính,
// màn hình báo tin nhắn mới → camera lùi về chỗ hiện chữ studio → popup hỏi có cần hướng dẫn không. Camera do `scene/room/IntroCam` lái theo `phase`

/** credits = chữ studio (camera lia phòng), message = bay vào màn hình + tin nhắn mới + lùi về, ask = popup hỏi hướng dẫn */
export type IntroPhase = 'credits' | 'message' | 'ask'

/** thời lượng từng đoạn (giây) */
export const INTRO = {
  /** lia phòng + chữ studio */
  credits: 5.2,
  /** bay tới màn hình */
  fly: 2.4,
  /** tới nơi bao lâu thì màn hình báo tin nhắn */
  ping: 0.5,
  /** báo tin nhắn xong bao lâu thì camera lùi về chỗ hiện chữ studio */
  ask: 1.7,
  /** lùi từ màn hình về chỗ hiện chữ studio, tới nơi thì hiện popup hỏi */
  back: 2,
}

/** tập đi lại sau khi chọn ✓: look = nhìn quanh, move = đi, free = tự đi tới máy tính (dấu ? + bong bóng "Tương tác") */
export type Learn = 'look' | 'move' | 'free'

/** dấu ? trong phòng lúc tập đi lại: bấm vào thì hiện 1 câu phụ đề rồi mất */
export type TipId = 'bench' | 'calendar' | 'door'
/** mọi dấu ? lúc bắt đầu tập đi lại */
export const ALL_TIPS: TipId[] = ['bench', 'calendar', 'door']
export const TIPS: Record<TipId, string> = {
  bench: 'Cái bàn mình ngồi vọc phím suốt mấy năm nay. Thất nghiệp rồi, càng lắm thời gian...',
  calendar: 'Lại một ngày thất nghiệp... Hết việc trong ngày thì bấm vào lịch để sang ngày mới.',
  door: 'Kệ để hàng. Đồ người ta gửi tới với hàng mua về đều nằm ở đây.',
}
/** câu phụ đề lúc bấm màn hình máy tính lần đầu (lúc tập đi lại): chỉ hiện chữ, bấm lần nữa mới vào máy */
export const PC_LINE = 'Tin nhắn từ anh QuýB? Lâu lắm rồi không liên lạc...'

export const useIntro = create<{
  phase: IntroPhase | null
  /** màn hình 3D đã hiện thông báo tin nhắn mới */
  ping: boolean
  learn: Learn | null
  /** tiến độ vòng tròn bước look / move (0..1) */
  progress: number
  /** dấu ? chưa bấm */
  tips: TipId[]
  /** phụ đề chữ to đáy màn */
  caption: string | null
  /** đang đứng gần màn hình máy tính lúc tập đi lại: hiện bong bóng "Tương tác", ẩn khung lời dẫn (khỏi đè nhau) */
  nearPc: boolean
  /** lúc tập đi lại đã bấm màn hình máy tính 1 lần (đã hiện phụ đề "có tin nhắn mới"): lần bấm sau mới vào máy */
  pcRead: boolean
}>(() => ({
  phase: null,
  ping: false,
  learn: null,
  progress: 0,
  tips: [],
  caption: null,
  nearPc: false,
  pcRead: false,
}))

/** trạng thái lúc chưa / hết đoạn mở đầu (chơi mới thì đặt lại) */
export const INTRO_OFF = {
  phase: null,
  ping: false,
  learn: null,
  progress: 0,
  tips: [],
  nearPc: false,
  pcRead: false,
}

/** nhìn quanh đủ bấy nhiêu rad / đi đủ bấy nhiêu mét thì xong bước */
const NEED = { look: 3.2, move: 3 }

/** cộng tiến độ bước đang tập (WalkControls gọi mỗi lần rê chuột nhìn / mỗi khung hình đang đi); đầy vòng thì nghỉ 0,5s rồi sang bước sau */
export function learnAdd(kind: 'look' | 'move', amount: number) {
  const s = useIntro.getState()
  if (s.learn !== kind || s.progress >= 1) return
  const progress = Math.min(1, s.progress + amount / NEED[kind])
  useIntro.setState({ progress })
  if (progress < 1) return
  window.setTimeout(() => {
    if (useIntro.getState().learn !== kind) return
    useIntro.setState({ learn: kind === 'look' ? 'move' : 'free', progress: 0 })
  }, 500)
}

/** phụ đề chạy chữ: mỗi ký tự bấy nhiêu mili giây */
export const TYPE_MS = 32

let captionTimer = 0
/** hiện phụ đề (chạy chữ dần), chạy hết chữ thì giữ thêm `ms` mili giây */
export function say(text: string, ms = 2400) {
  window.clearTimeout(captionTimer)
  useIntro.setState({ caption: text })
  captionTimer = window.setTimeout(
    () => useIntro.setState({ caption: null }),
    text.length * TYPE_MS + ms,
  )
}

/**
 * Bấm màn hình máy tính lúc tập đi lại: lần đầu chỉ hiện phụ đề "có tin nhắn mới" (trả về true = đã xử lý, chưa vào máy),
 * lần sau mới vào máy. Ngoài lúc tập đi lại luôn trả về false
 */
export function pcFirstClick() {
  const s = useIntro.getState()
  if (!s.learn || s.pcRead) return false
  useIntro.setState({ pcRead: true })
  say(PC_LINE)
  return true
}

/**
 * Xem 1 dấu ? lúc tập đi lại (bấm dấu ? hoặc bấm thẳng vào vật đó lần đầu, vd tờ lịch): hiện phụ đề rồi bỏ dấu ?.
 * Trả về true = vừa hiện phụ đề (chưa làm việc thật của vật), false = hết dấu ? / không tập đi lại
 */
export function tipFirstClick(id: TipId) {
  const s = useIntro.getState()
  if (!s.learn || !s.tips.includes(id)) return false
  useIntro.setState({ tips: s.tips.filter((t) => t !== id) })
  say(TIPS[id])
  return true
}
