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

### O-ring mount: vòng kẹp giữa PCB và plate (2026-10-25)

- Yêu cầu: O-ring mount = vòng O-ring cuốn quanh, kẹp giữa PCB và plate, dùng cho case 1 mảnh.
- `buildContext`: mount `oring` gá vòng (`ring`) **trước** bước plate, bỏ bước gasket; OG giữ gasket → ring sau switch.
  Case có O-ring (Tofu60 Redux, Catto HHKB, Bakeneko 60) đều 1 mảnh.
- `SiliconeRing({ between })` (BoardDetails.tsx): O-ring cao bằng khe PCB–plate, tâm ở mép board, bo tròn (RoundedBox);
  OG vẫn ôm cả mép. Gợi ý bước + `MOUNTS.oring.desc` + OVERVIEW cập nhật. Đã chụp góc nghiêng: vòng nằm giữa PCB và plate.
- Bản lưu cũ đang build dở mount O-ring sẽ lệch thứ tự bước (danh sách bước đổi).

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
