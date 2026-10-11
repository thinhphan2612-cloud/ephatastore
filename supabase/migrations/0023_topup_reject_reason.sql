-- 0023 — Lý do từ chối đơn nạp point (hiện cho khách + email); mốc khách tự gỡ thiết bị khỏi key phần mềm.
-- CHẠY TRÊN PROJECT SUPABASE "EPHATA STORE" (ref keaelbirdtpyfxyifdlf). An toàn chạy lại.

do $$
begin
  if to_regclass('public.point_topups') is null then
    raise exception 'Không thấy bảng public.point_topups — có thể đang mở nhầm project. Hãy chạy trên project Ephata Store (keaelbirdtpyfxyifdlf).';
  end if;
end $$;

alter table public.point_topups add column if not exists reject_reason text;

-- Khách tự gỡ thiết bị khỏi key phần mềm (Thư viện): tối đa 1 lần / 30 ngày / key — token offline của máy đã gỡ
-- vẫn chạy tới hạn, nên gỡ không giới hạn = lách giới hạn số thiết bị.
alter table public.licenses add column if not exists devices_reset_at timestamptz;
