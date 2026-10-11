-- 0015 — Ví Ephata cho app: app (host trên store hoặc web app ngoài) trừ point của người dùng theo dịch vụ.
-- CHẠY TRÊN PROJECT SUPABASE "EPHATA STORE" (ref keaelbirdtpyfxyifdlf). An toàn chạy lại.

do $$
begin
  if to_regclass('public.products') is null then
    raise exception 'Không thấy bảng public.products — có thể đang mở nhầm project. Hãy chạy trên project Ephata Store (keaelbirdtpyfxyifdlf).';
  end if;
end $$;

-- Cấu hình app trên sản phẩm
alter table public.products add column if not exists uses_wallet boolean not null default false; -- app trừ point qua Ví Ephata
alter table public.products add column if not exists app_secret_hash text;                      -- sha256(khóa bí mật server của app ngoài)

-- Kết nối giữa người dùng và app (người dùng đã đồng ý; có thể ngắt bất cứ lúc nào)
create table if not exists public.app_connections (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  store_user_id uuid not null,
  token_hash    text unique,                 -- sha256(mã kết nối) cấp cho server app ngoài; null = chưa cấp
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz,                 -- người dùng ngắt kết nối
  unique (product_id, store_user_id)
);
create index if not exists app_connections_user_idx on public.app_connections(store_user_id);

-- Mỗi lần app trừ point (idempotent theo khóa của app)
create table if not exists public.app_charges (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products(id) on delete cascade,
  store_user_id   uuid not null,
  amount          integer not null check (amount > 0),
  refunded        integer not null default 0 check (refunded >= 0),
  reason          text not null,
  idempotency_key text not null,
  created_at      timestamptz not null default now(),
  unique (product_id, idempotency_key),
  check (refunded <= amount)
);
create index if not exists app_charges_user_idx on public.app_charges(store_user_id, created_at desc);

alter table public.app_connections enable row level security;
alter table public.app_charges     enable row level security;

-- Trừ point: atomic + idempotent. Cùng (product, key) gửi lại → trả kết quả cũ, không trừ lần 2.
create or replace function public.app_charge(
  p_product uuid,
  p_user    uuid,
  p_amount  integer,
  p_reason  text,
  p_key     text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_charge  app_charges%rowtype;
  v_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  -- Khóa ví trước để các lần trừ của cùng user chạy tuần tự (chặn trùng khóa song song).
  insert into point_wallets(user_id, balance) values (p_user, 0) on conflict (user_id) do nothing;
  perform 1 from point_wallets where user_id = p_user for update;

  select * into v_charge from app_charges where product_id = p_product and idempotency_key = p_key;
  if found then
    if v_charge.store_user_id <> p_user or v_charge.amount <> p_amount then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    select balance into v_balance from point_wallets where user_id = p_user;
    return jsonb_build_object('charge_id', v_charge.id, 'balance', v_balance, 'duplicate', true);
  end if;

  v_balance := adjust_points(p_user, -p_amount, 'spend', 'app:' || p_product::text, left(p_reason, 200));
  insert into app_charges(product_id, store_user_id, amount, reason, idempotency_key)
    values (p_product, p_user, p_amount, left(p_reason, 200), p_key)
    returning * into v_charge;
  return jsonb_build_object('charge_id', v_charge.id, 'balance', v_balance, 'duplicate', false);
end;
$$;

-- Hoàn point cho một lần trừ (toàn phần hoặc một phần, không vượt số đã trừ).
create or replace function public.app_refund(
  p_product uuid,
  p_charge  uuid,
  p_amount  integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_charge  app_charges%rowtype;
  v_amount  integer;
  v_balance integer;
begin
  select * into v_charge from app_charges where id = p_charge and product_id = p_product for update;
  if not found then
    raise exception 'CHARGE_NOT_FOUND';
  end if;
  v_amount := coalesce(p_amount, v_charge.amount - v_charge.refunded);
  if v_amount <= 0 or v_charge.refunded + v_amount > v_charge.amount then
    raise exception 'REFUND_EXCEEDS_CHARGE';
  end if;
  v_balance := adjust_points(v_charge.store_user_id, v_amount, 'refund', 'app:' || p_product::text, 'Hoàn: ' || v_charge.reason);
  update app_charges set refunded = refunded + v_amount where id = p_charge;
  return jsonb_build_object('refunded', v_charge.refunded + v_amount, 'balance', v_balance);
end;
$$;

revoke execute on function public.app_charge(uuid, uuid, integer, text, text) from public, anon, authenticated;
revoke execute on function public.app_refund(uuid, uuid, integer) from public, anon, authenticated;
grant  execute on function public.app_charge(uuid, uuid, integer, text, text) to service_role;
grant  execute on function public.app_refund(uuid, uuid, integer) to service_role;
