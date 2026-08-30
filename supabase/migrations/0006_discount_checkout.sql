-- ============================================================
-- 0006 — Mã giảm giá + trường checkout. CHẠY TRONG SUPABASE STORE.
-- ============================================================

create table if not exists discount_codes (
  id          uuid primary key default uuid_generate_v4(),
  code        text not null unique,
  kind        text not null check (kind in ('percent','amount')),
  value       int  not null check (value >= 0),
  active      boolean not null default true,
  expires_at  timestamptz,
  max_uses    int,
  used_count  int not null default 0,
  created_at  timestamptz not null default now()
);

alter table discount_codes enable row level security;
-- Không policy công khai: validate qua service_role ở server.

-- orders: mã đơn (nội dung CK) + subtotal + giảm giá
alter table orders add column if not exists order_code    text unique;
alter table orders add column if not exists subtotal_vnd  int;
alter table orders add column if not exists discount_code text;
alter table orders add column if not exists discount_vnd  int not null default 0;

-- Mã giảm giá mẫu để test
insert into discount_codes (code, kind, value) values
  ('GIAM10',  'percent', 10),
  ('GIAM50K', 'amount',  50000)
on conflict (code) do nothing;
