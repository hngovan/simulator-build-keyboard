# Thiết kế vệt mỡ lube không đều

## Mục tiêu

Khi bôi mỡ lên mặt trong housing, hai mặt trượt của slider và dây stabilizer, lớp mỡ phải giống được quét thủ công: có đoạn dày, đoạn mỏng, mép không đều và độ bóng thay đổi nhẹ. Bề mặt cần có vệt miết xoáy (grease swirl) và những cục mỡ sánh đọng (viscous grease blobs), đặt dọc đường cọ đi và quanh các chỗ đổi hướng của wire. Giữ nguyên thao tác bôi hiện tại, loại mỡ đã chọn và hoạt ảnh tiến trình.

## Cách tiếp cận

- **Màng mỡ tạo bằng hình học (đề xuất):** chia mỗi nét thành các đoạn nhỏ, thay đổi bề rộng/độ nhô theo một mẫu ổn định theo vị trí; thêm gờ cong nhẹ như vệt xoáy và các điểm đọng bo tròn. Với wire, thay đổi độ dày quanh chu vi/dọc đường cong và tạo điểm đọng ở móc, góc uốn. Không cần texture UV mới và vẫn bám sát đường nét hiện có.
- **Vệt texture/shader:** có thể tạo nhiễu mịn tự nhiên hơn, nhưng cần UV hoặc shader riêng cho housing, slider và wire, tăng độ phức tạp và khó giữ nhất quán giữa các model.
- **Giữ dải hiện tại:** ít thay đổi nhất nhưng bề mặt vẫn đều và trơn như hiện nay.

Chọn cách thứ nhất vì cho hiệu ứng dày mỏng, vệt xoáy và mỡ đọng nhìn rõ, dùng chung cho hình học nét mỡ hiện có và tương thích tiến trình hoạt ảnh.

## Phạm vi

- Áp dụng cho nét mỡ housing và slider trong bàn lube/mod stab, cùng lớp phủ wire ở bàn mod stab và bàn phím đã lắp.
- Biến thiên hình dáng và highlight theo cùng mẫu cho cùng vị trí để không nhấp nháy giữa các frame.
- Giữ màu theo loại lube và giữ lớp phủ mỏng, bám trên bề mặt chi tiết.
- Không đổi model hũ, công thức tiêu thụ vật phẩm hay thao tác game.

## Kiểm tra

Quan sát các bề mặt housing, slider và wire trong cảnh, cả lúc nét mỡ đang xuất hiện và sau khi hoàn tất; xác nhận hình dáng không nhấp nháy khi chạy hoạt ảnh.
