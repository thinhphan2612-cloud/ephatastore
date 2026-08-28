# Kiến trúc Ephata Store

Ghi lại các quyết định nền tảng để không phải bàn lại.

## Stack
- **Next.js 16 (App Router) + TypeScript + Tailwind 4**, deploy trên **Vercel**.
- Dữ liệu MVP hiện là mock (`src/data/*`), chữ ký hàm truy vấn giữ nguyên để thay bằng Supabase sau.

## Quyết định lớn: "Chung Auth, tách Data"
Lý do: app `giaoly` chứa **dữ liệu giáo dân** nhạy cảm; store là marketplace **công khai**, bề mặt tấn công lớn. Không gộp chung một DB.

| Lớp | Nguồn | Quyền của store |
|-----|-------|-----------------|
| Auth / Identity / Plan (gói Pro) | **Supabase giaoly** (đã có) | Đăng nhập SSO, **chỉ đọc** plan |
| Sản phẩm, đơn hàng, sở hữu | **Supabase store** (riêng) | Toàn quyền |

Đánh đổi đã chấp nhận: store cần verify JWT do Supabase giaoly cấp → chia sẻ `GIAOLY_SUPABASE_JWT_SECRET` cho phía server store (hoặc verify qua một endpoint của giaoly). Sẽ chốt cách cụ thể khi làm SSO.

## SSO cross-domain (điểm dễ sai nhất)
`ephatastore.com` và `app.giaoly.com.vn` là **hai domain khác nhau** → **không** dùng chung cookie như hai subdomain. Không thể bê cookie `gl_signed_in` sang.

Hướng làm (sẽ chi tiết hoá ở giai đoạn SSO):
1. Store bấm "Đăng nhập" → redirect sang trang auth của giaoly kèm `redirect_uri` về store.
2. Giaoly xác thực (Supabase Auth) → trả token/opaque code về `ephatastore.com/auth/callback`.
3. Store đặt session của riêng mình (cookie trên `.ephatastore.com`), lưu `giaoly_user_id`.
4. Đọc plan Pro từ Supabase giaoly bằng token đó (chỉ đọc).

## Đồng bộ gói Pro
Vì plan là **một nguồn** ở Supabase giaoly, store đọc trực tiếp — không có job đồng bộ, không lệch. Gating sản phẩm theo `products.min_plan`.

## Thanh toán
- Nội địa: **PayOS** (VietQR + webhook tự xác nhận) là hướng chính. Chuyển khoản tay chỉ là phương án phụ (đối soát thủ công).
- Luồng: tạo `orders` (pending) → PayOS payment link → webhook `paid` → cấp `entitlements`.

## Trạng thái hiện tại
- [x] Khung marketplace kiểu Steam: trang chủ, danh mục, khám phá (lọc/tìm), chi tiết sản phẩm.
- [x] Schema thương mại (`supabase/migrations/0001_commerce_schema.sql`) — chưa chạy.
- [ ] Provision Supabase store + wire dữ liệu thật.
- [ ] SSO cross-domain.
- [ ] Checkout + PayOS.
- [ ] Trang thư viện (entitlements) + đăng nhập thật.
