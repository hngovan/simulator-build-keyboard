# Quy trình làm việc

- Trả lời người dùng bằng tiếng Việt; UI và comment tiếng Việt.
- Chỉ dùng Bun. Xong việc chạy `bun run typecheck`, `bun run lint`, `bun run format:check`.
- **Lỗi lint cũ, không phải lỗi mới** (6 lỗi): `scripts/probe-stab3.mjs`, `scripts/solder-gameplay.test.ts`,
  `scripts/solder-purchase.test.ts`, `HandTools.tsx` (impure function), `store/index.ts` refs × 2.
  Format còn báo file `docs/superpowers/plans/...` của phiên khác.
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

- Lệnh `eval|...` của drive.mjs tách theo dấu `|`: trong JS không dùng `||` (dùng `??` hoặc vòng lặp).
- Không chạy `prettier --write src` cả thư mục khi phiên khác đang sửa dở file (đã lỡ format `PcbSurface.tsx` 1 lần).

## Điều đã thấy nhưng chưa sửa (không phải của phiên này)

- `shopSlice.ts` `nextDay()`: trong `set({...})` có gán `equipSolder` / `undoSolderPurchase` / `lastSolderPurchase`
  (có vẻ chèn nhầm chỗ của phiên khác) — cần báo người dùng.

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
  Ảnh JPEG 1280px trong `docs/images/` (title, mezzenger, shopii-sach-phep, ban-build, ban-lube, lich-su-cap-nhat), README mục "Ảnh demo".
- Dọn code không dùng (2026-10-25, `bunx knip`): xoá `ToolShop.tsx` (app Tiệm Đồ Nghề đã bỏ) + `ArtCard` (chỉ ToolShop dùng),
  `SolderingWorkbench.tsx`, `SwitchSpring`, `lubed` (StationKit), re-export `Screen` / `BuyResult`; bỏ `export` thừa ở ~30 hàm / hằng chỉ
  dùng trong file. Giữ: `src/data/credits.ts` (nguồn ghi công CC BY, xem giay-phep.md), script `probe-*` / `inspect-step` / `alice-layout` /
  `convert-stab-variants` / `fetch-props` (chạy tay), test `scripts/*.test.ts`. knip báo nhầm `PriceTag` / `ChatLine` (types.ts dùng qua
  `import('...')`). Toast "mua ở Tiệm Đồ Nghề hoặc Shopii" → "mua ở Shopii → Dụng cụ".
