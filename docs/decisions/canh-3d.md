# Cảnh 3D & model

## 2026-10-24

### Sửa lật gương case

- `scripts/convert-user-cases.mjs`: `gx = -(x - cx) * s`, `nx = -nor * s`. Case phẳng (|lowA − lowB| < 0.5)
  mặc định mặt trước ở ymin.
- `scripts/convert-cases.mjs`: `mx = odd ? -flip : flip` thay cho đảo tam giác.
- Đã chạy lại cả hai và kiểm tra: Exodus80 / RF Bruh / Catto RF có cụm mũi tên ở trước phải; case 60% có USB phía sau.

### Model / dựng hình

- Rương gỗ bước mở hộp co đều: `chestScale = min(W / 1.59, D / 0.82) * 0.7`.
- Thùng carton tự dựng bằng code (thân + 2 nắp gập, ref `lid` / `flap`); đã bỏ model `cardboard_boxes`.
- Khối chặn case (HHKB / WKL) dựng bằng code cao tới `Y.caseTop` (case CAD vẫn dùng `BLOCKER_TOP`); orderThumb cũng vậy.
- Stab plate-mount: KeySlot `PLATE_STAB_Y`; kit dùng plate cứng.
- Ảnh bùi nhùi trong Shopii xoay `-π/2 + 0.38` để thấy cục đồng.

### Màn hình + CPU trên bàn (`src/scene/models/Computer.tsx`)

- Không tìm được model phù hợp: Poly Haven không có màn hình hiện đại / CPU; Kenney Furniture Kit (CC0) low-poly,
  không có thùng CPU, lệch phong cách phòng → **tự dựng bằng code**.
- `Monitor`: màn hình hiện ảnh desktop KeebOS (canvas). Bấm → `goPC()`; kéo chuột > 6px thì không tính là bấm.
- Hover: viền vàng **liền nét** bằng vỏ BackSide (`HoverShell`). `Outlines` của drei không hiện trên RoundedBox nên không dùng.
- Vị trí trong Room: màn hình `(-0.1M, table, -0.28M)` xoay 0.05; CPU `(-0.45M, table, -0.08M)`.
  Màn hình 0,42 × 0,25 m (bản to 0,5 m bị tay đèn chọc qua và sát hộp đồ nghề).

### Script convert mới

- `bun run convert:hand-tools` (`scripts/convert-hand-tools.mjs`): tua vít điện + đồ mở switch → `public/models/tools/`.

## 2026-10-24 (tối)

### Blossom bị hở giữa 2 mảnh

- Nguyên nhân: đáy Blossom là hình nêm (mép trước cao 2,5mm, vách sau 14,5mm), nắp đặt nằm ngang nên hở cả khe phía trước.
- Sửa ở `convert-user-cases.mjs`: tuỳ chọn `rot: { angle, y0, z0 }` xoay mảnh quanh trục x; nắp Blossom
  `dz 27.1`, `rot 0.085 rad` (~4,9°) tựa mép sau (y0 127.3, z0 14.5), `plateZ 10`.
  `CASES.aliceAlu.seat = { rise: -0.048, tilt: 0.085 }` (plate nghiêng theo nắp).

### Case 2 tông (đáy khác nắp)

- Converter user-cases tách node `bottom` cho file tên có BOT / BOTTOM / B_Case (13 case). Mọi chỗ vẽ case CAD
  (Case.tsx `CaseModel`, orderThumb) đều vẽ thêm node `bottom`.
- `CaseDef.bottom?: { material, color }`: đáy chất liệu / màu riêng; không có thì đáy dùng vật liệu nắp.
  Case dựng bằng code 2 mảnh: `CaseBox` + vách dưới dùng vật liệu đáy.
- Case mới: `repent75Pc` (nắp PC · đáy nhôm bạc), `exodus80Duo` (nắp nhôm · đáy PC mờ), `gasket60Duo`
  (60% code 2 mảnh nắp PC · đáy nhôm). `head4Alu` đáy acrylic trong (đúng mô tả cũ).
- Âm thanh vẫn tính theo chất liệu nắp (`caseDef.material`).

### Màu / vật liệu

- `smoke` đổi tên "Xám" (`#80858f`), **giữ id** cho bản lưu cũ. Thêm `yellow` Vàng, `green` Xanh lá cho mọi case
  nhôm / nhựa / PC / acrylic / mica; gỗ thêm `ash` Gỗ tần bì, `rosewood` Gỗ hồng mộc (mượn vân sồi / óc chó rồi nhân màu,
  `woodTexFor`).
- Tạ: thêm kim loại `gold` (`#e3b341`); các case tạ thép đổi sang vàng cho nổi. Đồng thau / đồng đỏ giữ nguyên.
- orderThumb: `shellMaterial(material, color)` dùng chung cho nắp / đáy.

## 2026-10-24 (khuya)

### Màn hình máy tính: bay camera vào màn hình

- Camera mặc định nhìn gần như từ trên xuống: mép trên khung hình chỉ tới ~22cm sau tâm bàn, màn hình ở 28cm nên
  **không bao giờ lọt vào góc nhìn mặc định** (vật cao ở mép sau bàn đều bị cắt). Không dời màn hình vào vùng làm việc.
- Thay vào đó (đúng ý người dùng "icon về máy tính = đi vào màn hình trên bàn"): icon PC trên thanh menu
  (và bấm vào màn hình) gọi `zoomToPC()` → `pcZoom = true` → `PcZoom` (Bench.tsx) lerp camera tới `screenEye()`,
  nhìn `screenCenter()` trong 0,9s (mỗi khung tối đa 1/30s để máy chậm vẫn thấy), xong gọi `goPC()` + `resetCam()`.
  HUD ẩn trong lúc bay (App.tsx). `CameraRig` bỏ kẹp tâm nhìn khi đang bay.
- Vị trí / kích thước màn hình dùng chung ở `src/scene/models/computerLayout.ts` (`SCREEN`, `MONITOR_AT`, `MONITOR_ROT`).

### Chữ khắc bàn

- Chữ "gay" là của người dùng (cố ý): khắc ở **mặt dưới** mặt bàn gần mép trước, chữ trắng (emissive nhẹ cho thấy trong bóng).
  Mặt bàn dày `DESK_TOP = 0.026` m (đo bằng tia chiếu từ dưới lên).

### Plate trong suốt

- Plate `clear` (PC, PEI): `PlateMaterial` (Board.tsx) dùng meshPhysicalMaterial transmission 0.92, roughness 0.12,
  opacity 0.45, `depthWrite false` → nhìn xuyên thấy PCB. Ảnh Shopii (modelThumb) cũng trong suốt.

### Bỏ đèn bàn

- Người dùng bỏ đèn tay đòn (Poly Haven `desk_lamp_arm_01`): gỡ khỏi Room, `fetch-room.mjs` và ghi công. File glb vẫn còn trong `public/models/room/` (chưa xoá).

### Hộp đồ nghề lên kệ, dụng cụ xuống bàn (2026-10-24 khuya)

- `ShelfToolBox`: hộp đồ nghề cất trên tầng kệ cao 0,42m trên mặt bàn (`SHELF_BOARD_Y`, tâm kệ `SHELF_X` / `SHELF_Z`).
  Bản nhẹ của `old_tool_box.glb`: giữ khối (904 tam giác), thay 3 texture 1024px (vết xước, normal map) bằng sơn đỏ trơn `#9e2f27`.
  File glb gốc giữ nguyên.
- `DeskTools`: tua vít (điện nếu đã mua) + kìm cắt nằm thẳng trên bàn ở `(0.18M, table, -0.17M)`, tì lên mặt phẳng vô hình
  qua `RestOn`. Đã bỏ component `ToolBox` cũ (đồ nằm trên nắp hộp).
- Màn hình + thùng CPU xoay 0 (thẳng theo cạnh bàn); viền hover vàng mỏng lại `T` 0.005 → 0.0025 m.

### Kệ chưng bàn phím + chứng chỉ lên kệ, chữ khắc vân gỗ (2026-10-24 khuya)

- Chứng chỉ thợ (cùng model `diploma_frame.glb`) bỏ khỏi tường, dựng nghiêng (-0.2 rad, rộng 30cm) trên tầng kệ thấp
  (`SHELF_LOW_Y`, 0,143m trên mặt bàn) qua `ShelfDiploma` + `RestOn`.
- Kệ chưng bàn phím tự dựng (`src/scene/models/ShelfDisplay.tsx`) theo ảnh mẫu người dùng: chân đỡ chữ A in 3D xám đen
  (mặt cắt hông `OUTER` + lỗ tam giác `HOLE`, dày 1.2cm, móc trước giữ mép bàn phím, mặt tựa dốc ~61°).
  `DisplayKeyboard` = 2 chân đỡ + bàn phím ráp sẵn (`buildKeyboardModel`, u → m) nghiêng đúng `LEAN`, mép dưới đặt vào móc.
- Bàn phím chưng (`SHELF_KEYBOARDS` trong Room): Tofu60 hồng + OEM trắng / bạc hà, Repent75 bạc + XDA navy, Exodus80 đen + MT3
  trắng / navy. Tầng giữa 0,706m, tầng trên 0,988m trên mặt bàn; mép trước chân đỡ lùi 2cm so với mép kệ.
- Chữ khắc dưới mặt bàn: font viết tay **Caveat** (SIL OFL, `public/fonts/Caveat.ttf`, giấy phép `public/licenses/Caveat-OFL.txt`, đã ghi công),
  cỡ 2.4, vật liệu dùng chính texture vân gỗ của bàn nhân màu `#a8754c` cho giống rãnh khắc. (Bản trước chữ trắng → người dùng đổi.)

### Sắp lại kệ + sửa bàn phím xuyên chân đỡ (2026-10-25)

- Kệ đếm từ trên xuống (`SHELF_TIERS`, m so với mặt bàn: 0.988, 0.706, 0.4247, 0.1433, -0.138, -0.4197, -0.6594):
  tầng 1 hộp đồ nghề, tầng 2 chứng chỉ, 5 tầng dưới chưng 10 bàn phím (`SHELF_KEYBOARDS` có `tier`, `x`).
  ("bỏ" trong yêu cầu người dùng = đặt lên.)
- Bàn phím trên chân đỡ bị xuyên vào mặt tựa: trước đây đặt theo điểm nhô ra trước nhất — khi dựng nghiêng đó là mặt keycap,
  nên case lùi vào trong chân đỡ. Giờ lấy góc trước dưới của đáy case (khung bao lúc nằm phẳng: y nhỏ nhất, z lớn nhất),
  xoay theo `LEAN` rồi đặt vào móc (`SEAT` = lùi 2cm, cao 1.4cm; mặt tựa ở 2.4cm) → đáy song song, nằm ngay trước mặt tựa.
- Camera bàn build zoom ra xa tối đa 160 (cũ 80).

### Khung chứng chỉ mới + kìm nhỏ lại (2026-10-25)

- Bỏ model "Diploma Frame" (DrewA) — gỡ cả ghi công. Thay bằng khung ảnh để bàn có chân chống của người dùng
  (`assets/user-props/picture-frame.glb` → `public/models/room/picture-frame.glb`, chưa rõ giấy phép: chỉ dùng cá nhân,
  đã ghi vào CREDITS.md). Mét, đáy y = 0, mặt trước +z, 18.9 × 24.6cm.
- `createDiploma`: ẩn tấm giấy trắng có sẵn (node "Unprinted frame insert"), đặt tấm chứng chỉ canvas khổ dọc
  (0.166 × 0.222m, z -0.0045, sau lớp kính). Trên kệ đặt thẳng `scale = M` (chân chống tự đỡ); ảnh Shopii dùng chung.
- Kìm cắt nằm trên bàn (`DeskTools`) nhỏ lại 1 nửa: scale 0.075 → 0.0375.
