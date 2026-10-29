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

### PCB khoét lỗ chân stab, khung chứng chỉ (2026-10-25)

- PCB trước chỉ khoét lỗ vít screw-in → chốt housing stab đâm xuyên PCB đặc. Giờ `stabHoles(k)` (steps.ts) trả 2 lỗ mỗi bên
  đúng chốt của model CAD stab (đo từ `stab.glb`): lỗ nhỏ Ø3.2mm ở −6.985mm, lỗ lớn Ø4mm ở +8.255mm (phím dọc xoay 90°, Alice theo `rot`).
  `PcbSurface` khoét cho mọi phím có stab (mọi loại stab). Lỗ phải nằm trọn trong viền: lỗ lớn hàng dưới cùng (PCB sát mép phím)
  lùi về phía lỗ nhỏ tối đa 1.5mm, vẫn không lọt thì bỏ.
- Vít stab screw-in (`ctx.screws.stabScrew`) lấy luôn vị trí lỗ nhỏ (trước lệch −0.32u và phím dọc lệch nhầm sang +x).
- Khung chứng chỉ: ảnh lỗi người dùng gửi là model cũ (DrewA); với khung mới, giấy đẩy sát kính `PAPER.z = 0.0085` (trước −0.0045, lõm sâu 1.35cm).

### Plate universal 60 / 75 / TKL / full từ ai03 Plate Generator (2026-10-25)

- kbplate.ai03.com chạy hoàn toàn phía trình duyệt, mã nguồn `ai03-2725/yet-another-keyboard-builder` (AGPL-3.0) → chạy lõi
  `parseKle` + `buildPlate` bằng Bun thay vì thao tác web. **Không nhúng mã ai03 vào repo**: clone riêng, trỏ `YAKB_DIR`.
- `bun run gen:plates-universal` (`scripts/gen-universal-plates.ts`): gộp phím của mọi tổ hợp variant (backspace / bottom / rshift)
  từ `getLayout` → KLE raw data `assets/plates/universal/<id>.kle.json` (dán được vào KLE / kbplate) → DXF `<id>.dxf`
  (switch MX basic, stab MX basic, bo góc 0.5mm) → gộp lỗ chồng nhau (`polygon-clipping`, devDep) → `src/data/generated/plateUniversal.ts`
  (toạ độ u quanh tâm layout như `Key.cx / cz`, không căn theo khung bao như plate60).
- `Board.tsx`: 60 chuẩn (2u / WK / 2.75u) giữ plate CAD typ60; 60 variant khác + 75 / TKL / full dùng plate universal; layout khác vẫn sinh lỗ bằng code.
  75 trong game chỉ có 1 bố cục nên universal 75 = đúng layout đó.
- Chụp headless: plate trong suốt (transmission) ở layout full làm swiftshader trắng màn hình — lỗi môi trường, plate nhôm hiển thị đúng.

### Tua vít tay bản nhẹ (2026-10-25)

- Model Poly Haven `screwdriver.glb` chỉ ~3.4k tam giác nhưng nặng 1.5MB do 3 texture 1024px (màu, normal, metal/rough).
  `bun run convert:screwdriver-lite` (`scripts/convert-screwdriver-lite.mjs`, devDep `jpeg-js`) giữ khối, bỏ texture: màu nền
  lấy mẫu (trung bình 5×5) nướng vào màu đỉnh, tách 2 vật liệu thép / nhựa theo kênh metalness → `screwdriver-lite.glb` 90KB.
  Mất chữ in trên cán + vết xước (chấp nhận). File gốc giữ nguyên.
- Dùng ở cả tua vít nằm trên bàn (`MODELS.screwdriver`, Room.tsx) lẫn tua vít khi vặn (`SCREWDRIVER_GLB`, HandTools.tsx).

### Camera bàn build: pan nhanh hơn, zoom gần hơn (2026-10-25)

- `src/scene/Bench.tsx` (`Controls`): `panSpeed` 1 (mặc định OrbitControls) → 2,5; OrbitControls vốn nhân
  độ dời theo khoảng cách camera nên zoom xa vẫn kéo nhanh, không cần logic pan riêng.
- `zoomSpeed` 1 → 1,3 (mỗi nấc lăn gần hơn ~6,5% thay vì 5%); `minDistance` 4 → 1,8 (1u = 19,05mm,
  dừng cách tâm plate ~34mm) để zoom sát keycap mà không xuyên qua mặt bàn / bàn phím. `maxDistance` giữ 160.
- Camera bàn build: tâm nhìn không còn kẹp ngang mặt bàn — `ROOM_BOUNDS.minY/maxY` (sát sàn → tầm kệ), camera không xuống dưới
  sàn (`floorY`). Cuộn zoom vào thì tâm nhìn + camera tiến dần về điểm con trỏ trúng (raycast, `ZOOM_TO_POINT` 0.12) — không
  dùng `zoomToCursor` vì với `screenSpacePanning=false` nó giữ tâm nhìn trên mặt phẳng ngang.

### Sửa lệch layout / PCB lòi ra khỏi case CAD (2026-10-25)

- **Alice lệch phím**: footprint `MX_Switch:SW_Cherry_MX_*u` của PCB Blossom có gốc ở **góc trên trái phím**, tâm switch ở
  (w·U/2, U/2) trong hệ footprint. `scripts/alice-layout.mjs` trước lấy gốc làm tâm → mọi phím lệch nửa cỡ phím (phím rộng lệch nhiều,
  Tab / Shift lòi khỏi case). Giờ cộng độ lệch xoay theo góc footprint; chạy lại `node scripts/alice-layout.mjs` → `aliceKeys.ts`
  (Tab sát Q, phím nằm trọn viền PCB).
- **Catto HHKB dựng layout 60%**: `caseSpec` chỉ xét form factor → case có `layouts` (HHKB...) giờ lấy `layouts[0]`.
- **Case CAD dạng nêm** (mép sau cao, mép trước thấp) mà `seat.tilt = 0` → board nằm ngang, PCB / plate lòi lên trên mép trước, hàng phím
  lệch khỏi rãnh khi nhìn chéo. Đo mép trước / sau ở dải giữa (|x| < 3u, ngoài vùng phím) rồi đặt
  `tilt = atan((sau − trước) / (depth + 0.6))`, `rise ≈ giữa 2 mép − 0.25u` (0.1u thì phím nổi lệch hàng). Đã sửa: exodus60, eclipse60,
  cattoHHKB, vintage60HHKB, rfBruh, exodus80 / exodus80Duo (0.2 / 0.15, chỉnh tay theo ảnh nhìn chéo). Case đã có tilt (ta65, repent75,
  head4, duality, Alice) giữ nguyên.
- `seat.dz` (mới, `CaseDef.seat`): dời board trước / sau khi case không đối xứng (RF Bruh gờ trước dày: `dz 0.6`). Board.tsx lerp cả z.
- Planck: thành khay chỉ cao −0.3u → `seat.rise −0.22` (plate ngang mép case, PCB không lộ).
- Khối chặn: TKL / full thêm khối ở khoảng trống giữa cụm Ins–PgDn và mũi tên (`blockerGaps`, chỉ chỗ thật sự trống, mặt trên `top 0.3`);
  case CAD có tilt thì khối chặn hàng dưới thấp `0.3` (orderThumb) cho khỏi nhô giữa hàng phím.
- Khung xem case Shopii (`caseOnly`) cho case dựng bằng code: khay rỗng đáy + 4 thành thay khối đặc.

### Kệ: bàn phím TKL đỏ, bấm xem 3D, lùi vào trong (2026-10-25)

- Màu case `red` (Đỏ `#8f1d26`), thêm vào màu Exodus80. Kệ tầng 2: chứng chỉ dời trái `−0.24m`, Exodus80 đỏ WKL (space 7u, 86 phím)
  keycap Cherry phối như ảnh mẫu: chữ + số + space đỏ, phím chức năng đen, hàng F xen kẽ (F1–4 đỏ, F5–8 đen, F9–12 đỏ) — `redBlackCaps`
  qua `KeyboardSpec.capOf` (mới: màu riêng từng phím). `DisplayKeyboard` nhận thêm `variant`, `capOf`.
- Bàn phím trên kệ tương tác được: rê chuột hiện viền vàng mảnh ôm vỏ case (shader đẩy đỉnh theo pháp tuyến 1.8mm hệ thế giới, chỉ mặt sau;
  bản đầu là hộp bao cả bàn phím → người dùng thấy dày), bấm (không phải kéo camera) mở khung xem 3D (`useShelfView` zustand không lưu,
  `features/bench/ShelfViewer.tsx` gắn trong App ở màn bench), tiêu đề "Exodus80 + keycap Cherry".
- `KeyboardViewer`: camera lùi theo bề rộng layout (`[0, 0.7w, w]`, tối thiểu 15u) cho TKL / full không bị cắt.
- `SHELF_FRONT` 0.235 → 0.205 (chân đỡ + bàn phím lùi vào 5cm so với mép kệ, trước nhìn như sắp rớt).

### Camera bàn build: pan không chậm khi zoom sát (2026-10-25)

- OrbitControls kéo theo tỉ lệ khoảng cách camera → zoom gần thì kéo rất chậm. `CameraRig` mỗi khung đặt
  `panSpeed = PAN_SPEED (2.5) × max(1, PAN_REF (22) / khoảng cách)` (gán qua `state.controls` của useFrame cho đúng luật lint).

### Layout 75% khớp case Repent75 + viền hover kệ chỉ mặt trước (2026-10-25)

- Đo GLB `repent75` (mm, raster mặt hướng lên gần vành theo từng hàng z): lòng 304mm = 16u; hàng F là khoang riêng sâu 1u với 4 vách
  ~11mm (Esc | F1–F4 | F5–F8 | F9–F12 | 1 phím), thanh ngang ~3mm ngăn hàng số; hàng dưới có vách x 86–95mm trước cụm mũi tên.
- `rows75` mới: hàng F Esc, khe 0.5u, F1–F4, 0.5, F5–F8, 0.5, F9–F12, 0.5, Del (bỏ PrtSc / Pause); hàng số từ y 1.25 (cách 0.25u);
  hàng dưới Ctrl / Win / Alt 1.25 + Space 6.25 + Alt / Ctrl 1.25 (bỏ Fn) + khe 0.5u + ← ↓ →. 81 phím, 16 × 6.25u. Tâm phím khớp
  khoang case tới ~1mm. Mọi case 75% có model đều là Repent75; case dựng bằng code tự theo layout.
- Viền hover bàn phím trên kệ: bỏ vỏ BackSide ôm cả case (lộ quanh đáy / cạnh sau, vệt mảnh trong hốc) → khung phẳng vàng
  `FRAME_W` 4mm quanh mép trên case, nghiêng theo `seat.tilt` (case nêm), `toneMapped: false` như viền màn hình máy tính.
- Keycap màu mới `green` (Xanh lá đậm `#1d3522`, chữ trắng; đơn / Shopii cũng có). Kệ tầng 3: case mới `exodus80Pc` (Exodus80 PC,
  cùng model + seat, màu frost / clear / smoke, bán ở Shopii 2.400k) màu frost + Cherry xanh lá 1 màu;
  RF Bruh trắng tầng 5 → bộ vàng `yellowCaps` (chữ cái + space kem, phím chức năng + F5–F8 vàng, Esc / Enter than) qua `capOf`
  (`SHELF_KEYBOARDS` nhận `capOf`). Sửa regex `/^F(\d+)$/` của `redBlackCaps` (thiếu `\` nên hàng F TKL đỏ toàn đen).
- Hàng F TKL lệch về sau trong rãnh (người dùng báo): board nghiêng làm mặt keycap ngả về sau ~`cao × sin(tilt)` ≈ 0.1u → thêm `dz`
  bù cho các case nêm đã chỉnh (exodus80 / Duo `0.07`, exodus60 `0.1`, eclipse60 `0.11`, catto `0.1`, vintage `0.08`, rfBruh `0.6 → 0.7`).
- 4HEAD (acrylic + nhôm): lòng khoét mặt trên lệch trước so với gốc case (vành sau dày) → board lùi sau ~0.85u, hàng trên đè vành sau,
  trước hở. Đo GLB (mép trước lòng 64 / 65mm − 2.5u) → `seat.dz` 0.86 (acrylic) / 0.91 (nhôm).

### Thứ tự hàng keycap Cherry / OEM + case PC trong mờ (2026-10-25)

- Đối chiếu bảng profile (ảnh người dùng): R1 (hàng số) cao nhất, thành đứng ở sau, thành vát ở trước; R4 mép trước cao hơn.
  File CAD Cherry / OEM đánh số ngược (`r1-1u` = R4 … `r4-1u` = R1) và bản cũ xoay 180° cho khớp độ dốc → thành đứng / vát ngược.
  `convert-keycaps.mjs`: bỏ xoay 180° cho cherry / oem, ghi `r${5 - row}`; chạy lại `bun run convert:keycaps`; `CAD_ROW` đo lại
  (cherry R1 0.53 / −0.013 … R4 0.446 / 0.036; OEM tương tự). SA / DSA / XDA / MT3 / OPK không đổi.
- Case PC (`material: 'pc'`) trước gần như đục (transmission 0.75, opacity 0.95; ảnh shop opacity 0.9 không transmission) →
  transmission 0.9, roughness 0.35, opacity 0.6, `depthWrite false` ở cả `CaseMaterial` (bàn build) và `shellMaterial` (ảnh / kệ / khung xem).

### RF Bruh lệch trong khung xem (2026-10-25)

- Độ dốc 0.171 trước đo cả gờ sau cao (bezel USB) → dốc hơn mặt case thật (~0.114), phím trước lún, phím sau nhô, cả cụm lệch về sau.
  Đo lại bằng ảnh chụp thẳng từ trên (ortho, keycap bán trong suốt đè lên lỗ case — script `pw/ortho.mjs` ở scratchpad):
  `seat: { rise 0.34, tilt 0.114, dz 0.76, dx −0.08 }`. Thêm `seat.dx` (dời trái / phải), Board.tsx + orderThumb đều dùng.
- Cách căn case CAD lần sau: chụp ortho từ trên để căn dx / dz, chụp ngang để căn tilt / rise (đo mặt khung, bỏ gờ / bezel).

### Housing stab theo kiểu lắp (2026-10-25)

- Trước mọi stab dùng chung housing CAD screw-in. Giờ `StabHousingCad` chọn housing theo `STABS[model].mount`: screw = CAD cũ
  (`stab.glb`), clip = housing Cherry clip-in (chân gài xuyên PCB, không vít), plate = housing kẹp plate (không xuyên PCB). Slider +
  dây vẫn CAD. `scripts/convert-stab-variants.mjs` (nguồn `assets/community/stab-variants/`: cherry_mx_stabilizer.glb, keyboard_plate_mounted_stabilizer.glb
  — Sketchfab, người dùng cung cấp, chưa rõ giấy phép) → `public/models/stab-clip.glb` / `stab-plate.glb` (node `housing`, mm, gốc tâm
  slider, y 0 = mặt PCB, dây phía +z). Clip: housing trái của mesh có rig `Object_19`, 1 đơn vị ≈ 0.8mm. Plate: `Object_5`,
  4.306mm / đơn vị (2 housing cách 23.876mm), hạ 1.5mm cho đáy chạm PCB (gốc plate-mount ở PCB + 1.5mm, KeySlot).
- Bước vặn vít stab + vòng đồng lỗ vít PCB vốn chỉ có với screw-in (steps.ts) — không đổi. Lỗ PCB giữ chung (PCB thật có sẵn).
- HHKB Professional JP keycap Hi-Pro bày trên bàn (2026-10-25): trước thùng CPU, xoay π + 0.12 (model gốc quay mặt sau về +z),
  tỉ lệ 294mm / 5.5 đơn vị. `scripts/convert-hhkb-desk.mjs` (nguồn `assets/community/hhkb-desk/`, 1.5 triệu tam giác / 50MB) giảm lưới
  meshoptimizer 6% (sai số 0.05) → `public/models/room/hhkb-jp.glb` 102k tam giác / 4.7MB. Vệt trắng trên keycap là texture gốc (sờn).
- Bàn mod stab (2026-10-25): kìm cắt nằm dọc (mũi −z) giữa băng Urgo và cột slider đầu tiên (`CLIPPER_IDLE` x −2.95, z TIP_Z + 0.45).
  `setJaw` (ModTools) sai dấu góc mở càng 0 (càng này `scale.z = −1`) → 2 lưỡi bắt chéo, cán khép; đã đảo dấu. Bản trước: mũi chĩa +x
  về phía slider (`CLIPPER_ROT_IDLE` 0; trước mũi chĩa −z, nằm đè cột slider); lúc kẹp chân xoay dần về `CLIPPER_ROT_CUT` π/2.
  Tua vít + kìm nằm trên bàn (`DeskTools`, Room) ẩn ở bước `stabMod` (bàn mod có kìm riêng, tua vít không dùng).
- HHKB Pro JP thử bày trên bàn rồi bỏ theo yêu cầu (đã xoá GLB + script).
- Đồ trên bàn (2026-10-25): tua vít nằm trên bàn (`DeskTools`, Room) chỉ hiện ở bước vặn / tháo vít (`SCREW_STEPS`); kìm cắt trên
  bàn bỏ hẳn (chỉ bàn mod stab dùng kìm, đã có kìm riêng).
- Bàn lube: dời theo phác thảo người dùng — khay lò xo `TRAY_AT` (−5.9, −2.6) góc sau trái, hộp lắc `BOX_AT` (−0.9, −2.6) giữa
  hàng sau (hộp ngắn còn nửa: `BOX.w` 7.5 → 3.75u), hũ mỡ `JAR_AT` (6.1, −1.4) + lọ dầu `BOTTLE_AT` (6.1, 0.6) cột phải cạnh đồ mở switch; hàng trước để chi tiết switch.
- Stab Cherry (clip-in / screw-in / plate-mount): slider màu đen `#2b2b2e` (trước trắng).
- Mỡ dây stab dài (6.25u / 7u): dây CAD 6.25u kéo giãn theo x (`wireScaleX`) nên dày hơn lớp mỡ → lộ nửa dây. Lõi ống mỡ =
  `r × max(1, wireScaleX) + 0.05mm`; dây dài phết hết thanh ngang (`wireGreaseCurve`: mỗi bên tới giữa, chồng 0.5mm), dây ngắn giữ 2mm.
- Bàn lube (2026-10-25): bỏ model switch low profile Kailh Choc V2 red (koktoh, CC BY-NC-SA) cho switch linear theo yêu cầu người dùng;
  mọi loại switch dùng model MX CAD. Đã xoá `choc-red.glb`, `scripts/convert-choc.mjs` + lệnh `convert:choc`, nguồn
  `assets/community/switches-koktoh/`, ghi công (credits.ts + CREDITS.md).

### Dọn model không dùng (2026-10-25)

- Rà mọi file trong `public/` đối chiếu với `src/` + `index.html`: xoá `room/desk_lamp_arm_01`, `room/diploma_frame`, `room/cardboard_boxes`,
  `lube/cosmetic-cream-jar`, 5 module khay lube Fonz (`switch-module`, `stems-module`, `accent-left/right-side`, `connector`) + script
  `convert:lube-station` + nguồn `assets/community/keyboard-lube-station-fonz/`, `solder/spool-holder` (giá thiếc dựng bằng code) + script
  `convert:spool-holder`; gỡ ghi công thùng carton / Fonz. Texture, âm thanh, font, icon, avatar đều còn dùng.
- `room/screwdriver.glb` (1.5MB) chỉ là nguồn của `screwdriver-lite.glb` → chuyển sang `assets/community/props-polyhaven/`
  (`convert-screwdriver-lite.mjs` đọc từ đó; `fetch:room` không tải nữa).
- PCB Mechlovin đã gỡ trước đó (giay-phep.md).
- Bàn lube (2026-10-25, theo phác thảo 2): bộ chi tiết switch đang lube (housing trên / stem / housing dưới / lò xo) dời từ mép
  trước lên giữa bàn (`WORK_Z` −0.2), cọ nằm bên phải bộ chi tiết (`BRUSH_IDLE` 3.4). Hàng trước (`OPENED_AREA` x −6.2…5.8, z 1.4…6)
  bày đủ số switch đã mở (`OpenedSwitches`: InstancedMesh housing dưới + đầu stem, con đã lube stem bóng; lưới tự tính cột theo
  tổng số switch, chật thì thu nhỏ).
  Mỗi ô: housing dưới + stem đầy đủ (đầu CAD + thân `bodyGeo`, trước chỉ đầu stem nên trông lơ lửng) + housing trên lùi 17mm phía sau.
- Bàn lube (2026-10-25, bản 3): bỏ bộ chi tiết đang lube ở giữa bàn; bấm vào lưới switch đã mở để lube 1 mẻ, cọ quét quanh switch
  kế tiếp trong lưới (`NEXT` do `OpenedSwitches` cập nhật, `passes()`). Đồ nghề dồn lên mép sau: khay (−5.6, −5), hộp lắc (−1.2, −4.7),
  đồ mở (4.4, −4.9), cọ (2.4, −3.3), lò xo cạnh hộp, hũ mỡ (6.5, −4) + lọ dầu (6.5, −2.3) góc phải sau; lưới `OPENED_AREA` z −2.1…6
  vừa đơn full size (104 switch, đã chụp kiểm tra).
- Bàn lube (2026-10-25, bản 4, theo ảnh khoanh đỏ): hũ mỡ (1.9, −4.6) + lọ dầu (3, −4.3) dời từ góc phải sang hàng sau giữa hộp lắc
  và đồ mở (`JAR_AT`, `BOTTLE_AT`); cọ dịch phải sang (3.6, −3.3) (`BRUSH_IDLE`) — góc phải trống, đồ nghề gom một cụm.

### Bàn lube: lò xo theo switch đã mở, stem nổi + mỡ, viền vàng, mũi tên (2026-10-25)

- Yêu cầu: lò xo ban đầu chưa có, mở bao nhiêu switch thì bấy nhiêu lò xo vào hộp; thanh tiến độ 1 màu; stem nổi để lube cả
  stem lẫn housing và thấy mỡ sau khi lube; đổi câu cảnh báo clicky; vật tương tác được viền vàng như màn hình PC (lưới switch:
  chỉ con đang rê); mũi tên vàng hướng dẫn như bàn mod stab; bấm switch nào lube switch đó (trước đây luôn đi từ trái sang phải).
- Hộp lò xo (`SpringShaker`): nắp mở sẵn, `InstancedMesh` đếm `count = opened` (`springSpot`, hàng 8 con), lò xo bay từ đồ mở
  vào hộp sau mỗi lần mở (bay đủ `lubeAnim.batch` con). Lube: nhỏ dầu → đóng nắp → lắc → mở nắp, lò xo bóng. Bỏ lò xo lẻ
  trên bàn và lò xo trong khay. `lubeSprings` chặn khi chưa mở hết switch.
- Lưới switch (`OpenedSwitches`): stem nổi `RAISE` = 9mm trên housing dưới; con đã lube có lớp mỡ tĩnh (`greaseGeometry` gộp
  4 nét → InstancedMesh, ModTools); đang lube có `LiveGrease` (GreaseStroke dài dần theo cọ). `greaseMaterial()` dùng chung
  thay `GreaseMaterial` JSX.
- Lube theo con được bấm: `lubeBatch(idx)` lấy con được bấm + các con chưa lube kế tiếp (vòng lại đầu lưới), lưu
  `build.lubedIds` (bản lưu cũ: `lubedIds()` coi như `lubed` con đầu); instance → switch qua `userData.ids`.
- Viền hover: `scene/common/hoverOutline.ts` (vỏ ngược shader, dày theo khoảng cách camera, hỗ trợ InstancedMesh);
  `Clickable` + `HintArrow` chuyển vào StationKit dùng chung bàn lube + mod stab; lưới switch tự viền 1 con (`outline={false}`).
- Panel: thanh mở / lube switch `tone="green"`; câu clicky của 205g0 / 205g00 = "Clicky lube giảm tiếng ồn và tiếng sạn của switch đi".
- Đã chụp headless kiểm tra: hộp 0 → 5 → 61 lò xo, bấm switch 25 lube đúng 25–29, viền vàng 1 con, mỡ trong hốc housing.
- (2026-10-25, bổ sung) Rê vào 1 switch thì viền vàng **cả mẻ** sẽ bôi nếu bấm (bậc thợ + sách phép, giới hạn bởi số con
  chờ lube và mỡ còn lại): `lubePicks()` trong mods.ts dùng chung cho `lubeBatch` và `OpenedSwitches` (prop `batch`).
  Đã chụp: thợ middle + phép = 15 con, rê con số 3 → viền 3–17, bấm → lube đúng 3–17.

### Mũi tên hướng dẫn bước dán gasket / gá O-ring (2026-10-25)

- Yêu cầu: bước gasket, vòng silicon chưa có mũi tên vàng như bàn mod stab.
- `Gaskets` (BoardDetails.tsx) chỉ miếng chưa dán đầu tiên; `Board` chỉ cạnh trước vòng silicon chờ gá. Dùng chung `HintArrow`
  (StationKit, thêm prop `size`, bàn build dùng 1.6 vì camera xa hơn). Đã chụp kiểm tra Tofu60 Redux mount O-ring.

### Bàn lube: hộp lắc + khay lò xo dời vào (2026-10-26)

- Yêu cầu: làm đơn 101 switch thì 2 hộp lò xo sát chân màn hình PC. Bàn lube scale theo `ctx.width / 12` nên bàn full to ra,
  hàng sau lấn ra sau. `BOX_AT.z` −4.7 → −4.4, `TRAY_AT.z` −5 → −4.7 (dời 0.7u thì cấn switch, chỉ nhích 0.3u).

### Mũi tên bàn mod stab to hơn (2026-10-26)

- Yêu cầu: bước mod stab "chưa có mũi tên vàng". Thực ra đã có (`hint[next]`) nhưng size 1 trong `StationTable` bị thu nhỏ
  thêm khi bàn nới theo số stab (`k < k0`) → gần như không thấy. Giờ `size={1.8 * max(1, k0 / k)}` bù lại phần thu nhỏ.

### O-ring mount: vòng kẹp giữa PCB và plate (2026-10-25)

- Yêu cầu: O-ring mount = vòng O-ring cuốn quanh, kẹp giữa PCB và plate, dùng cho case 1 mảnh.
- `buildContext`: mount `oring` gá vòng (`ring`) **trước** bước plate, bỏ bước gasket; OG giữ gasket → ring sau switch.
  Case có O-ring (Tofu60 Redux, Catto HHKB, Bakeneko 60) đều 1 mảnh.
- `SiliconeRing({ between })` (BoardDetails.tsx): O-ring cao bằng khe PCB–plate, tâm ở mép board, bo tròn (RoundedBox);
  OG vẫn ôm cả mép. Gợi ý bước + `MOUNTS.oring.desc` + OVERVIEW cập nhật. Đã chụp góc nghiêng: vòng nằm giữa PCB và plate.
- Bản lưu cũ đang build dở mount O-ring sẽ lệch thứ tự bước (danh sách bước đổi).

### O-ring: gá vòng sau lắp switch (2026-10-26)

- Yêu cầu: "O-ring phải làm sau bước gắn sw để cố định plate rồi mới gắn vòng O-ring lên"; stab screw-in lắp trước plate,
  stab plate-mount lắp sau plate (giữ nguyên, đã đúng).
- `buildContext`: bỏ `ring` trước `plate`, mount `oring` và `og` cùng gá vòng sau `switch` / `solder` (OG sau `gasket`).
  Thứ tự: stab (clip / screw + `stabScrew`) → plate → (stab plate-mount) → lube → switch → (hàn) → ring → feet → caseIn.
  Hình vòng giữ nguyên (`SiliconeRing between` nằm khe PCB–plate). Gợi ý bước + OVERVIEW sửa theo.
- Save rev 5 (`moveRingStep` trong persistence.ts): build O-ring làm dở tìm lại bước theo tên; đang ở bước gá vòng cũ thì về bước plate.

### Lắp switch / keycap: sáng cả dãy sẽ lắp (2026-10-25)

- Yêu cầu: có sách phép lắp keycap thì rê vào phải sáng đủ số ô (như hàn).
- `installTargets()` (supplies.ts) dùng chung cho `installRun` và `KeySlot`: rê vào ô → store nhỏ `useRunLit` giữ dãy phím
  (bậc thợ + phép qua `spellRun`, switch giới hạn số còn trong kho), các ô trong dãy sáng như ô đang rê. Áp dụng cả switch lẫn keycap.
  Đã chụp: rê giữa hàng → sáng 8 ô tới cuối hàng, bấm lắp đúng 8 keycap.

### Top mount: bắt vít plate vào case trên (2026-10-25)

- Yêu cầu: top mount phải bắt vít lên top case. Người dùng chọn cách "úp case trên rồi vặn vít".
- Bước mới `topCase` + `topScrew` (types.ts, steps.ts): case 2 mảnh mount `top` → sau switch / hàn: úp case trên (`placeTopCase`,
  dùng chung cờ `closed`) → board tự lật, vặn vít đầu chữ thập từ dưới vào mép dưới vách case trên (`ctx.screws.topScrew`, cùng
  x với vít case, z giữa vách) → `caseIn` (case trên nhấc 2.6 cùng board) → `caseScrew`; bỏ `caseClose`. Bỏ trò nhân đôi vít
  `caseScrew` cũ cho top mount.
- `Case({ topOnly })`: trước `caseIn` chỉ vẽ case trên (Assembly `topEarly`), vít `topScrew` vẽ trong group case trên.
- Sửa kèm (BenchHud): câu "Đang xem mặt đáy — bấm Lật lại…" trước đây che gợi ý của mọi bước tự lật (hàn, vặn vít đáy); giờ chỉ
  hiện khi người chơi tự lật ra mặt kia (`viewFlip`).
- Đã chụp Gasket60 mount top: thứ tự bước, case trên + 6 vít khi lật, case trên nhấc theo board ở bước thả vào case.
- Feet cao su vào đúng hốc case CAD (2026-10-25, "bot case có chỗ dán feet mà không dán vào"): trước `RubberFeet` đặt 4 góc
  theo công thức chung (W/2 − 0.7, D/2 − 0.5) nên lệch hốc của case CAD. `scripts/probe-case-feet.mjs` dò hốc: mặt quay xuống
  cao hơn đáy 0.3–4mm, gom cụm union-find (lưới 3mm), bán kính 3.5–6.5mm, gần tròn, tâm phải có trần (loại lỗ vít vành khuyên),
  hốc chồng nhau giữ hốc lớn, phải có cặp đối xứng trái / phải, đủ ≥ 4 hốc mới ghi → `src/data/caseFeet.json` ([x, z, r, sâu] mm).
  14 case có hốc (Exodus60/80, Eclipse, Catto, TA65, Repent75, Head4, Planck 6 hốc, Vintage...); Alice, Bakeneko, Duality,
  RF-Bruh không dò được → feet mặc định. Feet = trụ r × 0.92 lấp hốc, lồi 1mm dưới đáy. Đã chụp kiểm tra Exodus60 lật đáy.
- Case 40% vừa layout Planck (2026-10-25): `caseFits` đòi `ff` case = `ff` layout nên case 40% (plastic40 / alu40 / mica40) bị báo
  "Case không vừa layout Planck". Thêm `LayoutDef.fits` (planck: `['40']`), chỉ áp dụng cho case không có `model` CAD (case dựng theo
  kích thước layout nên board 12u × 4u nằm đúng khay). `estimateCost` / màu case của đơn (orders.ts) và `orderLook` (orderThumb.ts)
  dùng `caseFits` thay vì so `c.ff === ff`. Case Planck nhôm (CAD) vẫn chỉ nhận Planck.
- Plate CAD typ60 bị lật gương (2026-10-25, "plate layout 60 chơi backspace 2u nhưng đang bỏ vào plate 1u"): DXF `typ60-full`
  vẽ ngược trái / phải (backspace 2u ở x âm nhất), `plateGeometry` (Board.tsx) chỉ lật y → cả plate bị gương (2u sang trái, shift
  trái / phải đổi chỗ, 24/61 phím lệch lỗ). Sửa: nhánh `cadCutouts` lật thêm x `-(x - centerX)`; thêm `PLATE60_SPACE` = lỗ switch
  spacebar (DXF nối thông ra mép trước nên nằm trong viền ngoài). Kiểm bằng script: 61/61 phím + stab nằm trong lỗ; plate universal
  60 đủ 8 tổ hợp variant không lỗi.
- Case Planck ngược chiều (2026-10-25, "case 40% lắp ngược chiều cổng C"): `convert-cases.mjs` đoán mặt trước theo "mép thấp
  hơn" — Planck là khay phẳng nên đoán sai, lỗ USB-C ra trước phải. Thêm `turn: true` cho planck trong `SOURCES` (đảo cả x lẫn z =
  xoay 180°, không lật gương), chạy lại `bun run convert:cases` (Bakeneko không đổi) + `probe-case-feet.mjs`. Chụp kiểm tra: lỗ
  USB-C ở mặt sau, phía Tab / Esc.
- Mỡ wire dây dài (2026-10-25, "sao lại bôi hết wire 6.25 và 7u, đáng lẽ bôi như wire 2u"): `wireGreaseCurve` (ModTools.tsx)
  trước cho dây > 30mm phết hết thanh ngang (`barLen = spanMm − bendR + 0.5`); giờ mọi dây dùng `WIRE_PATH.barLen` (đoạn móc →
  góc uốn → 2mm thanh ngang). Cọ ở bàn mod stab đi theo cùng đường (`StabModStation`) nên cũng ngắn lại.
- Chữ keycap SA bị cắt (2026-10-25, "lỗi font chữ ở layout SA"): chữ in trên mặt phẳng ngang ở đáy lòng chảo (giữa phím) nên
  SA (lòng chảo sâu 0.085 + nghiêng theo hàng) che mất nửa sau của chữ. `legendPlane` (Keycap.tsx) bắn 15 tia xuống model
  keycap quanh vùng chữ, khớp đường y = a + b·z, nghiêng chữ `atan(-b)` và nâng trên điểm cao nhất + 0.012; chỉ cho keycap GLB
  (`NativeCap`), keycap dựng bằng code giữ như cũ. Chụp kiểm tra SA navy 60%: chữ đủ.
- Changelog: 5 mục mình thêm sau commit bfd1e41 (feet, Planck, khoá camera, mỡ wire, Shopii hết hàng) dời từ 0.1.1 (đã commit)
  sang 0.1.2 (phiên khác đã mở bản này).

## Case mica xếp lớp (2026-10-26)

- Người dùng: "vỏ case mica là nhiều lớp cắt phẳng xếp chồng lên nhau ms đúng, render đang sai". Trước: bàn build ghép mỗi lớp bằng 4 thanh
  hộp (góc nối, không giống tấm cắt), ảnh Shopii / khung xem 3D (`orderThumb.ts`) vẽ mica thành 1 khối bo tròn đặc.
- `scene/parts/micaLayers.ts` (nay là `caseShell.ts`): `micaLayerGeometry` = 1 tấm mica cắt phẳng (`ExtrudeGeometry` không vát: viền ngoài bo góc 0,12u, khoét
  ruột theo `CASE_WALL`, `solid` = tấm đáy liền), `micaStackPlan` (lớp ~0,15u ≈ 3mm, khe 0,012u), viền mép cắt `EdgesGeometry` trắng mờ
  (`micaEdgeMaterial`), `micaStack` cho three thuần. `Layers` (Case.tsx) dùng chung geometry (memo theo W / D / y0 / y1, dispose khi đổi);
  `buildKeyboardModel` case mica không có model CAD → `micaStack` (2 lớp dưới là đáy liền) cho cả xem riêng case lẫn cả bàn phím.
- Vỏ case liền khối (2026-10-26, người dùng: "các loại case chất liệu khác ex 40% đáng lẽ phải liền khối như case mica, hiện đang có nét
  tách nhau rõ rệt giữa các cạnh"): case dựng bằng code (không model CAD, không mica) trước ghép 4 `RoundedBox` thành + 1 tấm đáy → lộ đường
  nối ở góc / chân thành. `caseShellGeometry` (`scene/parts/caseShell.ts`, đổi tên từ micaLayers.ts): vành ngoài bo góc 0,12u đùn 1 lần từ y0
  tới y1, khoét ruột theo `CASE_WALL`, mép trên / dưới bo 0,035u (`SHELL_BEVEL`), `floorTop` thì `mergeGeometries` thêm sàn lọt trong ruột
  (góc bo theo góc ruột, không hở 4 góc) → 1 geometry. `Walls` (Case.tsx) dùng nó (case dưới kèm sàn, case trên chỉ vành); gỗ trải UV qua
  `woodUV` (tách từ `woodBoxGeometry`, materials.tsx). `buildKeyboardModel` cũng dựng vỏ liền (case 2 mảnh: phần dưới màu đáy + vành trên),
  bỏ khối đặc khi xem cả bàn phím.
- Khối chặn 75% / 65% / full (2026-10-26, người dùng: "các block của layout 75%, 65 và tkl cũng chưa đúng"): `blockerGaps` (layouts.ts)
  xét chỗ trống theo dải hàng dưới (tính cả phím 2u lấn xuống → hết khối chặn đè Numpad Enter ở full); khe giữa hàng từ 0.25u được lấp
  khi ngay phía trên có phím che (khe dưới Shift phải trước cụm mũi tên 75% / 65%); khe chạy dọc cả bàn (giữa cụm TKL / full) là plate
  thật, không lấp. TKL giữ khối quanh cụm mũi tên như cũ. Vẽ kiểm tra bằng SVG + Chrome headless.

## Feet cao su + hốc CNC dưới đáy case (2026-10-26)

- Người dùng: "nên cnc lõm 4 cái feet tròn ở bot để có thêm step gắn feet bot trước khi assem bước case, tuỳ case sẽ có feet đen,
  trắng có bán trong shop; 1 lần mua là 4 cái feet" (kèm ảnh vỉ 4 feet bán cầu).
- Hốc: `feetPockets` (steps.ts) → `ctx.feet` [{x, z, r, depth}] toạ độ cảnh. Case CAD dùng hốc dò sẵn `caseFeet.json` (mm → u);
  case dựng bằng code: 4 hốc gần 4 góc (W/2 − 0,9, D/2 − 0,75), `FOOT_R` 0,21u (~4mm), sâu `FOOT_DEPTH` 0,07u (~1,3mm), nằm trong sàn.
  `caseShellGeometry(..., pockets)` khoét lỗ tròn xuyên sàn (`punch`) + đĩa trần hốc (`pocketCeilings`) → hốc lõm thật (đo: giữa hốc
  −0,83 so với đáy −0,9). Mica: tấm đáy dưới cùng cắt lỗ, tấm thứ 2 làm trần (`micaLayerGeometry(..., pockets)`).
- Bước `feet` (types.ts `StepId`, `STEP_INFO`, `stepProgress`): chèn trước `topCase` (top mount) / `caseIn`; `autoFlip` → case lật úp;
  `Assembly` coi như `caseOpen`: chỉ hiện case, ẩn board. `RubberFeet` (Case.tsx): hốc chưa dán có đĩa vàng (hốc kế tiếp sáng hơn,
  rê chuột trắng), click → `placeFoot(i)`; feet đã dán = nửa cầu (`FOOT_DOME`) đen `#1c1c1f` / trắng `#efeee9` lồi ~1mm dưới đáy.
  Trước đây feet luôn vẽ sẵn; giờ chỉ hiện feet đã dán.
- Vật tư `feetBlack` / `feetWhite` (supplies.ts, `SupplyDef.feet`, gói 4 cái 25k), `FEET_IDS`; `feetPick` + `setFeetPick` (shopSlice);
  `FeetPanel` (ModPanels, BenchHud) chọn loại + số còn + cảnh báo thiếu (nút mở Shopii). Shopii nhóm "Feet cao su" (shopFilters),
  ảnh 3D vỉ 4 feet bán cầu trên tấm đế (`createFeetStrip`, modelThumb.ts). Chưa chấm điểm màu feet hợp case (chỉ gợi ý trong panel).
- Bản lưu rev 4 (`addFeetStep`, persistence.ts): build làm dở đã tới / qua chỗ chèn bước thì stepIdx + 1, coi như đã dán đủ feet đen,
  bỏ lịch sử hoàn tác cũ (stepIdx trong đó lệch); áp cho đơn đang làm + jobs.
- Lắp thử kiểm tra cấn (2026-10-26, người dùng: "assem thử mạch và keycap lên test xem có bị cấn ko"): dựng build hoàn chỉnh 75 / 65 / TKL /
  full bằng store (`window.__game`) trong Chrome headless (CDP) chụp toàn cảnh + cận cảnh, kèm kiểm tra số: khối chặn không đè ô keycap
  nào (keycap ~0,95u) ở 6 layout. Cấn tìm thấy: vít `trayScrew` nằm dưới khối chặn (75 / 65: khe mới lấp; full: khối cạnh cụm mũi tên,
  lỗi cũ) → `buildContext` dời vít tray bị chặn dần vào giữa (bước 0,25u) tới chỗ trống. HHKB: vít case bắt từ đáy nằm dưới khối chặn
  (ẩn trong case, không lộ) nên giữ nguyên.
- Camera trên điện thoại (2026-10-26, cùng yêu cầu "tối ưu ui cho điện thoại"): khoảng cách camera mặc định chỉ theo bề rộng bàn phím
  (canh cho màn ngang) → màn dọc bàn phím tràn 2 bên. `fitAspect(aspect)` (`scene/common/fitAspect.ts`) = max(1, 1,45 / aspect), tối đa
  3,2: `CameraRig` (Bench.tsx) và `EmptyBench` nhân vị trí camera với hệ số này (đổi tỉ lệ / xoay máy thì đặt lại). Màn ngang không đổi.
- Khối chặn lơ lửng (2026-10-26, người dùng: "case tkl block bị treo lơ lửng", kèm ảnh TKL thật mặt case che kín vùng trên cụm mũi tên):
  khối chặn trước dựng từ `Y.plateBot` → xem riêng vỏ case (Shopii, bước thả board) thấy khối treo giữa không. Giờ dựng từ sàn case
  `Y.floorTop` lên mặt trên (`Blockers` trong Case.tsx + `buildKeyboardModel`); khi có board thì mạch / plate nằm lọt trong khối (khuất).
- Hốc feet trong cửa hàng (cùng ngày, "thêm 4 cái lỗ feet tròn dưới bot luôn, trong cửa hàng ko thấy"): `buildKeyboardModel` truyền
  `feetPockets(undefined, ...)` vào `caseShellGeometry` (phần có sàn) / `micaStack` → case dựng bằng code xem từ đáy có 4 hốc như bàn build
  (case CAD như Eclipse 60 có hốc sẵn trong model). Đã chụp kiểm tra đáy case nhựa + mica.
- Hốc feet nông + lỗ tròn (2026-10-26, người dùng: "lỗ feet sâu quá cho nó nông hơn xíu để lồi ra và lỗ đang không phải hình tròn hoàn
  chỉnh", kèm ảnh case mica lật úp feet chìm trong hốc): `FOOT_DEPTH` 0,07 → 0,042u (~0,8mm); feet cao `depth + 0,08` (lồi ~1,5mm).
  Mica trước khoét xuyên cả tấm đáy (~2,7mm) → `micaLayerGeometry` có hốc thì gộp thêm `pocketCeilings` (trần hốc trong tấm, sâu như
  case liền khối). Lỗ đa giác do `curveSegments` 4–6 → có hốc thì 32. Vỏ liền khối: bevel lấn vào lỗ làm lỗ hẹp còn 0,175u (< feet
  0,193u, cấn) → khoét rộng thêm `SHELL_BEVEL`. Đo lại: sâu 0,80mm cả 2 loại, bán kính lỗ 0,210 đều 72 hướng; chụp kiểm tra mica + nhựa.
- Khối chặn theo cụm phím + mặt trong sàn phẳng (2026-10-26, người dùng: "bỏ feet ở mặt trong để mặt dưới thôi; block case tkl phải như
  thế này", kèm ảnh CAD TKL: mặt case làm khung quanh cụm F / cụm chính / cụm nav / cụm mũi tên chữ T, che hết chỗ không có phím).
  `blockerGaps` (layouts.ts) viết lại: lưới 1/8u, đánh dấu ô thuộc phím, gộp ô trống thành hình chữ nhật (ưu tiên dải ngang, bỏ vụn
  < 1/4u), khối chạm mép board kéo ra `edge` ăn vào thành case. Khối hàng dưới cùng (chạm mép trước, sâu ≤ 1,3u: HHKB, WKL, khe 75 / 65)
  cao ngang mép case như cũ; còn lại (dải giữa hàng F / hàng số, vách giữa cụm, vùng trên numpad, quanh mũi tên) `top` 0,3u, thấp hơn
  keycap. Bỏ code riêng cho cụm mũi tên. Kiểm tra: không khối nào đè ô keycap, vít tray (dời ngang, không được thì sang khe hàng kế)
  không nằm dưới khối, ở 75 / 65 / TKL / full / FRL / HHKB / WKL.
  Sàn có hốc feet: 2 lớp — tấm mỏng dưới (dày = độ sâu hốc, khoét lỗ, không bevel) + tấm trên liền (trần hốc) → mặt trong phẳng
  (đo: −0,6 ở mọi điểm), không còn vết lỗ. Mica: viền mép tấm đáy lấy theo tấm liền (không vẽ vòng tròn lỗ nhìn xuyên từ trong).
- Khung chặn rỗng bên dưới (2026-10-26, người dùng: "bên trong phải có độ rỗng chứ sao block lại đi full từ dưới lên trên mà ko khoét
  rỗng", kèm ảnh mặt dưới case trên CAD: khung mỏng quanh các cụm phím, bên dưới rỗng). Khối chặn giờ là tấm mỏng `BLOCKER_SKIN`
  0,18u (~3,4mm) ở mặt trên (mặt dưới tấm ≥ `Y.plateBot`), không còn đặc từ sàn lên; không lơ lửng vì `blockerGaps` mới nối khung vào
  thành case qua các dải (dải dưới hàng F, vách giữa cụm, khối chạm mép kéo vào thành). Áp ở `Blockers` (Case.tsx) + `buildKeyboardModel`.
  Có board: plate (mặt trên 0) nằm dưới khung (đáy khung 0,12–0,44u tuỳ case), không chồng nhau.
- Khung chặn cao đều (2026-10-26, người dùng: "các phần block đang không cao bằng nhau ở cụm arrow, cao như nhau hết chứ"): bỏ `top` 0,3u
  cho khối giữa bàn → mọi khối cao ngang mép case (code: `Y.caseTop`, CAD: `BLOCKER_TOP`, CAD nghiêng 0,3), mặt khung phẳng như case thật.
  Khung nằm ngoài ô phím nên keycap nhấn xuống không cấn.
- Case 2 mảnh có lỗ vít + mica khung liền tấm (2026-10-26, người dùng: "case 2 mảnh thì phải có lỗ để bắt ốc ở dưới đáy, mica ghép thì có
  thể bắt ở đáy hoặc ở trên, alu thì chỉ ở dưới đáy"; "mảnh trên cùng của mica phải liền 1 mạch với block, không có chuyện block tách
  riêng"). `caseScrewPoints` (steps.ts, tách từ buildContext; bắt từ đáy lùi 2 vít đầu hàng vào 0,4u cho khỏi chạm hốc feet) +
  `caseScrewHoles` (r `SCREW_HOLE_R` 0,1u): nhôm / PC / acrylic 2 mảnh → hốc đầu vít ở mặt đáy (gộp với hốc feet trong sàn 2 lớp);
  mica → lỗ xuyên mọi tấm ở viền (`micaLayerGeometry(..., holes)`), bắt từ trên hay từ đáy đều thấy lỗ.
  Mica: `keyRegions` (layouts.ts) dò đường bao từng vùng phím trên lưới 1/8u → các tấm nằm trên mặt plate (`micaLayerKind` 'frame', y ≥ 0)
  khoét theo vùng phím thay cho lỗ ruột chữ nhật → khung giữa các cụm phím là 1 phần của tấm mica trên cùng, không đặt khối chặn rời
  (Case.tsx + `buildKeyboardModel` bỏ `Blockers` khi mica). Case 2 mảnh không phải mica: khung chặn chuyển sang nhóm case trên (nhấc /
  đậy cùng case trên, trước đây nằm ở case dưới nên lơ lửng khi mở case). Kiểm tra 23 tổ hợp case 2 mảnh × layout: vít không chạm hốc
  feet / vùng phím, hình không lỗi; chụp mica 75 / full (khung liền tấm), đo 10 lỗ vít đáy TKL nhôm 2 mảnh lõm −0,858 (đáy −0,9).

## Plateless, foam PCB, ốc case mica (2026-10-26, 0.1.9)

- **Stab plate-mount dùng mọi plate** (người dùng: "tại sao stab plate mount cần plate cứng... tất cả plate đều dùng được"): bỏ
  `PlateDef.flex` + `plateStabClash`, đơn không còn né plate PC / POM / PP.
- **Plateless**: "plate" ảo `PLATELESS` = `'none'` trong `PLATES` (giá 0, âm mềm trầm; Shopii / đơn / chợ dùng `plateIds()` để không bán).
  Bật / tắt ở app Chi tiết đơn (Toggle dưới Kiểu mount, `setPlateless`): plate đang có cất về kho chung. Điều kiện (`platelessIssue`):
  PCB hàn, stab không phải plate-mount; mount chỉ `PLATELESS_MOUNTS` = tray (các mount khác kẹp / bắt vít vào plate). Khách gửi plate
  hoặc đòi chất liệu plate thì không bật được. `buildContext` bỏ bước `foam` + `plate`, `ctx.plateless`. `addPart` không cất plateless.
- **Foam Poron PCB** (ảnh mẫu 75% của người dùng): vật tư `foamPoron` (`FOAM_ID`, 1 tấm 60k / 5 tấm 250k, Shopii → Lube & vật tư).
  Bước tuỳ chọn `foam` ngay trước `plate` (OPTIONAL_STEPS, "Bỏ qua"), click board → `placeFoam` trừ 1 tấm, `build.foam`. `FoamPanel`
  (ModPanels) báo còn bao nhiêu tấm. Âm: `soundProfile` foam −0,05 loud / −0,08 pitch (thock hơn). Cảnh 3D `scene/parts/Foam.tsx`:
  tấm đen dày 0,1u trên mặt PCB, viền theo `boardOutline`, mỗi phím 1 lỗ (phím − 0,2u), phím ≥ 4u (space) để liền tấm, chỉ khoét lỗ
  switch giữa + 2 khe stab — giống ảnh mẫu, tự sinh cho mọi layout. Save rev 6 (`addFoamStep`): build cũ dời stepIdx theo tên bước.
- **Ảnh Shopii / Kho của foam** (2026-10-26, người dùng: "foam lót pcb sao lại hình cuộn thiếc"): vật tư không có model riêng rơi về
  `createSolderSpool`. Thêm `createFoamSheet` (modelThumb.ts, nhánh `pcbFoam`): tấm Poron đen chữ nhật nguyên, chưa cắt lỗ (nhẹ,
  không dựng lỗ theo layout). Chọn bán **tấm nguyên dùng mọi layout** thay vì cắt sẵn (cắt sẵn phải bán riêng từng layout); lót lên
  PCB ở bàn build vẫn hiện tấm đã cắt lỗ switch + khe stab (`Foam.tsx`). Sửa `desc` cho khớp.
- **Plate hở trên foam** (2026-10-26, người dùng: "đặt plate lên foam sao lại bị hở... phải sát foam"): foam dày 0,1u nhưng khe
  `Y.pcbTop` → `Y.plateBot` là 0,18u → hở 0,08u. `FOAM_T` = `Y.plateBot − Y.pcbTop − 0,004` (lấp kín khe, plate tì sát foam).
- **Standoff tray mount** (2026-10-26, người dùng: "case traymount nhưng không có lỗ ren để bắt vít ở trong case => lỗ ren bắt vít
  traymount luôn luôn nằm ở bot case"): `TrayStandoffs` (Case.tsx) khi `ctx.mount === 'tray'`: trụ đồng lục giác r 0,1u + lỗ ren tối ở đỉnh
  đúng chỗ `ctx.screws.trayScrew`, đỉnh = mặt dưới PCB (tính theo `seat` rise / tilt / dz / dx như Board), chân = sàn: case dựng bằng code
  `Y.floorTop` (mica: mặt trên 2 tấm đáy, `micaStackPlan`); case CAD (`CadStandoffs`) bắn tia từ mặt dưới PCB xuống model GLB tìm sàn,
  trúng trụ có sẵn sát PCB (< 0,03u) / không trúng thì bỏ. Liền nhóm case dưới (lật theo bước feet). Chụp kiểm plastic60 + eclipse60
  (playwright, scratchpad `pw/tray.mjs`). Chưa làm: vị trí vít tray vẫn sinh theo khe hàng phím, chưa khớp lỗ vít riêng trong CAD.
- **Khoét lỗ vít tray qua plate + PCB** (2026-10-27, người dùng: "khoét trụ đồng cho case traymount nhưng plate và pcb ko khoét thì
  làm sao bắt vít từ trên xuống được"): trước đó vít tray nằm lơ lửng trên mặt plate (y 0,03), plate / PCB liền.
  `steps.ts`: `PLATE_CUT` (lỗ switch 14mm, stab 7 × 13mm, chuyển từ Board.tsx), `TRAY_HOLE` (PCB r 1,1mm vừa thân M2, plate r 2,4mm
  rộng hơn đầu vít r 1,9mm), `keyCutouts(k)` (lỗ cắt plate theo phím, Board dùng chung), `plateCutoutsFor` (plate universal nếu có, không
  thì theo phím), `clearOfCutouts`. `buildContext` dò chỗ vít tray: ngoài khối chặn còn phải nằm trên phần plate liền (không chạm lỗ
  switch / stab); không tìm được thì bỏ vít đó (65%: 5 → 4, Alice 4), nên trụ đồng / lỗ / vít luôn trùng nhau.
  `plateGeometry` thêm `trayHoles` (lỗ tròn vào mảnh plate chứa tâm), `PcbSurface` thêm `mountHoles` (khoét thật + vòng đồng).
  Vít tray đặt ở `Y.pcbTop` (đầu ốc tì mặt PCB, lọt trong lỗ plate). Alice tray: bỏ plate CAD (không có lỗ vít) → plate dựng theo phím.
  Kiểm số: mọi case tray × layout, 0 lỗ chạm lỗ cắt; chụp plastic60 (có / không switch, vít đã vặn), tklTray, aliceAlu (playwright,
  scratchpad `tray/shot.mjs`). Plate CAD 60 chuẩn (DXF) dò theo plate universal 60 (gộp mọi variant, rộng hơn).
- Cùng ngày, người dùng: "bị mất luôn cả nét đứt màu vàng mô phỏng vị trí bắt ốc rồi, và ốc bắt vào thì bị biến mất luôn": hạ vít xuống
  `Y.pcbTop` làm vòng vàng (r 0,15–0,2u, rộng hơn lỗ plate) bị plate che, khung nét đứt + đầu ốc nằm sâu trong lỗ, góc camera chéo bị
  plate / switch che. Đổi: vít xuyên **cả plate + PCB** vào trụ đồng, đầu ốc tì mặt plate (`y = 0`; plateless: `Y.pcbTop`).
  `TRAY_HOLE` = { pcb 1,1mm, plate 1,2mm (vừa thân vít), seat 2,4mm (vùng plate liền cho đầu ốc, dùng khi dò vị trí) }.
  `ScrewSet` trayScrew có thân ren dài `y − Y.pcbBot + 0,12` (xuyên plate + PCB, ăn vào trụ đồng). Chụp lại góc mặc định: khung nét
  đứt + vòng vàng hiện, ốc vặn xong nằm trên plate giữa các switch. Đầu ốc (Ø 3,8mm) vẫn bị vỏ switch (15,6mm) lấn nhẹ khi nhìn chéo.
- Cùng ngày, người dùng: "vít bắt vào khay phải nằm ẩn bên trong pcb nha => lỗ traymount trên plate phải to ra để ốc có thể lọt qua"
  → quay lại đầu ốc chìm tì mặt PCB (`y = Y.pcbTop`), lỗ plate r 2,4mm (> đầu ốc r 1,9mm, dò không chạm lỗ switch / stab), bỏ `seat`.
  Không để vòng vàng / khung nét đứt bị plate che: `Screw` / `ScrewSet` thêm `mouth` (độ cao miệng lỗ), vít tray `mouth = 0` (mặt
  plate; plateless = `Y.pcbTop`) → khung nét đứt + vòng vàng lúc chưa bấm nằm trên mặt plate; bấm rồi thì ốc lún dần xuống lỗ.
  `TRAY_SHAFT` (Screw.tsx) = thân ren xuyên PCB + 0,12u vào trụ đồng.
- Cùng ngày, người dùng: "ko có vít ở trên khay đựng ốc thì làm sao có vít bắt vào case được": `ScrewTray` trước chỉ đựng ốc case đã
  tháo (`caseOpen`). Thêm ốc tray mount kèm case chưa bắt (`trayScrew`, chưa bấm lần nào) vào khay (không có khay thì vương trên bàn),
  bấm lần đầu là lấy ra khỏi khay. Chưa chụp kiểm (người dùng chặn chạy trình duyệt headless).
- Cùng ngày, người dùng: "ở bước thả board vào case => nếu đã thả vào xong thì hiển thị luôn mũi tên hướng dẫn vàng và tua vít để bắt
  chứ ko cần phải qua màn tiếp theo... sau khi thả vào là mặc định qua màn tiếp theo" + "đối với case 1 mảnh thôi nha".
  `dropInCase` (buildSlice): bỏ `once`, tự ghi `inCase` + (case `pieces !== 2`) `stepIdx + 1` trong 1 lần `set` (1 lần hoàn tác về lúc
  chưa thả), `viewFlip: false`. Case 2 mảnh giữ như cũ (chờ bấm "Bước tiếp theo" rồi đậy case, gợi ý ở BenchHud). Ngoại lệ duy nhất của
  quy tắc "không tự chuyển bước".
- Cùng ngày, người dùng (ảnh lỗ plate đen kín): "vặn xong rồi mà ko thấy hình ốc hiển thị": foam Poron PCB (`PcbFoam`) lấp kín khe
  PCB – plate nhưng chỉ khoét lỗ phím → đầu ốc tray (tì mặt PCB) nằm dưới foam đen. `foamGeometry` thêm `trayHoles` (lỗ tròn r
  `TRAY_HOLE.plate`, trừ cùng lỗ phím bằng polygon-clipping), Board truyền `trayHoles`. Chưa chụp kiểm.
- Cùng ngày, người dùng: "ở bước dán feet xong cũng tự động qua step tiếp theo ko cần phải bấm nữa": `placeFoot` dán feet cuối
  (`feet` đủ `ctx.feet.length`) thì cùng lần `set` tăng `stepIdx` + `viewFlip: false` (case tự lật lại), 1 lần hoàn tác. Mọi loại case.
- Cùng ngày, người dùng: "bắt vít xong cũng tự động chuyển qua step tiếp theo luôn": `turnScrew` bước vặn vào (`SCREW_STEPS` =
  tighten: stabScrew / topScrew / trayScrew / caseScrew; tháo vít `caseOpen` giữ bấm tay) đủ vít thì `setTimeout(SPIN_MS + 150)` rồi
  `nextStep()` (chờ tua vít quay xong con cuối, không cắt hoạt cảnh / lật board giữa chừng; hoàn tác / đổi bước trong lúc chờ thì thôi).
  `SPIN_MS` chuyển từ `scene/models/HandTools.tsx` sang `data/steps.ts` (store không import scene), HandTools export lại.
- Cùng ngày, người dùng: "tới bước lắp keycap có vẻ phải tải model lần đầu nên khi lắp thì bị nháy": `NativeCap` gọi `useGLTF`
  theo profile + hàng (`/models/keycaps/*.glb`, 100–570KB mỗi file) → phím đầu của mỗi hàng treo `<Suspense>` bọc `Workbench`
  (Bench.tsx) → cả bàn build thành `StepLoading` rồi hiện lại. Sửa: `KeycapPreload` (Keycap.tsx, đặt trong Board) gọi
  `useGLTF.preload` các model của kit keycap trong kho theo các hàng của layout ngay khi vào bàn build; mỗi `NativeCap` bọc
  `<Suspense fallback={null}>` riêng (lỡ chưa tải xong thì chỉ phím đó hiện trễ). Chưa chụp kiểm.
- **Khung chặn case mica Alice** (2026-10-27, người dùng: "case mica alice chưa có block... tham khảo case blossom"): `keyRegions`
  (layouts.ts) với phím xoay trước trả rỗng → tấm mica trên cùng khoét trống cả ruột. Thêm `rotatedRegions`: hợp các ô phím xoay
  (w × h theo `rot`, nới 0,01u cho ô sát nhau dính liền) bằng `polygon-clipping` (chuyển từ devDependencies sang dependencies),
  lấy viền ngoài mỗi vùng → khung chặn giữa 2 nửa xoay ±12° + quanh cụm mũi tên như Blossom. Chụp so aliceMica / aliceAlu.
- **Hoạt cảnh thay đầu vít** (2026-10-27, người dùng: "action thay đầu vít đang đưa quá gần khung hình mặc định đưa ra xa"):
  `BitSwapPreview` (Screw.tsx) từ mép trước bàn (z = depth/2 + 1, y + 1,4, scale 2,4: to, sát khung hình) → trên board
  [0, y + 0,9, 1,2], scale 1,5. Chụp kiểm bằng cách giữ `bitSwapAt` = now − 900ms (swiftshader chậm, 1,3s không kịp khung hình).
- **Mũi tên bước lắp wire** (2026-10-27, người dùng: "mũi tên hướng dẫn đến bước gắn thanh wire vào thì phải chỉ thanh wire chứ sao chỉ
  ở giữa 2 housing"): `hint.wired` (StabModStation) từ [cx, +1,1, hz + 0,6] (ngàm giữa 2 housing) → chỗ wire nằm trên bàn
  [cx, +0,6, wireLie.z + 0,6] như bước phết mỡ wire.
- **Vít stab ngắn còn 2/3** (2026-10-27, người dùng: "vít vặn lỗ stab hơi cao rồi cho ngắn đi còn 2/3"): model button M3×8 (9,65mm,
  1 mesh, đỉnh đầu y = 0) lòi quá cao qua PCB. `Screw` thêm prop `short` → `shortenScrew` (Screw.tsx): clone hình học, ép phần thân
  dưới đầu ốc theo y để cả con còn `short` × dài (đầu ốc giữ nguyên); `ScrewSet` truyền 2/3 cho `stabScrew` (~6,4mm).
- **Rãnh đầu vít lõm** (2026-10-27, người dùng: "đầu vít chữ thập model đang sai... phần màu đen phải lõm vào"): trước vẽ 2 hộp đen
  nổi trên đĩa. `BitRecess` (Screw.tsx): mặt đầu ốc phẳng (đĩa r 0,064, `ShapeGeometry` khoét lỗ rãnh) + thành rãnh (Extrude chỉ vẽ
  mặt hông, nhóm 0 ẩn) + đáy rãnh tối; hình rãnh `recessShape`: chữ thập / sao Torx 6 cánh / rãnh dẹt (cache theo đầu vít, vật liệu dùng
  chung). Đầu lục giác vẫn dùng model GLB.
- **Thả board xong bấm case trên để đậy** (2026-10-27, người dùng: "ở bước thả board vào case có thể tương tác bằng cách bấm vào thì sẽ thả
  top case vào hiện tại phải bấm button bước tiếp theo mới được"): Case.tsx `closeNext` (bước `caseIn`, `inCase`, bước sau `caseClose`):
  case trên hiện lơ lửng (như lúc chờ đậy), bấm → `nextStep()` + `closeCase()`. Gợi ý bước (BenchHud) đổi "click vào case trên để đậy lại".
  Tiếp ("đậy nắp case trên rồi mà step đậy nắp case trên ko qua bước vặn vít"): `closeCase` (buildSlice) đậy xong tự `nextStep()`
  sang `caseScrew` (bước 1 thao tác, ngoại lệ của luật không tự chuyển bước).
- **Ốc đóng case cùng kiểu ốc mở case** (2026-10-27, người dùng: "lúc mở case là dùng vít đầu lục giác có mũ, đến lúc vặn vít thành lục giác
  nhưng đầu trụ"): `SCREW_STYLES.caseScrew` (Screw.tsx) `socket` → `countersunk` như `caseOpen` (cùng 1 bộ ốc tháo ra rồi vặn lại).
- **Ốc chưa tra = khung nét đứt** (2026-10-27, người dùng: "đến lúc vặn vào thì tôi thấy vít đã để sẵn rồi, đáng lẽ phải là nét đứt tượng
  trưng cho vít chưa được bỏ vào bấm thì mới được tra vào để vặn"): `Screw` chế độ `tighten` + `turns === 0` → không vẽ model, vẽ
  `ScrewGhost` (LineDashed vàng: 2 vòng đáy / đỉnh đầu ốc `HEAD_R` / `HEAD_H` + 6 cạnh đứng) ở miệng lỗ; vòng vàng "bấm đây" hạ xuống miệng
  lỗ. Bấm lần đầu thì ốc hiện ra ở trên rồi vặn xuống như cũ. Áp dụng mọi bước vặn vào (caseScrew / topScrew / trayScrew / stabScrew).
- Sửa lỗi kèm: vật liệu `BitRecess` dùng chung module → ốc bay ra chỉnh opacity làm mờ lây mọi con; giờ tạo riêng mỗi con (`useMemo`).
- **Foam Alice cắt lỗi ở góc phải** (2026-10-27, người dùng: "foam cut layout alice gốc bên phải ngoài cùng đang bị lỗi sửa lại thành hình
  vuông"): lỗ phím góc trên phải lấn ra ngoài viền foam → tam giác hoá vỡ thành mảnh tam giác. `foamGeometry` (Foam.tsx) giờ = viền tấm
  (`boardOutline`) trừ các lỗ phím bằng `polygon-clipping.difference` → lỗ chạm mép thành rãnh vuông khoét vào mép; mọi layout.
- **Plate Alice không hiện ở bước đặt plate** (người dùng: "từ bước lót foam đến bước đặt plate lên thì không hiển thị gì"): `AlicePlate`
  (Board.tsx) lấy `nodes['alice-plate'].geometry` → lúc chạy ra geometry rỗng (không có position), plate chờ đặt / đã đặt vô hình.
  Đổi sang lấy mesh đầu tiên trong `scene` của GLB. Kiểm bằng playwright: mesh plate ghost Alice có hình, ảnh chụp thấy plate.
- **Ốc case mica** (người dùng: "ốc case mica ghép đang bị ngắn"): `Screw` có `shaft` (thân ren dài thêm); `ScrewSet` bước
  `caseScrew` / `caseOpen` của case mica vít từ trên → thân dài tới cách mặt đáy 0,06u (xuyên mọi lớp tới tấm đáy).
- Ren ốc mica (2026-10-27, "ren ốc dài từ trên xuống dưới mới đúng, hiện chỉ có 1 nửa ren"; "ren vừa thêm nhỏ hơn vít gốc";
  "màu lệch so với vít gốc"; "tách lớp rõ 2 vật liệu, không làm giống nhau được à"): thân dài trước là trụ trơn, ren chỉ ở đoạn
  model. Lần 1 vẽ LatheGeometry vòng tròn cỡ M2 → sai cỡ với ốc M3 (bước tháo vít case dùng countersunk M3×10), màu tự đặt khác model,
  vòng tròn song song + tô bóng mượt lộ rõ chỗ ghép. Giờ: `threadGeometry(style, bottom)` (Screw.tsx) vẽ **ren xoắn thật** theo số đo
  model (gltf-transform: Ø ngoài / chân ren, bước, pha đỉnh ren `y0`, đáy model `end` — bảng `THREADS`, ren phải), cùng hệ toạ độ mm
  với model (scale MM), bắt đầu chồng 0,4mm lên đuôi model (che chỗ vát), mũi vát vào tâm; dùng **chính vật liệu của model**
  (`modelMat`, bản clone riêng mỗi con nên mờ dần cùng lúc khi ốc bay ra).
- Mũi tên vàng ở bước vặn / tháo vít (2026-10-27, "bước tháo vít case chưa có hướng dẫn mũi tên"): `ScrewSet` chọn con chưa xong
  gần giữa board nhất (|x| nhỏ nhất, giữa khung hình, không bị khung HUD 2 bên che), `Screw` prop `hint` → `HintArrow` trên đầu ốc
  (ẩn khi rê chuột / đang vặn). Áp dụng mọi bước vít (caseOpen / stabScrew / topScrew / trayScrew / caseScrew).
- **Plate sandwich case mica** (2026-10-27, người dùng: "plate đang bị lệch lỗ với case alice mica... sandwich mount thì plate phải có
  viền dài ra liền 1 đường ko có các cạnh gá như vậy, cạnh gá như này là gasket"): Alice luôn dùng plate CAD Blossom (tai gasket, lỗ
  riêng không khớp vít case mica). Giờ `ctx.mount === 'sandwich'` + case mica dựng bằng code: `plateGeometry` (Board.tsx) lấy viền
  `sandwichPlateShape` (caseShell.ts: chữ nhật bo góc đúng cỡ ngoài case W × D, khoét lỗ `caseScrewHoles`) thay viền layout, Alice
  cũng khoét lỗ phím bằng code (bỏ `AlicePlate`). Case trên mica (Case.tsx) tách 2 chồng lớp: `Y.split → Y.plateBot` và `0 → Y.caseTop`
  để chừa khe cho plate làm 1 lớp kẹp giữa (không đè lớp mica). Mọi case mica (sandwich) đều đổi theo. Chụp kiểm aliceMica (playwright).
- **Keycap mũi tên lên / xuống thành ô vuông** (2026-10-27, người dùng: "ICON mũi tên lên xuống bị lỗi"): font Nunito có ← → nhưng
  thiếu ↑ ↓. `CapOverlay` (Keycap.tsx) in '→' xoay ±90° (`ARROW_SPIN`) cho 2 phím này, mọi layout.
- **Khoá xoay camera khi hàn** (2026-10-27, người dùng: "đang hàn thì khoá góc quay màn hình ko cho quay trái quay phải gì cả"):
  `Controls` (Bench.tsx) `enableRotate={false}` suốt bước `solder` (cả 2 chế độ chuột / cảm ứng); vẫn kéo khung nhìn + zoom được.

## Kìm cắt bàn mod stab đè housing stab dài (2026-10-27)

- Yêu cầu: layout chỉ có 1 stab dài (6.25u / 7u) thì kìm cắt (`CLIPPER_IDLE`) nằm đè lên housing trái.
- Lý do: không có stab ngắn thì stab dài nằm hàng đầu (`ROW0`), housing trái ở x ≈ −3,2 trùng chỗ kìm (−2,95).
- Sửa (`StabModStation.tsx`): `layoutSets` trả thêm `clipper` — housing / slider hàng đầu lấn sang mép phải kìm thì kìm dời sang
  `CLIPPER_AWAY` (bên trái kéo, x = kéo − 1,7); `AnimatedClipper` nhận `idle`, ô "Thiếu kìm cắt" cũng theo vị trí này.
  Stab ngắn hàng đầu không chạm nên kìm giữ chỗ cũ; bàn stab dài vốn đã rộng (cột hũ mỡ bên phải) nên không bị nới thêm.

## Gờ trong lòng case theo kiểu mount + Blossom 2 mảnh gasket (2026-10-27)

- Yêu cầu: "oring mount phải có gờ để giữ oring lại ko sẽ bị lọt xuống, check xem các mount khác đã đúng chưa" (ảnh mẫu top / gasket
  mount + case có gờ trong lòng); "case blossom là case 2 mảnh => chỉ mount được gasket, có plate model đi kèm"; "feet case blossom 2 feet
  dưới bị lệch".
- Hằng số chung (`steps.ts`): `LEDGE_GAP` (khe mép board → mép trong gờ 0,03u), `GASKET` (tâm y / cao / sâu miếng gasket), `TOP_TAB`,
  `ringFrame(between)` (khung vòng O-ring / OG, BoardDetails `SiliconeRing` dùng chung). Gờ: `ledgeGeometry` (caseShell.ts), `Ledge` +
  `TopBosses` (Case.tsx) — chỉ case dựng bằng code (case CAD theo model, mica kẹp plate giữa các lớp).
- **O-ring**: vòng giờ rộng từ trong mép board 0,04 ra sát mặt vách (trước chỉ lòi 0,08, không chạm vách), gờ dày 0,1u ngay dưới
  vòng chạy quanh lòng case, không chạm PCB. **OG**: gờ dưới mặt đáy vòng (−0,32).
- **Gasket (2 mảnh)**: trước miếng gasket lấn 0,04u vào vách case trên và không có gì đỡ / đè. Giờ gasket dừng ở mặt vách
  (`gz = depth/2 + CASE_MARGIN − GASKET.d/2`), case dưới có gờ nhô từ `Y.split` lên mặt dưới gasket, case trên có gờ đè mặt trên
  gasket (plate kẹp giữa 2 gờ như ảnh mẫu).
- **Top mount**: trước vít `topScrew` ở giữa vách (z = mép + 0,375) tại `Y.split`, cách plate 0,22u và plate không chạm vách. Giờ plate
  có tai `TOP_TAB` lòi ra khe board – vách ở chỗ vít (`plateGeometry(tabs)`), case trên có vấu ngay trên tai, vít xuyên tai từ dưới
  (`y = Y.plateBot`, z = mép board + CASE_MARGIN/2).
- **Blossom** (`aliceAlu`): `pieces 2`, `screwSide 'bottom'`, `mounts ['gasket']`. Case CAD 2 mảnh: `CaseModel part` (đáy = node
  `bottom` ở case dưới, nắp = node `case` + khung chặn ở case trên, nhấc / đậy được). `CaseDef.screws` (8 lỗ vít dò từ mặt đáy model,
  mm) thay vị trí vít tính theo cỡ case; `CaseDef.gaskets` (8 tai của plate `alice.glb`, mm) thay gasket chia đều mép. Plate CAD
  dùng sẵn khi mount ≠ tray (`aliceCAD`).
- **Feet đáy phẳng**: `probe-case-feet.mjs` thêm `flatFeet` — model không dò được hốc thì lấy mặt đáy thật, mỗi góc chọn chỗ sát góc
  nhất mà cả đĩa feet + lề 3mm nằm trọn trong mặt đáy (lấy mẫu cả đĩa, lần đầu chỉ kiểm viền nên feet trước đè lỗ vít). Thêm
  `alice-blossom`, `rf-bruh` vào `caseFeet.json`; Bakeneko / Duality vẫn dò được 2 hốc → giữ feet mặc định.
- Đã chụp (playwright, scratchpad `pw/shot.mjs`): plastic60 O-ring (gờ quanh lòng case), gasket60 (gờ đỡ + gờ đè), Blossom: feet,
  gasket trên tai, 8 vít đóng case trùng lỗ.
- **Catto HHKB 2 mảnh** (người dùng: "ok đổi trước catto HHKB đi"): `pieces 2`, `screwSide 'bottom'`, `mounts ['gasket']` (bỏ tray /
  O-ring). 8 lỗ vít dò từ model (`screws`): hốc chìm đầu vít sâu 3mm ở mặt đáy (x ±144 / ±52,5, z ≈ ±53), không xuyên mặt đáy nên
  lần dò đầu chỉ thấy 4 hốc feet. Tạ (node `weight`) nằm trong mảnh đáy → `CaseModel part="bottom"` vẽ kèm tạ. Không có plate CAD → plate
  dựng bằng code, gasket chia đều mép trước / sau. Chụp kiểm: vít đóng case trùng lỗ, khung chặn HHKB đi cùng nắp.
- Chưa sửa (hỏi người dùng): `case75Alu` / `frlAlu` 1 mảnh dựng bằng code vẫn có `gasket` (trái quy tắc gasket cần 2 mảnh; tên
  "kiểu Q1" thì Q1 thật là 2 mảnh).

## Plate Blossom từ DXF gốc (2026-10-27)

- Yêu cầu: "file plate assets/community/blossom/plate/plate.dxf của case blossom alice đâu rồi? sao ko lấy ra dùng?"
- Trước: plate Alice CAD (`AlicePlate`) lấy `public/models/plates/alice.glb` từ bộ plate khác (`keyboard-plate-files-4xgk3/alice/alice.stp`,
  `convert-plates.mjs`), không phải plate của Blossom → tai gasket / 8 gasket đặt theo plate sai.
- `scripts/gen-blossom-plate.ts` (`bun run gen:plate-blossom`) → `src/data/generated/plateBlossom.ts`: DXF chỉ có LINE rời (mm, y lên) →
  nối đầu mút thành vòng (lưới 0.01mm), bỏ vòng 1 điểm / điểm trùng (không bỏ thì earcut vỡ: "reading 'next'", cả cảnh đen), vòng lớn nhất
  = viền, còn lại = lỗ. Căn: 63 lỗ switch (diện tích 180–215mm²) ghép tâm phím `getLayout('alice')` → lệch tối đa 0,02mm. Tai gasket =
  phần plate lòi khỏi viền PCB > 1,5mm (bỏ dải 2 bên |x| > 166) → 7 tai (3 sau, 2 góc trước, 2 giữa trước), tâm gasket lùi 3mm từ mép tai
  → `BLOSSOM_GASKETS` (= `CASES.aliceAlu.gaskets`).
- `AlicePlate` (Board.tsx) dựng `ExtrudeGeometry` từ `BLOSSOM_PLATE` (dựng 1 lần, dùng chung), bỏ GLB. `alice.glb` / phần Alice trong
  `convert-plates.mjs` giờ không dùng nữa (chưa xoá). Chụp kiểm: plate có tai, lỗ switch khớp PCB, gasket trên tai.

## Gasket Poron dán trên + dưới tai plate, bán ở Shopii (2026-10-27)

- Yêu cầu: "ko gắn gasket lên à? sao mất bước đó rồi?" + ảnh khoanh các tai plate Blossom: "dán xuống ở trên ở dưới như poron, search
  trên mạng kiểu build này bán trong shop luôn".
- Mất bước: (1) bảng đổi case dev (`setDevCase`) giữ vị trí bước theo tên → đổi sang Blossom khi đã qua chỗ chèn `gasket` thì bước này
  bị coi như đã làm; (2) save cũ có Blossom / Catto với mount tray / O-ring (case giờ chỉ gasket) → `startBuild` vẫn dùng mount cũ.
  Sửa: `remapStepIdx` (steps.ts) — bước mới chèn trước chỗ đang làm thì lùi về đó (dùng ở `setDevCase` + `fixMount`); `fixMount` /
  `fixOrderMount` (persistence.ts) chạy mọi lần nạp save: mount case không làm được → mount hợp lệ; `startBuild` cũng tự đổi.
  Kiểm bằng script: save Blossom tray ở `caseIn` → nạp lại thành gasket, đứng ở bước `gasket`.
- Vật tư `gasketPoron` (`GASKET_ID`, `GASKET_PER = 2`): tham khảo "Poron Gasket Foam Strips 20pcs" (20 × 4mm, dày 2 / 3mm, ~8–10 USD,
  computerorbit.com) → gói 20 miếng 180k / 60 miếng 480k; `placeGasket` trừ 2 miếng mỗi điểm (hoàn tác trả lại). Ảnh Shopii
  `createGasketStrips` (giấy lót + 8 dải đen).
- `GASKET = { w: 20mm, d: 4mm, t: 2mm }` (u): `Gasket` (BoardDetails) vẽ 2 dải: mặt trên plate (0 → t) + mặt dưới (plateBot − t →
  plateBot), thay khối bọc mép cũ. Gờ case code 2 mảnh dời theo: gờ dưới tới `plateBot − t`, gờ đè trên từ `t`. Blossom: tâm dải trên
  tai (lùi 3mm từ mép tai, `BLOSSOM_GASKETS`). Chụp kiểm Blossom (dải chờ dán trên + dưới tai) + gasket60.
- Test lại (playwright, scratchpad `pw/gk.mjs`): lộ lỗi `remapStepIdx` — đổi case 1 mảnh → 2 mảnh thì bước mới đầu tiên là `caseOpen`
  (đầu danh sách) nên build lùi về tận đầu. Sửa: bỏ qua `caseOpen` khi tìm bước mới (case mới coi như đã mở). Sau sửa: plastic60 ở
  `caseIn` → gasket60 đứng ở `gasket`; dán 1 điểm trừ 2 dải (3 → 1), còn 1 dải thì không dán được, hoàn tác trả lại (→ 3);
  Shopii tìm "Dải gasket" ra sản phẩm 20 miếng 180k, ảnh vỉ dải đen.
- **Dải gasket dài hết tai + tai chữ V** (người dùng: "gasket phải dài hết chứ sao có 1 nửa"; "2 cái chữ v quá dài, 1 cái bị lệch qua
  trái"): dải cố định 20mm → dài theo tai, xoay theo mép. Lần 1 gom cụm ô lưới ngoài PCB + trục chính (PCA): ở chữ V cụm nối liền với
  dải viền xiên nên dải dài ~68mm, lòi ra ngoài plate. Lần 2 (đang dùng, `gen-blossom-plate.ts`): đi dọc viền plate mỗi 1mm, chỗ nào
  vùng 1 → 5mm tính từ mép vào nằm trọn trên plate + ngoài PCB thì dán được; đoạn liền cùng hướng (lệch < 8°) = 1 dải, tâm lùi 3mm.
  Ra 7 dải: sau 48 / 104 / 97mm, góc trước 56 / 34mm, chữ V ~36mm xiên ±0,19 rad. `BLOSSOM_GASKETS` = [x, z, dài, góc],
  `ctx.gaskets` thêm `w` / `rot`, `Gasket` xoay theo `rot`. Tiêu hao `gasketStrips`: mỗi mặt nối đủ dải 20mm phủ hết dài → Blossom
  23 dải × 2 mặt = 46 miếng (gói 60). Kiểm bằng bản đồ ký tự (không ô dải nào ngoài plate) + chụp từ trên.

## Blossom: 2 mảnh khép chưa khít (2026-10-27)

- Yêu cầu: ảnh nhìn ngang Blossom, khe đen giữa nắp và đáy: "2 mảnh khép lại chưa khít nhau fix đi".
- Đo (tia đứng qua vách bên x = ±177mm, mỗi 5mm theo z, đáy = điểm cao nhất node `bottom`, nắp = điểm thấp nhất node `case`):
  khe 1,33mm ở mép sau tăng đều tới 2,43mm ở mép trước (120mm) → nắp nghiêng thiếu ~0,0091 rad và cao hơn ~1,3mm.
- `convert-user-cases.mjs` (alice-blossom, nắp U_Case): `dz 27.1 → 25.8`, `rot.angle 0.085 → 0.0941` (cùng tâm xoay mép sau). Chạy lại
  `bun run convert:user-cases`: chỉ `alice-blossom.glb` đổi (md5 các case khác giữ nguyên). Khe sau sửa 0,01–0,2mm hai bên vách.
- Board theo nắp: nắp ở giữa hạ 1,95mm (−0,102u), dốc thêm 0,0092 rad → `CASES.aliceAlu.seat` `{ rise: −0.048, tilt: 0.085 }` →
  `{ rise: −0.15, tilt: 0.0942 }`. Chạy lại `probe-case-feet.mjs` (feet Blossom lệch 0,1mm). Chụp kiểm: lật đáy + nhìn nghiêng mặt bên.

## Đường tách Blossom, 2 dải gasket hai bên, mũi tên feet / thả board / đậy case (2026-10-27)

- "sao lại liền luôn 1 khối thế này, phải có độ tách để người dùng hiểu case này là case 2 mảnh": khép sát (khe ≤ 0,2mm) trông liền khối →
  `convert-user-cases.mjs` dz nắp 25.8 → 26.4 (khe đều ~0,6mm = đường tách tối mảnh dọc thân), board `seat.rise` −0.15 → −0.118.
  Chụp nghiêng / nhìn ngang: thấy rõ đường ghép, không hở to.
- "2 bên thiếu 2 gasket": `gen-blossom-plate.ts` bỏ lọc |x| < 166 → thêm 2 dải dọc 2 mép bên (x ±172mm, ~78mm, xoay 90°), tổng 9 dải =
  62 miếng → gói lớn `gasketPoron` 60 → 100 miếng (750k).
- "bước đậy nắp case trên không có mũi tên hướng dẫn à", "dán feet và thả board vào case cũng phải có": `HintArrow` trong Case.tsx —
  feet: dưới hốc dán tiếp theo (`group rotation-x π` như vít đáy, case lật úp thì chỉ xuống); caseIn (chưa thả): trên giữa vách trước case
  dưới (`frontZ`, cao `wallTop` / `BLOCKER_TOP` case CAD); đậy / úp case trên (`placing`): trên vách trước case trên đang lơ lửng.
  Chụp kiểm plastic60 (feet, thả board) + gasket60 (đậy case).

## Q lật case trên ở bước úp / đậy case 2 mảnh (2026-10-28)

- Người dùng: "ở bước case 2 mảnh bấm q thì phải lật được mặt top case lại, hiện tại ko lật được" (`topCase` / `caseClose` nằm trong
  `NO_FLIP_STEPS` nên Q bị tắt).
- `TOP_FLIP_STEPS` (steps.ts): ở 2 bước này, khi case trên còn lơ lửng (`!build.closed`) thì `canFlip` (BenchHud) bật lại; Assembly vẫn
  không lật board, chỉ Case.tsx xoay nhóm case trên quanh tâm `(Y.split + Y.caseTop) / 2` theo `viewFlip` (lerp như Assembly), ẩn mũi tên khi lật.
  Bấm úp / đậy lúc đang lật: case tự lật về khi hạ xuống; `placeTopCase` reset `viewFlip` (closeCase sang bước qua `nextStep` đã reset).

## Top mount: hốc vách case trên + ốc M2 + tự lật để vặn (2026-10-28)

- Người dùng: plate top mount phải có tai khoét lỗ, case trên có lỗ lõm để bắt plate, ốc ngắn M2×3 / M2×4 (lớn hơn M2.5) có sẵn trên khay;
  sau đó chỉ ảnh: lỗ không được nằm trên khối vấu lồi ra mà lõm vào trong vách; úp case xong phải lật (Q / bấm case) mới vặn, có mũi tên.
- `TOP_NOTCH` (sâu 0,22u vào vách, rộng hơn tai 0,02u mỗi bên), `TOP_HOLE` (tâm lỗ cách mép board `CASE_MARGIN + d / 2`, lỗ tai r 1,05mm,
  lỗ ren r 0,8mm). `caseShellGeometry(..., notches, notchTop)`: ruột vành có hốc chữ nhật (`notchedRect`, `WallNotch`) từ đáy lên,
  khối lấp phần trên `notchTop` (= 0, mặt plate) làm trần hốc. Bỏ `TopBosses` (khối vấu) → `TopTapHoles` (miệng vát + lòng lỗ tối ở trần hốc).
- Tai plate (`plateGeometry` tabs) dài vào hốc + khoét lỗ M2. Ốc `topScrew`: model socket M2×6 rút còn M2×4 (`SCREW_SHORT`, dùng chung
  ScrewSet / `screwLength` / `LooseScrew`), vẫn đầu chữ thập. ScrewTray bày sẵn ốc top mount chưa bắt.
- `topScrew` bỏ khỏi `autoFlip`; `placeTopCase` úp xong tự `nextStep`; chưa lật (`!viewFlip`) thì vít không bấm được (`ScrewSet active`),
  bấm case trên = `toggleFlip`, mũi tên vàng ở mép trước case, hint Objective / thoại Keeb-chan nhắc bấm Q.
- Đã chụp kiểm (playwright, scratchpad `pw/top.mjs`, gasket60 top mount): hốc + lỗ ren khi lật case trên, sau úp chưa lật có mũi tên, Q lật thấy 6 vít.

## Vỏ case khoét CSG liền khối, lỗ vít case xuyên thành, tách 2 mảnh, plate top mount phủ kín (2026-10-28)

- Người dùng (chỉ ảnh): lỗ vít bot case chỉ là hốc nông, nằm lọt vào trong lòng case (cách mép board 0,4u) → vít không ăn vào đâu; hốc top mount
  trông như cắt rồi nhét khối vào; mở hết vít đáy phải tách 2 mảnh; dán feet chỉ hiện case dưới; top mount không được bỏ qua plate;
  khe hở PCB – thành case khi lật bước bắt vít top mount là sai.
- `caseShellGeometry(..., notches, notchTop, bores)`: vỏ bo mép đùn 1 lần rồi trừ khối bằng `three-bvh-csg` (`carve`, chuyển sang
  dependencies): hốc tai plate (box từ đáy lên `notchTop`) + lỗ khoan đứng `WallBore`. Bỏ cách ghép khối lấp trần hốc.
- `caseScrewPoints`: vít luôn ở giữa thành case (`depth / 2 + CASE_MARGIN + CASE_WALL / 2`), cả bắt từ đáy. `CASE_BORE` (M3 đầu bằng: hốc chìm
  r 3,2mm sâu 0,05u, lỗ xuyên r 1,7mm hết thành case dưới, lỗ ren r 1,25mm sâu 0,16u ở mặt dưới thành case trên), `boredCase` (2 mảnh dựng bằng code,
  không mica, bắt từ đáy), `caseBores`, `caseScrewY` (đầu ốc chìm trong hốc), `caseScrewShaft` (thân ren xuyên thành dưới ăn lên case trên; dùng ở
  ScrewSet / ScrewTray). `caseScrewHoles` giờ chỉ cho mica bắt từ trên (hốc nông dưới sàn bỏ). orderThumb khoét giống bàn build.
- Vít top mount tách khỏi vít case (`topScrewPoints`: mỗi cạnh n + 1 vít, né vít case đủ xa để hốc không cắt lỗ ren); lỗ ren M2 khoan CSG từ trần hốc,
  đáy lỗ tối `BoreEnds` (thay `TopTapHoles`).
- `useCaseSplit` (`scene/parts/caseSplit.ts`): bước `caseOpen` tháo hết vít (chờ con cuối bay ra) thì cụm lật ngửa (Assembly) + case trên nhấc lên 2,6u.
  Bước feet vốn chỉ vẽ case dưới.
- `isOptionalStep(step, order, steps)`: `plate` không bỏ qua được khi có `topCase` (kể cả đơn dev); `placeTopCase` chặn khi `!build.plate`.
- Plate top mount (case dựng bằng code, `topFull` trong Board.tsx): viền plate = chữ nhật bo góc lòng case trừ `TOP_PLATE_GAP` 0,02u, tai nối từ mép plate.
- Đã chụp kiểm (playwright `pw/top.mjs`, gasket60 top): tách 2 mảnh, lỗ xuyên + hốc chìm ở đáy, hốc tai plate liền khối có lỗ ren, plate phủ kín khi lật.

## Miệng lỗ vít theo kiểu đầu ốc (2026-10-28)

- Người dùng: ốc trụ (lục giác chìm) → lỗ âm counterbore; chữ thập / lục giác / dẹt đầu bằng → countersink. Ốc top mount dùng đầu trụ lục giác
  hoặc chữ thập đầu dẹt (mặt tì phẳng), không đầu côn.
- `SCREW_HEADS` (steps.ts, chuyển từ `SCREW_STYLES` trong Screw.tsx, Screw.tsx dùng lại) + `HEAD_MM`; `caseHeadHole(head)`: đầu bằng → hốc côn 90°
  (`WallBore.r1`, CylinderGeometry 2 bán kính) từ r đầu + 0,2mm xuống bằng lỗ xuyên, đầu ốc phẳng mặt đáy (`caseScrewY` = `Y.floorBot`); đầu trụ /
  tròn → hốc trụ sâu cao đầu + 0,3mm, đầu ốc chìm. Vít case hiện là M3 đầu bằng lục giác → countersink.
- Ốc top mount: socket M2×4 (đầu trụ phẳng), đầu vít đổi `SCREW_BITS.topScrew` chữ thập → lục giác cho khớp ốc lục giác chìm.
- Chụp kiểm: đáy case thấy hốc côn + lỗ xuyên, vặn xong đầu ốc bằng phẳng mặt đáy.

## Kéo bàn mod stab bị ngược lưỡi (2026-10-28)

- Người dùng: "cây kéo trên bàn build đang bị ngược lưỡi" (ảnh: 2 lưỡi hẹp ở đinh tán, mũi bè).
- Nguyên nhân: model "Loop scissors" để thân lưỡi (`Tapered cutting blade`) nằm lấn vào phía trong, mép ngoài đi qua tâm đinh tán →
  2 lưỡi chồng nhau, phần lộ ra hẹp ở gốc / bè ở mũi. Gốc rễ: model dùng **cùng 1 hình lưỡi** cho 2 bên (chỉ xoay ±25°), không đối xứng gương.
  Sửa trong `Scissors` (`scene/models/ModTools.tsx`): chỉ lật lưỡi ".001" (bên trái trên bàn) qua trục dọc (`scale.z *= -1`),
  lưỡi không hậu tố giữ nguyên → 2 lưỡi đối xứng gương, mép cắt thẳng + mũi nhọn quay **vào trong** (khép lại 2 mép cắt gặp nhau).
  Đã sai 2 lần: lật cả 2 lưỡi (lưỡi trái vẫn lệch) → chỉ lật lưỡi phải (đối xứng nhưng mũi nhọn hướng ra ngoài, "sao mà cắt").
  2 cặp đối xứng gương khác nhau ở phía mũi nhọn: chọn cặp mũi ở mép trong.
- Lỗi kèm theo: three bỏ dấu chấm trong tên node ("blade.001" → "blade001") nên `endsWith('.001')` không khớp, cả 2 nửa gom vào 1 nhóm
  (nửa kia rỗng) → `setScissors` xoay cả cây kéo thay vì khép 2 lưỡi. Đổi sang `/\.?001$/`; đã thử mở / khép nửa / khép kín đúng chiều.

## Phòng đi lại kiểu PC Building Simulator (2026-10-28)

- Người dùng: "đi lại được trong căn phòng như tựa game pc builder simulator", bàn build + bàn máy tính (lót chuột 90 × 40),
  góc làm việc cạnh cửa sổ có rèm, đi lại lấy hàng giao tới, lịch lớn trên tường (sale, đơn, số ngày) bấm → kết thúc ngày /
  quay lại; bỏ nút kết thúc ngày trên máy tính. Sau đó chỉnh theo ảnh mẫu PCBS: rèm **lá** (không phải rèm vải), **ít nắng thôi**,
  tường **xám xanh**, CPU **dưới gầm bàn** kéo dây lên màn hình, ô cửa cạnh bàn máy tính ra **hành lang** nhận hàng, chậu cây nhỏ +
  chỗ để thùng hàng bên phải hành lang, **ghế đôn thấp**, 2 bàn **sát nhau** dưới cửa sổ lớn, **kệ bàn phím ra sau lưng**.
- Chế độ: `screen = 'bench'` + `walk` (metaSlice, không lưu). `standUp(from)` (icon "Đứng dậy" desktop, nút xanh BenchHud /
  EmptyBenchHud, nút Mezzenger "Đứng dậy ra lịch"); `goBench` / bay vào PC thì `walk = false`. Bench.tsx: `walk` thì thay OrbitControls bằng
  `WalkControls`; CameraRig / EmptyBench bỏ qua đặt camera khi đang đi; `PcZoom` chạy được không có OrbitControls (lookAt).
- `scene/room/`: toàn bộ toạ độ ở `roomLayout.ts` (m × M; ROOM / ROOM_BOUNDS dời từ Room.tsx sang). Gốc vẫn = tâm bàn build
  (đồ build không đổi). Bàn máy tính `PC_DESK` sát trái bàn build cùng dựa tường sau (PcDesk dựng dài theo z rồi xoay −90°);
  màn hình 27" (`SCREEN` 0,6 × 0,35, `screenEye` lùi 0,53m), `MONITOR_AT` theo bàn máy tính.
- Đi: WASD / mũi tên, Shift chạy, kéo chuột / 1 ngón nhìn (không pointer lock để còn bấm đồ vật), bấm sàn tự đi tới.
  Va chạm: kẹp vào vùng gần nhất trong `WALK_AREAS` (phòng / hành lang / ô cửa) rồi đẩy ra khỏi `BLOCKS` (2 bàn, kệ, bàn gỗ); ghế không cản.
  Đứng dậy / ngồi xuống bay camera 0,7s (`useRoom.fly`, `sitAtBench`). Đi lại thì useKeyboardTest không bắt phím (WASD không tính test).
- Vật bấm: `RoomSpot` (viền xanh + HUD "Bấm: ..."; bấm = click có `e.delta ≤ 6`). Bàn build khi đi: hộp vô hình `BenchSeat`
  (xoá pháp tuyến để viền hover bỏ qua) chặn bấm nhầm đồ build, bấm → ngồi vào.
- Tự dựng (Sketchfab cần đăng nhập, Poly Haven không có): bàn máy tính + hộc tủ + dây cáp, lót chuột, cửa sổ + rèm lá (`RoomWindow`:
  lá nghiêng 1,2 rad, vệt nắng = lăng trụ cộng sáng qua 1/9 số khe, opacity rất thấp), ghế đôn (`Stool`), lịch (canvas), thùng hàng.
  Đèn spot ngoài cửa sổ đã thử rồi bỏ: không đổ bóng nên chiếu xuyên tường, vệt chéo gắt trên tường / màn hình.
  Dùng model Poly Haven mới: `WoodenTable_03` (bàn gỗ tường phải), `modern_ceiling_lamp_01` (đáy chao 2,05m cho khỏi ngang mắt).
- Tường: bỏ ảnh màu be, giữ normal / roughness, màu `WALL_COLOR` `#8796a3`. Tường trái dày 10cm khoét ô cửa (`LeftWall`, `DOORWAY`);
  hành lang `HALL` (sàn, trần, tường, cửa chính `Door x` dời từ tường trước ra cuối hành lang).
- Kệ bàn phím: giữ toạ độ dựng cũ, bọc cả khối trong group xoay 180° sang tường trước; đồng hồ dời x = 0,2.
- Bổ sung (người dùng: "chưa đi lại được bằng phím điều hướng / wasd, như 1 nhân vật đi lại"): WASD trong chế độ đi đã chạy (thử
  playwright), nhưng trước đó phải bấm "Đứng dậy" và vào game là ở desktop. Sửa: `newGame` / `continueGame` vào thẳng phòng
  (`screen 'bench'` + `walk`, đứng dậy từ máy tính, toast nhắc phím); đang ngồi bàn build bấm WASD / mũi tên thì tự `standUp('bench')`
  (`Controls` trong Bench.tsx; bỏ qua bước test, đang gõ, bảng chọn đơn / popup); `nextDay` không đưa về desktop nữa (ở nguyên phòng).
- Tranh "Ếch ngồi đáy giếng" ký tên keeb (`FrogPainting`, vẽ canvas, chữ ký font Caveat) treo tường sau bên phải lịch.
- Hành lang (người dùng: "hành lang ngắn quá, cửa ở cuối hành lang đối diện, gần chậu cây là cửa sổ rèm lá"): `HALL.z0` −2,0
  (dài ~5,2m, chạy ra sau phòng); cửa chính ở đầu xa (`Door` nhận `x / z / rot`, xoay 180°), hàng giao tới xếp cạnh cửa chính;
  đầu gần chậu cây là cửa sổ rèm lá (`RoomWindow size={HALL_WINDOW}`), đơn chờ gửi + chậu cây giữ nguyên chỗ.
- Trần phòng + hành lang đổi từ kem `#efeae2` sang xám tro `CEILING_COLOR` `#a3a7ab` (người dùng: "trần nhà phải màu xám tro").

## Phòng to hơn, hành lang, tranh, đồ bàn máy tính (2026-10-28, tiếp)

- Phòng 3,6 → 4,8 × 4,6m (`HALF_W`, `BACK_M`, `FRONT_M` trong roomLayout, bỏ số cứng 1.8 / 3.197); hành lang dài ~7m (`HALL.z0` −3),
  ô cửa phòng ↔ hành lang `DOORWAY` z 0,7–1,6. Cuối hành lang: cửa gỗ 6 ô sơn xanh + tay gạt + công tắc (`HallProps` `PanelDoor`)
  ở **tường bên trái cuối hành lang** (theo ảnh mẫu), kệ sắt xanh 3 tầng (`MetalRack`) để hàng giao tới (`DoorParcels` xếp lên tầng)
  - ghế đôn. Phào chân tường (`Wall` `skirt`). Trần cùng màu sơn tường (`CEILING_COLOR = WALL_COLOR`).
- Tranh: canvas dùng chung `CanvasPainting` (khung + viền giấy + chữ ký Caveat `signature`): ếch đáy giếng, tờ "300k" (tiền meme
  không có thật, không vẽ chân dung, `banknoteArt`), graffiti QMK keycap (`qmkArt`, tường trái cạnh bàn máy tính).
  Khung Poly Haven CC0 (`ModelPainting`, đặt lại UV mặt tranh 0..1): "Phượng hoàng tái sinh" tự vẽ (`phoenixArt`) trong khung mạ
  `fancy_picture_frame_02` trên bàn gỗ tường phải, + `fancy01` / `hanging02` / `hanging03` giữ tranh gốc.
- Sân vườn 3D ngoài cửa sổ (khoét lỗ tường thật + mặt tường ngoài + cỏ / cây / hàng rào + cầu trời, camera far 9000) đã làm rồi
  **gỡ** theo người dùng ("nặng máy quá"): cửa sổ dùng ảnh vẽ canvas (trời, cây xa, bãi cỏ, hàng rào trắng, bụi hoa) dán sau kính.
  Cửa sổ tường trước (cạnh tủ trưng phím) cũng **xoá** theo người dùng; còn cửa sổ trên bàn máy tính + cuối hành lang.
- Bàn máy tính: CPU dời khỏi chân bàn (z −0,29); lót chuột in biển hiệu Topre (vẽ lại canvas `topreArt`; có `public/textures/mousepad.png`
  thì dùng ảnh đó). Bàn phím / chuột = model người dùng đưa: Topre Realforce 87U (quét 3,9 triệu tam giác, 123MB) + Razer DeathAdder
  (kèm lót chuột → ẩn mesh `pad|light`), `bun run convert:desk-gear` (gltf-transform optimize: simplify 2%, meshopt; nén texture
  sharp lỗi nên bỏ) → `public/models/desk/` 1,6MB + 3,3MB; `DeskGear` co theo chiều dài thật (36,5cm / 12,7cm). File gốc ở
  `assets/user-desk/` (gitignore).
- Tốc độ đi 1,5 → 2,2 m/s (chạy 3,4).
- Chuột DeathAdder đổi sang tay phải (hệ bàn máy tính: người ngồi phía +x nhìn −x → tay phải là −z), bàn phím dời sang trái.
- Trần trông nâu tối dù cùng màu sơn: mặt trần quay xuống, đèn chính chiếu từ trên không rọi tới → `Ceiling` dùng chung vân trát +
  `WALL_COLOR` và giả pháp tuyến như tường.
- Chậu cây trên bàn build → đèn tay đòn Poly Haven `desk_lamp_arm_01` (tải lại bằng `fetch-room.mjs desk_lamp_arm_01`; hằng `LAMP`),
  kẹp mép sau góc phải. Dây điện + ổ cắm tường dùng chung (`room/Wiring.tsx` `Cable` / `Outlet`): đèn cắm ổ tường sau, máy tính cắm ổ sau bàn.
- Esc khi đang ngồi bàn build (không phải bước test, không có popup) → `standUp('bench')` ra phòng; đi lại / máy tính thì Esc mở Cài đặt như cũ.

## Kìm cắt + kéo bàn mod stab to hơn (2026-10-28)

- Người dùng: "kìm cắt và kéo hơi nhỏ so với stab, sửa để giống tỉ lệ thật hơn". Stab trên bàn mod phóng `B = 2`, kéo cũ ~1,4u
  (kéo thật 20cm × 2 sẽ dài hơn nửa bàn) → thêm `TOOL_K = 1.8` trong StabModStation: scale group kìm / kéo, khoảng mũi ↔ chốt
  (vị trí nghỉ, điểm kẹp chân stab `0.65 × TOOL_K`, điểm cắt băng Urgo `0.4 × TOOL_K`), ngưỡng `clipperHit`, ô "Thiếu kìm cắt",
  bề rộng bàn. Phần gạc bỏ đi `PAD_AWAY` dời sang x −6,3 cho khỏi nằm dưới kéo.
- Rèm lá đổi sang model người dùng đưa (2026-10-29, "đổi qua model rèm này"): `venetian_fraim_window.glb` → `public/models/room/venetian-blind.glb`
  (214KB, ray + lá + dây + gậy xoay, 1 × 1,66m, gốc giữa chân rèm). `VenetianBlind` (RoomWindow) co x / y vừa lòng ô cửa; bỏ lá / dây
  / ray tự dựng, hằng `SLAT_*` chỉ còn để tính vệt nắng. Dùng ở cả cửa sổ bàn máy tính lẫn cuối hành lang.
- Bàn máy tính đổi sang model người dùng đưa (2026-10-29, "thay model bàn làm việc, bàn có hộc"): `office_desk.glb` →
  `public/models/desk/office-desk.glb` (86KB, low-poly, đơn vị riêng 0,33 × 0,19 × 0,14). `DeskBody` (PcDesk) co từng trục cho
  đúng `PC_DESK` (dài 1,2m theo z, sâu 0,7m, cao = bàn build 0,799m), xoay π/2 cho mặt ngăn kéo ra phòng. Bỏ mặt gỗ óc chó / chân thép /
  hộc tủ tự dựng (`Legs`, `Cabinet`). CPU vẫn ở gầm bàn (z −0,29), nằm gọn khoảng để chân giữa hộc trái và kệ phải.
- Nền sau kính cửa sổ: bỏ cảnh vẽ ngoài trời, thay mặt trắng bóng như gương (`MIRROR` meshPhysical trắng tự sáng + clearcoat, người dùng:
  "nền cửa sổ đổi thành nền trắng như gương").
- Rèm lá đổi chất liệu gỗ sồi có vân (`BLIND_WOOD` = texture `oak_veneer_01`): model không có UV ở lá nên `woodUv` sinh UV phẳng
  theo toạ độ model (u dọc lá ×1,5, v = y + z ×6) cho vân chạy dọc lá; dây rèm giữ màu gốc.
- Khung + bậu cửa sổ đổi từ gỗ sơn trắng sang gỗ nâu (`FRAME` = texture óc chó `walnut_veneer`, người dùng: "khung cửa gỗ nâu").
- Thùng CPU dời vào ngăn kệ hở bên phải bàn có hộc (`CPU_AT` [0, 0.03, −0.475] hệ bàn), 3 đầu dây cáp dời theo.
- Màn hình máy tính đổi sang model người dùng đưa (2026-10-29): `asus_pc_gaming_monitor.glb` → `public/models/desk/asus-monitor.glb`
  (1,1MB). `Monitor` (models/Computer.tsx): mesh material "Screen" thay bằng ảnh desktop KeebOS (UV đặt lại theo khung mặt kính, lật u
  vì model quay mặt kính về −z nên xoay 180°), co cả model cho mặt kính rộng `SCREEN.w` 0,6m, chân đế chạm bàn, mặt kính ở
  `SCREEN.d / 2`. `SCREEN` đổi theo số đo model (cao 0,345, mép dưới 0,081) để `screenCenter` / `screenEye` (camera bay vào) khớp.
  Viền hover dùng `useHoverOutline` thay `HoverShell` (đã xoá). Bấm vẫn `zoomToPC`.
- Viền hover màn hình ASUS: vỏ / mặt kính là tấm phẳng mỏng nên viền phồng (`useHoverOutline`) chỉ lộ ở chân đế → thêm khung chữ nhật xanh phẳng (`ShapeGeometry` ôm khung bao vỏ, `visible={hover}`) sát trước mặt kính.
