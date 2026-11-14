// Câu ĐỌC rút gọn của Keeb-chan (`bun run gen:voice`): chữ trên màn hình giữ đủ chi tiết, giọng chỉ đọc ý chính cho nhanh
// (người dùng: đọc lê thê thì không ai chờ nghe hết). Tra theo đoạn đầu câu hiện trên màn hình (`startsWith`), dòng trên thắng dòng dưới;
// câu không có ở đây thì đọc nguyên văn. Sửa lời dẫn trên màn hình thì soát lại bảng này (script báo dòng không khớp câu nào).

/** [đoạn đầu câu trên màn hình, câu đọc] */
export const SHORT: [string, string][] = [
  // màn chào
  ['Chào! Mình là Keeb-chan', 'Chào! Mình là Keeb-chan, trợ lý của bạn!'],
  ['Lâu lắm rồi máy mới có tin nhắn', 'Anh QuýB nhắn nhờ build một con phím 60% kìa!'],
  ['Trước khi bắt tay vào việc', 'Xưởng của bạn tên là gì?'],
  ['Đơn đầu tiên là của anh QuýB, để mình chỉ', 'Tên hay đó! Để mình chỉ bạn từng bước nhé!'],
  ['Đơn đầu tiên là của anh QuýB, mở Mezzenger', 'Tên hay đó! Mở Mezzenger xem đơn đầu tiên nhé!'],
  // tour máy tính
  ['Khách đặt phím qua Mezzenger', 'Khách đặt phím qua Mezzenger. Bấm vào đây mở đơn nhé!'],
  ['Đơn đầu tiên đây!', 'Đơn đầu tiên đây! Bấm vào để đọc yêu cầu.'],
  [
    'Khách nhờ build 60% từ A tới Z',
    'Khách nhờ build trọn gói: shop mua linh kiện, giao xong khách trả lại tiền đồ và tiền công. Bấm Nhận đơn.',
  ],
  ['Một bàn phím cần 6 món', 'Bàn phím cần 6 món, mình chỉ từng món. Mở Shopii nào!'],
  ['Case = vỏ bàn phím', 'Case là vỏ bàn phím. Lấy Case 60%, màu nào cũng được. Thêm vào giỏ.'],
  ['PCB = mạch điện', 'PCB là mạch điện. Loại Hotswap cắm switch không cần hàn. Thêm vào giỏ.'],
  ['Plate = tấm đỡ', 'Plate là tấm giữ switch. Bấm ô chất liệu, chọn FR4.'],
  ['Stab giữ phím dài', 'Stab giữ phím dài không lệch. Giữ option Bộ TKL rồi thêm vào giỏ.'],
  [
    'Switch = công tắc',
    'Switch là công tắc dưới mỗi phím, khách cần Linear. Ở Gateron Vàng, bấm ô 10 con, chọn 70 con.',
  ],
  ['Keycap = nút bấm', 'Keycap là nút bấm. Chọn chất liệu PBT, màu Trắng như khách dặn.'],
  ['Đúng rồi, ', 'Đúng rồi! Thêm vào giỏ.'],
  ['Còn feet cao su', 'Còn feet cao su dán đáy case. Bấm mục Lube và vật tư.'],
  ['Thẻ "Feet cao su"', 'Feet màu nào cũng được. Thêm vào giỏ.'],
  [
    'Khách dặn stab phải êm, nên phải mod stab',
    'Khách dặn stab phải êm nên phải mod stab. Đầu tiên là băng Urgo. Thêm vào giỏ.',
  ],
  ['Krytox 205g2', 'Krytox hai không năm, mỡ cho housing và slider stab. Thêm vào giỏ.'],
  ['Krytox XHT-BDZ', 'Krytox XHT, mỡ đặc cho wire stab. Thêm vào giỏ.'],
  ['Còn 2 dụng cụ mod stab', 'Còn 2 dụng cụ mod stab. Bấm mục Dụng cụ.'],
  ['Kìm cắt chân stab', 'Kìm cắt chân stab. Thêm vào giỏ.'],
  ['Cọ lube', 'Cọ lube để phết mỡ. Thêm vào giỏ.'],
  ['Đủ món rồi!', 'Đủ món rồi! Mở Giỏ hàng thanh toán.'],
  [
    'Chọn tốc độ giao "Hoả tốc"',
    'Chọn Hoả tốc để hàng tới ngay hôm nay. Đơn hạn dài thì chọn loại rẻ hơn cho đỡ tiền.',
  ],
  ['Bấm "Đặt hàng"', 'Bấm Đặt hàng. Tiền linh kiện khách sẽ trả lại sau.'],
  [
    'Xong việc ở máy tính!',
    'Xong việc ở máy tính! Đứng dậy ra kệ cuối hành lang nhận kiện và thùng đơn, mang về bàn build.',
  ],
  // tour bàn build
  ['Thùng đơn đã lên bàn nhưng còn thiếu đồ', 'Thùng đơn còn thiếu đồ.'],
  [
    'Bấm nút quay lại góc trên trái để đứng dậy',
    'Đứng dậy ra kệ nhận kiện, hoặc vào máy tính mua nốt ở Shopii.',
  ],
  ['Đủ đồ rồi! Bấm chuột trái vào thùng', 'Đủ đồ rồi! Bấm vào thùng để bắt đầu build nào!'],
  ['Cứ làm theo mũi tên vàng', 'Cứ làm theo mũi tên vàng. Xong mỗi bước thì bấm Bước tiếp theo.'],
  ['Bước nào tuỳ chọn', 'Bước tuỳ chọn khách không yêu cầu thì bấm Bỏ qua.'],
  ['Khách không yêu cầu foam', 'Khách không yêu cầu foam, bấm Bỏ qua.'],
  ['Khách không yêu cầu lube', 'Khách không yêu cầu lube, bấm Bỏ qua.'],
  ['Xong rồi! Bấm "Cho phím vào thùng"', 'Xong rồi! Bấm Cho phím vào thùng để đóng gói.'],
  ['Đóng gói xong!', 'Đóng gói xong! Cầm thùng lên, mang ra kệ giao hàng bên tường phải.'],
  [
    'Gõ từng phím bằng bàn phím thật (hoặc click phím 3D trên bàn)',
    'Gõ từng phím để test. Test đủ hết mới đóng gói được.',
  ],
  ['Máy đo âm thanh', 'Máy đo âm thanh: số phần trăm là độ khớp với tiếng khách muốn.'],
  ['Thanh cam = độ ồn', 'Vạch trắng là âm khách muốn, càng sát vạch càng được chấm cao.'],
  [
    'Gõ từng phím bằng bàn phím thật (hoặc click phím 3D), phím',
    'Gõ từng phím để test, phím nào bàn phím bạn không có thì click.',
  ],
  ['Test hết phím rồi mới sang bước', 'Nhớ test hết phím, bỏ sót là khách có thể báo lỗi.'],
  ['Đây là yêu cầu của khách', 'Đây là yêu cầu của khách. Làm sai là bị chấm thấp đó.'],
  ['Các bước build theo thứ tự', 'Đây là các bước build. Bấm bước đã làm để quay lại sửa.'],
  [
    'Khung này luôn ghi việc cần làm',
    'Khung này ghi việc cần làm. Cứ theo mũi tên vàng, xong thì bấm Bước tiếp theo.',
  ],
  // thu tiền
  ['Khách đã nhận phím', 'Giờ thu tiền công nào. Mở Mezzenger, vào tin nhắn của khách.'],
  ['Bấm "Thu tiền"', 'Bấm Thu tiền. Mua rẻ hơn budget thì phần dư là lãi của shop!'],
  // lời dẫn khi đi lại
  [
    'Chào chủ xưởng mới!',
    'Chào chủ xưởng mới! Tới bàn máy tính, bấm vào màn hình để nhận đơn đầu tiên.',
  ],
  ['Đã gửi đơn đầu tiên', 'Đã gửi đơn đầu tiên! Vào máy tính, mở Mezzenger để thu tiền.'],
  ['Thu tiền xong rồi!', 'Thu tiền xong rồi! Hết việc thì bấm lịch treo tường để sang ngày mới.'],
  [
    'Đang cầm thùng đã đóng gói',
    'Mang thùng tới kệ giao hàng bên tường phải, bấm ô trống để gửi khách.',
  ],
  ['Phím đã đóng gói!', 'Phím đã đóng gói! Tới bàn build cầm thùng lên.'],
  ['Đang cầm thùng đơn', 'Mang thùng đơn về bàn build, bấm vào bàn để đặt xuống.'],
  ['Thùng đơn đã nằm trên bàn build', 'Bấm vào bàn để ngồi xuống, rồi bấm thùng để bắt đầu lắp.'],
  ['Linh kiện tới rồi!', 'Linh kiện tới rồi! Ra kệ sắt cuối hành lang, bấm kiện Shopii để nhận.'],
  ['Còn thiếu linh kiện cho đơn', 'Còn thiếu linh kiện. Vào máy tính mở Shopii mua nốt.'],
]

/** "Tiếp theo là X. Bấm mục "X" ở cột trái." → chỉ đọc câu đầu */
const NEXT_PART = /^(Tiếp theo là [^.]+\.) Bấm mục/

const used = new Set<string>()
/** câu đọc rút gọn của 1 câu trên màn hình (không có thì đọc nguyên văn) */
export function shortOf(text: string) {
  const next = NEXT_PART.exec(text)
  if (next) return next[1]
  const hit = SHORT.find(([head]) => text.startsWith(head))
  if (!hit) return text
  used.add(hit[0])
  return hit[1]
}
/** dòng trong `SHORT` không khớp câu nào (lời dẫn đã đổi chữ) */
export const unusedShort = () => SHORT.map(([head]) => head).filter((head) => !used.has(head))
