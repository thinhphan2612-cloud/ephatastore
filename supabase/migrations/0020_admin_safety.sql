-- 0020 — An toàn thao tác admin khi nhiều người cùng quản lý:
--   (1) DB chặn xóa sản phẩm đã có người dùng (quyền sở hữu / lượt trừ point của app);
--   (3) giữ bản build trước của game / công cụ host; ghi nhận game đã thêm vào Giáo Lý Số;
--   (4) nhật ký thao tác admin.
-- CHẠY TRÊN PROJECT SUPABASE "EPHATA STORE" (ref keaelbirdtpyfxyifdlf). An toàn chạy lại.

do $$
begin
  if to_regclass('public.products') is null or to_regclass('public.entitlements') is null then
    raise exception 'Không thấy bảng public.products / public.entitlements — có thể đang mở nhầm project. Hãy chạy trên project Ephata Store (keaelbirdtpyfxyifdlf).';
  end if;
end $$;

-- ---------- (1) Khóa ngoại tới products: CASCADE → RESTRICT ----------
-- Xóa sản phẩm từng xóa dây chuyền quyền của người mua và lịch sử trừ point của app.
do $$
declare
  t text;
  c record;
begin
  foreach t in array array['entitlements', 'app_charges'] loop
    for c in
      select conname from pg_constraint
       where conrelid = ('public.' || t)::regclass and contype = 'f'
         and confrelid = 'public.products'::regclass and confdeltype <> 'r'
    loop
      execute format('alter table public.%I drop constraint %I', t, c.conname);
      execute format(
        'alter table public.%I add constraint %I foreign key (product_id) references public.products(id) on delete restrict',
        t, c.conname);
    end loop;
  end loop;
end $$;

-- ---------- (3) Bản build trước + game đã thêm vào Giáo Lý Số ----------
alter table public.products add column if not exists game_url_prev text;  -- /g/<id>/index.html của bản build trước (quay lại được)

create table if not exists public.giaoly_game_links (
  product_id    uuid not null references public.products(id) on delete cascade,
  store_user_id uuid not null,
  created_at    timestamptz not null default now(),
  primary key (product_id, store_user_id)
);
alter table public.giaoly_game_links enable row level security;

-- ---------- (4) Nhật ký thao tác admin (chỉ server ghi/đọc) ----------
create table if not exists public.admin_audit_log (
  id          bigserial primary key,
  actor_id    uuid,
  actor_email text,
  action      text not null,         -- vd product.update, topup.approve, build.rollback
  target_type text,                  -- product | topup | coupon | category | publisher | settings | user | provision
  target_id   text,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_actor_idx on public.admin_audit_log (actor_email, created_at desc);
alter table public.admin_audit_log enable row level security;
