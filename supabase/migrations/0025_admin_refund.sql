-- 0025 — Công cụ hỗ trợ khách: admin hoàn point cho MỘT lượt trừ point (mua sản phẩm / Full Topping / key phần mềm).
--   point_ledger.refunded_at + refund_ledger_id: mỗi lượt chỉ hoàn được 1 lần (khóa dòng, chạy trong 1 transaction).
--   Lượt trừ của app qua Ví (ref 'app:…') KHÔNG hoàn ở đây — app tự hoàn qua /api/apps/v1/refund (đã có kiểm số đã trừ).
-- CHẠY TRÊN PROJECT SUPABASE "EPHATA STORE" (ref keaelbirdtpyfxyifdlf). An toàn chạy lại.

do $$
begin
  if to_regclass('public.point_ledger') is null then
    raise exception 'Không thấy bảng public.point_ledger — có thể đang mở nhầm project. Hãy chạy trên project Ephata Store (keaelbirdtpyfxyifdlf).';
  end if;
end $$;

alter table public.point_ledger add column if not exists refunded_at      timestamptz;
alter table public.point_ledger add column if not exists refund_ledger_id uuid;   -- dòng 'refund' đã cộng lại

-- Hoàn point cho dòng ledger p_ledger (kind 'spend', chưa hoàn, không phải app). Trả số dư mới.
-- Lỗi: LEDGER_NOT_FOUND | NOT_REFUNDABLE | ALREADY_REFUNDED.
create or replace function public.admin_refund_spend(p_ledger uuid, p_note text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  l point_ledger%rowtype;
  v_balance integer;
  v_refund_id uuid;
begin
  select * into l from point_ledger where id = p_ledger for update;
  if not found then raise exception 'LEDGER_NOT_FOUND'; end if;
  if l.kind <> 'spend' or l.amount >= 0 or coalesce(l.ref, '') like 'app:%' then raise exception 'NOT_REFUNDABLE'; end if;
  if l.refunded_at is not null then raise exception 'ALREADY_REFUNDED'; end if;

  v_balance := adjust_points(l.user_id, -l.amount, 'refund', l.ref, left('Hoàn point: ' || coalesce(nullif(trim(p_note), ''), 'admin'), 300));
  select id into v_refund_id from point_ledger
   where user_id = l.user_id and kind = 'refund' order by created_at desc limit 1;
  update point_ledger set refunded_at = now(), refund_ledger_id = v_refund_id where id = l.id;
  return v_balance;
end;
$$;
revoke execute on function public.admin_refund_spend(uuid, text) from public, anon, authenticated;
grant  execute on function public.admin_refund_spend(uuid, text) to service_role;
