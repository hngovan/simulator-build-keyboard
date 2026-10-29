# Giấy phép & nguồn model

Quy tắc của người dùng:

- File sưu tầm cá nhân chưa rõ giấy phép: **chỉ dùng cá nhân** (assets/user-cases, solder-tools OBJ / 3MF,
  đồ mở switch MX STL).
- **Không** tải nhạc từ YouTube.
- Model CC BY 4.0 phải ghi công ở **cả** `src/data/credits.ts` (mục Ghi công trong Cài đặt đã bỏ theo yêu cầu người dùng 2026-10-25; file vẫn giữ làm nguồn) và `public/CREDITS.md`.

## Đã ghi công (CC BY 4.0)

| Model                      | Tác giả              | Dùng ở                            |
| -------------------------- | -------------------- | --------------------------------- |
| Soldering Iron 60W         | yarankepang          | bút hàn                           |
| Band Aid Box               | Logansryche          | hộp Urgo                          |
| Voxel Cutting Mat          | shpawen              | tấm lót bàn                       |
| Chest Box Wooden           | Mehdi Shahsavan      | rương mở hộp                      |
| Old Tool Box               | Mark-kon             | hộp đồ nghề                       |
| Diploma Frame              | DrewA                | khung chứng chỉ (thêm 2026-10-24) |
| Electric Screwdriver_ Tool | MugoflighterfluidArt | tua vít điện (thêm 2026-10-24)    |
| Round Brush                | Zsky                 | cọ lube                           |

## CC0 / tự dựng

- Poly Haven (bàn, ghế, đèn, cây, kệ, tua vít tay...), Innerscene (hũ, hộp lò xo).
- 2026-10-28 (phòng đi lại được): tải thêm từ Poly Haven `metal_office_desk`, `WoodenTable_03`, `drawer_cabinet`,
  `modern_wooden_cabinet`, `modern_ceiling_lamp_01` → `public/models/room/` (`node scripts/fetch-room.mjs <id>...` chỉ tải
  model được nêu, không tải texture, không ghi đè CREDITS.md). Ghế văn phòng, cửa sổ, rèm, cửa ra vào: Poly Haven không có,
  Sketchfab cần token (chưa có) → chưa tải.
- 2026-10-28 (sân vườn 3D ngoài cửa sổ): đã tải cây / bụi / cỏ Poly Haven rồi **gỡ** theo người dùng ("nặng máy quá"): xoá file, bỏ khỏi `fetch-room.mjs` + CREDITS. Cửa sổ dùng lại ảnh vẽ canvas.
- Màn hình + CPU, thùng carton, khối chặn case: dựng bằng code.

## Nguồn file gốc

- `assets/community/hand-tools/SOURCE.md`: tua vít điện + đồ mở switch.
- `assets/community/README.md`: các bộ CAD bàn phím (MIT).
- PCB Mechlovin: **đã gỡ** (2026-10-25, người dùng không cần nữa) — xoá `assets/community/mechlovin-pcb/`,
  `public/models/pcbs/`, script `convert:pcbs`, sản phẩm Shopii `PCB_MODELS` và ghi công; chỉ còn PCB tiêu chuẩn mỗi layout.
- ai03 Plate Generator (`ai03-2725/yet-another-keyboard-builder`, **AGPL-3.0**): chỉ chạy offline để sinh plate universal
  (`bun run gen:plates-universal`, clone ngoài repo qua `YAKB_DIR`), không nhúng mã vào game. File sinh ra:
  `assets/plates/universal/*.dxf|kle.json`, `src/data/generated/plateUniversal.ts`. `polygon-clipping` (MIT) là devDep.
- Emote ếch xanh (Pepe) trong Mezzenger: tải từ FrankerFaceZ (`bun run fetch:emotes` → `public/emotes/`, nguồn từng emote ở
  `public/emotes/SOURCE.md`), fan art Pepe (Matt Furie), **chưa rõ giấy phép — chỉ dùng cá nhân**, đã ghi CREDITS.md.
  Bỏ WeirdChamp (mặt người thật), thay peepoMad.
- Model người dùng cung cấp 2026-10-25 (Sketchfab, chưa rõ giấy phép → **chỉ dùng cá nhân**): stab clip-in Cherry, stab plate-mount
  (`assets/community/stab-variants/`), HHKB Pro JP (`assets/community/hhkb-desk/`); chờ: switch Cherry MX nhiều màu, switch low profile.
- Model người dùng cung cấp 2026-10-25 (Sketchfab, chưa rõ giấy phép → chỉ dùng cá nhân): stab clip-in Cherry + stab plate-mount
  (`assets/community/stab-variants/`). Switch Cherry MX nhiều màu + low profile: người dùng dừng, không làm (đã hoàn tác).
- Nhạc nền (2026-10-25): `bgm.mp3` Coffee House Bump (OatCog), `bgm-2.mp3` Chill lofi inspired (omfgdude), `bgm-3.mp3`
  A cup of tea (TAD, lofi Compilation) — đều CC0 OpenGameArt; TAD xin ghi "Tad" (CC0 không bắt buộc, vẫn ghi trong credits).

- 2026-10-28: tải thêm 4 khung tranh Poly Haven (CC0): `hanging_picture_frame_02/03`, `fancy_picture_frame_01/02` → `public/models/room/` (thêm vào MODELS `scripts/fetch-room.mjs`, ghi công CREDITS.md phòng). Mặt tranh = material `*_artwork` / `*_canvas`, để thay texture tranh tự vẽ.
- 2026-10-28: model người dùng đưa (Sketchfab, **chưa rõ giấy phép → chỉ dùng cá nhân**): Topre Realforce 87U, Razer DeathAdder
  (`public/models/desk/`, gốc trong `assets/user-desk/` không commit). Lót chuột in logo Topre "COLDTOP" vẽ lại theo ảnh người dùng
  (thương hiệu thật, chỉ dùng cá nhân).
- 2026-10-29: rèm lá "Venetian frame window" người dùng đưa (Sketchfab, **chưa rõ giấy phép → chỉ dùng cá nhân**) → `public/models/room/venetian-blind.glb`.
- 2026-10-29: bàn có hộc "office desk" người dùng đưa (Sketchfab, **chưa rõ giấy phép → chỉ dùng cá nhân**) → `public/models/desk/office-desk.glb`.
- 2026-10-29: màn hình "ASUS PC gaming monitor" người dùng đưa (Sketchfab, **chưa rõ giấy phép → chỉ dùng cá nhân**) → `public/models/desk/asus-monitor.glb`.
