# Nhạc nền

Game phát ngẫu nhiên 3 bài dưới đây (hết bài thì chọn bài khác, không lặp lại bài vừa nghe). Tất cả đều **CC0**, chuyển sang MP3 160 kbps; hai bài mới được hạ âm lượng cho đều với `bgm.mp3`. Nếu thay nhạc, chép đè file cùng tên và lưu lại giấy phép.

- `bgm.mp3`: loop jazz instrumental **Coffee House Bump** của OatCog, tải từ [OpenGameArt](https://opengameart.org/content/coffee-house-bump), giấy phép **CC0**. Bản WAV nguồn được chuyển sang MP3.
- `bgm-2.mp3`: **Chill lofi inspired** của omfgdude, tải từ [OpenGameArt](https://opengameart.org/content/chill-lofi-inspired) (file `ChillLofiR.mp3`), giấy phép **CC0**. Dài khoảng 2 phút 3 giây.
- `bgm-3.mp3`: **A cup of tea** của TAD, trong bộ [lofi Compilation](https://opengameart.org/content/lofi-compilation) trên OpenGameArt, giấy phép **CC0**. Dài khoảng 2 phút 49 giây. Tác giả xin ghi "Tad" khi dùng, dù CC0 không bắt buộc.

## Hiệu ứng âm thanh

Mỗi tương tác 1 thư mục trong `sfx/` (hàm phát tiếng tương ứng trong `src/sound.ts`):

| Thư mục     | Tương tác                                                      | Hàm                      | File                                |
| ----------- | -------------------------------------------------------------- | ------------------------ | ----------------------------------- |
| `keypress/` | gõ phím (bước test)                                            | `playKey`                | `1.wav` – `3.wav` (chọn ngẫu nhiên) |
| `screw/`    | vặn vít bằng tua vít tay (tua vít điện phát `1.wav` tua nhanh) | `playScrew`, `playDrill` | `1.wav`, `2.wav`                    |
| `assembly/` | lắp linh kiện khớp vào chỗ                                     | `playClick`              | `click.wav`                         |
| `open-box/` | mở kiện hàng: bóc băng keo rồi bao bì sột soạt                 | `playOpenBox`            | `tape.wav`, `plastic.wav`           |
| `desolder/` | bút hút thiếc                                                  | `playDesolder`           | `suction.wav`                       |

Thêm tiếng mới: tạo thư mục theo tên tương tác, thêm đường dẫn vào `SFX_FILES` trong `src/sound.ts`.
Tương tác chưa có file (hàn, lau mũi hàn, quét cọ lube) tổng hợp bằng WebAudio.

Nguồn: `keypress/`, `screw/`, `assembly/`, `open-box/` là CC0 từ các bộ sưu tập của [CC0 Sounds](https://cc0-sounds.exi.software/), trang này ghi toàn bộ file âm thanh thuộc CC0:

- `keypress/`: từ [Bb Keyboard Sounds](<https://cc0-sounds.exi.software/collection/bb%20-%20keyboard%20sounds%20(mar%202021)/>).
- `screw/`, `assembly/`: ratchet và tiếng khớp cơ khí, từ [Bb Smol Mechanisms](<https://cc0-sounds.exi.software/collection/bb%20-%20smol%20mechanisms%20(may%202021)/>).
- `open-box/`: bóc băng keo và bao bì sột soạt, từ [Bb Toolbox Rummaging](<https://cc0-sounds.exi.software/collection/bb%20-%20toolbox%20rummaging%20(sept%202021)/>).
- `desolder/suction.wav`: cắt từ bản gốc người dùng đưa (`assets/audio/sfx/desolder/suction-source.mp3`).
