-- 0013b — Phần mềm bán key: cấu hình license, phiên bản bộ cài, key + thiết bị, RPC mua.
-- Spec: docs/software-licensing.md. Chạy SAU 0013a. An toàn chạy lại.

alter table products add column if not exists license_device_limit int not null default 2;
alter table products add column if not exists license_offline_days int not null default 30;
alter table products add column if not exists ms_store_url text;   -- null = chưa lên Microsoft Store

create table if not exists software_releases (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products(id) on delete cascade,
  platform     text not null check (platform in ('windows','macos')),
  version      text not null,                 -- semver "1.2.8"
  storage_path text not null,                 -- bucket PRIVATE 'product-files'
  file_name    text not null,
  size_bytes   bigint,
  notes        text not null default '',
  created_at   timestamptz not null default now(),
  unique (product_id, platform, version)
);

create table if not exists licenses (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products(id) on delete restrict,
  key           text not null unique,         -- "<PREFIX>-XXXX-XXXX-XXXX"
  store_user_id uuid,                         -- null = key tặng/cấp tay
  status        text not null default 'active' check (status in ('active','revoked')),
  device_limit  int not null,
  note          text,
  created_at    timestamptz not null default now(),
  unique (product_id, store_user_id)          -- 1 key / user / sản phẩm → mua idempotent
);
create index if not exists licenses_user_idx on licenses(store_user_id);

create table if not exists license_devices (
  id          uuid primary key default gen_random_uuid(),
  license_id  uuid not null references licenses(id) on delete cascade,
  device_id   text not null,
  platform    text,
  app_version text,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  unique (license_id, device_id)
);

-- Chỉ service_role (server) đọc/ghi. Bật RLS, không policy = deny cho anon/authenticated.
alter table software_releases enable row level security;
alter table licenses          enable row level security;
alter table license_devices   enable row level security;

-- Mua key bằng point: trừ point + tạo key + cấp quyền trong MỘT transaction.
-- Khóa hàng ví trước → 2 request song song của cùng user chạy tuần tự → không trừ point 2 lần.
-- Đã có key → trả key cũ, không trừ point. Key do server sinh (p_key); trùng key → lỗi unique,
-- toàn bộ rollback (kể cả point) và server thử lại với key mới.
create or replace function purchase_software(
  p_user    uuid,
  p_product uuid,
  p_key     text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key    text;
  v_price  integer;
  v_limit  integer;
  v_points integer;
begin
  insert into point_wallets(user_id, balance) values (p_user, 0)
    on conflict (user_id) do nothing;
  perform 1 from point_wallets where user_id = p_user for update;

  select key into v_key from licenses
   where product_id = p_product and store_user_id = p_user;
  if v_key is not null then
    return v_key;
  end if;

  select price_month, license_device_limit into v_price, v_limit
    from products
   where id = p_product and type = 'software' and published;
  if not found then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;

  v_points := floor(coalesce(v_price, 0) / 100.0);   -- 100đ = 1 point (src/lib/points.ts)
  if v_points > 0 then
    perform adjust_points(p_user, -v_points, 'spend', p_product::text, 'Mua key phần mềm');
  end if;

  insert into licenses(product_id, key, store_user_id, device_limit)
    values (p_product, p_key, p_user, v_limit);

  insert into entitlements(store_user_id, product_id, source, expires_at)
    values (p_user, p_product, 'purchase', null)
    on conflict (store_user_id, product_id)
    do update set source = 'purchase', expires_at = null;

  return p_key;
end;
$$;

-- Hàm SECURITY DEFINER chỉ cho service_role gọi. Mặc định Supabase cho anon/authenticated gọi mọi
-- function trong schema public qua /rest/v1/rpc → ai có anon key (public) cũng gọi được.
revoke execute on function purchase_software(uuid, uuid, text) from public, anon, authenticated;
grant  execute on function purchase_software(uuid, uuid, text) to service_role;

-- VÁ 0012: adjust_points thiếu revoke → anon có thể tự cộng point. Server gọi bằng service_role nên không ảnh hưởng.
revoke execute on function adjust_points(uuid, integer, text, text, text) from public, anon, authenticated;
grant  execute on function adjust_points(uuid, integer, text, text, text) to service_role;
