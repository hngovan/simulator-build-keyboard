# Model bàn phím từ cộng đồng

Các thiết kế dưới đây được tải từ GitHub tại commit cố định để làm nguồn CAD cho game. Giữ nguyên file `LICENSE` trong từng thư mục khi sử dụng hoặc phân phối asset. File trong `assets/community/` chưa được nạp trực tiếp vào cảnh 3D; game hiện dùng hình học tạo bằng code cho case, PCB và plate để khớp nhiều layout.

| Bộ thiết kế | Nguồn và phiên bản | Case | Plate | PCB |
| --- | --- | --- | --- | --- |
| Bakeneko 60% | [kkatano/bakeneko-60](https://github.com/kkatano/bakeneko-60/tree/8db5497954bb25736034a91976203cf648ab9853) | `bakeneko-60/case/case.step` | `bakeneko-60/plate/plate.dxf`, `fr4-plate.kicad_pcb` | `bakeneko-60/pcb/board.kicad_pcb`, `outline.dxf` |
| Alice | [MajorKoos/KBDParts](https://github.com/MajorKoos/KBDParts/tree/ed2e077b5d48197960eebcc56915f465c7ebb3f7/Keyboard%20Cases/Alice) | `alice/case/top.step`, `bottom.step` | `alice/plate/plate.stl` | `alice/pcb/outline.dxf` |
| Planck | [MajorKoos/KBDParts](https://github.com/MajorKoos/KBDParts/tree/ed2e077b5d48197960eebcc56915f465c7ebb3f7/Keyboard%20Cases/Planck) | `planck/case/planck.stl` | — | — |
| VE.A (split) | [MajorKoos/KBDParts](https://github.com/MajorKoos/KBDParts/tree/ed2e077b5d48197960eebcc56915f465c7ebb3f7/Keyboard%20Cases/VE.A) | `ve-a/case/` (4 STL) | `ve-a/plate/` (2 STL, 1 DXF cho ALPS) | — |
| Cepstrum (split) | [keebio/cepstrum-case](https://github.com/keebio/cepstrum-case/tree/cda6cb2f461799549484790000f2561f840bdd29) | `cepstrum/case/` (4 STL) | `cepstrum/plate/` (2 DXF) | — (STEP PCB nén ZIP có ở nguồn, không lưu trong repo) |

Năm bộ thiết kế trong bảng đều dùng giấy phép MIT, bản sao nằm trong thư mục tương ứng. Tên file đã được rút gọn; bảng trên dẫn về nguồn gốc chính xác. PCB của Alice chỉ có đường viền DXF, không có model mạch 3D. PCB của Bakeneko là file thiết kế KiCad; cần xuất thành STEP hoặc mesh trước khi dùng trong React Three Fiber. PCB Cepstrum đã có STEP trong ZIP; mỗi ZIP chứa một file `.step` theo tên nửa trái hoặc phải. Các file STEP/DXF cũng cần chuyển sang mesh/GLB và căn lại đơn vị, trục, vị trí trước khi gắn vào scene.

## Alice / Arisu và bộ plate bổ sung

- `blossom-arisu/` có case hai mảnh STL, plate DXF, PCB STEP/KiCad và metadata layout Arisu. Bộ này theo giấy phép MIT; [nguồn và phạm vi sử dụng](blossom-arisu/SOURCE.md). Layout Arisu khác Alice đang có trong game nên chưa gắn trực tiếp vào scene.
- `keyboard-plate-files-4xgk3/` chứa ZIP đầy đủ bộ sưu tập plate từ GitHub và chín file Alice/60%/TKL tách sẵn. Plate 60% mặc định lấy cutout từ DXF; plate Alice dùng mesh GLB chuyển từ STEP. Chạy `bun run convert:plates` để tạo lại runtime assets. [Nguồn, commit và danh sách file](keyboard-plate-files-4xgk3/SOURCE.md).

## Cọ và lọ lube

- `brushes-polypizza/` có model cọ tròn đầu nhỏ **Round Brush** của Zsky (CC BY 4.0), đang dùng ở bàn lube và bàn mod stab; hai mẫu **Paint Brush Large** và **Fluffy Brush** của reyshapes (CC0) được giữ làm tham khảo. [Nguồn và ghi chú](brushes-polypizza/SOURCE.md).
- `lube-jars-innerscene/` có hũ GLB của Innerscene, giấy phép **CC0**. [Nguồn và cách dùng hiện tại](lube-jars-innerscene/SOURCE.md). Game đã có hũ lube dựng bằng code với tên dầu được hiển thị trên nắp.

## Dây stabilizer

`stabilizer-wires-koktoh/` có model STEP riêng cho dây **2u, 6.25u và 7u**, mỗi cỡ gồm bản `screw_in` và `plate_mount`. Xem [nguồn, tác giả và giấy phép](stabilizer-wires-koktoh/SOURCE.md) trước khi sử dụng. Bộ này có giấy phép **CC BY-NC-SA 4.0 (chỉ dùng phi thương mại)**, khác với năm bộ MIT ở trên; hiện chỉ lưu làm asset tham khảo và chưa đưa vào game.

## Switch và dụng cụ

- `switches-koktoh/choc-v2/` có 3 model STEP: đỏ **linear**, nâu **tactile**, xanh **clicky**. Đây là Kailh Choc V2, giấy phép **CC BY-NC-SA 4.0**, [xem nguồn và giới hạn dùng](switches-koktoh/SOURCE.md).
- `alps-switch-references/` có model Alps SKCM STL/OpenSCAD và bản vẽ Matias kiểu Alps STEP. Giấy phép và giới hạn tái phân phối khác nhau; [xem nguồn](alps-switch-references/SOURCE.md).
- `props-polyhaven/` có model GLB hộp đồ nghề (tham khảo); tua vít + thùng carton dùng trong game nằm ở `public/models/room/`. Giấy phép **CC0**, [xem nguồn chi tiết](props-polyhaven/SOURCE.md). Vít điện cầm tay và kìm cắt linh kiện được dựng trực tiếp trong game.
- `props-innerscene/` có model GLB kéo cắt, giấy phép **CC0**, [xem nguồn](props-innerscene/SOURCE.md).
- `screws-innerscene/` có ba model STEP ốc đầu côn chìm, đầu trụ lục giác và đầu tròn thấp; bản GLB chuyển đổi được game dùng ở `public/models/screws/`. Giấy phép **CC0**, [xem nguồn](screws-innerscene/SOURCE.md).
- `spring-containers-innerscene/` có hộp nhựa bản lề và khay nông STL; bản GLB đã đưa vào bàn lube ở `public/models/lube/`. Giấy phép **CC0**, [xem nguồn](spring-containers-innerscene/SOURCE.md).

## Keycap

`keycap-profiles/` chứa CAD cho **Cherry, OEM, SA, DSA, XDA, MT3, OPK** với giấy phép và nguồn riêng trong [SOURCE.md](keycap-profiles/SOURCE.md). Cửa hàng trong game có thêm lựa chọn **Cherry, OEM, SA, DSA, XDA, MT3, OPK, ASA**. Keycap 1u dùng GLB chuyển từ CAD gốc; phím rộng dùng mesh theo layout. ASA chưa có CAD gốc trong thư mục này.
