# Asset gốc (CAD / model nguồn)

Thư mục này chỉ chứa **file gốc** (STEP, STL, DXF, KiCad, GLB tải về) làm nguồn cho các script `scripts/convert-*`.
Game không đọc trực tiếp từ đây: bản đã chuyển đổi (GLB tối ưu, đúng đơn vị / trục) nằm ở `public/models/` và được nạp
bằng URL `/models/...`. Hai bên chia theo cùng một nhóm:

| Nhóm | `assets/` (nguồn) | `public/models/` (game dùng) | Script |
| --- | --- | --- | --- |
| Bàn phím | `keyboards/<tên>/` (case / pcb / plate) | `keyboards/<tên>/case[-biến thể].glb` | `convert:cases`, `convert:user-cases` |
| Switch | `switch/` | `switch/switch.glb` | `convert:switch` |
| Stabilizer | `stab/` | `stab/` | `convert:stab`, `convert-stab-variants.mjs` |
| Keycap | `keycaps/<profile>/` | `keycaps/` | `convert:keycaps` |
| Plate | `plates/` | — (sinh dữ liệu `src/data/generated/`) | `convert:plates`, `gen:plate-*` |
| Ốc vít | `screws/` | `screws/` | `convert:screws` |
| Dụng cụ | `tools/` (`hand/`, `solder/`, `desolder-pump/`, `scissors/`, `polyhaven/`) | `tools/` (+ `tools/solder/`) | `convert:hand-tools`, `convert:solder-tools`, `convert:desolder-pump` |
| Lube | `lube/` (`brushes/`, `jars/`, `spring-containers/`) | `lube/` | `convert:spring-containers` |
| Daughterboard | `dtb/` | `dtb/unified-c3.glb` | `convert:dtb` |
| Vật tư | `supplies/` | `supplies/` | — |
| Bàn máy tính | `desk/` (gitignore) | `desk/` | `convert:desk-gear` |
| Âm thanh | `audio/sfx/<tương tác>/` (bản gốc) | `public/audio/sfx/<tương tác>/` (ngoài `models/`) | cắt tay |

Model phòng (`public/models/room/`) tải thẳng bằng `fetch:room`, không có bản gốc ở đây.
Giữ nguyên file `LICENSE` / `SOURCE.md` trong từng thư mục khi sử dụng hoặc phân phối asset.

## Bàn phím cộng đồng

| Bộ thiết kế | Nguồn và phiên bản | Case | Plate | PCB |
| --- | --- | --- | --- | --- |
| Bakeneko 60% | [kkatano/bakeneko-60](https://github.com/kkatano/bakeneko-60/tree/8db5497954bb25736034a91976203cf648ab9853) | `keyboards/bakeneko60/case/case.step` | `keyboards/bakeneko60/plate/plate.dxf`, `fr4-plate.kicad_pcb` | `keyboards/bakeneko60/pcb/board.kicad_pcb`, `outline.dxf` |
| Alice | [MajorKoos/KBDParts](https://github.com/MajorKoos/KBDParts/tree/ed2e077b5d48197960eebcc56915f465c7ebb3f7/Keyboard%20Cases/Alice) | `keyboards/alice/case/top.step`, `bottom.step` | `keyboards/alice/plate/plate.stl` | `keyboards/alice/pcb/outline.dxf` |
| Planck | [MajorKoos/KBDParts](https://github.com/MajorKoos/KBDParts/tree/ed2e077b5d48197960eebcc56915f465c7ebb3f7/Keyboard%20Cases/Planck) | `keyboards/planck/case/planck.stl` | — | — |
| VE.A (split) | [MajorKoos/KBDParts](https://github.com/MajorKoos/KBDParts/tree/ed2e077b5d48197960eebcc56915f465c7ebb3f7/Keyboard%20Cases/VE.A) | `keyboards/ve-a/case/` (4 STL) | `keyboards/ve-a/plate/` (2 STL, 1 DXF cho ALPS) | — |
| Cepstrum (split) | [keebio/cepstrum-case](https://github.com/keebio/cepstrum-case/tree/cda6cb2f461799549484790000f2561f840bdd29) | `keyboards/cepstrum/case/` (4 STL) | `keyboards/cepstrum/plate/` (2 DXF) | — (STEP PCB nén ZIP có ở nguồn, không lưu trong repo) |

Năm bộ thiết kế trong bảng đều dùng giấy phép MIT, bản sao nằm trong thư mục tương ứng. Tên file đã được rút gọn; bảng trên dẫn về nguồn gốc chính xác. PCB của Alice chỉ có đường viền DXF, không có model mạch 3D. PCB của Bakeneko là file thiết kế KiCad; cần xuất thành STEP hoặc mesh trước khi dùng trong React Three Fiber. PCB Cepstrum đã có STEP trong ZIP; mỗi ZIP chứa một file `.step` theo tên nửa trái hoặc phải.

- `keyboards/blossom/` (doughnut923/Blossom, MIT): case 2 mảnh + plate DXF + PCB KiCad, dùng cho case Alice trong game.
- `keyboards/blossom-arisu/` có case hai mảnh STL, plate DXF, PCB STEP/KiCad và metadata layout Arisu. Bộ này theo giấy phép MIT; [nguồn và phạm vi sử dụng](keyboards/blossom-arisu/SOURCE.md). Layout Arisu khác Alice đang có trong game nên chưa gắn trực tiếp vào scene.
- Case sưu tầm cá nhân (Exodus60/80, Repent75, Catto, 4HEAD, 65TA...) cũng nằm trong `keyboards/<tên>/`, **chưa rõ giấy phép**: xem [USER-CASES.md](keyboards/USER-CASES.md).

## Plate

- `plates/4xgk3/`: chín file Alice/60%/TKL tách từ bộ sưu tập plate trên GitHub (bản đầy đủ không lưu trong repo, link tải theo commit ở SOURCE.md). Game chỉ dùng `60/typ60-full.dxf` (lỗ switch plate 60% chuẩn, `bun run convert:plates` → `src/data/generated/plate60.ts`), còn lại để tham khảo. [Nguồn, commit và danh sách file](plates/4xgk3/SOURCE.md).
- `plates/universal/`: KLE + DXF sinh bằng `bun run gen:plates-universal`.

## Cọ và lọ lube

- `lube/brushes/` có model cọ tròn đầu nhỏ **Round Brush** của Zsky (CC BY 4.0), đang dùng ở bàn lube và bàn mod stab; hai mẫu **Paint Brush Large** và **Fluffy Brush** của reyshapes (CC0) được giữ làm tham khảo. [Nguồn và ghi chú](lube/brushes/SOURCE.md).
- `lube/jars/` có hũ GLB của Innerscene, giấy phép **CC0**. [Nguồn và cách dùng hiện tại](lube/jars/SOURCE.md). Game đã có hũ lube dựng bằng code với tên dầu được hiển thị trên nắp.
- `lube/spring-containers/` có hộp nhựa bản lề và khay nông STL; bản GLB đã đưa vào bàn lube ở `public/models/lube/`. Giấy phép **CC0**, [xem nguồn](lube/spring-containers/SOURCE.md).

## Switch và stabilizer

- `switch/switch.step`: switch MX đi kèm dự án → `public/models/switch/switch.glb`.
- `switch/alps/` có model Alps SKCM STL/OpenSCAD và bản vẽ Matias kiểu Alps STEP. Giấy phép và giới hạn tái phân phối khác nhau; [xem nguồn](switch/alps/SOURCE.md).
- `stab/Stabilizer-*.stp`: stab screw-in → `public/models/stab/stab.glb`; `stab/variants/`: stab clip-in + plate-mount.
- `stab/wires-koktoh/` có model STEP riêng cho dây **2u, 6.25u và 7u**, mỗi cỡ gồm bản `screw_in` và `plate_mount`. Giấy phép **CC BY-NC-SA 4.0 (chỉ dùng phi thương mại)**, [xem nguồn](stab/wires-koktoh/SOURCE.md); hiện chỉ lưu làm asset tham khảo.

## Dụng cụ, ốc, vật tư

- `tools/hand/`: tua vít điện (Sketchfab, CC BY 4.0) + đồ mở switch MX (chưa rõ giấy phép), [xem nguồn](tools/hand/SOURCE.md).
- `tools/solder/`: bút hàn 60W, trạm hàn, giá bùi nhùi, giá cuộn thiếc; `tools/desolder-pump/`: hút thiếc (người dùng đưa).
- `tools/polyhaven/` có model GLB hộp đồ nghề + tua vít tay (tham khảo). Giấy phép **CC0**, [xem nguồn chi tiết](tools/polyhaven/SOURCE.md).
- `tools/scissors/` có model GLB kéo cắt, giấy phép **CC0**, [xem nguồn](tools/scissors/SOURCE.md).
- `screws/` có ba model STEP ốc đầu côn chìm, đầu trụ lục giác và đầu tròn thấp; bản GLB game dùng ở `public/models/screws/`. Giấy phép **CC0**, [xem nguồn](screws/SOURCE.md).
- `supplies/`: hộp băng cá nhân, khung bằng, khung ảnh để bàn (người dùng đưa, chưa rõ giấy phép); công tắc đèn `light_switch.glb` (Sketchfab, Avot, CC BY 4.0).
- `dtb/`: daughterboard ai03 Unified C3 (STEP, MIT); [nguồn](dtb/SOURCE.md). `bun run convert:dtb` → `public/models/dtb/unified-c3.glb`.

## Keycap

`keycaps/` chứa CAD cho **Cherry, OEM, SA, DSA, XDA, MT3, OPK** với giấy phép và nguồn riêng trong [SOURCE.md](keycaps/SOURCE.md). Cửa hàng trong game có thêm lựa chọn **Cherry, OEM, SA, DSA, XDA, MT3, OPK, ASA**. Keycap 1u dùng GLB chuyển từ CAD gốc; phím rộng dùng mesh theo layout. ASA chưa có CAD gốc trong thư mục này.
