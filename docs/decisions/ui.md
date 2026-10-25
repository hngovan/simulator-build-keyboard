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

- Thêm `lucide-react`. `IconButton` (components/ui): nút vuông chỉ icon + tooltip dưới chỉ 1 dòng `label` (đã bỏ dòng phụ `hint`; phím tắt ghi trong label, vd "Hoàn tác (Ctrl + Z)").
  Thanh menu bàn build toàn icon: Monitor (về máy tính), FlipVertical2 (lật), Undo2, ScanEye (góc nhìn),
  Hand / Rotate3d (kéo / xoay), ListOrdered (danh sách đơn), PackageCheck (đóng gói). Bàn trống cũng dùng icon PC.
- `Badge`: tông nhạt (nền màu /15 + viền ring + chữ màu), có tone `orange`. `Chip` (tiền / uy tín) giữ khối màu đặc.
  `Badge solid`: khối màu đặc + bóng đổ giống `Button` (màu chung `buttonTones.ts`), dùng ở card danh sách đơn (`OrderCard`).
- Mezzenger: badge trạng thái dùng `Badge solid`; câu trả lời nhanh `Reply` = `Button` cỡ thường + icon lucide
  (cùng kiểu "Kết thúc ngày"). Đầu cột chat: icon `CalendarDays` + badge "n đơn mới".
- `Slider` (components/ui): thanh kéo kiểu game: rãnh 10px nền trắng, phần đã kéo cam, núm trắng viền cam 20px có bóng đổ; dùng cho âm lượng ở Cài đặt.
- Mezzenger: đầu 2 cột cùng `h-14`, đáy 2 cột cùng `h-16` (đáy phải luôn có, không có nút thì hiện chú thích) để viền thẳng hàng;
  khung ngoài có viền `white/10`. Bong bóng chat `rounded-xl`, góc nhọn `rounded-*-sm` phía người gửi, tin khách viền mảnh.
- `Button` cỡ md bo `rounded-[10px]` (trước `rounded-xl`), bằng cỡ sm.
- Thanh "Đã chi linh kiện" (app Danh sách đơn): 1 màu, xanh khi trong ngân sách, đỏ khi lố (bỏ gradient).
- Taskbar máy tính: tooltip tên app 1 dòng phía trên icon (cùng kiểu tooltip `IconButton`, thay `title` mặc định của trình duyệt), ẩn khi đang kéo.
- Kho (`OwnedItems`): lưới ô cố định kiểu túi đồ game (4 cột, ≥ 12 ô, luôn dư 1 hàng trống, ô trống hiện khung lõm);
  kéo món thả vào ô bất kỳ, thả lên ô có đồ thì đổi chỗ. Vị trí ô lưu localStorage `sbk-ui-inventory-order` (mảng id / null).
- Cài đặt: **bỏ mục Ghi công** (người dùng yêu cầu); ghi công vẫn ở `public/CREDITS.md` + `src/data/credits.ts`.
- `CloseButton` (components/ui): nút đóng dùng chung, nền đỏ kiểu `Button`, icon lucide `X` căn giữa. Dùng ở
  `ModelViewerFrame`, ảnh phóng to Shopii. Thanh tiêu đề `Window` **không** dùng CloseButton: 3 nút thu nhỏ / phóng to / đóng cùng 1 kiểu phẳng
  (`TITLE_BTN`, icon lucide căn giữa), nút đóng chỉ đỏ khi rê chuột — người dùng muốn 3 nút đồng bộ.
- `TitleBar` + `TitleButton` (Window.tsx, export qua ui): thanh tiêu đề cửa sổ app dùng chung. Bảng Danh sách đơn ở bàn build
  (`OrderPicker`) dùng cùng thanh tiêu đề (màu `APPS.order.color`), chỉ có nút đóng (không thu nhỏ / phóng to).
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

### Thanh cuộn toàn app (2026-10-25)

- Thay scrollbar mặc định bằng thanh cuộn mảnh 8px, track trong suốt, thumb trắng mờ 20% bo tròn, hover ngả vàng nhẹ; style ở `src/index.css` (`scrollbar-width` / `scrollbar-color` cho Firefox + `::-webkit-scrollbar`).

### Mezzenger: bỏ nút xem chi tiết, tô chữ trong chat, hội thoại giao hàng (2026-10-25)

- Bỏ nút "💬 Cho shop xem chi tiết yêu cầu" (và bảng `OrderSpec` trong chat); 2 nút còn lại dồn sang phải (`justify-end`).
- "Nhận đơn": hiện tin của shop "Ok shop nhận đơn này nhé 👌" rồi 700ms sau mới `acceptOrder` (để thấy tin trước khi đơn rời danh sách).
- Đầu hội thoại `text-[13px]`; bỏ hàng badge (hạn / công / budget / thiết kế mở) vì tin nhắn khách đã có đủ.
  Thay vào đó `Highlight` (`messenger/highlight.tsx`) in đậm + tô màu chữ cần chú ý trong tin khách: tiền xanh lá,
  hạn / điều cấm đỏ, yêu cầu mạch hàn / hotswap / lube / stab cam, layout / switch / keycap / màu / mount / đồ kit vàng.
- Đơn đã đóng gói: cách nhận hàng cố định theo `order.id` (`delivery()` trong Messenger.tsx): 1/3 khách tự qua shop lấy
  (nút "🤝 Giao tận tay khách"), còn lại shop bấm "📍 Xin địa chỉ giao hàng" → khách gửi địa chỉ (6 địa chỉ mẫu) → "🚚 Gửi hàng".
  Tin nhắn chỉ trong phiên; đơn đã gửi luôn hiện lại đủ đoạn hỏi địa chỉ.
- Cùng lúc có phiên khác sửa Messenger (icon lucide, đánh giá khách `reviews`) — không đè phần của họ.

### Tooltip toàn app (2026-10-25)

- Rà `src/features/**` + `src/components/**`, thêm `title` tiếng Việt cho phần tử tương tác còn thiếu tooltip:
  - `components/ui/HudPanel.tsx`: nút thu gọn / mở mục `HudSection`.
  - `components/ui/Slider.tsx` + `features/apps/settings/SettingsApp.tsx`: thanh kéo âm lượng (thêm prop `title`, truyền xuống `input`);
    title "Chỉnh âm lượng: ...".
  - `components/game/OrderCard.tsx`: phần đầu card bấm để mở / thu gọn chi tiết đơn (kèm mũi tên).
  - `features/apps/shop/ProductCard.tsx`: nút "i" xem mô tả sản phẩm.
  - `features/apps/shop/ProductImage.tsx`: badge profile keycap (Cherry / OEM...) và badge cỡ bộ Base / Full.
  - `features/apps/reviews/ReviewPops.tsx`: nút X ẩn thông báo đánh giá.
  - `components/ui/ArtCard.tsx`: thẻ dụng cụ bấm mua / dùng máy (title theo hành động, vd "Mua 300k").
- `IconButton`, `Toggle`, `CloseButton`, `TitleButton` / `HudPanel` đã có tooltip hoặc `title` sẵn nên không đổi; nút có chữ rõ nghĩa
  (nhận / huỷ / mua...) cũng bỏ qua.

### Màn hình đăng nhập (2026-10-25)

- Nhân vật `SolderingScene` (SVG low-poly + SMIL, theo ảnh mẫu người dùng: tóc nâu, áo xanh, quần cam): giơ 2 tay như doạ,
  tay trái cầm bàn phím, tay phải cầm bút hàn (mũi nháy, khói bay), 2 tay vung ngược pha, người nhún.
- Icon ⌨️ nhún nhảy lơ lửng bên phải chữ SIMULATOR, nghiêng 12° (định vị absolute để tên game vẫn căn giữa).
- Góc dưới: `v{__APP_VERSION__}` (vite.config `define` lấy `version` từ package.json, tsconfig `resolveJsonModule`) +
  icon Facebook tác giả (nền xanh FB đặc, chỉ icon) → https://www.facebook.com/mn.HoangEt.

### Kho: xem 3D từng món + bộ lọc icon (2026-10-25)

- `OwnedItems`: bấm 1 ô mở khung xem 3D (`ItemViewer`: case dùng `CaseViewer`, món khác `ShopProductViewer` như Shopii),
  chân khung ghi nhóm + "Đang dùng" + số lần còn (`remainText`). Hover ô hiện icon kính lúp; title ô = tên · nhóm · còn lại.
- Bộ lọc icon lucide tối giản góc phải tiêu đề (Tất cả / Linh kiện / Dụng cụ / Lube & vật tư, lọc theo tiền tố id `part:` / `tool:` /
  `supply:`), mỗi nút có tooltip kèm số món. Đang lọc thì chỉ hiện món khớp, tắt kéo thả (thứ tự ô vẫn giữ).
- Rà tooltip: phần lớn giao opencode (mục "Tooltip toàn app" ở trên); thêm nút chọn đầu vít `BitPicker` ("Lắp đầu vít …").

### Emote ếch trong tin nhắn (2026-10-25)

- Người dùng muốn icon trong tin nhắn là emoji ếch xanh meme tải trên mạng → 11 emote Pepe từ FrankerFaceZ (`scripts/fetch-emotes.mjs`).
- `messenger/emotes.tsx`: `EMOTE_OF` (emoji → emote: 👌 FeelsOkayMan, 🙏 Prayge, 😒😤 peepoMad, 😕 Sadge, 📦 peepoHappy,
  🛵🚚 peepoRun, 😍 peepoLove, 😮‍💨 peepoSad, 😂 pepeLaugh, 😨 monkaS...), `withEmotes()` thay đệ quy trong cây phần tử.
  Dùng ở `ChatBubble`, chữ thường trong `Highlight`, dòng tin cuối ở danh sách hội thoại. Thêm emoji mới vào chat thì thêm vào `EMOTE_OF`.

### Tooltip dùng chung, nhãn "Xem 3D", badge độ bền trong Kho (2026-10-25)

- `components/ui/Tooltip.tsx`: `Tooltip` (kiểu tooltip thanh menu bàn build, vẽ qua portal `fixed` nên không bị khung cuộn / cửa sổ cắt;
  bọc `display: contents`, đo phần tử con) + `ViewHint` (hover góc ảnh: chỉ icon kính lúp lucide `ZoomIn` trong chấm tròn mờ, phóng nhẹ; bản đầu có chữ "Xem 3D" kèm icon xoay 3D → người dùng thấy phèn, bỏ chữ).
- Bỏ icon kính lúp (🔍 / ⌕ / lucide Search) ở Kho, Shopii (ảnh case + `ImageZoom`), ảnh đơn Mezzenger → `ViewHint`.
- Kho: bộ lọc + ô đồ dùng `Tooltip` (ô chỉ hiện tên đồ). Ô đồ chỉ còn tên (bỏ dòng nhóm / "Đang dùng"; đang dùng = viền xanh).
  Độ bền / số lượt / số switch = badge tròn có số ở góc trên trái ảnh: xanh lá > 50%, vàng ≤ 50%, đỏ ≤ 10%, xanh dương = đếm không có tối đa.
  Khung xem 3D vẫn ghi đủ nhóm + còn bao nhiêu.
- Bộ lọc Kho dùng `OptionChip` (nút khối 32px, bóng đổ, đang chọn viền + icon vàng) thay thanh nền tối `bg-black/25` (người dùng thấy lệch style).
- Ô Kho vuông (`aspect-square`), ảnh `flex-1` lấp chỗ trống (bỏ cao cố định 80 / 164px), tên 1 dòng `truncate`, tên đầy đủ ở tooltip.

### App Đánh giá cỡ chữ, khung xem case rỗng (2026-10-25)

- Đánh giá (`apps/reviews`): chữ chính (tên khách, lời đánh giá) 14px, chữ phụ (ngày · loại, ±uy tín, số đánh giá, nút lọc, trống) 13px.
- Khung xem case Shopii / ảnh case: case dựng bằng code (không GLB, vd Tofu60 Redux) trước là 1 RoundedBox đặc → nhìn như
  khối phẳng không chiều sâu. `buildKeyboardModel(..., caseOnly)` giờ dựng khay rỗng: tấm đáy (vật liệu đáy) + 4 thành dày
  `CASE_WALL` cao tới `Y.caseTop` như bàn build. Ảnh bàn phím đầy đủ (có keycap) vẫn dùng khối đặc.
- `Tooltip` / `ViewHint`: phiên khác cũng tạo `components/ui/Tooltip.tsx` cùng lúc → đã gộp (nhận cả `content` / `label`, portal,
  `hidden`); `ViewHint` tách file riêng `components/ui/ViewHint.tsx`.
- `StatusChips` (tên / tiền / uy tín / ngày): icon lucide có màu thay emoji, chip tên nền tím `Chip tone="name"`; mỗi chip có
  `Tooltip` (taskbar `tipSide="top"`). `Tooltip` (ui, của phiên khác, vẽ qua portal) nhận `content` hoặc `label` + `hidden`.
- `ModelViewerFrame`: thanh tiêu đề dùng `TitleBar` + `TitleButton` như cửa sổ app (màu `color`, mặc định `#4a5670`), dòng phụ
  nhỏ ngay cạnh tiêu đề, khung viền giống `Window`. Kho: chân khung xem 3D bỏ tên nhóm (trùng tiêu đề).
- Đổi màu case trong khung xem không còn đóng / mở lại khung: `ProductImage` giữ nhánh case khi `viewing` (ảnh màu mới chưa
  chụp xong), `KeyboardModel` giữ model cũ tới khi model mới dựng xong.
- `OrderCard`: badge thời gian `TimeBadge` (icon Clock) cạnh tên: đơn mới "N ngày" (xanh dương); đã nhận "còn N ngày" (xanh),
  còn 1 ngày / hạn hôm nay (vàng), "trễ N ngày" (đỏ). Dòng phụ = nhãn mờ + giá trị đậm (Layout, Công xanh, Budget, Hạn);
  dòng trạng thái đậm phần chính (% build, món thiếu).
- `GlobalTooltip` (ui, gắn 1 lần ở App): mọi phần tử có `title=` trong toàn app hiện tooltip kiểu game (nền tối chữ đậm,
  ưu tiên phía trên, sát mép trên thì lật xuống) thay tooltip mặc định trình duyệt; chỉ 1 dòng chữ chính, không dòng phụ.
  Đã rút gọn các title dài (bộ keycap, mỏ hàn chưa có), bỏ title mô tả trên chip option Shopii (mô tả đã hiện trên card).
- Danh sách đơn (app + bàn build) **chỉ đơn đã nhận**: bỏ đơn mới / nút "Nhận & build"; nhận đơn chỉ ở Mezzenger.
  Trống thì có nút "Mở Mezzenger".
- `StatusChips`: chip tiền / uy tín là `InfoChip` (bấm mở bảng, bấm ra ngoài / Esc đóng; taskbar mở lên trên).
- Kho: bỏ chú thích cạnh tiêu đề "Đồ trong kho"; bộ lọc hiện icon + số món luôn (tooltip chỉ tên bộ lọc).
- `CamModeButton` (bench): nút kéo ↔ xoay khung nhìn + phím H dùng chung cho bàn build và **bàn trống** (trước bàn trống
  không có nút / phím H); `ResetCamButton` "Góc nhìn mặc định (R)" + phím R ở cả 2 màn (bàn trống trước không về góc:
  `EmptyBench` giờ nghe `camKey`). Phím tắt camera bỏ qua khi đang gõ ô nhập hoặc ở bước test.

### Mobile + cửa sổ phóng to (2026-10-25)

- `useNarrow()` (`hooks/useNarrow.ts`, < 768px). `Window`: mobile luôn phủ kín màn (không kéo, ẩn nút phóng to); phóng to / mobile chừa
  taskbar qua biến CSS `--taskbar-h` (58px, mobile 100px), không còn che taskbar. Vùng nội dung cửa sổ là `@container` + `group/win`
  - `data-fill` (phóng to / mobile) để app tự đổi bố cục / giãn kín chiều cao (`group-data-fill/win:h-full`).
- Taskbar mobile 2 hàng: chip trạng thái (bỏ chip tên + đồng hồ + nút KeebOS) trên, icon app cuộn ngang dưới. Desktop mobile: lưới 4 cột,
  icon Bàn build nằm chung lưới.
- Mezzenger: cửa sổ hẹp (`@max-xl`) 1 cột — danh sách ↔ khung chat, nút ← quay lại. Kho: cửa sổ rộng `@3xl` 6 cột, số ô bội 12.
- HUD bàn build mobile: panel mặc định thu gọn (chưa từng bấm), cột trái hẹp `min(240px, 100vw−24px)`, chữ 13px.
- Chip Ví / Uy tín: rê chuột hiện luôn bảng giải thích (rời chuột 200ms mới đóng, di vào bảng vẫn giữ), bấm để ghim (cảm ứng);
  mobile bảng nổi giữa màn sát taskbar.
- `Alert`: icon lucide `TriangleAlert` thay emoji ⚠️; banner cảnh báo Hội Phím Cơ dùng `Alert tone="yellow"` (tiêu đề + dòng giải thích).
- Shopii: tên switch kèm loại ("Switch Cherry Xanh · Clicky") — người dùng không nhận ra có switch Clicky (chỉ 1 mẫu Cherry Xanh). (2026-10-25)
- Bàn lube: bỏ khay switch in 3D (`SwitchLubeStation` + `switchLubeStationModel.ts`, module Fonz) theo yêu cầu người dùng; ghi công Fonz
  ghi chú "đã bỏ". Script `convert-lube-station.mjs` + GLB giữ lại.
- Shopii: tên switch chỉ còn tên (vd "Cherry Đen"), loại switch thành nhãn vàng góc dưới trái ảnh (`Product.badge`, ProductImage);
  dãy chọn trong khung xem 3D chỉ hiện khi option có ≥ 2 màu (switch 10/70/90/110 con cùng màu thì không). opencode hết lượt
  miễn phí nên tự làm.
- Shopii ảnh stab dùng housing theo kiểu lắp như bàn build (`HOUSING_GLB` export từ Stabilizer.tsx: clip-in / plate-mount, screw-in
  dùng CAD gốc), vẽ 2 mặt. Trước đó model stab mới chỉ gắn vào bàn build nên shop vẫn hiện housing cũ (2026-10-25).
- Stab plate-mount (2026-10-25): `stab-plate.glb` thủng thành dưới vì thân dưới 2 housing nằm trong `Object_6` của file gốc
  (script tưởng là dây) → `convert-stab-variants.mjs` gộp tam giác Object_6 trong bề ngang housing trái. Dây nằm ngoài rãnh giữ dây
  của housing này → `WIRE_SEAT.plate = [−1.86, −2.28]` mm (Stabilizer.tsx, dùng ở bàn build + ảnh Shopii; trạm mod stab chưa dời).
- Shopii: khung xem 3D hiện dãy chọn khi option khác màu **hoặc** khác loại (stab Cherry clip / screw / plate cùng màu trước không đổi được).
- Thanh âm thanh thẻ Shopii (2026-10-25): `SoundBars` size sm không có âm khách muốn → thanh mảnh 7.5px (75% của 10px), mỗi thanh
  1 màu riêng (Độ ồn cam, Cao độ xanh ngọc), bỏ chữ Êm / Ồn / Trầm / Giòn; chú thích `SoundLegend` ở góc trên lưới sản phẩm
  (chỉ khi mục có thanh âm thanh). Bàn build + app Danh sách đơn (có vạch âm khách muốn) giữ kiểu cũ.
- Mezzenger (2026-10-25): bấm ảnh đơn để xem 3D làm khung chat cuộn xuống cuối — effect cuộn phụ thuộc object hội thoại `t`
  (dựng lại mỗi render). Đổi sang `threadKey = order.id:kind` (`ChatView`, Messenger.tsx).
- Thanh tiến độ "Hàn switch" (2026-10-25): 1 màu xanh (`tone="green"`, như thanh mở / lube switch), bỏ dải chuyển xanh → vàng.

### Cài đặt: tiền vô hạn khi dev (2026-10-25)

- Yêu cầu: nút bật tiền vô hạn trong Cài đặt, chỉ có ở môi trường dev, bản deploy phải ẩn.
- `features/apps/settings/devMoney.ts`: `setDevMoney(on)` — bật thì nhớ số tiền cũ, subscribe store bơm ví về 999.999.999 mỗi
  khi tiêu; tắt thì trả lại số tiền cũ. Không lưu vào save (tải lại trang là tắt).
- `SettingsApp`: panel "Dev" render trong `import.meta.env.DEV && ...` → `vite build` loại bỏ hẳn (đã build thử, không còn
  chữ "Tiền vô hạn" trong bundle).
- Toast (2026-10-25, "message thông báo ko gạch đầu dòng, cho xuống dòng"): `Toasts.tsx` tách chữ tại " — " / "\n" thành từng
  dòng (`lines`), viết hoa chữ đầu dòng sau — áp cho mọi thông báo, không sửa từng câu trong store.

### Bộ lọc Shopii: case / switch / dụng cụ (2026-10-25)

- Yêu cầu: Shopii mục Case, Switch, Dụng cụ có bộ lọc giống Kho.
- `features/apps/shop/shopFilters.ts`: case theo form factor (`CASES[id].ff`, nhãn 40% / 60% / … / TKL / FRL / Full / Alice / Planck),
  switch theo loại (`badge` Linear / Tactile / Clicky / Silent), dụng cụ theo nhóm Hàn / Lắp ráp / Mod & lube (`p.tool.kind`); chỉ hiện
  nhóm có sản phẩm, chip "Tất cả" đầu tiên.
- `Shopii.tsx`: hàng `OptionChip` (tên + số sản phẩm khớp, tính sau bộ lọc layout / đồ đã có) trên lưới; bộ lọc gắn với mục,
  đổi mục thì về "Tất cả". Định giao opencode nhưng opencode hết lượt miễn phí trong ngày → tự làm.
