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

### Hội thoại giữ lại + đánh giá khách (2026-10-25)

- Hội thoại **không mất** khi nhận / từ chối: thứ tự chờ gửi → đơn mới → đã nhận (`order` = "Đang làm", `jobs` = "Đã nhận",
  nút "Ra bàn build") → từ chối (`rejected` trong Session, mờ, mất khi sang ngày). Chỉ mất khi **gửi hàng** cho khách.
- Mỗi nút trả lời = 1 tin shop gửi (`MSG`): bấm thì hiện bong bóng "…" (`Typing`) `REPLY_DELAY` 800ms rồi mới đổi trạng thái đơn
  (hội thoại vẫn giữ mở, `onReply` → `setPick`); đơn từ chối: đáy chat là nút mờ (disabled) "Bạn đã từ chối đơn này" ở góc phải. Khách đáp lại
  (nhận: "Hẹn ngày X", từ chối: tiếc / chảnh).
- Từ chối: `DECLINE_FREE` = 2 đơn / ngày không sao; từ đơn thứ 3: −1 uy tín + đánh giá 1★ (`data/reviews.ts`).
- Đánh giá (`Review` trong types, `Profile.reviews` giữ 100 cái): khi gửi hàng (`shipReview` theo sao / trễ, uy tín `shipRep`),
  từ chối quá nhiều, khách huỷ vì trễ (`cancelReview`). `addReviews` lưu + đẩy `reviewPops` (thông báo góc phải trên,
  `ReviewPops`, tự ẩn 6s, bấm mở app). App **"Đánh giá"** (`apps/reviews/ReviewsApp`, AppId `reviews`): sao trung bình + lọc.

### Danh sách đơn (thay "Đổi đơn")

- Nút icon "Danh sách đơn" trên thanh menu bàn build mở `OrderPicker` (tiêu đề "📋 Danh sách đơn").
- Mỗi đơn: % tiến độ (`buildPercent` trong steps.ts: bước đã qua tính đủ, còn lại theo `stepProgress`) + thanh tiến độ,
  "Xem chi tiết đơn" (OrderSpec), nút "Tiếp tục làm" (đơn đang làm) / "Đổi sang làm tiếp" / "Đổi sang build" / "Nhận & build".
- "Tiếp tục làm" của đơn đang làm mà chưa vào build cũng gọi `buildOrder` → thiếu đồ thì hiện danh sách thiếu
  (nút icon có tooltip 1 dòng: Shopii / Hội Phím Cơ / Chi tiết đơn; "← Chọn đơn khác" bên trái), trước đây chỉ đóng bảng.

### Kit

- PCB khách gửi: 60% là mạch Mechlovin bán ở Shopii nếu layout có (`kitPcb`, `PcbItem.model`), còn lại PCB tiêu chuẩn.
  Tên hiển thị qua `pcbLabel` (parts.ts). Plate khách gửi vẫn random trong cả 8 chất liệu `PLATES`.

### Tiền khởi đầu (2026-10-25)

- `START.money` 6.000k → **7.500k**. Tính từ dữ liệu: giả lập 4.000 lượt `randomOffers()` → ngân sách linh kiện đơn
  mua A→Z: p50 4.200k, p95 5.400k, **max 6.100k** (kit: max 5.500k). Linh kiện shop ứng trước, giao xong hoàn `min(spent, budget)`.
- Dụng cụ bắt buộc để làm được mọi loại đơn: bút hàn 60W 90 + bùi nhùi 35 + bút rã hàn 150 + kìm cắt 120 + cọ lube 60 +
  đồ mở switch 150 = 605k. Vật tư: thiếc Sakura 90 + Krytox 205g0 (120 lượt) 120 + Urgo 10 miếng 25 = 235k.
- Tổng tệ nhất 6.940k, dư ~8% phòng mua hớ / bị lừa ở Hội Phím Cơ. Tua vít điện (350) + giá cuộn thiếc (180) là đồ tiện,
  không tính bắt buộc. Chỉ áp dụng khi chơi mới (bản lưu cũ giữ nguyên tiền).

### Uy tín ảnh hưởng đơn + thu nhập chứng chỉ (2026-10-25)

- `data/reputation.ts`: `REP_TIERS` Bị tẩy chay (< −5: 3–4 đơn, công ×0.8) · Tai tiếng (≥ −5: 4–5, ×0.9) · Mới vào nghề
  (≥ 0: 5–7, ×1) · Có tiếng (≥ 10: 6–8, ×1.15) · Thợ có tâm (≥ 30: 7–9, ×1.3). `randomOffers(rep)` (nextDay truyền uy tín
  sau khi cộng / trừ) lấy số đơn + hệ số công (`randomOrder(layout, pay)`, tiền công trong tin khách đã nhân hệ số).
- Chứng chỉ thợ: `CERT_BONUS` lõ 0 / middle +150k / senior +350k = thu nhập cơ bản cộng **ngay vào ví khi nhận đơn**
  (`acceptOrder`, toast), không phụ thuộc điểm chấm.
- Chip tiền / uy tín (StatusChips) bấm mở bảng: uy tín (bậc, còn bao nhiêu lên bậc, đơn / ngày, hệ số công, bảng bậc,
  `REP_RULES` uy tín lên xuống, nút Xem đánh giá); ví (bậc thợ, thu nhập cơ bản / đơn, ghi chú ứng tiền linh kiện).

### Hội Phím Cơ: thuật ngữ chợ phím + inbox thương lượng (2026-10-25)

- `data/market.ts` (`makePost`, `negotiate`): mỗi bài pass có sự thật ẩn `cond` (new / clean / flaw / shiny / missing / tick /
  tuned / desolder / dead theo loại hàng), `honest` (60% liêm), `scammer` (liêm 8%, không liêm 30%), `tag` (price no offer /
  lowball thoải mái / thường), `fs`. Caption = thuật ngữ chợ theo bài của người dùng (Xém flawless, Chớm bóng, Số nút như hình,
  Sử dụng ổn, Chân rã hàn, BNIB, Khui seal check nút, LFSS...): không liêm thì nói tránh. Hàng lỗi rẻ hơn hàng new.
- Inbox (`InboxChat`, `inboxPost`): Xin hình check flaw (liêm thì khai thật, không thì "bác xem hình đi"), Check var (seller bùng
  70% lộ bài tố), Lộc lá (freeship hoặc −50k; price no offer 40% ăn block), Nhanh gọn em chốt luôn (−100/−200), Lowball −30%
  (lowball thoải mái dễ nhận; thường có thể bị chửi / block; price no offer = block), Nhanh gọn cho người câm điếc (chỉ khi chưa
  hỏi gì: bớt hữu duyên 200–1000k, sau đó chỉ còn chuyển khoản). Mỗi câu 1 lần; ship 30k nếu không Fs.
- Chốt (`buyPost`): trả giá thương lượng + ship; `scammer` thì mất trắng (thay tỉ lệ 20% cũ, bản lưu cũ vẫn 20%); hàng lỗi ghi
  `flaw` vào linh kiện (`FLAW_TEXT`) → chấm điểm "Linh kiện pass có lỗi" −8 / món; switch `dead` thiếu 10–20% số con.
- Tỉ lệ block (2026-10-25): lowball `LOWBALL_BLOCK` price no offer 100% / thường 25% / lowball thoải mái 5%. 30% bài ghi tag
  "Nhanh gọn cho người câm điếc" (`post.mute`, badge xanh, người bán chào kiểu này): mỗi câu hỏi han (xin hình, check var, xin bớt,
  lowball) thêm `MUTE_BLOCK` 30% bị block; xin stk luôn thì không. Giả lập: lowball bài câm điếc thường ~47%, lowball thoải mái ~33%.
