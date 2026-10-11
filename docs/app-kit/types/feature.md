# Loại 4 — Tính năng Giáo Lý Số

Một **chức năng mới bên trong app Giáo Lý Số** (app.giaoly.com.vn). Ephata bán và ghi nhận quyền; chức năng thật nằm
trong mã nguồn Giáo Lý Số. Trên admin chọn thẻ **Tính năng Giáo Lý Số** (nhập *feature key*).

## Dùng khi
- Bổ sung cho Giáo Lý Số: báo cáo nâng cao, mẫu chứng chỉ, lịch phụng vụ, điểm danh QR, xuất dữ liệu… dùng **dữ liệu sẵn có
  của giáo xứ** trong Giáo Lý Số.

Không phải loại này nếu: chức năng chạy độc lập được (→ Chạy trên store hoặc Link ngoài).

## Liên hệ Felix trước khi làm
Loại này **phải code trong dự án Giáo Lý Số** (repo và database riêng, không thuộc Ephata). Thống nhất với Felix:
phạm vi, *feature key*, và ai triển khai phía Giáo Lý Số.

## Trạng thái hiện tại (2026-10-11) — đọc kỹ
- Ephata **chưa tự bật** tính năng bên Giáo Lý Số khi có người mua (chưa có kết nối Ephata → Giáo Lý Số).
  Mua trên Ephata hiện chỉ ghi quyền sở hữu trong Ephata; trên Thư viện hiện "Sắp có" nếu sản phẩm không có URL app.
- Thiết kế đã chốt (chưa xây): mua **theo giáo xứ** (1 lần cả giáo xứ dùng), chỉ **quản trị giáo xứ** được mua; khi mua,
  Ephata gửi webhook có khóa bí mật sang Giáo Lý Số `{ parish_id, feature_key, action: grant|revoke }`;
  Giáo Lý Số lưu bảng `parish_features` và hiện chức năng cho cả giáo xứ.
- Cho tới khi kết nối xong: bật tính năng cho giáo xứ bằng tay phía Giáo Lý Số, hoặc tạm chưa bán loại này.

## Sản phẩm giao cho Ephata
- **Feature key**: chữ thường, gạch dưới, ổn định mãi (vd `lich_phung_vu`, `diem_danh_qr`) — Giáo Lý Số dựa vào khóa này.
- Mô tả: tính năng làm gì trong Giáo Lý Số, ai dùng (quản trị giáo xứ / giáo lý viên), cần gói gì.
- Ảnh bìa 16:9 (nên là ảnh chụp màn hình tính năng trong Giáo Lý Số).
- (Tùy chọn) **URL** mở thẳng tới tính năng trong Giáo Lý Số → nút "Dùng ngay ↗" thay cho "Sắp có".

## Yêu cầu phía Giáo Lý Số (người code tính năng)
- Chặn tính năng theo `feature_key` + `parish_id` ở **server/database** (RLS hoặc kiểm trong API), không chỉ ẩn nút.
- Có cách bật/tắt theo giáo xứ (bảng `parish_features(parish_id, feature_key, granted_at, source)`, duy nhất theo cặp).
- Khi kết nối Ephata được xây: endpoint nhận grant/revoke, xác thực bằng khóa bí mật chung.

## Giá & quyền
- Giống Link ngoài: miễn phí, hoặc Tier PRO thuê bao (gói năm = Giá/tháng × 12, mua lẻ N ngày, dùng thử, Full Topping).
- Người có Pro Giáo Lý Số dùng miễn phí.

## Đưa lên admin
1. **Admin → Thêm sản phẩm → Tính năng Giáo Lý Số**: tiêu đề, slug, mô tả, danh mục, nhà phát hành, ảnh bìa,
   **Feature key**. Lưu.
2. Có phí: chỉnh **Tier = PRO**, **Giá/tháng**, Trial ở danh sách **Admin → Sản phẩm** (ô Giá trong form không quyết định giá bán).
3. Muốn nút "Dùng ngay ↗": mở **Sửa** sản phẩm, điền **URL app ngoài** = link tới tính năng trong Giáo Lý Số.
