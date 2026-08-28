# Ephata Store

Nền tảng marketplace Công giáo — sản phẩm của Felix (126verse).

Store bán: công cụ Công giáo, game giáo lý, asset thiết kế, hình ảnh, và các tính năng tích hợp vào `app.giaoly.com.vn`.

## Tech stack
- **Next.js 16** (App Router) + **TypeScript** + **Tailwind 4**
- Deploy: **Vercel**
- Data: mock (`src/data/*`) ở MVP → **Supabase** (xem [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md))

## Chạy dev
```bash
pnpm install
pnpm dev
```
Mở http://localhost:3000

## Cấu trúc
```
src/
  app/            # routes: /, /browse, /category/[slug], /product/[slug], /library, /login
  components/     # SiteHeader, ProductCard, ProductRow, FeaturedHero...
  data/           # dữ liệu mẫu (categories, products) — sẽ thay bằng Supabase
  lib/            # types, format, labels, placeholder
supabase/migrations/  # schema thương mại (DB store)
docs/ARCHITECTURE.md  # các quyết định nền tảng
```

## Hệ domain
- `giaoly.com.vn` — landing
- `app.giaoly.com.vn` — app React
- `ephatastore.com` — store (repo này)

## Tích hợp bắt buộc
- **SSO** chung đăng nhập với `app.giaoly.com.vn` (cross-domain)
- **Đồng bộ gói Pro** — store đọc plan trực tiếp từ Supabase giaoly

## Trạng thái
🚧 Khung marketplace đã dựng (mock data). Chưa nối Supabase / SSO / thanh toán.
