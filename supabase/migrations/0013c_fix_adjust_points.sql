-- 0013c — Sửa adjust_points (0012): check constraint point_wallets.balance >= 0 chặn câu UPDATE
-- (lỗi 23514) TRƯỚC khi tới `raise 'INSUFFICIENT_POINTS'` → server không bao giờ nhận đúng mã thiếu point
-- (InsufficientPointsError trong wallet-ops / purchase_software không bao giờ bắt được).
-- Sửa: khóa hàng ví, kiểm số dư trước khi UPDATE. Giữ nguyên chữ ký + quyền (create or replace giữ grant).
create or replace function adjust_points(
  p_user   uuid,
  p_amount integer,
  p_kind   text,
  p_ref    text default null,
  p_note   text default null
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cur_balance integer;
  new_balance integer;
begin
  insert into point_wallets(user_id, balance) values (p_user, 0)
    on conflict (user_id) do nothing;

  select balance into cur_balance from point_wallets where user_id = p_user for update;
  if cur_balance + p_amount < 0 then
    raise exception 'INSUFFICIENT_POINTS';
  end if;

  update point_wallets
     set balance = balance + p_amount, updated_at = now()
   where user_id = p_user
  returning balance into new_balance;

  insert into point_ledger(user_id, amount, balance_after, kind, ref, note)
    values (p_user, p_amount, new_balance, p_kind, p_ref, p_note);

  return new_balance;
end;
$$;
