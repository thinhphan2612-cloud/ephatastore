# Loại 4 — Tính năng Giáo Lý Số

Một **chức năng bên trong app Giáo Lý Số** (app.giaoly.com.vn), bán trên Ephata và **bật cho cả giáo xứ** của người mua.
Chức năng thật nằm trong mã nguồn Giáo Lý Số; Ephata lo bán, ghi quyền **theo giáo xứ** và gửi lệnh bật/tắt sang Giáo Lý Số.
Trên admin chọn thẻ **Tính năng Giáo Lý Số** (nhập *feature key*).

## Dùng khi
- Bổ sung cho Giáo Lý Số: báo cáo nâng cao, mẫu chứng chỉ, lịch phụng vụ, điểm danh QR, xuất dữ liệu… dùng **dữ liệu sẵn có
  của giáo xứ** trong Giáo Lý Số.

Không phải loại này nếu: chức năng chạy độc lập được (→ Chạy trên store hoặc Link ngoài).

## Cách hoạt động
```
Quản trị giáo xứ (tài khoản Ephata đã liên kết Giáo Lý Số) mua / gia hạn / dùng thử / kích hoạt trên Ephata
 → Ephata ghi quyền cho GIÁO XỨ (một hạn chung cho cả giáo xứ)
 → gửi lệnh grant_feature { parish_id, feature_key, expires_at } sang edge function `provision` của Giáo Lý Số
 → Giáo Lý Số ghi bảng parish_features (cả giáo xứ dùng được tới expires_at; null = vĩnh viễn)
 → app Giáo Lý Số đọc parish_features và mở chức năng (useFeature('<feature_key>'))
Admin Ephata thu hồi quyền của giáo xứ → revoke_feature → status 'revoked'
```
- **Quyền thuộc về giáo xứ, không thuộc về người mua.** Mọi quản trị của giáo xứ thấy cùng một hạn ("Giáo xứ đang dùng đến …")
  ở trang sản phẩm và Thư viện; quản trị khác bấm **Gia hạn** là **cộng nối** vào hạn chung (không mua trùng).
  Người mua rời giáo xứ / gỡ liên kết thì giáo xứ vẫn giữ quyền; người đó không còn thấy tính năng.
- Chỉ **quản trị giáo xứ** đã liên kết tài khoản Giáo Lý Số mới mua / dùng thử được (Ephata chặn ở server).
- **Dùng thử: mỗi giáo xứ một lần** — đổi quản trị, gỡ rồi liên kết lại cũng không thử lại được.
- Lệnh gửi lỗi không mất đơn: **Admin → Đồng bộ GLS** hiện lệnh lỗi kèm nguyên nhân + nút **Thử lại** (gửi lại theo trạng thái
  hiện tại của giáo xứ, kể cả khi người mua đã gỡ liên kết).
- Full Topping (gói cá nhân) **không** mở tính năng giáo xứ.
- Trong Thư viện Ephata, tính năng hiện nút **"Mở Giáo Lý Số ↗"** (tới app Giáo Lý Số) kèm trạng thái đồng bộ
  ("✓ Đã bật cho giáo xứ" / "Đang chờ bật…"). Không có URL riêng cho từng tính năng.

## Làm phía Giáo Lý Số (người code tính năng)
Loại này **code trong repo Giáo Lý Số** (repo và database riêng, không thuộc Ephata) — thống nhất phạm vi với Felix trước.
- Mở chức năng theo `useFeature('<feature_key>')` (client/src/entitlements.jsx) — đã đọc `parish_features`, lọc hạn.
- Chặn ở **server/database** cho thao tác quan trọng (RLS hoặc kiểm `parish_features` trong API), không chỉ ẩn nút.
- Không cần sửa `provision`: lệnh grant/revoke đã có (khóa theo `parish_id + feature_key`; khi bật giữ hạn xa nhất);
  tính năng chưa có trong bảng `features` sẽ được tự thêm.

## Sản phẩm giao cho Ephata
- **Feature key** (bắt buộc): **3–50 ký tự a–z, 0–9, gạch dưới** (vd `lich_phung_vu`, `diem_danh_qr`) — phải **giống hệt** khóa code
  dùng ở `useFeature(...)` bên Giáo Lý Số. **Đã có giáo xứ mua thì không đổi được key** (admin khóa ô) — chọn kỹ từ đầu.
- Mô tả: tính năng làm gì trong Giáo Lý Số, ai dùng (quản trị giáo xứ / giáo lý viên). Nói rõ "áp dụng cho cả giáo xứ".
- Ảnh bìa 16:9 (nên là ảnh chụp màn hình tính năng trong Giáo Lý Số).
- **Logo vuông** + tối đa **4 ảnh / video minh họa** (ảnh ≤ 10MB, MP4/WebM ≤ 50MB hoặc link YouTube) — xem README, mục "Quy ước chung". Nên có ảnh chụp tính năng ngay trong app Giáo Lý Số.

## Giá & quyền
- Khung **Bán**: Miễn phí, hoặc **Thuê bao** (giá/tháng: gói năm = ×12, mua lẻ N ngày, dùng thử N ngày — dùng thử 1 lần / giáo xứ).
- Ô **"Miễn phí cho Pro Giáo Lý Số"**: tick thì quản trị giáo xứ đang có gói Pro thấy nút **"Kích hoạt miễn phí cho giáo xứ"** —
  tạo quyền **tới hết hạn gói Pro của giáo xứ** (gói không có hạn → 365 ngày), bấm lại **không cộng thêm**; hết Pro thì phải mua.
  Không tick thì giáo xứ Pro vẫn phải mua như mọi giáo xứ.

## Đưa lên admin
1. **Admin → Thêm sản phẩm → Tính năng Giáo Lý Số**: tiêu đề, slug, mô tả, danh mục, nhà phát hành, ảnh bìa, khung **Bán**,
   **Feature key** (bắt buộc, đúng định dạng). Tick **Đang bán** + **Hiện trên store**. Lưu.
2. Trang Sửa của loại này không có khung "Kết nối app ngoài" / Ví — tính năng chạy trong Giáo Lý Số, không gọi API Ví.

## Kiểm sau khi lên
- Bằng tài khoản quản trị giáo xứ đã liên kết: mua hoặc dùng thử → **Admin → Đồng bộ GLS** hiện "Đã gửi" →
  đăng nhập Giáo Lý Số của giáo xứ đó thấy chức năng; Thư viện Ephata hiện "✓ Đã bật cho giáo xứ".
- Quản trị thứ hai cùng giáo xứ: trang sản phẩm hiện "Giáo xứ đang dùng đến …" + Gia hạn (không có nút mua mới).
- Tài khoản không phải quản trị / chưa liên kết: trang sản phẩm hiện hướng dẫn, không có nút mua.
- Store đang bật Coming Soon thì chỉ admin xem được trang sản phẩm — kiểm bằng tài khoản admin hoặc chờ mở store.
