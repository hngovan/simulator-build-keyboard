# Đơn hàng

## 2026-10-24

### Sinh đơn (`src/data/orders.ts`, `randomOffers`)

- 5–7 đơn mỗi ngày, luôn có ít nhất 1 đơn TKL và 1 đơn 60%.
- `switchKind` dùng kiểu `SwitchKind` có sẵn ('Linear' | 'Tactile' | 'Clicky' | 'Silent'), `SWITCH_KINDS`, `switchKindOf`.
  Kiểm tra kho bắt đúng loại switch; hiện ở OrderSpec.
- Kit: khách gửi ngẫu nhiên từng món (`Kit.case? / pcb? / plate?`, stab nullable), ít nhất 1 món.
  Đơn thiết kế mở (featured) luôn gửi đủ case + PCB + plate.
  - Chỉ có `mount` khi khách gửi case; scoring chỉ chấm mount khi `order.mount` có.
  - Món không gửi thì đơn có thể ghi `pcbType` / `caseColor`.
  - Stab plate-mount trong kit thì plate khách gửi phải cứng (không PC / POM / PP).
- Stab plate-mount: `PlateDef.flex` và `plateStabClash` báo lỗi plate mềm.

### Nhiều đơn mỗi ngày

- `packed: PackedOrder[]` (Session trong persistence, `SAVED_KEYS`, `snapshot()`).
- `deliver()` chấm điểm, đẩy vào `packed`, trả bàn trống.
- `nextDay()` cộng tiền / uy tín / `done` cho mọi đơn đã đóng gói; đơn đang làm dở giữ sang ngày sau.
- Mezzenger: mục "📦 Đã đóng gói hôm nay" (Xem điểm) + nút "🌙 Kết thúc ngày — gửi n đơn". `ResultCard` có `onNext` tuỳ chọn.

### Bàn build / đổi đơn

- "Đổi đơn" khi đang build: `OrderPicker` (EmptyBenchHud.tsx) dùng chung với bàn trống; `benchShort` ở meta store.
- Giao khi chưa xong thì hỏi lại (`ConfirmDeliver` trong BenchHud).
- Urgo (băng dán stab): đơn vị "cái", 1 cái = 2 stab (`Math.ceil(n/2)`), gói 10 cái 25k và 50 cái 90k.
  SAVE_REV 3 chia đôi số cũ.

## 2026-10-24 (tối)

### Gửi từng đơn

- `shipOrder(id)` (shopSlice): gửi ngay 1 đơn đã đóng gói → cộng tiền (hoàn linh kiện + công), uy tín, `done`;
  đánh dấu `PackedOrder.shipped` (giữ trong `packed` tới hết ngày để hiện tin nhắn khách phản hồi).
- `nextDay()` chỉ gửi nốt đơn chưa gửi (`unsent`), rồi xoá `packed`.
- Toast sau `deliver()`: "vào Mezzenger gửi cho khách".

### Mezzenger kiểu app chat

- Bỏ mục "Đơn đã nhận" (đã có ở app Chi tiết đơn — thêm thanh `JobTabs` "Đơn đã nhận" đầu app để chuyển đơn).
- Cột trái: hội thoại (đơn chờ gửi → đơn mới → đơn đã gửi), badge trạng thái Đơn mới / Chờ gửi / Đã gửi.
  Nút "Kết thúc ngày" luôn ở đáy cột (ghi số đơn chưa gửi).
- Cột phải: bong bóng chat (ảnh bàn phím là tin đầu của khách), câu trả lời nhanh (`Reply`):
  - Đơn mới: "Cho shop xem chi tiết yêu cầu" (khách gửi lại bảng OrderSpec trong chat), "Nhận đơn", "Xin lỗi, shop không nhận được".
  - Đơn đã đóng gói: "Gửi hàng cho khách" (`shipOrder`), "Xem điểm chấm" (ResultCard).
- Trạng thái hỏi chi tiết / xem điểm không lưu (chỉ trong phiên). Cửa sổ Mezzenger rộng 880.
- "✔ Nhận đơn" đổi thành "Nhận đơn".

### Danh sách đơn (thay "Đổi đơn")

- Nút icon "Danh sách đơn" trên thanh menu bàn build mở `OrderPicker` (tiêu đề "📋 Danh sách đơn").
- Mỗi đơn: % tiến độ (`buildPercent` trong steps.ts: bước đã qua tính đủ, còn lại theo `stepProgress`) + thanh tiến độ,
  "Xem chi tiết đơn" (OrderSpec), nút "Tiếp tục làm" (đơn đang làm) / "Đổi sang làm tiếp" / "Đổi sang build" / "Nhận & build".

### Kit

- PCB khách gửi: 60% là mạch Mechlovin bán ở Shopii nếu layout có (`kitPcb`, `PcbItem.model`), còn lại PCB tiêu chuẩn.
  Tên hiển thị qua `pcbLabel` (parts.ts). Plate khách gửi vẫn random trong cả 8 chất liệu `PLATES`.
