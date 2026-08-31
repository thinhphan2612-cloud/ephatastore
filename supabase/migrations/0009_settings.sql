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
