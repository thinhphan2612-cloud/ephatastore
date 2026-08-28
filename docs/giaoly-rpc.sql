-- ============================================================
-- CHẠY TRONG SUPABASE GIAOLY (không phải store).
-- Một hàm RPC duy nhất phục vụ cả 3 nhu cầu tích hợp của Ephata Store:
--   - plan       : gate sản phẩm Pro
--   - parish_id  : biết giáo xứ người mua (cấp tính năng tích hợp)
--   - role       : chỉ admin giáo xứ mới mua được tính năng của giáo xứ
-- SECURITY DEFINER + lọc theo auth.uid() -> mỗi user chỉ lấy dữ liệu của chính mình.
-- ============================================================

create or replace function public.get_my_context()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'parish_id', pr.parish_id,
    'role',      pr.role,
    'plan',      p.plan
  )
  from profiles pr
  left join parishes p on p.id = pr.parish_id
  where pr.id = auth.uid();
$$;

grant execute on function public.get_my_context() to anon, authenticated;

-- Trả về null nếu chưa đăng nhập / chưa có profile.
-- Ví dụ kết quả: {"parish_id":"65ee...","role":"admin","plan":"pro"}
