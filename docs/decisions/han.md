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
