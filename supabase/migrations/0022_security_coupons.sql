-- 0022 — Vá bảo mật đợt A + mã giảm giá khi mua.
--   1) profiles: bỏ quyền user tự UPDATE (trước đây tự đặt được plan='pro', role='admin', giaoly_user_id… qua anon key).
--      Mọi ghi profiles đều đi qua server bằng service role → không ảnh hưởng chức năng.
--   2) Mã giảm giá: coupon_redemptions (mỗi tài khoản dùng 1 mã 1 lần), áp trong transaction mua.
--   3) purchase_product: + p_coupon, + p_until (Pro miễn phí: hạn KHÔNG cộng dồn, không vượt hạn gói),
--      sản phẩm vĩnh viễn đã sở hữu → ALREADY_OWNED (không trừ point, kể cả 2 tab bấm cùng lúc).
--   4) purchase_software: + p_coupon.
-- CHẠY TRÊN PROJECT SUPABASE "EPHATA STORE" (ref keaelbirdtpyfxyifdlf). An toàn chạy lại.

do $$
begin
  if to_regclass('public.products') is null then
    raise exception 'Không thấy bảng public.products — có thể đang mở nhầm project. Hãy chạy trên project Ephata Store (keaelbirdtpyfxyifdlf).';
  end if;
end $$;

-- ---------- 1) profiles: chỉ server ghi ----------
drop policy if exists "own profile update" on public.profiles;
revoke insert, update, delete on public.profiles from anon, authenticated;

-- ---------- 2) Mã giảm giá ----------
-- discount_codes (0006): kind percent (1–100) | amount (VND → point, 100đ = 1 point); active, expires_at, max_uses, used_count.
create table if not exists public.coupon_redemptions (
  id              uuid primary key default gen_random_uuid(),
  coupon_id       uuid not null references public.discount_codes(id) on delete cascade,
  store_user_id   uuid not null,
  base_points     integer not null,
  discount_points integer not null check (discount_points >= 0),
  ref             text,                       -- sản phẩm / 'topping'
  created_at      timestamptz not null default now(),
  unique (coupon_id, store_user_id)           -- mỗi tài khoản dùng một mã tối đa 1 lần
);
create index if not exists coupon_redemptions_coupon_idx on public.coupon_redemptions(coupon_id, created_at desc);
alter table public.coupon_redemptions enable row level security;  -- chỉ server đọc/ghi

alter table public.purchases add column if not exists coupon_code     text;
alter table public.purchases add column if not exists discount_points integer not null default 0;

-- Áp mã: khóa dòng mã (không vượt max_uses khi nhiều người dùng cùng lúc), kiểm hạn / đã dùng, ghi lượt dùng.
-- Trả số point được giảm (≤ p_points). Lỗi: COUPON_INVALID | COUPON_EXPIRED | COUPON_USED_UP | COUPON_ALREADY_USED.
create or replace function public.redeem_coupon(p_user uuid, p_code text, p_points integer, p_ref text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  c discount_codes%rowtype;
  v_discount integer;
begin
  select * into c from discount_codes where code = upper(trim(p_code)) for update;
  if not found or not c.active then raise exception 'COUPON_INVALID'; end if;
  if c.expires_at is not null and c.expires_at <= now() then raise exception 'COUPON_EXPIRED'; end if;
  if c.max_uses is not null and c.used_count >= c.max_uses then raise exception 'COUPON_USED_UP'; end if;
  if exists (select 1 from coupon_redemptions where coupon_id = c.id and store_user_id = p_user) then
    raise exception 'COUPON_ALREADY_USED';
  end if;

  if c.kind = 'percent' then
    v_discount := floor(p_points * least(c.value, 100) / 100.0);
  else
    v_discount := floor(c.value / 100.0);    -- VND → point
  end if;
  v_discount := greatest(0, least(v_discount, p_points));

  insert into coupon_redemptions(coupon_id, store_user_id, base_points, discount_points, ref)
    values (c.id, p_user, p_points, v_discount, p_ref);
  update discount_codes set used_count = used_count + 1 where id = c.id;
  return v_discount;
end;
$$;
revoke execute on function public.redeem_coupon(uuid, text, integer, text) from public, anon, authenticated;
grant  execute on function public.redeem_coupon(uuid, text, integer, text) to service_role;

-- ---------- 3) purchase_product ----------
drop function if exists public.purchase_product(uuid, uuid, text, integer, integer, text, text);

-- p_until (chỉ dùng cho Pro miễn phí): hạn = max(hạn hiện tại, p_until) — bấm nhiều lần không cộng thêm.
create or replace function public.purchase_product(
  p_user    uuid,
  p_product uuid,
  p_kind    text,
  p_points  integer,
  p_days    integer,
  p_source  text,
  p_key     text,
  p_coupon  text default null,
  p_until   timestamptz default null
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

  -- Khóa ví: mọi lần mua của cùng user chạy tuần tự.
  insert into point_wallets(user_id, balance) values (p_user, 0) on conflict (user_id) do nothing;
  perform 1 from point_wallets where user_id = p_user for update;

  -- Chống trùng: cùng khóa → trả kết quả cũ, không trừ lần 2.
  select * into v_existing from purchases where store_user_id = p_user and idempotency_key = p_key;
  if found then
    select balance into v_balance from point_wallets where user_id = p_user;
    return jsonb_build_object('purchase_id', v_existing.id, 'balance', v_balance,
                              'expires_at', v_existing.expires_at, 'duplicate', true);
  end if;

  if p_kind <> 'topping' then
    select true, expires_at into v_has_row, v_cur from entitlements
     where store_user_id = p_user and product_id = p_product for update;
    -- Đã có quyền vĩnh viễn → mua vĩnh viễn lần nữa vô nghĩa (2 tab cùng bấm, form cũ…).
    if p_days is null and coalesce(v_has_row, false) and v_cur is null then raise exception 'ALREADY_OWNED'; end if;
  end if;

  if p_coupon is not null and trim(p_coupon) <> '' and p_points > 0 then
    v_discount := redeem_coupon(p_user, p_coupon, p_points, coalesce(p_product::text, 'topping'));
  end if;
  v_charge := p_points - v_discount;

  if v_charge > 0 then
    v_balance := adjust_points(p_user, -v_charge, 'spend', coalesce(p_product::text, 'topping'),
                               case when p_kind = 'topping' then 'Mua Full Topping' else 'Mua sản phẩm' end);
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
      v_expires := null;                                   -- đang vĩnh viễn → giữ vĩnh viễn
    elsif p_until is not null then
      v_expires := greatest(coalesce(v_cur, now()), p_until);  -- Pro miễn phí: không cộng dồn
    elsif p_days is null then
      v_expires := null;                                   -- mua vĩnh viễn
    else
      v_expires := greatest(coalesce(v_cur, now()), now()) + make_interval(days => p_days);  -- cộng nối
    end if;
    insert into entitlements(store_user_id, product_id, source, expires_at)
      values (p_user, p_product, p_source, v_expires)
      on conflict (store_user_id, product_id)
      do update set source = excluded.source, expires_at = excluded.expires_at;
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

revoke execute on function public.purchase_product(uuid, uuid, text, integer, integer, text, text, text, timestamptz) from public, anon, authenticated;
grant  execute on function public.purchase_product(uuid, uuid, text, integer, integer, text, text, text, timestamptz) to service_role;

-- ---------- 4) purchase_software ----------
drop function if exists public.purchase_software(uuid, uuid, text);

create or replace function public.purchase_software(
  p_user    uuid,
  p_product uuid,
  p_key     text,
  p_coupon  text default null
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
  v_discount integer := 0;
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
  if p_coupon is not null and trim(p_coupon) <> '' and v_points > 0 then
    v_discount := redeem_coupon(p_user, p_coupon, v_points, p_product::text);
  end if;
  if v_points - v_discount > 0 then
    perform adjust_points(p_user, -(v_points - v_discount), 'spend', p_product::text, 'Mua key phần mềm');
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

revoke execute on function public.purchase_software(uuid, uuid, text, text) from public, anon, authenticated;
grant  execute on function public.purchase_software(uuid, uuid, text, text) to service_role;
