# Tổng quan

Game mô phỏng nghề build bàn phím cơ: nhận đơn, mua linh kiện, lắp ráp trên bàn 3D, test rồi giao
hàng. Tài liệu này tóm tắt source, luồng chơi và cách chơi. Các quyết định chi tiết nằm trong
[nhật ký quyết định](decisions/README.md).

## 1. Source

### Stack

- React 18 + TypeScript strict, Vite 6, Tailwind CSS v4.
- React Three Fiber + drei + three cho cảnh bàn build 3D.
- Zustand 5 cho state; một store `useGame` ghép từ các slice.
- Âm thanh ở `src/sound.ts`: sample CC0 trong `public/audio/sfx/`, thiếu file thì tổng hợp bằng
  WebAudio; nhạc nền dùng `public/audio/bgm.mp3` nếu có.
- Lưu tiến trình bằng localStorage, key `sbk-save-v3`; tự lưu debounce 400ms khi state đổi.
- Không có test tự động. Khi dev, store ở `window.__game`; camera / controls / scene ở `window.__r3f`.

### Cấu trúc `src/`

```text
src/
  App.tsx                 # chuyển màn title -> pc -> bench
  main.tsx, index.css
  types.ts                # kiểu dùng chung: Order, Inventory, BuildState, BuildContext, StepId...
  sound.ts                # nhạc nền + hiệu ứng phím
  store/
    index.ts              # useGame, selector, tự lưu, gắn window.__game khi dev
    metaSlice.ts          # màn hình, cửa sổ app, toast, audio, new/continue/save
    shopSlice.ts          # đơn hàng, kho, mua hàng, group, đóng gói, gửi, sang ngày
    buildSlice.ts         # thao tác bàn build, undo/redo, deliver()
    scoring.ts            # scoreDelivery() - hàm thuần chấm điểm khi giao
    persistence.ts        # Profile + Session + loadSave/writeSave
  data/
    parts.ts              # case, PCB, plate, stab, switch, keycap, tool, mount, âm thanh
    layouts.ts            # layout 40/60/HHKB/65/75/TKL/full/Planck/Alice -> toạ độ phím
    steps.ts              # STEP_INFO, buildContext(), stepProgress(), vít, cao độ Y
    mods.ts               # mod stab + đánh giá lube switch
    orders.ts             # sinh đơn ngẫu nhiên, kit, ngân sách / công, bài đăng group
    supplies.ts           # vật tư tiêu hao, cửa sổ hàn, độ hợp của lube
    aliceKeys.ts          # sinh từ scripts/alice-layout.mjs
    stabModel.json        # sinh từ scripts/convert-stab.mjs
    generated/            # dữ liệu sinh từ script convert plate
  features/
    title/                # màn hình chơi mới / tiếp tục
    desktop/              # Desktop, Taskbar, apps.ts (registry app)
    apps/                 # messenger, shop, group, inventory, settings
    bench/                # HUD bàn build, danh sách bước, panel mod, máy đo âm
  scene/
    Bench.tsx             # Canvas, camera, chọn trạm theo bước
    Room.tsx, EmptyBench.tsx
    parts/                # Assembly, Case, Board, Keycap, Screw, SolderPad...
    stations/             # StabModStation, LubeStation, SolderKit
    models/               # Switch, Stabilizer, Computer, dụng cụ...
    materials.tsx, common/
  components/
    ui/                   # Window, Button, Panel, HudPanel, Toggle, Alert...
    game/                 # OrderCard, OrderSpec, StatusChips, Toasts...
    art/                  # ảnh vẽ dự phòng cho linh kiện / dụng cụ
  hooks/
    useKeyboardTest.ts    # bắt phím thật ở bước test
  lib/
    format.ts             # cn(), fmt()...
```

### Store

- `metaSlice.ts`: `screen` (`title` / `pc` / `bench`), cửa sổ app, toast, âm thanh, `newGame`,
  `continueGame`, `goPC`, `goBench`, `openApp`, `save`.
- `shopSlice.ts`: `offers` (đơn mới trong ngày), `jobs` (đơn đã nhận, chờ làm), `order` (đơn đang
  làm), `inventory`, `provided`, `spent`, `acceptOrder`, `switchJob`, `buildOrder`, `startBuild`;
  mua ở `buy` / `buySupply` / `buyTool` / `buyPost`; `packed`, `shipOrder`, `nextDay`.
- `buildSlice.ts`: `build`, `ctx`, các action của từng bước, `patchBuild`, `nextStep`, `undo`,
  `backToStep`, `forwardToStep`, `deliver`. `ctx` là dữ liệu dẫn xuất, không lưu.
- `scoring.ts`: `scoreDelivery` nhận đơn, kho, build, `ctx`, mount, tiền đã chi -> điểm, sao,
  tiền hoàn, tiền công.
- `persistence.ts`: `Profile` (tiến trình lâu dài) + `Session` (đơn đang làm), `SAVE_REV` để nâng
  cấp bản lưu cũ.
- `index.ts`: tự lưu khi một trong `SAVED_KEYS` đổi; selector `useStep`, `useCtx`, `useBuild`;
  `useSticky` giữ giá trị cũ để cảnh 3D không vỡ ngay sau khi giao đơn.

### Script convert model

Các script convert trong `scripts/*.mjs` đọc model nguồn (CAD / STL / OBJ / 3MF / GLB) trong
`assets/` và ghi GLB vào `public/models/`. Chạy bằng Bun theo script trong `package.json`:

- Case / PCB / plate / keycap / vít: `convert:cases`, `convert:user-cases`,
  `convert:plates`, `convert:keycaps`, `convert:screws`.
- Switch / stab: `convert:switch`, `convert:stab`.
- Dụng cụ và bàn phụ: `convert:solder-tools`, `convert:hand-tools`, `convert:desolder-pump`,
  `convert:spring-containers`.
- Phòng làm việc: `fetch:room`.
- Script sinh dữ liệu / dò model: `alice-layout.mjs`, `probe-*.mjs`, `inspect-step.mjs`.

Phần lớn script dùng `occt-import-js` + `@gltf-transform/core`; một số dùng thêm `meshoptimizer`
hoặc `three-bvh-csg`. Nguồn và giấy phép của model ghi ở `assets/community/README.md`,
`public/CREDITS.md` và `docs/decisions/giay-phep.md`.

## 2. Luồng game

### Title -> desktop

1. **Title** (`features/title/TitleScreen.tsx`): chơi mới thì nhập tên thợ; nếu đã có bản lưu thì
   có nút tiếp tục kèm ngày và số tiền.
2. **Desktop giả lập "KeebOS"** (`screen = 'pc'`): các icon app và taskbar. Chơi mới mở sẵn
   Mezzenger (vào game là đứng trong phòng cạnh máy tính, bấm màn hình mới vào desktop). Không có icon ra thẳng bàn build: icon **Đứng dậy** (hoặc Esc)
   rời máy tính, đi lại trong phòng (`walk`, góc nhìn người: WASD (không dùng phím mũi tên), kéo chuột nhìn, cuộn chuột giữa phóng to;
   đang ngồi bàn build bấm WASD / mũi tên cũng tự đứng dậy).
   Trong phòng: bàn máy tính sát bàn build dưới cửa sổ rèm lá, kệ bàn phím sau lưng, ô cửa cạnh bàn máy tính ra
   hành lang (hàng Shopii giao tới + đơn đóng gói chờ gửi, bấm thùng để nhận / gửi). **Kết thúc ngày** chỉ còn ở
   lịch treo tường: bấm lịch → popup lịch chi tiết (sale, hạn đơn, hàng tới) → "Kết thúc ngày" mở popup tổng kết
   (`EndDayDialog`) hoặc "Quay lại làm việc".
3. **Mezzenger**: hội thoại đơn mới, đơn chờ gửi và đơn đã gửi. Có thể xem chi tiết yêu cầu (tin ngắn + bảng
   tóm tắt), nhận đơn, từ chối, gửi hàng, xem điểm chấm.
4. **Shopii**: mua case, PCB, plate, stab, switch, keycap, vật tư, dụng cụ, chứng chỉ thợ và sách phép.
5. **Kho**: xem linh kiện của đơn đang làm, dụng cụ (kèm độ bền còn lại) và vật tư; kéo thả đổi chỗ.
   Hiện cả đồ của đơn đang chờ (ghi tên khách) và **kho chung** (mua dư, bị thay, thừa sau khi giao); nhận / chuyển đơn
   thì tự lấy món hợp yêu cầu, bấm ô để "Dùng cho đơn đang làm" / "Cất về kho chung".
6. **Danh sách đơn** (app `order`, trước đây là "Chi tiết đơn"): yêu cầu khách, đối chiếu linh kiện,
   chọn mount, dự đoán âm thanh, ngân sách; nhận đơn / đổi đơn / ra bàn build.
7. **Hội Phím Cơ VN**: bài pass đồ của người chơi khác. Hàng rẻ hơn 20–40% nhưng có khoảng 20% khả
   năng bị seller bùng tiền. Inbox: tự nhập giá trả (popup, 3 lần), "Đi ăn xin" xin free (10% được, 70% bị người bán chặn, 20% bị ban chợ 3 ngày).
8. **Bảng xếp hạng**: bảng server, xếp theo điểm tổng (đơn + uy tín + ngày + tiền, lọc theo từng thông số) các lượt chơi đã kết thúc (thua / phá sản / chơi lại) + lượt đang chơi.
9. **Cài đặt**: tắt âm thanh, chỉnh âm lượng nhạc nền / hiệu ứng, xem ghi công, về màn hình title.
   Tiến trình được lưu tự động.

### Bàn build 3D

- Nhận đơn ở Mezzenger thì **thùng đơn** của khách tới kệ hàng cuối hành lang. Đứng dậy ra kệ bấm thùng để cầm lên, mang về
  bấm bàn build để đặt xuống (`placeBench`): đủ đồ thì vào build luôn, thiếu thì thùng nằm trên bàn kèm danh sách món còn thiếu
  (mua đủ rồi bấm thùng / "Mở thùng, bắt đầu build").
- Đổi đơn: bấm **Cầm thùng đơn lên** (giữ nguyên tiến độ), cất vào ô mờ trên **kệ cất đơn** (tường phải) rồi lấy thùng khác.
  Kho đồ, build và lịch sử của đơn được cất nguyên trạng vào `jobs`.
- Cảnh 3D (`scene/Bench.tsx`) có camera xoay / kéo / zoom, tự lật board ở bước hàn hoặc vít đáy.
  Bấm màn hình trên bàn để quay về desktop.
- HUD trái hiện yêu cầu đơn + danh sách bước; HUD dưới hiện mục tiêu, dụng cụ và nút **Bước tiếp
  theo**. Bước đã làm bấm được để lùi / tiến theo lịch sử; `Ctrl + Z` hoàn tác.
- Bước `unbox` tự sang bước sau khi mở thùng; các bước khác phải bấm **Bước tiếp theo**. Hai bước
  tuỳ chọn `stabMod` và `switchLube` có thể bỏ qua.

### Các bước build

Danh sách thực tế do `buildContext()` sinh theo case / stab / PCB / mount. Thứ tự dưới đây là thứ
tự thường gặp; `stabScrew` nằm trước `plate` với stab screw-in, còn stab plate-mount được lắp sau
`plate`.

| Bước         | Việc cần làm                                                                          | Khi nào                          |
| ------------ | ------------------------------------------------------------------------------------- | -------------------------------- |
| `unbox`      | Click thùng hàng để mở                                                                | Luôn có                          |
| `caseOpen`   | Tháo vít, nhấc nắp case trên                                                          | Case 2 mảnh                      |
| `stabMod`    | Clip chân stem, Holee mod, lube housing/slider/wire, lắp slider + wire                | Có phím cần stab; tuỳ chọn       |
| `stab`       | Click vị trí phím dài (≥ 2u) để lắp stab                                              | Layout có stab                   |
| `stabScrew`  | Vặn 2 vít cho mỗi stab                                                                | Stab screw-in                    |
| `plate`      | Click board để đặt plate lên                                                          | Luôn có                          |
| `switchLube` | Mở từng switch rồi lube theo mẻ; có thể lube lò xo                                    | Tuỳ chọn                         |
| `switch`     | Click lỗ trên plate để cắm switch                                                     | Luôn có                          |
| `solder`     | Bấm chân cho kim nhiệt chạy, bấm lần nữa dừng trong vùng xanh (vàng = hoàn hảo)       | PCB hàn (không phải hotswap)     |
| `gasket`     | Click các vị trí quanh plate để dán gasket                                            | Mount gasket / OG                |
| `ring`       | Click board cuốn vòng O-ring (sau lắp switch / hàn, kẹp giữa PCB và plate)            | Mount O-ring / OG                |
| `feet`       | Case tự lật úp, click 4 hốc dưới đáy để dán feet cao su (đen / trắng)                 | Luôn có, trước khi lắp case      |
| `dtb`        | Đặt daughterboard ai03 vào hốc vách sau (cổng USB-C ra lỗ), bắt 2 vít M2, cắm dây JST | Case dựng bằng code (không mica) |
| `jst`        | Board nhấc trên case: cắm đầu dây JST còn lại vào cổng mặt dưới PCB                   | Có `dtb`, ngay trước `caseIn`    |
| `caseIn`     | Click case để thả board vào                                                           | Luôn có                          |
| `topCase`    | Úp case trên xuống plate                                                              | Top mount (case 2 mảnh)          |
| `topScrew`   | Board tự lật, vặn vít từ dưới giữ plate vào case trên                                 | Top mount (case 2 mảnh)          |
| `trayScrew`  | Vặn vít giữ PCB vào standoff đáy case                                                 | Mount tray                       |
| `caseClose`  | Click nắp case để đậy lại                                                             | Case 2 mảnh (trừ top mount)      |
| `caseScrew`  | Vặn vít khoá 2 mảnh case                                                              | Case 2 mảnh                      |
| `keycap`     | Click switch để cắm keycap                                                            | Luôn có                          |
| `test`       | Gõ bàn phím thật hoặc click phím 3D; phím đã test có chấm xanh                        | Luôn có, tính điểm riêng         |

`OPTIONAL_STEPS` gồm `stabMod`, `switchLube`, `test`: không tính vào độ hoàn thiện khi chấm điểm,
nhưng bỏ mod stab / lube sẽ mất điểm chất lượng tương ứng, còn test có 5 điểm riêng.

### Test, đóng gói, giao

- **Test**: `useKeyboardTest` bắt phím thật; phím không có trên bàn phím (Fn, macro...) thì click
  phím 3D. Máy đo âm thanh hiện độ khớp với yêu cầu của khách.
- **Đóng gói**: bước cuối **Đóng gói** (sau test): bấm thùng carton sau bàn phím (hoặc nút **Cho phím vào thùng** / nút cam **Đóng gói đơn này**), thùng úp lên bàn phím rồi gọi `deliver()`; nếu build chưa
  xong thì hỏi lại. Đơn được chấm điểm ngay và đưa vào `packed`, phím vào thùng nằm trên bàn.
- **Gửi**: cầm thùng đã đóng gói ra **ô giao hàng** (2 tầng trên kệ cuối hành lang), đặt vào là gửi (`shipOrder`):
  cộng tiền và uy tín ngay. Không gửi thì **Kết thúc ngày** (`nextDay`) sẽ gửi nốt các đơn đã đóng gói.

### Chấm điểm và kết thúc ngày

`scoreDelivery` chấm tối đa 100 điểm:

| Mục                 | Điểm | Cách tính                                                                        |
| ------------------- | ---- | -------------------------------------------------------------------------------- |
| Âm thanh            | 25   | Độ khớp với điều ước âm thanh của khách                                          |
| Màu keycap          | 10   | Đúng màu khách chọn                                                              |
| Mount / màu case    | 10   | Đúng mount nếu khách dặn; không dặn mount thì màu case (không dặn màu = đủ điểm) |
| Build hoàn chỉnh    | 20   | Các bước bắt buộc; PCB hàn còn 12 điểm vì có mục mối hàn riêng                   |
| Mối hàn             | 8    | Chỉ PCB hàn; mối cháy xém gần như mất điểm                                       |
| Stab                | 10   | Theo mod đã làm và chất lượng cọ lube                                            |
| Lube switch         | 10   | Theo yêu cầu lube của khách, loại mỡ, số switch đã lube, lò xo                   |
| Test phím           | 5    | Tỉ lệ phím đã test                                                               |
| Ngân sách linh kiện | 10   | Trong budget thì đủ điểm; lố budget bị trừ theo mức lố                           |

- Điểm làm tròn; số sao: **90+ = 5★**, **75+ = 4★**, **55+ = 3★**, **35+ = 2★**, còn lại **1★**.
- Khi gửi: tiền nhận = `budget` (khách trả đủ budget linh kiện, mua rẻ hơn thì phần dư là lãi) +
  `round(labor × score / 100)` (tiền công). Lố budget thì shop chịu phần lố và còn bị trừ điểm ngân sách.
- Uy tín thay đổi theo `stars - 3 - số ngày trễ`: 5★ 0 ngày trễ được +2, 3★ là 0, 1★ là -2. Mỗi
  ngày giao trễ trừ thêm 1 uy tín. Uy tín hiện chỉ được cộng/trừ và hiển thị, chưa dùng để khoá đơn.
- **Kết thúc ngày**: ngày + 1, sinh đợt đơn mới 5–7 đơn, xoá danh sách đơn đã đóng gói. Đơn trong
  danh sách chờ (`jobs`) trễ quá 3 ngày bị khách huỷ và trừ 3 uy tín mỗi đơn. Đơn đang làm dở (chưa
  đóng gói) được giữ sang ngày sau.
- **Thua game** (`data/gameOver.ts`, `lossReason`, store tự xét sau mỗi lần đổi tiền / uy tín / đơn): uy tín ≤ −10 (bị phốt
  quá nhiều), hoặc không còn đơn đang làm / chờ gửi mà ví ít hơn tiền linh kiện ước tính của đơn chào rẻ nhất (`estimateCost`).
  (Nút tự tuyên bố phá sản ở Cài đặt đã bỏ, 2026-10-27; `endRun('bankrupt')` vẫn giữ trong store.)
  Khi đó `endRun(reason)`: gửi kết quả lên server bảng xếp hạng, xoá bản lưu, popup tổng kết (`GameOverDialog`) → về màn tiêu đề.
  Chơi mới đè bản lưu cũ cũng gửi lượt cũ (lý do `newgame`).

## 3. Cách chơi

### Nhận đơn và hạn giao

- Mỗi ngày Mezzenger có 5–7 đơn mới, luôn có ít nhất một đơn TKL và một đơn 60%. Đọc kỹ layout,
  loại switch, bộ keycap, màu keycap, điều ước âm thanh, mount, ngân sách, tiền công và số ngày.
- Bấm **Nhận đơn**; hạn giao được tính `dueDay = ngày hiện tại + số ngày khách cho`. Chưa có đơn
  đang làm thì đơn thành đơn hiện tại; đã có thì vào danh sách chờ.
- Có thể nhận nhiều đơn trong ngày và đổi qua lại. Đơn đang làm dở được cất riêng kho, build và
  lịch sử, nên đổi đơn không mất tiến độ.
- Đơn khách gửi kit có thể đã có sẵn case / PCB / plate / stab; món nào khách gửi thì không cần mua
  và không mua thay được.

### Mua linh kiện và giữ ngân sách

- Mua ở **Shopii** theo đúng layout, đúng loại PCB (hàn / hotswap), đúng loại switch khách đòi và
  đúng profile / số phím của bộ keycap. App **Danh sách đơn** có bảng đối chiếu ✓ từng món.
- **Hội Phím Cơ VN** bán đồ pass rẻ hơn 20–40% nhưng khoảng 20% bị bùng tiền. Chỉ nên mua khi
  chấp nhận rủi ro.
- Ngân sách của đơn chỉ tính tiền linh kiện (`spent`), không tính dụng cụ / vật tư. Mua lố budget
  vẫn được nhưng phần lố shop chịu và bị trừ điểm; mua rẻ hơn budget thì phần dư vào túi. Switch / stab thừa
  sau khi giao được giữ lại cho đơn sau.
- Stab plate-mount gài được mọi plate. Plateless (`PLATELESS`, bật ở app Danh sách đơn): bỏ bước foam + plate, bắt buộc PCB hàn
  - Tray mount, không stab plate-mount. Foam Poron (`foamPoron`) lót PCB là bước tuỳ chọn `foam` trước plate.
- Qua ngày: phải nhận ≥ 1 đơn trong ngày; đơn đã nhận cả ngày không làm thì đền `NO_WORK_FINE` 20% tiền công.
- Switch phải đúng
  `switchKind` (đơn có `switchType` thì phải đúng con switch đó); keycap phải đủ phím cho layout và đúng profile khách muốn.

### Chọn mount và build

- Mua case xong, chọn **kiểu mount** trong app Danh sách đơn trước khi bắt đầu build. Nếu khách gửi
  case thì khách đã dặn mount; làm đúng mount được 10 điểm.
- Mount quyết định các bước phụ: `gasket` (gasket / OG), `ring` (O-ring: sau lắp switch / hàn, case 1 mảnh; OG: sau gasket), `trayScrew`
  (tray), `topCase` + `topScrew` (top mount: plate bắt vít vào case trên rồi cả cụm thả vào case dưới, không có `caseClose`).
  Mount cũng ảnh hưởng âm thanh và điểm khớp tiếng.
- Khi kho đã đủ và tương thích, bấm **Ra bàn build** ở Mezzenger hoặc đứng dậy sang bàn build để vào cảnh 3D. Làm theo
  HUD: click đúng bộ phận, giữ chuột kéo để xoay camera quanh tâm vật đang làm (Space về góc mặc định, Q lật xem đáy), cuộn để zoom.

### Hàn, lube, mod stab, vít, keycap

- **Hàn**: cần mỏ hàn (bút 60W hoặc trạm) và thiếc. Bấm chân cho kim nhiệt chạy qua lại, bấm lần nữa / Space dừng trong vùng xanh
  (vàng = hoàn hảo, cộng điểm khi giao); dừng ở đỏ phải, hụt (đỏ trái) quá 3 lần hoặc thiếc đểu (15% ẩn) sẽ làm cháy chân và đen mũi hàn. Mũi đen phải
  lau vào bùi nhùi mới hàn tiếp; có thể dùng bút rã hàn hút thiếc cháy rồi hàn lại.
- **Lube switch**: phải mở switch bằng đồ mở trước (tách housing, stem, lò xo), rồi lube theo mẻ. Số switch
  mỗi lần mở / mỗi mẻ = bậc chứng chỉ thợ; có phép thì thợ lõ thành 10, middle / senior cộng thêm 10 (15 / 20) (Shopii → Sách phép, bán riêng: **Phép mở switch**
  cho bước mở, **Phép lube switch** cho bước lube, **Phép lắp switch** / **Phép lắp keycap** cho bước lắp switch / keycap, **Phép hàn switch** (1 lần hàn = 10 phím, cháy thì cháy cả 10), **Phép rã hàn** (1 lần hút = 10 phím cháy); mỗi cuộn 200 lần, mua thêm thì cộng dồn). Khách dặn **không lube** thì đừng lube; lube lò xo là tuỳ
  chọn, giúp giảm tiếng ping.
- **Mod stab**: làm theo mũi tên vàng — clip chân stem (cần kìm cắt) → Holee mod bằng Urgo → phết
  mỡ housing + slider → lắp slider → phết mỡ wire → lắp wire. Mẫu stab đời mới có thể đã clip sẵn
  hoặc đã lube sẵn; làm thừa / sai bước có thể bị chặn hoặc mất điểm.
- **Vít**: chọn đầu vít (chữ thập, lục giác, Torx) ở `BitPicker`; sai đầu vít không bị chặn nữa mà trượt ren; trượt 3 lần trên 1 vít (`STRIP_TRIES`) mới tuôn ren.
  Bước tháo vít: click (tua vít thường 3 click / con, điện 1 click). Bước vặn vào: **skill check** — bấm vít cho kim lực chạy qua lại,
  bấm lần nữa / Space dừng: xanh là chặt (vàng = hoàn hảo), đỏ trái vít mới vào 1 phần, đỏ phải là trượt ren. Vùng xanh ngẫu nhiên
  mỗi lần, rộng / tốc độ kim theo tua vít (`ToolDef.torque`: tay chậm dễ canh, điện nhanh hẹp). Tuôn ren vít ăn vào case PC / mica / acrylic thì 35% nứt case.
  Vít stab tuôn ren = stab hỏng: mua stab cùng cỡ rồi bấm vít đỏ để thay, hoặc cứ giao.
  Giao: case nứt / vít case (ngàm case, top mount, tray mount) tuôn ren → đền 80% giá case, −2 uy tín; stab tuôn ren → đền bộ stab mới.
  Tuôn ren: 20% khách không để ý (hỏng ≤ 1/3 số lỗ cùng loại thì 30%); nứt thì luôn bị phát hiện.
  Vít đáy / vít stab có thể tự lật board.
- **Keycap**: cắm theo bộ đã mua; số phím mỗi lần click phụ thuộc chứng chỉ thợ. Kiểm tra kỹ màu
  và profile vì đây là điểm chấm trực tiếp.

### Test và giao hàng

- Gõ bàn phím thật ở bước test để từng phím 3D lún xuống và phát tiếng; phím Fn / macro không gửi
  được mã thì click trực tiếp phím 3D. Càng nhiều phím được test càng gần 5 điểm.
- Bấm **Đóng gói đơn này** để chấm điểm và đóng gói. Nếu chưa xong, game hỏi lại; giao sớm sẽ bị
  điểm thấp.
- Cầm thùng đã đóng gói ra ô giao hàng trên kệ cuối hành lang để nhận tiền hoàn + tiền công và cộng/trừ uy tín. Có thể
  gửi từng đơn ngay hoặc để **Kết thúc ngày** gửi nốt.

### Tiền, uy tín, hạn, dụng cụ, chứng chỉ

- Bắt đầu với **6.000k**. Tiền tăng khi gửi đơn; tiền công phụ thuộc điểm, nên build đúng yêu cầu
  và giữ budget quan trọng hơn làm nhanh.
- Hạn giao tính bằng ngày. Trễ bị trừ uy tín theo từng ngày; đơn chờ trễ quá 3 ngày bị huỷ và trừ
  3 uy tín. Đơn đang làm dở không bị huỷ khi sang ngày.
- Dụng cụ có độ bền: bút hàn 60W 300 lần, trạm hàn 1.000 lần, bùi nhùi / bút hút thiếc / cọ lube
  1.000 lần. Hết độ bền thì dụng cụ về mức chưa có và phải mua lại. Vật tư (thiếc, mỡ, Urgo) là
  tiêu hao riêng, mua ở mục **Lube & vật tư**.
- **Chứng chỉ thợ** ở Shopii: thợ lõ (mặc định) lắp 1 switch / keycap mỗi click và lube 1 switch
  mỗi mẻ; middle (5.000k) là 5; senior (10.000k) là 10. Mở switch vẫn mất 1 click mỗi switch.
