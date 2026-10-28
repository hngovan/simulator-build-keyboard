# Quy trình làm việc

- Trả lời người dùng bằng tiếng Việt; UI và comment tiếng Việt.
- Chỉ dùng Bun. Xong việc chạy `bun run typecheck`, `bun run lint`, `bun run format:check`.
- **Lỗi lint cũ, không phải lỗi mới** (6 lỗi): `scripts/probe-stab3.mjs`, `scripts/solder-gameplay.test.ts`,
  `scripts/solder-purchase.test.ts`, `HandTools.tsx` (impure function), `store/index.ts` refs × 2.
- Có phiên / công cụ khác sửa song song cùng file (desolder, spoolHolder, failSolderKey, lubeJar thumb, SwitchKind...).
  Luôn đọc lại file trước khi sửa, không ghi đè phần của họ.

## Sửa file

- Hay dùng script node tạm `scripts/.tmp-e.mjs` với hàm `rep(file, [[cũ, mới]])` ném lỗi nếu không khớp
  (không ghi gì khi có chuỗi không khớp), chạy xong thì xoá.
- Tránh heredoc bash có backtick / `\n` lẫn lộn. Ký tự ⚠️ có ký tự ẩn → sửa bằng Edit.

## Kiểm tra trên trình duyệt

- Dev server `http://localhost:5173`; store ở `window.__game`, camera / controls / scene ở `window.__r3f` (chỉ DEV).
- Script playwright-core ở scratchpad phiên (`pw/drive.mjs`): lệnh `setup|{layout,stab,tools,supplies,...}`,
  `step|id`, `eval|js`, `wait|ms` (phải có số ms), `shot|tên` (chờ 2,5s), `snap|tên`, `click|x,y`, `move|x,y`, `wheel|x,y,n`.
  - setup lỗi `ctx null` khi ép `switch` không đúng `order.switchKind` → bỏ tham số switch.
  - Bàn build tải chậm trên swiftshader: chờ ~15s rồi mới chụp.
  - Muốn xem toàn bàn: đặt `controls.maxDistance = 200` rồi đặt camera bằng `__r3f`.

- **Build thử mọi case (2026-10-27)**: Cài đặt → Dev → "🧪 Chọn case" (`DevBuildDialog`, `devBuild.ts` `startDevBuild`): bảng mọi
  case theo cỡ + ô màu, chọn layout / mount / PCB / plate / stab rồi vào build ngay. Đơn có `order.dev` (`isOptionalStep` trả true
  → bước nào cũng "Bỏ qua"), đủ linh kiện sẵn (kit gửi case / PCB / plate / stab + switch / keycap), dụng cụ chưa có cấp bậc 1 +
  vật tư (trừ sách phép) bơm lên 999 (ghi thẳng vào save), giao thì `deliver` chỉ dọn bàn (không chấm điểm, đồ không vào kho chung).
  Đơn đang làm được `stashActive` cất lại. Đã chạy thử `buildContext` + `checkInventory` cho 274 tổ hợp case × layout × mount × PCB: không lỗi.
- Lệnh `eval|...` của drive.mjs tách theo dấu `|`: trong JS không dùng `||` (dùng `??` hoặc vòng lặp).
- Không chạy `prettier --write src` cả thư mục khi phiên khác đang sửa dở file (đã lỡ format `PcbSurface.tsx` 1 lần).

## Điều đã thấy nhưng chưa sửa (không phải của phiên này)

- ~~`shopSlice.ts` `nextDay()`: trong `set({...})` có gán `equipSolder` / `undoSolderPurchase`~~ — đã bỏ (2026-10-26, 0.1.9),
  chỉ giữ `lastSolderPurchase: null`.

## Giao việc nhỏ cho opencode qua Orca (2026-10-25)

- Người dùng muốn việc nhỏ, độc lập (tài liệu, CSS...) giao cho opencode: `orca agent launch --agent opencode --prompt "<brief>" --json`
  (chạy trong worktree hiện tại, trả `outcome.handle`); xem kết quả `orca terminal read --terminal <handle> --json`.
- Brief ghi rõ chỉ được sửa file nào (vì mình / phiên khác đang sửa src/), chạy format / lint, không commit, ghi nhật ký vào docs/decisions.
- Đã giao: `docs/OVERVIEW.md` + mục "Tài liệu" / "Cách chơi" trong README; thanh cuộn toàn app (`src/index.css`).
- Lịch sử cập nhật (2026-10-25, "ghi thêm lịch sử commit từng tính năng, update version trên màn hình"): `src/data/changelog.ts`
  (`CHANGELOG`, mới nhất ở đầu) các commit cũ đều ghi 0.1.0 (mỗi tính năng 1 mục), bản này 0.1.1 (người dùng: "lần này chỉ lên v0.1.1"); `package.json` version = mục đầu
  (`__APP_VERSION__`, vite.config.ts). Mỗi lần commit tính năng: thêm mục + nâng version (ghi trong CLAUDE.md).
- Ảnh demo README (2026-10-25): chụp bằng trình duyệt Orca, profile riêng "sbk-demo" (không đụng save thật), dev server 5173;
  nạp đơn / đẩy build bằng `window.__game` + `import('/src/data/parts.ts')` (mua đủ linh kiện, gán `build` tới bước keycap / lube).
  Ảnh JPEG 1280px trong `docs/images/` (title, mezzenger, shopii-sach-phep, ban-build, ban-lube), README mục "Ảnh demo".
- Ảnh demo bản 0.1.3 (2026-10-26, "chụp ảnh các chức năng mới nhất ... bỏ ảnh lịch sử cập nhật"): Orca browser profile isolated
  "sbk-demo" (localStorage riêng). Hàm `__demo` (scratchpad) dựng đơn + kho + build tới bước cần chụp (điền tiến độ các bước trước),
  `__look(target, pos)` đặt camera (nới `controls.maxDistance`). Ảnh hàn: chụp mất ~5s nên quá giờ cháy → tạm làm chậm
  `performance.now` / `Date.now` ×0.5 trong tab khi giữ chuột. Thêm top-mount, oring-mount, han-switch, dan-feet, shopii-switch;
  xoá lich-su-cap-nhat.jpg.
- Dọn code không dùng (2026-10-25, `bunx knip`): xoá `ToolShop.tsx` (app Tiệm Đồ Nghề đã bỏ) + `ArtCard` (chỉ ToolShop dùng),
  `SolderingWorkbench.tsx`, `SwitchSpring`, `lubed` (StationKit), re-export `Screen` / `BuyResult`; bỏ `export` thừa ở ~30 hàm / hằng chỉ
  dùng trong file. Giữ: `src/data/credits.ts` (nguồn ghi công CC BY, xem giay-phep.md), script `probe-*` / `inspect-step` / `alice-layout` /
  `convert-stab-variants` / `fetch-props` (chạy tay), test `scripts/*.test.ts`. knip báo nhầm `PriceTag` / `ChatLine` (types.ts dùng qua
  `import('...')`). Toast "mua ở Tiệm Đồ Nghề hoặc Shopii" → "mua ở Shopii → Dụng cụ".
- README "Có gì mới" (2026-10-26, "update vào readme cho tôi"): thêm mục "Lịch sử cập nhật" (bảng mọi phiên bản: phiên bản / ngày / mảng / thay đổi) trên "Tài liệu", tóm tắt
  mục 0.1.3 trong `src/data/changelog.ts` (thua game, bảng xếp hạng server, feet, case theo cụm phím, mount, Shopii, switch mới,
  UI điện thoại); điền `commits: ['e14e8a0']` cho 0.1.3. Bản sau: thêm dòng phiên bản mới lên đầu bảng.
- Ảnh demo bản 0.1.9 (2026-10-26, "chụp lại ảnh màn hình version mới nhất + cập nhật readme rồi push"): playwright-core + chromium
  swiftshader (scratchpad `pw/demo.mjs`, trình duyệt sạch, không đụng save thật), dev server cổng 5199; dựng đơn / kho / build bằng
  `window.__game` + `import('/src/data/parts.ts')`, camera bằng `__r3f`. Chụp lại title / mezzenger (Keeb-chan mới), thêm kho (hàng lỗi),
  cho (đăng bán + bid), lot-foam, plateless, oc-mica; PNG → JPEG bằng ffmpeg `-q:v 3`.

- **Đổi case ngay trên bàn build (dev, 2026-10-27)**: người dùng: "thêm option đổi màu case + chất liệu case tuỳ chọn + filter case luôn
  trong bàn build khi đang bật option lên, chỉ ở môi trường dev". `DevCasePanel` (features/bench, cột phải BenchHud, chỉ khi
  `import.meta.env.DEV && order.dev`): chip lọc chất liệu (`CASE_MATERIALS`, giờ export) → chip case vừa layout (`caseFits`) → ô màu → chip
  mount. `setDevCase` / `setDevCaseColor` (devBuild.ts): đổi case dựng lại `ctx`, giữ nguyên `build`, đứng lại đúng bước đang làm nếu
  danh sách bước mới còn bước đó; xoá undo / redo (ảnh chụp cũ lệch bước). Chụp kiểm: plastic60 tray đang lắp switch → gasket60 đỏ.
- **Đơn dev không bỏ qua bước plate khi có gasket (2026-10-28)**: người dùng: "bước dán gasket ko thể làm nếu ko gắn plate được => ko thể bỏ".
  `isOptionalStep` (steps.ts): `plate` bắt buộc khi danh sách bước có `topCase` (đã có) hoặc `gasket` (mới). `placeGasket` chặn khi
  `!build.plate` (lỡ bỏ qua / đổi case dev giữa chừng) + toast nhắc quay lại bước lắp plate. Kiểm playwright: gasket60 ở bước plate chưa đặt
  bấm tiếp → đứng yên; plastic60 tray vẫn bỏ qua được; dán gasket khi chưa có plate → không dán, có plate → dán được.
