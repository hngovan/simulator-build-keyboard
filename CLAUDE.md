# CLAUDE.md

Ghi chú cho Claude Code khi làm việc với repo này.

**Đọc `docs/decisions/` trước khi làm**: nhật ký những gì đã làm + quyết định theo từng mảng (hàn, đơn hàng,
dụng cụ, UI, cảnh 3D, giấy phép, quy trình). Làm xong thì ghi thêm vào đúng file.

## Tổng quan

Game mô phỏng nghề build bàn phím cơ (giao diện + comment tiếng Việt): nhận đơn qua "Mezzenger",
mua linh kiện ở "Shopii", lắp ráp trên bàn build 3D, test phím rồi giao hàng để được chấm điểm.
Stack: React 18 + TypeScript (strict) + Vite 6 + Tailwind v4 + React Three Fiber/drei + Zustand.
Âm thanh (`src/sound.ts`): sample CC0 trong `public/audio/sfx/` (tải trước khi tạo AudioContext), thiếu file thì tổng hợp bằng WebAudio.

## Lệnh

Chỉ dùng **Bun** (`bun install`, `bun run <script>`).

- `bun run dev` — dev server
- `bun run build` — `tsc` + `vite build`
- `bun run typecheck` / `bun run lint` / `bun run format:check` — chạy cả ba trước khi coi là xong
- `bun run convert:pcbs`: PCB Mechlovin (`assets/community/mechlovin-pcb`, chưa rõ giấy phép) → GLB nhẹ trong
  `public/models/pcbs/` (gộp màu + gom đỉnh 0.7mm) cho ảnh Shopii; danh sách mạch ở `PCB_MODELS` (parts.ts).
- `bun run convert:solder-tools`: bút hàn 60W (GLB), trạm hàn (OBJ), giá bùi nhùi (3MF) trong
  `assets/community/solder-tools/` → `public/models/solder/` (tách `iron-pro.glb` = mỏ hàn trạm, mũi ở gốc).
- `bun run convert:hand-tools`: tua vít điện (GLB Sketchfab, CC BY 4.0) + đồ mở switch MX (STL, chưa rõ giấy phép) trong
  `assets/community/hand-tools/` → `public/models/tools/` (tua vít: node `bit` quay + `body`, mũi ở gốc, trục +y).
- `bun run convert:switch` / `bun run convert:stab` — chuyển CAD STEP trong `assets/cad/` thành
  GLB trong `public/models/` (stab còn sinh `src/data/stabModel.json`). `scripts/probe-*.mjs`,
  `inspect-step.mjs` là script dò/kiểm tra model.

Không có test tự động. Khi dev, store được gắn vào `window.__game`, camera / controls / scene của bàn build
vào `window.__r3f` để debug trong console.

## Quy ước

- Prettier: nháy đơn, không chấm phẩy, trailing comma, printWidth 100, sắp xếp class Tailwind.
- LF cho mọi file, indent 2 space.
- Import qua alias `@/` → `src/`.
- Comment / text UI viết tiếng Việt, ngắn gọn, giống code xung quanh.
- ESLint flat config: TS + react-hooks + react-refresh.

## Kiến trúc

- `src/App.tsx` — chuyển màn theo `screen`: `title` → `pc` (desktop giả lập) → `bench` (cảnh 3D + HUD).
- `src/types.ts` — toàn bộ kiểu dùng chung (Key, Order, Inventory, BuildState, BuildContext, StepId...).
- `src/store/` — một store Zustand `useGame` ghép từ các slice:
  - `metaSlice.ts`: màn hình, cửa sổ app, toast, audio, new/continue/save, `snapshot()`.
  - `shopSlice.ts`: đơn hàng, kho (`inventory`), mua hàng, bài đăng group.
  - `buildSlice.ts`: thao tác trên bàn build, undo/`history` + `future` (redo: lùi về bước cũ rồi
    `forwardToStep` tiến lại; thao tác mới ở bước cũ thì bỏ `future`), `patchBuild` tự chuyển bước khi
    `stepProgress` của bước hiện tại đạt đủ, `deliver()`.
  - `scoring.ts`: `scoreDelivery` — hàm thuần chấm điểm khi giao.
  - `persistence.ts`: localStorage key `sbk-save-v3`, `Profile` (lâu dài) + `Session` (đơn đang làm).
  - `index.ts`: tự lưu debounce 400ms khi đổi một trong `SAVED_KEYS`; selector `useStep`, `useCtx`,
    `useBuild` (`useSticky` giữ giá trị cũ để cảnh 3D không vỡ khi build vừa bị xoá).
  - Thêm field cần lưu: cập nhật `Profile`/`Session`, `snapshot()` và `SAVED_KEYS`.
- `src/data/` — dữ liệu & logic thuần:
  - `parts.ts` (lớn nhất): case/pcb/plate/stab/switch/keycap/tool, `buildSound`, `soundMatch`.
  - `layouts.ts`: layout 40/60/HHKB/TKL/full + variant → `getLayout` trả về tọa độ phím (đơn vị u).
  - `steps.ts`: `STEP_INFO`, `buildContext()` sinh danh sách bước theo case/stab/pcb/mount
    (có cache), vị trí vít, hằng số cao độ `Y`, `stepProgress`. Bước tuỳ chọn: `OPTIONAL_STEPS`.
  - `mods.ts` (mod stab, lube), `orders.ts` (sinh đơn ngẫu nhiên), `supplies.ts` (vật tư tiêu hao).
- `src/features/` — UI 2D:
  - `desktop/`: Desktop, Taskbar; `apps.ts` là registry app (thêm app = thêm 1 dòng + `AppId`).
  - `apps/`: messenger, shop (Shopii), group, inventory, settings, tools.
  - `bench/`: HUD bàn build (StepList, ModPanels, SoundMeter) dùng `HudPanel` / `HudSection`
    (`components/ui/HudPanel.tsx`: thu gọn được, nhớ trạng thái; `StepDot` = chấm ✓ / số);
    Khung xem 3D dùng chung: `components/ui/ModelViewerFrame.tsx` (sản phẩm Shopii, case, đơn hàng);
    công tắc bật / tắt: `Toggle` (thay checkbox); khung cảnh báo nổi bật: `Alert`.
    `OrderPicker` (EmptyBenchHud.tsx) dùng cả ở bàn trống lẫn nút "Đổi đơn" khi đang build;
    giao hàng khi build chưa xong thì hỏi lại (`ConfirmDeliver` trong BenchHud).
    App "Kho" (`apps/inventory/InventoryApp`): chỉ đồ đang có (linh kiện đơn đang làm, dụng cụ, vật tư),
    ô kéo thả đổi chỗ + ảnh model 3D như Shopii + số lần còn dùng (`OwnedItems`).
    App "Chi tiết đơn" (`apps/inventory/OrderApp`): yêu cầu khách + đối chiếu linh kiện (✓ `StepDot`), mount, âm thanh.
    `EmptyBenchHud`: bàn trống (chưa có build) + bảng chọn đơn → `buildOrder(id)`. `title/`: màn hình tiêu đề.
- `src/scene/` — cảnh R3F: `Bench.tsx` (Canvas, camera, chọn trạm theo bước), `parts/` (Assembly,
  Case, Board, Keycap, Screw...), `stations/` (StabModStation, LubeStation), `models/` (Switch,
  Stabilizer từ GLB; dụng cụ), `materials.tsx`, `common/` (anim, hover).
- `src/components/` — `ui/` (Window, Button, Panel... export qua `index.ts`), `game/`, `art/`.
- `src/hooks/useKeyboardTest.ts` — bắt phím thật cho bước test.

## Luồng đơn hàng

- Mỗi ngày có `offers` (5–7 đơn, luôn có ít nhất 1 TKL + 1 60%, `randomOffers`). Nhận đơn (`acceptOrder(id)`) đặt `dueDay = day + days`.
  Chưa có đơn đang làm thì đơn thành `order` (đơn đang làm); có rồi thì vào `jobs` (mỗi job cất riêng
  inventory / build / history...). `switchJob(id)` cất đơn đang làm vào `jobs` và nạp đơn kia.
- Icon "Bàn build" (desktop / taskbar) luôn vào được: chưa có build thì bàn trống, bấm ô vàng chọn đơn
  (`buildOrder`: nhận / chuyển đơn, đủ đồ thì tự chọn mount + `startBuild`, thiếu thì liệt kê).
- Mua/được cung cấp linh kiện → chọn mount → `startBuild` kiểm tra kho rồi tạo `ctx = buildContext(...)`
  và `build = newBuild()`. `ctx` là dữ liệu dẫn xuất, không lưu — dựng lại từ order + inventory + mount.
- Các action trong `buildSlice` cập nhật `build` qua `patchBuild` (không tự chuyển bước; người chơi bấm
  `nextStep`) → bước `test` → `deliver()` gọi `scoreDelivery`, trừ uy tín theo số ngày trễ hạn.
- Hàn (PCB solder): cần mỏ hàn (`tools.solder` ≥ 1) + thiếc (`SOLDER_IDS` trong supplies, chọn ở `solderPick`).
  Giữ chuột trên chân: `solderTiming` cho vạch đạt / cháy; cháy thì `tipDirty`, phải lau bùi nhùi
  (`tipCleaner`, `cleanTip`). Dụng cụ có độ bền (`ToolDef.life`, đếm ở `wear`, hết thì về "chưa có"): bút hàn 300, trạm 1000, bùi nhùi 1000.
  Đồ hàn trên bàn: `SolderKit` (model ở `public/models/solder/`, `bun run convert:solder-tools`).
  Thời gian hàn theo giây thật (`solderWindow`): bút hàn chảy 2–2,5s / cháy 3s, trạm hàn 1–2s / 3s,
  thiếc đểu +0,5s (`slow`) và `burnChance` ẩn 15%. Bút / trạm đã mua đổi qua lại được (`solderOwned`).
  Thiếc đểu có `burnChance` (cháy dù nhả đúng vùng xanh). Bàn mod stab bày đúng số stab của layout (`stabUnits`).
  Đầu vít đang lắp (`screwBit`) lưu trong Profile.
  Stab plate-mount: gài vào plate (lắp sau bước plate, cao hơn PCB), cần plate cứng (`PlateDef.flex` = PC / POM / PP
  không dùng được, `plateStabClash`).
  Đơn full có `pcbType` thì kho phải đúng loại PCB. Save có `rev` để nâng cấp bản cũ (`loadSave`).
- Đơn có `switchKind` (Linear / Tactile / Clicky / Silent, `SWITCH_KINDS`): kho phải đúng loại switch.
  Đơn kit: khách gửi từng món ngẫu nhiên (`Kit.case? / pcb? / plate? / stab?`, ít nhất 1 món); chỉ có `mount` khi gửi case,
  món không gửi thì đơn có thể ghi `pcbType` / `caseColor`.
- Nhiều đơn mỗi ngày: `deliver()` chấm điểm rồi đẩy vào `packed` (Session) và trả bàn trống; gửi từng đơn ở Mezzenger
  (`shipOrder`, cộng tiền / uy tín ngay, `PackedOrder.shipped`), "Kết thúc ngày" (`nextDay()`) gửi nốt đơn chưa gửi.
  Mezzenger là app chat (hội thoại đơn mới / chờ gửi / đã gửi + câu trả lời nhanh); đơn đã nhận xem ở app Chi tiết đơn.
  Nút "Danh sách đơn" (bàn build) = `OrderPicker` có % tiến độ (`buildPercent`).
- Chứng chỉ thợ (`TOOLS.cert`, mục Shopii "Chứng chỉ thợ"): thợ lõ / middle / senior = số phím mỗi lần lắp switch / keycap
  (`installRun`) và số switch mỗi mẻ lube; khung treo tường `createDiploma` (`scene/models/diplomaModel.ts`).
- Lube switch: phải mở từng switch bằng đồ mở trước (`openSwitch`, đếm `build.opened`, 1 click = 1 switch), `lubeBatch`
  chỉ lube switch đã mở. Bàn build có màn hình (`scene/models/Computer.tsx`): bấm vào thì về desktop.
- `nextDay()` (sau khi giao): ngày + 1, đợt đơn mới, job trễ quá 3 ngày thì khách huỷ (−3 uy tín).
- Case có `model` dùng GLB CAD thật ở `public/models/cases/`: Bakeneko 60, Planck
  (`bun run convert:cases`, MIT), Alice = Blossom (doughnut923/Blossom, MIT; layout + viền PCB sinh từ PCB KiCad bằng `node scripts/alice-layout.mjs` → `src/data/aliceKeys.ts`) và bộ sưu tập cá nhân trong `assets/user-cases/` (Exodus60/80, Repent75,
  Catto HHKB...; `bun run convert:user-cases`, chưa rõ giấy phép; cả 2 script convert case đã sửa lật gương: phím mũi tên ở trước phải, USB ở sau). `seat` = độ cao + góc nghiêng plate
  trong case (board nâng / nghiêng khi thả vào case); `modelFor` = nắp riêng HHKB / WKL; `layouts` = giới hạn layout.
- Phím có `rot` (Alice: cột trong xoay ±12°, layout `fixed` toạ độ thật + `origin` / `outline`); `row` = hàng keycap đếm từ dưới lên (R1–R4 theo profile).
  PCB / plate theo đường viền `boardOutline` (layout xoay: đa giác lồi mỗi nửa). Chỗ trống hàng dưới
  (HHKB, WKL) có khối chặn liền case (`blockerGaps`).
- Ảnh đơn / case Shopii / cửa sổ xem 3D dùng chung `buildKeyboardModel` (`features/apps/messenger/orderThumb.ts`).
- Nhạc nền: file `public/audio/bgm.mp3` nếu có, không thì loop tổng hợp (`src/sound.ts`).
