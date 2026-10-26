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
