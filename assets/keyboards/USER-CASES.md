# Case CAD từ bộ sưu tập cá nhân

Chép từ `D:\IN 3D` (bộ sưu tập của người dùng), mỗi bàn phím 1 thư mục `assets/keyboards/<tên>/`. Chuyển sang GLB bằng `bun run convert:user-cases`
(`scripts/convert-user-cases.mjs`) → `public/models/keyboards/<tên>/case*.glb`.

| Case trong game | File | Ghi chú |
| --- | --- | --- |
| Exodus60 | `Exodus60 TOP / BOT / TẠ`, nắp riêng `TOP WKL`, `TOP hống hách kb` (HHKB) | `TOP.stl` gốc lệch +51.2mm, script dời về |
| Exodus80 (TKL) | `Exodus80 TOP / BOT / TẠ TRONG / TẠ NGOÀI in 3D` | |
| Repent75 | `REPENT75 TOP / BOT / TẠ in 3D` | góc gõ 7° |
| Catto HHKB | `CattoHHKB TOP / BOT / TA` | plate trong CAD trải z 0 → 14.7mm |
| Vintage60 HHKB | `Vintage60 TOP fix 2 / BOT` | |
| Eclipse 60 | `TOP / BOT / TA egg` | plate ở z −51.5mm |
| 4HEAD nhôm / acrylic | `4HEAD TOP ALU / TOP ACRYLIC / BOT ACRYLIC / TA BRASS` | góc gõ 6.2° |
| RF Bruh (TKL) | `TOP / BOT RFBRUH` (thư mục REALFORCER1,2) | dáng Realforce |
| Catto RF v4 (TKL) | `CattoRF v4.step` (2 chi tiết) | cao độ plate ước lượng |
| Duality Horns (TKL) | `duality_horns_v1_asm v11.step`: SOLID (nắp), BOTTOM (node đáy riêng) + tạ WEIGHT, BADGE, ACCENT_V2 | case 2 mảnh, 4 vít góc; bỏ 4 tấm plate + đệm. Plate F13 TKL: `plate/duality-tkl.dwg` |
| 65TA (65%) | `65TA in3D TOP / BOT / TA` | góc gõ 6.9° |

Mảnh tạ (tên file có TẠ / TA, hoặc WEIGHT / BADGE / ACCENT) xuất thành node `weight` riêng, game tô kim loại khác màu case.

Bỏ qua (theo yêu cầu): `BOX TOOL 3 MODE`, `CattoRF v4.f3d`. Chưa dùng: file plate (`.step` / `.stl` / `.dxf` — plate trong game dựng theo layout),
`*.dwg` (AutoCAD) — cần xuất sang STEP / STL trước.

⚠️ **Chưa rõ giấy phép** của các thiết kế này: chỉ dùng cá nhân, không phát hành kèm bản game công khai
khi chưa có quyền từ tác giả.
