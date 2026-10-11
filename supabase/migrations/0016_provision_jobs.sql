-- 0016 — Hàng đợi gửi lệnh bật/tắt tính năng sang Giáo Lý Số (provision). Gửi lỗi không mất đơn:
-- job giữ trạng thái failed + lỗi, admin bấm "Thử lại" ở /admin/provisions.
-- CHẠY TRÊN PROJECT SUPABASE "EPHATA STORE" (ref keaelbirdtpyfxyifdlf). An toàn chạy lại.

do $$
begin
  if to_regclass('public.products') is null then
    raise exception 'Không thấy bảng public.products — có thể đang mở nhầm project. Hãy chạy trên project Ephata Store (keaelbirdtpyfxyifdlf).';
  end if;
end $$;

create table if not exists public.provision_jobs (
  id            uuid primary key default gen_random_uuid(),
  action        text not null check (action in ('grant_feature', 'revoke_feature')),
  product_id    uuid references public.products(id) on delete set null,
  store_user_id uuid,
  payload       jsonb not null,                  -- gửi nguyên văn sang Giáo Lý Số
  status        text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  attempts      integer not null default 0,
  last_error    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists provision_jobs_status_idx on public.provision_jobs(status, created_at desc);

alter table public.provision_jobs enable row level security;
