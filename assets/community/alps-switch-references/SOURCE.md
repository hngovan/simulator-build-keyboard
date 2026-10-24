# Alps / Matias switch CAD

Hai model tham khảo cho switch dùng ngàm keycap Alps đã được tải về:

| Model | File | Nguồn | Quyền sử dụng |
| --- | --- | --- | --- |
| Alps SKCM đơn giản | `alps-skcm-qwelyt.stl`, `alps-skcm-qwelyt.scad` | [qwelyt/ALPS-switch, commit a12a15b](https://github.com/qwelyt/ALPS-switch/tree/a12a15b493da23e76bb0a6748e5768f8f9ec9e44) | **GPL-3.0**, bản sao `qwelyt-LICENSE`. Khi dùng/chỉnh sửa/phân phối model phải tuân thủ GPL-3.0. |
| Matias Click, kiểu Alps | `matias-switch.step` và ZIP gốc `matias-switch-3d.zip` | [Matias Click, mục “3D drawings”](https://matias.ca/switches/click/) | Trang nhà sản xuất cho tải bản vẽ để đưa vào thiết kế, nhưng không nêu giấy phép tái phân phối model. Cần xác nhận quyền trước khi đóng gói model vào bản game phát hành. |

Đã kiểm tra: STL đọc được (532 tam giác); STEP Matias đọc được bằng OpenCascade (1 mesh). **Chưa đưa hai model này vào `public/` hoặc danh sách mua switch trong game.** Alps/Matias dùng ngàm keycap và footprint khác MX; cần thêm PCB, plate và keycap tương thích trước khi cho phép lắp trong game.
