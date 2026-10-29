# CLAUDE.md

Ghi chú cho Claude Code khi làm việc với repo này.

**Đọc `docs/decisions/` trước khi làm**: nhật ký những gì đã làm + quyết định theo từng mảng (hàn, đơn hàng,
dụng cụ, UI, cảnh 3D, giấy phép, quy trình). **Mỗi task làm xong phải ghi lại** (ngày, yêu cầu, đã làm gì, file / hàm chính,
lý do) vào đúng file để lần sau khỏi làm lại / làm ngược.
**Mỗi lần commit tính năng**: thêm 1 mục lên đầu `src/data/changelog.ts` (phiên bản, ngày, commit, tóm tắt) và nâng
`version` trong `package.json` cho khớp — màn hình tiêu đề hiện số phiên bản, bấm vào xem lịch sử cập nhật.
Tổng quan source + luồng game + cách chơi: `docs/OVERVIEW.md` (sửa luồng chơi thì cập nhật cả file này + README).
Mô tả sản phẩm / người chơi: `PRODUCT.md`; hệ thống giao diện (màu, font, bóng đổ, component, Do / Don't): `DESIGN.md`
(+ `.impeccable/design.json`), dùng cho skill `/impeccable` — đổi UI chung thì cập nhật cả 2 file này.

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
- `bun run server` — server bảng xếp hạng local (`server/leaderboard.ts`, Bun, lưu `server/data/leaderboard.json`, cổng
  `LEADERBOARD_PORT` mặc định 8787); Vite proxy `/api` về đó, client đổi địa chỉ bằng `VITE_LEADERBOARD_URL`.
  Bản deploy Vercel: `api/leaderboard.ts` (Vercel Function, Upstash Redis, cùng API; code chung trong `server/leaderboardCore.ts`).
- `bun run build` — `tsc` + `vite build`
- `bun run typecheck` / `bun run lint` / `bun run format:check` — chạy cả ba trước khi coi là xong
- `bun run convert:solder-tools`: bút hàn 60W (GLB), trạm hàn (OBJ), giá bùi nhùi (3MF) trong
  `assets/community/solder-tools/` → `public/models/solder/` (tách `iron-pro.glb` = mỏ hàn trạm, mũi ở gốc).
- `bun run convert:hand-tools`: tua vít điện (GLB Sketchfab, CC BY 4.0) + đồ mở switch MX (STL, chưa rõ giấy phép) trong
  `assets/community/hand-tools/` → `public/models/tools/` (tua vít: node `bit` quay + `body`, mũi ở gốc, trục +y).
- `bun run fetch:emotes`: emote ếch Pepe (FrankerFaceZ, chỉ dùng cá nhân) → `public/emotes/`, emoji trong chat Mezzenger thay bằng emote (`messenger/emotes.tsx`).
- `bun run convert:desk-gear`: bàn phím Realforce 87U + chuột DeathAdder người dùng đưa (`assets/user-desk/`, gitignore, chỉ dùng cá nhân)
  → `public/models/desk/` (gltf-transform optimize, simplify 2% + meshopt).
- `bun run convert:screwdriver-lite`: tua vít tay Poly Haven → `public/models/room/screwdriver-lite.glb` (bỏ texture, màu đỉnh, 90KB).
- `bun run gen:plate-blossom`: plate gasket Blossom từ `assets/community/blossom/plate/plate.dxf` → `src/data/generated/plateBlossom.ts`
  (căn lỗ switch theo layout Alice, dò tai → `BLOSSOM_GASKETS`; Board `AlicePlate` dựng từ đây).
- `bun run gen:plates-universal`: plate universal 60 / 75 / TKL / full bằng lõi ai03 Plate Generator (kbplate.ai03.com,
  AGPL — clone ngoài repo, đặt `YAKB_DIR`): layout game gộp mọi variant → KLE + DXF trong `assets/plates/universal/`
  → `src/data/generated/plateUniversal.ts` (Board.tsx dùng, trừ 60 chuẩn giữ plate CAD typ60).
- `bun run convert:switch` / `bun run convert:stab` — chuyển CAD STEP trong `assets/cad/` thành
  GLB trong `public/models/` (stab còn sinh `src/data/stabModel.json`). `scripts/probe-*.mjs`,
  `inspect-step.mjs` là script dò/kiểm tra model. Thêm / đổi model case thì chạy `node scripts/probe-case-feet.mjs`
  (dò hốc dán feet dưới đáy → `src/data/caseFeet.json`, `RubberFeet` trong Case.tsx dán feet vào đúng hốc).

Không có test tự động. Dev: Cài đặt → Dev → "Chọn case" build thử mọi case (`order.dev`, bước nào cũng bỏ qua được), trên bàn build có `DevCasePanel`
đổi case / chất liệu / màu / mount. Khi dev, store được gắn vào `window.__game`, camera / controls / scene của bàn build
vào `window.__r3f` để debug trong console.

## Quy ước

- Prettier: nháy đơn, không chấm phẩy, trailing comma, printWidth 100, sắp xếp class Tailwind.
- LF cho mọi file, indent 2 space.
- Import qua alias `@/` → `src/`.
- Comment / text UI viết tiếng Việt, ngắn gọn, giống code xung quanh.
- ESLint flat config: TS + react-hooks + react-refresh.
- Chọn option sản phẩm Shopii: `OptionFilter` (nút lọc → popup 2 cột chất liệu | màu, kiểu menu lọc hội thoại Mezzenger, giá chỉ
  hiện khi khác nhau); ô đổ xuống khác: `OptionSelect`; `OptionChip` chỉ cho bộ lọc / picker khung 3D; tab lọc đầu app
  (bảng xếp hạng, Kho) dùng `TabChip` (đang chọn = khối vàng đặc). App dạng danh sách theo khuôn bảng xếp hạng: đầu icon vàng +
  tiêu đề + ⓘ, khung `bg-black/15` có hàng tiêu đề cột, dòng `bg-panel-2` (dòng của mình / đang làm viền vàng), giá trị xanh bên phải.
- Con trỏ: pixel 8-bit `public/cursors/` (`node scripts/gen-cursors.mjs`), biến `--cursor-arrow` / `--cursor-hand` trong `index.css`; vật 3D bấm được
  dùng `useHover` (gán `var(--cursor-hand)`), không gán `'pointer'` / `'auto'` thẳng.
- Tooltip: chỉ cần ghi `title="..."` (1 dòng ngắn), `GlobalTooltip` tự vẽ kiểu game (căn giữa phần tử, `data-tip-align="start"` = căn mép trái); không dùng dòng phụ trong tooltip.
  Nội dung nhiều dòng (mô tả, gạch đầu dòng): `<Tooltip wide content={...}>`. Cả 2 đo kích thước rồi đặt bằng `placeTip` (tự lật, nằm trong
  màn hình); không tự vẽ khung nổi `absolute` (bị khung cuộn cắt).
- Badge / nhãn trạng thái: luôn dùng `<Badge solid tone="...">` (khối màu đặc + bóng đổ giống `Button`, màu lấy từ `BUTTON_TONES`:
  default / green / yellow / red / blue / orange / purple); đứng đầu dòng / trong flex thì thêm `className="ml-0"`. Không dùng Badge viền mảnh
  (không `solid`) hay tự vẽ span màu; nút chọn dùng `OptionChip`, nút bấm dùng `Button`. Sửa UI thì đồng bộ theo các component này.
- Ngoại lệ, app kiểu bảng xếp hạng (Bảng xếp hạng, Mezzenger, Đánh giá, Hội Phím Cơ): không badge — đầu app ô icon + tiêu đề vàng + `CircleAlert`
  tooltip, tab `TabChip` đứng yên, danh sách trong khối `rounded-2xl bg-black/15 p-1.5`, nhãn = chữ màu (`group/Tag.tsx`) hoặc vật gắn lên thẻ.

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
  - `apps/`: messenger, shop (Shopii), group, inventory, settings.
  - `bench/`: HUD bàn build (StepList, ModPanels, SoundMeter) dùng `HudPanel` / `HudSection`
    (`components/ui/HudPanel.tsx`: thu gọn được, nhớ trạng thái; `StepDot` = chấm ✓ / số);
    Khung xem 3D dùng chung: `components/ui/ModelViewerFrame.tsx` (sản phẩm Shopii, case, đơn hàng);
    công tắc bật / tắt: `Toggle` (thay checkbox); khung cảnh báo nổi bật: `Alert`.
    giao hàng khi build chưa xong thì hỏi lại (`ConfirmDeliver` trong BenchHud).
    App "Kho" (`apps/inventory/InventoryApp`): chỉ đồ đang có (linh kiện đơn đang làm, dụng cụ, vật tư),
    lưới ô kiểu túi đồ game (kéo thả vào ô bất kỳ) + ảnh model 3D như Shopii + số lần còn dùng (`OwnedItems`).
    App "Chi tiết đơn" (`apps/inventory/OrderApp`): yêu cầu khách + đối chiếu linh kiện (✓ `StepDot`), mount, âm thanh.
    `EmptyBenchHud`: bàn chưa vào build — trống / thùng đơn còn thiếu đồ (bấm "Mở thùng" = `buildOrder`) / thùng đã đóng gói. `title/`: màn hình tiêu đề.
- Phòng đi lại (kiểu PC Building Simulator): `screen = 'bench'` + `walk` (metaSlice, không lưu; `standUp('pc' | 'bench')`).
  `scene/room/`: `roomLayout.ts` (toạ độ phòng / bàn / hành lang / vùng đi `WALK_AREAS` / khối cản `BLOCKS`), `WalkControls`
  (chỉ WASD đi, không mũi tên, không chạy, không bấm sàn đi tới; kéo nhìn, cuộn chuột giữa zoom FOV, bay camera `useRoom.fly`), `RoomSpot` (vật bấm được + chữ gợi ý HUD), `PcDesk` (bàn máy tính sát
  trái bàn build, CPU dưới gầm, lót chuột 90 × 40), `RoomWindow` (rèm lá), `WallCalendar`, `DoorParcels` (kệ cuối hành lang: thùng đơn + kiện Shopii + ô giao hàng),
  `StorageShelf` (kệ cất đơn tường phải), `HeldBox` (thùng đang cầm),
  `Stool`, `HallProps` (cửa 6 ô, kệ sắt), tranh `CanvasPainting` / `ModelPainting` (+ `*Art.ts` vẽ canvas), `sitAtBench`;
  HUD `features/room/RoomHud` (hướng dẫn 1 dòng chữ to giữa đáy có hình chuột / phím: `components/game/ControlsHint`), popup lịch `CalendarDialog` (bấm lịch, nơi duy nhất kết thúc ngày).
- `src/scene/` — cảnh R3F: `Bench.tsx` (Canvas, camera, chọn trạm theo bước), `parts/` (Assembly,
  Case, Board, Keycap, Screw...), `stations/` (StabModStation, LubeStation), `models/` (Switch,
  Stabilizer từ GLB; dụng cụ), `materials.tsx`, `common/` (anim, hover).
- `src/components/` — `ui/` (Window, Button, Panel... export qua `index.ts`), `game/`, `art/`.
- `src/hooks/useKeyboardTest.ts` — bắt phím thật cho bước test.

## Luồng đơn hàng

- Mỗi ngày có `offers` (5–7 đơn, luôn có ít nhất 1 TKL + 1 60%, `randomOffers`). Nhận đơn (`acceptOrder(id)`) đặt `dueDay = day + days`.
  Chưa có đơn đang làm thì đơn thành `order` (đơn đang làm); có rồi thì vào `jobs` (mỗi job cất riêng
  inventory / build / history...). `switchJob(id)` cất đơn đang làm vào `jobs` và nạp đơn kia.
- Thùng hàng vật lý (`store/carrySlice.ts`, `data/boxes.ts`; Session `boxes` / `benchBox` / `held`): nhận đơn thì thùng đơn tới ô nhận đơn
  kệ cuối hành lang (`boxes[id] = door`, 3 ô / hàng, quá thì xếp sàn); đi lại bấm thùng = `pickBox` (cầm 1 thùng), bấm bàn build = `placeBench`
  (chuyển sang đơn đó `switchJob(id, true)`, đủ đồ thì `buildOrder` vào build, thiếu thì thùng nằm chờ) rồi ngồi xuống. Không còn bảng chọn đơn:
  đổi đơn = nút "Cầm thùng đơn lên" (`pickBench`, giữ tiến độ) → cất ô mờ kệ cất đơn (`placeShelf`) → lấy thùng khác. Bàn chỉ hiện build khi
  thùng đơn đang làm nằm trên bàn (`onBench`; đơn dev luôn tính); `startBuild` / `switchJob` chặn khi thùng chưa / còn trên bàn. Ô mờ (`GhostSlot`)
  chỉ hiện khi đang cầm thùng hợp chỗ đó (khối xanh nhạt viền mảnh). Thùng của đơn mất (huỷ, sang ngày) tự dọn (subscribe trong `store/index.ts`).
  Đi lại chỉ tương tác trong tầm với `REACH_M` (`inReach`). Cầm đơn dở lên = hoạt cảnh cho lại vào thùng (`requestStash`). Thùng đã đóng gói chưa gửi
  mở lại được (`unpackBox`, dữ liệu đơn trong `PackedOrder.session`; đồ thừa vào kho chung lúc gửi). Gửi xong thù lao chờ thu ở Mezzenger
  (`paid: false`, banner `PayBanner`, `collectPay`, qua ngày tự thu).
- Shopii không vào kho ngay: chọn tốc độ giao (`data/shipping.ts` `SHIP_SPEEDS`: Hoả tốc trong ngày ×1.25 / Nhanh 1 ngày / Tiết kiệm 2 ngày ×0.9),
  trả tiền lúc đặt (`orderParcel`) → kiện `Profile.parcels` tới cửa theo ngày, ra cửa nhận (`pickupParcel`; đơn lúc đặt không còn đang làm thì vào kho chung).
  Hội Phím Cơ (`buyPost` → `buy` / `buySupply` / `buyTool`) vẫn nhận ngay. Shopii mục "Đơn đang giao" (`ParcelList`), kiện đặt hôm nay huỷ được (`cancelParcel`).
- Mua/được cung cấp linh kiện → chọn mount → `startBuild` kiểm tra kho rồi tạo `ctx = buildContext(...)`
  và `build = newBuild()`. `ctx` là dữ liệu dẫn xuất, không lưu — dựng lại từ order + inventory + mount.
- Các action trong `buildSlice` cập nhật `build` qua `patchBuild` (không tự chuyển bước; người chơi bấm
  `nextStep`; riêng `dropInCase` case 1 mảnh thả xong, `placeFoot` dán xong feet cuối, `turnScrew` bắt đủ vít bước vặn vào (chờ `SPIN_MS`) thì tự sang bước kế) → bước `test` → `deliver()` gọi `scoreDelivery`, trừ uy tín theo số ngày trễ hạn.
- Hàn (PCB solder): cần mỏ hàn (`tools.solder` ≥ 1) + thiếc (`SOLDER_IDS` trong supplies, chọn ở `solderPick`).
  Hàn + vặn vít vào = skill check (`data/skillCheck.ts`, `scene/common/skill.ts`, thanh `components/game/SkillBar`): bấm cho kim chạy qua lại,
  bấm lần nữa / Space dừng; đỏ trái = thiếu (hụt / vít vào 1 phần), xanh đạt, vàng hoàn hảo (`build.perfect`, thưởng ≤ 5 điểm khi giao),
  đỏ phải = quá (cháy / trượt ren). Hàn cháy thì `tipDirty`, phải lau bùi nhùi
  (`tipCleaner`, `cleanTip`). Dụng cụ có độ bền (`ToolDef.life`, đếm ở `wear`, hết thì về "chưa có"): bút hàn 300, trạm 1000, bùi nhùi 1000.
  Đồ hàn trên bàn: `SolderKit` (model ở `public/models/solder/`, `bun run convert:solder-tools`).
  Độ khó hàn (`solderSkill`): bút hàn vùng xanh 20% thanh / kim 0,9 lượt/s, trạm 28% / 0,75, thiếc đểu (`slow`) hẹp vùng xanh
  và `burnChance` ẩn 15%. Hút thiếc cháy: bấm 1 lần là bút hút tự chạy. Bút / trạm đã mua đổi qua lại được (`solderOwned`).
  Thiếc đểu có `burnChance` (cháy dù nhả đúng vùng xanh). Bàn mod stab bày đúng số stab của layout (`stabUnits`).
  Đầu vít đang lắp (`screwBit`) lưu trong Profile. Sai đầu vít không chặn: trượt ren, `STRIP_TRIES` 3 lần / vít mới tuôn ren (`build.slips` → `build.stripped`, hoàn tác không gỡ).
  Bước vặn vào là skill check canh lực (`tightenScrew(id, result)`, `torqueSpec` theo `ToolDef.torque` {width, speed}: tay 24% / 0,7,
  điện 15% / 1,2), đỏ phải = trượt ren (3 lần thì tuôn); vít ăn vào case PC / mica / acrylic (`CASE_SCREW_STEPS`, `brittleCase`) `CRACK_CHANCE` nứt case (`build.cracked`).
  Vít stab tuôn ren = stab hỏng (vòng đỏ, không tự sang bước): có stab dư cùng cỡ thì bấm vít đỏ thay (`replaceStab`, vặn lại cả stab).
  Giao: `DeliveryResult.refund` + `repLoss` (case nứt / vít case-top-tray tuôn ren bị phát hiện: 80% giá case `CASE_REFUND`, −2 uy tín
  `CASE_DAMAGE_REP`; stab tuôn ren: đền nguyên giá bộ stab). Khách không để ý tuôn ren 20% (`STRIP_UNNOTICED`), hỏng ≤ 1/3 số lỗ
  cùng loại thì 30% (`STRIP_FEW_UNNOTICED`); nứt luôn bị phát hiện. `payout()`.
  PCB khoét 2 lỗ chân housing mỗi bên stab (`stabHoles` trong steps.ts, khớp chốt model CAD); vít screw-in bắt vào lỗ nhỏ.
  Top mount (case 2 mảnh): `topCase` (úp case trên lên plate, xong tự sang bước) → `topScrew` (người chơi lật bằng Q / bấm case, vặn ốc M2×4
  từ dưới qua lỗ tai plate vào lỗ ren trong hốc vách case trên: `TOP_NOTCH` / `TOP_HOLE`, ốc có sẵn trên khay) →
  `caseIn` (case trên nhấc theo board) → `caseScrew`, không có `caseClose`. O-ring mount (case 1 mảnh): vòng `ring` kẹp giữa PCB
  và plate, gá trước bước plate, không gasket.
  Dây O-ring là vật tư 3 độ cứng (`ORING_IDS`: trắng 30A / đen 50A / đỏ 70A, `oringPick`, `build.ring` = id dây, âm theo Shore);
  đơn có thể đòi `oring` (+ `mount` O-ring với đơn mua đủ).
  Stab plate-mount: gài vào plate (lắp sau bước plate, cao hơn PCB), mọi chất liệu plate đều được.
  Plateless: plate ảo `PLATELESS` (`'none'` trong `PLATES`, không bán: `plateIds()`), bật ở app Danh sách đơn (`setPlateless`);
  cần PCB hàn + stab không plate-mount (`platelessIssue`) + mount tray (`PLATELESS_MOUNTS`); `buildContext` bỏ bước `foam` / `plate`.
  Gasket mount: bước `gasket` dán dải Poron 20 × 4mm (vật tư `GASKET_ID`, mặt trên + mặt dưới tai / mép plate, `GASKET`; Blossom dải
  dài hết tai + xoay theo mép, `ctx.gaskets[].w / rot`; tiêu hao `gasketStrips` = số dải 20mm phủ hết × 2).
  Foam Poron PCB: bước tuỳ chọn `foam` trước `plate` (`placeFoam` trừ vật tư `FOAM_ID`, `build.foam`, âm thock hơn), cảnh `scene/parts/Foam.tsx`.
  Feet: bước `feet` (trước `topCase` / `caseIn`, case tự lật úp, chỉ hiện case) dán 1 feet vào mỗi hốc `ctx.feet`
  (`feetPockets` trong steps.ts: case CAD = hốc `caseFeet.json`, case dựng bằng code = 4 hốc CNC lõm `FOOT_R` / `FOOT_DEPTH`
  khoét trong `caseShellGeometry` / tấm mica đáy), `placeFoot(i)` trừ 1 vật tư `feetPick` (`FEET_IDS` nhiều màu, Shopii gộp 1 sản phẩm
  chọn màu, vỉ 4 cái), `build.feet` lưu loại; `FeetPanel` (ModPanels) chọn màu. Save rev 4: build cũ đã qua chỗ chèn bước thì dời stepIdx (`addFeetStep`).
  Đơn full có `pcbType` thì kho phải đúng loại PCB. Save có `rev` để nâng cấp bản cũ (`loadSave`).
- Đơn có thể đòi đích danh `switchType` / `caseId` / `stabType` / `plateMaterial` (món khách không gửi), `checkInventory` bắt đúng; thiếc / vật tư không bị đòi.
- Keycap có chất liệu `material` (PBT / ABS / Mix, `KEYCAP_MATERIALS`), đơn có thể đòi `keycapMaterial` (`keycapCheck`); bộ `KEYCAP_KITS.base` ẩn (`hidden`).
- Đơn có `switchKind` (Linear / Tactile / Clicky / Silent / SilentTactile, `SWITCH_KINDS`): kho phải hợp loại (`switchFits`: Silent Tactile hợp cả Tactile / Silent).
  ~35% đơn có thêm `switchType` = đòi đúng 1 con (vd Cherry MX Đen): kiểm bằng `switchOk(type, order)`, tên hiện bằng `switchWant(order)`.
  Đơn kit: khách gửi từng món ngẫu nhiên (`Kit.case? / pcb? / plate? / stab?`, ít nhất 1 món); chỉ có `mount` khi gửi case,
  món không gửi thì đơn có thể ghi `pcbType` / `caseColor`.
- Nhiều đơn mỗi ngày: bước cuối `pack` (thùng carton sau bàn phím `PackBox`, `packStore` `requestPack`; nút cam cũng vậy, chưa đủ thì hỏi lại) → `deliver()` chấm điểm, đẩy vào `packed` (Session), thùng đã đóng gói nằm trên bàn (`benchBox`);
  cầm thùng ra ô giao hàng (2 tầng trên kệ cửa) = `placeShip` → `shipOrder` (cộng tiền / uy tín ngay, `PackedOrder.shipped`; Mezzenger không còn nút gửi),
  "Kết thúc ngày" (`nextDay()`) gửi nốt đơn chưa gửi.
  Kết thúc ngày = bấm lịch treo tường trong phòng (`CalendarDialog`) → popup `EndDayDialog` (tổng kết so `dayStart` tiền / uy tín đầu ngày, lưu Session).
  Chat khách Mezzenger: tin ngắn `chatIntro` + bảng `OrderSpec` (không liệt kê từng yêu cầu thành tin).
  Mezzenger là app chat (hội thoại đơn mới / đã nhận / chờ gửi / đã gửi / từ chối, nút icon lọc `FilterMenu` Mới / Đang làm / Xong / Huỷ; trạng thái là vật gắn lên thẻ: phong bì (đơn mới) / ghim / kẹp giấy + hạn / tem bưu kiện / dấu mộc ĐÃ GIAO, HUỶ; đơn đã gửi + từ chối mất khi sang ngày; câu trả lời nhanh = tin gửi khách).
  Từ chối quá `DECLINE_FREE` đơn / ngày thì −1 uy tín; khách để lại đánh giá (`data/reviews.ts`, `Profile.reviews`) → thông báo
  góc phải trên (`ReviewPops`) + app "Đánh giá".
  Tin khách tô đậm / màu chữ cần chú ý (`messenger/highlight.tsx`); "Nhận đơn" gửi tin "Ok shop nhận đơn này nhé";
  đơn xong: khách tự qua lấy hoặc shop xin địa chỉ rồi gửi (`delivery()` theo id đơn).
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
- Gờ trong lòng case (case dựng bằng code, `Ledge` / `TopBosses` trong Case.tsx): O-ring / OG có gờ đỡ vòng, gasket 2 mảnh có gờ đỡ + gờ đè,
  top mount plate có tai + vấu case trên. Case CAD 2 mảnh (Blossom, Catto HHKB; gasket mount): `CaseModel part`, `CaseDef.screws` / `gaskets` (mm) theo model.
- Case 1 mảnh dựng bằng code chơi được tray / O-ring / OG; case 2 mảnh có lỗ vít ở giữa thành case: nhôm / PC / acrylic bắt từ đáy
  (`caseBores` khoét CSG: hốc chìm + lỗ xuyên thành case dưới, lỗ ren case trên; tháo hết vít thì tách 2 mảnh `useCaseSplit`), mica xuyên mọi tấm
  (`caseScrewHoles`). Vỏ khoét bằng `three-bvh-csg` (`caseShellGeometry` notches / bores). Top mount: plate phủ kín lòng case, không bỏ qua bước plate. Mica: tấm trên mặt plate khoét theo `keyRegions` (khung chặn liền tấm, không `Blockers` rời).
- Shopii gộp case cùng dòng (`CASE_LINES`): 1 sản phẩm, chọn chất liệu (`ProductOption.group`) rồi màu; id case giữ riêng.
- Shopii: cột trái ghim (tìm kiếm chung mọi mục, "Đang sale", mục hàng, bộ lọc trong mục). Sale linh kiện cứ 3 ngày 1 lần (`data/sale.ts`:
  `isSaleDay` ngày chia hết 3, ~60% linh kiện giảm 5–30% cố định theo ngày + id, `withSale` → `ProductOption.was` + `Product.sale`), budget khách không đổi.
- Ảnh đơn / case Shopii / cửa sổ xem 3D dùng chung `buildKeyboardModel` (`features/apps/messenger/orderThumb.ts`).
- Hội Phím Cơ: bài pass viết bằng thuật ngữ chợ phím che tình trạng thật (`data/market.ts`); inbox người bán (xin hình, check var,
  xin bớt, lowball, tự nhập giá `'offer'` popup, đi ăn xin `'beg'` → 10% được free, 70% người bán chặn, 20% ban chợ 3 ngày `marketBanUntil`...) để dò lỗi / trả giá; hàng lỗi ghi `flaw` vào linh kiện → trừ điểm khi giao, seller bùng thì mất tiền.
- Nhạc nền: xoay ngẫu nhiên `public/audio/bgm.mp3` / `bgm-2.mp3` / `bgm-3.mp3` (không lặp bài vừa nghe), không tải được thì loop tổng hợp (`src/sound.ts`).
- Tiền linh kiện: giao xong khách trả đủ `budget` (`reimburse`), mua rẻ hơn thì phần dư là lãi, lố thì shop chịu; "Đã chi" = `partSpent` (chỉ món trong ô đối chiếu, switch / stab dư không tính).
- Stab đếm theo cỡ dây: `short` 2u, `long` 6.25u, `long7` 7u (`StabCount`, `stabStock` / `stabNeed` / `stabText` trong parts.ts).
- Kho chung (`Profile.spare`, `src/store/spare.ts`): áp dụng cho **mọi linh kiện**. Switch / stab gộp theo loại, case / PCB / plate /
  keycap / stab lỗi để từng món (`spare.items`). Vào kho chung: switch / stab thừa khi giao (`leftoverSpare`), món bị thay khi mua món khác
  (`buy` / `takeStock`), đồ của đơn bị huỷ (`stashAll`), cất từ đơn đang chờ chưa build (`releasePart`). Nhận / chuyển đơn thì
  `fillActive` → `fillFromStock` tự lấy món hợp yêu cầu (`checkInventory`). App Kho hiện đồ đơn đang làm + đơn đang chờ (tên khách)
  - kho chung trong cùng lưới (`useParts` trong OwnedItems), bấm ô để lấy / cất.
- App "Bảng xếp hạng" (`apps/leaderboard/LeaderboardApp`, `lib/leaderboardApi.ts`): chỉ tính server (bỏ shop đối thủ giả lập),
  lượt chơi đã kết thúc của mọi người + lượt đang chơi chèn vào, xếp theo điểm tổng (`runScore`: tiền lãi so với vốn 7.500k / 100k + uy tín ×20 + sao TB ×20 + đơn ×10 × sao TB / 5, ngày không tính), chip lọc theo tiền / đơn / uy tín / ngày (`server/leaderboardCore.ts`); gửi lỗi thì cất hàng chờ `sbk-lb-pending`.
  Tiền gọn theo cỡ `fmtMoney` (< 10.000k giữ k, ≥ 10.000k → m, ≥ 100.000k → B; `lib/format.ts`) ở bảng xếp hạng + ví; giá Shopii vẫn `fmt` (k).
- Shop tự đăng bán ở Hội Phím Cơ (tab "Bài của tôi", `apps/group/MyListings`, `data/selling.ts`, `store/sellSlice.ts`): đồ kho chung,
  linh kiện đơn đã nhận chưa build (kind `job`, kể cả đồ khách gửi) hoặc phím của khách (đơn đóng gói chưa gửi). Giá gốc `sourceBase` /
  giá chợ `sourceValue` (70%); bot hỏi / up bài / khen thợ / chê / trả giá (`botTurn(l, cert)`), bấm giá để bán; giá trên giá chợ tới
  `RICH_MAX` 1.4× giá gốc thì đêm có đại gia chốt (`richChance`, tối đa 1 / đêm, +5% / bậc thợ). Tag bài `ListingTag` (Free ship...).
  Fast bid (`Listing.bid`, 60s, khởi điểm từ 0, `settleBids` gọi mỗi giây ở App.tsx; hết giờ có người thắng thì không tự bán: `bid.ended`, shop `closeBid` chốt hoặc `bailBid` bùng → `banMarket`). Gỡ bài > `UNLIST_FREE` 3 lần / ngày → `banMarket`.
  Bán phím của khách: 5% (`STEAL_OK`) khách quên, còn lại −1 uy tín + `stolen` (chuộc lại `buyBack` giá ×1.1~1.3, 30% không cho
  chuộc, chuộc được +1 uy tín, quá 3 ngày mất).
  Bán đồ khách gửi (`provided`) của đơn đã nhận: 5% (`STEAL_OK`) thoát, còn lại khách huỷ kèo (`soldCancel` trong sellSlice, `order.cancel = 'sold'`,
  −`CANCEL_REP` uy tín + đánh giá 1★ `soldReview`); đơn vẫn hiện ở danh sách đơn / Mezzenger (dấu HUỶ) tới hết ngày, không làm tiếp được. `listings` / `stolen` / `unlists` / `marketBanWhy` trong Profile.
- Hàng pass lỗi keycap / switch / stab (`FLAW_UNUSABLE`): mua về vào thẳng kho chung (viền đỏ + badge "Hàng lỗi" ở app Kho),
  `checkInventory` không cho lắp cho khách, chỉ bán lại (giá gốc ½, `FLAW_CAUGHT` 10% bị tố → ban chợ 3 ngày).
- Qua ngày (`nextDay`): phải nhận ≥ 1 đơn trong ngày (`acceptedToday`, hoặc đã làm / đóng gói đơn); đơn đã nhận mà cả ngày không làm
  (`worked`, ghi ở subscribe trong `store/index.ts`) thì đền `NO_WORK_FINE` 20% `labor`.
- Test phím: PCB hàn còn phím chưa hàn / cháy thì bấm không ăn (`deadKey`, `build.testFaults` → StepList sáng "!" bước hàn để quay lại sửa);
  bước hàn cho "Bỏ dở" khi đã hàn ≥ 1 phím. Giao: phím chết chắc chắn bị khách báo lỗi nút, chưa test hết thì `UNTESTED_FAIL` 5% lỗi 1 nút
  (`DeliveryResult.defects`, sao tối đa 2, đánh giá ghi nút lỗi).
- NPC hướng dẫn Keeb-chan (`features/guide`, art `components/art/GuideGirl.tsx`): mẹo theo tình huống ở máy tính (`TIPS`), bàn build là hội thoại
  theo bước / bàn trống (`BenchDialog`, `benchTopics`, câu thoại `benchLines.ts`, chưa đọc thì hiện), `guideSeen` trong Profile; ẩn / hiện ở Cài đặt (`guideHidden`).
- Chuông thông báo (`components/game/NotifyBell.tsx`, cuối `StatusChips`): `logNotify` ghi `Profile.inbox` + `unread` (`notify` / `addReviews` /
  bán đồ / fast bid / huỷ đơn trễ tự ghi), xoá từng cái hoặc xoá hết.
- Esc (`hooks/useAppShortcuts.ts`, bỏ qua lúc test phím / đang gõ / có popup): ngồi máy tính / bàn build thì đứng dậy ra phòng (`standUp`;
  máy tính đang mở Cài đặt trên cùng thì đóng Cài đặt trước); đang đi lại thì Esc không làm gì (chỉ dùng để thoát, không vào máy tính). Cài đặt trên cùng: Lưu tiến trình
  (`saveRun` = gửi bảng xếp hạng lý do `'save'`); đóng tab tự gửi (`beaconRun`), về màn đăng nhập thì hỏi lưu (`unsynced` theo `lbSynced`).
- Thua game (`data/gameOver.ts`): uy tín ≤ `LOSE_REP` (−10) hoặc rảnh tay mà ví < tiền linh kiện đơn chào rẻ nhất → `endRun(reason)`
  (gửi server theo `Profile.runId`, xoá save, `GameOverDialog`). Chơi mới đè save cũng gửi lượt cũ (nút phá sản ở Cài đặt đã bỏ).
- Layout có `fits` (Planck: `['40']`): case cỡ khác không có model CAD cũng vừa (`caseFits`).
