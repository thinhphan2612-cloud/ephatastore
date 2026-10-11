-- 0017 — (P0-2) Mua sản phẩm atomic + chống trùng; (P0-3) cache ngữ cảnh Giáo Lý Số có hạn gói + thời điểm làm mới.
-- CHẠY TRÊN PROJECT SUPABASE "EPHATA STORE" (ref keaelbirdtpyfxyifdlf). An toàn chạy lại.

do $$
begin
  if to_regclass('public.products') is null then
    raise exception 'Không thấy bảng public.products — có thể đang mở nhầm project. Hãy chạy trên project Ephata Store (keaelbirdtpyfxyifdlf).';
  end if;
end $$;

-- ---------- P0-3: ngữ cảnh Giáo Lý Số ----------
alter table public.profiles add column if not exists plan_expires_at    timestamptz;  -- hạn gói Pro của giáo xứ (null = không hạn)
alter table public.profiles add column if not exists context_checked_at timestamptz;  -- lần cuối đồng bộ từ Giáo Lý Số

-- ---------- P0-2: lịch sử mua (đồng thời là khóa chống trùng) ----------
create table if not exists public.purchases (
  id              uuid primary key default gen_random_uuid(),
  store_user_id   uuid not null,
  product_id      uuid references public.products(id) on delete set null,  -- null = Full Topping
  kind            text not null,            -- annual | freedom | perpetual | topping
  points          integer not null check (points >= 0),
  days            integer,                  -- null = vĩnh viễn
  source          text not null,            -- purchase | giaoly_pro
  expires_at      timestamptz,              -- hạn quyền sau lần mua này (null = vĩnh viễn)
  idempotency_key text not null,
  created_at      timestamptz not null default now(),
  unique (store_user_id, idempotency_key)
);
create index if not exists purchases_user_idx on public.purchases(store_user_id, created_at desc);
alter table public.purchases enable row level security;

-- Mua bằng point trong MỘT transaction: khóa ví → chống trùng → trừ point → cấp quyền (cộng nối hạn) → ghi lịch sử.
-- p_product null + p_kind 'topping' = Full Topping. p_days null = vĩnh viễn.
create or replace function public.purchase_product(
  p_user    uuid,
  p_product uuid,
  p_kind    text,
  p_points  integer,
  p_days    integer,
  p_source  text,
  p_key     text
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

  if p_points > 0 then
    v_balance := adjust_points(p_user, -p_points, 'spend', coalesce(p_product::text, 'topping'),
                               case when p_kind = 'topping' then 'Mua Full Topping' else 'Mua sản phẩm' end);
  else
    select balance into v_balance from point_wallets where user_id = p_user;
  end if;

  if p_kind = 'topping' then
    -- Cộng nối từ hạn topping đang còn (nếu có).
    select max(expires_at) into v_cur from subscriptions
     where store_user_id = p_user and kind = 'topping' and expires_at > now();
    v_expires := greatest(coalesce(v_cur, now()), now()) + make_interval(days => p_days);
    insert into subscriptions(store_user_id, kind, expires_at) values (p_user, 'topping', v_expires);
  else
    select true, expires_at into v_has_row, v_cur from entitlements
     where store_user_id = p_user and product_id = p_product for update;
    if p_days is null then
      v_expires := null;                                   -- mua vĩnh viễn
    elsif coalesce(v_has_row, false) and v_cur is null then
      v_expires := null;                                   -- đang vĩnh viễn → giữ vĩnh viễn
    else
      v_expires := greatest(coalesce(v_cur, now()), now()) + make_interval(days => p_days);  -- cộng nối
    end if;
    insert into entitlements(store_user_id, product_id, source, expires_at)
      values (p_user, p_product, p_source, v_expires)
      on conflict (store_user_id, product_id)
      do update set source = excluded.source, expires_at = excluded.expires_at;
  end if;

  insert into purchases(store_user_id, product_id, kind, points, days, source, expires_at, idempotency_key)
    values (p_user, p_product, p_kind, p_points, p_days, p_source, v_expires, p_key)
    returning id into v_id;

  return jsonb_build_object('purchase_id', v_id, 'balance', v_balance, 'expires_at', v_expires, 'duplicate', false);
end;
$$;

revoke execute on function public.purchase_product(uuid, uuid, text, integer, integer, text, text) from public, anon, authenticated;
grant  execute on function public.purchase_product(uuid, uuid, text, integer, integer, text, text) to service_role;
