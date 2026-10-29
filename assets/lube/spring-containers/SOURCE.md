# Hộp lắc và khay đựng lò xo

Hai model gốc từ Innerscene Free Parts Library, giấy phép [CC0](https://www.innerscene.com/tools/library/terms):

- `hinged-clamshell.stl`: [Print-in-place hinged clamshell](https://www.innerscene.com/tools/library/3d-parts/print-in-place-hinged-clamshell-ccb6f1e0), hộp hai nửa có bản lề. Bản gốc đặt mở phẳng để in 3D.
- `desk-tray.stl`: [Desk tray](https://www.innerscene.com/tools/library/3d-parts/desk-tray-original-3d-printable-816c70c6), khay nông để đựng lò xo sau khi lắc.

`scripts/convert-spring-containers.mjs` tách hai nửa của hộp, đổi trục STL Z lên thành Y lên và xuất ba GLB trong `public/models/lube/`. Hộp được tô vật liệu nhựa bán trong để thấy lò xo; khay dùng nhựa màu ngà. Game thu kích thước model theo không gian bàn lube.
