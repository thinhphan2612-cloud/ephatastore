# Loại 4 — Tính năng Giáo Lý Số

Một **chức năng bên trong app Giáo Lý Số** (app.giaoly.com.vn), bán trên Ephata và **bật cho cả giáo xứ** của người mua.
Chức năng thật nằm trong mã nguồn Giáo Lý Số; Ephata lo bán, ghi quyền và gửi lệnh bật/tắt sang Giáo Lý Số.
Trên admin chọn thẻ **Tính năng Giáo Lý Số** (nhập *feature key*).

## Dùng khi
- Bổ sung cho Giáo Lý Số: báo cáo nâng cao, mẫu chứng chỉ, lịch phụng vụ, điểm danh QR, xuất dữ liệu… dùng **dữ liệu sẵn có
  của giáo xứ** trong Giáo Lý Số.

Không phải loại này nếu: chức năng chạy độc lập được (→ Chạy trên store hoặc Link ngoài).

## Cách hoạt động
```
Quản trị giáo xứ (tài khoản Ephata đã liên kết Giáo Lý Số) mua / dùng thử / kích hoạt trên Ephata
 → Ephata gửi lệnh grant_feature { parish_id, feature_key, expires_at } sang edge function `provision` của Giáo Lý Số
 → Giáo Lý Số ghi bảng parish_features (cả giáo xứ dùng được tới expires_at; null = vĩnh viễn)
 → app Giáo Lý Số đọc parish_features và mở chức năng (hasFeature / useFeature('<feature_key>'))
Admin Ephata thu hồi quyền → revoke_feature → status 'revoked'
```
- Chỉ **quản trị giáo xứ** đã liên kết tài khoản Giáo Lý Số mới mua được (Ephata chặn ở server).
- Nhiều quản trị cùng giáo xứ mua → giữ hạn xa nhất.
- Lệnh gửi lỗi không mất đơn: **Admin → Đồng bộ GLS** hiện lệnh lỗi kèm nguyên nhân + nút **Thử lại**.
- Full Topping (gói cá nhân) **không** mở tính năng giáo xứ.

## Làm phía Giáo Lý Số (người code tính năng)
Loại này **code trong repo Giáo Lý Số** (repo và database riêng, không thuộc Ephata) — thống nhất phạm vi với Felix trước.
- Mở chức năng theo `useFeature('<feature_key>')` (client/src/entitlements.jsx) — đã đọc `parish_features`, lọc hạn.
- Chặn ở **server/database** cho thao tác quan trọng (RLS hoặc kiểm `parish_features` trong API), không chỉ ẩn nút.
- Không cần sửa `provision`: lệnh grant/revoke đã có; tính năng chưa có trong bảng `features` sẽ được tự thêm.

## Sản phẩm giao cho Ephata
- **Feature key**: chữ thường, gạch dưới, ổn định mãi (vd `lich_phung_vu`, `diem_danh_qr`) — phải **giống hệt** khóa code dùng ở
  `useFeature(...)` bên Giáo Lý Số.
- Mô tả: tính năng làm gì trong Giáo Lý Số, ai dùng (quản trị giáo xứ / giáo lý viên).
- Ảnh bìa 16:9 (nên là ảnh chụp màn hình tính năng trong Giáo Lý Số).
- (Tùy chọn) **URL** mở thẳng tới tính năng trong Giáo Lý Số → nút "Dùng ngay ↗" ở Thư viện (thay cho "Sắp có").

## Giá & quyền
- Khung **Bán**: Miễn phí, hoặc **Thuê bao** (giá/tháng: gói năm = ×12, mua lẻ N ngày, dùng thử N ngày).
- Ô **"Miễn phí cho Pro Giáo Lý Số"**: tick thì quản trị giáo xứ Pro thấy nút **"Kích hoạt miễn phí cho giáo xứ"** (tạo quyền
  1 năm và gửi lệnh bật); không tick thì giáo xứ Pro vẫn phải mua.

## Đưa lên admin
1. **Admin → Thêm sản phẩm → Tính năng Giáo Lý Số**: tiêu đề, slug, mô tả, danh mục, nhà phát hành, ảnh bìa, khung **Bán**,
   **Feature key**. Lưu.
2. Muốn nút "Dùng ngay ↗": mở **Sửa** sản phẩm, điền **URL app ngoài** = link tới tính năng trong Giáo Lý Số.

## Kiểm sau khi lên
- Bằng tài khoản quản trị giáo xứ đã liên kết: mua hoặc dùng thử → **Admin → Đồng bộ GLS** hiện "Đã gửi" →
  đăng nhập Giáo Lý Số của giáo xứ đó thấy chức năng.
- Tài khoản không phải quản trị / chưa liên kết: trang sản phẩm hiện hướng dẫn, không có nút mua.
