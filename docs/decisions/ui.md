# Giao diện

## 2026-10-24

### Component dùng chung (`src/components/ui/`)

- `Alert`: khung cảnh báo nổi bật (thiếu dụng cụ — ToolWarn; "khách dặn KHÔNG lube").
- `OptionChip`: kiểu nút game (dày, bóng đổ), đang chọn có viền vàng.
- `ModelViewerFrame`: khung xem 3D dùng chung. Đã **bỏ** prop `hint` và khung "Cách xem".
  Có prop `footer` (dãy nút ở đáy, vd chọn màu). Viewer có Environment + hemisphere + đèn hắt dưới cho sáng.
- `Toggle` thay checkbox; `HudPanel` / `HudSection` thu gọn được, nhớ trạng thái; `StepDot`.

### HUD bàn build

- Chữ hai cột HUD 14px (`text-sm [&_.text-xs]:text-sm [&_.text-base]:text-lg`).
- Khung hướng dẫn Objective thu gọn được (`useOpen('objective')`).
- ModRow: tên bước + lý do xếp dọc; nút "Làm" chỉ disabled, không ẩn.
- Panel lube: dòng thông tin switch lên đầu.

### Shopii

- Ẩn dụng cụ đã có (hoặc đã có bản tốt hơn, hoặc bút / trạm dự phòng trong `solderOwned`).
- Keycap: tên `PBT ${keycapKitShort(name)}`, badge profile vàng dưới trái, badge size (Base / Full) xanh dưới phải;
  bỏ chữ "CAD 1u / Dựng 3D".
- ShopProductViewer: `VIEW_SIZE` 4, camera [0, 5, 10], không pan, giới hạn góc polar.
- Case: khung xem chỉ hiện vỏ (`caseOnly` của `buildKeyboardModel` / `KeyboardViewer`).
- **Chọn màu ngay trong khung xem 3D**: ProductCard truyền `picker` (hàng OptionChip) → `ProductImage` →
  `ImageZoom` / `CaseViewer` → `footer` của ModelViewerFrame. Đồng bộ với lựa chọn trên thẻ; CaseViewer dựng lại khi đổi màu.

### App

- "Chi tiết đơn" (`apps/inventory/OrderApp.tsx`, icon `/icons/apps/clipboard-list.svg`, AppId 'order'):
  bảng đối chiếu dùng StepDot ✓; món thiếu không hiện dấu "—".
- "Kho" (`InventoryApp` → `OwnedItems`): ô kéo thả, ảnh model thật, có cả linh kiện của đơn đang làm.
- OrderSpec: KitBox xanh trên đầu, có bullet.

### Phím Fn

- Trình duyệt không nhận được Fn (firmware bàn phím xử lý). Hướng dẫn bước test ghi rõ: Fn / macro thì click phím 3D.

## 2026-10-24 (tối)

- Thêm `lucide-react`. `IconButton` (components/ui): nút vuông chỉ icon + tooltip dưới (`label`, `hint`).
  Thanh menu bàn build toàn icon: Monitor (về máy tính), FlipVertical2 (lật), Undo2, ScanEye (góc nhìn),
  Hand / Rotate3d (kéo / xoay), ListOrdered (danh sách đơn), PackageCheck (đóng gói). Bàn trống cũng dùng icon PC.
- `Badge`: tông nhạt (nền màu /15 + viền ring + chữ màu), có tone `orange`. `Chip` (tiền / uy tín) giữ khối màu đặc.
- `ChatBubble`: có `wide`, góc bo kiểu chat, hiện dần.
- `SoundBars`: rãnh chuyển màu, nút tròn = âm hiện tại, vạch vàng + vùng nhạt = âm khách muốn; `size="md"` cho máy đo
  ở bàn build (có tên thanh). `SoundMeter`: ô % khớp to (xanh ≥ 80, vàng ≥ 50, đỏ), "Đang nghe giống".

### Lặt vặt

- Thanh menu icon bàn build `z-[8]` (trên khung HUD 2 bên `z-[5]`) để tooltip không bị khung trái che.
- Bút rã hàn nằm trên bàn hàn (SolderKit) to lên: `PUMP_SCALE` 1.2 → 1.45, nâng y theo scale.
- Thanh tiến độ 1 màu theo mức (`progressTone`: < 34% đỏ, < 80% vàng, còn lại xanh); danh sách đơn xong 100% thì hiện
  `StepDot` ✓ "Đã build xong" thay cho thanh.
- `SoundBars` bỏ nút tròn và dải cầu vồng: 1 màu theo độ lệch với âm khách muốn (< 0.1 xanh, < 0.25 vàng, còn lại đỏ;
  không có mục tiêu thì xanh dương), vạch trắng = âm khách muốn. Ghi chú máy đo rút gọn còn "Vạch trắng = âm khách muốn".
- Danh sách đơn: card đơn đang làm nền xanh `bg-green/15` + `border-2 border-green/70` (viền vẽ bên trong card; `ring` cũ bị khung cuộn cắt), card khác `border-transparent` cho cùng cỡ.

### App "Chi tiết đơn" → "Danh sách đơn" (2026-10-25)

- App AppId `order` đổi tên "Danh sách đơn" (rộng 680), giao diện giống bảng danh sách đơn ở bàn build: dùng chung
  `OrderCard` + `useOrderEntries()` (`src/components/game/OrderCard.tsx`; thứ tự: đang làm → đã nhận gấp trước → đơn mới).
- Bàn build: card mở ra `OrderSpec` gọn; nút "Tiếp tục làm" / "Đổi sang làm tiếp" / "Nhận & build".
- App: card mở ra `OrderDetail` đầy đủ như app cũ (yêu cầu, đối chiếu linh kiện, mount, dự đoán âm thanh, ngân sách) cho cả
  đơn đang làm lẫn đơn đã nhận (dùng kho / mount của job, ctx dựng lại bằng `buildContext`); chỉ đơn đang làm chọn được mount.
  Nút: "Ra bàn build" / "Làm tiếp" (đang làm), "Đổi sang làm" (`switchJob`), "Nhận đơn" (`acceptOrder`). Đơn đang làm mở sẵn.
- Bỏ thanh `JobTabs` (đã thay bằng danh sách). Nút trong bảng thiếu đồ ở bàn build: "Mở danh sách đơn".
