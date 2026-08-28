-- ============================================================
-- RLS: catalog đọc công khai; đơn hàng/sở hữu bị khoá.
-- ============================================================

-- Bật RLS toàn bộ
alter table categories   enable row level security;
alter table publishers   enable row level security;
alter table products     enable row level security;
alter table orders       enable row level security;
alter table order_items  enable row level security;
alter table entitlements enable row level security;

-- Catalog: cho phép SELECT công khai (anon + authenticated)
create policy "public read categories" on categories
  for select using (true);

create policy "public read publishers" on publishers
  for select using (true);

create policy "public read products" on products
  for select using (published = true);

-- orders / order_items / entitlements: KHÔNG có policy công khai.
-- Chỉ ghi/đọc qua service_role ở API server (sau khi có SSO + PayOS).
-- Sẽ thêm policy theo auth.uid() = giaoly_user_id ở migration SSO.
