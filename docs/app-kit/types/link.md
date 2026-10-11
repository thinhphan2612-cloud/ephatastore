# Loại 3 — Link ngoài

Web app **đã host ở nơi khác** (có server, database, tài khoản riêng). Ephata bán quyền dùng và mở link app trong tab mới
khi người mua đã sở hữu. Trên admin chọn thẻ **Link ngoài**, loại **Công cụ** (hoặc Tính năng).

## Dùng khi
- App cần **server / database / đăng nhập riêng**: quản lý giáo xứ, sổ sách, đăng ký sự kiện, dữ liệu dùng chung nhiều người.
- App đã chạy sẵn trên domain riêng (Vercel, VPS…).

Không phải loại này nếu: app chạy được hoàn toàn trong trình duyệt (→ Chạy trên store — Ephata lo hosting, AI, thu tiền).

## Điều phải hiểu trước (quan trọng)
Ephata **chỉ mở URL**. Ephata **không gửi** danh tính người mua hay bằng chứng đã mua sang app của bạn
(chưa có cơ chế đăng nhập một lần / xác thực mua). Hệ quả:
- Ai có URL đều vào được app → **app phải tự có đăng nhập và tự kiểm soát quyền** nếu muốn thu tiền thật.
- Nếu app miễn phí hoặc chỉ cần "cửa vào" đẹp trên Ephata thì không sao.
- Cần khóa quyền theo người mua trên Ephata → báo Felix (cần xây cơ chế xác thực giữa Ephata và app).

## Sản phẩm giao cho Ephata
- **URL HTTPS** của app (trang bắt đầu dùng, vd `https://app.ten-mien.com/`).
- Ảnh bìa 16:9, mô tả: app làm gì, cần tạo tài khoản ở app không, có thu dữ liệu cá nhân không.

## Yêu cầu kỹ thuật
| Mục | Yêu cầu |
|---|---|
| Giao thức | HTTPS, chạy ổn định (đây là link người mua trả tiền để mở). |
| Đăng nhập | App tự quản lý tài khoản; hướng dẫn rõ ở trang đầu cho người đến từ Ephata. |
| Dữ liệu cá nhân | Có chính sách quyền riêng tư nếu lưu dữ liệu người dùng (danh sách giáo dân là dữ liệu nhạy cảm). |
| Thiết bị | Dùng được trên điện thoại. |

## Giá & quyền
- **Miễn phí**: ai đăng nhập Ephata cũng "nhận" được và thấy nút Dùng ngay.
- **Có phí (Tier PRO)** — thuê bao: **gói năm** (= Giá/tháng × 12), **mua lẻ N ngày** (N đặt ở Admin → Cài đặt, mặc định 30),
  **dùng thử N ngày** (bật Trial), hoặc nằm trong **Full Topping**. Người có Pro Giáo Lý Số dùng miễn phí.
- Hết hạn thuê bao: nút Dùng ngay trên Ephata biến mất (nhưng app của bạn không biết — xem "Điều phải hiểu trước").

## Đưa lên admin
1. **Admin → Thêm sản phẩm → Link ngoài**: tiêu đề, slug, loại Công cụ, mô tả, danh mục, nhà phát hành, ảnh bìa,
   **URL app ngoài**. Lưu.
2. **Bắt buộc nếu có phí**: ở danh sách **Admin → Sản phẩm**, chỉnh **Tier = PRO**, **Giá/tháng**, Trial + số ngày → Lưu.
   Ô "Giá (VND)" trong form tạo **không** quyết định giá bán.

## Kiểm sau khi lên
- Trang sản phẩm: các nút Mua gói năm / Mua lẻ / Dùng thử đúng giá.
- Bằng tài khoản admin: mua hoặc dùng thử → Thư viện → **Dùng ngay ↗** mở đúng app ở tab mới.
