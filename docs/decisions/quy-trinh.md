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
