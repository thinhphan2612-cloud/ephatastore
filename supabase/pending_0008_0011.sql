-- Ephata Store — gộp migration 0008..0011 (chạy 1 lần trong Supabase STORE)
-- Nếu đã chạy file nào rồi thì vẫn an toàn (đều dùng if not exists / add column if not exists).

-- ===== 0008_pricing_model.sql =====
-- ============================================================
-- 0008 — Mô hình giá v3: entitlements có hạn + Trial + gói năm.
-- CHẠY TRONG SUPABASE STORE.
-- ============================================================

-- Quyền sở hữu có thời hạn. expires_at NULL = vĩnh viễn (free / grant tay).
alter table entitlements add column if not exists expires_at timestamptz;
-- Nguồn cấp: free | trial | purchase | freedom | topping | grant
alter table entitlements add column if not exists source text not null default 'purchase';

-- Đơn: số ngày cấp quyền khi duyệt (NULL = vĩnh viễn) + loại đơn.
alter table orders add column if not exists access_days int;
alter table orders add column if not exists kind text not null default 'purchase';

-- ===== 0009_settings.sql =====
-- ============================================================
-- 0009 — Cấu hình store (chính sách giá). CHẠY TRONG SUPABASE STORE.
-- ============================================================

create table if not exists store_settings (
  key   text primary key,
  value text not null
);
alter table store_settings enable row level security;
-- Chỉ đọc/ghi qua service_role ở server.

insert into store_settings(key, value) values
  ('full_topping_price', '200000'),  -- giá Full Topping / tháng (VND)
  ('freedom_days', '30')             -- số ngày cho mua lẻ Freedom
on conflict (key) do nothing;

-- ===== 0010_full_topping.sql =====
-- ============================================================
-- 0010 — Full Topping (thuê bao all-access cấp user). CHẠY TRONG SUPABASE STORE.
-- ============================================================

create table if not exists subscriptions (
  id            uuid primary key default uuid_generate_v4(),
  store_user_id uuid not null,
  kind          text not null default 'topping',
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now()
);
alter table subscriptions enable row level security;
-- Chỉ truy cập qua service_role ở server.
create index if not exists subscriptions_user_idx on subscriptions(store_user_id);

-- ===== 0011_app_url.sql =====
-- ============================================================
-- 0011 — URL mở tiện ích web-app (tool/feature). CHẠY TRONG SUPABASE STORE.
-- ============================================================

-- Nơi mở tiện ích khi đã sở hữu (mở tab mới). Dùng cho type tool/feature.
alter table products add column if not exists app_url text;

