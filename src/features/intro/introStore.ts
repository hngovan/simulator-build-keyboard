import { create } from 'zustand'

// Đoạn mở đầu mỗi lần chơi mới (không lưu trong save, bấm phím bất kỳ để bỏ qua), dựng kiểu phim cắt cảnh: màn đen "NGÀY 1" → hành lang →
// góc kệ chưng bàn phím → chữ studio trên cảnh phòng → màn hình máy tính báo tin nhắn mới → về chỗ hiện chữ studio, popup hỏi có cần
// hướng dẫn không. Camera do `scene/room/IntroCam` lái theo `phase`

/**
 * day = màn đen chữ "NGÀY 1", hall = cảnh hành lang, shelf = góc kệ chưng bàn phím, credits = chữ studio (camera lia phòng),
 * message = cắt cảnh sang màn hình máy tính + tin nhắn mới, ask = cắt cảnh về + popup hỏi hướng dẫn
 */
export type IntroPhase = 'day' | 'hall' | 'shelf' | 'credits' | 'message' | 'ask'

/** thời lượng từng đoạn (giây) */
export const INTRO = {
  /** màn đen chữ "NGÀY 1" */
  day: 3,
  /** cảnh hành lang (camera trôi chậm) */
  hall: 3.2,
  /** cảnh góc kệ chưng bàn phím */
  shelf: 3.2,
  /** lia phòng + chữ studio */
  credits: 5.2,
  /** cắt cảnh sang màn hình máy tính bao lâu thì màn hình báo tin nhắn */
  ping: 0.8,
  /** báo tin nhắn xong bao lâu thì cắt cảnh về chỗ hiện chữ studio + hiện popup hỏi */
  ask: 2,
}

/** tập đi lại sau khi chọn ✓: look = nhìn quanh, move = đi, free = tự đi tới máy tính (dấu ? + bong bóng "Tương tác") */
export type Learn = 'look' | 'move' | 'free'

/** dấu ? trong phòng lúc tập đi lại: bấm vào thì hiện 1 câu phụ đề rồi mất */
export type TipId = 'bench' | 'calendar' | 'door' | 'ship' | 'qmk'
/** mọi dấu ? lúc bắt đầu tập đi lại */
export const ALL_TIPS: TipId[] = ['bench', 'calendar', 'door', 'ship', 'qmk']
/** câu phụ đề từng dấu ? (dấu ? tranh QMK kể cả chuỗi `QMK_STORY`) */
export const TIPS: Record<Exclude<TipId, 'qmk'>, string> = {
  bench:
    'Cái bàn theo mình từ hồi còn làm thợ ở QMK. Sau vụ bê bối, lâu lắm rồi chưa có con phím nào nằm trên này...',
  calendar: 'Lại một ngày không có đơn... Hết việc trong ngày thì bấm vào lịch để sang ngày mới.',
  door: 'Kệ để hàng. Đồ người ta gửi tới với hàng mua về đều nằm ở đây.',
  ship: 'Kệ này còn trống. Phím build xong đóng thùng rồi đặt lên đây là gửi đi cho khách.',
}
/** câu phụ đề lúc bấm màn hình máy tính lần đầu (lúc tập đi lại): chỉ hiện chữ, bấm lần nữa mới vào máy */
export const PC_LINE = [
  'Có tin nhắn mới...',
  'Của ai đây?',
  'QuýB...',
  'Hình như là khách hàng cũ của mình hồi còn làm ở shop QMK...',
]
/**
 * Cốt truyện (bấm tranh graffiti QMK trên tường, `tell`): người chơi từng là thợ build phím của shop QMK, shop dính bê bối nên mang tiếng lây,
 * mất hết khách; còn 7.500k (`money` đầu game), khách cũ anh QuýB nhắn nhờ build 1 con 60% → làm lại từ đầu, mơ mở cửa hàng riêng
 */
export const QMK_STORY = [
  'QMK...',
  'Hồi đó mình là thợ build phím của shop này.',
  'Ngày nào cũng kín đơn, khách quen nhiều vô kể.',
  'Rồi shop dính bê bối.',
  'Mình chẳng làm gì sai... mà vẫn mang tiếng lây.',
  'Khách cứ thế bỏ đi hết.',
  'Giờ trong ví chỉ còn đúng 7.500k.',
  'Nhưng tay nghề thì vẫn còn nguyên.',
  'Làm lại từ đầu thôi. Gây dựng lại danh tiếng...',
  '...rồi sẽ có ngày mở cửa hàng của riêng mình.',
]

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
let storyTimer = 0
/** chuỗi `tell` còn đoạn chưa kể (kể cả lúc nghỉ giữa 2 đoạn, phụ đề đang ẩn) */
let storyLeft = false
/** đang có phụ đề / đang kể dở chuỗi: lúc này không bấm được dấu ? khác */
const talking = () => useIntro.getState().caption !== null || storyLeft
/** hiện phụ đề (chạy chữ dần), chạy hết chữ thì giữ thêm `ms` mili giây; đang kể dở chuỗi `tell` thì bỏ chuỗi đó */
export function say(text: string, ms = 2400) {
  window.clearTimeout(captionTimer)
  window.clearTimeout(storyTimer)
  storyLeft = false
  useIntro.setState({ caption: text })
  captionTimer = window.setTimeout(
    () => useIntro.setState({ caption: null }),
    text.length * TYPE_MS + ms,
  )
}

/** kể lần lượt nhiều câu phụ đề (chạy hết chữ, giữ 1,4s, ẩn, nghỉ 0,5s rồi sang câu sau); gọi lại = kể lại từ đầu */
export function tell(lines: string[], i = 0) {
  if (i >= lines.length) return
  // kiểu phụ đề MiSide: đoạn ngắn chạy chữ, giữ 1,4s rồi ẩn hẳn, nghỉ 0,5s mới hiện đoạn sau
  const hold = 1400
  say(lines[i], hold)
  storyLeft = i < lines.length - 1
  storyTimer = window.setTimeout(() => tell(lines, i + 1), lines[i].length * TYPE_MS + hold + 500)
}

/**
 * Bấm màn hình máy tính lúc tập đi lại: lần đầu chỉ hiện phụ đề "có tin nhắn mới" (trả về true = đã xử lý, chưa vào máy),
 * lần sau mới vào máy. Ngoài lúc tập đi lại luôn trả về false
 */
export function pcFirstClick() {
  const s = useIntro.getState()
  if (!s.learn || s.pcRead) return false
  useIntro.setState({ pcRead: true })
  tell(PC_LINE)
  return true
}

/**
 * Xem 1 dấu ? lúc tập đi lại (bấm dấu ? hoặc bấm thẳng vào vật đó lần đầu, vd tờ lịch): hiện phụ đề rồi bỏ dấu ?.
 * Trả về true = vừa hiện phụ đề (chưa làm việc thật của vật), false = hết dấu ? / không tập đi lại
 */
export function tipFirstClick(id: TipId) {
  const s = useIntro.getState()
  if (!s.learn || !s.tips.includes(id)) return false
  // phụ đề của dấu ? trước còn chạy: coi như đã xử lý (không làm việc thật của vật), dấu ? này giữ nguyên
  if (talking()) return true
  useIntro.setState({ tips: s.tips.filter((t) => t !== id) })
  if (id === 'qmk') tell(QMK_STORY)
  else say(TIPS[id])
  return true
}
