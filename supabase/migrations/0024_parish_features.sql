-- 0024 — Đợt C:
--   1) Tính năng Giáo Lý Số tính quyền THEO GIÁO XỨ (parish_entitlements) — mọi quản trị của giáo xứ dùng chung một hạn,
--      không bán trùng, dùng thử 1 lần / giáo xứ, đồng bộ GLS theo parish_id lưu sẵn (gửi được lệnh tắt cả khi người mua đã gỡ liên kết).
--   2) purchase_product: + p_parish (mua / gia hạn tính năng cho giáo xứ).
--   3) Kích hoạt thiết bị cho key phần mềm trong 1 transaction có khóa (không vượt device_limit khi kích hoạt song song).
--   4) products: anon / authenticated chỉ đọc các cột công khai (ẩn app_secret_hash, download_path, game_url_prev).
-- CHẠY TRÊN PROJECT SUPABASE "EPHATA STORE" (ref keaelbirdtpyfxyifdlf). An toàn chạy lại.

do $$
begin
  if to_regclass('public.products') is null then
    raise exception 'Không thấy bảng public.products — có thể đang mở nhầm project. Hãy chạy trên project Ephata Store (keaelbirdtpyfxyifdlf).';
  end if;
end $$;

-- ---------- 1) Quyền tính năng theo giáo xứ ----------
create table if not exists public.parish_entitlements (
  id            uuid primary key default gen_random_uuid(),
  parish_id     uuid not null,
  product_id    uuid not null references public.products(id) on delete restrict,
  source        text not null,               -- purchase | trial | free | giaoly_pro | admin
  expires_at    timestamptz,                 -- null = vĩnh viễn; thu hồi = đặt về now() (giữ dòng → còn lịch sử dùng thử)
  purchased_by  uuid,                        -- tài khoản store mua / kích hoạt gần nhất
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (parish_id, product_id)
);
create index if not exists parish_entitlements_product_idx on public.parish_entitlements(product_id);
alter table public.parish_entitlements enable row level security;  -- chỉ server đọc / ghi

alter table public.provision_jobs add column if not exists parish_id uuid;  -- thử lại theo giáo xứ, không cần người mua còn liên kết

-- ---------- 2) purchase_product + p_parish ----------
drop function if exists public.purchase_product(uuid, uuid, text, integer, integer, text, text, text, timestamptz);

create or replace function public.purchase_product(
  p_user    uuid,
  p_product uuid,
  p_kind    text,
  p_points  integer,
  p_days    integer,
  p_source  text,
  p_key     text,
  p_coupon  text default null,
  p_until   timestamptz default null,
  p_parish  uuid default null           -- có giá trị = tính năng Giáo Lý Số, quyền ghi cho GIÁO XỨ
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing purchases%rowtype;
  v_balance  integer;
  v_cur      timestamptz;
  v_has_row  boolean := false;
  v_expires  timestamptz;
  v_id       uuid;
  v_discount integer := 0;
  v_charge   integer;
begin
  if p_points is null or p_points < 0 then raise exception 'INVALID_POINTS'; end if;
  if p_kind = 'topping' and p_days is null then raise exception 'INVALID_DAYS'; end if;
  if p_kind <> 'topping' and p_product is null then raise exception 'PRODUCT_REQUIRED'; end if;

  insert into point_wallets(user_id, balance) values (p_user, 0) on conflict (user_id) do nothing;
  perform 1 from point_wallets where user_id = p_user for update;

  select * into v_existing from purchases where store_user_id = p_user and idempotency_key = p_key;
  if found then
    select balance into v_balance from point_wallets where user_id = p_user;
    return jsonb_build_object('purchase_id', v_existing.id, 'balance', v_balance,
                              'expires_at', v_existing.expires_at, 'duplicate', true);
  end if;

  if p_parish is not null then
    -- Khóa quyền của giáo xứ: 2 quản trị mua cùng lúc → chạy tuần tự, cộng nối đúng.
    insert into parish_entitlements(parish_id, product_id, source, expires_at, purchased_by)
      values (p_parish, p_product, p_source, now(), p_user)
      on conflict (parish_id, product_id) do nothing;
    select true, expires_at into v_has_row, v_cur from parish_entitlements
     where parish_id = p_parish and product_id = p_product for update;
  elsif p_kind <> 'topping' then
    select true, expires_at into v_has_row, v_cur from entitlements
     where store_user_id = p_user and product_id = p_product for update;
    if p_days is null and coalesce(v_has_row, false) and v_cur is null then raise exception 'ALREADY_OWNED'; end if;
  end if;

  if p_coupon is not null and trim(p_coupon) <> '' and p_points > 0 then
    v_discount := redeem_coupon(p_user, p_coupon, p_points, coalesce(p_product::text, 'topping'));
  end if;
  v_charge := p_points - v_discount;

  if v_charge > 0 then
    v_balance := adjust_points(p_user, -v_charge, 'spend', coalesce(p_product::text, 'topping'),
                               case when p_kind = 'topping' then 'Mua Full Topping'
                                    when p_parish is not null then 'Mua tính năng cho giáo xứ'
                                    else 'Mua sản phẩm' end);
  else
    select balance into v_balance from point_wallets where user_id = p_user;
  end if;

  if p_kind = 'topping' then
    select max(expires_at) into v_cur from subscriptions
     where store_user_id = p_user and kind = 'topping' and expires_at > now();
    v_expires := greatest(coalesce(v_cur, now()), now()) + make_interval(days => p_days);
    insert into subscriptions(store_user_id, kind, expires_at) values (p_user, 'topping', v_expires);
  else
    if coalesce(v_has_row, false) and v_cur is null then
      v_expires := null;
    elsif p_until is not null then
      v_expires := greatest(coalesce(v_cur, now()), p_until);
    elsif p_days is null then
      v_expires := null;
    else
      v_expires := greatest(coalesce(v_cur, now()), now()) + make_interval(days => p_days);
    end if;
    if p_parish is not null then
      update parish_entitlements
         set source = p_source, expires_at = v_expires, purchased_by = p_user, updated_at = now()
       where parish_id = p_parish and product_id = p_product;
    else
      insert into entitlements(store_user_id, product_id, source, expires_at)
        values (p_user, p_product, p_source, v_expires)
        on conflict (store_user_id, product_id)
        do update set source = excluded.source, expires_at = excluded.expires_at;
    end if;
  end if;

  insert into purchases(store_user_id, product_id, kind, points, days, source, expires_at, idempotency_key,
                        coupon_code, discount_points)
    values (p_user, p_product, p_kind, v_charge, p_days, p_source, v_expires, p_key,
            case when p_points > 0 then nullif(upper(trim(p_coupon)), '') end, v_discount)
    returning id into v_id;

  return jsonb_build_object('purchase_id', v_id, 'balance', v_balance, 'expires_at', v_expires,
                            'charged', v_charge, 'discount', v_discount, 'duplicate', false);
end;
$$;

revoke execute on function public.purchase_product(uuid, uuid, text, integer, integer, text, text, text, timestamptz, uuid) from public, anon, authenticated;
grant  execute on function public.purchase_product(uuid, uuid, text, integer, integer, text, text, text, timestamptz, uuid) to service_role;

-- ---------- 3) Kích hoạt thiết bị có khóa ----------
-- Trả 'OK' hoặc 'DEVICE_LIMIT'. Thiết bị đã đăng ký → chỉ cập nhật last_seen (không tính thêm).
create or replace function public.activate_license_device(
  p_license  uuid,
  p_device   text,
  p_platform text default null,
  p_version  text default null
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_count integer;
begin
  select device_limit into v_limit from licenses where id = p_license for update;  -- khóa key: kích hoạt tuần tự
  if not found then raise exception 'LICENSE_NOT_FOUND'; end if;

  if not exists (select 1 from license_devices where license_id = p_license and device_id = p_device) then
    select count(*) into v_count from license_devices where license_id = p_license;
    if v_count >= v_limit then return 'DEVICE_LIMIT'; end if;
  end if;

  insert into license_devices(license_id, device_id, platform, app_version, last_seen)
    values (p_license, p_device, p_platform, p_version, now())
    on conflict (license_id, device_id)
    do update set platform = coalesce(excluded.platform, license_devices.platform),
                  app_version = coalesce(excluded.app_version, license_devices.app_version),
                  last_seen = now();
  return 'OK';
end;
$$;
revoke execute on function public.activate_license_device(uuid, text, text, text) from public, anon, authenticated;
grant  execute on function public.activate_license_device(uuid, text, text, text) to service_role;

-- ---------- 4) products: chỉ cho đọc cột công khai ----------
-- Catalog đọc bằng anon key (src/data/products.ts). THÊM CỘT MỚI mà catalog cần đọc → phải grant thêm cột đó cho anon, authenticated.
revoke select on public.products from anon, authenticated;
grant select (
  id, slug, title, tagline, description, description_html, type, category_id, publisher_id, price_vnd, original_price_vnd,
  cover_url, gallery, tags, min_plan, rating, rating_count, released_at, featured, is_new, is_popular, published,
  created_at, updated_at, game_url, giaoly_feature_key, tier, price_month, trial, trial_days, active, icon, app_url,
  license_device_limit, license_offline_days, ms_store_url, giaoly_pro_free, uses_wallet
) on public.products to anon, authenticated;
