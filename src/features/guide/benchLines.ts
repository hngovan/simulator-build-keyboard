import type { StepId } from '@/types'

// Câu dẫn của Keeb-chan trong tour bàn build đơn hướng dẫn (`BenchTour`). Lời dẫn "lần đầu gặp mỗi bước" kiểu cũ đã bỏ:
// Keeb-chan chỉ nằm trong tour

export const TUT_MISSING = [
  'Thùng đơn đã lên bàn nhưng còn thiếu đồ (khung liệt kê món thiếu ở giữa bàn).',
  'Bấm nút quay lại góc trên trái để đứng dậy: kiện đã tới thì ra kệ cuối hành lang nhận, chưa mua thì vào máy tính mua ở Shopii.',
]
export const TUT_READY = ['Đủ đồ rồi! Bấm chuột trái vào thùng để mở thùng, bắt đầu build nào ⌨️']
export const TUT_INTRO = [
  'Cứ làm theo mũi tên vàng trong cảnh. Xong mỗi bước, nút "Bước tiếp theo" ở giữa dưới màn hình sẽ sáng nhấp nháy: bấm để sang bước kế.',
  'Bước nào tuỳ chọn mà khách không yêu cầu thì nút "Bỏ qua" sáng lên, bấm là được.',
]
export const TUT_LINES: Partial<Record<StepId, string[]>> = {
  foam: ['Khách không yêu cầu foam, bấm "Bỏ qua" đang sáng ở dưới.'],
  switchLube: [
    'Khách không yêu cầu lube, và lube cần đồ mở switch + mỡ (mở ở cấp xưởng 2). Bấm "Bỏ qua" đang sáng ở dưới.',
  ],
  pack: [
    'Xong rồi! Bấm "Cho phím vào thùng" để đóng gói, rồi đứng dậy cầm thùng đặt lên kệ giao hàng trong phòng là gửi khách.',
  ],
}
/** đơn hướng dẫn vừa đóng gói, thùng còn trên bàn */
export const TUT_PACKED =
  'Đóng gói xong! Nhấn chuột trái vào thùng để cầm lên, rồi đứng dậy (nút quay lại góc trên trái) mang ra kệ giao hàng sát tường phải trong phòng.'
/** đang test phím ở đơn hướng dẫn */
export const TUT_TEST =
  'Gõ từng phím bằng bàn phím thật (hoặc click phím 3D trên bàn) để test. Phím test rồi có chấm xanh; test đủ hết phím mới sang bước đóng gói được.'

/** giới thiệu bước test (bấm "Tiếp" / "Hiểu rồi") */
export const TEST_STEPS = [
  {
    target: 'hud-sound',
    lines: [
      'Máy đo âm thanh: số % là độ khớp với tiếng khách muốn (vd thock trầm, clack giòn).',
      'Thanh cam = độ ồn (êm → ồn), thanh xanh = cao độ (trầm → giòn), vạch trắng là âm khách muốn. Âm do switch, plate, case, foam, lube quyết định: càng sát vạch trắng càng được chấm cao.',
    ],
  },
  {
    target: 'bench-objective',
    lines: [
      'Gõ từng phím bằng bàn phím thật (hoặc click phím 3D), phím test rồi có chấm xanh. Phím không có trên bàn phím của bạn (Fn, macro...) thì click.',
      'Test hết phím rồi mới sang bước: bỏ sót là khách có thể báo lỗi nút; phím bấm không ăn thì quay lại bước lắp / hàn sửa.',
    ],
  },
]

/** giới thiệu HUD lúc mới vào build (bấm "Tiếp") */
export const INTRO_STEPS = [
  {
    target: 'hud-order',
    text: 'Đây là yêu cầu của khách: layout, switch, keycap, kiểu lắp... Làm sai là bị chấm thấp đó.',
  },
  {
    target: 'hud-steps',
    text: 'Các bước build theo thứ tự. Bước đã làm thì bấm vào để quay lại sửa (lỡ tay thì Ctrl + Z).',
  },
  {
    target: 'bench-objective',
    text: `Khung này luôn ghi việc cần làm ngay bây giờ. ${TUT_INTRO[0]}`,
  },
]

/** tour thu tiền đơn hướng dẫn (`PayTour`): chưa mở Mezzenger / đã thấy nút "Thu tiền" */
export const PAY_LINES = {
  open: 'Khách đã nhận phím, giờ thu tiền công nào. Mở Mezzenger, vào tin nhắn của khách.',
  collect:
    'Bấm "Thu tiền" để nhận tiền công + tiền linh kiện khách trả (budget). Mua rẻ hơn budget thì phần dư là lãi của shop!',
}

/** mọi câu tĩnh của Keeb-chan ở bàn build + thu tiền (`bun run gen:voice`) */
export const BENCH_LINES = [
  ...TUT_MISSING,
  ...TUT_READY,
  ...TUT_INTRO,
  ...Object.values(TUT_LINES).flat(),
  TUT_PACKED,
  TUT_TEST,
  ...TEST_STEPS.flatMap((s) => s.lines),
  ...INTRO_STEPS.map((s) => s.text),
  ...Object.values(PAY_LINES),
]
