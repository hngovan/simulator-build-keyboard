# CLAUDE.md

Ghi chú cho Claude Code khi làm việc với repo này.

**Đọc `docs/decisions/` trước khi làm**: nhật ký những gì đã làm + quyết định theo từng mảng (hàn, đơn hàng,
dụng cụ, UI, cảnh 3D, giấy phép, quy trình). **Mỗi task làm xong phải ghi lại** (ngày, yêu cầu, đã làm gì, file / hàm chính,
lý do) vào đúng file để lần sau khỏi làm lại / làm ngược.
Tổng quan source + luồng game + cách chơi: `docs/OVERVIEW.md` (sửa luồng chơi thì cập nhật cả file này + README).

**Việc nhỏ, độc lập** (tài liệu, CSS, sửa 1 file...) giao cho opencode qua Orca:
`orca agent launch --agent opencode --prompt "<brief>" --json`, đọc kết quả `orca terminal read --terminal <handle> --json`.
Brief phải nói rõ file được sửa (tránh đè việc đang làm), chạy format / lint, không commit (xem `docs/decisions/quy-trinh.md`).

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
- `bun run convert:solder-tools`: bút hàn 60W (GLB), trạm hàn (OBJ), giá bùi nhùi (3MF) trong
  `assets/community/solder-tools/` → `public/models/solder/` (tách `iron-pro.glb` = mỏ hàn trạm, mũi ở gốc).
- `bun run convert:hand-tools`: tua vít điện (GLB Sketchfab, CC BY 4.0) + đồ mở switch MX (STL, chưa rõ giấy phép) trong
  `assets/community/hand-tools/` → `public/models/tools/` (tua vít: node `bit` quay + `body`, mũi ở gốc, trục +y).
- `bun run fetch:emotes`: emote ếch Pepe (FrankerFaceZ, chỉ dùng cá nhân) → `public/emotes/`, emoji trong chat Mezzenger thay bằng emote (`messenger/emotes.tsx`).
- `bun run convert:screwdriver-lite`: tua vít tay Poly Haven → `public/models/room/screwdriver-lite.glb` (bỏ texture, màu đỉnh, 90KB).
- `bun run gen:plates-universal`: plate universal 60 / 75 / TKL / full bằng lõi ai03 Plate Generator (kbplate.ai03.com,
  AGPL — clone ngoài repo, đặt `YAKB_DIR`): layout game gộp mọi variant → KLE + DXF trong `assets/plates/universal/`
  → `src/data/generated/plateUniversal.ts` (Board.tsx dùng, trừ 60 chuẩn giữ plate CAD typ60).
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
- Tooltip: chỉ cần ghi `title="..."` (1 dòng ngắn), `GlobalTooltip` tự vẽ kiểu game; không dùng dòng phụ trong tooltip.

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
    lưới ô kiểu túi đồ game (kéo thả vào ô bất kỳ) + ảnh model 3D như Shopii + số lần còn dùng (`OwnedItems`).
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
  PCB khoét 2 lỗ chân housing mỗi bên stab (`stabHoles` trong steps.ts, khớp chốt model CAD); vít screw-in bắt vào lỗ nhỏ.
  Top mount (case 2 mảnh): `topCase` (úp case trên lên plate) → `topScrew` (lật board, vặn vít từ dưới vào vách case trên) →
  `caseIn` (case trên nhấc theo board) → `caseScrew`, không có `caseClose`. O-ring mount (case 1 mảnh): vòng `ring` kẹp giữa PCB
  và plate, gá trước bước plate, không gasket.
  Stab plate-mount: gài vào plate (lắp sau bước plate, cao hơn PCB), cần plate cứng (`PlateDef.flex` = PC / POM / PP
  không dùng được, `plateStabClash`).
  Đơn full có `pcbType` thì kho phải đúng loại PCB. Save có `rev` để nâng cấp bản cũ (`loadSave`).
- Đơn có `switchKind` (Linear / Tactile / Clicky / Silent, `SWITCH_KINDS`): kho phải đúng loại switch.
  Đơn kit: khách gửi từng món ngẫu nhiên (`Kit.case? / pcb? / plate? / stab?`, ít nhất 1 món); chỉ có `mount` khi gửi case,
  món không gửi thì đơn có thể ghi `pcbType` / `caseColor`.
- Nhiều đơn mỗi ngày: `deliver()` chấm điểm rồi đẩy vào `packed` (Session) và trả bàn trống; gửi từng đơn ở Mezzenger
  (`shipOrder`, cộng tiền / uy tín ngay, `PackedOrder.shipped`), "Kết thúc ngày" (`nextDay()`) gửi nốt đơn chưa gửi.
  Mezzenger là app chat (hội thoại đơn mới / đã nhận / chờ gửi / từ chối, chỉ mất khi gửi hàng; câu trả lời nhanh = tin gửi khách).
  Từ chối quá `DECLINE_FREE` đơn / ngày thì −1 uy tín; khách để lại đánh giá (`data/reviews.ts`, `Profile.reviews`) → thông báo
  góc phải trên (`ReviewPops`) + app "Đánh giá".
  Tin khách tô đậm / màu chữ cần chú ý (`messenger/highlight.tsx`); "Nhận đơn" gửi tin "Ok shop nhận đơn này nhé";
  đơn xong: khách tự qua lấy hoặc shop xin địa chỉ rồi gửi (`delivery()` theo id đơn).
  Nút "Danh sách đơn" (bàn build) = `OrderPicker` có % tiến độ (`buildPercent`), chỉ đơn đã nhận (nhận đơn chỉ ở Mezzenger).
- Chứng chỉ thợ (`TOOLS.cert`, mục Shopii "Chứng chỉ thợ"): thợ lõ / middle / senior = số phím mỗi lần lắp switch / keycap
  (`installRun`) và số switch mỗi mẻ lube; khung treo tường `createDiploma` (`scene/models/diplomaModel.ts`).
- Lube switch: phải mở switch bằng đồ mở trước (`openSwitch`, đếm `build.opened`, mỗi click = bậc thợ), `lubeBatch(idx)`
  chỉ lube switch đã mở, bấm con nào lube mẻ bắt đầu từ con đó (`build.lubedIds`, `lubedIds()` trong mods.ts); mỗi switch mở
  ra bỏ 1 lò xo vào hộp, mở hết mới lắc lube lò xo được. Vật bấm được ở bàn lube / mod stab viền vàng khi rê (`Clickable` +
  `useHoverOutline`), mũi tên vàng chỉ việc tiếp theo (`HintArrow`, StationKit). Sách phép (mục Shopii "Sách phép" = vật tư có `SupplyDef.spell`), bán riêng; mở / lube / lắp: thợ lõ có phép = 10 con, có chứng chỉ thì cộng 10 (`spellRun`): `spellOpen` (mở,
  bàn bày tới 10 đồ mở `openerSlots`) `spellLube` (+10 con mỗi mẻ lube) và `spellAssem`
  (+10 switch mỗi lần lắp, `installRun`), `spellKeycap` (+10 keycap mỗi lần lắp), `spellSolder` (1 lần hàn = 10 phím, cháy thì cháy cả 10, `solderKey`),
  `spellDesolder` (1 lần hút = 10 phím cháy, `desolderKey`), mỗi loại 200 lần, `spellBonus(supplies, id)`,
  chỉ trừ lượt khi vượt bậc thợ. Bàn build có màn hình (`scene/models/Computer.tsx`): bấm vào thì về desktop.
- `nextDay()` (sau khi giao): ngày + 1, đợt đơn mới (số đơn + hệ số tiền công theo bậc uy tín, `data/reputation.ts`),
  job trễ quá 3 ngày thì khách huỷ (−3 uy tín). Chứng chỉ thợ cộng thu nhập cơ bản vào ví mỗi lần nhận đơn (`CERT_BONUS`).
- Case có `model` dùng GLB CAD thật ở `public/models/cases/`: Bakeneko 60, Planck
  (`bun run convert:cases`, MIT), Alice = Blossom (doughnut923/Blossom, MIT; layout + viền PCB sinh từ PCB KiCad bằng `node scripts/alice-layout.mjs` → `src/data/aliceKeys.ts`) và bộ sưu tập cá nhân trong `assets/user-cases/` (Exodus60/80, Repent75,
  Catto HHKB...; `bun run convert:user-cases`, chưa rõ giấy phép; cả 2 script convert case đã sửa lật gương: phím mũi tên ở trước phải, USB ở sau). `seat` = độ cao + góc nghiêng plate
  trong case (board nâng / nghiêng khi thả vào case); `modelFor` = nắp riêng HHKB / WKL; `layouts` = giới hạn layout.
- Phím có `rot` (Alice: cột trong xoay ±12°, layout `fixed` toạ độ thật + `origin` / `outline`); `row` = hàng keycap đếm từ dưới lên (R1–R4 theo profile).
  PCB / plate theo đường viền `boardOutline` (layout xoay: đa giác lồi mỗi nửa). Chỗ trống hàng dưới
  (HHKB, WKL) có khối chặn liền case (`blockerGaps`).
- Ảnh đơn / case Shopii / cửa sổ xem 3D dùng chung `buildKeyboardModel` (`features/apps/messenger/orderThumb.ts`).
- Hội Phím Cơ: bài pass viết bằng thuật ngữ chợ phím che tình trạng thật (`data/market.ts`); inbox người bán (xin hình, check var,
  xin bớt, lowball...) để dò lỗi / trả giá; hàng lỗi ghi `flaw` vào linh kiện → trừ điểm khi giao, seller bùng thì mất tiền.
- Nhạc nền: file `public/audio/bgm.mp3` nếu có, không thì loop tổng hợp (`src/sound.ts`).
