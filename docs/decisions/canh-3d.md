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
