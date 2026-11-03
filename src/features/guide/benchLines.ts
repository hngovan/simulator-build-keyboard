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
