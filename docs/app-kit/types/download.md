# Loại 1 — Tải về

File người mua tải về máy và dùng: PDF, DOCX/XLSX/PPTX, ảnh, bộ thiết kế (.zip).
Trên admin chọn thẻ **Tải về**. Loại sản phẩm trong form: **Asset** (bộ thiết kế, template, tài liệu) hoặc **Hình ảnh**.

## Dùng khi
- Sản phẩm là **nội dung tĩnh**: giáo án, bài giảng, biểu mẫu, sách nhỏ, bộ ảnh, file thiết kế Canva/PSD/AI, slide.
- Người dùng mở bằng phần mềm có sẵn (Word, trình đọc PDF, Photoshop…), không cần chạy code của bạn.

Không phải loại này nếu: cần tương tác hay tính toán (→ Chạy trên store), cần cài đặt (→ Phần mềm bán key).

## Sản phẩm giao cho Ephata
- **Đúng 1 file** cho mỗi sản phẩm. Nhiều file → nén thành 1 `.zip` (có thư mục gọn gàng + file `HUONG-DAN.txt` nếu cần).
- **Ảnh bìa** 16:9 (vd 1600×900), PNG/JPG/WebP — dùng cho thẻ sản phẩm và trang chi tiết.
- **Mô tả**: nội dung có gì, dành cho ai, định dạng file, số trang/số mẫu, cần phần mềm gì để mở.

## Yêu cầu kỹ thuật
| Mục | Yêu cầu |
|---|---|
| Tên file | **Không dấu, không khoảng trắng** (vd `giao-an-mua-vong-2026.pdf`). Ký tự ngoài `a-z A-Z 0-9 . _ -` bị đổi thành `_`. |
| Dung lượng | **Hiện tại tối đa ~1MB tính cả ảnh bìa** (giới hạn mặc định của server action). Form ghi 50MB nhưng chưa đúng — xem "Giới hạn hiện tại". |
| PDF | Nhúng font (Export → PDF/A hoặc "Embed fonts"), để in đúng trên mọi máy. |
| DOCX/PPTX | Dùng font phổ biến có tiếng Việt (Arial, Times New Roman, Roboto…) hoặc nhúng font. |
| Ảnh | ≥ 2000px cạnh dài nếu bán để in; ghi rõ kích thước trong mô tả. |
| Bản quyền | Chỉ bán nội dung bạn sở hữu hoặc có quyền. Bản dịch Kinh Thánh, sách lễ, nhạc thánh ca thường **có bản quyền** — kiểm trước khi trích dùng. |

## Giá & quyền
- **Miễn phí**: ai đăng nhập cũng nhận được.
- **Có phí**: mua **1 lần, dùng vĩnh viễn**, giá = "Giá/tháng" (VND) quy ra point (100đ = 1 point).
- Người có **gói Pro Giáo Lý Số** nhận miễn phí.
- Người mua tải qua link ký có hạn 24 giờ (link tạo mới mỗi lần bấm Tải về ở Thư viện).

## Đưa lên admin
1. **Admin → Thêm sản phẩm → Tải về**.
2. Điền tiêu đề, slug (để trống = tự tạo), loại Asset/Hình ảnh, mô tả ngắn + chi tiết, danh mục, nhà phát hành, tags, ảnh bìa.
3. Mục **Giao hàng**: chọn file tải về. Bấm **Lưu**.
4. **Bắt buộc nếu bán có phí**: ở danh sách **Admin → Sản phẩm**, dòng sản phẩm vừa tạo, chỉnh
   **Tier = PRO** và **Giá/tháng** (VND) → **Lưu**. Ô "Giá (VND)" trong form tạo sản phẩm **không** quyết định giá bán —
   bỏ qua bước này thì sản phẩm thành miễn phí.

## Kiểm sau khi lên
- Mở trang sản phẩm (đăng xuất thử): giá hiện đúng, nút Mua đúng số point.
- Bằng tài khoản admin: mua/nhận → **Thư viện** → **Tải về** → file mở được, đúng tên.

## Giới hạn hiện tại (2026-10-11)
- File + ảnh bìa đi qua server action giới hạn 1MB → file lớn hơn sẽ lỗi khi Lưu. Cần sửa ở Ephata (chuyển sang tải
  thẳng lên Storage như bộ cài phần mềm). Trước khi sửa: nén/giảm dung lượng, hoặc báo Felix.
- Giá phải đặt ở danh sách Admin (bước 4), không phải trong form.
