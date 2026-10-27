# Dụng cụ, chứng chỉ, lube

## 2026-10-24

### Độ bền dụng cụ

- `ToolDef.life`, đếm ở `wear`, `wearTool(kind)`; hết thì về bậc 0.
- Bút hàn 300, trạm hàn 1000, bùi nhùi 1000, cọ lube 1000 (trừ ở modStab housing / wire, `lubeBatch`, `lubeSprings`).
- Cọ lube chỉ còn 1 loại (SAVE_REV 2 kẹp bậc cũ).

### Chứng chỉ thợ (`TOOLS.cert`)

- Thợ lõ n = 1 (mặc định), middle 5000k n = 5, senior 10000k n = 10.
- `installRun` dùng `TOOLS.cert[..].n` = số phím mỗi lần lắp switch / keycap.
- Mẻ lube = min(opener.n = 99, cert.n).
- Đã bỏ jig / bàn ép switch & keycap; bàn mở 25 ô cũng bỏ.
- Mục Shopii riêng "Chứng chỉ thợ" (`ShopCategory` 'cert'; itemName, buyPost, onBuy, ProductImage đều xử lý).
- Khung `diploma_frame.glb` qua `createDiploma(scene, rank)` (`src/scene/models/diplomaModel.ts`), giấy vẽ canvas.
  Treo tường trong `Room.tsx` (component `Diploma`) và làm ảnh Shopii.

### Tua vít điện

- Model thật `public/models/tools/electric-screwdriver.glb` (từ `assets/community/hand-tools/`, `bun run convert:hand-tools`):
  đã gộp transform, trục mũi = +y, mũi ở gốc, tay cầm chĩa +x, dài 1,45u.
  Node `bit` (mũi + đầu kẹp) quay khi vặn, `body` đứng yên.
- Dùng ở: `ElectricScrewdriver` (HandTools, lúc vặn vít + đổi đầu vít), hộp đồ nghề trong Room (nằm nghiêng,
  scale 3.6 / M), ảnh Shopii (`tool === 'screw'` trong modelThumb).
- Sửa hiệu ứng vặn (2026-10-26): tua vít điện 1 click là xong nên vít hết tương tác ngay → mất hover → tua vít ẩn sau 350ms,
  ốc nhảy thẳng tới cuối và chỉ xoay 2.2 rad, gần như không thấy gì. Giờ (`Screw.tsx`): tiến độ hiển thị chạy dần trong
  `SPIN_MS` (HandTools: tay 250ms / điện 700ms), ốc xoay `SCREW_SPIN` (tay 6.6, điện 28 rad) + lún / trồi theo đó, tua vít giữ
  hiện (`busy`) tới khi quay xong, ốc tháo ra chỉ bay đi sau lần quay cuối. `BitDriver` điện: thân đứng yên, chỉ đầu kẹp
  (node `bit`) + đầu vít quay (trước cả cây quay như chong chóng).
- Sửa hiệu ứng tua vít tay (2026-10-26, "hiệu ứng vặn vít thường đang bị sai, có vẻ apply hiệu ứng tua vít điện"): tay cũ giật 90°
  trong 250ms (lerp nhanh, trông như motor) trong khi ốc xoay 2.2 rad / nấc → lệch nhau. Giờ `useSpin` (HandTools) nhánh tay:
  `SPIN_MS.manual` 550ms, xoay đúng `MANUAL_TURN` = `SCREW_SPIN.manual` / số click (chuyển `SCREW_SPIN` từ Screw.tsx sang HandTools,
  dùng chung) theo cùng đường cong ease với ốc, nhấn xuống + nghiêng cổ tay nhẹ giữa nhịp; nhánh điện giữ nguyên.
- Đổi đầu vít: tua vít nằm trên bàn (`DeskTools`, Room) ẩn trong `BIT_SWAP_MS` (1,3s, cùng lúc `BitSwapPreview` hiện tua vít
  cạnh bàn), xong mới hiện lại trên bàn.

### Lube switch — mở switch trước

- Đồ mở `public/models/tools/mx-opener.glb` (STL, mm, căn tâm, đáy y = 0, màu đỏ).
- `build.opened` (optional; bản lưu cũ coi như = `lubed`). Action `openSwitch()`: 1 click = 1 switch, hoạt cảnh
  `lubeAnim.kind = 'open'` 0,7s.
- `lubeBatch` chỉ lube switch đã mở (`opened - lubed`); chưa mở thì báo "Mở switch bằng đồ mở trước".
- Bàn lube: `SwitchOpener` ở `OPENER_AT = (4.6, TABLE, -3.4)` (các chỗ khác bị HUD che hoặc ra ngoài khung),
  chữ "Còn n switch chưa mở". Bộ phận đã tách chỉ bày khi có switch đã mở chờ lube.
- LubePanel: 3 mục — 1 Mở switch, 2 Lube switch, 3 Lube lò xo.

### Khác

- Lọ dầu `createOilBottle` / `isOil` trong `lubeJarModel.ts` (LubeStation + ảnh Shopii).
- Switch Kailh Box (2026-10-25): Box Đỏ (linear), Box Nâu (tactile), Box Trắng + Box Jade (clicky thanh click) trong `SWITCHES`;
  model 3D dùng chung switch MX (chưa có model stem hộp riêng).
- Phép lube switch (2026-10-25): mục Shopii mới "Sách phép" (`ShopCategory` `spell`); phép lưu như vật tư (`SUPPLIES.spellLube`,
  `SupplyDef.spell = 10`, gói 200 lần / 800k, mua nhiều cộng dồn) để dùng lại `buySupply` / `useSupply` / Kho. Mỗi lần mở
  (`openSwitch`) và mỗi mẻ lube (`lubeBatch`) = bậc thợ + 10 (`spellBonus`), dùng chung lượt, chỉ trừ 1 lượt khi số con vượt
  bậc thợ. `openSwitch` giờ cũng mở theo bậc thợ (trước luôn 1 con). Ảnh Shopii / Kho: cuộn giấy da dựng bằng code
  (`scene/models/scrollModel.ts`, `createScroll`). Câu hướng dẫn: "tách housing, stem và lò xo, mỗi lần N con" (ModPanels).
- Tách 2 phép (2026-10-25, người dùng: "phép lube sw và phép mở sw bán riêng ko chung nhau"): `spellOpen` (Phép mở switch) cho
  `openSwitch`, `spellLube` cho `lubeBatch`, mỗi loại 200 lần / 800k, lượt riêng; `spellBonus(supplies, id)`.
  Mở nhiều con mỗi lần (bậc thợ / phép mở) thì bàn lube bày đúng số đồ mở, tối đa 10 (`openerSlots`: lưới 5 cột góc phải sau,
  thu nhỏ 0.7, x 3.7…6.7, z −5.3 / −4.55), mỗi cái 1 switch nguyên (`OpenerSlot`); 1 con thì giữ 1 đồ mở ở `OPENER_AT`.
- Phép lắp switch (2026-10-25): `spellAssem` (200 lần / 800k) cộng 10 switch mỗi lần lắp (`installRun`, chỉ kind switch,
  cùng hàng phím như chứng chỉ thợ), trừ 1 lượt khi số con lắp vượt bậc thợ. Keycap không có phép.
- Phép hàn switch (2026-10-25, "1 lần hàn được 10 con"): `spellSolder` (200 lần / 800k). `solderKey` hàn đạt (không cháy, kể cả
  không dính `burnChance`) thì hàn luôn 9 phím chưa hàn kế tiếp theo thứ tự hàng → cột (vòng lại đầu), mỗi phím vẫn tốn 2 mối thiếc,
  thiếu thiếc thì hàn ít hơn; trừ 1 lượt khi có phím kèm. Phím kèm luôn đạt, độ bền mỏ hàn chỉ trừ 1 lần.
- Phép hàn cháy cả hàng (2026-10-25, "hàn cháy cũng sẽ cháy luôn 1 hàng 10 cái"): `solderKey` dùng phép cả khi cháy, 9 phím kèm
  cùng trạng thái `burnt` với phím chính (thay quyết định cũ "phím kèm luôn đạt"); toast báo số phím cháy.
- Phép rã hàn (2026-10-25): `spellDesolder` (200 lần / 800k). `desolderKey` hút phím cháy + 9 phím cháy kế tiếp (`spellSolderKeys`
  với điều kiện "chưa cháy" = bỏ qua), trừ 1 lượt khi có phím kèm, bút hút trừ độ bền 1 lần. Rê chuột vào phím cháy thì viền sáng
  các phím sẽ hút ké (`lightFrom`, SolderPad.tsx).
- Phép lắp keycap (2026-10-25): `spellKeycap` (200 lần / 800k), `installRun` kind keycap cộng 10 vào bậc thợ (thợ lõ 1 / middle 5 /
  senior 10 → 11 / 15 / 20 cùng hàng), trừ 1 lượt khi số cái lắp vượt bậc thợ (gộp chung nhánh với phép lắp switch).
- Phép thay / cộng theo bậc thợ (2026-10-25, "thợ lõ mua sách phép thì mặc định là 10, không phải 1 + 10 = 11"):
  `spellRun(certN, bonus)` trong supplies.ts — thợ lõ (n = 1) có phép = 10, middle / senior cộng dồn (15 / 20). Áp cho mở
  (`openSwitch`), lube (`lubeBatch`), lắp switch / keycap (`installRun`), ModPanels + LubeStation (số đồ mở). Phép hàn / rã hàn
  vẫn đúng 10 phím.

## Mũi tên bàn lube: mở hết switch rồi mới chỉ lube (2026-10-26)

- Người dùng: "chưa mở hết sw đã có mũi tên vàng chỉ vào sw để bấm lube". `hint` trong `LubeStation`: trước đây đủ 1 mẻ là chỉ lube.
  Giờ thứ tự: còn switch chưa mở (và có đồ mở) → chỉ đồ mở; mở hết → chỉ con chưa lube đầu tiên; lube xong → hộp lò xo.
  Không có đồ mở thì vẫn chỉ lube các con đã mở. Bỏ biến `batch` không dùng nữa.

## Đổi tua vít tay / điện thoải mái + tua vít tay vẽ bằng code (2026-10-26)

- Người dùng: "đoạn bắt vít cho đổi dụng cụ thoải mái, không nhất thiết dùng loại xịn nhất; viền vàng bấm vào để swap".
  `Profile.screwPick` (null = loại xịn nhất đã mua), `screwLevel(tools, pick)` (parts.ts), `setScrewPick` (buildSlice).
  Đổi được ở 2 chỗ: ô dụng cụ trên khung hướng dẫn (viền vàng, "⇄") và cây tua vít còn lại bày cạnh trên bàn (`DeskTools` trong
  Room.tsx, `Clickable` viền vàng khi rê).
- Tiến độ vít tính theo nấc tua vít tay `SCREW_FULL` = 3: tay mỗi click +1, điện 1 click = đầy → đổi giữa chừng không lệch.
  `stepProgress` / chấm điểm / StepList / OrderCard dùng `SCREW_FULL` (bỏ `TOOLS.screw[tools.screw].clicks`). Save rev 7
  (`fillScrews`): bản cũ có tua vít điện thì vít ≥ 1 click thành đầy.
- "Tua vít thường vặn lỗi, đầu tua vít không đúng → tự vẽ model": bỏ model Poly Haven (lưỡi dẹt cố định, không khớp đầu vít đang chọn).
  `ManualScrewdriver` (HandTools.tsx) vẽ bằng code: đầu kẹp lục giác (đầu vít `DriverBit` theo loại đang chọn cắm vào), thân thép,
  cán nhựa đỏ 6 rãnh + đệm cao su đen; người dùng muốn cán dài hơn → cán 0,66 (tổng ~1,35u). Bàn build cũng dùng model này
  (bỏ `MODELS.screwdriver`). File `public/models/room/screwdriver-lite.glb` + script `convert:screwdriver-lite` giữ lại, không còn dùng.

## Khay đựng ốc (2026-10-27)

- Người dùng: "vít sau khi vặn ra khỏi case sẽ bỏ trên 1 cái khay... tự vẽ model rồi nhét vào bán trong shopii với giá 500k => không
  tăng chỉ số gì... ko mua thì bỏ lộn xộn trên bàn" (ảnh mẫu khay nhôm giọt nước Deadline Studio); sau đó: rãnh phải lõm thật, khay nhiều
  màu đổi được sau khi mua, dời ra góc sau bên trái thảm (đang chồng lên case), khay ban đầu trống + ốc đúng cỡ / độ dài ốc trên case.
- Tool `screwTray` (types.ts `ToolKind`, `TOOLS.screwTray` 500k, nhóm Shopii "Lắp ráp", START.tools, `TOOL_KINDS`). Không tăng chỉ số.
- Model three thuần `scene/models/screwTrayModel.ts` (`createScrewTray(color)`): giọt nước (cung R + tiếp tuyến tới cung bo mũi), lòng
  chảo Lathe + đáy phẳng, lỗ treo ở mũi, 3 rãnh viên thuốc khoét xuyên thân + đáy rãnh ở sâu `SLOT_D` (rãnh nằm gọn giữa vành: chạm lỗ
  lòng chảo / mép ngoài thì tam giác hoá vỡ). `bowlY(r)` = cao độ mặt lòng chảo. Ảnh Shopii: khay trống (modelThumb).
- Màu: `TRAY_COLORS` (parts.ts: bạc / đen / nâu / đỏ / xanh dương / vàng đồng / tím), `Profile.trayColor` (snapshot + SAVED_KEYS),
  bấm khay trên bàn (`Clickable`) → `nextTrayColor` (buildSlice) đổi màu kế tiếp + toast.
- Cảnh `scene/parts/ScrewTray.tsx` (Bench `Workbench` cạnh `Assembly`): ở [−width/2 + 1,5, mặt thảm, −depth/2 − 4] (góc sau trái).
  Số ốc = ốc `caseOpen` đã tháo hết − ốc `caseScrew` đã bắt lại. Ốc vẽ bằng `LooseScrew` (Screw.tsx): cùng GLB + cỡ + thân ren dài
  (case mica vít trên: `Y.caseTop − Y.floorBot − 0,06` như `ScrewSet`) với ốc bước tháo, nằm ngang tì đầu ốc (`HEAD_R`), `screwLength`.
  Có khay: xếp song song, đầu so le, hàng ngoài nâng theo `bowlY`; không khay: vương ngẫu nhiên (cố định theo thứ tự) quanh chỗ đó.
- Sửa (2026-10-27, người dùng: "chưa tháo vít xong mà khay ốc đã tăng số lượng... bấm tháo ốc cái đã tăng lên rồi"): tua vít điện 1 click là
  đủ nấc ngay nên khay đếm liền. `ScrewTray` giữ `landed`: ốc chỉ vào khay sau `SPIN_MS` + `OUT_MS` (Screw.tsx export) = lúc hoạt cảnh
  quay + ốc bay ra khỏi lỗ xong; ốc đã tháo sẵn lúc vào bàn có luôn, hoàn tác bỏ ra ngay (hẹn giờ 0, không setState trong effect).

## Feet cao su nhiều màu, gộp 1 sản phẩm (2026-10-27)

- Người dùng: "feet chỉ khác mỗi màu sắc vì vậy đưa vào chung thêm option là được, thêm nhiều màu feet khác nhau".
- supplies.ts: `FEET_COLORS` (đen / trắng / xám / trong / đỏ / xanh dương / xanh lá / hồng / vàng / tím) → `feetDefs()` sinh vật tư
  `feet*` (vỉ 4 cái 25k), `FEET_IDS` lấy từ đó (id cũ feetBlack / feetWhite giữ nguyên, save cũ không vỡ).
- Shopii (`shopProducts`, parts.ts): bỏ feet khỏi vòng vật tư, thêm 1 sản phẩm `sup-feet` "Feet cao su", option = màu ("Đen · 4 cái").
  Ảnh sản phẩm vật tư theo option đang chọn (ProductImage `type` = id vật tư của option) → feet đổi màu theo option.
- Cảnh: màu feet = `SUPPLIES[id].color` (bỏ bảng `FOOT_COLOR` trong Case.tsx). `FeetPanel` chỉ hiện màu đang có trong kho + màu đang chọn.

## Dây O-ring 3 độ cứng (2026-10-27)

- Người dùng: "thêm model dây oring 3 độ cứng: trắng là 30A => đen là 50A => đỏ là 70A, thêm vào shopii và đơn hàng khách yêu cầu"
  (ảnh dây O-ring silicon nhiều màu).
- Vật tư `oring30` / `oring50` / `oring70` (supplies.ts `ORING_DEFS` → `oringDefs()`, `SupplyDef.oring.shore`, `ORING_IDS`), 1 vòng 30k
  / 5 vòng 120k. Shopii gộp 1 sản phẩm "Dây O-ring silicon" (vòng gộp chung với feet trong `shopProducts`: mảng `merged`), option
  "30A (trắng) · 1 vòng"; ảnh = 2 vòng torus đúng màu (`createORings`, modelThumb). Nhóm lọc "Dây O-ring".
- Bước `ring` (O-ring / OG mount): `wrapRing` trừ 1 vòng `oringPick` (shopSlice, mặc định 50A), `build.ring` = id dây (save cũ `true` =
  50A). `RingPanel` (ModPanels, BenchHud) chọn độ cứng + số còn + nhắc khách đòi; `SiliconeRing` tô màu dây. Âm (`soundProfile`
  `ring`): lệch theo Shore so với 50A (loud ±0,0025 / pitch ±0,003 mỗi A: 30A êm trầm, 70A chắc cao).
- Đơn: `Order.oring` — đơn kit gửi case O-ring / OG mount 60% dặn độ cứng; đơn mua đủ (không đòi đích danh case) ~12% đòi luôn
  `mount = 'oring'` + độ cứng (budget +30k). Khách nhắn câu dây O-ring, OrderSpec có dòng Mount + "Dây O-ring". `checkInventory` case
  phải làm được `order.mount`; mua case thì tự chọn mount khách đòi (`firstMount(..., want)`). Chấm "Dây O-ring … như khách dặn" 5 điểm.
  Chạy thử 400 đợt đơn: ~15% đơn có `oring`; bước ring trừ vật tư + vòng trắng quanh board (ảnh).
