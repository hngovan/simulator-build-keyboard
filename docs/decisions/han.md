# Hàn PCB

## 2026-10-24

### Thời gian hàn theo giây thật

- `solderWindow(station, wire)` / `solderTiming(station, wire, seed)` trong `src/data/supplies.ts`.
  - Bút hàn: thiếc chảy (vùng đạt) 2–2,5s, cháy ở 3s.
  - Trạm hàn: đạt 1–2s, cháy ở 3s.
  - Thiếc đểu: cộng `slow` = 0,5s, có `burnChance` ẩn 15% (cháy dù nhả đúng vùng xanh).
  - Mỗi phím lệch một chút cố định theo `seedOf(k.id)` (SolderPad).
- Người dùng xác nhận các con số này là "ok".

### Thanh nhiệt (HeatBar trong `src/scene/parts/SolderPad.tsx`)

- Vuông góc, chạy theo giây thật: `PX_PER_S` = 46, có vạch từng giây.
- **Không có chữ** dưới thanh nhiệt và thanh hút thiếc — người dùng yêu cầu "hiển thị mỗi thanh lực thôi ko cần ghi text".
- Màu: đang nung vàng; vùng đạt xanh nhạt (`bg-green/20`) khi chưa tới, tới vùng đạt thì đậm (`bg-green/75`); vùng cháy đỏ.

### Hụt / cháy

- Nhả sớm = hụt, làm lại. Hụt lần thứ 4 ở cùng chân → cháy + mũi bẩn (`failSolderKey`, phiên khác làm).
  Bản trùng `solderFail` / `solderFails` của phiên này đã gỡ, không thêm lại.
- Cháy: `tipDirty`, phải lau bùi nhùi (`cleanTip`); chân cháy phải hút thiếc (`desolderKey`, cần bút rã hàn).

### Thiếc (mỗi cuộn 1000 mối)

| id            | Tên                | Giá  | Màu       |
| ------------- | ------------------ | ---- | --------- |
| `solderCheap` | Thiếc đểu          | 20k  | `#55595e` |
| `solder6337`  | Thiếc Sakura 63/37 | 90k  | `#62666b` |
| `solderPro`   | Thiếc Asahi 0.6mm  | 160k | `#70757a` |

- Lõi cuộn thiếc dùng vật liệu chì (`solderSpool.ts`, metalness 0.55).

### Mỏ hàn

- Bút 60W bền 300 lần, trạm 1000 lần, bùi nhùi 1000 lần (`ToolDef.life`, đếm ở `wear`, `wearTool(kind)`; hết thì về bậc 0 "chưa có").
- Bút và trạm đã mua đổi qua lại bằng nút "Bút hàn" / "Trạm hàn" trong SolderPanel (`SOLDER_SHORT`, `solderOwned`);
  món chưa mua thì nút disabled.
- Model: `iron-60w.glb` (cầm tay thì ẩn dây `Object_10/11`), `iron-station.glb`, `iron-pro.glb` (mỏ hàn trạm, mũi ở gốc),
  `sponge-stand.glb`. SolderKit: bút nằm ngang hàng sau, không chạm cuộn thiếc.

### Phép hàn: rê chuột sáng đủ các ô sẽ hàn (2026-10-25)

- Yêu cầu: sách phép hàn 1 lần được 10 con → rê vào ô hàn thì sáng lên đủ số ô sẽ được hàn.
- `spellSolderKeys()` (supplies.ts): các phím chưa hàn kế tiếp (hàng → cột, vòng lại đầu), dùng chung cho `solderKey` và
  `SolderPad`. Rê vào 1 ô: store nhỏ `useSolderLit` (SolderPad.tsx) giữ tập ô = ô đó + tối đa `spell − 1` phím ké (đủ thiếc
  mới tính); các ô trong tập sáng vàng giống ô đang rê. Nhả chuột / rời ô thì tắt.
- Đã chụp headless: rê SW37 → SW37 + các phím kế tiếp cùng sáng.
- Mũi tên hướng dẫn bước hàn (2026-10-25, "thêm mũi tên trỏ vào như mod stab"): `useSolderHint` (`scene/parts/solderHint.ts`)
  chọn 1 chỗ: phím cháy đầu tiên (nếu có bút hút thiếc) → bùi nhùi khi mũi hàn đen (`'clean'`) → phím chưa hàn đầu tiên
  (hàng → cột). `SolderPad` vẽ `HintArrow` (size 1.5) trên phím đó, ẩn khi đang giữ mỏ hàn; `SolderKit` vẽ trên giá bùi nhùi.
  `HintArrow` thêm `size` (mặc định 1, các bàn cũ không đổi).
- Khoá camera khi hàn (2026-10-25, "trong lúc hàn thì khoá cam, không xoay lung tung"): `useCamLock` (`scene/common/camLock.ts`)
  bật khi `SolderPad` đang `holding` (giữ mỏ hàn / bút hút thiếc trên chân), nhả / hàn xong / cháy / rời ô thì tắt (cleanup effect);
  `Controls` trong Bench.tsx đặt `OrbitControls enabled={!locked}` (không xoay / kéo / zoom). Dùng lại được cho thao tác giữ chuột khác.
