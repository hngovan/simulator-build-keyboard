# Giấy phép & nguồn model

Quy tắc của người dùng:

- File sưu tầm cá nhân chưa rõ giấy phép: **chỉ dùng cá nhân** (assets/user-cases, solder-tools OBJ / 3MF,
  PCB Mechlovin, đồ mở switch MX STL).
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
- `assets/community/mechlovin-pcb/`: clone repo mechlovin/PCB (commit `e8286ea`), **không đưa vào git** (`.gitignore`,
  chưa rõ giấy phép, ~351MB). Máy khác cần `bun run convert:pcbs` thì clone lại theo `SOURCE.md` trong đó; game chỉ
  dùng GLB đã chuyển ở `public/models/pcbs/`.
- ai03 Plate Generator (`ai03-2725/yet-another-keyboard-builder`, **AGPL-3.0**): chỉ chạy offline để sinh plate universal
  (`bun run gen:plates-universal`, clone ngoài repo qua `YAKB_DIR`), không nhúng mã vào game. File sinh ra:
  `assets/plates/universal/*.dxf|kle.json`, `src/data/generated/plateUniversal.ts`. `polygon-clipping` (MIT) là devDep.
- Emote ếch xanh (Pepe) trong Mezzenger: tải từ FrankerFaceZ (`bun run fetch:emotes` → `public/emotes/`, nguồn từng emote ở
  `public/emotes/SOURCE.md`), fan art Pepe (Matt Furie), **chưa rõ giấy phép — chỉ dùng cá nhân**, đã ghi CREDITS.md.
  Bỏ WeirdChamp (mặt người thật), thay peepoMad.
