// Lịch sử cập nhật hiện ở màn hình tiêu đề (bấm số phiên bản). Mỗi lần commit tính năng mới:
// thêm 1 mục lên ĐẦU danh sách + nâng "version" trong package.json cho khớp (bản mới nhất = __APP_VERSION__).
// Nhiều mục có thể chung 1 phiên bản (các commit trước 0.1.1 đều thuộc 0.1.0)

export interface ChangelogEntry {
  version: string
  date: string
  /** mã commit (git log --oneline) */
  commits: string[]
  title: string
  items: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.1.1',
    date: '2026-10-25',
    commits: [],
    title: 'Lịch sử cập nhật, ảnh demo, dọn code',
    items: [
      'Bấm số phiên bản ở màn hình tiêu đề để xem lịch sử cập nhật theo từng tính năng',
      'README có ảnh chụp demo game',
      'Dọn hàm / mục không còn dùng trong source',
      'Hội Phím Cơ: qua ngày mới thì chợ đăng đợt hàng pass mới (bài hôm trước được thay hết)',
      'Sửa lỗi trả giá ở chợ có thể bớt về 0đ: người bán có giá sàn ~60% giá đăng',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-10-25',
    commits: ['3eea93d'],
    title: 'Sách phép, mũi tên hướng dẫn hàn, sắp lại bàn lube',
    items: [
      'Shopii thêm mục "Sách phép": phép mở / lube / lắp switch, lắp keycap, hàn, rã hàn (200 lần mỗi cuốn, mua thêm cộng dồn)',
      'Thợ lõ có phép thì mỗi lần 10 con; có chứng chỉ thợ middle / senior thì cộng thêm 10',
      'Phép hàn: 1 lần hàn 10 phím, hàn cháy thì cháy cả 10; phép rã hàn hút 10 phím cháy',
      'Bàn lube: dời hũ mỡ, lọ dầu, cọ; bày tới 10 đồ mở khi mở nhiều switch',
      'Bước hàn có mũi tên vàng chỉ phím cần hàn / phím cháy / bùi nhùi',
      'Thông báo xuống dòng thay dấu gạch; Mezzenger không tự cuộn khi xem ảnh đơn; thanh tiến độ hàn 1 màu',
      'Stab nhiều kiểu, case top mount, dọn model / script cũ',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-10-25',
    commits: ['8aca728', '632a11e', '1e14334'],
    title: 'Camera bàn build, HUD và các app',
    items: [
      'Cải thiện camera bàn build, bảng HUD và luồng làm việc giữa các app',
      'Dọn repo: bỏ thư mục release và repo con mechlovin-pcb',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-10-25',
    commits: ['ac30ee8', '0b9c520'],
    title: 'Thêm layout và dụng cụ',
    items: [
      'Layout mới: 65%, 75%, FRL, Planck, Alice (phím xoay, viền board theo đa giác)',
      'Dụng cụ mới: bút hút thiếc, giá đỡ cuộn thiếc, bùi nhùi lau mũi hàn, chứng chỉ thợ',
      'Theo dõi chất lượng mối hàn và số switch đã mở; đơn hàng ghi thêm yêu cầu của khách',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-10-23',
    commits: ['8c7bcc2'],
    title: 'Desktop và cài đặt âm thanh',
    items: ['Cải thiện luồng làm việc trên desktop giả lập và phần cài đặt âm thanh'],
  },
]
