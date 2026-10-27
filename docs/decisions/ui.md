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
- Lịch sử cập nhật (2026-10-25): số phiên bản góc dưới màn hình tiêu đề thành nút (gạch chân chấm), bấm mở `Changelog`
  (`features/title/Changelog.tsx`: TitleBar + danh sách phiên bản / ngày / commit / các ý, bản mới nhất chữ vàng).
- Màn chờ tải cảnh 3D (2026-10-25, "bỏ khung viền nhiều màu, chỉ hiện chữ và icon"): `BenchLoader` bỏ khung viền vàng + nền +
  thanh tiến độ chuyển màu, chỉ còn icon ⌨️, dòng chữ trạng thái và số % (đổ bóng nhẹ cho dễ đọc trên cảnh 3D).

### Bảng xếp hạng (2026-10-25)

- App "Bảng xếp hạng" (`features/apps/leaderboard/LeaderboardApp.tsx`, icon `trophy.svg`, AppId `leaderboard`): game offline nên so
  shop người chơi với 9 shop đối thủ giả lập (`data/leaderboard.ts`, `RIVALS`: đơn / ngày, chất lượng sao, tiền công, số ngày mở trước).
- Chỉ số đối thủ tất định: seed cố định + hash (đối thủ, ngày) → mỗi ngày số đơn / sao / tiền; `rivalsAt(day)` cộng dồn tới hết hôm qua, không lưu.
- Tiêu chí Uy tín / Đơn đã giao / Tiền (ví hiện tại) / Sao TB (đánh giá `kind: 'ship'`); dòng người chơi viền vàng + "Bạn",
  đầu bảng hiện hạng + "Cần thêm X để vượt Y"; đối thủ có ▲/▼ thay đổi hôm qua.
- Chữ phụ khó đọc (2026-10-25, người dùng yêu cầu): dòng "N đơn · uy tín · sao" và dòng chú thích đáy bỏ `Muted` 12px (`text-muted`)
  → `div` `text-[13px] text-ink/75` (không bọc `Muted` vì `cn` không gộp class, `text-muted` có thể đè màu). Chú thích đáy đổi thành
  "Cập nhật lần cuối: cuối ngày {day − 1}" (ngày 1: "đầu ngày 1") — game không có giờ, chỉ số đối thủ đổi khi qua ngày.
- Viền vàng dòng "Bạn" bị cắt (2026-10-25): danh sách `overflow-y-auto` cắt `ring` vẽ ra ngoài → thêm `ring-inset`.

### Nhạc nền xoay 3 bài (2026-10-25)

- Thêm `bgm-2.mp3` (Chill lofi inspired, omfgdude) và `bgm-3.mp3` (A cup of tea, TAD), CC0 từ OpenGameArt, MP3 160 kbps, hạ âm lượng
  cho đều với `bgm.mp3` (~−21 dB). `src/sound.ts`: `BGM_URLS` + `pickTrack()` ngẫu nhiên, không lặp bài vừa nghe (`lastTrack`);
  mỗi bài phát 1 lần, `onended` → `playNext()`; tải lười + cache (`tracks`), bài lỗi vào `badTracks`. Loop ambient chỉ khi không tải được bài nào.
  Nguồn ở `public/audio/README.md` + `credits.ts`.
- Mô tả PCB Hotswap (2026-10-25, người dùng yêu cầu): `PCB_TYPES.hotswap.desc` "Cắm switch vào socket, không cần hàn" → "Dùng để cố
  định switch với PCB".

### Thông báo góc phải trên (2026-10-25, "noti đang chưa fix góc trên cùng")

- `ReviewPops` trước ở `fixed top-28` z 1000 → bị popup inbox (z 2000) che và không sát góc. Giờ `fixed top-3 right-3 z-[3000]`,
  hiện cả thông báo hệ thống (`notices` / `notify(title, text)` trong metaSlice, khung đỏ) lẫn đánh giá mới.
- Shopii không có sản phẩm (2026-10-25, "thêm icon hết hàng chính giữa"): thay dòng chữ xám bằng khối giữa khung sản phẩm
  (lưới `relative`, khối `absolute inset-0`, `pointer-events-none` để không chặn chip lọc): icon `PackageX` + "Hết hàng" +
  "Không có sản phẩm phù hợp".
- Badge đồng bộ (2026-10-25, "bảng xếp hạng sửa lại badge cho đồng bộ với style hiện tại như button"): "Ngày N" và "Bạn" ở Bảng xếp hạng,
  "Khách gửi" ở Chi tiết đơn đổi sang `Badge solid` (khối màu giống `Button`, như Mezzenger / OrderCard / PostCard). Quy ước ghi trong CLAUDE.md:
  badge luôn `solid` + tone trong `BUTTON_TONES`.
- Bảng xếp hạng bỏ ô avatar tròn (`Avatar small`) ở mỗi dòng, chỉ còn huy chương / số hạng + tên (bỏ luôn field `avatar` trong data).
- Tên ô switch / stab trong Kho bỏ số lượng ("Cherry Đen × 450" → "Cherry Đen", "Stab X (4 ngắn + 1 dài)" → "Stab X") vì badge góc ô
  đã hiện số con / số cái (`partOwned` trong OwnedItems).
- Hội Phím Cơ, số like / bình luận khó đọc (2026-10-26, người dùng yêu cầu): `PostCard` bỏ `Muted` (text-xs text-muted) + emoji 👍💬 →
  icon lucide `ThumbsUp` (xanh dương) / `MessageSquareText` (xanh lá), chữ `font-head text-sm font-bold text-ink/85`.

### Shopii: dropdown option, nút mua khi rê, stab theo kiểu gắn, preview stab dài (2026-10-26)

- Mọi thẻ sản phẩm chọn option bằng ô đổ xuống `OptionSelect` (components/ui, cùng kiểu khối OptionChip, mỗi dòng kèm giá) thay hàng OptionChip
  ("tất cả đều đổi thành option cho gọn"). Khung xem 3D vẫn dùng OptionChip làm picker; bộ lọc mục Shopii vẫn là chip.
- Nút "Mua ngay" luôn hiện (đã thử chỉ hiện khi rê chuột, người dùng bảo đổi lại luôn hiện).
- Stab: badge số stab theo cỡ (`4× 2u`, `1× 6.25u`, `1× 7u`) nổi góc trên phải ảnh (`ProductImage` prop `tags`), không còn ở dưới thẻ.
  Stab Cherry tách 3 sản phẩm như các hãng khác; kiểu gắn (`STAB_MOUNTS`: Clip-in / Screw-in / Plate-mount) là nhãn vàng góc ảnh (`Product.badge`)
  - bộ lọc mục Stab (`shopFilters`). Option chỉ còn "Bộ TKL / Lẻ 2u / Lẻ 6.25u / Lẻ 7u".
- Ảnh preview stab theo option: lẻ 6.25u / 7u chụp dây dài (`stabThumbType` trong ProductImage → khoá "loại:6.25u" / "loại:7u";
  `buildScene` dùng `wire625`, 7u kéo giãn tới slider 57.15mm `STAB_SPAN_MM`). Đã chụp kiểm tra headless (playwright, swiftshader).
- Thanh trên Shopii (2026-10-26, "filter phải fixed ở top", "hiển thị filter option", "tất cả các mục đều có filter"): bộ lọc là `OptionSelect`
  (mỗi dòng kèm số sản phẩm) góc phải; chú thích âm thanh `SoundLegend` bên trái (`md:mr-auto`); cả thanh `sticky -top-3.5` + `bg-panel`, bù
  padding thân Window nên không cuộn theo. `shopFilters` có nhóm cho mọi mục: case (cỡ), PCB / plate (layout), stab (kiểu gắn), switch (loại),
  keycap (profile), lube & vật tư (`supplyGroup`: thiếc / lube switch / lube stab / dầu lò xo / khác), dụng cụ (việc dùng); mục còn lại
  (chứng chỉ, sách phép) lọc theo từng sản phẩm (`groupBy`).
- Khung xem 3D stab luôn có hàng chọn option (Bộ TKL / Lẻ 2u / Lẻ 6.25u / Lẻ 7u) như đổi màu keycap: trước picker chỉ hiện khi option khác
  màu / loại nên stab (cùng màu, cùng loại) không đổi được (`ProductCard` picker: `product.cat === 'stab' ||`). Đã chụp kiểm tra Lẻ 7u.
- Toggle Shopii "Chỉ hiện đồ hợp layout đơn" → "Chỉ hiện đồ hợp đơn" (2026-10-26, keycap trước không lọc được vì mọi bộ đều đủ layout):
  `fitsOrder` (Shopii.tsx) = đúng layout + keycap đúng profile khách đặt + switch `switchFits`; `fitOptions` keycap chỉ còn option đúng
  chất liệu + màu. Thẻ đổi `key` theo trạng thái lọc để chọn lại option đầu.
- App Đánh giá: dòng "n đánh giá · uy tín x" (Muted) → 2 `Badge solid` (xám số đánh giá, vàng / đỏ khi âm uy tín).
- Shopii gộp case cùng dòng (2026-10-26, người dùng: "chỉ có 1 tên case duy nhất và có option để chọn chất liệu chứ ko phải tách ra"):
  `CASE_LINES` (parts.ts) = tên dòng + [id case, nhãn chất liệu] (Case 60% / 40% / 75% / TKL / FRL / Full, 4HEAD, Repent75, Exodus80);
  id case giữ nguyên (bản lưu, đơn, model CAD), case không thuộc dòng nào đứng riêng. `buildCatalog`: 1 sản phẩm / dòng
  (`case-<id đầu dòng>`), option = chất liệu × màu, `ProductOption.group` = chất liệu, `hint` = mô tả riêng từng chất liệu. 39 → 23 sản phẩm.
  `ProductCard`: có `group` thì 2 ô đổ xuống (chất liệu → màu), đổi chất liệu giữ màu nếu có; chip màu trong khung 3D chỉ hiện màu của chất
  liệu đang chọn. Shopii `fitsOrder` (đơn đòi `caseId`) xét theo option, `fitOptions` bỏ chất liệu không vừa layout / không phải con
  khách đòi rồi lọc màu; `shopFilters.ffOf` lấy cỡ theo case của option đầu. Tên đầy đủ từng case (`CASES[id].name`) vẫn dùng ở đơn / kho.
- Tên case gọn + nhãn cỡ (2026-10-26, người dùng: "Catto RF v4 (TKL) => Catto RF, còn lại nếu ex 40% thì thêm badge lên card ảnh"):
  đổi tên `cattoRF` → "Catto RF", `rfBruh` → "RF Bruh", `dualityHorns` → "Duality Horns", `aliceAlu` → "Blossom" (bỏ cỡ trong ngoặc).
  Mọi sản phẩm case Shopii có `badge` = cỡ (`FF_BADGE` trong parts.ts: 40% / 60% / TKL / Full...) ở góc ảnh như nhãn loại switch.
  Tên dòng case chung ("Case 60%"...) giữ cỡ trong tên vì không có tên riêng nào khác để phân biệt.
- Nhãn ảnh keycap đè nhau ở chợ (2026-10-26, người dùng: "ở trong chợ phím cơ hiển thị badge bị đè lên nhau vì khung quá nhỏ"):
  `ProductImage` nhánh keycap gom nhãn profile + chất liệu vào 1 hàng flex `flex-wrap-reverse` ở đáy ảnh (thay 2 nhãn neo
  cứng 2 góc): khung 90px của bài chợ không đủ chỗ thì nhãn chất liệu lên dòng trên, bên phải. Nhãn chất liệu dùng tên ngắn
  PBT / ABS / MIX (tên đủ "Mix PBT + ABS" ở tooltip) vì tên dài bị gãy dòng che kín ảnh. Không ẩn nhãn vì vẫn vừa.
- Ô số lượng Shopii (2026-10-26, người dùng: "không có ô để tăng giảm số lượng or nhập số lượng để mua ?"): component mới
  `QtyInput` (`components/ui`, nút − / + kiểu `Button` + ô gõ số, kẹp 1–99). `ProductCard` chỉ hiện cho món cộng dồn được
  (`STACKABLE`: switch / stab / vật tư / sách phép), giá hiện = giá option × số lượng; `onBuy(product, opt, qty)`.
  Shopii nhân trong 1 lần mua: vật tư / phép `buySupply(id, n × qty)`, switch `count × qty`, stab nhân từng cỡ dây (`multiply`).
  Case / PCB / plate / keycap / dụng cụ / chứng chỉ mỗi đơn chỉ cần 1 nên không có ô.
- Tối ưu điện thoại (2026-10-26, người dùng: "tối ưu lại ui dùng cho màn hình điện thoại"). Chụp 390×844 + 1280×800 bằng Chrome headless
  (CDP, gọi `window.__game`) trước / sau khi sửa. Đã sửa:
  - Taskbar (`desktop/Taskbar.tsx`): trước cuộn ngang, icon cuối (Cài đặt) bị cắt → mobile icon co đều `flex-1` (34–42px, `aspect-square`)
    đủ mọi app trên 1 hàng.
  - Hộp thoại kiểu `w-[Npx] max-w-full` trong lưới `place-items-center` bị tràn (cột lưới giãn theo N px nên max-w-full vô dụng) → đổi thành
    `w-[min(Npx,100%)]`: `OrderPicker` (EmptyBenchHud, Danh sách đơn tràn mép phải), `ConfirmDeliver` (BenchHud), `ConfirmBankrupt`
    (SettingsApp), `GameOverDialog`.
  - Bàn build trống: thanh trên thêm `max-md:flex-wrap` như bàn build có đơn (chip "Ngày" bị cắt).
  - Thẻ mục tiêu dưới đáy (`Objective`, BenchHud): mobile trải hết bề ngang, tên bước 1 dòng (trước bị bóp 3 dòng), hint chữ nhỏ hơn, ẩn
    mẹo chuột / phím. Cột HUD trái mobile 240 → 280px (bảng đơn bớt xuống dòng).
  - Mezzenger: 2 nút trả lời chia đều 1 hàng, nút từ chối mobile ghi "Từ chối đơn" (desktop giữ "Xin lỗi, shop không nhận được").
  - Còn lại chưa sửa (ngoài phạm vi UI 2D): camera bàn build trên điện thoại quá gần, bàn phím tràn 2 bên (`src/scene`).

### Xem trước khi gửi link (Open Graph / SEO) (2026-10-26)

- Yêu cầu: "hiển thị banner khi gửi link game, hiện tại gửi link chỉ hiện mỗi đường dẫn".
- `index.html`: `<title>` + `description`, `og:*` (type / site_name / locale vi_VN / url / title / description / image + kích thước + alt),
  `twitter:card = summary_large_image`, `canonical`, `theme-color`. Ảnh phải là URL tuyệt đối → ghi thẳng
  `https://simulator-build-keyboard.vercel.app/` (đổi domain thì sửa cả các thẻ).
- Ảnh `public/og-image.jpg` 1200×630: dựng bằng trang React tạm (nhân vật `SolderingScene`, chữ tiêu đề như màn hình chính,
  ảnh demo ban-lube + han-switch nghiêng, nút "Chơi miễn phí trên web"), dựng ở 2× rồi chụp từng mảnh PNG ở trình duyệt Orca, ghép + thu nhỏ trung bình vùng (giải mã PNG bằng zlib, mã hoá `jpeg-js` q92; bản đầu chụp JPEG 1× bị mờ);
  trang tạm đã xoá. Muốn làm lại thì dựng lại tương tự.
- Facebook / Zalo lưu đệm bản xem trước cũ: dùng Facebook Sharing Debugger ("Scrape Again") để làm mới.

### Esc, cửa sổ sát mép trên, Cài đặt mới, Keeb-chan (2026-10-26)

- Esc mở Cài đặt (đang mở trên cùng thì đóng): `hooks/useAppShortcuts.ts`; bỏ qua khi gõ chữ, bước test (Esc là 1 phím test), có popup
  (`[class*="z-[3500]"]` / `z-[4000]` / `[role=dialog]`). Ở bàn build thì về máy tính rồi mở.
- Mọi app mở ở `y: 12` (Desktop `initial`), chỉ lệch ngang; trước đây `20 + i * 26` nên app cuối danh sách mở thấp.
- Cài đặt: khối "Tiến trình" trên cùng = Phá sản (đỏ, trái) + Lưu tiến trình (xanh, phải, `saveRun`). Ghi chú "lưu cùng tiến trình" /
  "không hoàn tác được" / câu giải thích phá sản gói vào icon "!" (`Heading info`, tooltip `title`). Về màn đăng nhập mà tiến trình
  chưa lên bảng xếp hạng thì hỏi (`ConfirmExit`: Ở lại / Thoát không lưu / Lưu & thoát).
- Đóng tab: trình duyệt không cho hộp thoại tuỳ chỉnh lúc tắt trang, nên `pagehide` tự gửi tiến trình bằng `navigator.sendBeacon`
  (`beaconRun`) thay vì hỏi.
- NPC hướng dẫn Keeb-chan (yêu cầu: "gái anime 2D", ảnh tham khảo Typewriter-chan chibi): vẽ SVG `GuideGirl` chủ đề bàn phím (mái đen,
  tóc kem 2 bên, băng đô hàng keycap, tạp dề in keycap, mắt nhắm ":3"). `GuideNpc`: máy tính góc phải trên taskbar, bàn build góc trái dưới;
  Hiểu rồi / Thu nhỏ / Tắt hướng dẫn; bật lại + xem lại mẹo ở Cài đặt (`GuidePanel`).

- Sửa (2026-10-26): bỏ hẳn tuỳ chọn tắt hướng dẫn (người dùng: "tắt rồi mở lại kiểu gì, bỏ option tắt đi"): bỏ `guideOff` / `setGuideOff`, bong bóng chỉ còn Thu nhỏ / Hiểu rồi, Cài đặt còn nút "Keeb-chan nhắc lại mẹo từ đầu".

### Keeb-chan hội thoại ở bàn build, ô trống "Bài của tôi", tab Hội Phím Cơ dính trên (2026-10-26)

- Người dùng: "nhân vật 2d hướng dẫn build phím sẽ có hội thoại hướng dẫn build khi vào bàn build... góc bên phải or trên cùng"
  (ảnh mẫu: khung thoại tối, tên nhân vật, "▼ Nhấn để tiếp tục"). `features/guide/BenchDialog.tsx` + `benchLines.ts`: lần đầu vào bàn
  (`INTRO`, `guideSeen` `bench:intro`) và lần đầu gặp mỗi bước (`STEP_LINES[step]`, `step:<id>`) hiện hội thoại nhiều câu; chữ chạy
  từng ký tự, bấm = hiện hết / câu sau. Không có "Bỏ qua" (người dùng: "ko có nút bỏ qua, chỉ có nút thu nhỏ lại"):
  "Thu nhỏ" hoặc bấm nhân vật → avatar tròn chấm đỏ góc phải dưới, bấm mở lại đúng câu đang dở; sang tình huống mới thì tự mở lại. Giữa trên màn hình (dưới thanh nút), khung thoại + Keeb-chan bên phải
  (người dùng: "đoạn hội thoại phải nằm ở góc trên màn hình chính giữa"); bước vặn vít hạ xuống `top-[136px]` tránh `BitPicker` giữa trên. `GuideNpc` giờ chỉ ở máy tính; bỏ mẹo `bench` / `solder` / `test`
  trong `TIPS` (gộp vào hội thoại bước). Cài đặt "nhắc lại mẹo từ đầu" xoá `guideSeen` nên hội thoại bàn build cũng hiện lại.
- Bàn trống (chưa build) cũng có hội thoại (người dùng: "chưa nhận đơn nào cũng phải có hộp thoại keeb chan hướng dẫn chứ"):
  `benchTopics(step, hasOrder)` chọn đoạn theo tình huống: chưa có đơn / job → `bench:empty` (về máy tính, Mezzenger nhận đơn, quay lại
  bấm ô vàng); có đơn → `bench:pick` (bấm ô vàng chọn đơn). Ẩn khi đang mở `benchPicker` và khi cảnh 3D đang tải (`useSceneLoading` chưa `ready` / còn `pending`, người dùng:
  "chưa load cảnh màn build xong đã hiển thị cuộc hội thoại rồi"). Đổi tình huống thì đọc lại từ câu đầu.
- "Bài của tôi" (`MyListings`): ô trống = icon + chữ ở giữa (`Empty`): "Chưa có bài đăng nào" (Newspaper), "Kho trống" (PackageOpen).
- `GroupFeed`: 2 tab "Chợ pass" / "Bài của tôi" `sticky` trên cùng thân cửa sổ (bù padding `-mx/-mt` + nền `bg-panel`), không cuộn theo.
- Sửa tiếp (2026-10-26, "bấm hiểu rồi cũng bị mất, chỉ cho option thu nhỏ"): bong bóng máy tính (`GuideNpc`) bỏ nút "Hiểu rồi", Keeb-chan luôn ở góc;
  `currentTip` không lọc `guideSeen` nữa, nói mẹo đầu tiên hợp tình huống, không có thì câu chung `IDLE`. Thu nhỏ nhớ theo id mẹo (`smallAt`),
  mẹo đổi thì bong bóng tự mở. `guideSeen` vẫn giữ cho hội thoại bàn build (`BenchDialog`, phiên khác làm).
- Sửa tiếp (2026-10-26): bong bóng dùng `TitleBar` của cửa sổ app (màu hồng, kéo thả để dời Keeb-chan, offset không lưu) + nút — (`TitleButton`);
  đuôi nhọn chỉ về nhân vật như bong bóng chat (span xoay 45° nằm ngoài khung overflow-hidden). Bấm vào nhân vật để ẩn / hiện bong bóng
  (bỏ kiểu thu thành avatar tròn), đang ẩn thì chấm đỏ báo có mẹo.
- Sửa tiếp (2026-10-26): thanh tiêu đề bong bóng gọn lại (chữ 14px, cao ~32px, nút — `size-6`; dùng `!` vì `cn` chỉ nối chuỗi, không gộp class trùng của `TitleBar`), bỏ đuôi nhọn.

### App "Đánh giá": icon "!" giải thích cách chấm (2026-10-26)

- Người dùng: "ở bảng đánh giá flex gap-1.5 bên góc phải thêm dấu chấm than vàng giải thích cách chấm điểm". `ReviewsApp`: hàng chip lọc
  thêm `CircleAlert` vàng `ml-auto` (giống `Heading info`), tooltip `HOW_SCORED` tóm tắt `scoreDelivery` (mục chấm /100, nút lỗi −15,
  linh kiện lỗi −8, ngưỡng sao 90/75/55/35, lỗi nút tối đa 2★) + `shipRep` (uy tín sao − 3, trễ −1 / ngày). Đổi cách chấm thì sửa cả chuỗi này.

### Bảng tỉ lệ (2026-10-26)

- Yêu cầu: "tổng hợp 1 table tỉ lệ trong game vào README, đưa vào hướng dẫn cho Keeb-chan". `src/data/odds.ts` (`ODDS`: nhóm chợ / bán phím
  khách / lắp ráp & giao / đơn hàng) lấy thẳng hằng số (`BEG_GIFT`, `LOWBALL_*`, `MUTE_BLOCK` export từ market.ts, `STEAL_OK`..., `UNTESTED_FAIL`,
  `burnChance` thiếc đểu); món code ghi số trực tiếp thì chép số. Bong bóng Keeb-chan có nút "📊 Bảng tỉ lệ" → `OddsDialog`. README mục
  "Bảng tỉ lệ trong game" in ra từ `ODDS` (đổi tỉ lệ thì in lại bảng).
- Ô trống "Nhận đơn trước để xem các bài pass…" (tab Chợ pass) dùng `Empty` (icon + chữ) như tab Bài của tôi; `Empty` chuyển sang `components/ui`.
- Keeb-chan (người dùng: "nên để viền đen hết... ko cần đổ bóng, button bảng tỉ lệ độ bóng khi hover vào to quá"): bong bóng `GuideNpc`
  viền `border-black` đặc, bỏ `shadow`; bỏ `drop-shadow` nhân vật (cả `BenchDialog`); nút "📊 Bảng tỉ lệ" hover chỉ nhích 1px, bóng giữ 4px
  (đè riêng bằng `!`, không đổi `Button` chung).
- Sửa (2026-10-26): nút "Bảng tỉ lệ" trong bong bóng: bóng đen 35% của `Button` trên nền kem thành vệt xám → bóng `#9cc3ff` (xanh nhạt cùng tông, cả hover / active), emoji 📊 → icon lucide `ChartColumn` trắng.
- Sửa (2026-10-26): bảng tỉ lệ tràn khung ở dòng dài ("Test: phím không nhận · giao đi…") vì cột tỉ lệ `shrink-0` → 2 cột `min-w-0` co giãn, cột tỉ lệ `max-w-[55%]` + `break-words` xuống dòng (đã đo: dòng 3 hàng, nằm trong khung).
- Sửa (2026-10-26): tooltip nút icon ở bảng chọn đơn (bàn build) bị ẩn — `IconButton` vẽ tooltip `absolute` ngay dưới nút, nút sát đáy bảng `overflow-hidden` nên bị cắt (không phải z-index). `IconButton` giờ dùng `title` → GlobalTooltip (portal, z-3000, sát mép trên tự lật xuống). Taskbar giữ tooltip riêng (không bị khung cắt).

## Keeb-chan + màn tiêu đề dùng ảnh mới (2026-10-26, 0.1.9)

- Người dùng đưa ảnh "Chibi Typewriter Girl with Mechanical Hat.png": thu nhỏ 420px WebP có alpha bằng ffmpeg →
  `public/art/keeb-chan.webp` (42KB). `GuideGirl` giờ chỉ là `<img>` (bỏ SVG vẽ tay), dùng ở GuideNpc / BenchDialog.
- Màn tiêu đề: bỏ `SolderingScene` (thợ giơ bút hàn, đã xoá file). Keeb-chan nằm `absolute` bên trái khối chữ (`right-full`, màn hẹp
  thì `bottom-full` phía trên, 110px), nhún nhảy — người dùng muốn tên game + form luôn chính giữa màn hình, không bị đẩy lệch.
- App Kho trống / lọc không có món: `Empty` có icon như Hội Phím Cơ.

## Keeb-chan kéo bằng nhân vật, không ra khỏi màn hình (2026-10-26)

- Người dùng: "cầm modal (bong bóng) kéo được ra hết khỏi màn hình là sai, phải cầm linh vật mới kéo được"; "đang kéo thì không show tooltip".
- `GuideNpc`: bỏ kéo ở thanh tiêu đề bong bóng; cầm nhân vật kéo (lệch > 4px mới tính là kéo, không thì là bấm ẩn / hiện bong bóng).
  `clampOff` giữ cả cụm trong màn hình (cách mép 8px; góc mặc định là giới hạn phải / dưới nên không đè taskbar); bong bóng hiện
  lại (mẹo mới / bấm) hoặc đổi cỡ cửa sổ thì kéo lại vào trong (rAF trong effect, không setState đồng bộ).
- `GlobalTooltip`: đang giữ chuột (`e.buttons`) thì không hiện tooltip — áp dụng cho mọi thao tác kéo (Keeb-chan, cửa sổ, ô kho).

## Badge ml-0, Keeb-chan thu nhỏ ở bàn build (2026-10-26)

- "Badge đầu tiên ở Hội Phím Cơ luôn có ml-1.5": `cn` chỉ nối chuỗi nên `className="ml-0"` không đè được `ml-1.5` mặc định của `Badge`.
  Sửa gốc trong `Badge`: className có `ml-*` thì bỏ `ml-1.5` mặc định (mọi chỗ dùng `ml-0` giờ mới đúng).
- Avatar Keeb-chan thu nhỏ (BenchDialog): chấm đỏ bị `overflow-hidden` của nút cắt mất → cắt tròn ở lớp `span` bên trong, chấm đỏ
  (`-top-1 -right-1`, viền trắng) nằm ngoài lớp cắt; bỏ `mt-6` (ảnh mới không cần đẩy xuống).

## Keeb-chan: case mica là nhiều lớp, không phải 2 mảnh (2026-10-27)

- Người dùng: "case alice này ko phải là 2 mảnh mà nhiều mảnh ghép lại với nhau sửa lại hướng dẫn của keeb-chan cho đúng".
- `benchTopics(step, hasOrder, mica)` (benchLines.ts): case mica dùng `MICA_LINES` cho `caseOpen` / `caseClose` / `caseScrew`
  (nhiều tấm mica chồng, vít xuyên mọi lớp), id riêng `step:<bước>:mica`; `BenchDialog` lấy `mica` từ `ctx.caseDef.material`.
  Gợi ý bước `STEP_INFO` (steps.ts) đổi câu chung: "Case ghép (2 mảnh / mica nhiều lớp)", "khoá các mảnh / lớp case".

## Phím Q lật xem đáy (2026-10-27)

- Người dùng: "lệch đáy phím tắt là q" (= nút vàng "Lật xem đáy"). `TopBar` (BenchHud.tsx) `useBenchKey('KeyQ', toggleFlip)` khi
  `canFlip` (cùng điều kiện như R / Space: không lúc test phím / đang gõ / giữ phím); tooltip "(Q)" + dòng hướng dẫn chuột "Q: lật đáy".

## Phím tắt bàn build (2026-10-27)

- Người dùng: "góc nhìn mặc định từ R → Space, xoay từ H → R"; "danh sách đơn là phím M". Hook chung `useBenchKey`
  (`features/bench/useBenchKey.ts`, tách từ CamModeButton; bỏ qua khi đang gõ / bước test, `preventDefault` để Space không bấm nút
  đang focus / cuộn trang): R đổi xoay ↔ kéo khung nhìn, Space về góc nhìn mặc định (CamModeButton), M mở / đóng Danh sách đơn
  (`OrderPicker` trong EmptyBenchHud, dùng cả bàn trống lẫn đang build; đang chạy hoạt cảnh mod stab / lube thì không mở).
  Tooltip nút + dòng mẹo dưới khung hướng dẫn đổi theo.

## Bỏ mũi tên ở nút mod stab (2026-10-27)

- Người dùng: "mũi tên icon bỏ qua mod xoá đi". `StabModPanel` (ModPanels.tsx): "Bỏ qua mod →" / "Xong, đi lắp stab →" bỏ "→".
  Nút lube ("Bỏ qua lube →") và "Bỏ qua →" ở BenchHud vẫn giữ (chưa được yêu cầu).

## Mod stab theo đúng mẫu stab (2026-10-27)

- Người dùng: "Stab khít: dán băng vào sẽ bị nhũn => đổi lại lỗ stem rộng quá nên cần dán băng vào hạn chế độ dao động của wire trong
  stem" + "tx-ap ko cần holee mod nhưng ở menu hướng dẫn lại có bước holee mod và clip chân stem".
- `stabModRules` (mods.ts) lý do Holee: stab cần (Cherry, `feet`) = "Lỗ stem rộng: dán băng để wire bớt dao động trong stem"; stab khít
  = "lỗ stem vừa wire, không cần dán băng".
- `StabModPanel` chỉ liệt kê mod `needed` (lỡ làm rồi vẫn hiện); cảnh báo thiếu kìm cắt chỉ khi stab phải clip. Gợi ý bước (BenchHud
  `Objective`) dùng `stabModHint(model)` (chỉ mod cần, thứ tự mũi tên vàng) thay câu cố định trong `STEP_INFO.stabMod`. Câu Keeb-chan
  bước stabMod nói rõ Cherry vs stab đời mới.

## Keeb-chan mặc định thu nhỏ (2026-10-27)

- Người dùng: "hướng dẫn Keeb-chan mặc định vào build sẽ ẩn đi, muốn xem thì bấm để show lên, tương tự ở màn hình máy tính".
- `BenchDialog`: `small` mặc định `true` (avatar tròn góc phải dưới + chấm đỏ), bấm mới hiện khung thoại; đổi bước / tình huống
  không tự mở lại nữa (chỉ đọc lại từ câu đầu). Tooltip avatar: "Keeb-chan có hướng dẫn, bấm để xem".
- `GuideNpc` (máy tính): bong bóng mặc định ẩn, bấm nhân vật mới hiện; chấm đỏ chỉ khi có mẹo chưa xem (`readTip`: mẹo đã mở bong
  bóng xem, đang mở mà mẹo đổi thì tính là đã xem). Bỏ tự mở bong bóng khi mẹo đổi.

## Phép mở / lube switch (2026-10-27)

- Người dùng: bỏ icon 📜, font bold, dạng "Phép lube switch: 20/mẻ (còn 788 lần)". Có thử đưa vào `Alert` xanh rồi người dùng bảo
  "thôi bỏ alert đi trả lại như cũ" → giữ dòng chữ `text-xs font-bold text-green`, `Alert` không có tông xanh. Dòng nhận xét độ hợp
  mỡ (`LubePicker`) in đậm, đặt trên các ô chọn.
- Hết switch ở bảng lube: Alert "Hết switch" + nút "Mua ở Shopii" (`openShop('switch')`, chỉ chữ).
- 2026-10-27, "bỏ icon trong btn bước tiếp theo": nút sang bước ở khung hướng dẫn (Objective, BenchHud) bỏ "→" ở mọi trạng thái
  ("Bước tiếp theo" / "Bỏ qua" / "Bỏ dở, còn N phím"). Nút ở bảng lube (ModPanels: "Bỏ qua lube →", "Xong, đi lắp switch →") chưa đổi.

## Đối chiếu linh kiện: số cần / số trong kho (2026-10-27)

- Người dùng: "ở mục switch KaihBox Jade x 230 này là số lượng còn lại trong kho => phải ghi thêm số lượng khách cần / số lượng kho".
- `OrderDetail` (OrderApp.tsx) `partLabel`: Switch = "<tên> · cần <số phím − đã cắm> / kho <còn>"; Stab = "Stab <tên> · cần <stabNeed>
  / kho <stabStock>" (dạng `stabText`, vd 4× 2u + 1× 7u). Món khác giữ `itemName`. Chụp kiểm: "Gateron Silent Hồng · cần 84 / kho 230".
- **Nút "Kết thúc ngày" hiện số đơn xong** (2026-10-27, người dùng: "hiện thị tổng số đơn hoàn thành ngày hôm nay ở button kết thúc ngày
  => bỏ icon đi"): Messenger.tsx nút cuối danh sách hội thoại = "Kết thúc ngày · xong N đơn" (N = `packed.length`, đơn đóng gói trong ngày,
  cả đã gửi lẫn chưa gửi; `nextDay` xoá `packed`), bỏ icon `Moon` và phần "· gửi N đơn".

## Hỏi lại khi đóng gói: liệt kê mục còn thiếu (2026-10-27)

- Người dùng: "chưa làm xong đơn mà bấm gói thì có popup hỏi bạn có chắc chắn muốn đóng gói đơn này ko vẫn còn 1 số bước chưa hoàn
  thành => nếu thiếu các bước khách yêu cầu or mình cố tình bỏ qua".
- `useDeliverIssues` (BenchHud.tsx): `missing` = bước bắt buộc chưa xong (kèm tiến độ), `requested` = yêu cầu khách chưa đạt (lube
  `want` chưa lube đủ / `none` mà đã lube / sai dây O-ring), `skipped` = bước tuỳ chọn bỏ qua (mod stab còn mod cần, lube khi tuỳ shop,
  foam không yêu cầu, test chưa hết phím). Nút "Đóng gói đơn này" hỏi lại khi có bất kỳ mục nào; `ConfirmDeliver` "Chắc chắn đóng gói
  đơn này?" với 3 khung Alert (đỏ / đỏ / vàng) liệt kê. Popup "Phím đã xong" (`TestDone`) vẫn theo bước bắt buộc như cũ.
- **Khung xem 3D Shopii không hiện gói số lượng** (2026-10-27, người dùng: "trong preview chỉ hiển thị màu và loại thôi, ko hiển thị kiểu
  1 vòng oring 5 vòng oring"): ProductCard `picker` gộp option vật tư gộp (nhãn "loại · gói", `isPack`) theo id vật tư (`kindOf`) → mỗi
  loại 1 chip, nhãn bỏ phần " · N vòng"; bấm chip đổi loại giữ cỡ gói đang chọn (`pickKind`). Gói chọn ở ô đổ xuống trên thẻ.
  Stab vẫn hiện từng option (bộ / lẻ khác dây). Chụp kiểm Dây O-ring (playwright): 3 chip 30A / 50A / 70A.

## Bảng đơn ở bàn build hiện mount + phím tắt đầu vít (2026-10-27)

- Người dùng: "kiểu mount ko được mô tả trong menu lúc build ?? đơn của chị linh". `OrderSpec` thêm prop `mount` (bàn build truyền
  `ctx.mount`): luôn có dòng Mount = mount đang build, khách đòi thì ghi "(khách yêu cầu)" / "· khách cần …". Sửa kèm lỗi do lần thêm
  dòng "Dây O-ring" chen giữa `if / else` Mount – Case (đơn có O-ring mất dòng Case, đơn kit gửi case thừa dòng Case).
- Người dùng: "ở đoạn đổi đầu vít thêm phím tắt lần lượt từ trái qua phải là 1 2 3 4". `BitPicker`: `useBenchKey('Digit1'…'Digit4')`
  → chữ thập / lục giác / Torx / dẹt (`PICK_BIT`), số nhỏ ở góc mỗi ô + tooltip "(phím n)". Chạy thử: phím 3 → torx, phím 2 → hex.
- **Bỏ tiêu đề bảng đầu vít** (2026-10-27, người dùng: "chữ chọn đầu vít và icon bỏ đi ko cần"): `BitPicker` bỏ dòng "🪛 Chọn đầu vít",
  chỉ còn ô "Mặt ốc" + 4 nút đầu vít.
  Chữ "Mặt ốc" bold, 13px (người dùng: "chữ mặt ốc cho font bold và tăng size 13").
- **Mezzenger tối giản giống bảng xếp hạng** (2026-10-27, người dùng: "thiết kế lại style khung chat tối giản giống bảng xếp hạng").
  `Messenger.tsx`: bỏ viền ngoài + đường kẻ `border-*`, cột hội thoại và khung chat thành 2 khối `rounded-2xl bg-black/15 p-1.5` cách nhau `gap-3`;
  vùng tin nhắn là ô `rounded-xl bg-black/15` lồng trong. `ThreadRow` = thẻ `bg-panel-2` (đang chọn: `bg-[#3a3418] ring-2 ring-yellow ring-inset`,
  tên vàng như dòng của mình ở bảng xếp hạng), tên `font-head font-extrabold`, avatar `ring-2 ring-white/15`; trạng thái (Đơn mới / Đang làm...)
  thành chữ màu `STATUS` thay `Badge`; "N đơn mới" thành chữ muted, "Ngày N" `font-head text-xl text-yellow`. `ChatBubble` khách bỏ viền.
  Mezzenger + bảng xếp hạng là ngoại lệ của quy ước `Badge solid` trong CLAUDE.md.
- **Ribbon "Đơn mới"** (2026-10-27, người dùng: "đơn mới thay vì hiển thị chữ đơn mới thì có thể làm ribbon-shapes gắn ở góc phải").
  `ThreadRow`: hội thoại `offer` có dải ribbon chéo vàng 45° ở góc phải trên (`absolute rotate-45`, thẻ `relative overflow-hidden` cắt 2 đầu),
  chữ "Đơn mới" `font-head` 10px; bỏ chữ trạng thái của đơn mới, nội dung chừa `pr-6`. Trạng thái khác vẫn là chữ màu.
  Cùng ngày, người dùng gửi ảnh mẫu "đổi lại thành kiểu ribbon-shapes như này": bỏ dải chéo, thay bằng `NewRibbon` (SVG) treo mép trên
  góc phải thẻ: thân đỏ gradient đáy nhọn + mép gấp cuộn tối ở góc trái trên, chữ trắng "Đơn mới"; nội dung thẻ chừa `pr-14`.
  Người dùng gửi ảnh mẫu khác ("ý tôi là kiểu này"): `NewRibbon` thành ribbon dựng đứng vàng (`--color-yellow`) nhô lên 6px trên mép thẻ,
  tam giác gấp tối bên phải phần nhô, đáy nhọn, chữ 2 dòng "Đơn / mới" màu tối. Thẻ bỏ `overflow-hidden`; danh sách `gap-2 pt-1.5` để
  ribbon không bị cắt / đè thẻ trên; nội dung chừa `pr-11`.
  Người dùng: "ghi chữ new vào là được rồi" → ribbon ghi 1 chữ "NEW" (`text-xs`), thân ngắn lại (cao 36 thay 47).
  Người dùng: "bo viền xíu hơi góc cạnh" → path thân bo góc 2px (góc trái trên, 2 góc đáy, mũi nhọn; góc phải trên nối nếp gấp giữ vuông).
- **Mezzenger tab lọc + giữ đơn đã gửi** (2026-10-27, người dùng: "có filter sort theo đang làm, done, cancel và new => done đơn vẫn hiển thị trên màn hình").
  Hội thoại thêm loại `shipped` (đơn `packed` có `shipped`, giữ tới `nextDay` sẵn trong store): hiện tin xin địa chỉ + "Shop gửi hàng rồi..." / "Phím của bạn đây..."
  rồi khách cảm ơn, chữ trạng thái "Đã gửi" (muted), chỉ còn nút xem điểm. Trước đây gửi xong hội thoại biến mất và nhảy sang hội thoại đầu.
  Cột trái có tab `FILTERS`: Tất cả / Mới (offer) / Đang làm (accepted) / Xong (packed + shipped) / Huỷ (rejected), kèm số; tên tab tiếng Việt theo
  quy ước UI. Hội thoại đang mở lấy từ toàn bộ `threads` (đổi trạng thái ra khỏi tab đang lọc vẫn giữ khung chat), chưa chọn thì lấy đầu tab.
  Người dùng: "hiển thị 1 icon filter ở bên phải ấn vào thì mới lựa chọn option để sort cho gọn" → bỏ hàng tab, đầu cột (cạnh "N đơn mới")
  có nút icon `ListFilter` (`FilterMenu`): bấm đổ xuống 5 mục kèm số + dấu ✓, bấm ra ngoài thì đóng; đang lọc khác "Tất cả" thì nút vàng.
  Người dùng: "bỏ cái text (6 đơn mới) đi ko cần nữa" → bỏ chữ "N đơn mới / Hết đơn mới" ở đầu cột, chỉ còn "Ngày N" + nút lọc (số đơn mới xem trong menu lọc).
  Người dùng: "ribbon hơi cao cho ngắn lại 1 xíu" → `NewRibbon` cao 36 → 30 (thân 29 → 23, mũi nhọn giữ 7).
- **Ghim "Đang làm"** (2026-10-27, người dùng gửi ảnh ghim đỏ: "trạng thái đang làm thì hiển thị gim cắm vào là được"). `Pin` (SVG trong
  Messenger.tsx: đầu tròn, thân tối, đế loe, kim bạc, vệt sáng, xoay 40°) cắm ở góc phải trên thẻ hội thoại đơn đang làm (`accepted` + `active`),
  nhô ra ngoài mép thẻ; bỏ chữ "Đang làm", nội dung chừa `pr-5`. Đơn đã nhận chưa làm vẫn chữ "Đã nhận". Danh sách `pt-1.5` → `pt-2.5` để thẻ đầu không cắt đầu ghim.
  Người dùng: "xoay đầu cây ghim cho như đang cắm vào => bỏ đoạn đầu nhọn sắt nhô ra" → bỏ kim (như đã cắm ngập vào thẻ), xoay 40° → 35°,
  dời ghim xuống 5 đơn vị trong viewBox để đế ghim áp sát mép thẻ.
  Người dùng gửi ảnh mẫu "phải như này mới đúng" (ghim nhìn từ trên xuống): `Pin` vẽ lại phối cảnh — đế + đầu ghim là elip có cạnh dày
  (đỏ sẫm) + mặt trên đỏ + viền sáng trắng ở mép dưới, thân nối giữa, bóng đổ xám xuống trái; vẽ theo trục đứng rồi `rotate(40)` cho đầu chĩa
  lên phải. SVG 40px (`-top-3 -right-2`), danh sách `pt-3`. Render thử bằng Chrome headless (scratchpad) để chỉnh: elip tròn hơn (nhìn từ trên),
  thân ngắn, viền sáng chỉ ở mép dưới phải như mẫu.
- **Trạng thái hội thoại = vật gắn lên thẻ** (2026-10-27, người dùng hỏi "đã nhận thì nên hiển thị kiểu gì thay vì chữ", "cancel và new thì sao",
  chốt "ok thử triển khai đi" theo đề xuất). `ThreadRow` bỏ hẳn chữ trạng thái (xoá `STATUS` / `statusOf`), mỗi loại 1 vật:
  mới = `NewRibbon`, đang làm = `Pin`, đã nhận chưa làm = `Clip` (kẹp giấy bạc ở mép trên) + hạn giao `dueOf` (còn n ngày / hạn hôm nay cam /
  trễ n ngày đỏ; còn 1 ngày cam), chờ gửi = `PostStamp` (tem cam răng cưa = `mask` khoét lỗ `PERFS`, hình hộp theo icon Package),
  đã giao = `Stamp` xanh "ĐÃ GIAO" (thẻ `opacity-80`), huỷ = `Stamp` đỏ "HUỶ" (thẻ `opacity-60`, tooltip báo −1 uy tín khi `angry`).
  Mẫu render bằng Chrome headless trước khi đưa vào code. Nội dung thẻ chừa `pr-*` theo từng vật.
  Người dùng: "đổi chữ new thành chữ mới" → ribbon ghi "MỚI".
  Người dùng: "cho cái kẹp nằm ngang được ko để truncate text được full text" → `Clip` xoay ngang (path cũ `translate(34 0) rotate(90)`,
  SVG 34×14, `-top-2 right-3`, nghiêng −3°), nằm trên mép thẻ nên bỏ `pr-6`: tin cuối dùng hết bề ngang.
  Người dùng chỉnh tay: kẹp `rotate-[344deg]`, `right-0`, `-top-1.5` (−6px).
  Người dùng: "chữ hủy cũng thế đưa lên trên đoạn name cho text sub ở dưới full ra" → `Stamp` thêm `top` (ngang hàng tên, `top-1.5`), dấu HUỶ
  dùng `top`; bỏ `pr-11` của cả khối, chỉ hàng tên chừa `pr-10` → tin cuối dùng hết bề ngang. Dấu ĐÃ GIAO vẫn giữa thẻ.
  Người dùng: "cái ghim cần thu nhỏ hay đưa vào 1 xíu ko? để text ở dưới full ra" → `Pin` 40 → 36px, dời ra góc `-top-3.5 -right-2.5` (chỉ
  ngang hàng tên), chừa `pr-5` ở hàng tên thay vì cả khối → tin cuối dùng hết bề ngang.
  Lỗi (người dùng: "thanh menu chat bên cạnh đang bị scroll"): `Pin` `-right-2.5` lòi ra ngoài thẻ 10px (kẹp `right-0` xoay cũng lòi ~1px),
  danh sách `overflow-y-auto` nên bật cuộn ngang. Danh sách thêm `pr-2.5` (chừa chỗ ghim nhô ra) + `overflow-x-hidden`.
- **Đơn mới = phong bì** (2026-10-27, người dùng: ribbon chữ "MỚI" không hợp → chọn phong bì theo đề xuất). Xoá `NewRibbon`, thêm `Envelope`
  (SVG phong bì vàng chưa mở, nắp gập, dấu sáp đỏ, nghiêng 10°, `-top-2 right-1`): cùng kiểu "đồ thật gắn lên hồ sơ" với ghim / kẹp / tem /
  dấu mộc, không cần chữ (ribbon chật chữ có dấu). Chừa chỗ chỉ ở hàng tên (`pr-8`), tin cuối dùng hết bề ngang. Render thử Chrome headless.
- Người dùng: đầu cột hội thoại (Ngày N + nút lọc) "hơi cao giảm lại" → `h-14` → `h-10` (đầu khung chat vẫn `h-14` vì avatar 40px, 2 đầu
  không còn thẳng hàng).

### Chat Mezzenger gọn + bảng tóm tắt yêu cầu (2026-10-27)

- Người dùng: "sửa lại UI chat đi hơi lạc quẻ, ghi chat cơ bản 1 2 ý chính rồi làm 1 bảng tóm tắt là được cho người chơi dễ đọc
  dễ hiểu chứ dài như này quá lười để đọc". Trước: mỗi yêu cầu 1 bong bóng (`order.lines`, 10–15 tin).
- Giờ: ảnh đơn → `chatIntro(order)` (orders.ts: lời chào + layout, câu case featured nếu có, âm thanh + số ngày + "chi tiết ghi dưới
  đây 👇", vẫn tô màu bằng `Highlight`) → 1 bong bóng rộng (`ChatBubble wide`) chứa `OrderSpec compact` (cùng bảng ở bàn build /
  app Chi tiết đơn, kit khách gửi ở khối xanh trên đầu). `order.lines` vẫn sinh (chatIntro lấy lời chào / câu featured).
- `OrderSpec` thêm dòng "Thời gian" (`order.days` ngày), hiện cả ở HUD bàn build / Chi tiết đơn.
- Chỉ sửa đúng chỗ render tin khách trong Messenger.tsx (phiên khác đang sửa phần danh sách hội thoại cùng file). Chưa chụp kiểm.
- Người dùng: "hover vào ảnh hiển thị icon kính lúp được rồi, ko cần hiệu ứng nổi lên nữa". `OrderImage` (ảnh đơn trong chat) bỏ bóng đổ,
  bóng to ra khi rê và ảnh phóng `scale-105`; chỉ còn `ViewHint` (kính lúp) khi rê.
- Cùng ngày, người dùng: "bỏ truncate text-xs text-muted đi luôn giúp tôi ko cần nữa": bỏ dòng xem trước tin cuối dưới tên khách
  trong `ThreadRow` (cột hội thoại chỉ còn avatar + tên + hạn + vật gắn trạng thái), xoá biến `last` + import `withEmotes`.
- **App Đánh giá style bảng xếp hạng** (2026-10-27, người dùng: "sửa đánh giá làm style tương tự bảng xếp hạng"). `ReviewsApp`: đầu app ô icon
  `Star` + tiêu đề vàng `font-head text-2xl`, dòng tóm tắt chữ thường (sao + điểm TB + số đánh giá + uy tín, uy tín âm chữ đỏ) thay 2 `Badge`;
  icon `CircleAlert` muted góc phải trên = tooltip cách chấm (như bảng xếp hạng); tab lọc tự vẽ nút vàng có icon (Tất cả / 4–5 sao / 1–2 sao)
  thay `OptionChip`; danh sách trong khối `rounded-2xl bg-black/15 p-1.5`. `ReviewCard`: tên `font-head font-extrabold`, avatar `ring-2`,
  uy tín +/- `font-head` (thông báo `ReviewPops` dùng chung card nên đổi theo).
  Người dùng: "4-5 sao và 1-3 sao nhé" → tab lọc thứ 3 đổi thành "1–3 sao" (`stars <= 3`), 3 sao không còn chỉ ở Tất cả.

### Kết thúc ngày = icon desktop + popup tổng kết (2026-10-27)

- Người dùng: "button kết thúc ngày h đây sẽ đưa ra ngoài màn hình chính như 1 icon app trên màn hình => bấm vào sẽ show popup:
  tổng kết ngày hôm nay: số tiền, số đơn nhận, số đơn hủy,... => có option kết thúc, và tiếp tục".
- Bỏ nút "Kết thúc ngày · xong N đơn" ở đáy cột hội thoại Mezzenger. Icon `END_DAY_ICON` (apps.ts, mặt trăng lucide
  `public/icons/apps/moon.svg`, không phải app cửa sổ) ở cột icon desktop (mobile: trong lưới) → `EndDayDialog`
  (features/desktop): bảng tiền (so đầu ngày ±), uy tín ±, đơn nhận / từ chối / xong (đã gửi · chờ gửi) / đang làm dở / đơn mới
  chưa trả lời; `Alert` việc sẽ xảy ra khi qua ngày (gửi nốt đơn chờ +tiền / uy tín, đền đơn nhận mà chưa làm, huỷ đơn trễ quá
  `CANCEL_AFTER`, cùng công thức `nextDay`); chưa nhận đơn nào thì khoá nút + báo. Nút "Tiếp tục làm" / "Kết thúc ngày".
- Store: `dayStart` { money, rep } (shopSlice, Session + snapshot + SAVED_KEYS): chơi mới = START, `nextDay` ghi mốc ngày mới,
  save cũ = tiền / uy tín lúc tải. `CANCEL_AFTER` export từ shopSlice.
- Chưa chụp kiểm.

### Danh sách đơn + Kho theo kiểu bảng xếp hạng (2026-10-27)

- Người dùng: "danh sách đơn cũng cần sửa lại style cho giống bảng xếp hạng" + "kho cũng vậy".
- `OrderListFrame` (components/game/OrderCard.tsx): đầu (ClipboardList vàng + "Danh sách đơn" + dòng phụ + ⓘ tooltip phím M) →
  khung `bg-black/15` có hàng tiêu đề cột "Khách / Tiền công". Dùng ở `OrderPicker` (bàn build) + `OrderApp`.
- `OrderCard` thành dòng kiểu `RunRow`: avatar `size-11` viền, tên `font-head` (đơn đang làm chữ vàng, dòng nền `#3a3418` viền vàng
  như dòng "của bạn") + `TimeBadge`, dòng phụ 1 hàng (layout · kit · % build / đủ đồ / thiếu gì), tiền công `font-head text-xl` xanh bên
  phải, nút hành động + mũi tên mở chi tiết, thanh tiến độ khi đang build. Bỏ badge "Đang làm / Đã nhận" + hàng Công / Budget / Hạn
  (đã có trong bảng chi tiết `OrderSpec`).
- Kho (`OwnedItems`): bỏ `Panel` / `Heading` "Đồ trong kho" → đầu (Boxes vàng + "Kho" + dòng phụ + ⓘ) → tab lọc `TabChip` (icon + tên
  ngắn + số món, tooltip tên dài) → lưới ô trong khung `rounded-2xl bg-black/15` (giữ kéo thả / xem 3D).
- `TabChip` (components/ui): tab lọc tách từ bảng xếp hạng (khối vàng đặc khi chọn, có `count`); LeaderboardApp dùng lại.
- Chưa chụp kiểm.
- 2026-10-27, người dùng: đầu app Kho (ô icon `Boxes` + tiêu đề "Kho" + dòng phụ + ⓘ hướng dẫn) "không cần thêm vào, xoá đi". `OwnedItems` bỏ cả khối,
  app mở thẳng vào tab lọc + lưới ô; mất tooltip "Bấm ô để xem / lấy / cất · kéo thả để đổi chỗ".
  Người dùng: "fixed filter ở trên ko cho scroll theo" → hàng tab lọc của Kho `sticky -top-3.5` (bù padding thân `Window`, nền `bg-panel`,
  z-10), cùng cách `GroupFeed` / Shopii; lưới ô cuộn bên dưới.

### Bỏ toast đỏ khi dán Holee (2026-10-27)

- Người dùng: "ở bước holee dán băng keo vào liên quan gì mà show thông báo alert trên cùng vậy ?? => xóa đi". `modStab('bandaid')` luôn
  `toast('⚠️ ' + rule.reason, 'bad')`; stab Cherry (cần Holee) có `reason` là câu giải thích ("Lỗ stem rộng...") → mod đúng vẫn báo đỏ.
  Giờ chỉ báo khi dán thừa (`!rule.needed`: stab khít, reason "không cần dán băng").
- 2026-10-27: nút "Kết thúc ngày" ở chân cột hội thoại Mezzenger đã bị gỡ (chuyển thành icon `END_DAY_ICON` trên desktop mở `EndDayDialog`).
  Người dùng: "ok thêm đi" → thêm lại nút xanh `MoonStar` "Kết thúc ngày" ở chân cột (h-16 bằng thanh trả lời khung chat), bấm mở cùng
  `EndDayDialog` (portal ra `document.body` để overlay `fixed` không kẹt trong cửa sổ). Icon desktop vẫn giữ.

### Shopii theo kiểu bảng xếp hạng (2026-10-27)

- Người dùng: "sửa style của shopii cho giống style của bảng xếp hạng".
- `Shopii`: bỏ cột nút mục hàng cam bên trái → đầu (ShoppingBag vàng + "Shopii" + dòng phụ + ⓘ) → hàng tab mục `TabChip` có icon
  (`CAT_ICONS`: Box / CircuitBoard / Grid3x3 / RectangleHorizontal / ToggleRight / Keyboard / Droplet / Wrench / Award / BookOpen)
  → hàng công cụ (công tắc "Chỉ hiện đồ hợp đơn" trái · `SoundLegend` · `OptionSelect` bộ lọc trong mục phải; bỏ thanh ghim `sticky`
  bù padding Window) → lưới sản phẩm trong khung `rounded-2xl bg-black/15 p-1.5`.
- `ProductCard`: `rounded-xl bg-panel-2`, rê chuột viền vàng `ring-inset` (thay viền cam), tên `font-head text-base`, giá
  `font-head text-xl text-green` (như giá trị bên phải bảng xếp hạng); nút "Mua ngay" giữ cam.
- Chưa chụp kiểm.

### Shopii: sale theo sự kiện, cột trái ghim + tìm kiếm, chọn option kiểu nút lọc (2026-10-27)

- Người dùng: "shopii sẽ có sale linh kiện theo sự kiện, 3 ngày sale 1 lần, sale 5% → 30%... filter sale; bỏ Chỉ hiện đồ hợp đơn;
  [khối đầu] header shopii cũng bỏ; menu filter đưa qua bên trái fixed, filter option cũng fixed, thêm 1 thanh search text chung".
- `data/sale.ts`: `SALE_EVERY` 3, `isSaleDay(day)` (ngày 3, 6, 9...), `nextSaleDay`, `salePct(day, p)` (chỉ 6 mục linh kiện, hash
  FNV theo `day:id`: 60% sản phẩm sale, 5–30% bước 5), `withSale(p, day)` (giá option giảm, giá gốc ở `was`, `Product.sale` = %).
  Kiểm số ngày 1–9: chỉ ngày 3 / 6 / 9 có 52–57 / 125 sản phẩm, min 5% max 30%. `nextDay` toast "🔥 Hôm nay Shopii sale linh kiện".
  Budget đơn tính theo giá gốc → mua ngày sale lãi hơn.
- `Shopii`: bỏ khối đầu + công tắc hợp đơn (xoá `fitsOrder` / `fitOptions`). Cột trái 200px `md:sticky md:top-0`: ô tìm kiếm (bỏ dấu,
  tìm tên + mô tả mọi mục), tab "Đang sale" (`Flame`, số sản phẩm; ngày thường: dòng "Sale tiếp theo: ngày N"), tab mục hàng
  (`TabChip` giãn hết cột, thêm prop `className`, số đếm `ml-auto`), `OptionSelect` bộ lọc trong mục. Phải: lưới trong khung tối,
  `SoundLegend` đầu lưới.
- `ProductCard`: badge đỏ "−N%" cạnh tên, giá sale xanh + giá gốc gạch ngang.
- Người dùng: "filter item bên trong shopii làm theo style filter giống filter lọc ở chat... case màu nào cũng giá như nhau chỉ đắt
  nếu khác chất liệu => mở filter thì popup lọc chọn chất liệu và chọn màu nằm ngang nhau". `OptionFilter` (shop/): nút (chấm màu +
  "chất liệu · màu" + `ListFilter`, mở = vàng) → popup kiểu `FilterMenu` Mezzenger: cột "Chất liệu" (giá theo chất liệu, chọn thì
  popup vẫn mở) | cột "Màu" / "Lựa chọn" (chấm màu; giá chỉ hiện khi các option khác giá, vd switch 10 / 70 con), chọn xong đóng.
  Thay 2 `OptionSelect` trong thẻ. Picker trong khung xem 3D giữ `OptionChip`.
- Chưa chụp kiểm.

### Tìm kiếm Shopii debounce + loading ảnh model lần đầu (2026-10-27)

- Người dùng: "search sử dụng debounce khi nhả phím thì mới tiến hành search để tối ưu hiệu năng, khi nhả phím search thì phải có
  loading hiển thị ở khu vực sản phẩm => chờ render hết thì mới show lên tránh bị lag" + "thêm loading khi lần đầu chơi game tải tài
  nguyên thay vì hiển thị ảnh mặc định".
- `Shopii`: `query` (ô gõ, cập nhật ngay) → `applied` sau `SEARCH_MS` 300ms ngừng gõ → `useDeferredValue` (lưới dựng nền); `searchBusy`
  (chưa hết debounce hoặc đang dựng) → lớp loading `LoaderCircle` "Đang tìm..." phủ kín khung sản phẩm (ẩn lưới cũ, vòng xoay `pt-24`
  phía trên). Bấm mục / "Đang sale" thì xoá tìm ngay (`clearSearch`).
- `useModelThumb` (shop/modelThumb) + `useCaseThumb` (messenger/orderThumb): `undefined` = đang chụp, `null` = không có model / không
  có key (trước cả 2 đều `null` → hiện ảnh vẽ PartArt / ToolArt / SupplyArt tạm rồi mới đổi ảnh thật). `ThumbLoading` (components/ui:
  nền nhấp nháy + vòng xoay) thay ảnh vẽ lúc đang chụp ở `ProductImage` (Shopii) + ô Kho (`Thumb` trong OwnedItems); ảnh đơn
  Mezzenger (`OrderImage`) thay emoji ⌨️ nhún. Ảnh vẽ chỉ còn cho món không có model 3D.
- Chưa chụp kiểm.
- Cùng ngày, người dùng: "thông báo alert đến ngày sale nên để trên cùng và cũng hiển thị 1 icon chấm than ở góc mô tả lịch sale cứ
  3 ngày mới thì sale 1 lần": cột trái Shopii trên cùng là `Alert tone="yellow"` (ngày sale: "Hôm nay sale linh kiện" / "Giảm 5–30%,
  chỉ trong hôm nay"; ngày thường: "Sale tiếp theo: ngày N" / "Còn X ngày..."), `CircleAlert` góc phải trên (tooltip lịch theo
  `SALE_EVERY`: ngày 3, 6, 9...). Bỏ dòng `Muted` "Sale linh kiện tiếp theo"; tab "Đang sale" vẫn hiện ngày sale.
- Cùng ngày, người dùng: "hiển thị fixed full luôn chứ ko phải nằm mỗi bên góc; Sale tiếp theo: ngày 3 => đếm ngược số ngày; icon tam
  giác => lửa => alert màu đỏ; [dòng mô tả] bỏ, đưa vào dấu chấm than xuống hàng chấm đầu dòng: giá bán giảm 5%~30%, chu kì lặp lại
  3 ngày 1 lần" + "menu ko cần hiển thị icon nữa".
  `SaleBanner` (Shopii.tsx): `Alert` đỏ (thêm prop `icon` cho Alert, mặc định TriangleAlert) icon `Flame`, trải hết bề ngang trên cùng,
  tiêu đề "Đang sale linh kiện hôm nay" / "Sale tiếp theo: còn N ngày"; ⓘ góc phải: khung nổi (rê / focus, kiểu mô tả "i" thẻ sản phẩm,
  vì GlobalTooltip chỉ 1 dòng) 2 gạch đầu dòng. Shopii thành khung cao cố định `h-[min(680px,74vh)]` (phóng to: `h-full`; mobile
  tự cao): banner đứng yên, cột trái + lưới sản phẩm `overflow-y-auto` riêng (bỏ `sticky`), lớp loading / hết hàng nằm ở khung ngoài
  không cuộn. `TabChip` `icon` thành tuỳ chọn; menu mục hàng + tab "Đang sale" chỉ chữ (xoá `CAT_ICONS`).
- Cùng ngày, người dùng: "filter ở bên ngoài sửa style cho giống với filter sản phẩm ở bên trong": bộ lọc trong mục ở cột trái
  (`OptionSelect`) → `ListFilterPicker` (shop/OptionFilter.tsx, dùng chung `Row` với `OptionFilter`): nút (tên mục lọc + số khớp +
  `ListFilter`; mở hoặc đang lọc khác "Tất cả" = vàng như nút lọc chat) → popup 1 cột kiểu `FilterMenu`, chọn xong đóng.
- Cùng ngày, người dùng: "khi mở popup filter ở bên trái menu đang bị scroll x ??? và khi không đủ chiều cao để hiển thị của popup nhưng
  vẫn show xuống dưới => bị khuất đi 1 phần phải scroll xuống để xem => fix". Popup `absolute` nằm trong cột trái / lưới (`overflow-y-auto`,
  cột 200px mà popup `min-w-[200px]` → cuộn ngang; luôn bung xuống → bị khung cắt). `Floating` (OptionFilter.tsx): portal ra `body`,
  `position: fixed` z 2000 theo `getBoundingClientRect` của nút; đo `scrollHeight` lần vẽ đầu (invisible) → dưới không đủ mà trên rộng
  hơn thì lật lên (`bottom`), `maxHeight` = chỗ trống + cuộn trong popup; ép trong bề ngang màn hình; đặt lại khi resize / cuộn bất kỳ
  khung nào (`scroll` capture); bấm ngoài nút + popup thì đóng. Dùng cho cả `OptionFilter` (thẻ sản phẩm, 2 cột rộng 360) và
  `ListFilterPicker` (cột trái); nút tách `TriggerButton`. Chưa chụp kiểm.
- Cùng ngày, người dùng: "bên trong shopii ko còn hiệu ứng nhô ra khi hover vào sản phẩm nữa chỉ cần hiển thị kính lúp như hiện tại là
  đủ": ảnh case (`ProductImage`) bỏ đổ bóng to dần khi rê (`hover:shadow`) + ảnh phóng `group-hover:scale-105`; giữ `ViewHint` kính lúp.
- Cùng ngày, người dùng: "scroll xuống dưới cùng của sản phẩm => qua menu sản phẩm khác thì vẫn ko scroll lên top" + "thanh scroll của
  sản phẩm đang bị khuất đi bởi radius ?? 1 là xóa radius đi 2 là fix cho nó ko bị ẩn". Lưới (`ref grid`) `scrollTo({ top: 0 })` khi
  đổi `cat` / `saleView` / `shownQuery` / `filter`. Giữ bo góc: khung ngoài `rounded-2xl bg-black/15 p-1.5` (bỏ `overflow-hidden`), lớp
  cuộn bên trong không bo (`min-h-0 flex-1 overflow-y-auto`) → thanh cuộn cách mép đệm 6px, không bị góc bo cắt.
- 2026-10-27, người dùng: ô tìm kiếm Shopii bấm vào có viền vàng "đang bị khuất đi 1 phần". `ring-2` vẽ ra ngoài ô, cột trái `overflow-y-auto`
  cắt mất → thêm `ring-inset` (viền vẽ vào trong ô).
- 2026-10-27, người dùng: "khi đang typing thì đã xuất hiện loading rồi là sai, phải sau khi nhả phím mới xuất hiện vì đang debounce".
  Shopii `searchBusy` bỏ điều kiện `query !== applied` (đang chờ debounce), chỉ còn `shownQuery !== applied` (debounce xong, lưới đang dựng).
- **Hội Phím Cơ VN style bảng xếp hạng** (2026-10-27, người dùng: "sửa luôn ui của chợ phím cơ vn giống style của bảng xếp hạng" + "filter sẽ được
  apply style của filter ở Shopii và fixed ở trên cùng ko scroll theo"). `GroupFeed`: khung cao cố định `h-[min(680px,74vh)]`; đầu app ô icon
  `UsersRound` + tiêu đề vàng + dòng phụ theo tab, `CircleAlert` góc phải = tooltip (cảnh báo hàng pass trước là `Alert` vàng / luật gỡ bài);
  tab `TabChip` (cùng Shopii, có icon + số: bài pass / bài của tôi) đứng yên, chỉ khối `rounded-2xl bg-black/15 p-1.5` bên dưới cuộn (bỏ sticky
  bù padding cũ). Mọi `Badge` trong group (tag bài pass, nguồn món, fast bid, chuộc phím, số đếm) → `Tag` (`group/Tag.tsx`, chữ màu theo tone).
  `PostCard`: thẻ `rounded-xl`, tên người bán `font-head`, avatar `ring-2`. Ngoại lệ quy ước Badge thêm Hội Phím Cơ.
- 2026-10-27, người dùng: "bài đăng và bài bán có thể thu gọn được". `PostCard` (bài pass ở chợ): bấm đầu bài thu gọn còn người bán + tên món +
  giá + `ChevronDown` (mở: caption, ảnh, tag, lượt thích, nút Inbox); bài đã chốt mặc định thu gọn + mờ. `ListingCard` (bài mình bán): bỏ dấu ▼
  nhỏ trước tiêu đề, thêm `ChevronDown` bên phải (sau "Gỡ bài") như dòng Danh sách đơn, tiêu đề `font-head`; bấm tiêu đề vẫn mở / đóng.
- Cùng ngày, người dùng: "ở kho nếu đang sử dụng thì viền vàng thay vì xanh như hiện tại": ô Kho `it.using` `border-green` →
  `border-yellow` (cùng màu "đang chọn / đang làm" của bảng xếp hạng, danh sách đơn); hàng lỗi vẫn viền đỏ.
- 2026-10-27, người dùng: đầu app Hội Phím Cơ đã có dấu chấm than ghi lưu ý "nên bên trong ko cần, bỏ đi". `MyListings` bỏ `info` (ⓘ vàng
  "Gỡ bài quá … lần / ngày…") ở tiêu đề "Bài đang đăng"; lưu ý này đã ở tooltip `CircleAlert` đầu app (tab Bài của tôi).
- 2026-10-27, người dùng: "hashtag đăng thêm dấu # ở trước". Tag bài pass (`PostCard`: #Fs, #Price no offer...) và tag bài mình đăng
  (`LISTING_TAGS` ở `ListingCard` + chip chọn tag khi đăng bán ở `SourceRow`) hiện kèm `#` phía trước (chỉ hiển thị, dữ liệu không đổi).

### Tooltip tự lật / ép trong màn hình (2026-10-27)

- Người dùng: "tooltip đôi khi cũng bị vấn đề giống filter popup là không đủ view để hiển thị mà ko đổi vị trí xuất hiện => bị ẩn đi".
  `GlobalTooltip` chỉ lật xuống khi phần tử cách mép trên < 48px (không đo tooltip; dài nhiều dòng / lật xuống sát đáy vẫn tràn),
  `Tooltip` không lật, không ép ngang.
- `placeTip(anchor, w, h, prefer, start)` (components/ui/placeTip.ts): ưu tiên phía `prefer`, không đủ thì phía kia, cả 2 chật thì
  phía rộng hơn rồi ép trong màn hình (cách mép 8px); ngang căn giữa / mép trái (`data-tip-align="start"`), ép trong màn hình.
  `GlobalTooltip` + `Tooltip` vẽ lần đầu `invisible` ở (0, 0) để đo → `useLayoutEffect` đặt vị trí. `Tooltip`: thêm `wide` (w-64, chữ
  thường căn trái, nhiều dòng), hiện cả khi focus, z 3000 (cùng GlobalTooltip).
- Khung nổi tự vẽ `absolute` + `group-hover` (mô tả "i" trên thẻ Shopii, ⓘ lịch sale ở `SaleBanner`) → `<Tooltip wide>` (bỏ `title`
  trên nút "i" cho khỏi 2 tooltip chồng nhau).
- Chưa chụp kiểm.
- 2026-10-27, người dùng: "mục đăng món mới có thể thu gọn được và số bài đăng sẽ nằm góc bên phải tương tự với bài đang đăng, font lên 14 bold".
  `MyListings`: 2 nhóm "Bài đang đăng" / "Đăng bán món mới" dùng `Section` (thay `Heading` + `Tag` số đếm): bấm tiêu đề thu gọn, số đếm
  ("n bài" / "n món") `font-head text-sm` (14px) đậm sát phải + `ChevronDown`. Cả 2 nhóm cùng thu gọn được cho đồng bộ.
- 2026-10-27, người dùng: "text-xs text-muted tăng lên font 13" (tab Bài của tôi). Gốc `MyListings` thêm `[&_.text-xs.text-muted]:text-[13px]`
  (giá gốc / giá chợ, số bình luận, người giữ giá bid, ghi chú "đã gỡ…"); không sửa `Muted` dùng chung vì `cn` không gộp class trùng.
- 2026-10-27, người dùng: "hashtag phải chữ in nghiêng và nằm trên cùng". `PostCard`: hàng hashtag `italic` chuyển lên đầu khối thông tin
  (trên tên món / giá); `ListingCard`: hashtag tách khỏi hàng nhãn (fast bid / nguồn món), `italic`, nằm trên tiêu đề bài.
  Chip chọn tag lúc đăng bán (`SourceRow`) giữ chữ đứng.
- 2026-10-27, người dùng: "cho font lên 13 ở cả hashtag và" nhãn `Tag` → `Tag` `text-xs` → `text-[13px]`, icon trong nhãn 12 → 14px
  (hashtag, nguồn món "Đơn …" / "Phím của khách" / "Hàng lỗi", fast bid, chuộc phím).

## Đổi hình nền desktop (2026-10-27)

- Người dùng: "thêm 2 hình nền nữa để người dùng có thể thay đổi được hình nền máy tính như windows".
- 3 hình nền vẽ bằng CSS (không thêm ảnh): Cực quang (gradient cũ, mặc định), Hoàng hôn (mặt trời sọc retro + đồi),
  Bàn phím (lưới keycap nghiêng nền tối, vài phím màu nhấn). Danh sách id + tên: `features/desktop/wallpapers.ts`
  (`WALLPAPERS`, `wallpaperOf` = id lạ về mặc định); hình vẽ: `Wallpaper.tsx` (tách file cho react-refresh).
- Lưu `Profile.wallpaper` (START `'aurora'`, `SAVED_KEYS`, `snapshot`); chơi mới thì về mặc định như âm thanh.
- Cài đặt → panel "Hình nền": 3 ô xem trước (vẽ hình nền cỡ 800×450 rồi `scale-[0.17]`), đang chọn viền vàng, bấm là đổi ngay.
- Người dùng: "dấu chấm than trong setting đưa qua góc bên phải và làm style giống chấm than ở bảng xếp hạng" → `Heading`
  (`components/ui/Panel.tsx`, prop `info`): ⓘ `ml-auto` sát phải, `size-5` màu `text-muted` (rê → `text-ink`) như đầu app bảng xếp hạng.
- Người dùng: "UI cài đặt làm style giống bảng xếp hạng" → `SettingsApp` bỏ `Panel` / `Heading`: đầu app ô icon `Settings` vàng +
  tiêu đề "Cài đặt" + dòng phụ + ⓘ; mỗi nhóm là `Section` (`rounded-2xl bg-black/15 p-1.5`, hàng tiêu đề chữ xám 13px + ⓘ phải)
  chứa các `Row` `bg-panel-2`; % âm lượng màu xanh bên phải; ô hình nền đang chọn = nền vàng tối + viền vàng như dòng của mình;
  ghi chú nhạc nền gộp vào ⓘ của nhóm Âm thanh.
- Người dùng: "ko hiển thị con chuột kèm dấu ? khi hover vào icon chấm than trong setting" → bỏ `cursor-help` ở ⓘ của `Section` (giữ con trỏ thường như bảng xếp hạng).
- Người dùng: "Cực quang => xoá name tương tự với 3 hình còn lại" → ô xem trước hình nền bỏ chữ tên bên dưới, chỉ còn ảnh
  (tên vẫn ở tooltip `title`, danh sách tên giữ trong `wallpapers.ts`).
- Người dùng: "button phá sản => xoá, h đây chỉ còn lưu tiến trình => xoá icon lưu tiến trình" → bỏ nút Phá sản + popup
  `ConfirmBankrupt` khỏi Cài đặt (nhóm Tiến trình chỉ còn nút xanh "Lưu tiến trình", không icon 💾). `endRun('bankrupt')` /
  lý do `bankrupt` trong `gameOver.ts` giữ nguyên (bản lưu / bảng xếp hạng cũ còn dùng). Cập nhật CLAUDE.md + OVERVIEW.
- Người dùng: "keeb-chan nhắc lại mẹo từ đầu => ẩn hiện keeb-chan" → nhóm Hướng dẫn: thay nút "Nhắc lại mẹo" bằng `Toggle` "Hiện Keeb-chan".
  Lưu `Profile.guideHidden` (START false, `SAVED_KEYS`, `snapshot`); `App.tsx` ẩn `GuideNpc` + `BenchDialog` khi bật ẩn
  (Keeb-chan ở màn tiêu đề vẫn hiện). Bỏ chức năng xoá `guideSeen` (nhắc lại mẹo) khỏi Cài đặt.

## Màn chờ bàn build che cả HUD + bỏ dòng mẹo chuột (2026-10-27)

- Người dùng: "khi vào bàn build đang hiển thị luôn trước cả đơn, các bước build menu bên trái + menu dưới cùng trong khi còn đang tải".
  Nguyên nhân: `ready` (Suspense ngoài: phòng + HDR) xong trước model bước (Suspense trong → `pending`), `BenchLoader` chuyển sang lớp mờ
  `z-[4]` nằm dưới HUD. Sửa: `loadingStore` thêm `settled` (ready + pending 0 lần đầu, tự đặt qua `subscribe`, reset khi `SceneReady` gỡ);
  `BenchLoader` phủ kín `z-[50]` tới khi `settled`, sau đó đổi bước mới phủ mờ như cũ.
- Người dùng: "text-xs text-muted max-md:hidden => bỏ đi" → xoá dòng mẹo chuột / phím dưới thanh công cụ đáy `BenchHud`.
- Người dùng: "bỏ phần header flex items-center gap-3 ở setting" → `SettingsApp` bỏ đầu app (ô icon + "Cài đặt" + dòng phụ + ⓘ),
  chỉ còn các khối nhóm `Section`.

## Chuông thông báo góc phải (2026-10-27)

- Người dùng: "thêm notify góc bên phải màn hình để xem được các thông báo (khách phát hiện bán đồ của khách, đánh giá, bài bid kết thúc…),
  có thể xoá noti nếu không cần xem lại".
- `NotifyBell` (`components/game/NotifyBell.tsx`) gắn cuối `StatusChips` → có ở taskbar desktop (mở lên) + thanh trên bàn build (mở xuống).
  Chấm đỏ số chưa xem; bảng portal ra body `z-[3100]` (taskbar nằm trong stacking context của desktop nên Keeb-chan z-60 đè lên nếu để absolute);
  mỗi dòng `bg-panel-2` tiêu đề + "Ngày N" + nội dung + nút X xoá, "Xoá hết"; thông báo đánh giá bấm mở app Đánh giá.
- Store (`metaSlice`): `logNotify(title, text, review?)` ghi vào `inbox` (mới nhất trước, `INBOX_KEEP` 50) + tăng `unread`;
  `removeNotify` / `clearNotify` / `readNotify` (mở bảng = đã xem). `notify` (popup đỏ) và `addReviews` tự ghi.
  Ghi thêm: bán được đồ (`completeSale`), fast bid có người BIN / hết giờ có người thắng / không ai trả (`settleBids`),
  khách huỷ đơn vì trễ hạn (`nextDay`), seller bùng hàng. Toast vẫn hiện như cũ.
- Lưu `Profile.inbox` + `unread` (START rỗng, `SAVED_KEYS`, `snapshot`); chơi mới thì xoá.
