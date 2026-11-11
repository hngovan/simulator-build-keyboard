# Cảnh 3D & model

## 2026-11-11

### Switch: stem Kailh Box, thân stem, lò xo trong housing trong; DCS pháp tuyến

- Yêu cầu: model switch nhìn thật hơn (stem box, chân / ray thân stem, thấy lò xo qua housing trong); keycap DCS bóng đổ sai.
- `Switch.tsx`: màu housing Kailh Box; stem box `BOX_STEM` (`roundRect` + `ExtrudeGeometry`, `boxStemGeos`); thân stem `bodyGeo`
  (khối + cột giữa vát đầu + khung chân mặt sau `STEM_BODY.leg` + ray 2 bên `rail`), gờ tactile `tactileGeo`; `stemBodyGeos(type)`.
  Lò xo `SPRING_IN` (`springGeometry`) chỉ vẽ khi housing trong (`switchSeeThrough`). Bàn lube dùng `bodyGeo` mới (chưa có box / gờ tactile).
- DCS: OBJ có `vn` không chuẩn hoá (dài ~0,1) → `convert-keycaps.mjs` `fromObjAll` gọi `normalizeNormals()`; 4 GLB `dcs-r*` chuẩn hoá tại chỗ.
- Chụp lại ảnh Shopii `ONLY=switch` + `ONLY=dcs`.

### Enter chữ L dựng bằng code: bo mép, lòng chảo, gân + stem dưới keycap

- Yêu cầu: Enter ISO / Big-ass thô, mặt trên phẳng, vai XDA khác Enter thường; mặt dưới thiếu gân như keycap CAD; stem xuyên lên mặt.
- `keycapShape.ts` `lCapGeometry(bottom, halfD, shape, profile)`: góc bo Bézier (`CORNER_R` / `CORNER_R_TOP`), vách phình
  (`WALL_BULGE`), mép bo elip theo profile (`RIM_OF`: XDA vai cao tròn, DSA / SA / MT3 tròn rộng), lòng chảo theo khoảng cách mềm tới mép
  (`DISH_R`, cầu với `SPHERICAL_DISH`, trụ với profile khác), mặt trên lưới `TOP_STEP` cắt bằng `polygon-clipping`, điểm biên khớp cạnh vòng mép.
- `capUnder(k, cap, cadWide)` (thay `stabUnderGeometry`): bắn tia vào bản sao 2 mặt của keycap đo trần → gân chính xuyên 3 stem từ vách tới vách
  - gân ngang mỗi stem, đỉnh gân theo trần, stem stab chạm trần. Vỏ dày (CAD) gân cắm nhẹ vào vỏ; vỏ 1 lớp (Enter chữ L, ASA) gân / stem lùi
    dưới mặt `THIN_GAP` 0,05u và kẹp mọi đỉnh dưới mặt bằng tia từ trên (trước bị xuyên thành vệt chữ thập trên mặt keycap).
- Dùng ở `Keycap.tsx` (`NativeCap` + keycap dựng bằng code), `modelThumb.ts`, `orderThumb.ts` (truyền `profile`).

## 2026-11-10

### Keycap SA / DSA phím rộng thật + chất liệu keycap Free build + "Layout hỗ trợ"

- Yêu cầu: có DSA / SA cỡ rộng thì thêm (layout có Shift trái 1.25u, space 7u); DCS có cả ABS lẫn PBT; ASA vẫn chưa có stem;
  bỏ "giá mềm nhất" ở chất liệu keycap; "Layout hợp" → layout hỗ trợ (40%, 60%, Full size...), không kèm chú thích loại case.
- mjseabright/keycaps bản `med`: SA phím rộng theo hàng (R1 1.5 / 2; R2 1.5 / 1.75; R3 1.25–3, space 6.25 / 7, đứng 2u; R4 1.25–2.75)
  - DSA 1u–2.75u + đứng 2u (DSA 1u đổi luôn nguồn). `convert-keycaps.mjs`: tên `sa-r3-w625`, `dsa-h200` (`wideTag`), scale theo cạnh ngắn.
    `keycapShape.ts` `WIDE` + `wideModel`: `keycapModel(profile, row, w, h)` trả model đúng cỡ (space ≥ 6u lấy R3), không có thì 1u kéo dãn.
    `stretchCapGeometry` kéo dãn theo cỡ thật của model (bounding box), không còn cố định 0,46 → model đúng cỡ gần như không giãn.
- Dev server đang chạy không nhận một số file GLB mới trong `public/` (trả về HTML) → khởi động lại `bun run dev`.
- Free build: chọn chất liệu keycap (`FreeBuildOpts.keycapMaterial`, ô thứ 2 cạnh bộ keycap), trước luôn PBT. Shopii vốn bán đủ PBT / Mix / ABS.
- ASA: stem thêm cả ở ảnh Shopii (`modelThumb`) và ảnh đơn (`orderThumb`, trừ bản `lite`); chụp lại `ONLY=keycap:asa`.
- `productSpecs` keycap: "Layout hỗ trợ" = tên cỡ gọn xếp nhỏ → lớn (`layoutSizes`, bỏ phần trong ngoặc).

### Keycap thiếu stem: SA đổi nguồn, XDA khoét + gắn stem, phím rộng giữ stem tròn

- Yêu cầu: "keycap SA SP không có chân stem à? và 1 số keycap khác nữa", tham khảo github.com/mjseabright/keycaps.
- Soát GLB: SA (getclacking) + XDA (spooknik) chỉ là vỏ ngoài đặc để render, không lòng / stem; ASA + Enter chữ L dựng bằng code cũng không có.
- SA đổi sang mjseabright/keycaps (MIT, bản `med` `sa_R*_100x100`, có lòng + stem MX, đủ R1–R4) → `assets/keycaps/sa/r1..4-1u.stl`;
  `R_OF.sa` [1,2,3,4,4], `CAD_ROW.sa` đo lại (R1 cao 0,75u). Bỏ nguồn getclacking (file + giấy phép).
- XDA: `convert-keycaps.mjs` `hollowWithStem` (three-bvh-csg: trừ khối chóp cụt lòng keycap, thêm trụ stem Ø5,5mm lỗ chữ thập 4,1 × 1,3mm).
- Code: `stemGeometry(top)` (keycapShape.ts) gắn dưới ASA / Enter chữ L trong `Keycap.tsx`. `stretchCapGeometry` không kéo dãn điểm stem
  (gần tâm, thấp hơn đáy lòng chảo, pháp tuyến không hướng lên) → phím rộng stem vẫn tròn, không bè ra.

### Keycap DCS + font chữ riêng theo profile + keycap đổi tiếng gõ

- Yêu cầu: thêm model keycap DCS (github.com/Fooblitzky/DCS_keycaps), mô tả keycap thành mỏng trên switch tactile, nhất là top mount
  thì tiếng ngon hơn (tự tìm trên mạng: DCS thành mỏng, gõ gọn / clacky, cảm nhận rõ bump tactile, Keebtalk / Deskthority);
  font chữ Wyse cho DCS, font Cherry, font SA riêng.
- Model: OBJ blank `Row_N_1u` R1–R4 → `assets/keycaps/dcs/`, `convert-keycaps.mjs` (`fromObjAll`, trục z lên) → `dcs-r1..4.glb`;
  `keycapShape.ts`: `PROFILE.dcs`, `R_OF.dcs` [1,2,3,4,4], `CAD_ROW.dcs` (đo từ GLB), `keycapModel` theo hàng như Cherry / OEM / SA.
  `KEYCAP_KITS.dcs` (760k, cấp 3 `KEYCAP_LV`, `desc` hiện ở Shopii). Ảnh Shopii: `ONLY=keycap:dcs bun run bake:thumbs`.
- Font (`scene/models/legendFont.ts`): Cherry = Open Cherry, DCS = Open Gorton (Gorton Modified của SP, chữ trên keycap Wyse cổ),
  SA = Open Gorton Bold; profile khác vẫn Nunito. Font riêng không có mũi tên → phím mũi tên in Nunito. Bàn build: `CapOverlay` `font`;
  ảnh đơn (`orderThumb`) nạp `FontFace` (`loadLegendFont`) trước khi vẽ canvas. Font rộng hơn Nunito + DCS lòng chảo trụ làm 2 đầu nhãn
  dài (BACKSPACE) bị che → `legendSize` co chữ theo bề rộng phím (chừa ~0,95u).
- Âm (`parts.ts`): `KEYCAP_SOUND` cộng độ ồn / cao theo profile (SA / MT3 trầm hơn, DCS `thin` đanh hơn); `keycapSweet`: keycap mỏng +
  switch `feel: 'tactile'` = 0,5, thêm top mount = 1 → `SoundProfile.sweet`, `soundMatch` cộng `SWEET_BONUS` 12% × sweet;
  máy đo âm (`SoundMeter`) hiện dòng "✨ Tiếng ngon".

## 2026-11-08 (tối)

### Case nhựa 2 mảnh: hốc vách kín (không thủng sang rãnh rỗng)

- Yêu cầu (ảnh mặt dưới case trên lật ngửa): "ở phần khoét rãnh lõm vào để bắt case đang bị render trong suốt?". Không phải lỗi vật liệu:
  hốc tai plate top mount (`ABS_TOP.d` 0,12u) / hốc vấu bottom mount (0,09u) sâu hơn lớp da trong (`ABS_SHELL.skin` 0,08u) nên khoét
  thủng sang rãnh rỗng của thành → nhìn xuyên qua.
- `notchPockets` (caseShell.ts, chỉ case trên `absTwoShellGeometry`): hốc nào sâu hơn lớp da thì dựng vách sau + 2 vách bên + trần dày
  `POCKET_T` 0,05u trong rãnh (hốc kín như case đúc), miệng hốc vẫn mở xuống từ mép ghép; gân rãnh né thêm bề dày vách bọc.
- Vẫn thấy xuyên ("sao vẫn thấy bị xuyên qua?", ảnh khe xanh mảnh dọc mép hốc): khe nứt CSG (three-bvh-csg) dọc cạnh hốc, nhìn qua khe
  vào trong khối vách (mặt trong không vẽ). Vách bọc trước chỉ bắt đầu sau lớp da nên không che. Giờ lót mọi hốc (cả hốc nông):
  vách bên + trần phủ từ ngay mặt trong vách (0,002u), mặt lót lấn vào trong hốc `POCKET_LAP` 0,004u → sau mọi khe đều có mặt đặc.

### Case nhựa nâng đáy (gân xương cá thấp theo), pin Li-Po 3mm

- Yêu cầu: "vẫn cao cho hạ thêm vì xương cá bottom quá cao"; khi hỏi về giới hạn pin: "pin lipo mỏng dẹp lo gì ? hạ xương cá => hạ case
  bot => hạ case top".
- `BATTERY_T` 5 → 3mm (supplies.ts, pin túi mỏng). Đáy case nhựa nâng `ABS_RAISE` 0,1u: `caseFloorBot(c)` (= `Y.floorBot` + 0,1 cho nhựa),
  `caseFloorTop` nhựa = `caseFloorBot` + `ABS_FLOOR` (−0,7, ngang sàn nhôm) → gân xương cá (cao theo sàn → dưới socket) thấp còn
  ~4,7mm; DTB trên trụ ngang chỗ DTB case nhôm; pin 3mm nằm thẳng trên sàn dưới jack pin.
- Dùng `caseFloorBot` ở: vỏ 1 mảnh (`Walls` y0), `AbsTwoShell`, `RubberFeet`, độ lệch lật case trên đã tách, `caseScrewY`, `caseBores`,
  orderThumb. Cả cụm không dời xuống: đáy nhựa cao hơn thảm ~1,4mm, feet dán xong chạm thảm.
- Xem bằng Chrome ngầm Free build case nhựa 60 2 mảnh bottom mount (script tạm, đã xoá). Chụp lại ảnh Shopii case nhựa + pin (`ONLY=bat`).

### Case nhựa thấp hơn: hạ mép trên

- Yêu cầu: "tổng thể case vẫn cao nên cần hạ thấp 1 xíu" (trước đó hỏi có phải do khung xương cá: không, gân mọc theo khoảng trống
  dưới PCB; cao độ case dựng bằng code dùng chung `Y`, tổng ~24mm).
- Không nâng đáy được: sàn nhựa mỏng là để pin Li-Po 5mm nằm thẳng trên sàn dưới jack pin (`BAT_TOP`, chỉ dư ~0,1mm).
- Hạ mép trên mọi case nhựa (1 + 2 mảnh): `ABS_CASE_TOP` 0,26u (~5mm trên mặt plate, trước 0,36 = `Y.caseTop`), `caseTopOf(c)`;
  Case.tsx dùng `caseTop` thay `Y.caseTop` (vỏ, khối chặn, mũi tên, lật case trên), `AbsTwoShell` / trụ vít case trên, orderThumb.
  Chụp lại ảnh Shopii mọi case nhựa.

### Case nhựa 2 mảnh bottom mount: vấu mọc từ sàn

- Yêu cầu (ảnh bàn build, khoanh 3 trụ trong lòng case dưới): "trụ gì đây?" — vấu bottom mount (`BottomPads` nhánh `absTwo`) chỉ dựng từ
  mép ghép `Y.split` lên mặt dưới plate, ngồi trên mép da trong, nửa thân chìa vào lòng case không gì đỡ → trông như lơ lửng.
- Vấu giờ là trụ từ sàn khay (`caseFloorTop`) lên mặt dưới plate, đúc liền da trong (như trụ case nhựa đúc thật).
  steps.ts: điểm vấu `bottomPts` tính trước DTB / pin; DTB né vấu như vít ghép (`dtbSpot` nhận thêm `floorBosses`, khoảng tránh theo
  `ABS_BOSS.r`), pin né như trụ tray (`batterySpot` posts); Foam.tsx khoét foam đáy quanh vấu.

### Case nhựa 2 mảnh: case trên trùm case dưới, thành rỗng có gân + trụ vít nhỏ, trụ kê DTB

- Yêu cầu (ảnh case Transition Lite PC): "lỗ ốc ở case nhựa 2 mảnh hơi sai => phải thiết kế top trùm bot… phần top vẫn có khung xương
  (bên trong rỗng, có trụ ốc rất nhỏ để cấy vào)… vị trí gắn dtb cũng có trụ". Trước: trụ vít Ø4,6mm cao từ sàn tới dưới plate đứng
  trong lòng case (PCB + foam phải khoét rãnh né), mép ghép lộ ở giữa vách.
- Tham khảo: case nhựa đúc (Transition Lite, nguyên tắc rib / boss ép phun): trụ vít đặt trong thành, nối vách bằng gân, ren đồng cấy;
  vít bắt từ đáy sát mép.
- `ABS_WALL_2` 0,14 → 0,36u (~6,9mm), `ABS_SHELL` (da 0,08, mặt trên 0,1, gân 0,03 cách ~0,8u, trụ r 0,09, khe khay 0,006).
  `absTwoShellGeometry` (caseShell.ts, CSG): top = vành bo mép từ mặt đáy lên mặt trên − phần trong da ngoài dưới mép ghép − rãnh giữa
  2 lớp da (`Y.split` → dưới mặt trên) + gân `channelRibs` (né trụ / cổng USB / hốc vách); bottom = khay lọt trong da ngoài + da trong
  tới mép ghép, rãnh ngoài da trong có gân. Case.tsx `AbsTwoShell` thay `Walls` cho `absTwo`, orderThumb dựng cùng hàm (kèm trụ).
- Vít `caseScrewPoints` mọi case tâm giữa thành (nhựa = giữa rãnh); `caseBores` nhựa: lỗ côn + lỗ xuyên chỉ qua khay, không khoan ren vào
  vỏ trên (ren trong trụ). Bỏ rãnh né trụ vít ghép ở PCB (Board.tsx, còn vấu bottom mount) và foam (Foam.tsx); bỏ `dodgeStabs` cho vít ghép,
  `batterySpot` bỏ tham số `bosses`.
- DTB case nhựa: `dtbSpot(..., post)` = `ABS_DTB_POST` 0,1u → `y = floor + post`, `DtbPosts` (Case.tsx) 2 trụ nhựa liền sàn đúng lỗ
  vít DTB; Daughterboard không vẽ trụ kim loại cho case nhựa, vít dài thường; lỗ cổng USB theo `dtb.y`.
- Chụp lại ảnh Shopii: `ONLY=Two` / `Pc` / `pc60` / `pc40`.

### Mở case 2 mảnh: lật úp sau khi tách thì case trên không chìm xuống bàn

- Yêu cầu: "khi lật úp case lại ở step tháo vít case với case 2 mảnh thì phần top đang bị ẩn xuống bàn".
- Nguyên nhân: tháo hết vít đáy (`useCaseSplit`) thì case trên nhấc `topY = 2.6` theo toạ độ cụm; Q lật cụm 180° thì khoảng nhấc đó quay xuống dưới bàn.
- `Case.tsx`: đã tách + cụm đang lật (`useAssemblyFlipped() && split`) thì `topY = -(Y.caseTop - Y.floorBot) - 1.2` (nhấc về phía đáy case dưới)
  → sau khi lật case trên vẫn lơ lửng phía trên, hở ~1.2u, thấy mặt trong.

### Top mount: úp case trên + bắt vít plate trước khi lắp DTB

- Yêu cầu (ảnh danh sách bước case PC 2 mảnh top mount): "move step xuống dưới như tôi vẽ, không là bị sai" — đang lắp daughterboard thì
  bước "Úp case trên" ở dưới đã tích ✓.
- `buildContext` (nhánh case không phải `jstUp`): `topCase` → `topScrew` dời lên trước `coverOff` / `dtb`; thứ tự giờ … feet → caseFoam →
  topCase → topScrew → (coverOff) → dtb → jst → (battery) → (coverOn) → caseIn (giống case `jstUp`: board + case trên để riêng lúc lắp DTB).
- Save rev 13 (`topBeforeDtb` persistence.ts): build top mount làm dở theo thứ tự cũ tìm lại bước đang làm theo tên.

### Ảnh / khung 3D Shopii pin Li-Po

- Yêu cầu: "model pin trong Shopii kì vậy?" (hiện cuộn dây). `buildScene` nhánh `supply` không có pin → rơi về `createSolderSpool`.
- `scene/models/batteryModel.ts`: `batteryLabel` (nhãn canvas, chuyển từ Battery.tsx, bàn build import lại) + `createBatteryPack(id)` (túi Kapton
  vàng + nhãn trắng + bó mạch bảo vệ + 2 dây đỏ / đen + đầu cắm JST PH trắng, theo cỡ pin); `modelThumb` gọi khi `SUPPLIES[type].battery`.
  Chụp lại ảnh Shopii `ONLY=bat`.

### Case nhựa 2 mảnh chơi lại top mount

- Yêu cầu: "case nhựa ABS cũng chơi top mount được mà, mắc gì không được?" (trước bỏ vì vấu treo trên plate sợ vướng keycap).
- `ABS_TOP` {d 0,12, bossR 0,09, bossH 0,2} (steps.ts): vít M2 tâm ngay mặt trong vách (`topScrewPoints(…, absTop)`), tai plate thò vào
  hốc nông vách case trên sâu 0,12u (vách 0,14u còn da ngoài; `plateGeometry` tham số `tabDepth`, Case `topNotches` d = 0,12), ren nằm
  trong trụ nhựa nhỏ r 0,09u cao 0,2u đúc liền vách ngay trên mặt plate (`AbsBoss r`, ren đồng cấy miệng dưới), không khoan ren vào
  vách mỏng (`topBores` bỏ với `absTwo`). Trụ lấn vào lòng case 0,06u < khe tới thân switch hàng mép, thấp hơn chân keycap.
- `mounts` 5 case nhựa 2 mảnh: `['gasket', 'top', 'bottom']`. Chụp kiểm tra plastic60Two bước úp case trên + vặn vít từ đáy (8 vít).

### Case Bakeneko 65

- Yêu cầu: "tải thêm 2 model case mới: kkatano/bakeneko-60 và kkatano/bakeneko-65" — Bakeneko 60 đã có (`bakeneko60`), chỉ thêm 65.
- Clone repo → `assets/keyboards/bakeneko65/case/case.step` (+ plate DXF, viền PCB, layout, LICENSE); `scripts/convert-cases.mjs` thêm
  `bakeneko65/case` (`turn` như Bakeneko 60) → `public/models/keyboards/bakeneko65/case.glb` (314,8 × 110,2 × 29,4mm; Planck GLB tái tạo
  khác byte nên trả lại bản cũ). Dò hốc feet (`probe-case-feet.mjs`) + lỗ USB / sàn / trụ DTB (`probe-case-usb.mjs`) → `caseFeet.json` /
  `caseUsb.json`. `CASES.bakeneko65` (65%, nhôm anod 1 mảnh, O-ring, 2.000k). Chụp kiểm tra Free build: board 65% vừa lòng case.

## 2026-11-08

### Case nhựa 2 mảnh, khung xương cá, nhựa trong nhuộm màu

- Yêu cầu: "tại sao case nhựa không thể làm 2 mảnh" → thêm vào Shopii + Free build + Dev, gộp gọn; "case nhựa phải có khung xương cá gia cố
  bên trong lòng case vs topcase"; "thêm option case nhựa nhưng màu trong, ô màu hình tròn chia đôi nửa màu chính nửa màu trong".
- Không có giới hạn trong code (dựng hình 2 mảnh không phụ thuộc chất liệu), chỉ thiếu dữ liệu. `parts.ts`: thêm `plastic40Two` /
  `plastic60Two` / `case75PlasticTwo` / `tklPlasticTwo` / `fullPlasticTwo` (ABS 2 mảnh, vít đáy, gasket / top / bottom; giá ~1,6× bản 1 mảnh),
  bản 1 mảnh đổi tên "… nhựa 1 mảnh". `CASE_LINES` thêm biến thể "Nhựa ABS 1 mảnh / 2 mảnh" (Shopii gộp 1 sản phẩm mỗi cỡ).
- `FreeBuildDialog` (dùng chung Dev "Build thử"): họ case dựng bằng code gộp 1 dòng mỗi cỡ theo `familyOf` (nhôm: bề mặt + số mảnh,
  nhựa: số mảnh), `famSel` theo `${ff}-${fam}`.
- `scene/parts/absRibs.ts` (`absRibs`, `hasAbsRibs`): case nhựa ABS dựng bằng code có khung xương cá đúc liền sàn: sống dọc giữa + gân xiên
  45° mỗi 1,25u ra vách trước / sau (dày 0,05u, cao 0,1u < foam đáy 2,5mm), chỗ gân chạm vách có gân đứng tựa vách (nhô 0,15u, đỉnh thấp
  hơn mặt dưới PCB 0,04u), cắt gân ở vùng DTB + dây JST. `AbsRibs` trong Case.tsx (gộp 1 lưới), `CaseFoam` khoét khe gân đứng.
  Case trên chưa có gân: vách trong cách mép PCB / plate 0,6mm, mép ghép 2 mảnh nằm ngang PCB → không có chỗ trống (hỏi lại người dùng).
- Nhựa trong nhuộm màu: `CASE_COLORS` thêm `clearBlack / Blue / Red / Green / Purple / Pink / Yellow` (`clear: true`), `CLEAR_ABS_COLORS`
  thêm vào mọi case nhựa ABS dựng bằng code. `CaseMaterial` `abs` + màu `clear` = `meshPhysicalMaterial` trong mờ (transmission 0,85,
  opacity 0,62); `orderThumb` `shellMaterial` cũng trong mờ. Ô màu: `caseSwatch(col)` (nền CSS: màu trong = nửa trái màu đặc, nửa phải màu
  nhạt + vệt sáng), Shopii option `swatch`, ô màu Free build / panel "Màu case" thành hình tròn; hình minh hoạ dùng `swatchHex`.
- Sửa theo người dùng ("xương cá nằm chéo, không thẳng được à? quá thấp, cho cao lên; case dùng xương cá thì trụ dùng trụ nhựa + cấy ren
  đồng"): gân thẳng vuông góc sống (dọc z, mỗi 1,25u), 2 đầu sống có gân đứng tựa vách trái / phải; cao gân `RIB_H` = tới cách đáy
  socket hotswap 0,02u (~2,8mm, socket cao 0,09u dưới PCB) → cao hơn foam đáy nên `CaseFoam` khoét rãnh theo cả gân sàn (`ribSegBox`).
  `TrayStandoffs` thêm `boss` (case nhựa dựng bằng code): trụ nhựa tròn Ø~5,7mm vật liệu case (chân loe 1,15×) + vành ren đồng cấy
  Ø~3,4mm lộ ở đỉnh thay trụ đồng lục giác. Chụp kiểm tra Free build plastic60 tray bước lót foam đáy: gân thẳng, trụ nhựa có ren đồng.
- Sửa theo người dùng ("cho xương cá đi qua giữa các trụ O-ring, đang lệch qua 1 bên"): `absRibs` lấy `ringPosts(ctx)` (O-ring mount):
  sống dọc đặt ở z của 2 trụ vách trái / phải (lệch về sau `SIDE_AT`, đi qua tâm 2 trụ), gân vuông góc đặt đúng x các trụ vách trước / sau,
  khoảng giữa rải thêm cho cách ~`RIB_STEP` (khoảng vách – trụ: gân sát vách cách vách ~nửa bước); chỗ có trụ thì khỏi gân đứng tựa vách.
  Không O-ring thì như cũ (sống giữa, gân rải đều). Chụp kiểm tra plastic60 O-ring: gân đâm đúng giữa trụ trước và trụ bên.
- Sửa theo người dùng ("thiếu xương cá ngang, chỉ có dọc, cho cao lên 1 xíu nữa"): bỏ sống giữa, thay bằng 2 gân ngang chia lòng case
  làm 3 (dời về đường ranh 2 hàng phím gần nhất để không nằm dưới socket; O-ring: qua tâm 2 trụ bên + đối xứng), gân dọc chạy suốt
  vách trước → vách sau. Cao 2 bậc (`stepRib`): mặc định `RIB_H_TALL` (đỉnh cách mặt dưới PCB 0,03u, ~4,3mm), đoạn đi dưới vùng linh kiện
  (socket hotswap / chân switch quanh tâm phím ±0,32 × ±0,3u, chân stab `stabHoles`, jack JST) hạ xuống `RIB_H` (~2,8mm, dưới đáy socket);
  đoạn cao ngắn hơn `MIN_TALL` 0,25u giữa 2 vùng thấp thì gộp thấp (đỡ răng cưa). `RibSeg.h` theo đoạn, `AbsRibs` dựng hộp theo `h`.
- Sửa theo người dùng ("xương cá bị cut, không thẳng; xương ngang chỉ có 1 cái, TKL phải 3, 40% phải 2"; "move xương dưới ở case 40"):
  bỏ `stepRib` (răng cưa) → mỗi gân 1 chiều cao đều: không đi dưới linh kiện nào (socket Kailh đúng khối 0,5 × 0,28 lệch (0,05; 0,1),
  cọc giữa / chân switch ±0,3u quanh tâm, lỗ chân stab, jack JST) thì `RIB_H_TALL`, có thì `RIB_H`. Gân ngang đặt đúng khe giữa 2 hàng
  phím (trung điểm 2 tâm hàng, tính cả khe hàng F của TKL), số gân theo số hàng (≤ 5 hàng: 2, 6 hàng: 3), mỗi gân lấy khe gần chỗ chia đều
  nhất (ngang ngửa < 0,3u mới ưu tiên khe không vướng chân stab — trước ưu tiên khe trống nên 40% ra 2 gân sát nhau z −1 / 0, giờ −1 / +1).
  Gân ngang qua vùng DTB thì cắt còn 2 khúc 2 bên (`outside`, trước cắt từ giữa ra nên DTB nằm giữa là mất cả gân). O-ring: trụ vách
  trái / phải (`ringPosts`) dời về khe hàng phím gần `SIDE_AT` nhất, gân ngang gần nhất dời về đúng z trụ.
- Sửa theo người dùng (đánh X gân đứng tựa vách + khúc gân dọc cụt; "thành case nhựa mỏng lại, không dày như case alu / mica"): bỏ
  hết gân đứng tựa vách (`walls` luôn rỗng, giữ kiểu cho Case / Foam), gân dọc nửa nào vướng DTB (bị cắt giữa chừng) bỏ hẳn nửa đó.
  Thành case: `caseWall(caseDef)` (steps.ts) = `ABS_WALL` 0,3u (~5,7mm) cho nhựa ABS dựng bằng code, còn lại `CASE_WALL` 0,45u; dùng ở
  `Walls` (prop `wall`), W / D + `frontZ` (Case.tsx), `caseScrewPoints(…, wall)` (vít ghép giữa thành), `feetPockets(…, wall)`, ảnh
  `orderThumb`. 0,3u đủ cho hốc tai plate 0,22u + lỗ vít ghép (hốc chìm đầu bằng r 0,168u sát mép ngoài, chụp từ đáy không lẹm).
  Chụp lại ảnh Shopii các case nhựa (`ONLY=plastic40 / plastic60 / Plastic / tklTray / fullTray`).
- Sửa tiếp ("sao vẫn còn nhô ra"): 1 gân dọc 2 nửa khác chiều cao (nửa không dưới linh kiện thì cao) → bậc ở chỗ nối. Chiều cao giờ
  tính theo cả đường gân (gom khúc cùng x / cùng z: 2 nửa gân dọc, các khúc gân ngang bị DTB cắt), 1 khúc vướng linh kiện thì cả đường
  thấp. Kiểm số liệu 60 2 mảnh / 40 / TKL / 60 O-ring: không đường nào còn 2 chiều cao.
- Sửa theo người dùng ("viền case dày quá, cho mỏng lại như case nhựa mới đúng"): case nhựa 1 mảnh `ABS_WALL` 0,15u (~2,9mm, 1 mảnh không
  có lỗ vít ghép / hốc tai plate trong thành), 2 mảnh `ABS_WALL_2` 0,3u (cần chỗ cho hốc tai plate 0,22u + lỗ vít ghép); `caseWall` theo
  `pieces`.
- Sửa theo người dùng ("chỉ có case PC mới trong suốt được và nhuộm màu, case ABS không thể trong"): bỏ màu trong khỏi case nhựa,
  `CLEAR_ABS_COLORS` → `TINT_COLORS` thêm vào case PC (`pc60` thay vàng / xanh lá đục, `gasket60Duo`, `repent75Pc`, `exodus80Pc`);
  bỏ nhánh `abs` trong mờ của `CaseMaterial` (PC sẵn trong mờ theo màu). Xoá 77 ảnh Shopii màu trong của case nhựa + dòng bảng tra,
  chụp lại ảnh case PC + case nhựa 1 mảnh.
- Sửa theo người dùng ("cho mỏng hơn nữa, trụ đang bị lòi ra ngoài rồi, cut đi"): `ABS_WALL` 0,15 → 0,1u (~1,9mm, case nhựa 1 mảnh).
  Trụ O-ring lấn vào vách cố định `POST_IN` 0,03u + bán kính 0,135u → vách mỏng thì nửa trụ lòi ra ngoài vỏ; `ringPosts` giờ lấn
  `min(POST_IN, caseWall − POST_R − SKIN 0,02)` (vách mỏng thì tâm trụ lùi vào lòng case). Chụp kiểm tra plastic60 O-ring: mặt ngoài
  vách phẳng, trụ nằm trong. Chụp lại ảnh Shopii case nhựa 1 mảnh.
- Sửa ("đoạn này mã màu bị lỗi à?"): vệt sáng chéo trên nửa "trong" của ô màu chia đôi nhìn như vết gạch → bỏ; `caseSwatch` giờ chỉ
  nửa trái màu đặc / nửa phải màu nhạt (pha 45% với trắng xanh).
- Case nhựa 2 mảnh làm lại theo người dùng ("thành vẫn dày; phải làm trụ nhựa cấy ren đồng để bắt ốc; case 40 chỉ 4 lỗ vít; vít nhỏ lại;
  thành dày hơn 1 mảnh 1 xíu nhưng không đặc ruột; top case cũng nhựa đúc"; hỏi lại → chọn "vấu nhựa trong lòng case" + "M2 đầu bằng"):
  - `ABS_WALL_2` 0,14u (~2,7mm). `absTwo(c)`, `ABS_BOSS` {r 0,12, inset 0,05} (tâm trụ lùi vào trong mặt trong vách, nửa ngoài chìm
    trong vách), `ABS_SCREW` M2 (đầu Ø3,8, lỗ xuyên Ø2,2, ren Ø1,6, model ốc ×0,63).
  - Vít ghép: `absCaseScrews` (caseScrewPoints `boss`: z = mặt trong vách − inset; 40% 2 vít / bên = 4 vít; `dodgeStabs` né lỗ chân stab),
    `caseBores` cỡ M2 (`m2HeadHole`), `dtbSpot` né cả thân trụ (`screwClear`). Trụ: `AbsBoss` (ống tròn `tubeGeometry`) + `AbsScrewBosses`:
    nửa dưới (sàn → mép ghép, lỗ xuyên) trong case dưới, nửa trên (mép ghép → dưới plate, ren đồng cấy `INSERT_DEPTH` ở miệng dưới) trong
    case trên. Ốc M2: `Screw` / `LooseScrew` / `screwLength` thêm `size`, `ScrewSet` + khay ốc dùng `ABS_SCREW.scale` cho vít case nhựa.
  - Mount: case nhựa 2 mảnh chỉ còn gasket + bottom (top mount bỏ: vấu treo từ case trên phải nằm trên plate, vướng keycap hàng mép).
    Gasket: `gasketTabbed` loại `abs` → dải gasket quanh mép plate như 1 mảnh, không hốc / vấu (trước khoét hốc tab 0,22u thủng vách).
    Bottom mount: `topScrewPoints(…, bossKeys)` vấu tại mặt trong vách − inset, `BottomPads` = `AbsBoss` (mép ghép → mặt dưới plate, ren
    đồng ở đỉnh), case trên khoét hốc nông `absPadNotches` (sâu r − inset + 0,02), plate không tai mà khoan lỗ (`plateHoles`).
  - PCB khoét rãnh né trụ / vấu (`bossHoles` vào `pcbNotches`), foam PCB khoét (`PcbFoam bossHoles`), foam đáy khoét chân trụ dưới.
- Sửa theo người dùng ("đáy case nhựa dày quá, sửa mỏng đi nhưng lắp DTB không lộ ốc xuống đáy → ốc ngắn"): `ABS_FLOOR` 0,1u (~1,9mm),
  `caseFloorTop(c)`: giữ mặt đáy ngoài, hạ mặt sàn trong (case nhựa: floorBot + 0,1). Dùng ở `Walls floorTop`, `TrayStandoffs`, trụ / gân
  (`absRibs` đỉnh gân cố định `RIB_TOP` / `RIB_TOP_TALL` → gân cao thêm theo sàn), `ringPosts`, `dtbSpot` (DTB + cổng USB `usbPort(x, floor)`
  hạ theo sàn), foam đáy, ảnh `orderThumb`. Vít DTB: `shortScrew(len)` 3,6mm (thân 1,6mm) khi sàn thấp hơn `Y.floorTop` (trước 5,5mm).
  Chụp kiểm tra: plastic40Two 4 vít, plastic60Two tách case (trụ 2 nửa), bottom mount 8 vấu + lỗ plate; chụp lại ảnh Shopii case nhựa.
- Thêm theo người dùng ("thêm option case nhôm 1 mảnh 60% đổ lại dùng cổng C bên trái thay vì gắn DTB", kèm ảnh PCB 60% có cổng C
  hàn ở góc): `CaseDef.pcbUsb`; case mới `tofu60reduxC` / `alu60Ecoat1C` / `alu40AnodC` / `alu40Ecoat1C` (bản sao nhôm 1 mảnh 60 / 40 +
  "· cổng C trên PCB", thêm vào `CASE_LINES`). `buildContext`: `pcbUsb` thì `dtb = null` (không bước `dtb` / `jst`). `PCB_USB` / `pcbUsbSpot`
  (steps.ts): đầu cái USB-C mid-mount mặt dưới PCB, tâm cách mép trái board 0,8u (sau phím Esc), miệng nhô khỏi mép sau 0,6mm; `PcbUsbC`
  (BoardDetails.tsx, vỏ thép + lòng tối + lưỡi tiếp điểm); Case.tsx khoét `usbPort` ở vách sau đúng chỗ (`ports`); trụ O-ring vách sau né
  lỗ cổng (`ringPosts`). Free build / Dev: dòng nhôm thêm chip "Daughterboard / Cổng C trên PCB" (`aluPick(…, usb)`, chỉ hiện khi có bản
  `pcbUsb` cùng chất liệu + số mảnh). Chụp kiểm tra Tofu60 Redux cổng C: cổng nằm giữa lỗ vách sau. Chụp ảnh Shopii 4 case mới.
- Thêm ("case có cổng C bên phải cũng có, chỉ áp dụng với case TKL, cổng C liền PCB"): `pcbUsb` thành `'left' | 'right'`; `tklAluC` /
  `tklAluEcoatC` (TKL nhôm 1 mảnh, `'right'`: tâm cổng cách mép phải board 0,8u, sau cụm điều hướng); `pcbUsbSpot(w, d, side)`.
  Chụp ảnh Shopii 2 case mới.
- Ảnh Shopii: `ONLY=Two` + `ONLY=clear<Màu>` `bun run bake:thumbs` (chạy 1 lượt cả `ONLY=clear` bị lỗi lẻ tẻ, chạy từng màu thì đủ).
  Đã chụp kiểm tra trong game bằng Chrome ngầm (Free build plastic60Two trắng bước lót foam đáy, xanh dương trong bước đậy case).

## 2026-11-08

### Dọn model không dùng

- Yêu cầu: "check xem model nào ko xài thì xoá đi".
- Dò mọi file trong `public/models/` theo tên (case CAD theo `<bàn phím>/<file>`, keycap theo `${profile}-r${row}` trong keycapShape.ts):
  4 file không còn code nào nạp → xoá: `room/drawer_cabinet.glb`, `room/metal_office_desk.glb`, `room/modern_wooden_cabinet.glb`
  (phòng đi lại cũ, ~5,6MB) và `room/screwdriver-lite.glb` (tua vít tay đã bỏ, xem dung-cu.md) + `scripts/convert-screwdriver-lite.mjs`
  - script `convert:screwdriver-lite`. Bỏ 3 model phòng khỏi `fetch-room.mjs`, dòng ghi công ở `room/CREDITS.md` + `credits.ts` (Screwdriver).
    `jpeg-js` vẫn giữ (convert-cafe-pictures dùng). Nguồn tua vít gốc còn ở `assets/` nếu cần dựng lại.

## 2026-11-07

### Duality Horns: thêm hàng dưới WK

- Yêu cầu: "case duality thêm option WK bình thường, xoá 2 block window thử xem".
- `layouts.ts` `tklf13`: `bottom: ['wkl', 'wk']` (WKL vẫn mặc định).
- `scripts/gen-duality-wk.ts` (`bun run gen:duality-wk`, CSG three-bvh-csg trên GLB): nắp `case-wk.glb` = `case.glb` khoét 2 hộp ôm khối chặn chỗ
  Win (dò từ model: x −144,7…−126,7 / 64,8…82,8, z 40,9 → mặt trong vách trước ~59,2, y 18,8…25,3; hộp dừng ở z 59,1 nên mặt cắt
  thành mặt vách mới); plate `plate-wk.glb` = `plate.glb` (multi-layout có lỗ Win 1.25u nhưng chỉ lỗ space 7u) khoét thêm lỗ switch 14 × 14
  - 2 lỗ stab ±50mm (7 × 15, lệch lên 1,5mm như lỗ stab 7u). Đã kiểm: chỉ còn mặt vách mới trong hộp; lưới lỗ plate đúng chỗ.
- `CaseDef.modelFor.wk` + `plateModelFor.wk`, `caseModelOf` (bottom ≠ wkl → bản wk) / `plateModelOf` (Board). `caseFeet.json` /
  `caseUsb.json` chép entry `duality-horns/case-wk` = bản gốc (đáy giống hệt).
- Sửa: vẫn thấy "tấm kệ" chỗ khối Win. Lưới CAD không kín nên CSG đoán sai trong / ngoài, giữ lại mặt đáy hộp (y 18,5) lơ lửng + mặt
  z 59,1; chân khối còn gờ bo y 17,4 sát vách. Giờ `carve(..., { bare, patches })`: hộp y 17 … 26, z 40,5 … 60,4 (ăn nhẹ vào vách), bỏ
  mọi tam giác nằm trên mặt hộp, vá 1 tấm đúng mặt trong vách (z 59,85 ở y 17 → 60,45 ở y 24,2, pháp tuyến −z). Kiểm: vùng z 30 … 58
  không còn tam giác nào. Plate vẫn giữ mặt hộp (thành lỗ).
- Sửa tiếp: còn "ba via" 2 bên (gờ bo nối khối – vách lan ~0,9mm ra ngoài khối) + tấm vá sáng bệch không cùng màu case (thứ tự góc
  thuận chiều kim đồng hồ nhìn từ lòng case → vật liệu 2 mặt coi là mặt sau, lật pháp tuyến). Hộp rộng hơn khối 1,2mm mỗi bên
  (x −145,9 … −125,5 / 63,6 … 84), tấm vá theo độ nghiêng vách `z = 59,8 + 0,08·(y − 17)` tới y 23,9, góc ngược chiều kim đồng hồ nhìn
  từ trong, pháp tuyến (0, 0,08, −1). Kiểm: không còn tam giác nào nhô khỏi vách (z < 59,7) trong vùng 2 khối.
- Sửa tiếp: tấm vá phẳng vẫn lệch / gãy với mặt vách thật (vách có rãnh, bo mép trên), nhìn như cắt bằng máy cắt chứ không phải phay CNC.
  Bỏ tấm vá; `carve(..., { bare, fills })`: khoét hộp y 14 … 26, z 40,5 … 61,5 (hết bề dày mặt trong vách), rồi lấp bằng đoạn vách trơn
  cùng cỡ chép từ lưới gốc (`INTERSECTION` với hộp cùng cỡ ở chỗ vách không có chi tiết: x −110 / −40, dò mặt trong vách trước không có
  đỉnh ở −112,4 … −83,2 / −61,3 … 19,6), bỏ mặt hộp, dời `dx` sang chỗ khoét → mặt vách, rãnh, bo mép trên liền với 2 bên.
  Kiểm: vùng 2 khối giờ chỉ còn tam giác vách z ≈ 60 giống đoạn vách mẫu.
- Sửa tiếp: vẫn lồi 1 xíu. Dưới y ~16,5 sát 2 bên khối vách có hốc / rãnh riêng (vd x −129 … −119: hốc sâu tới z 65 ở y 11 … 16),
  hộp từ y 14 lấp vách trơn đè lên mép hốc. Hộp giờ từ y 17 (từ đó lên mặt vách mọi chỗ như nhau, chân khối thấp nhất y 17,4).
  Kiểm bằng tia dò mặt vách (x lưới 0,25mm, y 9,5 … 25,5): ngoài vùng khoét giống hệt `case.glb`, trong vùng khoét giống hệt đoạn vách mẫu.
- Sửa tiếp: hình học đã khớp (tia dò từ trước + từ trên đều trùng) nhưng còn vệt sáng ở đường nối = nứt chân chim: lưới 2 bên vách cắt
  ở x khác nhau nên đỉnh trên đường nối không trùng (đường chéo tam giác dài cắt mặt phẳng ở y khác). Đoạn lấp giờ chờm `LAP` 0,3mm
  qua mép khoét (2 bên x, dưới y, mép trên vách z) phủ lên mặt trùng hệt → không còn khe.
- Sửa tiếp (đã tự chụp ảnh model bằng Chrome ngầm để soi): vết nối vẫn lộ vì vách sát khối không y hệt đoạn vách mẫu (bo mép trên lệch
  ~0,1mm) + pháp tuyến lưới gốc sát khối nghiêng ±0,3 theo x. Bỏ cách chép đoạn mẫu; `carve(..., { bare, lofts })`: cắt lát lưới gốc
  ở 2 mép khoét (`sliceAt`: mỗi tam giác cắt qua mặt phẳng x cho 1 đoạn, cắt gọn vào vùng, nối đoạn thành profile chân vách → bo → mặt
  trên), `loft` nội suy mặt giữa 2 profile (chia khúc ở mép gãy, hợp tham số độ dài cung) → 2 mép trùng đúng đường cắt lưới còn lại;
  pháp tuyến tấm lấp + lưới gốc trong ±3mm quanh chỗ lấp bỏ thành phần x (|nx| < 0,5, thành lỗ / trụ giữ nguyên). Ảnh chụp: vách
  liền mạch, không vệt, không bậc ở cả 2 khối.
- Sửa tiếp: trong game (nhôm phản chiếu) vẫn thấy đường mờ ở mép vùng sửa pháp tuyến: mặt vách dưới chân chỗ lấp (y < 17) còn pháp tuyến
  nghiêng theo x, và mép vùng sửa ±3mm cắt cụt. Giờ sửa cả đỉnh mặt vách dưới chân (ny ≈ 0,08, nz < −0,7) từ y 10, thành phần x giảm dần
  trong `BLEND` 4mm ra ngoài chỗ lấp (không tạo mép mới). Chụp lại với vật liệu kim loại + môi trường phản chiếu ở góc sát vách như trong
  game: không còn vết; vệt ngang mảnh y ≈ 17,4 là gờ 0,07mm có sẵn chạy dọc cả vách gốc.
- Hoạ tiết tạ / đáy: người dùng hỏi sao mất. STEP gốc (`inspect-step.mjs`) chỉ có SOLID / BOTTOM / WEIGHT (2980 tam giác, tấm trơn) /
  BADGE / ACCENT_V2 + 26 đệm nhỏ + 4 plate, không có thân hoạ tiết nào; node đáy / tạ của `case.glb` và `case-wk.glb` giống hệt (không đụng).

### Case mica xếp lớp thêm top mount

- Yêu cầu: "bổ xung topmount cho case mica xếp lớp".
- `mounts: ['sandwich', 'top']` cho mọi case mica (60 / 40 / 75 / FRL / full / Alice, parts.ts). Luồng bước dùng chung top mount case 2 mảnh
  (`topCase` → `topScrew` → `caseIn` → `caseScrew`, không `caseClose`); vít ghép case vẫn xuyên mọi lớp từ trên (ở giữa vách, không chạm plate).
- Plate: như top mount case dựng bằng code (`topFull` trong Board.tsx: phủ kín lòng case + tai có lỗ M2).
- Case trên mica (Case.tsx, nhánh `mica && topMount`) chia 2 chồng: `Y.split → 0` (tấm viền dưới mặt plate) khoét hốc tai `topNotches` để vặn
  vít từ dưới lên, `0 → Y.caseTop` (tấm khung khoét vùng phím) làm trần hốc giữ ren. `micaLayerGeometry` thêm tham số `notches` (khoét CSG
  `carve` chung với rãnh cổng USB), `Layers` nhận `notches`.
- Đã chụp kiểm tra bằng Chrome ngầm (Free build mica60 vàng, bước `topScrew` đã lật): hốc vuông trong vách đúng chỗ vít, lệch lỗ vít case.

### Top mount case CAD (Duality): nắp hở khỏi plate lúc nhấc board

- Yêu cầu: Duality top mount, tới bước thả board vào case thì case trên (đã bắt vít vào plate) hở hẳn khỏi plate.
- Nguyên nhân: board lúc nhấc chờ thả (`caseIn` chưa `inCase`) / dựng cắm JST nằm phẳng, không theo `seat` (Duality rise 0.19, tilt 0.079);
  nắp CAD chỉ bỏ `seat` khi `topOnly` nên lúc đó vẫn đặt theo `seat` → lệch lên + nghiêng so với plate.
- `Case.tsx`: `unseated = topOnly || (topMount && ((caseIn && !inCase) || stand))` → nắp dùng phép ngược `seat` như lúc bắt vít.
  Lúc thả vào case nắp chuyển về hệ có `seat` (board cũng lerp vào `seat`).
- Tiếp: thả board vào case thì case trên rơi trước, board + plate theo sau. Nguyên nhân: group case trên có `position-y={topY}` nên đổi
  `topY` là React gán thẳng (nhảy ngay), `lerpTo` trong useFrame thành vô dụng. Giờ prop chỉ lấy giá trị lúc dựng (`topY0`), sau đó lerp
  cùng tốc 6 như board; mức bỏ `seat` của nắp (`unseatK`, ref `seatTilt` / `seatShift`) cũng lerp tốc 6 → nắp + plate đi cùng 1 lúc
  (áp cả đậy case / tách case 2 mảnh: giờ trượt thay vì nhảy).

### Bottom mount chỉ cho case 2 mảnh

- Yêu cầu: "bottom mount chỉ có trên case 2 mảnh thôi, 1 mảnh không có" (sửa mục bên dưới).
- `parts.ts`: case 1 mảnh dựng bằng code về `['tray', 'gasket', 'oring']` (+ case 75 / FRL nhôm `['gasket', 'tray', 'oring']`); case 2 mảnh
  dựng bằng code `['gasket', 'top']` → `['gasket', 'top', 'bottom']` (13 case, không mica).
- `buildContext`: `bottomScrew` chỉ khi case 2 mảnh, thứ tự `caseIn` → `bottomScrew` → `caseClose` → `caseScrew`; vít `bot-*` =
  `topScrewPoints(width, depth, caseScrews)` (lệch vít case như top mount).
- Case.tsx: `BottomPads` = vấu case dưới từ `Y.split` lên `Y.plateBot` (tai plate tì lên, đĩa tối = miệng lỗ ren); case trên khoét hốc vách
  `topNotches(bottomScrew)` trần `BOTTOM_NOTCH_TOP` 0.14 (chừa đầu ốc trên plate). Bỏ rãnh lõm vách case 1 mảnh (`WallNotch.from`, `BoreEnds up`).

### Foam PCB: split space khoét kiểu spacebar

- Yêu cầu: foam layout 40% (split space) hàng cuối sai.
- `Foam.tsx` `foamGeometry`: trước chỉ phím rộng ≥ 4u mới khoét kiểu spacebar (lỗ switch + 2 khe stab), split space 2.25u / 2.75u
  bị khoét 1 lỗ to như Shift. Giờ mọi phím stab không nhãn (spacebar: dài, split 40%, Alice, Planck) khoét kiểu spacebar; phím dài có nhãn
  (Shift / Enter / Backspace / numpad) vẫn 1 lỗ liền.

### Bỏ OG mount, thêm bottom mount; gasket cho mọi case 1 mảnh dựng bằng code

- Yêu cầu: bỏ OG mount ở mọi case, thay bằng bottom mount (như top mount nhưng plate bắt vào case dưới, case dưới có rãnh lõm để bắt
  plate, theo hình minh hoạ "Bottom mount"); thêm gasket mount cho case 40 / 60 / 75 / TKL / full.
- `parts.ts`: case 1 mảnh dựng bằng code `['tray', 'oring', 'og']` → `['tray', 'gasket', 'oring', 'bottom']` (cả 65% nhựa cho đồng bộ);
  case 75 / FRL nhôm đã có gasket thì `og` → `bottom`. `MOUNTS.og` bỏ, `MOUNTS.bottom` (dl 0, dp 0.02: mềm hơn top 0.05). `MOUNT_LV.bottom` 2.
- Bước `bottomScrew` (types `StepId` + `ScrewStep`): sau `caseIn` (+ `trayScrew`), vít `bot-*` = `topScrewPoints(width, depth, [])`
  (mép trước / sau, cùng chỗ tai plate top mount), đầu `hex`, ốc socket M2 rút 6/8, tính vào `CASE_SCREW_STEPS`, `holeKind('bot-*') = 'top'`
  (tuôn ren 2 lỗ = hỏng "ren bắt plate"), chấm điểm gộp `['top', 'bot']`. Khay ốc đếm chung với ốc top mount.
- Board: plate phủ kín lòng case + tai (`topFull` cho cả bottom), `ScrewSet step="bottomScrew" y={0}` khi `inCase`.
- Case: `WallNotch.from` (rãnh mở từ `from` lên quá mép trên vách, caseShell.ts), `bottomNotches` (đáy rãnh = `Y.plateBot`), lỗ ren khoan
  xuống từ đáy rãnh (`botBores`, sâu `TOP_TAP_DEPTH`) + `BoreEnds up`.
- Trụ đỡ `ringPosts` / rãnh mép PCB chỉ còn O-ring. Save rev 11 đổi lại: đơn / build OG → gasket mount (`ogOrder` / `ogSession`, bỏ bước `ring`).

### OG mount: chỉ gasket, bỏ vòng silicon

- Yêu cầu: "OG mount sao lại có cả oring bên trong" → người dùng chọn OG = chỉ gasket mini, không vòng, không dây O-ring.
- `buildContext`: bước `ring` chỉ cho mount `oring` (OG: ... → `gasket` → feet). `ringFrame()` / `SiliconeRing` bỏ nhánh OG (`between`);
  Board chỉ vẽ vòng khi `mount === 'oring'`; Case vẫn giữ trụ đỡ (`RingPosts`) cho OG để đỡ mép board.
- Đơn: `Order.oring` chỉ khi mount O-ring (orders.ts); Free build chỉ hỏi dây O-ring với O-ring; `MOUNTS.og.desc` + mô tả dây O-ring sửa theo.
- Save rev 11 (`dropOgRing` / `dropOgOring` persistence.ts): build OG làm dở bỏ bước `ring` (tìm lại bước theo tên, xoá `build.ring`),
  đơn OG bỏ `oring`.

### Bàn mod stab: stab dài không đè băng Urgo

- Yêu cầu: chỉ có 1 wire 7u / 6.25u thì housing trái đè lên băng Urgo.
- `StabModStation.tsx` `layoutSets`: tâm stab dài `cx = max(LONG_CX, BAND_RIGHT + 0.9 + half)` (`BAND_RIGHT` = mép phải băng,
  0.9 = nửa housing ~0.6 + khe 0.3) thay cho `LONG_CX` cố định; bàn / hũ / cọ tự nới theo mép phải.

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
  2026-10-30 đổi tiếp sang vân sồi `oak_veneer_01` dùng chung `OAK_TEX` với lá rèm (nhân màu `#c99a66`), người dùng: "đổi vân cửa sổ
  rèm hiện tại thành oak_veneer_01"; bỏ texture óc chó trong RoomWindow.
- Thùng CPU dời vào ngăn kệ hở bên phải bàn có hộc (`CPU_AT` [0, 0.03, −0.475] hệ bàn), 3 đầu dây cáp dời theo.
- Màn hình máy tính đổi sang model người dùng đưa (2026-10-29): `asus_pc_gaming_monitor.glb` → `public/models/desk/asus-monitor.glb`
  (1,1MB). `Monitor` (models/Computer.tsx): mesh material "Screen" thay bằng ảnh desktop KeebOS (UV đặt lại theo khung mặt kính, lật u
  vì model quay mặt kính về −z nên xoay 180°), co cả model cho mặt kính rộng `SCREEN.w` 0,6m, chân đế chạm bàn, mặt kính ở
  `SCREEN.d / 2`. `SCREEN` đổi theo số đo model (cao 0,345, mép dưới 0,081) để `screenCenter` / `screenEye` (camera bay vào) khớp.
  Viền hover dùng `useHoverOutline` thay `HoverShell` (đã xoá). Bấm vẫn `zoomToPC`.
- Viền hover màn hình ASUS: vỏ / mặt kính là tấm phẳng mỏng nên viền phồng (`useHoverOutline`) chỉ lộ ở chân đế → thêm khung chữ nhật xanh phẳng (`ShapeGeometry` ôm khung bao vỏ, `visible={hover}`) sát trước mặt kính.

## Camera bàn build xoay neo quanh tâm, bảng điều khiển trực quan, bỏ chạy (2026-10-29)

- Người dùng: cơ chế xoay cũ (phím R) giờ chỉ còn kéo là sai → bỏ, thay bằng kéo xoay neo quanh tâm vật đang làm; xoá thông báo điều khiển lúc
  vào game; chỉ ảnh mẫu bảng "Giữ [chuột] để xoay camera / Cuộn để phóng to" → hiện bên trái thay chữ ở đáy màn hình; bỏ Shift chạy (phòng hẹp).
- Bench.tsx `Controls`: OrbitControls `enablePan={false}`, chuột trái / phải / 1 ngón = ROTATE, 2 ngón = DOLLY_ROTATE, `maxPolarAngle` 1,45
  (không xuống dưới mặt bàn). Tâm xoay = tâm CameraRig đặt (0, 0, 0, Space về mặc định); bỏ zoom dời tâm theo con trỏ + vuốt ngang touchpad kéo bàn
  (`ZOOM_TO_POINT`, `PAN_SPEED`) để tâm luôn cố định. Kiểm: kéo chuột trái camera đổi, target giữ (0, 0, 0).
- Bỏ toast `WALK_HINT` (metaSlice, newGame / continueGame). `components/game/ControlsHint.tsx` (`MouseIcon` sáng nút trái / phải / con lăn, `KeyCap`,
  `ControlsHint` khung góc dưới bên trái, ẩn trên điện thoại); RoomHud dùng thay dòng chữ đáy. WalkControls bỏ `RUN` / phím Shift.

## Đi lại: bỏ bấm sàn đi tới, zoom bằng chuột giữa (2026-10-29)

- Người dùng: bỏ "bấm sàn để đi tới" (đã đi bằng phím điều hướng), thêm zoom bằng chuột giữa.
- Bỏ `useRoom.goal` (roomStore, sitAtBench, metaSlice, 2 sàn trong Room.tsx, phần tự đi trong WalkControls).
- WalkControls: con lăn chuột giữa đổi `zoom` 0..1 (mỗi nấc `ZOOM_STEP` 0,12), FOV = gốc × (1 − zoom × (1 − `ZOOM_MIN` 0,4)), lerp mượt; zoom thì
  nhìn quanh chậm theo; bay camera (ngồi / đứng) tự bỏ zoom; rời chế độ đi lại trả FOV gốc. Bảng điều khiển: dòng "Cuộn [con lăn] để phóng to / thu nhỏ".
- Đã thử: cuộn trong phòng FOV 42 → ~34, bấm sàn không còn di chuyển, ngồi vào bàn FOV về 42.

## Hướng dẫn điều khiển 1 dòng giữa đáy, chỉ WASD (2026-10-29)

- Người dùng (chỉ ảnh mẫu "Dùng [chuột] để nhìn quanh và [A][D][W][S] di chuyển"): cụm hướng dẫn chữ to rõ, giữa đáy màn hình, không khung card;
  bỏ đi bằng phím mũi tên, chỉ WASD.
- `ControlsHint` thành 1 dòng `children` (chữ `font-head text-xl` trắng + bóng chữ, không nền), `KeyCap` keycap trắng chữ tối, `MouseIcon` chuột trắng
  viền tối (nút đang nói sáng xanh). RoomHud: "Kéo [chuột] để nhìn quanh, [con lăn] phóng to và [A][D][W][S] di chuyển".
- WalkControls `KEYS` bỏ Arrow*, Bench `MOVE_KEYS` (đứng dậy khi đang ngồi bàn build) chỉ còn WASD.
- (2026-10-29) Rê vào vật bấm được: bỏ khung xanh "Bấm: …", dòng hướng dẫn giữa đáy đổi thành "Nhấn [chuột trái] {việc}" cùng kiểu chữ trắng
  (RoomHud, `hover` hạ chữ đầu). `KeyCap` tắt bóng chữ kế thừa (`[text-shadow:none]`) cho chữ A / D / W / S khỏi nhoè.

## Viền hover thùng carton bao kín cả cạnh đáy (2026-10-30)

- Người dùng: "viền tương tác phải hiển thị ở trước mặt khi hover vào hộp giấy, đang ở phía sau", rồi gửi ảnh khoanh đỏ cạnh đáy trước +
  cạnh đáy bên phải: muốn đường bao **kín quanh cả thùng**, kể cả chỗ thùng chạm mặt bàn / kệ (không cần viền các cạnh trong).
- Nguyên nhân: vỏ ngược (BackSide) phình ra mọi phía, phần đáy lún dưới mặt bàn / kệ nên bị che → chỉ còn viền cạnh trên + hai bên.
- Thử trước (bỏ): dải xanh dọc mọi cạnh nhìn thấy (`edgeMat`) — không đúng ý (vẽ cả cạnh trong, đáy vẫn thiếu).
- Thử 2 (bỏ): `OUTLINE_TOP_MAT` kéo chiều sâu vỏ về phía camera 3% khoảng cách → nổi trên mặt bàn nhưng lộ luôn mặt sau vỏ ở dải gần mép
  (chỗ mặt trước / mặt sau gần nhau về độ sâu) → viền rất dày; giảm `width` không đỡ. Người dùng: "vẫn dày, sửa bằng viền tương tác của cái bàn".
- Đang dùng: viền thường như bàn làm việc (`OUTLINE_MAT`, 0,004), riêng mesh tên `OUTLINE_ON_TOP` dùng `onTopGeometry`: vỏ gộp đỉnh như hộp,
  đỉnh đáy chỉ đẩy ngang (pháp tuyến bỏ y) + nhấc 1mm → đáy vỏ nằm ngay trên mặt đỡ, có viền đáy mảnh. Mesh tên `NO_OUTLINE` thì bỏ qua
  (băng keo, nhãn, logo).
- `CardBox` (DoorParcels): thân thùng `name={OUTLINE_ON_TOP}`, đồ đắp `name={NO_OUTLINE}`. Dùng `name` thay `userData` vì R3F gán đè
  object `userData` khi vẽ lại (mất viền đã tạo / dùng chung giữa các thùng).

## Đổi chậu cây góc hành lang sang ZZ Plant (2026-10-30)

- Người dùng: thay chậu cây ở góc tường bằng `zz_plant_in_ceramic_pot__crafted_by_jerovdl.glb` (Sketchfab, Jerovdl, CC BY 4.0).
- File đã tối ưu sẵn (glTF-Transform, 587KB, 10,6k tam giác, texture 512) → chép thẳng `public/models/room/zz_plant.glb`, không cần script convert.
  Đơn vị mét, gốc giữa đáy chậu, cao 0,6m, đế 0,31 × 0,39m → `Model` ở `HALL_PLANT` bỏ `scale={1.8}` (cỡ thật).
- Gỡ `potted_plant_04.glb` (Poly Haven, 1,9MB) khỏi `public/`, `fetch-room.mjs`, `credits.ts`, `CREDITS.md`; thêm ghi công ZZ Plant
  vào `credits.ts` (nhóm Đạo cụ bàn làm việc) + `public/models/room/CREDITS.md` + bảng `giay-phep.md`.

## Đổi rèm lá cửa sổ sang "Window Blind - 3MB" (2026-10-30)

- Người dùng: đổi rèm cửa hiện tại thành `window_blind_-_3mb.glb` (Sketchfab, Mehdi Shahsavan, CC BY 4.0), "xoá model cửa dư đi".
- Chép thẳng `public/models/room/window-blind.glb` (1,3MB, 1 mesh, texture riêng 2 × 1024). File gốc đơn vị cm (node scale 0,01);
  khung bao = cả rèm 1,03 × 1,29m (ray trên + lá bước 2cm + thanh đáy) nên `VenetianBlind` vẫn co x / y vừa lòng ô cửa như cũ.
- Bỏ ép vân sồi lên lá (`BLIND_WOOD`, `woodUv`): giữ material + texture của model; khung / bậu cửa vẫn vân `oak_veneer_01`.
- Xoá `venetian-blind.glb` cũ (chưa rõ giấy phép). Ghi công: `credits.ts`, `public/models/room/CREDITS.md`, bảng `giay-phep.md`.

## Cửa sổ trong phòng: rèm khít khung, cỡ bằng bàn máy tính, cùng màu cửa sổ hành lang (2026-10-30)

- Người dùng: "mở rộng rèm cho bằng cửa sổ" → rồi "viền khít, không dư ra như cửa sổ hành lang", "bóp nhỏ lại, bằng cái bàn máy tính";
  "cửa sổ hành lang chuẩn màu, trong phòng sai".
- Rèm "Window Blind": lá rèm chỉ chiếm 88,1% bề ngang model (`SLAT_FRAC`, đo đỉnh glb), phần còn lại là 2 nắp đầu ray. `RoomWindow`:
  `blindW = (w + 0,01) / SLAT_FRAC` (lá phủ lòng khung, lấn 5mm mỗi bên), khung `fr = max(0,05, (blindW − w) / 2)` để 2 nắp nằm trọn
  trên khung. Vệt nắng tính theo lòng khung `w`.
- `WINDOW` (roomLayout): tâm x = `PC_DESK.x`, lòng 1,05m (cả khung ~1,2m = bàn máy tính), cao 1,2m (cũ 1,3 × 1,3).
- Lệch màu: 2 cửa sổ dùng chung component; cửa sổ phòng quay mặt về phía đèn chính (directional light trắng [6, 14, 8] trong Bench.tsx)
  nên bị rọi thẳng, bạc màu; cửa sổ hành lang quay lưng lại (xoay π) chỉ nhận ánh sáng môi trường. Prop `shade` (nhân màu r, g, b linear,
  clone vật liệu khung + rèm), phòng dùng `LIT_SHADE` [0,32, 0,29, 0,21]: đo trên ảnh chụp lá rèm phòng (223, 217, 184) ≈ hành lang
  (216, 208, 177). Hằng số ngoài component (mảng mới mỗi lần vẽ thì rèm clone lại liên tục).

## Daughterboard ai03 Unified C3 + dây JST (2026-10-30)

- Người dùng: "bổ sung assem dtb ai03 + dây jst" (github.com/mraghuram3/Unified-Daughterboard), "tìm model dây nhỏ vừa đầu cắm JST PH 4 pin"
  (thư mục KiCad `Connector_JST.3dshapes`).
- DTB C3 thật dùng đầu **JST SH 1,0mm** (SM04B-SRSS-TB, BOM C3), không phải PH 2,0mm; thư mục KiCad người dùng đưa chỉ có EH / GH / PH / XH
  → không dùng. Đầu cổng lấy luôn từ STEP của DTB (node `jst`), dùng lại làm cổng trên PCB bàn phím. Dây: dựng bằng code (không có model
  dây phù hợp, Sketchfab cần đăng nhập): 2 đầu cắm SHR-04 (5 × 2,4 × 4,2mm, lút 2mm vào cổng) + 4 sợi `TubeGeometry` AWG28 bước 1mm
  đỏ / trắng / xanh / đen (VBUS / D− / D+ / GND).
- Model: `bun run convert:dtb` (`scripts/convert-dtb.mjs`): STEP (`assets/dtb/`, MIT © 2019 ai03) →
  `public/models/dtb/unified-c3.glb` (262KB), node `pcb` (đen nhám, STEP tô xanh) / `usb` / `jst` / `parts`; gốc tâm mặt dưới mạch,
  USB-C quay −z (sau), miệng JST +z. Số đo trong `DTB_MM` (steps.ts): 18 × 16,5 × 1,6mm, 2 lỗ M2 phía trước (±7, +6,25), miệng JST z 7,8.
- Luồng: bước `dtb` sau `feet` (case trống, chỉ hiện case): bấm khối mờ → `placeDtb`, bấm 2 lỗ → `screwDtb(i)` (ốc socket M2 model
  `socket-cap-m2x6`, click thường, không skill check), bấm đầu dây → `plugDtb` (thiếu vít thì báo; xong tự sang bước). Bước `jst` ngay
  trước `caseIn`: board nhấc trên case (`lifted` trong Board + case trên top mount), bấm đầu dây nằm trên sàn → `plugJst`, dây vươn lên
  cổng mặt dưới PCB (`PcbJst` trong Board, lệch +0,9u x / +1,2u z so với DTB) và theo board hạ xuống (JstCable tự lerp như Board, dựng lại
  ống dây khi độ cao đổi). `BuildState.dtb` / `jst`, `stepProgress`, `NO_FLIP_STEPS`, câu thoại Keeb-chan `benchLines`.
- Chỉ case dựng bằng code, vỏ liền khối (`dtbSpot`): case CAD chưa có toạ độ lỗ USB (thử dò tự động bằng tia ngang vách sau: kết quả
  không tin được, bỏ), mica xếp lớp chưa khoét lớp. DTB nằm trên sàn sát mặt trong vách sau, x dời từ giữa theo bước 0,25u cho lỗ
  USB không chạm lỗ vít case 2 mảnh ở vách sau. Lỗ USB-C 11,5 × 5,5mm bo 2mm khoét CSG xuyên vách (`WallPort`, `caseShellGeometry`
  ports); gờ đỡ O-ring / gasket chừa khe `DTB_GAP` (`ledgeGeometry` gap).
- Khe sàn → mặt dưới PCB 4,9mm, DTB cao 4,86mm: vừa; socket hotswap / chân hàn ở hàng phím sau có thể chạm DTB (khuất dưới board, bỏ qua).
- Save rev 8 (`addDtbSteps`): build cũ dời stepIdx theo tên bước, đã qua bước thì coi như đã lắp DTB / cắm dây; các migration cũ
  (`addFeetStep` / `moveRingStep` / `addFoamStep`) tính trên danh sách bỏ `dtb` / `jst` (`noDtb`). Thùng đóng gói chưa gửi cũng dời bước.

## 2 poster bàn phím treo tường trước (2026-10-30)

- Người dùng đưa 2 ảnh (Redbubble mockup 600 × 600): art print "CHERRY クレイジー" (switch Cherry) + poster "My keyboards click with my style".
- Cắt lấy đúng mặt tranh (PIL, dò mép nền) → `public/textures/posters/cherry-crazy.jpg` (265 × 386) / `keyboards-click.jpg` (408 × 489).
- `CanvasPainting.tsx`: tách khung + viền giấy + mặt tranh thành `FramedArt`; thêm `ImagePainting({ url })` (useTexture, sRGB) dùng chung khung.
- `Room.tsx` (`POSTERS`): treo cặp giữa tường trước (x ±0,36m, tâm cao 1,5m, sau lưng khi ngồi bàn build; kệ bàn phím / đồng hồ / tranh cũ
  ở |x| > 0,7m). Cherry: 0,4m, viền giấy 5cm, khung đen; Keyboards: 0,45m, tràn khung, khung gỗ sáng.

## Vân gỗ cho phào chân tường, nẹp cửa, cửa hành lang, ván kệ; dọn texture thừa (2026-10-30)

- Người dùng: "thêm vân gỗ cho các cạnh tường trong nhà", rồi "cửa (hành lang) và kệ thêm luôn vân gỗ" (ảnh cửa 6 ô xanh + kệ sắt),
  "textures/room có ảnh nào không xài thì xoá".
- Room.tsx: phào chân tường `SKIRT` = vân óc chó `walnut_veneer` (nhân `#a4876f`), nẹp ô cửa sang hành lang + ngưỡng `TRIM` = vân sồi
  (nhân `#b27a4c`); khối dựng bằng `woodBoxGeometry` (UV theo toạ độ thật, vân chạy dọc thanh; nẹp đứng vân dọc), ảnh lặp `woodTex`.
- HallProps.tsx (dựng theo mét): `woodUV` tính theo đơn vị cảnh (1 ảnh ~22u = 0,42m) → ảnh lặp `22 / 0,42` lần (`grain`). Cửa gỗ sơn xanh
  giữ màu sơn, vân sồi nổi dưới lớp sơn bằng normal map (`normalScale` 1,2) + roughness map (nhân ảnh màu gỗ vào màu sơn thì lệch màu);
  ván kệ (`BOARD`, cả kệ cửa + kệ cất đơn dùng `MetalRack`) = vân sồi mộc nhân `#e0bf96`. Cửa sổ hành lang đã có vân sồi từ trước.
- Xoá `public/textures/room/beige_wall_001_diff_1k.jpg`: tường sơn `WALL_COLOR` luôn ghi đè `map={null}` (chỉ dùng vân trát normal /
  roughness) → bỏ `map` khỏi `WALL_TEX`, `MapSet` thành Partial, `fetch-room.mjs` không tải ảnh màu tường nữa. 11 ảnh còn lại đều đang dùng
  (sàn laminate, vân trát tường, vân sồi / óc chó cho case gỗ + đồ gỗ phòng).

- Sau đó người dùng: "viền xung quanh nhà dùng màu gỗ xám cho hợp với tường (`oak_veneer_01_rough_1k.jpg`)" → `SKIRT` / `TRIM` đổi sang
  ảnh xám vân sồi đó làm ảnh màu (`GREY_WOOD`), nhân `#9ea6ad` / `#b9c0c6` ngả xanh xám theo tường; vân óc chó / sồi màu ở viền bỏ.
  Khối đứng (cột nẹp cửa, cánh cửa) vân dọc: `grainBoxGeometry` (materials.tsx) đổi u / v khi cao hơn cả bề ngang + bề sâu
  (`woodUV` luôn cho vân chạy ngang mặt đứng).
- "Kệ thép chưa giống thép, thêm texture thép": `RACK_BLUE` = Poly Haven `blue_metal_plate` (CC0, Rob Tuytel; diff + nor_gl + arm,
  `fetch-room.mjs`), `arm` làm cả roughnessMap (kênh G) + metalnessMap (kênh B), metalness / roughness 1, lặp 1 ảnh / 1m. Ảnh gốc
  xanh navy cũ: nhân màu 2,2 thì bạc thành xanh nhạt loang lổ → 1,4 (thép xanh xám bóng, lộ xước). Khung kệ dùng UV theo kích thước thật.
- Rồi người dùng (ảnh mẫu PCBS: khung cửa gỗ bản rộng ốp tường + phào mảnh, cùng tông gỗ): "màu gỗ nẹp tường phải giống màu sàn nền"
  → bỏ gỗ xám. `FLOOR_WOOD` (Room.tsx, dùng cho `SKIRT` + `TRIM`) = vân sồi liền `oak_veneer_01_diff` (texture sàn laminate có đường
  ghép ván, không hợp thanh mảnh) nhuộm hệ số linear (0,92, 1,04, 1,31) để màu trung bình trùng sàn (155 / 128 / 99 vs sồi 161 / 126 / 87).
  Khung ô cửa (`CASING`): cột + đầu cửa bản 9cm xuyên hết bề dày tường, lồi ra 1,5cm mỗi mặt (ốp lên tường 2 phía), lấn 2cm vào
  lòng ô cửa (lòng cửa bọc gỗ); đầu cửa nối liền 2 cột.

## Cửa sổ mỏng sát tường (2026-10-30)

- Người dùng (ảnh nhìn nghiêng): "viền cửa sổ quá dày, làm mỏng lại hoặc âm tường". Chọn làm mỏng: âm tường phải khoét lỗ tường phẳng
  (PlaneGeometry) + dựng 4 mặt lòng tường cho cả cửa sổ phòng lẫn hành lang.
- `RoomWindow`: khung + đố lồi khỏi tường `FRAME_D` 2,5cm (cũ 7cm), rèm ép dày `BLIND_D` 3cm (`VenetianBlind` scale z = BLIND_D / dày model,
  gốc 6,7cm) đặt ngay trước khung, bậu `SILL_D` 9cm (cũ 17cm), kính ở trong khung (0,6 × FRAME_D).
- Phào chân tường hạ thấp (người dùng: "nẹp chân tường cao quá"): `SKIRT_H` 5cm (cũ 9cm), dày `SKIRT_T` 1,4cm (cũ 1,6cm), Room.tsx.
- Sàn liền qua ô cửa (người dùng: "cho liền gạch nền qua, không cần gạch cắt"): bỏ thanh ngưỡng cửa; sàn phòng lấn sang trái hết bề dày
  tường trái `WALL_T` (lấp khe dưới ô cửa, phần dưới tường bị 2 mặt tường che); `useTiled(..., at)` neo texture theo toạ độ thật
  (offset = mép trái x / tile, −mép trước z / tile) cho sàn phòng + sàn hành lang → ván nối liền, không lệch ở mép tường.

## Công tắc đèn cạnh ô cửa hành lang (2026-10-30)

- Người dùng (ảnh khoanh chỗ trên tường trái, sát nẹp cửa phía tường trước): "thêm 1 model công tắc bật đèn ở đây". Không có file model → dựng bằng code.
- `LightSwitch` (`room/Wiring.tsx`, cạnh `Outlet`, cùng nhựa `PLATE`): mặt nạ vuông 8,6cm, khung phím lõm, phím bập bênh nghiêng theo `on`,
  chấm đèn báo cam (tắt đèn thì sáng hơn). Chỉ trang trí, chưa bấm được / chưa bật tắt đèn trần.
- `LeftWall` (Room.tsx): mặt trong tường trái `x = −HALF_W`, z = mép ngoài nẹp cửa + 8cm (`z1 − lip + cw + 0.08`), cao 1,25m, xoay π/2 quay vào phòng.

## Đèn downlight âm trần hành lang (2026-10-30)

- Người dùng: "thêm 1 số bóng đèn âm tường hay sao đó ở hành lang".
- `room/Downlight.tsx` (dựng bằng code): viền nhựa trắng Ø11cm + lòng chụp + mặt đèn `MeshBasic` trắng ấm (không tone map → trông như sáng),
  quầng sáng nhỏ trên trần + vầng sáng ấm Ø1,1m trên sàn (canvas gradient tròn, cộng sáng, opacity 0,16). Không dùng pointLight thật
  (mỗi đèn thật làm nặng mọi material cả cảnh).
- `Hallway` (Room.tsx): 4 đèn dọc giữa trần `HALL_LIGHTS_Z` = −2,2 / −0,55 / giữa ô cửa / 2,8 (m), cách ~1,65m.
- Rồi người dùng: "viền cửa sổ 2 bên vẫn dày, cho nhỏ lại như ở dưới, bỏ thanh gờ (bậu) bên dưới". Khung `FRAME_W` 3cm đều 4 cạnh (trước:
  2 bên nới bằng phần nắp ray lòi ra ~7cm), bỏ bậu cửa. Lá rèm vẫn phủ lòng khung (`blindW = (w + 0,01) / SLAT_FRAC`) → 2 nắp đầu ray
  lòi quá khung: `VenetianBlind clip` nướng biến đổi vào hình (clone) rồi ép đỉnh |x| > mép ngoài khung về mép (nắp cụt bằng khung,
  giữ pháp tuyến gốc). `WINDOW.w` 1,14m để cả khung vẫn 1,2m bằng bàn máy tính.

## Bỏ 2 tranh khung, thêm 2 poster dán tường hành lang (2026-10-30)

- Người dùng: bỏ tranh khung oval chạm (ảnh lâu đài) + khung vàng (phong cảnh Hà Lan); thêm 2 ảnh vào hành lang "kiểu banner dán trên
  tường, không phải khung tranh".
- Bỏ `ModelPainting` `hanging03` (tường hành lang phía phòng) + `fancy01` (tường phải gần tường trước); xoá `hanging_picture_frame_03.glb`,
  `fancy_picture_frame_01.glb` khỏi `public/models/room/`, `FRAMES`, `fetch-room.mjs`, `CREDITS.md`.
- Ảnh người dùng đưa (`D:\Code Game\`, ảnh mockup sản phẩm 600 × 600) cắt bỏ nền + bóng mockup (PIL, dò mép khác màu nền) →
  `public/textures/posters/caution-keyboard.jpg` (351 × 498) + `bassline-303.jpg` (413 × 495).
- `room/WallPoster.tsx`: tấm giấy phẳng cách tường 2mm (không khung, không viền) + 4 miếng băng keo giấy kem mờ chéo 45° ở góc.
  Caution (rộng 0,42m) ở tường hành lang phía phòng chỗ tranh oval cũ (z −1,6); Bassline 303 (0,45m) tường ngoài hành lang z −0,7
  (giữa cửa chính và tranh đối diện ô cửa), tâm cao 1,5m.
- (2026-10-30) Người dùng: thay bằng `light_fixture_-_ceiling_recessed.glb` (Sketchfab, MozillaHubs, CC BY 4.0), "3 bóng thôi".
  Chép `public/models/room/ceiling-recessed.glb` (175KB, Ø20cm dày 2cm, mặt đèn −y, có texture phát sáng). `Downlight` bỏ viền / mặt đèn
  dựng code, gắn model với tâm sát trần (lún nửa vào trần), giữ quầng trên trần (to lên 0,5m theo cỡ đèn) + vầng sáng sàn.
  `HALL_LIGHTS_Z` còn 3 đèn: −1,6 / giữa ô cửa / 3,4. Ghi công: `credits.ts`, `public/models/room/CREDITS.md`, `giay-phep.md`.

## Ổ cắm tường đổi sang model "Electrical Wall Outlet" (2026-10-30)

- Người dùng: "thay thế model ổ cắm" bằng `electrical_wall_outlet.glb` (Sketchfab, sacapuntas, CC BY 4.0).
- Chép `public/models/room/wall-outlet.glb` (132KB, 3,5k tam giác, không texture). File đơn vị ×10 (0,81 × 1,24) → thu 0,1 = 8,1 × 12,4cm,
  2 ổ ở y ±2,8cm, lỗ cắm mặt +z, lưng lún sau 5,3mm → `OUTLET_Z` đẩy ra cho lưng sát tường.
- `Outlet` (Wiring.tsx) giữ API (`plugged`, gốc = tâm mặt ổ sát tường): bỏ mặt nạ / lỗ cắm dựng code, phích cắm dời theo ổ model (y ±0,028).
  Dùng ở đèn bàn build (Room) + máy tính (PcDesk); dây cáp không đổi.

## Công tắc đèn đổi sang model "Light Switch" (2026-10-30)

- Người dùng: thay model công tắc bật đèn bằng `D:\Code Game\light_switch.glb` (Sketchfab, Avot, CC BY 4.0) → bản gốc
  `assets/supplies/light_switch.glb` (1,7MB, 3 texture PNG 1024; normal map dạng palette `P` làm sharp lỗi `colourspace` khi nén WebP)
  → texture chuyển RGB 512px JPEG bằng PIL + `gltf-transform optimize --compress meshopt --texture-compress false --simplify false`
  → `public/models/room/light-switch.glb` (128KB, giữ kích thước thật: mặt nạ 70 × 114 × 5mm).
- `LightSwitch` (Wiring.tsx) dùng model: mặt trước model là +x → xoay −π/2 cho mặt quay +z, dời 3mm cho đáy mặt nạ sát tường; bỏ prop `on`.
  Dùng cho cả công tắc trong phòng (cạnh khung ô cửa) và công tắc hành lang cạnh cửa chính (`PanelDoor`, thay khối dựng bằng code,
  nâng tâm lên 1,35m cho thoát mặt kệ sắt cao 1,25m).
- Ghi công: `credits.ts`, `public/models/room/CREDITS.md`, bảng `giay-phep.md`. Người dùng hỏi lại "xoá cái vừa thêm" → chọn giữ công tắc mới
  (ổ cắm `wall-outlet.glb` do agent khác đổi cùng lúc).

## Phích cắm model: dây nguồn máy tính + dây đèn bàn (2026-10-30)

- Người dùng: "thay luôn dây điện cắm cpu thành model `cc0_european_power_plug.glb`", "dây điện cắm bóng đèn thành `power_plug_european.glb`".
- `cc0_european_power_plug.glb` → `public/models/room/power-cord-cee.glb` (Lara Sophie Schütt, ghi CC0 nhưng Sketchfab để CC BY 4.0 → ghi công):
  nguyên sợi dây nằm uốn cố định trên sàn (phích CEE 7/7 + đầu cái IEC C13) → **chỉ lấy 2 đầu cắm** (`pick` tách nhánh theo tên `^CEE` / `^IEC`
  kèm transform thế giới), đoạn dây giữa vẫn là `Cable` tự uốn. CEE: chân xếp dọc +z, dây ra ngang → xoay π quanh y rồi −π/2 quanh trục chân
  cho dây thòng xuống. C13: trục +x riêng = hướng cắm, `PowerInlet` đặt gốc = tâm mặt cắm (đo Box3 lúc chạy), `C13_LEN` 7cm.
- `power_plug_european.glb` → `power-plug-eu.glb` (ChoboiAssets, CC BY 4.0, 1 mesh + texture ~1MB): file ×50 (thu 0,02 → Ø3,7cm),
  chân ngang +z, đuôi dây sau thân chếch xuống → xoay π quanh y.
- `Outlet` (Wiring.tsx) thêm `plug: 'eu' | 'cee'` (bỏ khối phích đen), `plugExit(kind)` = chỗ dây ra khỏi phích (hệ ổ) để nối `Cable`.
  PcDesk: `PowerInlet` ở lưng CPU (`C13_AT`, x −0,17 hệ bàn) → dây thòng sàn → phích CEE (`PLUG_END` đổi từ hệ ổ xoay π/2).
  Room: dây đèn bàn tới `LAMP_PLUG`, phích EU.

## 2026-10-30

### Viền hover lịch treo tường dày hơn

- Bìa lịch là hộp rất mỏng: `outlineGeometry` làm mượt pháp tuyến → góc chĩa chủ yếu ra trước, vỏ ngược đẩy ngang ít, viền trông mảnh hơn bàn.
- `useHoverOutline(ref, show, scale)` + `RoomSpot outlineScale`: vật liệu viền dày ×scale (`outlineMat`, cache theo scale). `WallCalendar` dùng 2.

### Phích cắm đèn bàn màu đen

- Phích `eu` (`power-plug-eu.glb`) gốc trắng lệch màu dây đen: `blackPlug` trong `Wiring.tsx` clone vật liệu, nhân màu `#262626`
  (model 1 vật liệu texture chung cả chân, chân khuất trong ổ). Phích `cee` (máy tính) vốn đen, giữ nguyên.

### Bước mở hộp = mở thùng carton đơn hàng (bỏ rương gỗ)

- Người dùng: bước mở hộp mở đúng thùng giấy đơn hàng lúc đặt trên bàn, bỏ model hộp gỗ.
- `ShippingBox` (scene/parts) dựng `JobBox id={order.id} flaps` cỡ thật (`scale={M}`, như thùng trên bàn ở EmptyBench), bấm (`Clickable`,
  viền hover + `HintArrow`) → rung 0,25 đầu rồi 2 nắp gập bật ra trước / sau (`CardBox flaps`: thân mặt trên tối `OPEN_MATS`, mỗi nắp
  nửa mặt trên + nửa băng keo, tem dễ vỡ trên nắp trước), `OPEN_MS` 1,4s tự `nextStep`. Bỏ các kiểu túi zip / hộp giấy / thùng to theo
  bàn phím / rương gỗ ở bước này.
- Xoá `public/models/room/wooden_chest.glb` (9,5MB) + ghi công (credits.ts, CREDITS.md); `PACKAGING` bỏ "rương gỗ" (vẫn ghi trong tin
  khách "Mình gửi kèm (túi zip / hộp giấy / thùng carton)").

### Feet Duality Horns dán lệch (dò hốc trên đáy nghiêng)

- Người dùng: feet Duality Horns dán lệch ra góc ngoài, không vào hốc. `caseFeet.json` không có `duality-horns/case` → game dùng 4 góc
  mặc định. Script cũ chỉ bắt 2 hốc sau: đáy case nghiêng sẵn góc gõ, độ sâu đo so với đáy thấp nhất nên 2 hốc trước "sâu" 4,7mm > 4.
- `scripts/probe-case-feet.mjs`: gom mặt quay xuống tới `SCAN_H` 15mm trên đáy thấp nhất, lọc hốc theo độ sâu so với mặt đáy quanh hốc
  (`floorAt`: trung vị mặt quay xuống trong vành r+0,5 → r+8mm, chỉ lấy mặt thấp hơn trần ≤ 5mm; độ sâu = đỉnh trần − đáy quanh); giá trị
  ghi ra vẫn là độ cao trần (min) so với đáy thấp nhất. Có tham số model thì gộp vào JSON sẵn có (trước: chỉ in); `DEBUG=1` in độ sâu từng cụm.
- Chỉ thêm `duality-horns/case` (4 hốc Ø8,3mm: sau x ±123,1 z −41,8, trước x ±163,6 z 57). Chạy lại cả file bằng cách dò mới thì kết quả
  một số case cũ (Bakeneko, Exodus…) khác đi — chưa kiểm bằng mắt nên chưa ghi đè; dò lại case nào thì chạy riêng case đó rồi xem trong game.

### Duality Horns thành case 2 mảnh

- Người dùng: Duality là case 2 mảnh mà build ra 1 mảnh. STEP có SOLID (nắp) + BOTTOM (đáy) nhưng cùng 1 file nên `isBottom` (theo tên file)
  không tách → gộp node `case`; `CASES.dualityHorns.pieces` = 1.
- `convert-user-cases.mjs`: Duality tách 2 mục SOLID / BOTTOM (`bottom: true`) → GLB có node `case` + `bottom` + `weight`; chạy riêng từng
  case bằng tham số id; `marks` (điểm CAD mm) in ra toạ độ game cho `screws`. Seat không đổi (rise 0.19, tilt 0.079); feet dò lại vẫn 4 hốc cũ.
- Vít ghép: STEP không có đinh vít ghép; dò vách trụ đứng ở cả 2 mảnh → 4 lỗ Ø2mm ở 4 góc (cách mép ~5mm). `pieces: 2`,
  `screwSide: 'bottom'`, `screws` [±175,2 / 175,3, 66,6 / −66,8]. Mount giữ gasket / tray. Chưa kiểm bằng mắt trong game.
- Plate thật của người dùng (`assets/keyboards/duality-horns/plate/duality-tkl.dwg`, đọc bằng LibreDWG WASM): TKL F13, multi-layout,
  6 tai có khe vít (top mount), rãnh flex, khuyết mép (o-ring); 26 đệm Ø3,1mm trên / dưới tai trong STEP. Chưa dựng vào game.

### Duality Horns: feet trước lồi, khối chặn thừa, mount top / O-ring (2026-10-30)

- Feet trước lồi cao: `RubberFeet` dựng feet từ trần hốc xuống tới dưới đáy THẤP NHẤT case (−0,08u); đáy Duality 2 tầng (vùng trước cao hơn
  ~4,5mm) nên feet trước dài ~6mm. `caseFeet.json` thêm số thứ 5 = mặt đáy quanh hốc (mm; `probe-case-feet.mjs` ghi `min(trần, floorAt)`),
  `FootPocket.floor` (u); `RubberFeet` đặt gốc ở `Y.floorBot + floor`, feet cao `depth − floor + 0,08` → 4 feet nhô như nhau. Bản 4 số cũ = 0.
- Khối chặn thừa: nắp CAD Duality có sẵn khung chặn → `CaseDef.ownBlocks` (Case.tsx 2 chỗ `Blockers` của case CAD + `orderThumb`) bỏ khối
  chặn dựng bằng code.
- Mount: người dùng chọn chỉ Top mount + O-ring (`mounts: ['top', 'oring']`; dev "Chọn case" / `DevCasePanel` đọc thẳng `mounts`).
  Đã chạy thử (playwright-core, `startDevBuild` + `nextStep`) cả 2: top = topCase → topScrew → caseIn → caseScrew; oring = ring → … →
  caseClose → caseScrew, không lỗi. Vít top mount vẫn theo vị trí tính sẵn (chưa theo 6 tai plate thật); vít ghép case vẫn thẳng đứng từ đáy
  (thật là 8 vít bắt chéo từ nắp xuống trụ đáy, nghiêng ~36° — đo được 8 trụ ở đáy, chưa dựng vít nghiêng).
- Hàng F lệch ô nắp: nắp cắt theo TKL F13, layout game là TKL thường (chưa có biến thể F13).

### Duality Horns: layout TKL F13 + 8 vít ghép bắt chéo + vít top mount theo tai plate (2026-10-30)

- Người dùng: "đây là layout F13 chứ làm gì có F12" + làm cả vít bắt chéo. Layout mới `tklf13` (types `LayoutId`, layouts.ts `tklF13Rows`:
  Esc · 0.25 · F1–F4 · 0.25 · F5–F8 · 0.25 · F9–F12 · 0.25 · F13 · 0.25 · cụm PrtSc; hàng dưới như TKL, cùng variant), `strict` → case CAD
  phải ghi đích danh (`caseFits`); Duality `layouts: ['tklf13']`; `DAYS` / `SIZE_MULT` như TKL. Plate dùng lỗ theo phím (chưa có plate
  universal / plate DWG). Đã chụp playwright: hàng F13 khớp ô nắp. Phím F13 bàn phím thường không có → bước test khó bấm đủ.
- Vít ghép: 8 trụ đáy có miệng côn r ~5,7mm, trục ~41°; tâm x theo cặp vách khe (sau 42,9 / 123,8 / 223,6 / 309,6; trước 24,3 / 99,3 /
  233,9 / 309,6). `screwRays` trong convert-user-cases.mjs bắn tia từ miệng côn dọc trục vào nắp (node `case`, Möller–Trumbore, lấy điểm ra
  xa nhất) → `angledScrews` [x, y, z mm hệ model + hướng đi vào]. Mép trước ban đầu cho nghiêng ra ngoài → người dùng: "vít cạnh dưới phải
  quay vào trong" → đảo trục mép trước: cả 8 vít song song (0, −0,8, 0,6), đầu vít mép sau trong ô hàng F, mép trước ở mép trong nắp.
- Game: `ScrewPoint.y / dir`, steps.ts `caseScrews` từ `angledScrews`; `ScrewSet` vít có `dir` dựng trong group tại đầu vít, quaternion
  xoay trục −y theo `dir` (`tiltOf`). Duality `screwSide: 'top'` (không lật case), bỏ `screws` 4 góc tạm; `caseScrewHoles` bỏ qua case CAD.
- Top mount: `CaseDef.topScrews` (mm hệ model) = 6 tai plate (tâm đệm trên / dưới tai trong STEP, khớp 6 khe tai DWG; `marks.topScrews`),
  thay `topScrewPoints`; Board vẽ tai plate theo `ctx.screws.topScrew`. Đã chụp: vít tai plate ở 3 khe tai trước, 8 vít đóng case.
- `marks` trong convert-user-cases.mjs giờ là object theo tên nhóm (in `<tên>: [[x, z]...]`).
- (2026-10-30, sửa) Người dùng: vít lệch lỗ + 4 ốc mép sau quay ngược ra ngoài. Cách "tia từ miệng côn trụ đáy" sai: trục khớp trên mặt côn
  lệch, tia xuyên ~10mm vật liệu đặc của nắp chứ không chạy trong lỗ. Dò lại bằng `scripts/probe-screw-axis.mjs`: quét hướng thông từ trong
  trụ → trục (sau 0, −0,672, 0,741; trước 0, 0,746, 0,665 — cả 8 đầu vít quay vào trong, chéo xuống ra ngoài), dịch gốc tìm khoảng hở lớn nhất =
  tâm lỗ, khoảng hở dọc trục: lỗ ren đáy r ~1,1 · lỗ xuyên nắp r ~1,5 · hốc đầu vít r ~2,7–3 → đầu vít = đầu hốc (t ≈ 4 / 4,5mm).
  convert-user-cases.mjs `screwHeads` [đầu vít CAD + trục] thay `screwRays` (bỏ bắn tia). Đã chụp: đầu vít nằm trong miệng hốc cả 2 mép.
- (2026-10-30) Ốc nón trên tạ Duality (người dùng: tạ dùng ốc nón mà không thấy con nào; tạ không cần tháo): dò lỗ côn trong STEP → WEIGHT 4 lỗ
  Ø7,2 (x 46,1 / 301,5 · y −13,2 / −42,5, mặt trên z −10,43) + ACCENT_V2 2 lỗ Ø5,5 (x 95,5 / 252,1 · y −80,5). convert-user-cases.mjs
  `heads.weightScrews` (cùng đường in với `angledScrews`) → `CaseDef.weightScrews` [x, y, z, hướng, Ø]; `WeightScrews` trong `CaseModel`
  (đi cùng đáy, không bấm được) dựng model ốc nón M3 (`countersunk-m3x10.glb`, đầu Ø6) co theo Ø lỗ, xoay theo hướng (nghiêng góc gõ).
  Đã chụp: 6 ốc nằm giữa lỗ côn.

### Plate riêng Duality, nắp top mount hở 1 đầu, bàn phím bàn máy tính lơ lửng (2026-10-30)

- Plate: người dùng "file plate đang dùng cho case không đúng, là plate riêng" (`duality_tkl.dwg`, trùng file đã chép). `scripts/gen-duality-plate.ts`
  (`bun run gen:plate-duality`, devDependency `@mlightcad/libredwg-web` 0.8.2): DWG → nối nét thành vòng kín → lỗ switch 14 × 14 → độ dời khớp
  layout `tklf13` (bỏ phiếu cặp phím – lỗ lưới 0,25mm rồi trung bình; 60/88 phím khớp, lệch 0,00mm; còn lại lỗ gộp stab / multi-layout).
  Viền DWG vẽ chồng nét (đường thẳng qua khuyết bán nguyệt + nét ngăn dọc x 305,37) → không dựng shape từ DWG mà lấy lưới `PLATE_STANDARD`
  trong STEP (khung bao trùng DWG 347,7 × 131,1, có rãnh flex; `PRT0001` không có), xoay sang hệ board + dời → `plate.glb` (scene tên
  `duality-plate`: trùng tên node "plate" thì GLTFLoader đổi node thành `plate_1`, `nodes.plate` thành Group rỗng → plate không hiện).
  `CaseDef.plateModel` + `ModelPlate` trong Board (thay plate dựng theo phím, tô theo chất liệu). Đã chụp: tai, rãnh flex, lỗ khớp socket PCB.
- `tklf13` chỉ hàng dưới WKL (người dùng: Duality chỉ có WKL).
- Nắp top mount hở 1 đầu: nắp CAD có góc gõ (seat tilt 0,079), lúc úp lên plate (board còn phẳng, chưa seat) → Case.tsx nắp CAD khi `topOnly`
  bọc phép ngược của seat (dời −dx / −rise / −dz rồi xoay −tilt). Vít tai plate giữ hệ board. Đã chụp: switch nhô đều qua ô nắp.
- Bàn phím Realforce trên bàn máy tính lơ lửng ~4cm: `DeskGear` lấy khung bao có sẵn (min / max accessor của lưới trước khi simplify
  2%) → `box.expandByObject(m, true)` (khung chính xác theo đỉnh). Đã đo: đáy bàn phím = đáy chuột = mặt bàn.
- (2026-10-30) Plate Duality giữ đúng file gốc (người dùng chọn): plate cắt hàng dưới kiểu Tsangan 7u (Ctrl 1,5 · Win 1 · Alt 1,5 · Space 7 ·
  Alt 1,5 · Fn 1 · Ctrl 1,5) + 8 lỗ chữ thập quanh space, chỉ có khe stab 7u (x 4,5u / 10,5u). Chơi WKL: 2 lỗ Win / Fn để trống, khối chặn nắp
  che; không bịt lỗ cho riêng WKL. Đã đối chiếu (ảnh chồng lỗ DWG + phím game, chụp hàng dưới có stab): phím / stab khớp lỗ.
  `gen-duality-plate.ts` thêm `DUMP=<file>` xuất lỗ DWG đã căn (mm hệ board) để đối chiếu.
- (2026-10-30) Sửa: build Duality của người dùng vẫn hàng dưới WK (space 6.25u + switch ở Win / Menu, stab lệch khe 7u) vì đơn tạo trước khi
  `tklf13` chỉ còn 'wkl' (biến thể lưu trong save). `loadSave` (metaSlice `fix`) gọi `fixVariant`: biến thể không còn trong
  `LAYOUTS[layout].variants` → lựa chọn đầu (layout chỉ 1 lựa chọn thì gán luôn), áp cho đơn đang làm + `jobs` + `offers`. Đã thử
  (playwright): save cũ 'wk' → nạp lại 'wkl', space 7u, 85 phím.
- (2026-10-30) Ốc tạ xuyên qua đáy case (model M3×10 co theo lỗ dài ~12mm): `WeightScrews` rút thân còn `WEIGHT_SCREW_L` 4mm (giữ đầu côn
  `FLAT_HEAD_H` 1,7mm, ép phần dưới theo y, như `shortenScrew`). Đã chụp mặt đáy: không lòi.
- (2026-10-30) Badge chữ thập cụm mũi tên mất ở bước top mount (người dùng: "ai mượn gỡ ra"): BADGE gộp trong node `weight` (đi cùng đáy),
  lúc chỉ vẽ nắp (topCase / topScrew) thì không có. convert-user-cases.mjs tách `{ names: ['BADGE'], badge: true }` → node `badge`,
  `CaseModel` vẽ badge (kim loại tạ) cùng nắp (`part !== 'bottom'`). Đã chụp bước topScrew: badge ở lỗ chữ thập nắp.
- (2026-10-30) Vít badge (người dùng: badge chưa vặn vít, check không xuyên như tạ): STEP BADGE có 2 lỗ Ø2,67 (x 340,14 · y −70,76 / −88,01,
  z 2,03), nắp có lỗ ren Ø2,06 cùng chỗ (z 3,7–4,6) → 2 vít đầu trụ M2 bắt từ trong nắp lên (`heads.badgeScrews` → `CaseDef.badgeScrews`).
  `WeightScrews` gộp thành `FixedScrews` (kind flat = ốc nón tạ còn 4mm / socket = M2 model dài 8mm còn 5mm, đầu nhô `lift` 2mm); badge vít vẽ
  cùng nắp. Đã đo bằng tia trong game: đỉnh vít 0,263u < thân badge 0,289u < mặt badge 0,41u → không xuyên.

## Feet Bakeneko 60 dán sai chỗ (2026-10-31)

- (người dùng gửi ảnh: "vị trí dán feet bị sai, case sai là bakeneko") `caseFeet.json` thiếu `bakeneko60/case` (các case CAD khác đều có)
  → `feetPockets` rơi về 4 hốc của case dựng bằng code (`W/2 − 0.9`) nằm sát mép, lệch khỏi hốc thật dưới đáy. Chạy
  `bun scripts/probe-case-feet.mjs bakeneko60/case` (bun chạy được script .mjs, máy không có node) → 4 hốc ±124,7mm, z −46 / 40, r 4,2;
  đáy Bakeneko nghiêng nên 2 hốc sau cao 9,5mm. Script ghi JSON khác định dạng → chạy prettier lại cho diff chỉ còn mục mới.
  Thêm case CAD mới mà quên dò feet thì bị y như vậy.

## Bakeneko 60 quay ngược: lỗ USB ra phía người gõ (2026-10-31)

- (người dùng gửi ảnh: "hướng đặt case cũng bị ngược, vị trí cổng dtb phải nằm phía trên mới đúng sao lại hướng vào người")
  `convert-cases.mjs` đoán mặt trước = "phía có đỉnh thấp hơn"; Bakeneko đoán ngược (vách cao 29mm ra trước, lỗ USB-C ra trước, đáy vát
  ngược). Thêm `turn: true` cho `bakeneko60/case` (xoay 180°, như Planck) → `bun scripts/convert-cases.mjs` (bun chạy .mjs; Planck ra file
  khác byte nên chép lại bản cũ, chỉ đổi Bakeneko). Đo lại: vách trong ±46mm (z) / ±133mm (x) cân đối → board vẫn giữa lòng case.
  Dò lại feet (`probe-case-feet.mjs bakeneko60/case`): 2 hốc cao 9,5mm giờ ở phía trước = case dày dần về sau, đúng góc gõ (trước khi xoay ở
  phía sau, xác nhận hướng cũ sai). Ảnh thẻ chụp lại riêng 9 màu: `bake-shop-thumbs.ts` thêm `ONLY` (chỉ chụp khoá chứa chuỗi, giữ ảnh khác
  - gộp bảng tra), `ONLY=bakeneko60 bun scripts/bake-shop-thumbs.ts`.

## Thùng đóng gói không thấy đáy (2026-10-31)

- (người dùng gửi ảnh: "bước cho phím vào thùng mà đáy thùng không có") `PackBox`: mặt lòng thùng đặt y = 0,02 (u, so mặt bàn) thấp hơn
  mặt thảm cắt (Y.table + 0,005, dày 0,07) → bị thảm che, nhìn xuyên thấy thảm. Đáy lên `FLOOR_Y` 0,08 (ngay trên thảm); ẩn lúc thùng
  bay vòng qua bàn phím úp xuống (không xuyên qua phím), đứng chờ / úp xong thì hiện (đáy nằm dưới đáy case).

## Chữ keycap hiện sau khi lắp (2026-10-31)

- (người dùng: "tới bước gắn keycap thì phải render đủ kí tự trên keycap rồi mới hiển thị màn build, hiện tại gắn vào rồi mới show kí tự")
  Chữ keycap là drei `Text` (troika) dựng glyph bất đồng bộ, không suspend → keycap hiện trước, chữ hiện sau. `Keycap.tsx` truyền
  `characters={LEGEND_CHARS}` (ASCII 33–126 + '→←'; ↑ ↓ vẽ bằng '→' xoay): drei `preloadFont` + suspend tới khi font + glyph xong →
  Suspense bàn build (`StepLoading`) giữ lớp chờ. Chỉ chờ lần đầu (cache theo font + chuỗi ký tự). Khung xem 3D có `Board` cũng suspend
  (Canvas R3F tự bọc Suspense). Thêm ký tự nhãn mới ngoài ASCII thì thêm vào `LEGEND_CHARS`.

## Daughterboard cho mọi case: mica + case CAD, vít canh lực, board dựng, rãnh dây (2026-11-01)

- Người dùng: "đáng lẽ tất cả các case phải lắp được chứ", "1 số model đã có lỗ bắt ốc dtb sẵn rồi ko cần thêm vào, nhớ thêm lực bắt ốc như lúc
  assem", "cổng jst trên dtb / pcb phải có sẵn, chỉ có step cắm dây", "các case có sẵn model 1 số có rãnh đi dây jst rồi nên check theo",
  "đến bước lắp jst vào pcb thì phải lệch pcb lên dọc để thấy".
- Mica xếp lớp: tấm viền nằm ngang tầm cổng USB khoét rãnh xuyên vách sau hết bề dày tấm (`micaLayerGeometry` `slots`, `micaHitsPort`,
  `Layers ports`, kind `slot`); `dtbSpot` bỏ chặn mica.
- Case CAD: `node scripts/probe-case-usb.mjs` → `src/data/caseUsb.json` (17 model): lưới tia ngang vào vách sau tìm cụm ô "sâu" kín cỡ lỗ USB
  (không thấy lỗ xuyên thì dò lại hốc lõm nông — Exodus60 nắp HHKB / WKL chỉ có hốc 12,5 × 1,5mm); mặt trong vách = mặt thứ 2 của tia từ ngoài
  ngay trên / dưới lỗ (tia từ trong ra vướng trụ); sàn 2 điểm dọc thân DTB (dốc > 12° coi là bậc: bỏ dốc). Bệ DTB có sẵn: bản đồ cao độ
  quanh 2 lỗ vít dự kiến (±7, +6,25mm), cụm lõm (lỗ ốc trên bệ) / nhô (trụ) gần tâm cửa sổ nhất, không chạm mép → `mount` (13 / 17 model có).
  Rãnh dây: BFS ô sàn thấp ≤ 3mm từ miệng JST, phần ngoài hốc DTB là dải hẹp (diện tích / chiều dài ≤ 20mm) → đường ngắn nhất tới đầu xa,
  tối đa 60mm (`groove`: Bakeneko60, Repent75, RF Bruh, TA65; case mà miệng JST bị tạ / nắp che từ trên thì không dò được).
- Game: `DtbSpot` (types) thêm `y` / `tilt` / `floor` / `groove`. Có bệ → nằm trên bệ, nghiêng theo sàn; không bệ → tâm USB-C ngang tâm lỗ,
  lỗ cao hơn sàn > 0,5mm thì kê 2 trụ đỡ (vẽ trong `Daughterboard`). Tạ trong lòng case (Exodus60) mờ đi ở bước `dtb` / `jst`
  (`CaseModel seeThroughWeight`) vì DTB nằm dưới tạ.
- Vít M2 DTB: skill check canh lực như vít assem (`startSkill` + `torqueSpec` tua vít đang dùng, `SkillBar` trên lỗ): thiếu = chưa vào,
  quá = trượt ren (`slips` `dtb-i`), `STRIP_TRIES` lần thì tuôn ren (`stripped`, vít coi như xong, chưa trừ điểm khi giao).
- Cổng JST trên DTB (trong model) và trên PCB (`PcbJst`, vẽ cùng PCB từ đầu) có sẵn, không có bước gắn cổng; chỉ cắm dây (bước `dtb` cắm
  vào DTB, bước `jst` cắm vào PCB). Case có rãnh: cổng PCB đặt ngay trên đầu rãnh (`pcbJstAt`), dây nằm dọc rãnh (`wireGeometries via`),
  đầu chưa cắm nằm cuối rãnh.
- Bước `jst`: board dựng gần đứng (`jstStand`: xoay x −1,35 rad, mép sau trên mép sau case, mặt dưới quay ra trước); top mount thì case trên
  dựng theo. Đầu dây đã cắm đọc vị trí cổng theo group board thật (`boardGroup`, gán trong Board) → đi đúng khi dựng / nhấc / ngồi theo `seat`.
- Đã thử Chrome ngầm (đơn dev): mica 60 có bước DTB, rãnh khoét; Exodus60 DTB trên bệ dưới tạ mờ; bước jst board dựng thấy cổng JST + socket
  hotswap; Repent75 cổng PCB trên đầu rãnh phải. Chưa thử chơi tay trọn bước (bấm giữ vít, cắm dây, thả board vào case xem dây theo).

## Cắm dây JST 2 lần bấm, board dựng tới khi sang bước, jack né socket, dây dẹt (2026-11-02)

- Người dùng: "bước lắp dây jst phải click đầu dây jst rồi + với jack cắm jst trên pcb, cắm xong để vậy, khi nào người dùng bấm qua màn thì
  mới lật lại"; "vị trí đặt dây đã đúng chưa? đang bị cấn vị trí đặt sw: 1 là né ra, 2 là quay đầu cổng jst lại để né"; "dây đoạn gập ở rãnh
  bị lỗi à?" (ảnh: đoạn dây trong rãnh chớp sọc).
- Bước `jst`: bấm đầu dây = cầm lên (`useJstPick` trong Daughterboard.tsx, đầu dây nhấc + sáng viền, bấm lại = đặt xuống) → jack trên PCB
  sáng + mũi tên, bấm jack = `plugJst`. `plugJst` không tự sang bước nữa (`patchBuild({ jst: true })`); board (+ case trên top mount) dựng
  suốt bước `jst` (`jstStand` khi `step === 'jst'`), người chơi bấm "Bước tiếp theo" mới hạ xuống `caseIn`.
- Jack JST trên PCB: `jackSpot` (steps.ts) tính trong `buildContext` → `DtbSpot.jack` {x, z, ry}: từ chỗ muốn đặt (đầu rãnh dây, không rãnh
  thì lệch `JACK_OFFSET` so với DTB) thử các vòng xa dần 0,05u, mỗi chỗ 4 hướng xoay (ưu tiên miệng quay về DTB); thân jack + đầu cắm
  (`JACK_SAMPLES`) không chạm vùng cấm quanh mỗi phím (`KEY_KEEPOUT`: socket hotswap + pad + cụm chân switch, theo `rot` phím), lỗ stab
  (`stabHoles`), phải nằm trong PCB. `PcbJst` xoay theo `ry`, đầu dây đã cắm quay theo jack (`jackQ`).
- Dây: trước 4 sợi lệch cố định theo trục x → đoạn chạy dọc trục z (trong rãnh) 4 sợi chồng khít, chớp sọc. Nay `wireGeometries` dựng
  đường tâm (CatmullRom centripetal) rồi 4 sợi lệch theo phương ngang vuông góc hướng dây (dây dẹt như JST thật), đoạn dựng đứng giữ phương cũ.
- Đã thử Chrome ngầm (Repent75): `plugJst` giữ `stepIdx` ở `jst`, board vẫn dựng, "Bước tiếp theo" → `caseIn` hạ board; jack nằm khe giữa
  2 hàng socket, dây dẹt đi theo rãnh lên jack. Chưa chụp được ảnh lúc đang cầm đầu dây (jack sáng) — chưa thử bấm tay.

## Mở hộp: thùng có chiều sâu + case bên trong (2026-11-02)

- (người dùng: "khi mở hộp case lần đầu phía bên trong hộp không có case à => hơi thiếu chiều sâu") `CardBox` khi có `flaps` (thùng mở được)
  trước là khối đặc mặt trên tô tối → mở nắp chỉ thấy mặt phẳng. Giờ thân rỗng: 4 vách carton `WALL` 4mm + đáy, lòng đáy tối `INSIDE`.
  `ShippingBox` thêm `BoxContents`: tấm xốp lót đáy + case của đơn (đúng `inventory.case` id + màu, layout đơn) dựng bằng
  `buildKeyboardModel(..., tilt false, caseOnly true)` (đơn vị u → m), xoay dọc chiều sâu thùng, thu nhỏ nếu dài hơn lòng thùng (TKL / full
  dài hơn thùng 36cm). Đặt ngoài `Clickable` (không viền khi rê). Thùng ở kệ / đang cầm (không `flaps`) vẫn khối đặc như cũ.

## Bàn lube: rê switch không thấy viền khi nhiều switch (2026-11-02)

- (người dùng: "ở bước lube switch khi số lượng model switch quá nhiều, hover không thấy viền tương tác; đáng lẽ hover được tất cả switch
  có thể tương tác chứ không phải theo thứ tự mũi tên; check bug và tối ưu render khi 120 sw đổ lại")
  - Lỗi: `OpenedSwitches` là các InstancedMesh; three tính khối bao (`boundingSphere`) 1 lần lúc raycast đầu (mới mở vài con gần mũi tên),
    mở thêm không tính lại → rê con nằm ngoài khối bao cũ không ăn (chỉ con gần mũi tên rê được). `place()` gọi `computeBoundingSphere` /
    `computeBoundingBox` sau mỗi lần xếp.
  - Tối ưu: 7 lớp model CAD × 104–120 con raycast mỗi lần rê → tắt raycast (`raycast={noHit}`), thêm 1 InstancedMesh bắt chuột ẩn
    `HIT_GEO` (2 hộp: cao phủ housing dưới + stem nổi, thấp phủ housing trên nằm ngửa lùi 17mm; 1 hộp cao suốt chiều sâu thì góc xiên
    che con hàng sau → viền lệch 1 hàng), material `visible: false`.
  - Kiểm bằng playwright (bàn full 104 phím, mở hết): rê con giữa lưới / góc trên trái đều viền đúng con; rê trên lưới tốn ngang rê trên
    panel (khung hình là phần tốn, raycast không còn đáng kể; Chrome ngầm chỉ ~10 fps nên không đo được fps thật).

## Đóng gói: bàn phím vào thùng; jack JST né footprint, thẳng lưới (2026-11-02)

- Người dùng: "bước đóng gói đáng lẽ phải cho case vào thùng giấy chứ sao lại cho thùng giấy vào case? đáy giấy vẫn chưa mở mà cho vào".
  Trước: thùng carton bay úp chụp lên bàn phím (đáy ẩn lúc bay). Nay thùng đứng yên sau bàn phím (luôn có đáy), bàn phím (Assembly bọc
  trong `PackCarry`, PackBox.tsx) nhấc lên vòng cung cao hơn miệng thùng rồi hạ nằm lên đáy thùng (0 → 0,6 thời gian `PACK_MS`), sau đó
  gập nắp + súng băng keo như cũ. Chỗ thùng chung `boxZ(depth)`. Đã thử Chrome ngầm (đè `performance.now` đứng hình 0,5 / 1,3 / 2,2s):
  bàn phím nhấc lên → nằm trong thùng nắp đang gập → thùng đóng kín.
- Người dùng: "vị trí cổng jst trên pcb của case duality quá kỳ, đang bị chồng, và cổng bị lệch" (ảnh: jack trắng đè khung footprint SW41,
  xoay xiên, giữa PCB). Lỗi: (1) vùng cấm cũ chỉ socket + cụm chân, nhỏ hơn khung footprint in trên mạch; (2) chỗ muốn đặt lệch 1,2u tới
  trước DTB; (3) góc xoay = hướng tới DTB → góc lẻ; (4) 60% không chỗ nào vừa → rơi về chỗ muốn đặt (đè phím).
  `jackSpot` nay: vùng cấm cứng `KEY_HARD` (socket hotswap + pad, lỗ chân switch) + lỗ stab + mép PCB không được chạm; vùng mềm `KEY_SOFT`
  (khung footprint ±0,354u + nhãn SWxx) tính điểm, chọn chỗ chạm khung ít nhất rồi gần nhất (`JACK_OFFSET` ngay trước miệng JST DTB 0,4u);
  góc xoay chỉ bội số 90° (miệng quay gần về DTB nhất). Kết quả: TKL / Duality / Repent75 / RF Bruh jack ở khe hàng F – hàng số (cách tâm
  phím ≥ 0,55u); 60% / 65% ở góc giao 4 phím (≈ 0,45u, có thể chạm mép khung / nhãn — layout không khe hàng).
- Chưa tái hiện được "2 vị trí block của pcb không nhìn xuyên qua được" (ảnh Duality, 2 ô đen ~1u ở hàng dưới): dựng đơn dev Duality
  (tklf13 WKL, PCB hàn, stab clip-in, top mount) ở bước switch / stab có plate + stab đã gắn, bắn tia tại 2 khe WKL chỉ trúng PCB, không
  thấy ô đen. Cần người dùng cho biết bước / thao tác lúc thấy.
- (2026-11-02, "sao 2 block layout wkl của pcb duality vẫn bị màu đen, đáng lẽ phải màu xanh vì nhìn xuyên qua") Nguyên nhân: tấm foam
  Poron lót PCB (`Foam.tsx`, màu #25262b) chỉ khoét lỗ ở phím; plate riêng Duality là plate đa layout có lỗ ở 2 chỗ phím Win (WKL không có
  phím) → nhìn qua lỗ plate thấy foam liền = ô đen (đơn dev thử trước đó chưa lót foam nên không thấy). `foamGeometry` khoét thêm các khe
  trống của layout (`blockerGaps`, cùng chỗ khối chặn liền case, chừa viền `WEB`); plate dựng bằng code liền chỗ đó nên vẫn che kín.
  Đã thử Chrome ngầm (Duality WKL, plate + foam + switch): tia tại 2 khe xuyên qua foam, ảnh thấy PCB xanh.

## Tạ che DTB: bước tháo / lắp lại tạ; dây JST đi hết rãnh dưới tạ (2026-11-02)

- Người dùng (ảnh Duality, tạ đồng đè lên DTB, mũi tên rãnh dây chạy sang khe phải): "đối với các dtb có khay che buộc phải gỡ ra thì
  mới lắp được → phải có bước tháo nắp che ra để assem dtb vào rồi gắn lại; dây jst đi luồn dưới theo rãnh nên sẽ dài hơn cho phù hợp".
- `probe-case-usb.mjs`: dò thêm lưới bỏ node `weight` (`load(name, 'weight')`) → rãnh dây dưới tạ; `cover: true` khi tia xuống tại
  tâm / 4 góc DTB trúng tạ cao hơn mặt khi bỏ tạ. 7 model có tạ che: Duality, Catto HHKB, Eclipse 60, Exodus60 (3 nắp), Exodus80.
  Rãnh dài tới `GROOVE.max` 160mm (Duality hết rãnh ở khe phải x ≈ 118mm, 34 điểm); dài hơn = khe dọc vách chạy tới mép case, không phải
  rãnh dây → chỉ lấy `cut` 60mm đầu như trước.
- Bước mới (`StepId`): `coverOff` trước `dtb` (bấm từng ốc tạ `CaseDef.weightScrews` = `unscrewCover`, hết ốc bấm tạ = `liftCover`, tự
  sang bước; tạ không ốc thì chỉ bấm nhấc), `coverOn` sau `dtb` (bấm tạ = `placeCover`, nhấn giữ từng lỗ ốc = skill check `torqueSpec`
  như vít assem → `screwCover(i, result)`: thiếu lực = chưa vào, quá = trượt ren `slips` `cover-i`, `STRIP_TRIES` lần thì `stripped`;
  đủ ốc tự sang bước). `BuildState.cover` {out, off, on, tight}, `DtbSpot.cover`, `coverScrews(ctx)`, `stepProgress`, `NO_FLIP_STEPS`,
  `remapStepIdx` coi 2 bước thêm sau như đã làm (save cũ không lùi về), câu thoại Keeb-chan.
- Cảnh: `CoverWeight` (Case.tsx, thay mesh tạ + `FixedScrews` trong `CaseModel`): tạ lerp ra sau case `COVER_AWAY` 175mm khi đã nhấc,
  ốc hiện theo trạng thái, vòng xanh chỗ ốc (bấm tháo / nhấn giữ siết), mũi tên, `SkillBar`; tạ sáng xanh khi bấm được. `Assembly`: 2 bước
  tạ chỉ hiện case.
- Đã thử Chrome ngầm (đơn dev Duality): bước coverOff 0/7 → tháo 6 ốc + nhấc → `dtb` (tạ nằm sau case, DTB lộ ra) → coverOn đặt tạ + siết
  6 ốc → `topCase`; dây đi dưới tạ ló ra khe phải. Chưa bấm tay (giữ chuột thanh lực).
- (2026-11-02, tiếp, người dùng: "hiệu ứng mở vít đâu? bấm cái là ra?", "nhích khay đựng ốc", "cho dây jst lòi lên xíu để người dùng hiểu là
  đang lòi ra để cắm", "tất cả vít sau khi tháo ra phải nằm trên khay ốc, lộn xộn cũng được", "tháo tạ không được có nút bỏ qua",
  "phải cắm dây jst vào pcb thì mới lắp lại tạ", "cố tình bỏ qua lắp dtb thì đánh giá assem không dùng được"):
  - Ốc tạ có hoạt cảnh như vít assem (`CoverScrew` trong Case.tsx): rê vòng ốc hiện tua vít đang dùng (`CurrentDriver` export từ Screw.tsx),
    bấm = 1 nấc (tay `TOOLS.screw[].clicks` 3 nấc, điện 1), ốc quay + trồi lên theo ren `COVER_LIFT` 7mm chạy dần theo `SPIN_MS`, nấc
    cuối xong thì vọt ra (`OUT_MS`) rồi mới `unscrewCover`; siết lại: lúc giữ thanh lực ốc nằm trên miệng lỗ, tua vít quay.
  - Khay ốc (`ScrewTray`): thêm ốc tạ đã tháo chưa siết lại (`cover.out` − `cover.tight`); ốc thả lộn xộn trong lòng khay (chỗ / hướng
    ngẫu nhiên cố định theo thứ tự, tì thành lòng chảo `bowlY`, nhiều ốc thì chồng cao dần) thay cho xếp hàng song song.
  - Tạ nhấc ra nằm bên phải case (bề ngang tạ + `COVER_GAP`; để sau case thì đè khay ốc + bị board dựng che); bước `coverOn` chưa đặt thì
    tạ hiện mờ xanh đúng chỗ trong case (bấm để đặt).
  - Đầu dây JST chưa cắm dựng đứng ló lên `LOOSE_RISE` 0,5u khỏi cuối rãnh / sàn (`StandPlug`), dây chạy dọc rãnh rồi dựng lên.
  - Thứ tự bước: `coverOff` → `dtb` → (`topCase` / `topScrew`) → `jst` → `coverOn` → `caseIn` (dây cắm vào PCB rồi mới đè tạ lên rãnh);
    bước `coverOn` board vẫn dựng (`jstStand`) cho thấy lòng case. `coverOff` / `coverOn` không bỏ qua được kể cả đơn dev (`isOptionalStep`).
  - Bỏ qua lắp DTB / cắm JST (đơn dev): `noPower` (scoring.ts) → bước test phím nào cũng không ăn (toast không lên nguồn), giao thì
    khách báo không lên nguồn (−40 điểm, sao tối đa `DEFECT_STARS`, đánh giá ghi lỗi). Ốc DTB / ốc tạ tuôn ren tính vào lỗ ren case (đền case).

## Ốc stab có sẵn trên khay từ đầu (2026-11-02)

- (người dùng: "ở bước lắp stab thì phải có vít từ đầu chứ, trên bàn / khay không có vít stab thì làm sao lắp => 1 là render đủ vít từ đầu,
  2 là đến bước đó mới có vít") Chọn cách 1, giống ốc tray mount / M2 top mount: `ScrewTray` thêm ốc stab screw-in chưa bắt (`stabScrew` trong
  `ctx.steps`, `ctx.screws.stabScrew` chưa có trong `b.screws`) nằm trong khay (không có khay thì vương trên bàn) suốt từ đầu build, bắt con nào
  bớt con đó (thay stab tuôn ren `replaceStab` xoá lượt vặn → ốc về lại khay). Thứ tự trong khay gom vào `kindOf` (case tháo → tray → top → stab →
  ốc tạ). Playwright: đơn 60% stab Cherry screw-in, bước `stab` có 10 ốc stab trên khay. Khay ở góc sau trái thảm, góc nhìn mặc định bị khung
  HUD trái che một phần.

## Bàn lube: thêm bước đóng switch lại (2026-11-02)

- (người dùng: "lube switch xong thì phải có bước đóng sw lại chứ? thiếu rồi") Bàn lube thêm phần 4 "Đóng switch": `closeSwitch()` (buildSlice,
  cần đồ mở, mỗi lần = bậc thợ + phép mở như `openSwitch`), đếm `build.swClosed` (con 0..swClosed-1 theo lưới; tên `swClosed` vì `closed`
  đã là cờ đóng case). Bấm lưới switch = đóng 1 mẻ khi đã lube hết con đã mở (hoặc hết mỡ / thiếu cọ), mũi tên chỉ con đóng tiếp; lần đầu
  nhắc nếu còn con chưa lube / lò xo chưa lube. Bắt đầu đóng thì khoá mở thêm / lube / lube lò xo. Con đã đóng vẽ thành switch nguyên
  (stem + housing trên về chỗ lắp, InstancedMesh riêng). `stepProgress('switchLube')` = `lubeDone` hoặc đóng hết; panel thêm mục 4 + nút
  cuối khoá "Đóng hết switch lại (x/y)" khi đã mở mà chưa đóng hết (chưa mở con nào vẫn "Bỏ qua lube"). Save cũ không có `swClosed` = 0.
  Playwright: 60% 61 con, đóng hết → tiến độ 1/1, ảnh lưới con đã đóng là switch nguyên.

## 2026-11-02: cảnh báo React "key prop spread" ở `<Screw>`

- Lúc tải bàn build, console báo props spread có `key` vào `<Screw>`: `ScrewSet` spread cả `sc` (ScrewPoint), vít stab có field `key` (id phím
  của stab, `stabScrews` trong steps.ts). Sửa: truyền thẳng `id` / `x` thay vì `{...sc}` (y / z đã ghi riêng, `dir` đi nhánh khác).

## 2026-11-02: hoàn tác ốc tạ, khúc cua dây JST, đầu cắm JST cắm lút

- Hoàn tác lúc tháo ốc tạ bị lỗi: tiến độ tháo (`turns` / `outAt`, cục bộ trong `CoverWeight`) không nằm trong lịch sử → hoàn tác trả ốc
  về tạ (`cover.out[i]` false) nhưng cảnh vẫn coi ốc đã bay ra, bấm không ăn. Sửa: so `cover.out` với lần render trước, ốc quay về thì
  xoá tiến độ cục bộ; `history` giảm (hoàn tác lúc đang vặn dở / đang bay) thì xoá cả ốc dở; hẹn giờ tháo lưu `timers` để huỷ.
  Kiểm bằng Chrome ngầm: tháo 2 ốc → undo → ốc 2 hiện lại (5 vòng) → tháo lại được.
- Duality: rãnh dò (`caseUsb.json` groove) bắt đầu từ tâm DTB, mấy điểm đầu nằm dưới mạch / đầu cắm → dây quặt ngược vào gầm mạch, khúc
  cua bị che. `JstCable` bỏ các điểm đầu rãnh còn trong bề ngang mạch (`DTB_MM.w / 2 + 1mm`) và chưa qua đuôi đầu cắm.
- Đầu cắm JST cắm lút: `PLUG.in` 2 → 3,9mm (thân dài 4,2, chừa 0,3mm mép) cho cả đầu DTB lẫn jack PCB, mọi case; trước cắm hờ, thân
  đầu cắm lòi ra ngoài jack che chỗ dây ra.
- Cùng ngày: bước lắp lại tạ mất mũi tên: mũi tên ốc đòi `turns[next]` chưa có, mà `turns` còn giữ từ lúc tháo → chỉ xét khi đang tháo;
  mũi tên nhấc / đặt tạ đặt trên giữa tấm tạ (`weightTop` theo bbox) thay vì tâm model case.
- Tạ nhấc ra đặt TRƯỚC case (người dùng: bên phải khó thấy): dời theo z = mép trước vỏ (`front`, bbox node bottom / case) trừ mép sau tạ
  cộng `COVER_GAP` 8mm; nằm ngoài thì vẽ đặc (không mờ). `CameraRig` (Bench.tsx): tạ đang ở ngoài (`cover.off && !on`) thì lùi camera
  ×1.5 + dời tâm nhìn ra trước 0,6 × chiều sâu (`WEIGHT_OUT_CAM`), lắp lại xong về góc mặc định.
- Bước `jst` cắm xong: bấm tạ nằm trước case = `nextStep` + `placeCover` (khỏi bấm "Bước tiếp theo"); hint bước jst ghi thêm.
  Kiểm bằng Chrome ngầm: bấm tạ ở bước jst → sang coverOn, `cover.on`.

## 2026-11-03

### Tối ưu hiệu năng phòng (đo bằng HUD hiệu năng, xem ui.md cùng ngày)

- Yêu cầu: phòng lag (máy i5-10400 + Intel UHD 630), áp dụng các mục đáng làm trong
  R3F "Scaling performance" + đề xuất tối ưu. Đo trước: mỗi khung 6 lần `gl.render`, ~1,27M tam giác.
- `BenchShadows` (Bench.tsx): ContactShadows của drei vẽ lại cả cảnh + 4 lượt blur mỗi khung (~640k tam giác).
  Chỉ `frames={Infinity}` khi ngồi bàn build; đi lại / máy tính `frames={1}`, đổi `key` để vẽ lại khi tải xong cảnh,
  `benchBox`, có / hết build, số thùng `packed`.
- Vít (`scripts/convert-screws.mjs`): occt chia lưới `linearDeflection 0.02mm`, `angularDeflection 0.4` → ~5k tam giác / con
  (trước 18–26k, mỗi đơn có hàng chục con); zoom sát vẫn thấy ren. GLB 690KB → 180KB.
- `dpr={[1, MAX_DPR]}` (trần 1.5) + `AdaptiveDpr` (drei `PerformanceMonitor`, `factor` 1, `flipflops` 3) hạ dần tới 0.75 khi FPS
  tụt; tắt lúc ngồi máy tính (frameloop demand → FPS thấp giả).
- Sau: đi lại còn 1 lần render / khung, 189 draw call, ~360k tam giác.
- Không làm (lý do): shadow map `autoUpdate = false` (khung bóng ±15u ≈ 57×38cm quanh bàn, đo bật / tắt không đổi);
  movement regression (`performance.regress`) hạ dpr khi di chuyển: đi lại di chuyển liên tục → mờ suốt;
  `frameloop="demand"` khi đi lại: chỉ đỡ lúc đứng yên, phải soát mọi hoạt cảnh `useFrame` (để sau);
  instancing keycap trên kệ: draw call không phải chỗ nghẽn; kiến trúc Manager / LOD / startTransition: không cần.

### Duality: case trên hiện sai ở bước DTB + thứ tự bước top mount

- Người dùng: tới bước tháo tạ / lắp DTB lại thấy mảnh top dù đã tháo 2 mảnh; Duality top mount phải là "dán feet → úp case trên →
  bắt vít plate vào case trên → lắp DTB → lắp lại tạ (jst ở case này lòi lên) → cắm dây JST vào PCB → lắp mảnh top và bot vào nhau
  (không phải thả board vào case) → vặn vít đóng case → keycap → test → đóng gói".
- Lỗi: `Case.tsx` `showTop` có `stepIdx >= at('caseClose')`; top mount không có `caseClose` → −1 → luôn vẽ nắp đè lên đáy ở mọi bước
  có case (feet, tháo tạ, DTB). Sửa: chỉ xét khi `at('caseClose') >= 0`; thêm `Case bottomOnly` (Assembly: bước để riêng board mà case
  trên đã bắt vào plate thì chỉ vẽ case dưới).
- `CaseDef.jstUp` (Duality): `buildContext` xếp feet → (topCase → topScrew) → coverOff → dtb → coverOn → jst → caseIn; giữ coverOff ngay
  trước dtb (tạ đè thì không lắp DTB được). `coverBeforeJst(steps)`: coverOn trước jst thì board để riêng lúc lắp tạ (Assembly caseOnly,
  Board / Case không dựng `jstStand`), tạ vẽ đặc lúc cắm dây; đầu dây chờ cắm lòi lên ở cuối khe chữ L trên tạ, bấm cầm được.
- Tên / hướng dẫn bước theo danh sách bước: `stepTitle(step, order, steps)` (top mount: `caseIn` = "Ghép case trên vào case dưới"),
  `stepHint(step, steps)` (caseIn top mount, coverOn / jst khi tạ lắp trước); thoại Keeb-chan `TOP_LINES` / `COVER_FIRST_LINES`
  (`benchTopics(step, hasOrder, { mica, top, coverFirst })`).
- Save rev 9 `reorderJstUp`: build Duality làm dở tìm lại bước theo tên trong thứ tự mới; úp / bắt vít case trên giờ nằm trước mà chưa
  xong thì quay về bước đó. Đã chạy thử bản lưu đang ở bước DTB (stepIdx 10 → 12), đi hết lắp tạ → cắm JST → ghép case.

### Bàn build: thêm lại kéo trượt khung nhìn (2026-11-03)

- Người dùng: "thêm lại option kéo xung quanh góc nhìn? nên để phím tắt". Bỏ ngày 29/10 để tâm xoay cố định; giờ thêm lại, Space vẫn về góc mặc định.
- `Bench.tsx` `Controls`: `enablePan`, chuột phải = PAN (trước trùng chuột trái xoay), Shift + chuột trái = PAN (có sẵn OrbitControls),
  2 ngón = `DOLLY_PAN`; `screenSpacePanning={false}` trượt theo mặt bàn (không chui xuống bàn, tâm vẫn kẹp `ROOM_BOUNDS` ở CameraRig).
  `PanSpeed`: `panSpeed = 2.5 × max(1, 22 / khoảng cách)` như bản cũ (zoom sát không kéo chậm). Bàn trống: chuột phải nhả không kéo vẫn
  cầm thùng (`useBoxKeys` lọc kéo > 6px). Mẹo màn tải (`loadTips.ts`) + OVERVIEW ghi phím. Kiểm: kéo phải / Shift + trái dời camera + tâm
  cùng nhau, y không đổi; Space đặt lại tâm.

### Lắp lại tạ: bấm tạ nằm ngoài, không bấm bóng mờ (2026-11-03)

- Người dùng: lắp lại tạ thì phải bấm tạ đang nằm ngoài mới lắp vào; tới bước này camera lùi ra, mũi tên chỉ vào tạ, bấm mới lắp.
- `CoverWeight` (Case.tsx): bỏ bóng mờ `ghost` trong case ở bước `coverOn`; tạ đặc nằm chỗ đã nhấc ra (`away` = đã nhấc, chưa đặt), camera
  lùi theo `WEIGHT_OUT_CAM` như lúc tháo, `HintArrow` trên tạ (đi cùng tạ), rê sáng xanh; bấm = `placeCover` → tạ trượt vào case, camera về
  gần, sang siết ốc. Câu hướng dẫn: "click tấm tạ nằm trước case để lắp vào" (steps.ts, benchLines).
- Cùng ngày: cắm dây vào DTB (thao tác cuối bước `dtb`, tự sang `coverOn`) lúc đang zoom sát thì camera không lùi ra. `CameraRig` chỉ đặt
  lại khi `weightOut` đổi, mà bước DTB → lắp lại tạ tạ vẫn nằm ngoài → thêm `coverOn` (đang ở bước lắp lại tạ) vào deps. Kiểm: zoom 4,9 →
  cắm dây → 24,5 (góc lùi như lúc tháo tạ).

### DTB: lỗ ren + vít bắt sẵn trong case (2026-11-03)

- Người dùng: không thấy lỗ bắt ốc DTB trên case, không có ren sao bắt ốc; có ren thì phải có vít bắt ốc DTB trên case sẵn từ đầu.
- `Daughterboard.tsx`: bạc ren đồng M2 (`Insert`, vòng đồng + lỗ đen, chìm ngang sàn / đầu trụ case CAD) ở 2 lỗ `DTB_MM.holes`, vẽ từ đầu (mọi bước
  có case dưới) tới khi DTB đặt đè lên; 2 vít M2 bắt sẵn trong lỗ (đầu tựa sàn). Bước `dtb`: bấm từng vít tháo ra (`unscrewDtb(i)` →
  `BuildState.dtb.out`; vít trồi lên rồi ẩn `FlyScrew`, vào khay ốc `ScrewTray` loại `dtb`) → tháo đủ mới hiện khối DTB mờ (`placeDtb` chặn + toast nếu
  chưa tháo) → siết lại canh lực (bớt 1 vít trong khay, vẽ trên lỗ DTB như cũ) → cắm dây. `stepProgress` dtb = tháo + đặt + siết + cắm
  (2 + 2 × số lỗ); bản lưu đã `placed` coi như đã tháo hết (không cần rev). Hướng dẫn bước + thoại Keeb-chan sửa theo.
- Kiểm (case alu40 dựng bằng code, thử trong bộ nhớ rồi trả lại build của người dùng): bấm tháo 2 vít → lộ bạc ren → đặt DTB → siết → 5/6.
- Cùng ngày: người dùng tưởng 2 vít tháo ra (đứng thẳng trên sàn trước DTB) là trụ ốc bị dời ra sau, "nếu ko cần thì bỏ đi" → bỏ vít nằm
  cạnh, vít tháo bay vào khay ốc như ốc case / ốc tạ (`ScrewTray` đếm `dtbN` = đã tháo − đã siết, đã đặt DTB coi như tháo hết).

### Gasket case dựng bằng code: tab gasket (2026-11-03)

- Người dùng: dán gasket nhưng plate không có tai nhô ra để gắn, case cũng không có chỗ khoét rãnh để gắn gasket.
- Trước: dải gasket nằm ở khe giữa mép plate và vách (không chạm plate), đỡ bằng gờ liền quanh lòng case dưới + gờ đè case trên.
- Giờ (case 2 mảnh dựng bằng code, `gasketTabbed`: không model CAD, không mica): `plateGeometry` thêm tai `gasketTabs` rộng bằng dải (GASKET.w)
  ở mỗi điểm gasket, từ mép plate ra tới gần đáy hốc vách; `ctx.gaskets` z = giữa hốc (`GASKET_NOTCH` d = bề ngang dải + 0,04, gap 0,03);
  case trên phay hốc (`gasketNotches` → `caseShellGeometry` notches, mở từ mép ghép lên trần `notchTop = GASKET.t`); case dưới vấu
  `GasketPads` trong hốc từ mép ghép tới mặt dưới dải dưới; bỏ 2 `Ledge` gasket. Tai + 2 dải kẹp giữa vấu và trần hốc.
- Kiểm (tab thử chặn localStorage.setItem, đơn dev gasket60): plate có 8 tai, dải dán trên tai; board trong case thấy chồng vấu / dải /
  tai / dải ở mép; case dưới có vấu ở vách. Case CAD (Blossom...) giữ tai CAD riêng.
- Cùng ngày (người dùng: "thấy bị hở trên dưới ko? do phần tai của plate bị dài quá trong khi gasket dán có xíu", nhớ note CLAUDE.md):
  tai dài 0,15 (khe board – vách) + 0,25 → nhìn từ trên thấy tai trần màu plate ở khe. Sửa: `GASKET_NOTCH.tab` = GASKET.d + 0,04 (~4,8mm),
  hốc vách sâu `tab − CASE_MARGIN` (0,1u); dải gasket phủ hết tai (`ctx.gaskets[].d` = tab − 0,02, tâm giữa tai; `Gasket` vẽ theo `d`);
  vấu `GasketPads` kéo từ sát mép PCB qua khe tới đáy hốc (đỡ hết dải dưới). Kiểm (alu40 dev, đủ keycap, nhìn từ trên): mép trước / sau kín.

### Chọn đầu vít ở bước DTB / tạ (2026-11-03)

- Người dùng: bước tháo / lắp vít DTB không có mục chọn đầu vít. `BitPicker` chỉ hiện cho `SCREW_STEPS`.
- `stepBit(step)` (steps.ts): `SCREW_BITS` + `dtb` / `coverOff` / `coverOn` = lục giác (vít M2 đầu trụ, ốc nón tạ). BenchHud hiện `BitPicker`
  (nhận `need`), DeskTools (Room.tsx) bày tua vít theo `stepBit`. Sai đầu: `unscrewDtb` / tháo ốc tạ (`CoverWeight.turnOut`, kiểm trước
  hoạt cảnh) gọi `slipBit(id, what)` (trượt ren, 3 lần tuôn ren rồi mới tháo được); `screwDtb` / `screwCover` sai đầu đi chung nhánh trượt
  ren như quá tay. Kiểm: đầu chữ thập → "Trượt ren vít DTB (sai đầu vít) 1/3", vít không ra; lục giác → tháo được.

### Bóp khe board – vách case dựng bằng code (2026-11-03)

- Người dùng: "sao case vẫn hở trên dưới? cần bóp case vào ko hay là do plate đang ngắn đi?". Plate không ngắn (= PCB lùi 0,01u, PCB = khung
  layout); hở là khe `CASE_MARGIN` 0,15u (~2,9mm mỗi bên) + keycap lùi ~0,5mm → ~3,5mm. Case thật ~0,5–1mm.
- `CASE_MARGIN` 0,15 → 0,06 (~1,1mm). Vòng OG trước cố định dày 0,12 cách mép 0,1 → lún vào vách; giờ dày `CASE_MARGIN − 0,005`, mặt ngoài
  sát vách (`ringFrame`, cả O-ring dùng chung `off = CASE_MARGIN − t/2`). Còn lại tự theo hằng: tai top mount (lỗ vẫn giữa phần trong hốc),
  tab gasket (hốc sâu 0,19), gờ O-ring (~1mm), DTB / lỗ USB, vít ghép, mica, khối chặn. Case CAD không đổi.
- Chưa xem trong trình duyệt: phiên khác đang sửa file song song làm Vite reload + thao tác trên cùng cửa sổ Chrome → dừng thử để không đụng
  bản lưu người dùng. Ảnh nướng sẵn Shopii (`public/thumbs`) của case code nhỏ đi 0,18u, chưa chạy lại `bun run bake:thumbs` (khác biệt khó thấy).
- Cùng ngày: người dùng "case vẫn còn hở cho bóp vào xíu nữa" → `CASE_MARGIN` 0,06 → 0,03 (~0,6mm). `LEDGE_GAP` 0,03 → 0,01 (gờ đỡ vòng
  O-ring / OG rộng = khe + `LEDGE_IN` − `LEDGE_GAP`, để 0,03 thì gờ chui hết vào vách). Kiểm (tab chặn ghi, không có phiên khác đang sửa file):
  alu40 gasket đủ keycap nhìn từ trên + sát mép trước khít; tofu60redux OG plate áp sát vách, vòng không lòi / lún.

### Vít mặt đáy không vặn xuyên được khi lật lại (2026-11-03)

- Người dùng: đang assem case 2 mảnh, cố tình bấm Q lật lại nhưng vẫn vặn được ốc từ mặt sau → sai.
- `ScrewSet` chỉ xét đúng bước + `active`, không xét mặt. Thêm `useAssemblyFlipped()` (caseSplit.ts, cùng công thức Assembly: NO_FLIP / vừa tách
  2 mảnh → ngửa; bước tự lật thì Q đảo) dùng chung cho Assembly; `ScrewSet`: `facing = flip ? flipped : !flipped`, không facing thì không
  bấm / không mũi tên. Cùng loại lỗi: chân hàn `SolderPad` (mặt dưới PCB) và hốc feet `RubberFeet` chỉ tương tác khi đang lật úp.
- Kiểm (gasket60 vít đáy, bước caseScrew, tab chặn ghi): tự lật thấy đáy → rê lên vít ra bàn tay; Q lật lên mặt trên → rê đúng chỗ đó 0 vít.
- Cùng ngày: người dùng "cạnh trên và dưới vẫn hở, độ hở phải bằng cạnh trái / phải". Đo trong cảnh (raycast từ tâm ra 4 phía): vách cách mép
  board đúng 0,03u cả 4 phía, keycap lùi 0,04u đều; chân keycap ngang mép vách (y 0,36). Ảnh gần chiếu thẳng (fov 3°) cho thấy khe bằng
  nhau; thứ làm mép trước / sau trông hở là dải gasket đen trên đoạn tai nằm ở khe (mép trái / phải không có gasket). Sửa: dải chỉ trên
  phần tai trong hốc (`gaskets[].d` = tab − khe − 0,02 ≈ 4mm, tâm sau mặt vách), đoạn tai ở khe để trần màu plate. Kiểm lại ảnh chiếu thẳng:
  hết vệt đen, khe trái = khe dưới.

### Thùng đóng gói cao theo bàn phím (2026-11-03)

- Người dùng: đóng gói Duality + keycap SA bị lòi ra khỏi thùng (cao hơn).
- `PackBox` cao cố định `H` 2,4u. Giờ `MIN_H` 2,4 + `packHeight(top)` = max(2,4, đỉnh bàn phím + FLOOR_Y − Y.table + 0,25): `PackCarry` đo
  `Box3.setFromObject` của bàn phím lúc nằm trên bàn (chờ đóng gói mỗi 20 khung vì model / keycap tải muộn; bấm cất dở ở bước khác mà chưa
  đo thì đo khung đầu) → `usePack.top`, rời đóng gói thì reset. Vòng cung bay, nắp, băng keo, súng theo `H` mới.
- Kiểm (Duality + SA, tab chặn ghi): thùng cao 2,79u (miệng 1,844), lúc bàn phím hạ xong đỉnh 1,676 → dư 0,17u dưới miệng.

### Lò xo thả lại vào housing đứng dọc (bàn lube switch)

- Yêu cầu: lò xo lúc đóng switch lại nằm ngang, phải nằm dọc.
- Nguyên nhân: lò xo trong housing (`springRef`) + lò xo bay từ hộp vào housing (`FlyingSprings`) dùng chung `SPRING_GEO` của hộp (xoay nằm ngang).
- LubeStation.tsx: `SPRING_UP_GEO` (đứng dọc, gốc = đáy lò xo trên sàn hốc `SPRING_IN_Y`) cho lò xo trong housing; `FlyingSprings` xoay dần
  ngang → dọc, đích là tâm lò xo đứng (`SPRING_IN_Y + SPRING_H / 2`); lò xo bay từ đồ mở vào hộp lúc mở switch thì ngược lại (dọc → nằm).
- Sửa (cùng ngày): lò xo đứng 18mm xuyên qua stem đang nổi → lò xo trong housing cao `SPRING_IN_H` = từ sàn hốc tới đáy thân stem
  (`body.bottom + RAISE - (SPRING_IN_Y - SEAT_Y)` ≈ 10,7mm, 6 vòng); `FlyingSprings` co dần theo trục lò xo (`scale.x`) cho khớp lúc tới nơi.

### Gá O-ring: chỉ bấm quanh mép, bấm mặt PCB không gá

- Yêu cầu: bước gá O-ring bấm trên mặt PCB vẫn gá được; phải bấm quanh vùng gá mới được.
- Board.tsx: bỏ `ring` khỏi `boardClick` (PCB / foam / plate không gá vòng nữa); vòng chờ gá có handler riêng `onRing` + `useHover` riêng.
- BoardDetails.tsx `SiliconeRing`: lúc chờ gá (`ghost`) thêm dải bắt chuột vô hình rộng `RING_HIT` 0,6u quanh 4 cạnh (vòng thật mảnh khó bấm trúng).
- Tương tự bước thả board vào case (`caseIn`): bỏ khỏi `boardClick`, chỉ bấm case dưới (`onClick('caseIn', dropInCase)` trong Case.tsx) mới thả;
  board đang nhấc chờ thả thì `onBoard` chặn tia bấm (`stopPropagation`) để bấm board không xuyên xuống case bên dưới.

## 2026-11-04: kẹt tua vít trên ốc khi nhấp nhả (vặn chưa xong)

- Yêu cầu: bấm nhả nhanh ở bước vặn vít (kim dừng sớm, vít vào 1 phần) thì tua vít đứng lại trên ốc, mất vòng xanh.
- Nguyên nhân: hover nằm trên khung nét đứt / vòng xanh (con của group vít). Vặn 1 phần thì khung nét đứt bị gỡ (ốc hiện ra),
  vòng xanh vốn ẩn khi hover; R3F v8 `removeInteractivity` xoá mục hover của vật bị gỡ mà **không gọi `onPointerOut`**
  → `hover` kẹt `true` (tua vít hiện mãi, vòng xanh + mũi tên ẩn).
- Sửa (`scene/parts/Screw.tsx`): khối trụ vô hình `visible={false}` cố định từ miệng lỗ tới trên đầu ốc làm vùng bấm;
  khung nét đứt (`line.raycast = noHit`, ngưỡng line mặc định 1u cũng quá rộng), vòng xanh, vòng đỏ không nhận chuột.
  `HintArrow` (StationKit) cũng `raycast={noHit}`; `noHit` dùng chung ở `common/hoverOutline.ts`.
- Quy tắc: vật ẩn / hiện theo hover hoặc theo tiến độ không được nhận chuột; dùng vùng bấm cố định.

## 2026-11-04 — Ghép case trên vào case dưới xong tự sang bước vặn ốc

- Yêu cầu: bước "Ghép case trên vào case dưới" (case 2 mảnh) xong thì tự sang bước vặn ốc, không phải bấm nút bước tiếp.
- Đã làm: `dropInCase` (buildSlice.ts) bỏ điều kiện `pieces !== 2`, case nào thả / ghép xong cũng `stepIdx + 1` (top mount → `caseScrew`, case 2 mảnh thường → `caseClose`).
  `closeNext` trong Case.tsx / gợi ý BenchHud (caseIn đã thả, chờ đậy) giữ lại cho bản lưu cũ đang đứng ở trạng thái đó.

## 2026-11-04 — Vít DTB lòi qua đáy case

- Yêu cầu: nhìn đáy case (bước tháo vít mở case) thấy 2 chấm bạc xuyên ra; soát case 40 / 60 / TKL / mica ghép.
- Nguyên nhân: 2 vít M2 bắt sẵn trong lỗ ren DTB dùng `socket-cap-m2x6.glb` dài 8mm (đầu 2 + thân 6, gốc = đỉnh đầu), đầu nhô 2mm
  → mũi xuống 6mm dưới mặt sàn; sàn mọi case dựng bằng code (`Y.floorTop − Y.floorBot` = 0,3u ≈ 5,7mm) và mica (2 tấm đáy × 0,15u) đều 5,7mm → lòi 0,3mm.
  Mọi case dựng bằng code đều dính (40 / 60 / TKL / full, nhôm / nhựa / gỗ / mica); case CAD có trụ / sàn dày thì không.
- Đã làm: `Daughterboard.tsx` `shortScrew` clone model vít, ép đỉnh dưới `SCREW_LEN` 5,5mm lên mức đó (thân còn 3,5mm, đầu giữ nguyên);
  dùng cho vít trong lỗ ren, vít bay ra và vít đã siết qua DTB (mũi −1,9mm).

## 2026-11-04 — Phép mod stab: lube housing / wire chỉ phết con đầu

- Yêu cầu: có phép / chứng chỉ thì lube chỉ cần phết 1 con đầu (như lube switch), không đi phết từng stab; bôi mỡ wire cũng vậy.
- Đã làm: StabModStation.tsx tách `FIRST = ['housing', 'wire']`: `animProgress` con đầu mẻ chạy theo hoạt cảnh, các con khác trong mẻ = 0
  rồi xong cùng lúc khi hết; `SEQ` còn clip / bandaid (kìm, kéo vẫn đi lần lượt). `modStab` (buildSlice) lube housing / wire tính thời gian như 1 con.

## 2026-11-04: hoạt cảnh đóng switch sau khi lube

- Yêu cầu: bước đóng switch lại (`closeSwitch`) không có hoạt cảnh, switch nhảy thẳng sang dáng nguyên.
- Trước đó `closeSwitch` đã đặt `lubeAnim.kind = 'close'` (0,7s) nhưng chỉ dùng để phát tiếng click.
- Thêm `ClosingSwitches` (`scene/stations/LubeStation.tsx`): với mẻ đang đóng (`moving` = các con từ `swClosed`, tính trong
  `LubeStation`), stem (+ thân, giữ màu đã lube) hạ từ chỗ nổi `RAISE` xuống housing dưới (0 → 0,4, lệch nhịp từng con), housing trên
  nhấc lên cao hơn đỉnh stem (0,35 → 0,6), dời 17mm tới trên switch (0,5 → 0,8) rồi úp xuống (0,8 → 1).
  `OpenedSwitches` nhận `moving` để ẩn stem / housing trên / mỡ của các con đó khỏi lớp tĩnh. Hàm chung `placeSwitches`.
- Lò xo co theo stem: mẻ đang đóng ẩn khỏi lớp lò xo tĩnh (`still`), `ClosingSwitches` vẽ lò xo đứng trên sàn hốc, chiều cao = tới đáy
  thân stem đang hạ (`placeSwitches` thêm `sy`), co tối đa còn 30% (ép hết cỡ vòng dây chồng thành đĩa).

## 2026-11-04: tua vít trên bàn ẩn khi đang cầm vặn

- Yêu cầu: đang vặn vít thì tua vít nằm trên bàn phải biến mất, xong mới hiện lại (chỉ có 1 cây).
- `common/screwSpin.ts`: `useDriverInHand` (đếm) + `useHoldDriver(on)`; `CurrentDriver` (Screw.tsx) thêm prop `desk`, không phải `desk`
  thì đếm là đang cầm (vít thường, ốc tạ / badge trong Case.tsx). `DeskTools` (Room.tsx) `visible={!inHand}` (vẫn mount, giữ chỗ đặt).
- Tua vít hiện trên vít cả lúc rê chuột (cầm sẵn) nên cây trên bàn cũng ẩn lúc đó; rời chuột 200ms thì về bàn.

## 2026-11-04 — Dây JST chưa cắm đâm xuyên standoff tray

- Yêu cầu: dây JST nằm trên sàn (chờ cắm) xuyên qua trụ standoff tray mount.
- Nguyên nhân: case không có rãnh dây đặt đầu dây chưa cắm cố định lệch DTB `LOOSE` (0,63u sang phải, 1,6u ra trước), không biết vị trí standoff.
- Đã làm: `JstCable` (Daughterboard.tsx) với mount tray tính standoff theo `ctx.screws.trayScrew` (+ `seat.dx / dz`, về hệ DTB), thử lần lượt `LOOSE_TRY`
  (chỗ cũ trước, rồi các dz 1,6 / 1,3 / 1,9 / 1,0 / 2,2 × dx ±0,63 / ±0,3 / ±1 / 0) tới khi đoạn dây từ đuôi đầu cắm DTB tới đầu chưa cắm cách mọi trụ
  > `POST_CLEAR` 0,26u (`segDist` trên mặt sàn). Case CAD có rãnh (`via`) không đổi. Chưa né: dây đã cắm lên PCB (đi dưới PCB, có thể sượt trụ).

## 2026-11-04: dây JST nằm sát sàn case (không đè socket / chân switch)

- Yêu cầu: đậy case xong dây JST không được đè lên socket hotswap / chân switch (trước: dây chùng thẳng từ DTB tới jack ngang tầm
  socket, xuyên qua socket các hàng giữa; rõ nhất layout 40% jack cách DTB ~2,7u).
- Đã thử A* tìm đường qua khe giữa phím → dây ngoằn ngoèo như rắn, người dùng không muốn: **bỏ**. Cách đúng: dây nằm sát sàn.
- Đo: chân switch (GLB `pins`) thò tới −7,76mm dưới mặt plate ≈ −0,41u, đáy socket `pcbBot − 0,09` = −0,434u, sàn case code −0,6u
  → hở ~3mm, dây Ø ~0,84mm.
- `wireGeometries(…, floor)` (Daughterboard.tsx): đã cắm, không rãnh → ra khỏi đầu cắm DTB hạ xuống sàn (`at.floor − at.y + WIRE_R`),
  chạy phẳng dọc sàn (điểm giữa mỗi 0,4u), tới ngay dưới đầu dây ló khỏi jack (lead 0,12u thay 0,3u) thì dựng thẳng lên cắm.
  Case CAD có rãnh giữ nguyên đi theo rãnh.
- Chưa xử lý: case tray mount, đường sàn thẳng có thể đi qua trụ standoff (mảnh, r ≈ 0,1u).

## 2026-11-05: giảm khựng khi đi ra hành lang rồi quay lại phòng

- Người dùng: "đi ra hành lang lấy đồ rồi quay lưng lại thì bị khựng vài s". Đo (Chrome, Intel UHD 630, như máy người dùng): nhìn về phòng từ
  hành lang 3,73 triệu tam giác / 1.666 draw call, lần đầu quay +32 shader +42 texture; 8 bàn phím chưng trên kệ tường trước ~3,2 triệu
  tam giác / ~1.400 mesh (keycap CAD ~2.500 tam giác / phím), 15 vật liệu `transmission` (case PC / mica trên kệ + kính khung chứng chỉ:
  three vẽ lại cả cảnh vào render target mỗi khung có vật transmission trong tầm nhìn).
- `scene/common/warmup.ts`: `cheapGlass` (transmission → trong suốt thường, cho đồ trang trí), `warmUp` (initTexture + `compileAsync`
  trước), `mergeByMaterial` (gộp mesh tĩnh theo vật liệu). `SceneReady` (Bench.tsx) warm cả phòng trước khi báo `ready` (màn chờ còn che).
- `DisplayKeyboard` (ShelfDisplay.tsx): `THREE.LOD` — gần (< 1,3 m) bản đầy đủ như cũ, xa: `buildKeyboardModel(spec, false, false, true)`
  (`lite`: keycap dựng bằng code `capGeometry` ~136 tam giác) gộp theo vật liệu; warm xong mới gắn vào cảnh. Bấm kệ vẫn mở khung xem 3D đầy đủ.
- Sau: nhìn về phòng 350–680k tam giác, 160–300 draw call, không biên dịch shader khi quay, đứng yên không còn khung treo. Còn vài khung
  0,3–1s lúc xoay không có long task JS (phía GPU / driver, hoặc do Chrome bị điều khiển tự động khi đo); món nặng nhất còn lại: Realforce
  trên bàn máy tính (143k tam giác).
- Dev: `window.__r3f` có thêm `gl` (WebGLRenderer) để đo `gl.info`.

## 2026-11-05: tranh treo tường

- Xoá tranh khung đen cạnh đồng hồ (tường trước, `hanging_picture_frame_01`) + tranh khung trắng hành lang đối diện ô cửa
  (`hanging_picture_frame_02`), bỏ `ModelPainting` + 3 GLB khung Poly Haven (cả `fetch-room.mjs`, ghi công).
- Tranh phượng hoàng: khung chạm trổ `fancy_picture_frame_02` (35k tam giác) → `CanvasPainting` khung hộp mạ vàng như tờ "300k";
  tường phải lệch về phía tường sau (`WORK_TABLE.z - 1.15`).
- Bộ 3 tranh cafe (Sketchfab "Cafe Wall Pictures", Guy in a Poncho, CC BY 4.0; nguồn `assets/room/cafe_wall_pictures.glb`):
  `bun run convert:cafe-pictures` (bỏ normal / ORM map, ảnh màu PNG → JPEG bằng bộ giải PNG tự viết vì sharp của gltf-transform lỗi
  colourspace; bỏ tam giác tấm kính alpha < 128 — vật liệu đục thì kính thành tấm đen che tranh; giữ 2 mặt vì mặt tranh có tam giác ngược
  chiều) 5,6MB → 530KB. Treo tường phải trên kệ giao hàng (`SHIP_SHELF.z - 0.25`), xoay π (model gốc mặt quay +x), lùi khỏi tường 1,5cm
  (tranh nghiêng ~1°, sát tường thì nửa dưới lẹm vào tường), `Model noShadow` (bóng khung hắt sọc lên mặt tranh).
- Poster: "MY KEYBOARDS" + "CHERRY" từ tường trước sang tường trái (z 3,45 / 2,6 m, giữa góc tường trước và ô cửa); "ベースライン303" lên
  tường cuối hành lang trên kệ sắt nhận hàng; "CAUTION" sang tường trước cạnh kệ chưng bàn phím (`-SHELF_X + 0.9`).

## 2026-11-08 — Case nhựa: ABS + PC đủ 1 / 2 mảnh mọi cỡ

- Yêu cầu: case nhựa 2 mảnh sao không có PC trong suốt; PC sao không có 1 mảnh; gộp PC với nhựa thành 1 loại, chọn chất liệu chỉ đổi
  bảng màu (PC mới có màu trong); Free build ghi "Case 40 nhựa" không rõ nhựa gì; rìa ô màu nhuộm trong bị khuất.
- Đã làm:
  - `parts.ts`: thêm PC 2 mảnh `pc40` / `case75Pc` / `tklPc` / `fullPc` + PC 1 mảnh `pc60One` / `pc40One` / `case65Pc` / `case75PcOne` /
    `tklPcOne` / `fullPcOne` (giá ~1,6× ABS cùng loại; màu `clear` + `frost` + `smoke` + `TINT_COLORS`), `pc60` thêm `clear`.
    `CASE_LINES` ghi "Nhựa ABS / Nhựa PC n mảnh", thêm dòng "Case 65%". Tên case ghi rõ "nhựa ABS / nhựa PC". `CASE_MATERIALS.pc` = "Nhựa PC" (trước "PC mờ").
  - `isPlasticCase` (parts.ts): ABS / PC dựng bằng code, không model, không `bottom` (nắp PC đáy nhôm đứng riêng) → `caseWall` (thành mỏng
    `ABS_WALL` / `ABS_WALL_2`), `hasAbsRibs` (khung xương cá + trụ ren), `caseLv` (1 mảnh cấp 1). PC vẫn giòn (`BRITTLE`: vít có thể nứt case).
  - `FreeBuildDialog`: họ `plastic` (ABS + PC) gộp 1 dòng "Case <cỡ> nhựa", nút ABS / PC (cạnh Anod / E-coat của nhôm) + số mảnh, dòng phụ ghi chất liệu;
    `aluPick` ưu tiên giữ chất liệu khi thiếu số mảnh.
  - `caseSwatch`: gradient chia đôi thêm `border-box` (trước nền tính trong viền, lặp dưới viền → rìa ô lệch màu).
  - Chụp lại ảnh Shopii mọi case PC dựng bằng code (`ONLY=:pc60` / `:pc40` / `:tklPc` / `:fullPc` / `:case65Pc` / `:case75Pc`).

## 2026-11-08 — Lật case (Q) ở bước lắp DTB

- Yêu cầu: bước lắp daughterboard sao không lật case xem được.
- Đã làm: bỏ `dtb` khỏi `NO_FLIP_STEPS` (steps.ts): bước này chỉ có case trên bàn (board để riêng), DTB nằm trong nhóm case nên lật theo.
  `Daughterboard` (Daughterboard.tsx): đang lật (`useAssemblyFlipped`) thì tạm khoá đặt mạch / vít M2 / cắm dây + ẩn mũi tên (mặt trong case
  quay xuống, tránh bấm xuyên sàn), HUD tự hiện "Đang xem mặt đáy — bấm Lật lại mặt trên". `coverOff` / `coverOn` / `jst` vẫn không lật
  (tạ đang nhấc / board dựng đứng trên case). Chụp kiểm pc60One tray mount: lật / lật lại đúng.

## 2026-11-08 — Pin Li-Po: Shopii + hốc pin case ≤ 60% + bước lắp pin

- Yêu cầu: bán pin trên Shopii theo dung lượng 1000 → 5000mAh; PCB có cổng JST cắm pin, dây pin 2 sợi âm / dương; case nhựa / nhôm khoét hốc
  chứa pin (mặc định mọi case ≤ 60%, không theo option), soát case cổng C bên trái / giữa / phải; chỉ case dựng bằng code.
- Đã làm:
  - `supplies.ts`: `BATTERY_IDS` (`bat1000`…`bat5000`, `SupplyDef.battery` {mah, w, l, t}), dày cố định `BATTERY_T` 5mm, mặt pin to dần
    (34 × 50 → 60 × 115mm); Shopii gộp 1 sản phẩm "Pin Li-Po (JST PH 2 pin)" (`sup-battery`, nhóm lọc "Pin"), mở cấp 2 (`supplyLv`).
  - `steps.ts`: `batteryCase` (không model, 40 / 60, nhựa `isPlasticCase` hoặc nhôm anod / E-coat kể cả đáy nhôm), `batterySpot` → `ctx.battery`
    (`BatterySpot`): thử pin to nhất xuống, quét lưới chỗ gần giữa nhất trong lòng case (chừa `BAT_WALL`), né DTB + dải dây JST tới jack,
    trụ tray (chỉ tray mount — trụ chặn nên tray chỉ vừa 1000–3000mAh, mount khác 60% vừa 5000), trụ vít nhựa 2 mảnh, cổng USB-C trên PCB
    (bản "C" cổng trái, `pcbUsbSpot`); mặt trên pin dưới đáy socket (`BAT_TOP`) → nhôm khoét sàn xuống, nhựa sàn mỏng nằm thẳng. Jack JST PH
    trên PCB: tách lõi `placeJack` khỏi `jackSpot` (thêm vùng cấm: mặt pin, jack DTB). `batteryFits` / `batterySize`. Vít tray tách `trayPoints`.
    Bước tuỳ chọn `battery` sau `jst` (board vẫn dựng `jstStand`), `NO_FLIP_STEPS`, `stepProgress` 2 phần, `remapStepIdx` không lùi về.
  - Store: `batteryPick` (shopSlice), `placeBattery` (pin to hơn hốc thì báo, trừ 1 vật tư) / `plugBattery` (buildSlice), `BuildState.battery`.
    Save rev 12 `addBatteryStep` (build dở dời stepIdx theo tên bước; các bước nâng cấp cũ bỏ `battery` qua `noBattery`).
  - Cảnh: `scene/parts/Battery.tsx` (`BatterySlot` trong case dưới: pin bọc nhôm + nhãn xanh + băng keo vàng, khối mờ chờ đặt (đỏ = to quá),
    dây đỏ / đen tới đầu cắm; `PcbBatteryJack` trong Board, `useBatPick`). `caseShellGeometry` thêm `tub` (`ShellTub`, CSG khoét hốc sàn nhôm),
    `absRibs` bỏ gân trong hốc + dải dây (`batteryKeepout`, dùng chung foam đáy), `BatteryPanel` (ModPanels) chọn dung lượng.
  - Kèm: vá `caseFloorTop` / `absTwo` / `gasketTabbed` dùng `isPlasticCase` (case PC dựng y như ABS).
  - Chụp kiểm plastic60 + gasket60 gasket mount: đặt pin 5000mAh, cắm dây, thả board vào case.

## 2026-11-08 — Q lật được sau khi case 2 mảnh tách (bước mở case)

- Yêu cầu: tháo hết vít đáy, case tách 2 mảnh thì bấm Q không lật được (nút HUD vẫn bật nhưng bấm không có tác dụng).
- Nguyên nhân: `useAssemblyFlipped` (caseSplit.ts) ép `false` khi `useCaseSplit()` → bỏ qua `viewFlip`.
- Sửa: lúc tách (`useCaseSplit`, cả khi tải lại đã tách) đặt `viewFlip = autoFlip('caseOpen', ctx)` để cụm ngửa lại, bỏ ép `split` trong
  `useAssemblyFlipped` → Q lật / lật lại bình thường. `Objective` (BenchHud) không nhắc "Đang xem mặt trên — bấm Lật xem đáy" khi bước đã xong.
  Chụp kiểm pc60 gasket: tách → ngửa, Q → thấy đáy.

## 2026-11-08 — Pin: model giống pin bán lẻ, jack sát pin, dây không xoắn

- Yêu cầu: model pin sai + thiếu nhãn dán (ảnh mẫu pin Li-Po 606090: viền băng keo vàng, nhãn trắng in thông số); jack pin phải gần pin nhất,
  không nằm xa cạnh jack DTB; 2 sợi dây pin đè chéo lên nhau.
- Đã làm:
  - `Battery.tsx` `Pack`: thân bọc Kapton vàng (`kaptonMat`, clearcoat), nhãn trắng mặt trên chừa viền vàng 1,5mm, vẽ canvas (`labelTexture`,
    cache theo loại + phía dây): mã TTWWLL, mAh, số lô, 3.7V, Wh, QR giả, thùng rác gạch, +/− cạnh QR; khối chữ dồn về phía đầu dây, cỡ chữ theo
    bề rộng (không tràn). Bó mạch bảo vệ 4mm ở đầu dây.
  - Jack: hạ pin (`BAT_TOP` = dưới đáy jack `BAT_JACK_H` 3,2mm) để jack nằm ngay trên pin → nhôm khoét hốc sâu hơn (đáy hốc −0,794, sàn còn ~2mm);
    `batterySpot` dây ra cạnh ngắn phía xa DTB, jack muốn ở trên pin cách đầu dây 0,45u, miệng quay ra đầu dây; `placeJack` thêm `softCost`
    (jack pin 0,02: chạm khung footprint gần như không phạt, vẫn né socket / chân switch / lỗ stab) — trước phạt 1,2 / điểm nên jack chạy xa ~2u.
  - Dây: bỏ điểm võng sát pin khi 2 đầu chênh cao (board dựng), hướng tách 2 sợi chuyển dọc dây kiểu khung song song (không lật dấu).
  - Chụp kiểm pc60One gasket (pin 2000 / 4000mAh): nhãn đủ chữ, jack ngay trên pin, 2 sợi song song.

## 2026-11-08 — Vỏ case dưới liền 1 khối: lỗ ốc nhựa 2 mảnh, bỏ đường kẻ quanh đáy

- Yêu cầu: lỗ ốc ở case ABS 2 mảnh bị lỗi (mặt đáy chỉ thấy nửa lỗ); bỏ đường kẻ quanh mặt đáy case nhựa.
- Nguyên nhân: `caseShellGeometry` dựng vành (ring) + sàn (floor / skin hốc feet) là các khối riêng rồi `mergeGeometries` → mối ghép thành đường kẻ
  quanh đáy; lỗ khoan (`bores`) chỉ khoét vào vành — trụ vít nhựa 2 mảnh sát mặt trong vách nên lỗ lấn sang sàn, sàn không khoét → che nửa lỗ.
- Sửa (`caseShell.ts`): có sàn thì dựng 1 khối đặc bo mép (`ringShape(..., solid)`), trừ lòng case (từ mặt sàn lên), rồi khoét mọi thứ trên khối
  đó bằng 1 lần CSG: hốc tai, lỗ khoan, lỗ USB, hốc feet (trụ tròn từ mặt đáy, thay tấm `skin` đục lỗ), hốc pin (`tubCut`, thay `carveTub`).
  Áp cho mọi case dựng bằng code có sàn (nhựa / nhôm / PC / acrylic / gỗ), case trên không sàn giữ vành như cũ. Mép trong miệng lòng case giờ vuông
  (trước bo theo bevel vành). Chụp kiểm plastic40Two (đáy liền, lỗ ốc tròn đủ) + gasket60 (lòng case, hốc pin, đáy).

## 2026-11-08 — Plate bottom mount case nhựa 2 mảnh bị khuyết nửa tròn ở mép

- Yêu cầu: plate (40% bottom mount, nhựa 2 mảnh) có các vết khuyết nửa tròn dọc mép trước / sau, trông như lỗi.
- Nguyên nhân: tâm vấu cách mép board chỉ 0,02u nhưng lỗ plate dùng cỡ lỗ tray (Ø4,8mm, `TRAY_HOLE.plate`) → lỗ ăn ra ngoài mép plate.
- Sửa: `ABS_BOSS.inset` 0,05 → 0,12 (tâm vấu cách mép board 0,09u, vấu vừa chạm mặt trong vách, bỏ hốc vách `absPadNotches`); lỗ plate cỡ lỗ
  xuyên M2 (`ABS_SCREW.thru`, `plateGeometry` nhận `r` riêng từng lỗ); `bossSpot` (steps.ts) dò x riêng từng cạnh trước / sau cho đầu ốc
  (Ø3,8mm) lọt khe giữa 2 lỗ switch / stab (`clearOfCutouts`) + né lỗ chân stab PCB. Kiểm số liệu 40 / 60 / TKL / full: mọi vít không chạm lỗ cắt;
  chụp plastic40Two bottom mount: lỗ tròn kín trong mép plate, thấy vấu bên dưới.
- Người dùng chỉnh lại: plate bottom mount phải y như plate top mount (có tai), chỉ khác vít bắt xuống case dưới. Đổi: điểm vít `bottomPts` case nhựa
  2 mảnh = `topScrewPoints(..., absTop)` (tâm ngay mặt trong vách, vẫn `bossSpot` né lỗ stab / switch), plate dùng tai top mount sâu `ABS_TOP.d`,
  vách case trên khoét hốc như top mount (trần chừa đầu ốc `BOTTOM_NOTCH_TOP`), vấu = trụ nhỏ `ABS_TOP.bossR` từ sàn lên mặt dưới tai (PCB / foam khoét
  rãnh theo bán kính này); `ABS_BOSS.inset` về 0,05. Khoảng né vít ghép khi `absTop` = nửa tai + khe + trụ vít ghép (hốc tai không lấn trụ vít ghép, áp cả top mount).
- Tiếp: người dùng khoanh khối nhựa chắn cạnh tai plate (bước top mount) + báo tai quá ngắn, đầu ốc cấn PCB. Nguyên nhân: tâm vít ngay mặt trong
  vách → nửa trụ ren (`ABS_TOP.bossR`) thò vào lòng case trên mặt plate, đầu ốc Ø3,8 lấn mép PCB. Sửa: `ABS_TOP` = { d 0,2, z 0,1 }: hốc + tai sâu
  0,2u (qua da trong vào rãnh thành), tâm vít cách mặt trong vách 0,1u (đầu ốc cách mép PCB ~0,4mm) → trụ ren top mount / vấu bottom mount nằm
  gọn trong rãnh thành, không lấn lòng case; bỏ rãnh né trên PCB + foam đáy. Áp cả top mount lẫn bottom mount case nhựa 2 mảnh.

## 2026-11-08 — Gasket case nhựa 2 mảnh có tai + vấu khối lược

- Yêu cầu: gasket mount case nhựa 2 mảnh không có tai / vấu kẹp, dải gasket chỉ dán quanh mép plate trông vô lý; làm theo case nhựa M0110
  (khối lược nhựa từ case dưới nhô lên đỡ mép plate + gasket).
- Đã làm: `gasketTabbed` bỏ loại trừ case nhựa (mọi case 2 mảnh dựng bằng code trừ mica) → plate có tai gasket, dải trên + dưới tai, hốc vách
  case trên `gasketNotches` (qua da trong vào rãnh thành, lót hốc như top mount); vấu đỡ case nhựa = `combPadGeometry` (Case.tsx: 2 thanh dọc vách +
  gân ngang ~0,11u, mọc từ sàn case dưới trong rãnh thành, nhô qua mép ghép tới mặt dưới dải dưới). Điểm gasket case nhựa né trụ vít ghép trong rãnh
  thành (steps.ts). Kiểm 40 / 60 / 75 / TKL / full: hốc tai không chạm trụ vít ghép / lỗ USB; chụp plastic60Two gasket (khối lược + tai kẹp 2 dải).
- Tiếp: bỏ thanh dọc mặt trong khối lược (gân hở về phía lòng case như M0110); gân làm bậc: đoạn trong thấp tới mặt dưới dải gasket dưới
  (tai plate gá vào), đoạn ngoài cao thành gờ chặn đầu tai (`COMB.lip` 0,05u, đỉnh `COMB.lipTop` −0,02) + 1 thanh dọc mặt ngoài; hốc vách case trên
  sâu thêm `COMB.lip` cho gờ. Khối lược dựng theo trục z cục bộ (trong → ngoài), cạnh sau xoay 180°.
- Tiếp: thêm 2 thành bên khối lược (`COMB.side` 0,022u, cao bằng gờ, suốt chiều sâu) ôm 2 cạnh tai plate (khe ~0,1mm) cho plate không trôi ngang;
  khối rộng gần bằng hốc vách case trên (`GASKET.w` + 2 × khe hốc − 0,004), gân thấp chỉ ở giữa 2 thành.

## 2026-11-08 — Hạ thấp case nhựa thêm

- Yêu cầu: "sao case lại cao vậy ?? giảm thấp lại" (ảnh case PC 40% 2 mảnh nhìn ngang).
- Đã làm: mép trên `ABS_CASE_TOP` 0,26 → 0,18 (~3,4mm trên plate), đáy `ABS_RAISE` 0,1 → 0,15, trụ kê DTB `ABS_DTB_POST` 0,1 → 0,05 (DTB giữ
  nguyên cao độ: miệng USB-C vừa sát mặt dưới PCB nên sàn không nâng thêm được nữa nếu không hạ trụ); trụ ren top mount `ABS_TOP.bossH` 0,2 → 0,13,
  trần hốc bottom mount case nhựa `ABS_BOTTOM_NOTCH_TOP` 0,1 (đầu ốc M2 ~1,3mm) để lót hốc không lòi mặt trên. Tổng cao giảm ~0,11u (~2mm), áp mọi
  case nhựa (1 / 2 mảnh), mọi kiểu mount cùng cao (vỏ chỉ theo `caseFloorBot` / `caseTopOf`, không theo mount). Gân xương cá còn ~3,7mm, pin 3mm vẫn dưới
  đáy socket. Chụp lại ảnh Shopii case nhựa.

## 2026-11-09 — Vào bàn lube switch bị khựng

- Yêu cầu: "ở bước tải model lube switch thì có vẻ đang vào màn liền dẫn tới hơi lag".
- Đo (Chrome ngầm, móc `renderBufferDirect` đếm shader mới): model lube đã `useGLTF.preload` sẵn, khựng là do **transmission**: lọ dầu
  (`createOilBottle`), lớp mỡ (`greaseMaterial`), giọt dầu là vật transmission đầu tiên lọt khung (các bước trước không có) → three vẽ lại cả
  phòng vào khung phụ (không tone mapping) → biên dịch lại shader cho từng vật trong phòng (bàn, ổ điện, màn hình...) ngay khung đó, đứng hình vài giây.
- Sửa: 3 vật liệu đó bỏ transmission, trong suốt thường (`transparent` + opacity, lọ dầu `depthWrite: false`) → hết lượt vẽ lại phòng (nhẹ cả
  khi đang ở bước lube). Thêm `Warm` (Bench.tsx) bọc bàn lube / mod stab: lần dựng đầu giấu khỏi camera (layer 31), `warmUp` → `compileAsync`
  biên dịch song song trong lúc hiện lớp "Đang tải mô hình", xong mới hiện. Còn lại 1 shader bóng đổ cho InstancedMesh (lượt shadow map không
  biên dịch trước được bằng `compileAsync`), nhỏ trên GPU thật. `window.__r3f` bàn build có thêm `gl` (debug).

## 2026-11-09 — Bỏ gasket mount khỏi case 1 mảnh dựng bằng code

- Yêu cầu: "mount gasket sao ko có tai plate thì làm sao mà mount được" (ABS 40% 1 mảnh), "case 60 có đang làm tương tự ko",
  rồi "1 mảnh nhựa và nhôm ko có gasket mount vì nó sẽ bị lộ ở trên => bỏ đi".
- Lỗi: `gasketTabbed` chỉ case 2 mảnh → case 1 mảnh dựng bằng code (mọi cỡ) gasket chỉ là dải dán quanh mép plate, không gì đỡ.
- Đã thử: tai plate thả vào khe vách mở từ mép trên (kiểu Tofu60 2.0); thành nhựa 1 mảnh 0,1u không đủ sâu → phình vách ra ngoài
  (lồi cục, bị chê) rồi làm thành dày 0,3u; người dùng chốt bỏ vì khe lộ khi nhìn từ trên. Đã hoàn tác hết phần code đó.
- Đã làm: `CaseDef.mounts` mọi case 1 mảnh dựng bằng code (nhựa ABS / PC, nhôm anod / E-coat, gỗ; 28 case) = `['tray', 'oring']`,
  sửa `desc` cho khớp. Case CAD 1 mảnh (Exodus, Repent75...) giữ gasket (theo model thật). Save cũ: `fixMount` / `fixOrderMount`
  (persistence.ts) tự đổi sang mount đầu tiên hợp lệ + `remapStepIdx`; đơn full đòi gasket thì phải dùng case 2 mảnh / CAD.

## 2026-11-09 — PCB: via viền + nhãn silkscreen không in đè phím

- Yêu cầu: "foam 7u đang sai ?" (40% space 7u, ảnh khoanh Ctrl trái + Alt / Ctrl phải hàng dưới).
- Nguyên nhân: không phải foam (lỗ foam khớp phím). Texture PCB (`makePcbTexture`, PcbSurface.tsx) in hàng via dọc mép trên / dưới
  - chữ "HOTSWAP | PCB REV.01" góc dưới trái cố định theo mép; layout kín mép (40%) hàng dưới nằm đè lên → nhìn qua lỗ foam
    phím to thấy chữ + chấm via chen vào footprint, trông như foam khoét lệch.
- Đã làm: `underKey(x, y, pad)` (px canvas, theo khung phím có xoay): via nằm trong vùng phím thì bỏ; nhãn thử 4 góc, góc nào
  không đè phím thì in, không góc nào trống thì bỏ nhãn.

## 2026-11-09 — Case nhựa 2 mảnh: gân + trụ vít case trên chạy suốt xuống sàn khay

- Yêu cầu: "xương cá ở case 2 mảnh pc thì phải cho xương ở top case dài hết luôn thì mới chắc được => bot case xương cá ở ngoài bỏ đi",
  rồi "đưa viền nhựa sát ra để úp vào", "khung xương đang bị ngắn hơn => nhìn như đang bị cut", "cho top nó nhỏ hơn để bot có khung
  xương như lúc trước".
- Đã thử (bỏ): case dưới thu vào trong da trong + vấu đáy chỗ vít (sàn không ra sát da ngoài, bị chê); da trong thuộc case trên từ sàn
  lên (case dưới chỉ là tấm phẳng, mất vành chạy quanh, bị chê); gân 2 khúc (dưới mép ghép ngắn hơn → nhìn như bị cắt).
- Chốt (`absTwoShellGeometry`): case dưới như cũ (khay ra sát da ngoài + vành da trong chạy quanh tới mép ghép) nhưng bỏ gân + trụ
  trong rãnh; case trên gân 1 bề ngang chạy từ mặt khay (`ys.floor`) lên dưới mặt trên, đầu trong dừng sát mặt ngoài da trong case dưới
  (`channelRibs` thêm `inner`, = −gap); da trong case trên dày thêm `gap` cho gân nối vào; trụ vít ghép thuộc hẳn case trên, từ mặt khay
  lên (`AbsScrewBosses` chỉ còn case trên, ren đồng ở miệng dưới; vít từ đáy xuyên sàn khay).

## 2026-11-09 — HHKB: thêm space 10u

- Yêu cầu: "layout hhkb thì nếu mount 10u thì sẽ full hết row và 2 bên hông là 1.75u" (ảnh: 40% bản 10u = Ctrl 1.25 + space 10 + Fn 1.5).
- Đã làm: `LAYOUTS.hhkb.variants.space` = `['7u', '10u']` (mặc định 7u như cũ, save cũ `{}` vẫn ra 7u); 10u: khối chặn 1.5u +
  Alt 1.75u + space 10u + Alt 1.75u (+ khối chặn 1.5u) = 15u. Stab dây 7u (`stabNeed` ≥ 7u → `long7`).
- 40% bản 10u (phiên song song thêm) giữ nguyên: 40% chỉ rộng 12.75u, 1.75 + 10 + 1.75 = 13.5u không vừa.

## 2026-11-09 — HHKB trên case 1 mảnh: PCB cắt 2 góc; space 10u chỉ case 2 mảnh

- Yêu cầu: "hhkb dành cho case 2 mảnh thôi case 1 mảnh muốn chơi thì phải cut pcb 2 góc đi và thường là hhkb or true hhkb thôi".
- Đã làm:
  - `cornerCutOutline` (steps.ts): case 1 mảnh (không `plateModel`) + layout `hhkb` / `truehhkb` → `ctx.outline` = chữ nhật trừ 2 góc
    hàng dưới (khe khối chặn `blockerGaps`, chừa `CASE_MARGIN`) → PCB, plate, foam cắt góc (đều đi qua `boardOutline(..., outline)`).
  - `Blockers` thêm `solidFrom`: case 1 mảnh dựng bằng code chơi HHKB → khối chặn góc đặc từ mặt sàn lên (đúc liền case), thay
    tấm khung mỏng trên mặt (board thả từ trên xuống không vướng vì đã cắt góc).
  - `caseFits(def, layout, variant?)`: HHKB `space: '10u'` chỉ case 2 mảnh; truyền variant ở `checkInventory`, sinh đơn (orders.ts:
    case hot 1 mảnh mà bốc phải 10u → về variant mặc định; `estimateCost` nhận `want.variant`), Free build (ẩn 10u khi case 1 mảnh,
    `effVariant` gửi `startFreeBuild`).
- Kiểm: case nhựa 60% 1 mảnh + HHKB: PCB khuyết 2 góc dưới, khối chặn trắng đặc lấp góc.

## 2026-11-09 — 40% kiểu HHKB (1 / 2 mảnh)

- Yêu cầu: "case 40% 1 mảnh và 2 mảnh vẫn có hhkb vd bỏ 2 nút 2u or 1u bên trái rồi bên phải bỏ 1u, 1.75 chẳng hạn là thành hhkb rồi".
- Đã làm: 40% thêm `space: 'hhkb'` ("Kiểu HHKB (bỏ 2 phím góc, space 7u)"): khối chặn 1.25u + Alt 1.5u + space 7u + Alt 1.5u + khối chặn 1.5u
  = 12.75u. `cornerCutOutline` bỏ điều kiện layout: case 1 mảnh cứ có khe chạm 2 góc hàng dưới là cắt góc PCB / plate / foam (dò mọi
  layout + variant: chỉ 40% hhkb, HHKB 7u / 10u, True HHKB); `Blockers` chỉ khối ở góc mới đặc từ sàn (`solidFrom`), khe giữa hàng
  (WKL...) vẫn là tấm mỏng trên mặt. Case 2 mảnh: PCB chữ nhật, khối chặn thuộc case trên.

## 2026-11-09 — Case nhựa: mép trên ngang đỉnh housing switch; 40% HHKB split space

- Yêu cầu: "sao sw lại cao thế này ??? đáng lẽ phải nằm thấp vừa đủ để lộ chân keycap thôi" (ảnh nhìn ngang case nhựa 40% 1 mảnh);
  "hhkb case 40% cũng có split space nữa".
- Đã làm: `ABS_CASE_TOP` 0,18 → 0,34u (~6,5mm trên mặt plate ≈ đỉnh housing switch ~6,6mm): 0,18 (hạ ở mục "Hạ thấp case nhựa thêm")
  lộ nửa trên housing khi nhìn ngang. Đáy không hạ thêm được (pin / DTB / USB-C) nên case nhựa cao lại ~3mm. Ảnh Shopii case nhựa
  cần `bun run bake:thumbs` lại.
- 40% thêm `space: 'hhkbSplit'`: khối chặn 1.25u + Alt 1.5u + space 2.75u + Fn 1.5u + space 2.75u + Alt 1.5u + khối chặn 1.5u (stab 2u
  mỗi nửa); case 1 mảnh tự cắt góc PCB như `hhkb`.

## 2026-11-09 — Lắp đủ switch tự sang bước kế

- Yêu cầu: "khi step từ bước lắp sw lắp xong thì tự động qua step mount gasket luôn".
- Đã làm: `installRun` (buildSlice.ts): lắp switch xong mà mọi phím đã có switch, đang ở bước `switch` → `nextStep()` ngay (bước kế
  là `gasket` / `solder` / `ring` / `feet` tuỳ build). Hoàn tác vẫn lùi về được như các bước tự sang khác.

## 2026-11-09 — Backspace hàng 2 (kiểu HHKB) + split backspace 65 / 75; Enter ISO / BAE 40% xuống hàng 2–3

- Yêu cầu: "bổ sung có thể chọn option backspace ở row 1 split 1u or là ở row 2 thay cho nút \| ... ở tất cả case có thể hỗ trợ";
  "đổi lại enter iso ở layout 40 và big ass enter về row 2 và 3 thay vì 1 và 2".
- Backspace (layouts.ts `backspaceSpot`, gọi đầu `enterCluster` nên mọi layout có hàng số đi qua: 60 / TKL / TKL F13 / FRL / full /
  65 / 75): `backspace: ['2u', 'split', 'row2']` (65 / 75 trước không có lựa chọn backspace). `row2`: `\|` 1.5u hàng QWERTY → Backspace
  1.5u, hàng số chỗ Backspace → `\|` 1u + Del 1u; Enter ISO / Big-ass (chiếm chỗ `\|`) thì bỏ qua `row2`. `split` cho 65 / 75 tách
  Backspace 2u thành Back 1u + Del 1u ngay trong `backspaceSpot`.
- 40% `enter40`: ô Enter chữ L dời xuống hàng ASDF + Shift, hàng QWERTY giữ Backspace 1.75u (trước Backspace dời xuống chỗ Shift phải).
  ISO: Tab 1u + A–; + khe 0.25u + cánh trên 1.75u, ô chính 1.5 × 2u, hàng Shift còn Shift 1.25u + Z–/. Big-ass: Tab 1.25u + A–; + ô chính
  1.5 × 2u, cánh dưới 2.25u, hàng Shift = Shift 1.5u + Z–. (bỏ `/`). Kiểu mũi tên (↑ dưới cột `.`) vướng ô Enter → giữ Enter ANSI.

## 2026-11-09 — Shift trái ngắn + phím <>

- Yêu cầu: "layout shift bên trái ngắn hơn để có 1 nút <> ở cạnh".
- Đã làm: `VariantKey` thêm `lshift` (`'2.25u' | 'split'`), `lshiftSpot` (layouts.ts, gọi trong `enterCluster`): Shift trái 2.25u →
  Shift 1.25u + `<>` 1u (mã IntlBackslash). Có ở 60 / 65 / 75 / TKL / TKL F13 / FRL / full; Enter ISO tự tách Shift trái nên bỏ qua.

## 2026-11-09 — Shift trái ISO + Caps Lock stepped

- Yêu cầu: "bổ sung option Shift trái ISO (1.25u + <>)", "bổ sung option step cap or normal cap ở riêng ở ngoài", rồi "option step cap
  và normal cap chưa có ??" (lẫn trong các ô cùng tên "Kiểu layout").
- Đã làm:
  - `lshift.split` đổi nhãn "Shift trái ISO (1.25u + <>)".
  - `VariantKey` thêm `caps` (`normal` / `stepped`) ở 60 / 65 / 75 / TKL / TKL F13 / FRL / full; `capsSpot` (layouts.ts, trong
    `enterCluster`): Caps 1.75u → ô chính 1.25u (switch giữa phần nhô) + `ext` cùng hàng phủ cả 1.75u + khe 0.5u. Keycap
    (Keycap.tsx, orderThumb): `isStepped` / `STEP_LOW` (keyShape.ts) = bậc thấp 40% cao dựng theo viền cả phím + keycap thường
    cỡ 1.25u. Plate universal / CAD 60 không có Caps stepped / Shift trái ISO → cắt lỗ theo phím (`plateCutoutsFor`, Board
    `standard60CAD` / `lShape`).
  - Free build: mỗi lựa chọn kiểu layout 1 dòng nhãn riêng (`VARIANT_NAME`: Backspace / Hàng dưới / Shift phải / Shift trái /
    Caps Lock / Space / Enter); Caps Lock là 2 nút (`variantShort`: Thường / Stepped), còn lại ô đổ xuống.
  - Nhãn dòng (theo người dùng): "Layout row cuối" (hàng dưới / space), "Kiểu enter", "Kiểu Caps Lock", "Kiểu backspace", "Kiểu shift trái / phải";
    cột nhãn `Line` rộng `w-28`.
- Tiếp (2026-11-10): "bên trong dev và free build chưa thấy option chọn kiểu caploc" — lựa chọn chỉ có ở layout có Caps Lock 1.75u
  (60 / 65 / 75 / TKL / TKL F13 / FRL / full); 40% chỗ đó là Tab 1.25u nên không có. Thêm `caps` cho HHKB / True HHKB: `capsSpot`
  nhận cả Ctrl trái (chỗ Caps Lock của HHKB) → Ctrl stepped (giữ nhãn / mã phím gốc).

## 2026-11-10 — Case gỗ 40% / TKL / Full

- Yêu cầu: "tất nhiên case 40%, 60%, tkl, full size cũng có vật liệu gỗ" (trước chỉ `wood60`).
- Đã làm (parts.ts): `wood40` (800k), `tklWood` (1.200k), `fullWood` (1.500k) như `wood60` (1 mảnh, tray / O-ring, 4 màu gỗ), thêm
  vào `CASE_LINES` 40% / TKL / Full ("Gỗ"). Dựng bằng code chung (`Walls` + `woodUV`). Ảnh Shopii cần `ONLY=Wood bun run bake:thumbs`
  - `ONLY=wood40`.

## 2026-11-12 — Case 65% nhựa 2 mảnh

- Yêu cầu: "sao case 65% ko có option 2 mảnh?" → "case model 65% tự vẽ thì cứ thêm cho tôi option 2 mảnh".
- Lý do thiếu: không có giới hạn trong code, chỉ thiếu dữ liệu (65% thêm sau, chỉ có `case65Plastic` / `case65Pc` 1 mảnh).
- Đã làm (parts.ts): `case65PlasticTwo` (ABS 2 mảnh, 650k) + `case65PcTwo` (PC 2 mảnh, 1.350k) theo khuôn `case75PlasticTwo` / `case75Pc`
  (vít đáy, gasket / top / bottom, giá ~1,6× / ~2,1× bản 1 mảnh như 75%), thêm vào `CASE_LINES` "Case 65%". Cấp mở khoá tự tính (`caseLv` = 3).
  Vỏ dùng chung `absTwoShellGeometry`, không sửa code dựng hình. Free build tự gộp vào dòng "Case 65% nhựa" (chọn số mảnh).
- Kiểm tra: `buildContext` cả 3 mount ra đúng dãy bước như bản 75%; chụp ảnh Shopii `ONLY=case65PlasticTwo` / `ONLY=case65PcTwo` (19 ảnh).
- Chưa làm: nhôm / mica 2 mảnh cho 65% (người dùng chỉ hỏi case tự vẽ → làm nhựa trước).
