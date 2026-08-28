-- ============================================================
-- CHẠY TRONG SUPABASE GIAOLY (không phải store).
-- Tạo RPC get_my_plan() để Ephata Store đọc gói mà không chạm schema bảng.
-- SECURITY DEFINER + tự lọc theo auth.uid() -> mỗi user chỉ lấy gói của chính mình.
-- ============================================================

create or replace function public.get_my_plan()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.plan
  from public.profiles pr
  join public.parishes p on p.id = pr.parish_id
  where pr.id = auth.uid();
$$;

-- Cho phép user đã đăng nhập (và cả anon, trả null) gọi qua PostgREST rpc.
grant execute on function public.get_my_plan() to anon, authenticated;
