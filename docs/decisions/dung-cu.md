# Dụng cụ, chứng chỉ, lube

## 2026-10-24

### Độ bền dụng cụ

- `ToolDef.life`, đếm ở `wear`, `wearTool(kind)`; hết thì về bậc 0.
- Bút hàn 300, trạm hàn 1000, bùi nhùi 1000, cọ lube 1000 (trừ ở modStab housing / wire, `lubeBatch`, `lubeSprings`).
- Cọ lube chỉ còn 1 loại (SAVE_REV 2 kẹp bậc cũ).

### Chứng chỉ thợ (`TOOLS.cert`)

- Thợ lõ n = 1 (mặc định), middle 5000k n = 5, senior 10000k n = 10.
- `installRun` dùng `TOOLS.cert[..].n` = số phím mỗi lần lắp switch / keycap.
- Mẻ lube = min(opener.n = 99, cert.n).
- Đã bỏ jig / bàn ép switch & keycap; bàn mở 25 ô cũng bỏ.
- Mục Shopii riêng "Chứng chỉ thợ" (`ShopCategory` 'cert'; itemName, buyPost, onBuy, ProductImage đều xử lý).
- Khung `diploma_frame.glb` qua `createDiploma(scene, rank)` (`src/scene/models/diplomaModel.ts`), giấy vẽ canvas.
  Treo tường trong `Room.tsx` (component `Diploma`) và làm ảnh Shopii.

### Tua vít điện

- Model thật `public/models/tools/electric-screwdriver.glb` (từ `assets/community/hand-tools/`, `bun run convert:hand-tools`):
  đã gộp transform, trục mũi = +y, mũi ở gốc, tay cầm chĩa +x, dài 1,45u.
  Node `bit` (mũi + đầu kẹp) quay khi vặn, `body` đứng yên.
- Dùng ở: `ElectricScrewdriver` (HandTools, lúc vặn vít + đổi đầu vít), hộp đồ nghề trong Room (nằm nghiêng,
  scale 3.6 / M), ảnh Shopii (`tool === 'screw'` trong modelThumb).

### Lube switch — mở switch trước

- Đồ mở `public/models/tools/mx-opener.glb` (STL, mm, căn tâm, đáy y = 0, màu đỏ).
- `build.opened` (optional; bản lưu cũ coi như = `lubed`). Action `openSwitch()`: 1 click = 1 switch, hoạt cảnh
  `lubeAnim.kind = 'open'` 0,7s.
- `lubeBatch` chỉ lube switch đã mở (`opened - lubed`); chưa mở thì báo "Mở switch bằng đồ mở trước".
- Bàn lube: `SwitchOpener` ở `OPENER_AT = (4.6, TABLE, -3.4)` (các chỗ khác bị HUD che hoặc ra ngoài khung),
  chữ "Còn n switch chưa mở". Bộ phận đã tách chỉ bày khi có switch đã mở chờ lube.
- LubePanel: 3 mục — 1 Mở switch, 2 Lube switch, 3 Lube lò xo.

### Khác

- Lọ dầu `createOilBottle` / `isOil` trong `lubeJarModel.ts` (LubeStation + ảnh Shopii).
- Switch Kailh Box (2026-10-25): Box Đỏ (linear), Box Nâu (tactile), Box Trắng + Box Jade (clicky thanh click) trong `SWITCHES`;
  model 3D dùng chung switch MX (chưa có model stem hộp riêng).
