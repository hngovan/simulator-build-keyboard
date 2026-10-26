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
    version: '0.1.4',
    date: '2026-10-26',
    commits: [],
    title: 'O-ring sau lắp switch, tua vít tay, bảng xếp hạng trên Vercel',
    items: [
      'O-ring mount: gắn vòng silicon sau khi lắp switch (PCB hàn thì sau khi hàn), lúc switch đã giữ chặt plate; bản lưu cũ tự dời bước',
      'Hiệu ứng tua vít thường: vặn chậm theo cổ tay, xoay đúng bằng góc con ốc, nhấn xuống khi vặn (không còn giật như tua vít điện)',
      'Bảng xếp hạng chạy được khi deploy Vercel (Vercel Function + Upstash Redis), chạy local vẫn dùng bun run server',
      'README: bảng lịch sử cập nhật mọi phiên bản, ảnh demo top mount / O-ring / hàn switch / dán feet / switch mới, hướng dẫn deploy Vercel',
    ],
  },
  {
    version: '0.1.3',
    date: '2026-10-26',
    commits: ['e14e8a0'],
    title: 'Thua game, feet cao su, case theo cụm phím, giao diện điện thoại',
    items: [
      'Thua game khi uy tín từ −10 trở xuống hoặc hết tiền nhận đơn; nút tuyên bố phá sản ở Cài đặt',
      'Bảng xếp hạng server (bun run server): ghi kết quả khi thua / phá sản / chơi mới, xếp theo tiền; ví hiện gọn k → m → B',
      'Bước mới "Dán feet cao su": case lật úp, dán 4 feet đen / trắng vào hốc CNC dưới đáy; Shopii bán vỉ 4 feet',
      'Khối chặn theo cụm phím như case thật (TKL / full / FRL / 75 / 65), khung mỏng ở mặt trên, cao đều, bên dưới rỗng',
      'Case mica: tấm trên cùng cắt liền 1 tấm theo từng cụm phím; case dựng bằng code thành 1 khối liền, mica cắt phẳng xếp lớp',
      'Case 2 mảnh có lỗ vít (nhôm / PC / acrylic ở đáy, mica xuyên các tấm); case 1 mảnh chơi được tray / O-ring / OG; thêm Case TKL nhôm 1 mảnh',
      'Shopii gộp case cùng dòng thành 1 sản phẩm, chọn chất liệu rồi màu; nhãn cỡ case trên ảnh',
      'Đơn có thể đòi đúng 1 con switch; switch hợp tiếng khách muốn (clack / thock không ra switch silent)',
      'Thêm nhiều switch (Otemu Silent V1 / V2, Cherry Tím / Cam, Gateron Type R / Milky / Silent Tactile, HMX Snowfall / Waverider / Su Color / Xinhai / KD200 / V2U, Wingtree, Ruben Bumblebee...), housing trong có kim tuyến',
      'Thêm màu case tím / coffee sữa / nâu đậm, đỏ + navy cho mọi case đục',
      'Tối ưu giao diện điện thoại: taskbar, hộp thoại, HUD bàn build, camera tự lùi theo màn dọc',
      'Nhãn profile / chất liệu trên ảnh keycap ở Hội Phím Cơ hết đè nhau: tên chất liệu ngắn (PBT / ABS / MIX), khung hẹp thì xếp 2 dòng',
      'Shopii: ô số lượng (− / + hoặc gõ số) cho switch, stab, vật tư, sách phép; giá nhân theo số lượng',
    ],
  },
  {
    version: '0.1.2',
    date: '2026-10-25',
    commits: [],
    title: 'Bảng xếp hạng, kho chung, nhạc nền 3 bài',
    items: [
      'Nhạc nền xoay ngẫu nhiên 3 bài (thêm 2 bài lofi CC0), không lặp bài vừa nghe',
      'App Bảng xếp hạng: so shop của mình với 9 shop đối thủ theo uy tín / đơn / tiền / sao',
      'Giao hàng khách trả đủ budget linh kiện: mua rẻ hơn thì phần dư vào túi',
      'Kho chung cho mọi linh kiện: đồ mua dư / bị thay / thừa sau khi giao không mất, nhận hoặc chuyển đơn tự lấy món hợp yêu cầu',
      'Kho hiện cả đồ của các đơn đang chờ, đổi đơn không còn bị "mất" đồ đã mua',
      'Case 40% dùng được cho layout Planck (ortho 40%)',
      'Sửa plate 60% bị lật gương (backspace 2u ra 2 lỗ 1u), thêm lỗ switch spacebar',
      'Hội Phím Cơ: tự nhập giá trả trong popup (3 lần / người bán)',
      'Hội Phím Cơ: "Đi ăn xin" năn nỉ xin free, 10% bị ban khỏi chợ 3 ngày',
      'Thông báo góc phải trên ghim sát góc, nằm trên cả popup',
      'Shopii: mỗi loại stab bán bộ TKL (4× 2u + 1× 6.25u + 1× 7u), lẻ 2u / 6.25u / 7u, có badge số stab nhận được',
      'Stab thừa tính theo từng cỡ dây: dùng spacebar 6.25u thì dây 7u vẫn còn trong kho',
      'Shopii: chọn option bằng ô đổ xuống, lọc stab theo kiểu gắn, badge số stab nằm trên ảnh',
      'Ảnh stab lẻ 6.25u / 7u hiện đúng dây dài',
      'Shopii: mục nào cũng có bộ lọc (ô đổ xuống), thanh lọc + chú thích âm thanh ghim trên cùng khi cuộn',
      'Switch Silent Tactile có loại riêng, hợp cả đơn đòi Tactile / Silent',
      'Keycap: bỏ bộ Cherry trùng, mỗi profile có 3 chất liệu PBT (rẻ nhất) / Mix PBT + ABS / ABS; đơn hàng có thể đòi chất liệu',
      'Shopii: "Chỉ hiện đồ hợp đơn" lọc cả profile + chất liệu + màu keycap và loại switch',
      'App Đánh giá: số đánh giá + uy tín thành badge',
      'Đơn hàng có thể đòi đích danh case / stab / chất liệu plate (như switch), Shopii lọc hợp đơn theo đó',
      'Sách phép bán gói 100 / 200 / 500 lần',
      'Feet cao su dán đúng vào hốc dưới đáy case CAD (trước bị lệch cạnh hốc)',
      'Case Planck (40%) xoay lại đúng chiều: lỗ cổng USB-C ở mặt sau bên trái',
      'Khoá camera khi đang giữ chuột hàn / hút thiếc, không còn xoay theo chuột',
      'Mỡ wire stab dây dài (6.25u / 7u) chỉ phết ở móc và góc uốn như dây 2u',
      'Shopii: mục không có sản phẩm hiện icon hết hàng ở giữa',
      'Sửa chữ trên keycap SA bị mặt keycap che mất nửa: chữ in nghiêng theo mặt keycap',
    ],
  },
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
