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

- PCB khách gửi: PCB tiêu chuẩn ngẫu nhiên hàn / hotswap (`kitPcb`). Mạch Mechlovin đã gỡ (2026-10-25); bản lưu cũ có
  `PcbItem.model` không còn được đọc.
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
- Chợ Hội Phím Cơ theo ngày (2026-10-25, "qua ngày mới thì phải reset chợ ra vật phẩm khác"): `nextDay` đăng lại
  `groupPosts(order, day)` cho đơn đang làm + mọi job đang chờ (bài cũ, kể cả inbox / đã mua, bị thay hết), toast báo có hàng mới.
  Id bài `post-d<ngày>-<i>` (nhận đơn cũng theo ngày hiện tại, `freshSession(order, day)`).
- Sửa deal về 0đ (2026-10-25): `negotiate` (market.ts) bớt số tiền cố định (lộc −50, chốt −100/200, câm điếc −200…1000) mà
  `round50` chỉ chặn ở 0 → món rẻ về 0đ. Thêm `dealFloor(post)` = min(giá đăng, max(50k, ~60% giá đăng)); mọi lần bớt qua `cut()`
  không dưới sàn, tin người bán ghi đúng số tiền thật đã bớt, chạm sàn thì "sát đáy rồi". `buyPost` cũng chặn sàn (save cũ).
  Thử 20.000 lượt trả giá ngẫu nhiên: 0 lượt dưới sàn / 0đ.

### Budget dư vào túi + đồ dư giữ lại (2026-10-25)

- "budget 500k mà mua chỉ tốn 100k thì 400k dư phải vào túi": `scoreDelivery` trả `reimburse = order.budget` (trước là
  `min(spent, budget)` → phần dư mất). Lố budget thì shop chịu phần lố (vẫn trừ điểm "Lố ngân sách"). Chi tiết đơn ghi
  "Còn dư Xk vào túi khi giao" / "Lố Xk"; chip ví + ResultCard đổi chữ "hoàn tiền" → "trả budget".
- "mua 90 switch build tốn 80 thì kho còn 10, đơn sau chỉ mua thêm 70": `Profile.spare` (`Spare` trong types: switch theo loại →
  số con, stab theo loại → ngắn / dài), lưu trong save (`SAVED_KEYS`, `snapshot`, `loadSave` mặc định rỗng). `src/store/spare.ts`:
  - `deliver()`: switch còn lại trong kho + stab thừa so với layout (`leftoverSpare`; stab khách gửi trong kit thì không giữ).
  - `buy()` switch / stab: đồ dư cùng loại tự gộp vào (toast "+n con dư từ đơn trước"); đổi sang loại khác thì loại cũ cất vào đồ dư
    (trước bị mất). Khách huỷ đơn vì trễ (`nextDay`): switch / stab đã mua của đơn đó cất vào đồ dư.
  - `takeSpare(cat, type)` + mục "Đồ dư từ đơn trước" trong app Kho (`SpareItems.tsx`, nút "Dùng cho đơn này").
  - Hàng pass có `flaw` không giữ lại (tránh hàng lỗi thành hàng sạch). Đồ dư không tính vào `spent` của đơn sau (đã trả tiền rồi).

### Hội Phím Cơ: tự trả giá + đi ăn xin + ban chợ (2026-10-25)

- "Trả giá…" (`InboxAction 'offer'`, `negotiate(post, action, amount)`): popup nhập số (k) trong inbox (`OfferPopup`, gợi ý 85% giá đang
  chào), tối đa `OFFER_MAX` = 3 lần / người bán. ≥ giá chào: chốt luôn; price no offer: 60% block; dưới sàn (`dealFloor`): như lowball
  (`LOWBALL_BLOCK`, dưới 60% sàn ×2); trong khoảng sàn → giá: càng gần giá chào càng dễ nhận, không thì người bán chào giá giữa.
  Giả lập giá 1000k: trả 950 nhận ~63%, 800 ~41%, 650 ~22%; 500 (dưới sàn) block 25%, 300 block 50%.
- "Đi ăn xin" (`'beg'`, 1 lần / người bán): `BEG_BAN` 10% admin ban khỏi chợ `BAN_DAYS` = 3 ngày (`deal.ban`, `Profile.marketBanUntil`
  = ngày + 3, `isMarketBanned()` chặn inbox / mua; GroupFeed hiện bảng "đang bị ban"), `BEG_GIFT` 5% người bán tặng free
  (`deal.gift`: giá 0, ship 0, không bùng, nút "Nhận quà free"), còn lại 30% bị người bán block / bị chọc.
- Bị ban: `notify()` (metaSlice `notices`, không lưu, tự ẩn 10s) hiện thông báo góc phải trên "bị ban khỏi chợ 3 ngày vì đi ăn xin người bán X".
- 2026-10-26, người dùng: "sửa lại tỉ lệ ăn xin 5% thành công còn lại ko thành công thì bị ban khỏi chợ" → bỏ `BEG_BAN` và nhánh
  block / chọc: `BEG_GIFT` 5% được tặng, 95% còn lại người bán đáp (`BEG_REPLIES`) + admin ban `BAN_DAYS` ngày (`deal.ban`, chặn luôn).

- 2026-10-26, người dùng: "tăng tỉ lệ lowball thành công lên 30%" → nút lowball (trả 70% giá) ở bài thường: không bị block (75%)
  thì `LOWBALL_OK.normal` 0,4 nhận giá (trước 0,3) → tổng 30% (trước 22,5%). Bài "lowball thoải mái" giữ ~52%, price no offer vẫn block.

### Kho chung cho mọi linh kiện (2026-10-25, thay mục "Đồ dư từ đơn trước")

- Người dùng: "sao lại là Đồ dư từ đơn trước?? tự động pcb build dư or mua dư bỏ vào chứ; mua sw sau khi đổi qua đơn khác thì bị biến mất"
  - "tương tự với tất cả đồ". Bỏ `SpareItems` / `takeSpare`, `Spare` thêm `items` (case / PCB / plate / keycap / stab lỗi từng món).
- `spare.ts`: `addPart` (switch / stab gộp loại, món khác xếp riêng; hàng lỗi vẫn giữ, giữ nguyên `flaw`), `leftoverSpare`, `stashAll`
  (mọi món không phải khách gửi), `fillFromStock` (ô trống lấy món đầu tiên đạt `checkInventory`; switch đúng `switchKind`, nhiều con nhất
  hoặc gộp cùng loại; stab chỉ khi layout cần + không đụng plate dẻo).
- shopSlice: `buy` mọi loại món bị thay → kho chung (trước chỉ switch / stab, còn PCB / plate... mất); `takeStock(key)`, `releasePart(jobId, cat)`
  (đơn chờ chưa build), `fillActive()` gọi khi nhận đơn thành đơn đang làm + `switchJob` (đang build thì chỉ gộp switch).
- "Mất switch khi đổi đơn": thật ra đồ nằm trong job đang chờ nhưng Kho chỉ hiện đơn đang làm. Giờ lưới Kho hiện đồ đơn đang làm (viền xanh),
  đơn chờ (dòng "Đơn <khách>") và kho chung (chữ vàng "Kho chung"); khung xem có nút "Dùng cho đơn đang làm" / "Cất về kho chung".

### Stab bán lẻ 2u + phím dài (2026-10-25, "mua 1 bộ stab thì phải có cả bán lẻ wire 2u và wire 7u")

- Mỗi sản phẩm stab Shopii (`stabOptions` trong `buildCatalog`, parts.ts) có 3 lựa chọn: "Bộ 4 ngắn + 1 dài" (giá cũ), "Lẻ 2u"
  (`stabSinglePrice` ~16% giá bộ, tối thiểu 15k), "Lẻ phím dài 6.25u / 7u" (`stabLongPrice` ~30%, tối thiểu 30k, kèm dây 6.25u + 7u).
  Stab Cherry gộp 3 loại → 9 lựa chọn ("Cherry Clip · Lẻ 2u"...). Bỏ sản phẩm riêng "Stab lẻ 2u (1 con)". Thiếu stab dài thì
  `stabCheck` ghi "(mua lẻ phím dài)". Hội Phím Cơ chỉ đăng stab nguyên bộ (`groupPosts` lọc nhãn "Bộ").

## Thua game, phá sản, bảng xếp hạng server (2026-10-25)

Yêu cầu: "có button tuyên bố phá sản ... popup 99% người dừng lại trước khi thắng lớn; không đủ điều kiện nhận đơn mới or uy tín −10
thì thua ('bạn đã bị phốt quá nhiều vì uy tín quá thấp' / 'bạn ko còn đủ tiền để nhận đơn'); thêm server lưu bảng xếp hạng mỗi khi thua,
bấm phá sản, new game".

- Luật thua (`src/data/gameOver.ts`): `lossReason` → `'rep'` khi uy tín ≤ `LOSE_REP` (−10); `'money'` khi rảnh tay (không đơn đang làm,
  không job, không đơn đóng gói chưa gửi) mà còn đơn chào và ví < `cheapestOfferCost(offers)` (= `estimateCost` của orders.ts, nay export).
  Còn đơn đang làm / chờ gửi thì chưa xét tiền (sắp có tiền về); hết đơn chào thì chờ qua ngày. Không có đơn để "huỷ" nên đơn ôm mà
  không mua nổi đồ sẽ bị khách huỷ sau 3 ngày trễ rồi mới thua.
- Store (`store/index.ts`): subscribe `LOSS_KEYS` (rep, money, offers, order, jobs, packed), debounce 1,2s cho toast / đánh giá kịp hiện,
  rồi `endRun(reason)` (metaSlice): `runEntry` → `submitRun`, `clearSave()`, `gameOver` (không lưu) → `GameOverDialog`
  (`features/gameover/`, z 4000) → `closeGameOver` về màn tiêu đề (đặt `name: ''` để tự lưu không ghi lại save).
  `save()` bỏ qua khi `gameOver`. Thông điệp ở `END_TEXT`. `REP_RULES` thêm dòng "Uy tín từ −10 trở xuống".
- Phá sản: `BankruptPanel` cuối app Cài đặt, `ConfirmBankrupt` (portal ra body) với Alert vàng
  "99% người chơi dừng lại ngay trước khi thắng lớn", nút "Vẫn phá sản" / "Cố thêm chút nữa" → `endRun('bankrupt')`.
- `newGame` có save cũ thì gửi lượt cũ với lý do `'newgame'` trước khi đè. `Profile.runId` (`newRunId()`), save cũ chưa có thì sinh lúc
  `continueGame`; server giữ 1 dòng / `runId` (gửi lại = ghi đè).
- Server (`server/leaderboard.ts`, `bun run server`): Bun.serve, `GET /api/leaderboard?key=rep|done|money|stars|day` (top 50),
  `POST /api/leaderboard` (kiểm tra / kẹp số, tên ≤ 24 ký tự), lưu `server/data/leaderboard.json` (gitignore, giữ tối đa 5000 lượt),
  ghi file tuần tự, CORS mở. Vite dev proxy `/api` → 8787; bản build dùng `VITE_LEADERBOARD_URL` (mặc định `/api`). Không chống gian lận
  (game chạy ở client, số liệu client tự gửi).
- Xếp hạng tổng hợp (2026-10-26, "bảng xếp hạng phải đánh giá dựa trên số đơn + uy tín + số ngày + số tiền và filter được theo các thông số"):
  `runScore` (leaderboardCore) = đơn × 10 + uy tín × 20 + ngày × 5 + tiền(k) / 100 (vd 20 ngày · 30 đơn · uy tín 15 · 30.000k ≈ 1.000 điểm).
  Khoá `score` thêm vào `KEYS` (mặc định của GET, POST trả hạng + cắt KEEP theo điểm tổng; Redis có `lb:z:score`). App: chip `OptionChip`
  Tổng điểm / Tiền / Số đơn / Uy tín / Số ngày (đổi chip thì tải lại), cột phải hiện giá trị theo chip, badge thêm tiền; badge `gap-1`;
  sao chỉ hiện khi có đánh giá (badge vàng), chưa có thì ẩn hẳn. Đang tải: `LoadingRows` khung xương `animate-pulse` thay chữ.
  Tên trùng không sao: mỗi lượt là 1 dòng theo `runId`, dòng của mình đánh dấu "Bạn".
- Deploy Vercel (2026-10-26, "server lưu kết quả có cần làm gì trên Vercel ko" → chọn phương án A): Vercel không chạy được
  `Bun.serve` + file JSON (serverless, ổ đĩa không giữ). Thêm Vercel Function `api/leaderboard.ts` (export `GET` / `POST` / `OPTIONS`,
  cùng API) lưu Upstash Redis qua REST `/multi-exec` bằng fetch (không thêm thư viện): hash `lb:runs` (runId → JSON) + sorted set
  `lb:z:<khoá>` cho từng khoá xếp hạng; quá KEEP thì xoá lượt ít tiền nhất; env `KV_REST_API_*` (tích hợp Vercel) hoặc
  `UPSTASH_REDIS_REST_*`, thiếu thì 503. Kiểm tra / kẹp dữ liệu, sắp xếp, CORS tách ra `server/leaderboardCore.ts` dùng chung với
  server Bun local. Import `../server/leaderboardCore.js` (đuôi .js cho ESM trên Node). tsconfig include thêm `api` + file core.
  Đã thử với Upstash giả lập (ghi đè lượt, xếp hạng, 400, CORS) và `bun run server`; chưa deploy thật. README thêm mục "Deploy lên Vercel".
- Client (`lib/leaderboardApi.ts`): gửi lỗi thì cất hàng chờ localStorage `sbk-lb-pending` (tối đa 20), mở tab "Toàn server" thì
  `flushPending()` rồi mới tải bảng. App Bảng xếp hạng: tab "Khu phố" (cũ) / "Toàn server" (`ServerBoard.tsx`, badge lý do kết thúc).
- Cùng ngày, người dùng: "bảng xếp hạng sẽ tính server thôi ko tính chơi local => bỏ 2 tab". Xoá `data/leaderboard.ts` (9 shop giả lập)
  - `ServerBoard.tsx`; `LeaderboardApp` chỉ còn bảng server, lượt đang chơi (`runEntry` từ store) chèn vào theo tiền, viền vàng + "Bạn".
    Xếp theo **tiền** (bỏ chip tiêu chí; server GET mặc định `money`, hạng trả về khi POST + cắt KEEP cũng theo tiền).
    Đầu bảng chỉ "#hạng + tên + tiền" (bỏ "Cần thêm X để vượt Y"). Dòng phụ thành `Badge solid` (ngày / đơn / uy tín / sao), bên phải
    `font-head font-extrabold` = tiền. `fmtMoney` (dưới 10.000k giữ k, từ 10.000k → m, từ 100.000k → B theo yêu cầu người dùng) dùng cho bảng xếp hạng, popup thua
    và ví (`StatusChips`).
- 2026-10-27, người dùng: "icon xếp hạng 1, 2, 3 đi thay vào đó là số". Bỏ `MEDALS` (🥇🥈🥉) trong `LeaderboardApp` (`RunRow`), mọi hạng hiện số.
- 2026-10-27, người dùng: "thiết kế lại bảng xếp hạng theo style này" (ảnh mẫu) + "các điểm bị âm sẽ không được hiển thị lên bảng xếp hạng".
  `LeaderboardApp`: đầu app cúp + tiêu đề + ô "Hạng của bạn" (điểm âm tô đỏ, hạng "–"); tab lọc có icon lucide (nút vàng = đang chọn);
  khung bảng có hàng tiêu đề Hạng / Người chơi / tên thông số; dòng = `RankMark` (huy hiệu vàng / bạc / đồng có số cho top 3, ô tròn từ hạng 4),
  `CustomerAvatar` theo tên, badge có icon (`Stat`; tiền dùng tone mới `purple` trong `BUTTON_TONES`). Lượt `runScore < 0` bị lọc khỏi bảng
  (lọc ở client, cả lượt của mình), chân bảng đếm số lượt hiện. Cửa sổ rộng 680. Tab lọc tự vẽ nút (không `OptionChip`) để ra nút vàng đặc như mẫu.
- 2026-10-27, người dùng: "đổi lại avatar random nhân vật anime". Thêm 24 avatar DiceBear Lorelei (CC0, tóc nhiều màu, không râu)
  ở `public/avatars/anime/` (`scripts/fetch-anime-avatars.mjs`, `bun run fetch:anime-avatars`, lưu sẵn không gọi API lúc chơi);
  `PlayerAvatar` (CustomerAvatar.tsx) chọn theo hash tên người chơi. Đã thử Lorelei mặc định (đen trắng, có râu) và Adventurer (CC BY, kiểu hoạt hình) — không giống anime bằng.
- 2026-10-27, người dùng: "thay thế toàn bộ thành bộ vẽ Moods đi" + "dùng loại bare nhé". Mọi avatar (khách Mezzenger / Đánh giá / đơn,
  người chơi bảng xếp hạng, người bán + người bình luận ở Hội Phím Cơ — trước là chữ cái đầu `Avatar small`) dùng 24 avatar DiceBear Moods
  (CC0, API 10.x, preset Bare = `cheeksProbability=0`, `animationVariant=slow`: chớp mắt ~5,3s, CSS trong SVG chạy được trong `<img>`, tự tắt khi prefers-reduced-motion; trước đó thử none = ảnh tĩnh) ở `public/avatars/moods/` (`scripts/fetch-avatars.mjs`, `bun run fetch:avatars`).
  Xoá `avatars/customers/` (Notionists), `avatars/anime/` (Lorelei) + script cũ. `data/avatars.ts`: `avatarSrc` / `avatarIndex`;
  `NameAvatar` (theo hash tên) + `CustomerAvatar` (theo số trong `order.avatar`, save cũ `customer-NN` vẫn đọc được số).
- 2026-10-27, người dùng: "bỏ hết badge ở bảng xếp hạng, bao gồm cả trạng thái chơi lại, đang chơi". `LeaderboardApp` (`RunRow`): bỏ badge
  "Bạn" + badge lý do kết thúc (xoá `REASON`; dòng của mình vẫn viền vàng + tên vàng); `Stat` thành icon màu + chữ thường (không `Badge`).
  Bảng xếp hạng là ngoại lệ của quy ước badge trong CLAUDE.md (tone `purple` vẫn giữ trong `BUTTON_TONES`).
- 2026-10-27, người dùng: "uy tín -1 ko được vào bảng xếp hạng". `ranked()` trong `LeaderboardApp`: lên bảng khi `runScore >= 0` và `rep >= 0`
  (lọc ở client, cả lượt của mình; ô "Hạng của bạn" hiện "–" + chữ đỏ). Server vẫn lưu lượt uy tín âm, chỉ không hiện.
- 2026-10-27, người dùng: "bỏ luôn cả text đi ko cần hiển thị luôn" + "hạng của bạn ... chỉ cần hiển thị font-head text-3xl font-extrabold
  text-yellow ex: #2". Góc phải trên bỏ khung / icon cúp / nhãn "Hạng của bạn" / điểm / tooltip, chỉ còn `#N`; chưa lên bảng thì không hiện gì.
- 2026-10-27, người dùng: "bỏ luôn xếp hạng của mình ở top ... mặc định vào sẽ go đến xếp hạng của mình sau đó người chơi tự scroll lên".
  Bỏ hẳn `#N` góc phải trên. Dòng của mình có `data-mine`; `useEffect` theo `data` / `key` / `pos` đặt `scrollTop` của khung danh sách
  để dòng đó nằm giữa (tự tính, không `scrollIntoView` để khỏi cuộn cửa sổ / desktop bên ngoài).
- 2026-10-27, người dùng: dòng chú thích chân bảng "đưa lên header ở trên góc bên phải ... icon dấu chấm than hover vào mới hiển thị text
  ... ko cần hiển thị lượt chơi". Bỏ khung chú thích dưới cùng; header thêm icon `CircleAlert` góc phải trên, `title` = "Xếp theo ... · ghi khi
  thua game, phá sản hoặc chơi mới" (bỏ số lượt chơi).
- 2026-10-27, người dùng: "bỏ cụm này luôn đi ko cần nữa: flex flex-wrap gap-x-3 gap-y-0.5". Bỏ hàng thông số dưới tên (ngày / đơn / uy tín /
  tiền / sao) + component `Stat` + vạch giả của hàng đó trong `LoadingRows`; mỗi dòng còn hạng, avatar, tên, giá trị theo bộ lọc bên phải.
- 2026-10-27, người dùng: tên người chơi dài muốn xem tooltip nhưng không hiện. Ô tên trong `RunRow` thiếu `title`; thêm `title={r.name}`
  (`GlobalTooltip` vẽ), tên bị `truncate` thì rê chuột xem đủ.
- 2026-10-27, người dùng: "đổi width của bảng xếp hạng thành 534px vừa đủ hiển thị 4 button trên cùng 1 hàng". `apps.ts` leaderboard
  `width` 680 → 534 (tab lọc vẫn `flex-wrap`, tab thứ 5 xuống hàng).
- 2026-10-27, người dùng: "tooltip tên phải hiển thị ngay ở vị trí bắt đầu của name chứ sao lại show ở giữa". `GlobalTooltip` mặc định căn giữa
  phần tử (ô tên giãn hết `flex-1` nên tooltip lệch vào giữa thẻ) → thêm tuỳ chọn `data-tip-align="start"` (căn mép trái phần tử, không
  `-translate-x-1/2`, chữ trái); ô tên `RunRow` dùng tuỳ chọn này.

### Stab tách dây 6.25u / 7u + badge số lượng (2026-10-25, "mua tkl nhưng build dùng 2 wire 2u thì vẫn còn lại 2u và 1 7u, 1 6.25u")

- `StabItem.long7` (dây 7u) tách khỏi `long` (dây 6.25u, cả phím 6u). Bộ TKL (`STAB_KIT`) = 4× 2u + 1× 6.25u + 1× 7u (trước 4 ngắn + 1 dài
  "kèm cả 2 dây" nên dùng spacebar 6.25u là hết, mất dây 7u). `stabNeed`: 2u (< 6u), 6.25u (6u–6.75u), 7u (≥ 7u). `StabCount` + `addStab`,
  `stabTotal`, `stabText` ("4× 2u + 1× 6.25u + 1× 7u") trong parts.ts; `leftoverSpare` trừ từng cỡ → dư đúng cỡ vào kho chung.
- Bản lưu cũ chưa có `long7`: `stabStock` coi `long7 = long` (bộ cũ có cả 2 dây).
- Shopii mỗi loại stab: "Bộ TKL", "Lẻ 2u", "Lẻ 6.25u", "Lẻ 7u" (thay "Lẻ phím dài 6.25u / 7u"); thẻ sản phẩm stab có badge solid
  xanh số stab nhận được theo cỡ (`ProductCard`). Kho: khung xem stab ghi chi tiết theo cỡ (`Owned.detail`).

### Switch Silent Tactile tách loại riêng (2026-10-26, "đơn muốn silent + tactile mua con silent tactile ko chịu")

- `SwitchKind` thêm `SilentTactile` ("Silent Tactile"), switch `silentTactile` đổi kind từ Silent sang loại mới (có bộ lọc riêng ở Shopii).
  `switchFits(type, want)` (parts.ts): đúng loại, hoặc Silent Tactile cũng hợp đơn đòi Tactile / Silent; dùng ở `checkInventory` + `fillFromStock`.
  Đơn khách muốn êm chọn Silent / Silent Tactile, đơn ngẫu nhiên có thêm Silent Tactile.

## Switch Otemu Silent (2026-10-26)

- Người dùng: "thêm vào sw silent là otemu stem màu vàng + housing full hồng". `SWITCHES.otemuSilent` (parts.ts): Silent linear,
  chưa lube, rẻ (40k / 10 con), êm như Gateron Silent (`loud` 0.15), stem `#f2c230`. Housing trên + dưới hồng đục `#f49ab9`
  (`HOUSING` trong `scene/models/Switch.tsx`). Shopii tự liệt kê theo `SWITCHES`, đơn đòi Silent dùng được.

### Keycap: 1 bộ Cherry + 3 chất liệu (2026-10-26, "tại sao có 2 loại keycap cherry giống nhau?")

- Shopii có 2 sản phẩm "PBT Cherry" vì `KEYCAP_KITS.base` (Cherry Base, chỉ 40/60/HHKB/Planck, 400k) và `full` (650k) cùng tên rút gọn.
  `base` thêm `hidden: true` (giữ cho bản lưu cũ), không bán / không ra đơn mới; `keycapKitFor` bỏ (mặc định `full`).
- `KeycapMaterial` (`pbt` / `abs` / `mix`), `KEYCAP_MATERIALS` (giá PBT ×1, ABS ×0.75, Mix PBT + ABS ×0.9), `KeycapItem.material`
  (bản lưu cũ = PBT, `keycapMaterialOf`). Sản phẩm "Keycap <profile>" có 18 option chất liệu × màu ("PBT · Trắng"...); nhãn xanh trên ảnh
  = chất liệu (thay nhãn Full / Base).
- Đơn: `Order.keycapMaterial` (80% khách ghi rõ, 20% shop tự chọn), tin khách ghi chất liệu, OrderSpec + highlight; `keycapCheck`
  báo "Khách muốn keycap ABS, đang có PBT". Thử 190 đơn: pbt 70 / abs 63 / mix 55 / tự chọn 57, không đơn nào ra bộ `base`.
- Cùng ngày: "nãy là v1" → đổi tên `otemuSilent` thành "Otemu Silent V1"; thêm `otemuSilentV2` "Otemu Silent V2" (Silent linear, chưa lube,
  45k / 10, êm hơn chút `loud` 0.13): stem xanh ngà lá chuối non `#d6ecae`, housing full xanh lá chuối đục `#8cc63f`.

## Đơn đòi đúng 1 con switch (2026-10-26)

- Người dùng: "đơn hàng kh có thể yêu cầu 1 loại sw cụ thể ex: cherry black hoặc chỉ cần là silent là được".
  `Order.switchType?` (types.ts): ~35% đơn (`randomOffers`) chọn 1 con trong `SWITCHES` cùng `kind` với `switchKind`; tin khách
  "Switch phải đúng con X (loại) nhé, con khác mình không nhận đâu", không có thì "Switch loại X là được, hãng nào cũng ok".
- `switchOk(type, order)` (parts.ts) thay `switchFits` ở `checkInventory` + `fillFromStock` (spare.ts); `switchWant(order)` = tên hiện ở
  OrderSpec / tin báo thiếu. Highlight Mezzenger tô tên switch. `estimateCost(..., switchType)`: budget tính theo giá con khách đòi
  (tối thiểu 65k / 10), `cheapestOfferCost` cũng truyền vào. Đơn cũ không có `switchType` → như trước.
- Đổi tên switch (2026-10-26, người dùng yêu cầu): "HMX Linear Trắng" → **HMX Snow**; "Wingtree Linear Khói" → **Wingtree Camellia**
  (stem đỏ `#c8202f`, housing full trắng đục `#f3f1ec` opacity 1). Giữ id `hmxWhite` / `wingtreeSmoke` để bản lưu / đơn cũ không vỡ.
- Thêm switch tactile (2026-10-26, người dùng yêu cầu): `cherryPurple` **Cherry Tím** (stem tím `#8e44c9`, housing full đen, chưa lube,
  75k / 10) và `wingtreeTactile` **Wingtree Tactile** (stem cam nhạt `#f6b77a`, housing trắng đục `#f3f1ec`, lube sẵn, 85k / 10).
- Thêm `gateronTypeR` **Gateron Type R** (2026-10-26, người dùng yêu cầu, loại Tactile): stem đỏ `#d42a2a`, housing full đỏ đục `#c62a2a`,
  lube sẵn, 80k / 10.
- Thêm `gateronSilentTactile` **Gateron Silent Tactile** (2026-10-26, người dùng yêu cầu, loại SilentTactile): stem nâu `#8a5a3c`,
  housing trên trong suốt (`#eef4f8`, opacity 0.35), dưới trắng đục `#f3f1ec`, lube sẵn, 95k / 10.
- Thêm `cherryOrange` **Cherry Cam** (2026-10-26, người dùng yêu cầu, Linear): stem cam `#f07a1e`, housing full đen, chưa lube, 70k / 10.
- Thêm switch (2026-10-26, người dùng yêu cầu): `hmxKd200` **HMX KD200** (Linear, housing trên vàng đậm `#d4a017`, dưới đen, stem đen,
  lube sẵn, 65k / 10); `wingtreeTorrero` **Wingtree Torrero** (Tactile, housing full nâu coffee `#6f4e37`, stem vàng đậm `#d9a400`,
  lube sẵn, 90k / 10).
- Thêm `hmxVolume0T` **HMX Volume 0 T** (2026-10-26, người dùng yêu cầu, SilentTactile): housing trên nâu đậm `#4a2e1f`, dưới coffee sữa
  `#b08a6a`, stem cream `#f3e5c0`, lube sẵn, 90k / 10.
- Thêm `hmxSnowfall` **HMX Snowfall** (2026-10-26, người dùng yêu cầu, Tactile): housing trên trong suốt (opacity 0.3) đính kim tuyến,
  dưới + stem trắng đục `#f3f1ec`, lube sẵn, 80k / 10. `HOUSING` (Switch.tsx) thêm phần tử thứ 4 `glitter`; `addGlitter` sửa shader
  MeshPhysicalMaterial (`onBeforeCompile`): GLB switch không có UV nên rắc hạt theo toạ độ mm (ô 0,45mm, hash > 0.92 → phát sáng ánh kim
  - đục hẳn), dùng chung cho ảnh Shopii (`switchMaterials`).
- Thêm `gateronMilky` **Gateron Milky Vàng** (2026-10-26, người dùng yêu cầu, Linear): housing full trắng sữa hơi trong (`#f4f2ec`,
  opacity 0.85), stem vàng nhạt `#f2dc6b`, lube sẵn, 50k / 10.
- Thêm `hmxV2u` **HMX V2U** (2026-10-26, người dùng yêu cầu "full tím"; loại chưa nói, tạm Linear): housing full tím `#8a4fd0`,
  stem tím `#7b3fc4`, lube sẵn, 70k / 10.
- Thêm `hmxWaverider` **HMX Waverider** (2026-10-26, người dùng yêu cầu, Tactile): housing trên xanh trong (`#4aa8e8`, opacity 0.4)
  đính kim tuyến (`glitter`), dưới xanh navy `#1f2a5a`, stem trắng `#f4f4f4`, lube sẵn, 85k / 10.
- Thêm `rubenBumblebee` **Ruben Bumblebee** (2026-10-26, người dùng yêu cầu, Linear): housing full xám tro `#8a8d91`, stem vàng đậm
  `#e0a800`, lube sẵn, 75k / 10.
- Thêm `hmxSuColor` **HMX Su Color** (2026-10-26, người dùng yêu cầu, Linear): housing full trong suốt hồng (`#ff9ec8`, opacity 0.35)
  đính kim tuyến cả trên lẫn dưới, stem hồng nhạt `#ffc8dc`, lube sẵn, 80k / 10. `HOUSING` phần tử kim tuyến thêm giá trị `'full'`
  (housing dưới cũng là vật liệu trong `clearMat` + `addGlitter`; `true` = chỉ housing trên như cũ).
- Thêm `hmxXinhai` **HMX Xinhai** (2026-10-26, người dùng yêu cầu, Linear): housing trên trắng `#f2f2ee`, dưới + stem xanh navy `#1f2a5a`,
  lube sẵn, 70k / 10.
- Giá chất liệu đảo lại (2026-10-26, "pbt rẻ nhất đến mix pbt + abs => abs"): PBT ×0.8 < Mix ×0.9 < ABS ×1 (giá bộ = giá ABS);
  option Shopii xếp theo thứ tự đó.
- Màu case (2026-10-26, người dùng: "thêm 1 số màu case: đỏ, tím, coffe sữa, màu nâu đậm, navy"): `CASE_COLORS` thêm `purple` Tím `#5e3a8c`,
  `latte` Coffee sữa `#b39274`, `brown` Nâu đậm `#4a2e1f` (Đỏ / Xanh navy đã có). 28 case đục (có black / silver / white / pink) được gắn
  thêm đủ 5 màu đỏ / tím / coffee sữa / nâu đậm / navy; case gỗ và case trong / mờ (clear / frost / smoke) giữ nguyên.

### Đơn đòi đích danh case / stab / plate + sách phép 100 / 200 / 500 (2026-10-26)

- "các đơn có thể chỉ định cụ thể 1 loại, ex: sw cherry black, áp dụng với toàn bộ, stab, case...": switch đã có `switchType` (phiên khác làm,
  `switchOk` / `switchWant`). Thêm `Order.caseId` / `stabType` / `plateMaterial`, mỗi món ~30%, chỉ với món khách không gửi trong kit.
  Ràng buộc: case vừa layout + có màu `caseColor` khách đòi; stab plate-mount không đi với plate dẻo (kit hoặc khách đòi), plate khách đòi
  phải cứng nếu stab là plate-mount. Thử 1814 đơn: case 311 / stab 376 / plate 324, 0 vi phạm. Thiếc / vật tư không bao giờ bị đòi.
- `estimateCost(..., want)` tính theo giá món đích danh (budget đủ mua); `checkInventory` báo "Khách cần case / plate / stab X, đang có Y";
  tin khách, OrderSpec (dòng Case / Plate / Stab), highlight; Shopii "Chỉ hiện đồ hợp đơn": case / stab đúng con, plate chỉ còn option đúng
  chất liệu, case chỉ còn màu khách đòi, switch theo `switchOk`.
- Sách phép: `SPELL_PACKS` 100 lần 450k / 200 lần 800k / 500 lần 1.800k cho cả 6 loại (bỏ chữ "Dùng 200 lần" trong mô tả).

## Switch hợp tiếng khách muốn (2026-10-26)

- Người dùng: "làm sao clack giòn, cao, sáng lại chơi switch silent được vô lý, clack chỉ có linear, tactile; ồn ào thì có clack, to, rõ".
  `WISH_SWITCH` (orders.ts): silent → Silent / SilentTactile (70%) hoặc Linear / Tactile; thock + clack → chỉ Linear / Tactile; noisy →
  Clicky (60%) hoặc Linear / Tactile. Không còn đơn "clack" / "thock" / "ồn" đòi switch silent. `SOUND_WISH.noisy` đổi thành
  "Ồn ào, clack to rõ" / "Gõ phải kêu clack thật to, rõ từng phím cho đã tai". Thử 300 đợt đơn: không còn cặp vô lý.

## Mount theo số mảnh case (2026-10-26)

- Người dùng: "case TKL thì chỉ có option 2 mảnh và mica ghép → không chơi được O-ring mount; case 1 mảnh thì có thể có nhiều".
  Case 1 mảnh dựng bằng code (plastic60, wood60, plastic40, tklTray, fullTray, case65Plastic, case75Plastic, case75Alu, frlAlu) thêm
  mount `oring` + `og` (đều cần case 1 mảnh, `buildContext` chèn bước `ring`). Thêm `tklAlu` "Case TKL nhôm 1 mảnh" (anod, 1.800k,
  tray / oring / og) vào dòng "Case TKL" (`CASE_LINES`: Nhựa ABS / Nhôm 1 mảnh / Acrylic 2 mảnh / Nhôm 2 mảnh). Case CAD giữ mount theo
  thiết kế thật. Case 2 mảnh vẫn gasket / top (nhôm, PC, acrylic) hoặc sandwich (mica).

### Đăng bán ở chợ, bán phím của khách, lỗi khi không test (2026-10-26)

- Yêu cầu: bán phím của khách 5% không bị phát hiện, lộ thì −1 uy tín, chuộc lại trên chợ (có tỉ lệ không cho chuộc "Không giữ, mất rồi
  đừng tìm") để trả khách, tăng uy tín; Hội Phím Cơ thêm mục mình đăng bài bán (đồ của khách, đồ trong kho), bot vào hỏi.
- `data/selling.ts` (`sourceValue` ~70% giá mới, lỗi 45%, phím khách ~95% budget; `botTurn`: đăng giá > 1.4× giá chợ thì hay bị chê,
  trả giá 60–105% giá chợ không quá giá đăng) + `store/sellSlice.ts` (post / unlist / botVisit / sellListing / buyBack / closeSellDay).
  Bot ghé mỗi 3,5s khi đang mở tab. Hết ngày (`nextDay` gọi `closeSellDay` trước khi gửi đơn) phím khách chưa bán trả về chờ gửi.
- Chuộc lại: giá ×1.3 giá đã bán, 30% bị từ chối (vụ đóng, mất phím), được thì +2 uy tín (bù −1 lúc lộ) và đơn về `packed` để gửi ở Mezzenger.
- Lỗi khi giao (yêu cầu: "không test trước khi giao có tỉ lệ lỗi ~5%; hàn không hết thì chắc chắn lỗi lúc test hoặc khách báo nút lỗi";
  "phải back về bước lỗi sáng vòng tròn để fix, hoặc cứ thế gửi"): xem CLAUDE.md mục Test phím. Bước hàn trước đây bắt hàn đủ mới qua
  được → giờ cho "Bỏ dở, còn N phím" (nút đỏ) khi đã hàn ≥ 1 phím.
- Chứng chỉ / sách phép bán ở chợ: caption là lý do pass ("Pass lại giấy phép vì cần tiền gấp"...) thay vì "nguyên nhám, ngoại quan đẹp" (`PAPER_LINES`).
- Mua dụng cụ / vật tư (`buyTool` / `buySupply`) không cộng `spent`, chỉ `buy` linh kiện mới tính vào budget đơn (đã thử trong game:
  mua cọ + Urgo, `spent` vẫn 0).
- Sửa (2026-10-26): mở Hội Phím Cơ bị văng "reading 'name'" với bản lưu thật — kho chung có món mà id không còn trong danh mục. `useSources` (MyListings) lọc `readable()` (thử `sourceTitle` / `sourceValue`, lỗi thì bỏ món đó).
- 2026-10-26, người dùng: "tỉ lệ ăn xin thành công lên 10%, fail ăn block 70%, còn ăn ban 20%" → `BEG_GIFT` 0,1 + `BEG_BLOCK` 0,7
  (người bán chặn inbox, không ban chợ), phần còn lại 20% bị admin ban 3 ngày như cũ (trước: 5% free, 95% ban).
- 2026-10-26, người dùng: chuộc lại phím đúng ra chỉ +1 uy tín → `BUYBACK_REP` 2 → 1 (gỡ lại đúng phần −1 lúc lộ). Bảng tỉ lệ:
  "Đòi đúng 1 con switch" → "Yêu cầu đúng loại switch"; phím chưa hàn = "không nhận tín hiệu" (toast test, nhãn chấm điểm, đánh giá khách);
  "Fs" ghi rõ free ship (bảng tỉ lệ + tooltip badge ở bài pass).

## Đợt chỉnh chợ + luật qua ngày + plateless / foam (2026-10-26, 0.1.9)

- **Qua ngày** (người dùng: "40 ngày vẫn 7.500k mà vẫn top cao... qua ngày mới phải nhận làm ít nhất 1 đơn, không làm thì khách report,
  đền 20% tiền công"): `nextDay` chặn khi hôm nay chưa nhận đơn nào, chưa làm / đóng gói đơn nào (`acceptedToday`, `worked`, `packed`)
  mà vẫn còn đơn chào (từ chối hết thì cho qua, đã bị trừ uy tín). Đơn đã nhận (đang làm + đang chờ) mà cả ngày không mua đồ / không
  thao tác build (`worked` ghi bằng subscribe trong `store/index.ts`: `build` đổi hoặc `spent` tăng khi cùng đơn) → khách report,
  đền `NO_WORK_FINE` 20% `labor` (notify). Session lưu `acceptedToday` / `worked`; save cũ coi các đơn đang có là đã làm.
- **Điểm xếp hạng** (`runScore`, `server/leaderboardCore.ts`): bỏ ngày; tiền chỉ tính lãi so với `START_MONEY` 7.500k (/100),
  uy tín ×20, sao TB ×20, đơn ×10 × sao TB / 5 (đơn làm ẩu ít điểm). Ngồi chơi 40 ngày = 0 điểm.
- Bỏ `equipSolder` / `undoSolderPurchase` gán nhầm trong `set()` của `nextDay` (đã ghi ở quy-trinh.md).
- **Hàng lỗi keycap / switch / stab** (`FLAW_UNUSABLE`, `unusable` trong parts.ts): `checkInventory` báo "Hàng lỗi... không lắp cho
  khách được"; `buyPost` mua phải món lỗi loại này thì cất thẳng vào kho chung (`spare.items`, switch lỗi không gộp với switch tốt),
  notify. App Kho: viền đỏ + badge "Hàng lỗi". Giá gốc khi bán còn 1 nửa (`sourceBase`). Bán hàng lỗi: `FLAW_CAUGHT` 10% bị tố mô tả
  sai → admin ban 3 ngày (`banMarket`). Case / PCB / plate lỗi vẫn như cũ (lắp được, −8 điểm).
- **Đăng bán** (`data/selling.ts`, `store/sellSlice.ts`, `MyListings`):
  - `sourceBase` = giá gốc (giá mới), `sourceValue` = giá chợ 70%. Bot trả giá quanh giá chợ (không ai trả trên giá chợ) → muốn lời phải
    đăng cao: giá trên giá chợ tới `RICH_MAX` 1,4× giá gốc thì **đêm** (`closeSellDay`) có `RICH_BASE` 15% + 5% / bậc thợ (+5% Fs) gặp
    đại gia chốt đúng giá, **tối đa 1 đại gia / đêm** (tránh mua Shopii bán lại kiếm tiền vô hạn).
  - `botTurn(l, cert)`: chê khi > `PRICEY` 1,2× giá gốc (35%, > 1,4×: 60%, −5% / bậc thợ), khen thợ khi có chứng chỉ, up bài ("Up cho
    chủ thớt", "wtx"...), hỏi han, trả giá. Tag bài `ListingTag` (Free ship / Price no offer / Lowball thoải mái / Bao test) hiện badge,
    đổi cách bot trả giá.
  - Bài bid (`Listing.bid`): giá khởi điểm từ 0, bước 10 / 50 / 100k, chạy `BID_MS` 60s; giá trần ẩn `bidCap` 45–125% giá chợ;
    bot bid nhảy tới ~30% khoảng còn lại; hết giờ `settleBids` (App.tsx gọi mỗi giây khi có bài bid, `closeSellDay` cũng gọi) bán cho
    người giữ giá, không mở tab thì giả lập bid ngầm, không ai bid thì trả món. Bid đã có người trả thì không gỡ được.
  - Linh kiện của đơn đã nhận (chưa build), kể cả món khách gửi, bán được như đồ thường (`ListingSource` kind `job`, bỏ cờ `provided`,
    gỡ bài thì trả lại đơn nếu ô còn trống, không thì kho chung).
  - Gỡ bài quá `UNLIST_FREE` 3 lần / ngày (`Profile.unlists`) → admin ban chợ. `banMarket(why)` dùng chung (ăn xin, gỡ bài, hàng lỗi),
    lý do lưu `Profile.marketBanWhy`, hiện ở màn bị ban.
  - Chuộc phím của khách: giá ×1,1 ~ ×1,3 (`buybackPrice`).
  - UI: bài thu gọn được (bấm tiêu đề), badge bid đếm ngược / tag / nguồn; số bài đăng là `Badge` (cả tab "Bài của tôi"); form đăng mở
    khi bấm "Đăng bán" (OptionSelect kiểu bán + bước bid, OptionChip tag). Chợ pass ghi thêm "Ai cũng uy tín cho đến khi...".
- Bảng tỉ lệ (`data/odds.ts`) cập nhật theo hằng số mới.

### Bán đồ trong đơn đang build + nút Đăng bán ở Kho (2026-10-26)

- Người dùng: "tại sao đồ trong kho không bán được, đồ của khách vẫn bán được trừ khi đã assem ở bàn build". Trước đây đơn đã vào
  bàn build là khoá hết linh kiện. Giờ `jobPartFree(cat, item, build)` (selling.ts): chưa build → mọi món (kể cả đồ khách gửi);
  đã build → chỉ switch lẻ còn lại (chưa cắm) và keycap khi chưa gắn phím nào; case / PCB / plate / stab đã nằm trên bàn thì chặn.
  Dùng ở `useSources` (MyListings), `postListing` + `restore` (sellSlice: gỡ bài thì switch cộng dồn lại vào đơn).
- App Kho: món bán được có nút "Đăng bán" (`Owned.sell`) → `openSell()` mở Hội Phím Cơ tab "Bài của tôi"
  (tab Hội Phím Cơ giờ ở store: `groupTab` / `setGroupTab`, metaSlice).
- Đổi tên "Bid 1 phút" → **Fast bid** (UI, toast, bảng tỉ lệ, README, changelog).

### Test xong phím → gửi khách, sao chỉ khi khách đánh giá, fast bid có bot (2026-10-26)

- Người dùng: "test phím xong hết phải thông báo phím xong rồi, gửi khách thôi → bấm OK tới phần tin nhắn để gửi". `TestDone`
  (BenchHud): bước `test` đủ phím + build đã xong các bước bắt buộc (`useBuildComplete`) → hộp "🎉 Phím đã xong rồi!", "OK, gửi khách"
  = `deliver()`; "Để sau" ẩn tới khi đổi đơn. Hội thoại Mezzenger đang mở giờ ở store (`messengerPick`), `deliver` đặt id đơn vừa
  đóng gói → mở thẳng hội thoại đó (cửa sổ hẹp vào khung chat luôn).
- "Phím của bạn xong rồi nè không hiển thị số sao, sao chỉ hiện khi khách đánh giá": bỏ sao ở tin nhắn đóng gói, toast đóng gói và
  `ResultCard` (Xem điểm chấm: chỉ còn bảng điểm, ghi "Số sao do khách chấm khi nhận hàng"). Toast khi gửi hàng + đánh giá vẫn có sao.
- "Đăng fast bid không thấy bot thả giá / comment": giá khởi điểm mặc định = giá chợ mà giá trần ẩn chỉ 45–125% giá chợ → ~40% bài
  không ai bid, và lúc đó `bidTurn` trả null (im lặng); bot lại chỉ ghé khi mở tab, chung lượt với bài giá cố định. Sửa: chọn Fast bid
  thì ô giá về giá sàn (`bidFloor` = 45% giá chợ, giá trần ẩn không bao giờ dưới sàn → khởi điểm ≤ sàn chắc chắn có người bid; vẫn hạ được tới 0đ); `bidTurn` khởi điểm cao quá thì chê (`BID_HIGH`), chạm trần thì "theo không nổi" (`BID_STOP`), 20% chỉ hỏi / up bài;
  `bidVisit` (sellSlice) mỗi bài ~35% / giây, App.tsx gọi cùng `settleBids` (chạy cả khi không mở tab). `botVisit` chỉ còn bài giá cố định.

## "Đã chi linh kiện" chỉ tính món trong đối chiếu (2026-10-26)

- Người dùng: "Đã chi linh kiện đang tính cả... dụng cụ thiếc hàn... chỉ tính trong phạm vi đối chiếu linh kiện, mua dư đâu có tính".
  Dụng cụ / vật tư vốn không cộng vào `spent`, nhưng `spent` cộng mọi lần mua linh kiện (món bị thay vẫn tính, switch / stab mua dư tính hết).
- Món linh kiện ghi giá đã trả `Paid` (`paid` / `paidN` trong types.ts, mọi `*Item`): `buy` ghi lên món, gộp cùng loại thì cộng dồn;
  `takeStock` / `fillFromStock` gộp thì giữ giá món đang có (switch / stab từ kho chung không mang giá).
- `partSpent(inv, order, spent)` (parts.ts): cộng `paid` các món đang nằm trong ô đối chiếu; switch / stab × min(1, cần / `paidN`)
  (cần = số phím / `stabNeed`). Món không có `paid` (khách gửi, lấy kho chung) = 0. Save cũ chưa món nào có `paid` thì dùng `spent`.
  Dùng ở app Chi tiết đơn (`OrderApp`) và `deliver` → `scoreDelivery` (chấm "trong ngân sách"). `spent` vẫn giữ làm tổng tiền thật đã chi.

## Lỗi vào build: `inventory.switch` null (2026-10-27)

- Người dùng: "bị lỗi const swType = useGame((s) => s.inventory.switch!.type) khi vào build ... Cannot read properties of null".
- Nguyên nhân: 0.1.10 cho bán đồ của đơn đang build (`postListing` kind `job`, sellSlice `drop`): bán lô switch thì ô switch thành `null`
  dù build còn (bàn lube, switch đã cắm, chấm điểm đều đọc `inventory.switch!.type`).
- Sửa gốc: `drop` (sellSlice) đơn đã có build thì switch về `{ ...item, count: 0 }` (giữ loại). Save đã hỏng (switch null giữa build):
  `LubePanel` hiện Alert "Hết switch" + nút bỏ qua, `LubeStation` không vẽ, `lubeBatch` / lắp switch / `deliver` báo hết / thiếu switch
  thay vì vỡ. Mua switch mới thì chạy lại bình thường.

## Chọn loại switch cho đơn, không tự dùng lô mua cuối (2026-10-27)

- Người dùng: "nếu khách ko yêu cầu thì sẽ auto hiển thị option sw có sẵn trong kho để chọn loại mình muốn => hiện tại sw nào mua cuối
  cùng thì sẽ auto dùng cho đơn => sai".
- `buy` (shopSlice): đơn đã có switch dùng được (không lỗi, còn con, `switchOk`) hoặc board đã cắm switch mà mua loại khác → lô mới vào
  kho chung (giữ giá), không thay switch của đơn (bỏ luôn lỗi "Board đã cắm switch loại khác" khi mua). Toast báo đổi ở Chi tiết đơn.
- Kho chung giữ tiền switch: `Spare.switchPaid` (loại → { paid, n }); `addPart` cộng vào, `takeSwitches` (lấy ra kèm giá, gộp cùng loại)
  dùng ở `buy` / `takeStock` / `fillFromStock`, `dropSwitch` khi bán ở chợ. Switch dư sau khi giao vào kho không mang giá (`leftoverSpare`).
- App Chi tiết đơn: `SwitchPick` dưới dòng Switch (đơn đang làm, khách không đòi đích danh `switchType`, chưa cắm switch nào):
  `OptionSelect` các loại đang có (đơn + kho chung, hợp `switchOk`) kèm số con → `takeStock`. Chạy thử (playwright, store): mua A 700k
  rồi B 1.400k → B vào kho; chọn B "Đã chi" 940k, chọn lại A 470k (layout 47/70 con).

## Foam PCB: khách yêu cầu thì bắt buộc, không thì tuỳ chọn (2026-10-27)

- Người dùng: "ở bước lót foam lên pcb không phải yêu cầu thì mới làm còn không thì bước này là option có thể tiếp tục or bỏ qua".
- `Order.foam?: true` (types.ts): ~25% đơn (`orders.ts`, +60k vào budget, khách nhắn "Lót giúp mình tấm foam Poron..."), OrderSpec dòng
  "Foam PCB". `isOptionalStep(step, order)` (steps.ts) thay `OPTIONAL_STEPS.includes`: đơn có `foam` thì bước `foam` bắt buộc (nextStep
  buildSlice, Objective + `useBuildComplete` BenchHud, độ hoàn chỉnh `scoreDelivery`); `stepTitle` ghi "Lót foam PCB (khách yêu cầu)".
  Chấm thêm "Lót foam PCB như khách dặn" 5 điểm. Đơn đòi foam thì không bật plateless (`setPlateless` + Toggle ở Chi tiết đơn).

### Ảnh đơn keycap 1 màu (2026-10-27, "ảnh keycap khách gửi đơn là alpha xanh và mod trắng, nhưng lúc vào build thì toàn bộ là màu xanh")

- `orderSpec` (`messenger/orderThumb.ts`) bốc màu nhấn ngẫu nhiên cho phím chức năng (50% màu chữ, 50% màu keycap khác) chỉ để ảnh đẹp,
  nhưng đơn chỉ có `keycapColor`, bộ keycap Shopii 1 màu cả bộ và bàn build vẽ 1 màu → ảnh đơn / cửa sổ xem 3D (`OrderViewer`) lệch với lúc build.
  Sửa: `accent = KEYCAP_COLORS[keycapColor].hex` (mod cùng màu alpha). Không đổi case / màu case của ảnh (`orderLook` vẫn bốc như cũ).
  Kệ trưng bày (`ShelfDisplay`) và ảnh case Shopii (`caseSpec`) vẫn phối màu nhấn vì không gắn với đơn.

### Danh sách đơn: tiền công + tiền dư linh kiện (2026-10-27, "số tiền hiển thị ở danh sách đơn đang sai: đáng lẽ tính số tiền công + số tiền dư khi mua đủ linh kiện ... tách nhau bằng dấu +")

- `OrderCard` (bàn build `OrderPicker` + app Danh sách đơn) cột phải trước chỉ hiện `labor`. Giờ = `labor` + `leftover()`:
  tiền dư = `budget − partSpent(inventory, order, spent)` (cùng cách tính "Đã chi" ở Chi tiết đơn, đồ khách gửi không có giá nên không tính),
  chỉ hiện khi đơn đủ linh kiện (`checkInventory` không thiếu) hoặc đã vào build; chưa đủ thì chỉ tiền công. Mỗi số `font-head text-xl` xanh,
  cách nhau dấu `+` muted; mua lố budget thì dấu `−` + số đỏ. Tooltip ghi rõ 2 khoản; hàng tiêu đề cột "Tiền công + dư".

### Danh sách đơn: dòng trạng thái + khách huỷ kèo vì bị bán đồ (2026-10-27)

Người dùng: "sửa lại thành hiển thị 2 text là đủ linh kiện và không đủ linh kiện, sẽ có trường hợp thêm 1 status đặc biệt khi đã nhận đơn
mà cố tình đem bán đồ của khách trên chợ mà khách vô tình phát hiện được thì status ở danh sách đơn là: khách huỷ kèo vì phát hiện bạn bán đồ của khách".

- `OrderCard`: dòng phụ dưới tên (trước: layout · kit · % build / thiếu món) chỉ còn "Đủ linh kiện" (xanh; đã vào build cũng tính đủ) /
  "Không đủ linh kiện" (vàng) / "Khách huỷ kèo vì phát hiện bạn bán đồ của khách" (đỏ, thẻ mờ, ẩn nút hành động + tiền dư + thanh tiến độ).
  % build vẫn xem ở thanh tiến độ.
- Cơ chế mới (trước đây bán đồ khách gửi của đơn đã nhận không bị gì): `completeSale` bài kind `job` có `provided` → 5% `STEAL_OK` thoát
  (cùng tỉ lệ bán phím của khách), còn lại `soldCancel`: gắn `Order.cancel = 'sold'`, đơn đang ở bàn build thì cất thành job (`stashActive`
  export từ shopSlice) + trả bàn trống; −`CANCEL_REP` (3, cùng mức khách huỷ vì trễ hạn) uy tín, `soldReview` 1★ (kind `cancel`), `notify`.
  Đơn huỷ vẫn nằm trong `jobs` tới `nextDay` (bỏ khỏi `jobs`, đồ shop mua cất kho chung `stashAll`, không phạt `NO_WORK_FINE`, không tính
  huỷ trễ hạn lần nữa); `switchJob` chặn. Mezzenger: hội thoại đó dấu HUỶ (thẻ mờ), tin khách giận, nút "Khách đã huỷ kèo đơn này" mờ,
  nằm ở mục lọc Huỷ. Bán tiếp đồ của đơn đã huỷ không phạt thêm. Đồ khách gửi còn lại mất khi sang ngày (khách lấy về).

### Fast bid hết giờ không tự bán (2026-10-27, "bài bid sau khi xong ko phải auto bán luôn => để lại => có thể bùng bid => bị ban")

- `settleBids`: trước hết giờ là `completeSale` luôn cho người giữ giá. Giờ có người thắng (kể cả bid ngầm khi không mở tab) thì gắn
  `Bid.ended` + `top`, toast báo người thắng, bài đứng lại trong "Bài của tôi"; không ai bid thì vẫn trả món về như cũ.
- `closeBid(id)`: chốt bán cho người thắng (`completeSale`, như cũ: tiền, hàng lỗi có thể bị tố, phím / đồ của khách có thể bị lộ).
  `bailBid(id)`: bùng, món về chỗ cũ (`restore`) + `banMarket` (ban chợ `BAN_DAYS` ngày, lý do ghi người thắng + giá).
- Bài đã hết giờ không còn lượt bot bid (`bidVisit` bỏ qua), không gỡ được (đã có `top`), đại gia đêm không đụng bài bid; để qua đêm vẫn chờ.
- `ListingCard`: nhãn "Fast bid xong · chờ chốt", "X thắng bid", 2 nút "Bùng bid" (đỏ, tooltip báo bị ban) / "Chốt bán …k cho X" (xanh).

### Fast bid: bình luận riêng + giá BIN (2026-10-27)

Người dùng: "fast bid sao lại comment là còn ko ạ? còn thì người ta mới bid chứ => xoá đi; tương tự: ib chốt giá nhé là sai => 1 số người muốn có
giá BIN nghĩa là giá chiến thắng, người đăng có thể thêm giá BIN => có người BIN thì dừng comment, bài bid dừng time luôn" + thêm câu bình luận.

- `bidTurn` (data/selling.ts) bình luận lấy `BID_CHAT` thay `QUESTIONS + UPS`: bỏ "Còn không bác?", "Ib em giá chốt nhé" (bài giá cố định
  vẫn giữ). Thêm câu: "Up phụ", "Em đẹp nhưng không với tới được", "Lúc có tiền thì không ai bán" (vào `UPS`, dùng cả 2 loại bài),
  "Sống vội vậy chủ thớt" (chỉ fast bid).
- Giá BIN: `Bid.bin` (ô "BIN" khi đăng fast bid ở `SourceRow`, 0 = không đặt, phải > khởi điểm). `bidTurn`: BIN ≤ giá trần ẩn thì lượt bid
  tới / qua BIN thành "BIN …k", 12% / lượt có người BIN sớm; BIN > giá trần thì không ai BIN. `bidVisit` gặp BIN: `top` = người BIN,
  `ended` + `binned`, `endsAt = now` (dừng giờ, hết bình luận vì `bidTurn` bỏ qua bài `ended`) → chờ `closeBid` / `bailBid` như hết giờ.
  Bid ngầm lúc hết giờ (`settleBids`) chạm BIN thì lấy đúng giá BIN.
- `ListingCard`: nhãn xanh "BIN …k" khi đang chạy, "Có người BIN · chờ chốt" / "X đã BIN" khi xong.
- Lỗi (người dùng: bấm chi tiết đơn bị huỷ kèo → "Uncaught TypeError: Cannot read properties of null (reading 'id')"): đơn đã chọn mount
  (chưa build) mà case / PCB khách gửi đã bị bán → `inventory.case = null`, `buildContext` đọc `inv.case!.id`. Thêm `contextFor()` (steps.ts:
  thiếu mount / case / PCB thì null), dùng ở `OrderCard` (`useProgress`) + `OrderDetail` (OrderApp). Các chỗ gọi `buildContext` trong store
  chỉ chạy khi đã có `build` (case / PCB đã lên bàn, không bán được) nên giữ nguyên. Lỗi có cả ở đơn thường bán case / PCB sau khi chọn mount.

## Shopii hẹn ngày giao: kiện hàng chờ ở cửa (2026-10-28)

- Người dùng: "bây h mua hàng phải hẹn ngày giao hàng: giao hàng nhanh thì giá cao hơn, giao hàng chậm thì giá sẽ thấp hơn".
  Game chuyển sang kiểu PC Building Simulator (đi lại trong phòng): phiên này làm dữ liệu + store + UI Shopii, phiên khác làm cảnh 3D
  (thùng hàng ở cửa phòng, bấm để nhận → `pickupParcel(id)`).
- `src/data/shipping.ts`: `ShipSpeed` = `express` (Hoả tốc, tới cửa trong ngày, ×1.25) / `fast` (Nhanh, ngày mai, ×1) / `saver`
  (Tiết kiệm, sau 2 ngày, ×0.9) trong `SHIP_SPEEDS` (+ `SHIP_ORDER`); `shipPrice` (làm tròn k như giá sale, tối thiểu 1k), `arriveDay`,
  `arriveText` ("Hôm nay" / "Ngày X"), `arrivedParcels(parcels, day)` (arrive ≤ day), `toolOnWay` (dụng cụ đang giao), `parcelId`.
- `types.ts`: `Parcel { id, ordered, arrive, speed, label, items, job? }`, `ParcelItem` = part { cat, item, price } / supply { id, n, price } /
  tool { tool, level, price } (`price` = tiền đã trả sau hệ số). `Profile.parcels` (START [], `snapshot()`, `SAVED_KEYS`; save cũ thiếu
  thì `...START` cho [] nên không nâng rev).
- `shopSlice`: `orderParcel(item, speed)` kiểm tra như mua cũ (linh kiện: `partBlock` = có đơn đang làm, món khách không gửi, chưa vào
  build với case / PCB / plate / stab; dụng cụ: `toolBlock` = chưa có, không đang trên đường giao), trừ tiền ngay (`item.price` × mult),
  tạo kiện (linh kiện ghi `job` = đơn đang làm, đánh dấu `worked`). `pickupParcel(id)` chỉ nhận kiện đã tới (`arrive <= day`):
  linh kiện mà đơn `job` vẫn đang làm (và `partBlock` cho phép) thì `receivePart` (thân `buy` cũ, tách ra hàm ngoài) — không thì cất kho chung
  (`addPart`, giữ `paid` / `paidN`) rồi `fillActive()`; vật tư cộng `supplies`; dụng cụ cấp như `buyTool` (mỏ hàn: thêm `solderOwned`, dùng luôn),
  đã có bản đó / tốt hơn (vd mua tay ở chợ lúc chờ) thì Shopii hoàn tiền. `cancelParcel(id)`: kiện đặt trong hôm nay (chưa nhận) huỷ được,
  hoàn đủ — thay cho "hoàn tác mua máy hàn" ở Shopii (đặt hàng không đụng `lastSolderPurchase`; undo đó giờ chỉ còn cho `buyTool` tay ở Hội
  Phím Cơ). `nextDay` báo `notify` "📦 Có hàng tới cửa" các kiện tới đúng hôm nay; kiện không tự nhận.
- Giữ nguyên nhận ngay: `buy` / `buySupply` / `buyTool` (Hội Phím Cơ `buyPost`, test `scripts/solder-purchase.test.ts`), đăng bán, `devBuild.ts`.
- UI: `ProductCard` chọn tốc độ giao bằng 3 `OptionChip` (tooltip mô tả + giá), giá hiện đã nhân hệ số, dòng "Giao tới cửa: Hôm nay / Ngày X",
  nút "Đặt mua"; tốc độ chọn lần trước nhớ cho thẻ khác (biến module); dụng cụ đang giao thì nút "Đang giao" (mờ). `onBuy(product, opt, qty, speed)`,
  speed null = chỉ đổi mỏ hàn đã có. Shopii cột trái thêm `TabChip` "Đơn đang giao" (đếm kiện) → `ParcelList.tsx` (khuôn bảng xếp hạng: tên kiện,
  tốc độ, ngày tới / "Đã tới cửa — ra cửa nhận" dòng viền vàng, nút Huỷ kiện đặt hôm nay, tiền đã trả xanh bên phải).
- `ModPanels` `SolderPanel`: nút bút / trạm hàn chưa có giờ bấm được = đặt Hoả tốc (`orderParcel(..., 'express')`) + toast nhắc ra cửa nhận;
  đang giao thì mờ. `ToolWarn` ghi "(đang giao...)" khi dụng cụ thiếu đã đặt. `OrderPicker` (EmptyBenchHud) đồ thiếu đã đặt cho đơn đó ghi
  "đang giao, tới cửa thì ra nhận". Guide: mẹo `parcel` (có kiện ở cửa), mẹo `parts` + câu `PICK` nói đặt Shopii / tốc độ giao.
- Chưa làm (phiên cảnh 3D): thùng hàng ở cửa + gọi `pickupParcel`. `lossReason` (thua vì hết tiền) chưa tính tiền đã trả cho kiện đang giao
  (kiện linh kiện cần đơn đang làm nên lúc "rảnh tay" hiếm khi còn).

## Mua linh kiện không bị chặn nữa (2026-10-28)

- Người dùng: "sao có msg khách đã gửi món này khi tôi mua sale ... khách gửi kệ khách, mua thì có tiền cứ mua ai cấm".
- `partBlock` (shopSlice) giờ chỉ quyết định món **vào thẳng đơn đang làm** hay **cất kho chung**, không chặn mua nữa:
  - Shopii `orderParcel`: món vào được đơn thì kiện gắn `job` (nhận vào đơn), không thì kiện không gắn đơn → nhận xong cất kho chung.
  - Mua ngay (`buy`, chợ Hội Phím Cơ qua `buyPost`): trả tiền, vào đơn nếu được, không thì `addPart` kho chung (giữ `paid`).
  - Lý do cất kho: khách đã gửi món đó trong kit, đơn đã bắt đầu build (case / PCB / plate / stab), chưa nhận đơn nào.
- Bài pass Hội Phím Cơ vẫn 1 bài = 1 món (mua xong `sold`), đó là đồ cũ duy nhất. `takeStock` (lấy từ kho vào đơn) vẫn chặn đúng như cũ.
- Món đang sale chỉ mua được 1 lần (người dùng: "mỗi món sale chỉ mua được 1 lần, mua xong disable"): `Profile.saleBought`
  `{ day, ids }` (START, snapshot, `SAVED_KEYS`; sang ngày khác thì danh sách cũ hết hiệu lực). Shopii `onBuy` đặt được hàng
  (`orderParcel` 'ok') mà sản phẩm có `sale` thì ghi `product.id`; `ProductCard` khoá nút "Đã mua sale" (tooltip giải thích).
  Tính theo sản phẩm Shopii (case gộp dòng = 1 sản phẩm: mua 1 option là hết lượt cả dòng). Đã thử trên trình duyệt (ngày 3).
