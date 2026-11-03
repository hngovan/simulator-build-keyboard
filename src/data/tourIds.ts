// Mã các tour hướng dẫn Keeb-chan (ghi vào `Profile.guideSeen` khi xem xong / bỏ qua). Người chơi chọn "Đã từng chơi" lúc
// tạo game thì ghi sẵn cả `ALL_TOURS` (không hiện hướng dẫn nào)

/** tour lần đầu ngồi máy tính: nhận đơn → mua đủ linh kiện ở Shopii → đặt hàng (`features/guide/Tour.tsx`) */
export const TOUR_ID = 'tour:pc'
/** tour bàn build đơn hướng dẫn (`BenchTour`) */
export const BENCH_TOUR_ID = 'tour:bench'
/** lần đầu tới bước vặn vít cần chọn đầu vít (mọi đơn, 1 lần) */
export const BIT_TOUR_ID = 'tour:bit'
/** lần đầu tới bước test phím: máy đo âm thanh + cách test (mọi đơn, 1 lần) */
export const TEST_TOUR_ID = 'tour:test'
/** đơn đầu sau đóng gói: cầm thùng → kệ giao hàng → thu tiền → lịch kết thúc ngày */
export const SHIP_TOUR_ID = 'tour:ship'

export const ALL_TOURS = [TOUR_ID, BENCH_TOUR_ID, BIT_TOUR_ID, TEST_TOUR_ID, SHIP_TOUR_ID]
