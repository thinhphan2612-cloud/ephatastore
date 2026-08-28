-- ============================================================
-- 0004 — Model 1: tài khoản STORE là danh tính gốc.
-- CHẠY TRONG SUPABASE STORE.
-- ============================================================

-- Đổi khoá quyền sở hữu / đơn hàng sang store_user_id (auth.users của store).
alter table entitlements rename column giaoly_user_id to store_user_id;
alter table orders        rename column giaoly_user_id to store_user_id;

-- Hồ sơ user store. id = auth.users(id). Cột giaoly_* để gắn liên kết ở Phase 2.
create table if not exists profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text,
  display_name     text,
  giaoly_user_id   uuid,
  parish_id        uuid,
  role             text,
  plan             text,
  giaoly_linked_at timestamptz,
  created_at       timestamptz not null default now()
);

alter table profiles enable row level security;

-- User đọc & sửa hồ sơ của chính mình; ghi nhạy cảm (link giaoly) qua service_role.
create policy "own profile read"   on profiles for select using (auth.uid() = id);
create policy "own profile update" on profiles for update using (auth.uid() = id);

-- Tự tạo hồ sơ khi có user mới đăng ký.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
