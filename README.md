# Keyboard Builder Simulator

Mô phỏng quy trình build bàn phím cơ: nhận đơn, mua linh kiện, lắp ráp và giao hàng.
Ứng dụng được xây dựng bằng React, TypeScript, Vite, Tailwind CSS và React Three Fiber.

Các file CAD bàn phím, case, plate và PCB công khai dùng làm nguồn cho game nằm tại [assets/community](assets/community/README.md), kèm nguồn và giấy phép.

## Ảnh demo

![Màn hình tiêu đề](docs/images/title.jpg)

| Nhận đơn ở Mezzenger                               | Mua đồ ở Shopii (Sách phép)                          |
| -------------------------------------------------- | ---------------------------------------------------- |
| ![Mezzenger](docs/images/mezzenger.jpg)            | ![Shopii](docs/images/shopii-sach-phep.jpg)          |
| **Bàn build 3D: lắp keycap**                       | **Bàn lube: mở và lube switch**                      |
| ![Bàn build](docs/images/ban-build.jpg)            | ![Bàn lube](docs/images/ban-lube.jpg)                |
| **Top mount: bắt vít plate vào case trên**         | **O-ring mount: vòng silicon gá sau khi lắp switch** |
| ![Top mount](docs/images/top-mount.jpg)            | ![O-ring mount](docs/images/oring-mount.jpg)         |
| **Hàn switch: giữ mỏ hàn, nhả trong vùng xanh**    | **Dán feet cao su vào hốc dưới đáy case**            |
| ![Hàn switch](docs/images/han-switch.jpg)          | ![Dán feet](docs/images/dan-feet.jpg)                |
| **Shopii: switch mới (HMX, housing kim tuyến...)** |                                                      |
| ![Shopii switch](docs/images/shopii-switch.jpg)    |                                                      |

## Lịch sử cập nhật

<!-- prettier-ignore -->
| Phiên bản | Ngày | Mảng | Thay đổi chính |
| --- | --- | --- | --- |
| **0.1.6** | 26/10/2026 | 🛒 Đăng bán ở chợ | Tab "Bài của tôi" ở Hội Phím Cơ: bán đồ trong kho hoặc phím của khách (dễ bị lộ, chuộc lại được). |
|  |  | 🧪 Test phím | Phím chưa hàn không ăn, bước hàn sáng "!" để quay lại; giao khi chưa test hết có thể bị báo lỗi nút. |
|  |  | 🎀 Keeb-chan | NPC hướng dẫn nhắc mẹo theo tình huống. |
|  |  | 💾 Lưu tiến trình | Esc mở Cài đặt, nút Lưu ghi bảng xếp hạng; đóng tab tự gửi. |
| **0.1.5** | 26/10/2026 | 🏆 Bảng xếp hạng | Xếp theo điểm tổng (đơn + uy tín + ngày + tiền), lọc theo từng thông số, khung loading khi tải. |
|  |  | 🔗 Gửi link | Gửi link game lên Facebook / Messenger / Zalo / Discord hiện banner + mô tả. |
| **0.1.4** | 26/10/2026 | 💍 O-ring mount | Vòng silicon gắn sau khi lắp switch / hàn, lúc switch đã giữ chặt plate. |
|  |  | 🪛 Tua vít thường | Vặn chậm theo cổ tay, xoay khớp với con ốc, không còn giật như tua vít điện. |
|  |  | 🏆 Bảng xếp hạng | Chạy trên Vercel (Vercel Function + Upstash Redis); xem mục "Deploy lên Vercel". |
| **0.1.3** | 26/10/2026 | 💀 Thua game | Uy tín từ −10 trở xuống hoặc hết tiền nhận đơn là thua; tự tuyên bố phá sản ở Cài đặt. |
|  |  | 🏆 Bảng xếp hạng | Server riêng (`bun run server`), gồm lượt chơi đã kết thúc của mọi người, xếp theo tiền; tiền gọn k → m → B. |
|  |  | 🦶 Feet cao su | Bước mới trước khi lắp case: case tự lật úp, dán feet đen / trắng vào 4 hốc CNC; Shopii bán vỉ 4 cái. |
|  |  | 🧩 Case theo cụm phím | Khối chặn liền case tách theo cụm (TKL / full / FRL / 75 / 65); tấm mica trên plate khoét theo cụm. |
|  |  | 🔩 Case & mount | Case 2 mảnh có lỗ vít (nhôm / PC / acrylic ở đáy, mica xuyên mọi tấm); case 1 mảnh chơi tray / O-ring / OG; thêm Case TKL nhôm 1 mảnh. |
|  |  | 🛒 Shopii | Case cùng dòng gộp 1 sản phẩm (chọn chất liệu rồi màu), ghi cỡ layout; ô nhập số lượng khi mua. |
|  |  | 📦 Đơn hàng | Có đơn đòi đích danh 1 loại switch; switch phải hợp kiểu âm thanh khách muốn. |
|  |  | 🎨 Switch & màu case | Otemu Silent, Cherry Tím / Cam, Gateron Type R / Milky / Silent Tactile, HMX, Wingtree, Ruben Bumblebee..., housing kim tuyến; case thêm tím, coffee sữa, nâu đậm, đỏ + navy. |
|  |  | 📱 Giao diện | Tối ưu cho điện thoại: taskbar, hộp thoại, HUD bàn build, camera; nhãn keycap ở Hội Phím Cơ hết đè nhau. |
| **0.1.2** | 25/10/2026 | 🗃️ Kho chung | Đồ mua dư / bị thay / thừa sau khi giao không mất; nhận hoặc chuyển đơn tự lấy món hợp yêu cầu; Kho hiện cả đồ đơn đang chờ. |
|  |  | 💰 Tiền & đơn hàng | Giao xong khách trả đủ budget linh kiện (mua rẻ thì lãi); đơn có thể đòi đích danh case / stab / chất liệu plate / chất liệu keycap. |
|  |  | 🛒 Shopii | Bộ stab TKL + stab lẻ theo cỡ dây; bộ lọc ô đổ xuống ở mọi mục, "Chỉ hiện đồ hợp đơn"; keycap 3 chất liệu PBT / Mix / ABS; sách phép gói 100 / 200 / 500. |
|  |  | 🤝 Hội Phím Cơ | Tự nhập giá trả (3 lần / người bán); "Đi ăn xin" xin free, 10% bị ban chợ 3 ngày. |
|  |  | 🎵 Âm thanh & app | Nhạc nền xoay 3 bài; app Bảng xếp hạng (so với shop đối thủ); Đánh giá có badge uy tín; Silent Tactile thành loại riêng. |
|  |  | 🐛 Sửa lỗi | Plate 60% lật gương, case Planck xoay ngược, feet lệch hốc, camera xoay khi hàn, mỡ wire stab dài, chữ keycap SA bị che. |
| **0.1.1** | 25/10/2026 | 📜 Lịch sử & tài liệu | Bấm số phiên bản ở màn hình tiêu đề xem lịch sử cập nhật; README có ảnh demo; dọn code không dùng. |
|  |  | 🤝 Hội Phím Cơ | Ngày mới đăng đợt hàng pass mới; người bán có giá sàn ~60%, hết bị trả giá về 0đ. |
| **0.1.0** | 25/10/2026 | 📖 Sách phép | Phép mở / lube / lắp switch, lắp keycap, hàn, rã hàn (200 lần / cuốn): thợ lõ 10 con mỗi lần, có chứng chỉ cộng thêm 10. |
|  |  | 🛠️ Bàn build | Mũi tên vàng chỉ phím cần hàn / bùi nhùi; sắp lại bàn lube; stab nhiều kiểu, case top mount; cải thiện camera, HUD, luồng app. |
|  |  | ⌨️ Layout & dụng cụ | Layout 65%, 75%, FRL, Planck, Alice; bút hút thiếc, giá cuộn thiếc, bùi nhùi, chứng chỉ thợ; chấm chất lượng mối hàn. |
|  | 23/10/2026 | 🖥️ Desktop | Cải thiện desktop giả lập và cài đặt âm thanh. |

Chi tiết từng mục: [src/data/changelog.ts](src/data/changelog.ts) (hoặc bấm số phiên bản trong game).

## Tài liệu

- [Tổng quan source và luồng game](docs/OVERVIEW.md)
- [Nhật ký quyết định](docs/decisions/README.md)

## Cách chơi

- Nhận đơn trong **Mezzenger**, đọc kỹ layout, loại switch, keycap, âm thanh, mount, ngân sách và hạn giao.
- Mua linh kiện đúng yêu cầu ở **Shopii**; món khách gửi trong kit thì không cần mua. **Hội Phím Cơ VN** bán đồ pass rẻ hơn nhưng có khoảng 20% rủi ro bị bùng tiền.
- Chọn mount trước khi build, rồi ra **bàn build 3D** và làm theo danh sách bước trên HUD.
- Trước khi lắp board vào case phải dán 4 feet cao su vào hốc dưới đáy case: mua feet đen / trắng ở Shopii → Lube & vật tư (1 lần mua = 4 cái).
- Hàn đúng vùng xanh và đừng giữ quá lâu; lau mũi hàn khi bị cháy. Lube switch thì mở vỏ trước; mod stab theo đúng mẫu; chọn đúng đầu vít.
- Test bằng bàn phím thật hoặc click phím 3D; càng nhiều phím được test càng cao điểm.
- Bấm **Đóng gói đơn này** để chấm điểm, sau đó gửi khách trong Mezzenger (hoặc để **Kết thúc ngày** gửi nốt).
- Tiền nhận gồm budget linh kiện (mua rẻ hơn thì phần dư vào túi) + tiền công theo điểm; lố ngân sách thì shop chịu phần lố và bị trừ điểm.
- Kho chung của shop: mọi linh kiện mua dư / bị thay / thừa sau khi giao đều nằm trong Kho, nhận hoặc chuyển đơn thì tự lấy món hợp yêu cầu, chỉ cần mua phần thiếu.
- **Test hết phím trước khi giao**: phím chưa hàn sẽ không ăn và khách báo lỗi nút; bỏ sót test thì 5% khách gặp nút lỗi (đánh giá thấp).
- Hội Phím Cơ → **Bài của tôi**: tự đăng bán đồ trong kho hoặc… phím của khách (95% bị lộ, −1 uy tín; chuộc lại trên chợ thì gỡ được uy tín).
- **Esc** mở Cài đặt: nút xanh **Lưu tiến trình** ghi lên bảng xếp hạng (đóng tab cũng tự gửi). Keeb-chan hướng dẫn mẹo chơi, tắt / bật ở Cài đặt.
- Giữ đơn trong hạn để tránh mất uy tín; đơn chờ trễ quá 3 ngày sẽ bị khách huỷ. Dụng cụ có độ bền và chứng chỉ thợ giúp lắp / lube nhanh hơn.
- **Thua game** khi uy tín từ −10 trở xuống (bị phốt quá nhiều) hoặc rảnh tay mà ví không đủ mua linh kiện cho đơn rẻ nhất. Có thể tự **tuyên bố phá sản** ở Cài đặt. Thua / phá sản / chơi mới đè bản lưu thì kết quả được ghi lên bảng xếp hạng server (app **Bảng xếp hạng**, xếp theo điểm tổng của số đơn + uy tín + số ngày + tiền, lọc lại được theo từng thông số).

## Yêu cầu

- [Bun](https://bun.sh/) 1.4.3 trở lên

## Bắt đầu

```powershell
bun install
bun run dev
```

## Các lệnh thường dùng

| Lệnh                   | Mục đích                                                       |
| ---------------------- | -------------------------------------------------------------- |
| `bun run dev`          | Chạy môi trường phát triển Vite.                               |
| `bun run server`       | Chạy server bảng xếp hạng (cổng 8787, Vite proxy `/api`).      |
| `bun run build`        | Kiểm tra TypeScript và tạo bản build production trong `dist/`. |
| `bun run preview`      | Xem trước bản build production.                                |
| `bun run typecheck`    | Kiểm tra kiểu TypeScript.                                      |
| `bun run lint`         | Kiểm tra JavaScript/TypeScript bằng ESLint.                    |
| `bun run lint:fix`     | Tự sửa các lỗi ESLint có thể sửa an toàn.                      |
| `bun run format`       | Format source bằng Prettier và sắp xếp class Tailwind.         |
| `bun run format:check` | Kiểm tra source đã đúng định dạng hay chưa.                    |

## Deploy lên Vercel

- Vercel tự nhận dự án Vite (cài bằng Bun theo `bun.lock`, build `bun run build` → `dist/`), không cần `vercel.json`.
- Bảng xếp hạng chạy bằng Vercel Function `api/leaderboard.ts`, lưu ở **Upstash Redis**: vào project trên Vercel →
  **Storage** (Marketplace) → thêm **Upstash Redis** và nối vào project. Vercel tự gắn `KV_REST_API_URL` / `KV_REST_API_TOKEN`
  (tạo database Upstash tay thì đặt `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`), rồi deploy lại.
- Client gọi `/api/leaderboard` cùng domain nên không cần đặt `VITE_LEADERBOARD_URL`. Chưa nối Redis thì API trả 503, kết quả
  lượt chơi nằm trong hàng chờ ở máy người chơi và gửi lại khi mở app Bảng xếp hạng.
- Danh sách biến môi trường + giải thích: [.env.example](.env.example). File `.env` không có tác dụng trên Vercel, phải đặt
  ở Settings → Environment Variables (môi trường **Production**) rồi **Redeploy**; API còn trả 503 thì phản hồi liệt kê tên biến
  Redis đang thấy để dò.
- Chạy local vẫn dùng `bun run server` (lưu file JSON), Vite proxy `/api` về đó.

## Quy ước mã nguồn

- Bun là package manager duy nhất; dùng `bun install` và `bun run <script>`.
- Mọi tệp văn bản trong repository dùng LF. `.gitattributes`, `.editorconfig` và Prettier cùng áp dụng quy tắc này.
- Prettier dùng dấu nháy đơn, không dùng dấu chấm phẩy, và plugin `prettier-plugin-tailwindcss` để sắp xếp class Tailwind theo chuẩn.
- ESLint sử dụng flat config cho TypeScript, React Hooks và React Refresh.
