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
- Nhãn dán cuộn (2026-10-30, người dùng gửi ảnh nhãn Sakura + Asahi, "thiếc lởm: nhãn No name"): `SupplyDef.solder.label`
  (`SpoolLabel`: `noname` / `sakura` / `asahi`), `createSolderSpool(color, mounted, label)` dán `RingGeometry` 2 mặt ngoài vành,
  texture canvas vẽ trong `LABELS` (cache theo nhãn, không dispose cùng material) + màu nhựa vành theo hãng (Sakura xanh dương,
  Asahi trắng, No name xám). Sakura: nền trắng viền xanh, ALLOY 63/37 · DIA 0.8MM; Asahi: nền vàng, chữ đỏ uốn cung
  "ROSIN ACTIVATED CORE WIRE", logo ASAHI, 0.6mm cho khớp tên; No name: giấy in đen trắng lệch, vết bẩn. Dùng ở bàn hàn + ảnh Shopii.

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

## Hàn bằng skill check thay giữ chuột (2026-10-28)

- Người dùng: hỏi cơ chế "chọn điểm xanh trong thanh đỏ" rồi "làm gì giữ chuột cho người chơi thả" → chọn: cả vặn vít + hàn, kim chạy qua lại
  liên tục, có vùng vàng hoàn hảo.
- `data/skillCheck.ts` (`makeCheck` vùng xanh ngẫu nhiên chừa đỏ trái ≥ 0,2 / phải ≥ 0,12, vàng = 30% vùng xanh; `needleAt` kim tam giác;
  `judge` → perfect / ok / low / high), `scene/common/skill.ts` (1 lần thử chạy 1 lúc, `startSkill` / `stopSkill`, bấm chuột trái bất kỳ
  (capture) hoặc Space dừng, `skillBusy` chặn cú bấm dừng kim bị tính là bấm vật khác), `components/game/SkillBar.tsx` (kim vẽ bằng rAF).
- SolderPad: bấm chân → `startSkill(solderSkill(station, wire))`; low → `failSolderKey` (hụt, 3 lần cháy), high → cháy, ok / perfect → `solderKey(..., perfect)`
  (`build.perfect` gồm cả phím phép hàn ké). Thiếc chảy / xém theo vị trí kim. Hút thiếc cháy: bấm 1 lần, bút hút tự chạy 1,4s.
  Bỏ `solderWindow` / `solderTiming` / `HeatBar`; `solderSkill`: bút 0,2 / 0,9, trạm 0,28 / 0,75, thiếc đểu `slow` hẹp vùng xanh (× 1 − slow / 2).
- Chấm điểm: check "Thao tác hoàn hảo (vùng vàng) n/N" thưởng ≤ `PERFECT_BONUS` 5 (N = vít bước vặn vào + phím hàn).
- Đã thử (playwright `pw/tray.mjs`, tofu60redux tray + PCB hàn): bấm chân hiện thanh đỏ / xanh / vàng + kim, bấm lần 2 ra mối đạt.

## Skill check về lại giữ chuột / nhả (2026-10-30)

- Người dùng: "giờ đây không còn canh lực thả nữa → trả về cơ chế trước đây ... ấn giữ chuột rồi nhả ra trong vùng màu xanh là được", "màu đỏ là tuôn ren".
- `scene/common/skill.ts`: nhấn chuột lên vít / chân hàn (`startSkill` ở onPointerDown như cũ) thì kim chạy, nhả chuột trái (`pointerup` /
  `pointercancel` pha capture trên window) thì `stopSkill` chấm; bỏ "bấm lần nữa / Space dừng". Lúc giữ khoá camera (`useCamLock`) để kéo
  chuột không xoay cảnh. Thanh / vùng màu / chấm điểm giữ nguyên: đỏ phải = trượt ren (`STRIP_TRIES` 3 lần thì tuôn, theo yêu cầu cũ ở dung-cu.md),
  hàn đỏ phải = cháy. Sửa chữ hướng dẫn (SkillBar "Nhả chuột trong vùng xanh", hint bước trong steps.ts, ModPanels, Keeb-chan benchLines).
- (2026-10-30, người dùng đưa ảnh thanh cũ: vàng bên trái, nền tối, xanh, đỏ cuối; "áp dụng cho hàn và các bước mở vít cần dùng lực")
  Thanh về kiểu `HeatBar` / `TorqueBar` trước 0.1.14: `needleAt` nạp 1 chiều 0 → 1 (không chạy qua lại), `SkillBar` nền tối, vùng xanh mờ
  (đậm khi đã nạp tới), đỏ mờ cuối thanh, phần nạp vàng → xanh → đỏ; vùng hoàn hảo thành dải xanh sáng trong vùng xanh (vẫn thưởng `perfect`).
  Giữ tới đỏ thì tự dừng ngay (`overAt`, hẹn giờ trong `startSkill`) = trượt ren / cháy, không chờ nhả. Spec (bề rộng xanh / tốc độ) giữ nguyên.
- (2026-10-30, người dùng: "giữ để chạy lên rồi tụt xuống lại thì hợp lý hơn, không random mà cố định", "3 khoảng", "chạy chậm thôi",
  "tua vít điện thì thanh xanh rộng hơn 1 xíu so với vít thường") Thanh lực / nhiệt: `makeCheck` 3 khoảng cố định — nền tối, xanh sát trước
  đỏ, đỏ cuối `RED` 16% (`hi` = 0,84, `lo` = hi − width), không random; `needleAt` lại chạy lên hết thanh rồi tụt xuống (ping-pong) tới khi
  nhả, nhả mới chấm (bỏ tự dừng khi chạm đỏ). Bỏ vùng hoàn hảo (`plo = phi`) + dòng thưởng "Thao tác hoàn hảo" trong `scoreDelivery`.
  Chậm lại: tua vít tay 0,2 / 0,45 lượt/s, điện 0,24 / 0,55 (xanh rộng hơn tay một chút); hàn bút 0,2 / 0,5, trạm 0,26 / 0,42. SkillBar 180px.
