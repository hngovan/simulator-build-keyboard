# Mẫu keycap theo profile

File CAD gốc được giữ ở đây để tham khảo và chuyển đổi sang GLB. Trong game, phím 1u dùng GLB từ các file CAD; phím dài dùng mesh theo kích thước layout. DSA và MT3 được giảm số đa giác khi chuyển đổi.

| Profile | File | Nguồn cố định | Giấy phép |
| --- | --- | --- | --- |
| Cherry | `cherry/r1-1u.stl` đến `r4-1u.stl` | [ConstantinoSchillebeeckx/cherry-mx-keycaps](https://github.com/ConstantinoSchillebeeckx/cherry-mx-keycaps/tree/2fa89ef205e4b1529d82fd33cef4e46f057760b1) | MIT; `cherry-mx-keycaps-LICENSE` |
| OEM | `oem/extracted/r1-1u.step` … `r4-1u.step` (giải nén từ `oem-profile.zip` của nguồn; file zip không lưu trong repo) | [dankwookiee/Kieeboard](https://github.com/dankwookiee/Kieeboard/tree/d05eaed2494674285d818df936d3b4435ae51474) | CC BY 4.0; `Kieeboard-LICENSE` |
| SA | `sa/r1.stl` đến `r3.stl` | [getclacking/SA-profile-keys-3D-models](https://github.com/getclacking/SA-profile-keys-3D-models/tree/1aff97a611507b0f59f534b424bd3b46b1cb1358) | MIT; `SA-profile-keys-3D-models-LICENSE` |
| DSA | `dsa/1u.stl` | [anhthang/dsa-keycap](https://github.com/anhthang/dsa-keycap/tree/efc08d0a025057ede925347e8b07d85971778f2b) | MIT; `dsa-keycap-LICENSE` |
| XDA | `xda/keycaps.obj` (bộ nhiều phím) | [spooknik/XDA-Keycaps](https://github.com/spooknik/XDA-Keycaps/tree/1946ac07c9c905e8222dbd9559f3c3a5b779ab99) | MIT; `XDA-Keycaps-LICENSE` |
| MT3 | `mt3/row0.stl` (giải nén từ `mt3.zip` của nguồn, gồm row 0 + spacebar 6.25u; file zip không lưu trong repo) | [Matt3o, người thiết kế MT3](https://matt3o.com/mt3-stl-files-for-artisan-keycap-designers/) | CC BY-SA 4.0; yêu cầu ghi công và chia sẻ tương tự khi dùng/chỉnh sửa model |
| OPK | `opk/row3-u1.step` | [cubiq/OPK](https://github.com/cubiq/OPK/tree/53f9d6a4123b0f309f87158115c83d19811b3484) | Apache 2.0; `OPK-LICENSE` |

`scripts/convert-keycaps.mjs` chuyển các file trên thành GLB trong `public/models/keycaps/`. Keycap 1u trong game và ảnh xem trước cửa hàng dùng các GLB này; DSA và MT3 được giảm số đa giác bằng Meshoptimizer để dùng được nhiều phím cùng lúc. Các phím rộng dùng mesh điều chỉnh theo layout.

ASA trong game là mesh mô phỏng theo thông số hình dáng, chưa có CAD gốc được cấp phép rõ ràng trong thư mục này. MT3 cũng chỉ có file chính chủ cho row 0 và spacebar; các hàng còn lại trong game hiện dùng mẫu row 0. OPK có mẫu row 3. Không ghi các file này là bộ CAD đầy đủ cho mọi hàng.
