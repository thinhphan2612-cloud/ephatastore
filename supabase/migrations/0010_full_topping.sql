-- ============================================================
-- 0010 — Full Topping (thuê bao all-access cấp user). CHẠY TRONG SUPABASE STORE.
-- ============================================================

create table if not exists subscriptions (
  id            uuid primary key default uuid_generate_v4(),
  store_user_id uuid not null,
  kind          text not null default 'topping',
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now()
);
alter table subscriptions enable row level security;
-- Chỉ truy cập qua service_role ở server.
create index if not exists subscriptions_user_idx on subscriptions(store_user_id);
