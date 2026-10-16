-- 0027 — Ví Ephata cho app: (1) lần trừ đã hoàn hết không còn tính là "đã trả";
--        (2) app_user_state: mỗi app lưu một ít dữ liệu theo người dùng phía server (vd lượt miễn phí trong ngày).
-- CHẠY TRÊN PROJECT SUPABASE "EPHATA STORE" (ref keaelbirdtpyfxyifdlf). An toàn chạy lại.
-- Chạy SQL này TRƯỚC khi deploy code có route /api/apps/v1/state.

do $$
begin
  if to_regclass('public.app_charges') is null then
    raise exception 'Không thấy bảng public.app_charges — có thể đang mở nhầm project. Hãy chạy trên project Ephata Store (keaelbirdtpyfxyifdlf).';
  end if;
end $$;

-- (1) Trước đây: gửi lại khóa của một lần trừ đã HOÀN HẾT → trả "duplicate" như đã trả → app cho dùng dịch vụ miễn phí.
--     Nay: lần trừ đã hoàn hết được đổi khóa (giữ lịch sử) rồi trừ mới. Hoàn một phần vẫn tính là đã trả.
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
    if v_charge.refunded < v_charge.amount then
      select balance into v_balance from point_wallets where user_id = p_user;
      return jsonb_build_object('charge_id', v_charge.id, 'balance', v_balance, 'duplicate', true);
    end if;
    update app_charges set idempotency_key = p_key || '#refunded:' || v_charge.id where id = v_charge.id;
  end if;

  v_balance := adjust_points(p_user, -p_amount, 'spend', 'app:' || p_product::text, left(p_reason, 200));
  insert into app_charges(product_id, store_user_id, amount, reason, idempotency_key)
    values (p_product, p_user, p_amount, left(p_reason, 200), p_key)
    returning * into v_charge;
  return jsonb_build_object('charge_id', v_charge.id, 'balance', v_balance, 'duplicate', false);
end;
$$;

revoke execute on function public.app_charge(uuid, uuid, integer, text, text) from public, anon, authenticated;
grant  execute on function public.app_charge(uuid, uuid, integer, text, text) to service_role;

-- (2) Dữ liệu nhỏ của app theo người dùng (chỉ server đọc / ghi qua service role; giới hạn 16KB ở API).
create table if not exists public.app_user_state (
  product_id    uuid not null references public.products(id) on delete cascade,
  store_user_id uuid not null,
  value         jsonb not null,
  updated_at    timestamptz not null default now(),
  primary key (product_id, store_user_id)
);
alter table public.app_user_state enable row level security;
