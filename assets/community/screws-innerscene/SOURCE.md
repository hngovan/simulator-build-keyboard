# Ốc vít cho game

Ba model STEP gốc từ Innerscene Free Parts Library, giấy phép [CC0](https://www.innerscene.com/tools/library/terms):

| File | Kiểu | Nguồn |
| --- | --- | --- |
| `countersunk-m3x10.step` | Ốc đầu côn chìm M3 × 10, lỗ lục giác | [Countersunk screw M3 x 10](https://www.innerscene.com/tools/library/3d-parts/countersunk-screw-m3-x-10-4cdc4298) |
| `socket-cap-m2x6.step` | Ốc đầu trụ M2 × 6, lỗ lục giác | [Socket cap screw M2 x 6](https://www.innerscene.com/tools/library/3d-parts/socket-cap-screw-m2-x-6-77092786) |
| `button-head-m3x8.step` | Ốc đầu tròn thấp M3 × 8, lỗ lục giác | [Button head screw M3 x 8](https://www.innerscene.com/tools/library/3d-parts/button-head-screw-m3-x-8-4332698d) |

`scripts/convert-screws.mjs` chuyển STEP sang `public/models/screws/*.glb` để dùng trong game: xoay trục CAD Z lên thành trục game Y lên, dời mặt đầu vít về Y = 0. Kích thước mesh vẫn tính bằng mm; component game nhân `MM` khi render. Khi dùng các kiểu rãnh khác lục giác trong game, một miếng phủ nhỏ và dấu rãnh được vẽ lên miệng socket của model nguồn.
