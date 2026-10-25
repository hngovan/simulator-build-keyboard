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
